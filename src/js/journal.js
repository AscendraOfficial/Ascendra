"use strict";

/*
=========================================================
 ASCENDRA JOURNAL SECURITY LAYER
=========================================================
Adapted from Jayden's earlier high-security journal work.
This module keeps journal-specific security logic out of script.js.

What it adds:
- AES-256-GCM encryption before journal content reaches the backend
- Per-account random journal access token
- Token kept in the account-scoped browser store
- Legacy plaintext backend migration after ownership proof
- Strict field and payload validation
- Tamper detection through authenticated encryption
=========================================================
*/

const JOURNAL_TOKEN_KEY = "ascendra-journal-token-v1";
const JOURNAL_CRYPTO_KEY_PREFIX = "ascendra-journal-key-v1:";
const CRYPTO_VERSION = 1;
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const MAX_FIELD_LENGTH = 5000;
const MAX_PAYLOAD_LENGTH = 100000;
const FIELD_NAMES = Object.freeze(["mood", "day", "grateful", "learn", "goal"]);

function bytesToBase64(bytes) {
  let binary = "";
  for (let index = 0; index < bytes.length; index++) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  if (typeof value !== "string" || !value) {
    throw new Error("Invalid encoded journal data.");
  }
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function encodeText(value) {
  return new TextEncoder().encode(String(value));
}

function decodeText(bytes) {
  return new TextDecoder().decode(bytes);
}

function randomBytes(length) {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Secure journal storage requires HTTPS or localhost.");
  }
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function getAccountId() {
  return String(sessionStorage.getItem("ascendra:tab-identity:accountId") || localStorage.getItem("accountId") || "").trim();
}

function getUsername() {
  return String(sessionStorage.getItem("ascendra:tab-identity:loggedInUser") || localStorage.getItem("loggedInUser") || "")
    .trim()
    .toLowerCase();
}

function accountDataKey(key) {
  const username = getUsername();
  return username ? `ascendra:data:${username}:${key}` : `ascendra:guest:${key}`;
}

function getStoredToken() {
  return String(localStorage.getItem(accountDataKey(JOURNAL_TOKEN_KEY)) || "").trim();
}

function storeToken(token) {
  localStorage.setItem(accountDataKey(JOURNAL_TOKEN_KEY), token);
}

function createToken() {
  return bytesToBase64(randomBytes(32));
}

function cryptoKeyStorageKey(accountId) {
  return JOURNAL_CRYPTO_KEY_PREFIX + accountId;
}

function getOrCreateRawKey(accountId) {
  const storageKey = cryptoKeyStorageKey(accountId);
  const stored = localStorage.getItem(storageKey);
  if (stored) {
    const bytes = base64ToBytes(stored);
    if (bytes.length !== KEY_LENGTH) throw new Error("Invalid stored journal key.");
    return bytes;
  }

  const bytes = randomBytes(KEY_LENGTH);
  localStorage.setItem(storageKey, bytesToBase64(bytes));
  return bytes;
}

async function getEncryptionKey(accountId) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Secure journal storage requires HTTPS or localhost.");
  }

  const rawKey = getOrCreateRawKey(accountId);
  return crypto.subtle.importKey("raw", rawKey, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function associatedData(accountId, date) {
  return encodeText(`ascendra-journal-v${CRYPTO_VERSION}|${accountId}|${date}`);
}

function validatePlainEntry(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new Error("Invalid journal entry.");
  }

  const result = {};
  for (const field of FIELD_NAMES) {
    const value = String(entry[field] ?? "");
    if (value.length > MAX_FIELD_LENGTH) {
      throw new Error("A journal field is too long.");
    }
    result[field] = value;
  }
  return result;
}

async function encryptEntry(entry, accountId, date) {
  const clean = validatePlainEntry(entry);
  const key = await getEncryptionKey(accountId);
  const iv = randomBytes(IV_LENGTH);
  const plaintext = encodeText(JSON.stringify(clean));

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: associatedData(accountId, date),
      tagLength: 128,
    },
    key,
    plaintext,
  );

  const envelope = JSON.stringify({
    v: CRYPTO_VERSION,
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(encrypted)),
  });

  if (envelope.length > MAX_PAYLOAD_LENGTH) {
    throw new Error("Encrypted journal entry is too large.");
  }

  return envelope;
}

async function decryptEntry(envelopeText, accountId, date) {
  let envelope;
  try {
    envelope = JSON.parse(envelopeText);
  } catch {
    throw new Error("Invalid encrypted journal entry.");
  }

  if (!envelope || envelope.v !== CRYPTO_VERSION || typeof envelope.iv !== "string" || typeof envelope.data !== "string") {
    throw new Error("Invalid encrypted journal format.");
  }

  const iv = base64ToBytes(envelope.iv);
  if (iv.length !== IV_LENGTH) throw new Error("Invalid journal IV.");

  const encrypted = base64ToBytes(envelope.data);
  const key = await getEncryptionKey(accountId);
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: associatedData(accountId, date),
      tagLength: 128,
    },
    key,
    encrypted,
  );

  const parsed = JSON.parse(decodeText(new Uint8Array(decrypted)));
  return validatePlainEntry(parsed);
}

