"use strict";

/*
=========================================================
 ASCENDRA JOURNAL SECURITY
=========================================================

This module adapts the security ideas from Jayden's earlier
high-security journal.js implementation for Ascendra's SPA.

It protects journal traffic with:
- AES-256-GCM authenticated encryption
- Cryptographically random per-account journal tokens
- A fresh random IV for every encrypted entry
- Additional authenticated data binding ciphertext to user/date
- Strict decrypted-data validation
- Maximum journal field lengths
- Tampered/corrupted encrypted data rejection
- Versioned encrypted payloads
- Automatic migration of authenticated legacy plaintext entries

The backend stores only a SHA-256 hash of the journal token.
Knowing an accountId by itself is no longer enough to read or
overwrite journal entries.
=========================================================
*/

const TOKEN_BYTES = 32;
const IV_LENGTH = 12;
const CRYPTO_VERSION = 1;
const ENCRYPTED_MARKER = "__ascendra_encrypted_v1__";
const MAX_FIELD_LENGTH = 5000;
const JOURNAL_TOKEN_FIELD = "journalTokenV1";

const ALLOWED_MOODS = new Set([
  "Happy",
  "Good",
  "Okay",
  "Sad",
  "Tired",
]);

function getRequestUrl(input) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  if (input instanceof Request) return input.url;
  return String(input?.url || "");
}

function getRequestMethod(input, init) {
  return String(init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
}

function isJournalEndpoint(input) {
  try {
    const url = new URL(getRequestUrl(input), window.location.href);
    return url.pathname.endsWith("/journal");
  } catch {
    return false;
  }
}

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bytesToBase64Url(bytes) {
  return bytesToBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const normalized = String(value || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return base64ToBytes(padded);
}

function randomBytes(length) {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Secure journal storage requires HTTPS or localhost.");
  }

  return crypto.getRandomValues(new Uint8Array(length));
}

function getActiveIdentityItem(field) {
  const tabKey = `ascendra:tab-identity:${field}`;

  try {
    const tabValue = sessionStorage.getItem(tabKey);
    if (tabValue) return tabValue;
  } catch {
    // Fall back to the published identity below.
  }

  try {
    return localStorage.getItem(field) || "";
  } catch {
    return "";
  }
}

function accountStorageKey(username) {
  return `ascendra:user:${String(username || "")
    .trim()
    .toLowerCase()}`;
}

function readStoredAccount(username) {
  const key = accountStorageKey(username);

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const account = JSON.parse(raw);
    if (!account || typeof account !== "object" || Array.isArray(account)) {
      return null;
    }

    return { key, account };
  } catch {
    return null;
  }
}

function saveStoredAccount(record) {
  localStorage.setItem(record.key, JSON.stringify(record.account));
}

function getFallbackTokenKey(userId) {
  return `ascendra:journal-token-v1:${userId}`;
}

function validateJournalToken(token) {
  try {
    return base64UrlToBytes(token).length === TOKEN_BYTES;
  } catch {
    return false;
  }
}

function getOrCreateJournalToken(userId) {
  const activeUserId = String(getActiveIdentityItem("accountId") || "").trim();
  const username = String(getActiveIdentityItem("loggedInUser") || getActiveIdentityItem("username") || "").trim();

  if (!userId || !activeUserId || userId !== activeUserId) {
    throw new Error("Journal access does not match the active Ascendra account.");
  }

  const record = username ? readStoredAccount(username) : null;
  const storedToken = String(record?.account?.[JOURNAL_TOKEN_FIELD] || "");

  if (validateJournalToken(storedToken)) {
    return storedToken;
  }

  const fallbackKey = getFallbackTokenKey(userId);

  try {
    const fallbackToken = localStorage.getItem(fallbackKey) || "";
    if (validateJournalToken(fallbackToken)) {
      if (record) {
        record.account[JOURNAL_TOKEN_FIELD] = fallbackToken;
        saveStoredAccount(record);
        localStorage.removeItem(fallbackKey);
      }
      return fallbackToken;
    }
  } catch {
    // Continue and create a new token.
  }

  const token = bytesToBase64Url(randomBytes(TOKEN_BYTES));

  if (record) {
    record.account[JOURNAL_TOKEN_FIELD] = token;
    saveStoredAccount(record);
  } else {
    localStorage.setItem(fallbackKey, token);
  }

  return token;
}

function isValidString(value, maxLength = MAX_FIELD_LENGTH) {
  return typeof value === "string" && value.length <= maxLength;
}

function sanitizeEntry(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return null;
  }

  if (
    !ALLOWED_MOODS.has(entry.mood) ||
    !isValidString(entry.day) ||
    !isValidString(entry.grateful) ||
    !isValidString(entry.learn) ||
    !isValidString(entry.goal)
  ) {
    return null;
  }

  return {
    mood: entry.mood,
    day: entry.day,
    grateful: entry.grateful,
    learn: entry.learn,
    goal: entry.goal,
  };
}

async function importEncryptionKey(token) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Secure journal storage requires HTTPS or localhost.");
  }

  const tokenBytes = base64UrlToBytes(token);
  if (tokenBytes.length !== TOKEN_BYTES) {
    throw new Error("Invalid journal security token.");
  }

  return crypto.subtle.importKey(
    "raw",
    tokenBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

function journalAssociatedData(userId, date) {
  return new TextEncoder().encode(`${userId}\n${date}`);
}

async function encryptEntry(entry, token) {
  const clean = sanitizeEntry(entry);
  if (!clean) {
    throw new Error("The journal entry contains invalid data.");
  }

  const userId = String(entry.user_id || "").trim();
  const date = String(entry.date || "").trim();
  if (!userId || !date) {
    throw new Error("The journal entry is missing its account or date.");
  }

  const key = await importEncryptionKey(token);
  const iv = randomBytes(IV_LENGTH);
  const plaintext = new TextEncoder().encode(JSON.stringify(clean));

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: journalAssociatedData(userId, date),
      tagLength: 128,
    },
    key,
    plaintext,
  );

  const container = {
    version: CRYPTO_VERSION,
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(encrypted)),
  };

  return {
    user_id: userId,
    date,
    mood: ENCRYPTED_MARKER,
    day: JSON.stringify(container),
    grateful: "",
    learn: "",
    goal: "",
  };
}

async function decryptEntry(entry, token, expectedUserId) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new Error("Invalid journal entry.");
  }

  const userId = String(entry.user_id || entry.userId || "").trim();
  const date = String(entry.date || "").trim();

  if (!userId || !date || userId !== expectedUserId) {
    throw new Error("Journal entry ownership could not be verified.");
  }

  // Legacy entries were stored as plaintext. The caller will migrate
  // them after the authenticated request succeeds.
  if (entry.mood !== ENCRYPTED_MARKER) {
    const cleanLegacy = sanitizeEntry(entry);
    if (!cleanLegacy) {
      throw new Error("Invalid legacy journal entry.");
    }
    return {
      user_id: userId,
      userId,
      date,
      ...cleanLegacy,
      __legacyPlaintext: true,
    };
  }

  let container;
  try {
    container = JSON.parse(entry.day);
  } catch {
    throw new Error("Encrypted journal data is corrupted.");
  }

  if (
    !container ||
    typeof container !== "object" ||
    Array.isArray(container) ||
    container.version !== CRYPTO_VERSION ||
    typeof container.iv !== "string" ||
    typeof container.data !== "string"
  ) {
    throw new Error("Encrypted journal data has an unsupported format.");
  }

  const iv = base64ToBytes(container.iv);
  const ciphertext = base64ToBytes(container.data);

  if (iv.length !== IV_LENGTH) {
    throw new Error("Encrypted journal data has an invalid IV.");
  }

  const key = await importEncryptionKey(token);

  let decrypted;
  try {
    decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: journalAssociatedData(userId, date),
        tagLength: 128,
      },
      key,
      ciphertext,
    );
  } catch {
    throw new Error("Journal data could not be authenticated or decrypted.");
  }

  let parsed;
  try {
    parsed = JSON.parse(new TextDecoder().decode(new Uint8Array(decrypted)));
  } catch {
    throw new Error("Decrypted journal data is invalid.");
  }

  const clean = sanitizeEntry(parsed);
  if (!clean) {
    throw new Error("Decrypted journal data failed validation.");
  }

  return {
    user_id: userId,
    userId,
    date,
    ...clean,
  };
}

function getUserIdFromUrl(input) {
  try {
    const url = new URL(getRequestUrl(input), window.location.href);
    return String(url.searchParams.get("user_id") || "").trim();
  } catch {
    return "";
  }
}

function readLocalJson(key) {
  try {
    const value = localStorage.getItem(key);
    if (!value) return null;
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function findLegacyClaim(userId) {
  const username = String(getActiveIdentityItem("loggedInUser") || getActiveIdentityItem("username") || "")
    .trim()
    .toLowerCase();

  const prefixes = username
    ? [`ascendra:data:${username}:journal-`, "journal-"]
    : ["journal-"];

  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key || !prefixes.some((prefix) => key.startsWith(prefix))) continue;

      const entry = readLocalJson(key);
      if (!entry) continue;

      const entryUserId = String(entry.user_id || entry.userId || "").trim();
      const date = String(entry.date || "").trim();
      const clean = sanitizeEntry(entry);

      if (entryUserId === userId && date && clean) {
        return { date, ...clean };
      }
    }
  } catch {
    return null;
  }

  return null;
}