function isEncryptedBackendEntry(entry) {
  return Boolean(entry && entry.mood === "__encrypted_v1__" && typeof entry.day === "string" && entry.day.startsWith("{"));
}

function normalizeBackendEntry(entry) {
  const userId = String(entry?.userId || entry?.user_id || "");
  return { ...entry, userId, user_id: userId };
}

async function decryptBackendEntry(entry, accountId) {
  const normalized = normalizeBackendEntry(entry);
  if (!isEncryptedBackendEntry(normalized)) return normalized;

  const decrypted = await decryptEntry(normalized.day, accountId, normalized.date);
  return {
    ...normalized,
    ...decrypted,
  };
}

function buildEncryptedBackendEntry(entry, accountId) {
  const date = String(entry.date || "");
  return encryptEntry(entry, accountId, date).then((encrypted) => ({
    user_id: accountId,
    date,
    mood: "__encrypted_v1__",
    day: encrypted,
    grateful: "",
    learn: "",
    goal: "",
  }));
}

function getLocalBackupForDate(date) {
  const value = localStorage.getItem(accountDataKey(date));
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function findLegacyClaimProof(accountId) {
  const prefix = accountDataKey("journal-");
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (!key || !key.startsWith(prefix)) continue;

    const date = key.slice(accountDataKey("").length);
    const backup = getLocalBackupForDate(date);
    if (!backup) continue;

    return {
      user_id: accountId,
      date,
      mood: String(backup.mood ?? ""),
      day: String(backup.day ?? ""),
      grateful: String(backup.grateful ?? ""),
      learn: String(backup.learn ?? ""),
      goal: String(backup.goal ?? ""),
    };
  }
  return null;
}

async function claimJournal(nativeFetch, apiUrl, accountId, token) {
  const proof = findLegacyClaimProof(accountId);
  const response = await nativeFetch(`${apiUrl}/journal/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: accountId, token, proof }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Journal claim failed: ${response.status}`);
  }
}

async function ensureJournalToken(nativeFetch, apiUrl, accountId) {
  let token = getStoredToken();
  if (token) return token;

  token = createToken();
  await claimJournal(nativeFetch, apiUrl, accountId, token);
  storeToken(token);
  return token;
}

async function migrateLegacyEntries(nativeFetch, apiUrl, token, accountId, entries) {
  for (const entry of entries) {
    if (isEncryptedBackendEntry(entry)) continue;

    const encryptedEntry = await buildEncryptedBackendEntry(entry, accountId);
    const response = await nativeFetch(`${apiUrl}/journal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(encryptedEntry),
    });

    if (!response.ok) {
      throw new Error(`Could not migrate a legacy journal entry: ${response.status}`);
    }
  }
}

function responseFromJson(data, originalResponse) {
  return new Response(JSON.stringify(data), {
    status: originalResponse.status,
    statusText: originalResponse.statusText,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function getRequestUrl(input) {
  return typeof input === "string" ? input : input instanceof URL ? input.href : input?.url || "";
}

function parseJournalRequest(input) {
  const rawUrl = getRequestUrl(input);
  const url = new URL(rawUrl, window.location.href);
  return { rawUrl, url };
}

function apiBaseFromJournalUrl(url) {
  return `${url.protocol}//${url.host}${url.pathname.slice(0, -"/journal".length)}`;
}

export function createJournalFetch(nativeFetch) {
  return async function secureJournalFetch(input, init = {}) {
    const { rawUrl, url } = parseJournalRequest(input);
    if (!url.pathname.endsWith("/journal")) {
      return nativeFetch(input, init);
    }

    const accountId = getAccountId();
    if (!accountId) {
      throw new Error("Could not identify the logged-in account.");
    }

    const apiUrl = apiBaseFromJournalUrl(url);
    const token = await ensureJournalToken(nativeFetch, apiUrl, accountId);
    const method = String(init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();

    if (method === "GET") {
      url.searchParams.set("user_id", accountId);
      const response = await nativeFetch(url.href, {
        ...init,
        headers: {
          ...(init?.headers || {}),
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return response;

      const entries = await response.json();
      if (!Array.isArray(entries)) return responseFromJson([], response);

      const hasLegacyEntries = entries.some((entry) => !isEncryptedBackendEntry(entry));
      if (hasLegacyEntries) {
        await migrateLegacyEntries(nativeFetch, apiUrl, token, accountId, entries);
      }

      const decryptedEntries = [];
      for (const entry of entries) {
        decryptedEntries.push(await decryptBackendEntry(entry, accountId));
      }

      return responseFromJson(decryptedEntries, response);
    }

    if (method === "POST") {
      let body;
      try {
        body = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
      } catch {
        throw new Error("Invalid journal request body.");
      }

      if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new Error("Invalid journal request body.");
      }

      const date = String(body.date || "");
      const encryptedEntry = await buildEncryptedBackendEntry(
        {
          ...body,
          user_id: accountId,
        },
        accountId,
      );

      const response = await nativeFetch(rawUrl, {
        ...init,
        method: "POST",
        headers: {
          ...(init?.headers || {}),
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(encryptedEntry),
      });

      if (!response.ok) return response;

      const data = await response.json().catch(() => ({ status: "success" }));
      return responseFromJson(data, response);
    }

    return nativeFetch(input, init);
  };
}