function makeHeaders(input, init, token) {
  const baseHeaders = input instanceof Request ? input.headers : undefined;
  const headers = new Headers(baseHeaders || undefined);

  if (init?.headers) {
    new Headers(init.headers).forEach((value, name) => {
      headers.set(name, value);
    });
  }

  headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

function responseWithJson(body, originalResponse) {
  const headers = new Headers(originalResponse.headers);
  headers.set("Content-Type", "application/json");
  headers.delete("Content-Length");
  headers.delete("Content-Encoding");

  return new Response(JSON.stringify(body), {
    status: originalResponse.status,
    statusText: originalResponse.statusText,
    headers,
  });
}

async function responseCode(response) {
  try {
    const clone = response.clone();
    const body = await clone.json();
    return typeof body?.code === "string" ? body.code : "";
  } catch {
    return "";
  }
}

function requestInitWithBody(input, init, method, headers, body) {
  const requestInit = {
    ...(input instanceof Request
      ? {
          cache: input.cache,
          credentials: input.credentials,
          integrity: input.integrity,
          keepalive: input.keepalive,
          mode: input.mode,
          redirect: input.redirect,
          referrer: input.referrer,
          referrerPolicy: input.referrerPolicy,
          signal: input.signal,
        }
      : {}),
    ...(init || {}),
    method,
    headers,
  };

  if (body !== undefined) {
    requestInit.body = body;
  }

  return requestInit;
}

async function claimJournal(nativeFetch, baseUrl, userId, token) {
  const claim = findLegacyClaim(userId);
  const headers = new Headers({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  });

  const response = await nativeFetch(`${baseUrl}/journal/claim`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      user_id: userId,
      claim,
    }),
  });

  if (!response.ok) {
    const code = await responseCode(response);
    throw new Error(
      code === "legacy_proof_required"
        ? "This older journal needs one matching local backup before it can be secured."
        : `Journal security setup failed: ${response.status}`,
    );
  }
}

async function migrateLegacyEntries(nativeFetch, baseUrl, entries, userId, token) {
  const legacyEntries = entries.filter((entry) => entry.__legacyPlaintext === true);

  for (const legacyEntry of legacyEntries) {
    const encrypted = await encryptEntry(legacyEntry, token);
    const response = await nativeFetch(`${baseUrl}/journal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(encrypted),
    });

    if (!response.ok) {
      console.warn(`Ascendra could not migrate journal entry ${legacyEntry.date} to encrypted storage.`);
    }
  }
}

async function secureGet(nativeFetch, input, init) {
  const userId = getUserIdFromUrl(input);
  if (!userId) {
    return nativeFetch(input, init);
  }

  const token = getOrCreateJournalToken(userId);
  const headers = makeHeaders(input, init, token);
  const requestInit = requestInitWithBody(input, init, "GET", headers);

  let response = await nativeFetch(getRequestUrl(input), requestInit);
  if (response.status === 428 && (await responseCode(response)) === "journal_auth_required") {
    const url = new URL(getRequestUrl(input), window.location.href);
    await claimJournal(nativeFetch, url.origin, userId, token);
    response = await nativeFetch(getRequestUrl(input), requestInit);
  }

  if (!response.ok) {
    return response;
  }

  const rawEntries = await response.json();
  if (!Array.isArray(rawEntries)) {
    throw new Error("The journal backend returned invalid data.");
  }

  const entries = [];
  for (const rawEntry of rawEntries) {
    entries.push(await decryptEntry(rawEntry, token, userId));
  }

  // Once the legacy owner has authenticated, silently replace plaintext
  // backend rows with AES-GCM ciphertext.
  const baseUrl = new URL(getRequestUrl(input), window.location.href).origin;
  migrateLegacyEntries(nativeFetch, baseUrl, entries, userId, token).catch((error) => {
    console.warn("Ascendra could not finish journal encryption migration.", error);
  });

  const cleanEntries = entries.map(({ __legacyPlaintext, ...entry }) => entry);
  return responseWithJson(cleanEntries, response);
}

async function readRequestJson(input, init) {
  if (typeof init?.body === "string") {
    return JSON.parse(init.body);
  }

  if (input instanceof Request) {
    return input.clone().json();
  }

  throw new Error("Journal save data could not be read.");
}

async function securePost(nativeFetch, input, init) {
  const plaintextEntry = await readRequestJson(input, init);
  const userId = String(plaintextEntry?.user_id || plaintextEntry?.userId || "").trim();

  if (!userId) {
    throw new Error("The journal entry is missing its account.");
  }

  const token = getOrCreateJournalToken(userId);
  const encryptedEntry = await encryptEntry(
    {
      ...plaintextEntry,
      user_id: userId,
    },
    token,
  );

  const headers = makeHeaders(input, init, token);
  headers.set("Content-Type", "application/json");
  const requestInit = requestInitWithBody(
    input,
    init,
    "POST",
    headers,
    JSON.stringify(encryptedEntry),
  );

  let response = await nativeFetch(getRequestUrl(input), requestInit);

  if (response.status === 428 && (await responseCode(response)) === "journal_auth_required") {
    const url = new URL(getRequestUrl(input), window.location.href);
    await claimJournal(nativeFetch, url.origin, userId, token);
    response = await nativeFetch(getRequestUrl(input), requestInit);
  }

  return response;
}

export function createJournalFetch(nativeFetch) {
  if (typeof nativeFetch !== "function") {
    throw new TypeError("A fetch function is required.");
  }

  return async function secureJournalFetch(input, init) {
    if (!isJournalEndpoint(input)) {
      return nativeFetch(input, init);
    }

    const method = getRequestMethod(input, init);

    if (method === "GET") {
      return secureGet(nativeFetch, input, init);
    }

    if (method === "POST") {
      return securePost(nativeFetch, input, init);
    }

    return nativeFetch(input, init);
  };
}
