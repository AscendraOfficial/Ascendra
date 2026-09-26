"use strict";

export const SYNC_STATUSES = Object.freeze({
  manual_sync_statuses: Object.freeze(["Synced", "Not synced"]),
  auto_sync_statuses: Object.freeze(["Synced", "Syncing"]),
});

export const SYNC_MODES = Object.freeze({
  MANUAL: "manual",
  AUTO: "auto",
});

const PROFILE_KEYS = Object.freeze({
  bio: "ascendra-profile-bio",
  profile_picture: "ascendra-profile-picture",
  settings: "ascendraSettings",
  achievements: "ascendra-achievements",
  progression: "ascendraProgression",
  streak: "ascendra-streak",
  tasks_completed: "ascendra-tasks-completed",
});

const MODE_KEY = "ascendra:profile-sync-mode";
const TOKEN_PREFIX = "ascendra:profile-sync-token:";
const VERSION_PREFIX = "ascendra:profile-sync-version:";
const LAST_SYNC_PREFIX = "ascendra:profile-sync-last:";
const USER_DATA_PREFIX = "ascendra:data:";

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function requireAccountId(accountId) {
  const value = String(accountId || "").trim();
  if (!value) throw new Error("A profile-sync account ID is required.");
  return value;
}

function accountSessionKey(prefix, accountId) {
  return prefix + requireAccountId(accountId);
}

function userStorageKey(username, key) {
  const cleanUsername = normalizeUsername(username);
  if (!cleanUsername) throw new Error("A username is required for profile sync.");
  return `${USER_DATA_PREFIX}${cleanUsername}:${key}`;
}

function readJsonStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function parseStoredValue(raw, fallback) {
  if (raw === null || raw === undefined || raw === "") return fallback;

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function setUserValue(username, key, value) {
  const storageKey = userStorageKey(username, key);

  if (typeof value === "string") {
    localStorage.setItem(storageKey, value);
    return;
  }

  localStorage.setItem(storageKey, JSON.stringify(value));
}

function cleanApiUrl(apiUrl) {
  const value = String(apiUrl || "").trim().replace(/\/+$/, "");
  if (!value) throw new Error("Ascendra's API URL is unavailable.");
  return value;
}

async function readJsonResponse(response) {
  let body = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const error = new Error(
      body?.message || `Profile sync failed with status ${response.status}.`,
    );
    error.status = response.status;
    error.code = body?.code || "";
    error.body = body;
    throw error;
  }

  return body || {};
}

function authHeaders(accountId, extraHeaders = {}) {
  const token = getSyncToken(accountId);

  if (!token) {
    throw new Error("This device does not have an active profile-sync session.");
  }

  return {
    ...extraHeaders,
    Authorization: `Bearer ${token}`,
  };
}

export function getSyncMode() {
  const saved = String(localStorage.getItem(MODE_KEY) || "").toLowerCase();
  return saved === SYNC_MODES.AUTO ? SYNC_MODES.AUTO : SYNC_MODES.MANUAL;
}

export function setSyncMode(mode) {
  if (!Object.values(SYNC_MODES).includes(mode)) {
    throw new Error("Sync mode must be manual or auto.");
  }

  localStorage.setItem(MODE_KEY, mode);
  window.dispatchEvent(new CustomEvent("ascendra:sync-mode-change", { detail: { mode } }));
  return mode;
}

export function getSyncToken(accountId) {
  try {
    return sessionStorage.getItem(accountSessionKey(TOKEN_PREFIX, accountId)) || "";
  } catch {
    return "";
  }
}

export function setSyncToken(accountId, token) {
  const cleanToken = String(token || "").trim();
  if (!cleanToken) throw new Error("A profile-sync token is required.");
  sessionStorage.setItem(accountSessionKey(TOKEN_PREFIX, accountId), cleanToken);
}

export function clearSyncSession(accountId) {
  try {
    sessionStorage.removeItem(accountSessionKey(TOKEN_PREFIX, accountId));
  } catch {
    // The browser may block session storage. There is nothing else to clear.
  }
}

export function getProfileVersion(accountId) {
  const value = Number(localStorage.getItem(accountSessionKey(VERSION_PREFIX, accountId)));
  return Number.isInteger(value) && value >= 1 ? value : 1;
}

export function setProfileVersion(accountId, version) {
  if (!Number.isInteger(version) || version < 1) {
    throw new Error("Invalid profile-sync version.");
  }

  localStorage.setItem(accountSessionKey(VERSION_PREFIX, accountId), String(version));
}

export function getLastSyncedAt(accountId) {
  return localStorage.getItem(accountSessionKey(LAST_SYNC_PREFIX, accountId)) || "";
}

export function markSynced(accountId, version, syncedAt = new Date().toISOString()) {
  if (Number.isInteger(version)) setProfileVersion(accountId, version);
  localStorage.setItem(accountSessionKey(LAST_SYNC_PREFIX, accountId), syncedAt);

  window.dispatchEvent(
    new CustomEvent("ascendra:profile-synced", {
      detail: {
        accountId,
        version: getProfileVersion(accountId),
        syncedAt,
      },
    }),
  );
}

export function buildProfileSnapshot(identity) {
  const username = normalizeUsername(identity?.username);
  if (!username) throw new Error("A username is required to build a synced profile.");

  const readUserItem = (key) => localStorage.getItem(userStorageKey(username, key));

  const settings = parseStoredValue(readUserItem(PROFILE_KEYS.settings), {});
  const achievements = parseStoredValue(readUserItem(PROFILE_KEYS.achievements), []);
  const progression = parseStoredValue(readUserItem(PROFILE_KEYS.progression), {});
  const streak = parseStoredValue(readUserItem(PROFILE_KEYS.streak), 0);
  const tasksCompleted = Number(parseStoredValue(readUserItem(PROFILE_KEYS.tasks_completed), 0));

  return {
    name: String(identity?.name || ""),
    surname: String(identity?.surname || ""),
    bio: String(readUserItem(PROFILE_KEYS.bio) || ""),
    profile_picture: String(readUserItem(PROFILE_KEYS.profile_picture) || ""),
    settings: settings && typeof settings === "object" && !Array.isArray(settings) ? settings : {},
    achievements:
      achievements && typeof achievements === "object"
        ? achievements
        : [],
    progression:
      progression && typeof progression === "object" && !Array.isArray(progression)
        ? progression
        : {},
    streak: streak ?? 0,
    tasks_completed: Number.isFinite(tasksCompleted) ? tasksCompleted : 0,
  };
}

export function applyProfileSnapshot(profile, identity) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    throw new Error("The cloud profile is invalid.");
  }

  const username = normalizeUsername(identity?.username);
  if (!username) throw new Error("A username is required to apply a synced profile.");

  if (typeof profile.bio === "string") {
    setUserValue(username, PROFILE_KEYS.bio, profile.bio);
  }

  if (typeof profile.profile_picture === "string") {
    setUserValue(username, PROFILE_KEYS.profile_picture, profile.profile_picture);
  }

  if (profile.settings && typeof profile.settings === "object" && !Array.isArray(profile.settings)) {
    setUserValue(username, PROFILE_KEYS.settings, profile.settings);
  }

  if (profile.achievements && typeof profile.achievements === "object") {
    setUserValue(username, PROFILE_KEYS.achievements, profile.achievements);
  }

  if (profile.progression && typeof profile.progression === "object" && !Array.isArray(profile.progression)) {
    setUserValue(username, PROFILE_KEYS.progression, profile.progression);
  }

  if (profile.streak !== undefined) {
    setUserValue(username, PROFILE_KEYS.streak, profile.streak);
  }

  if (Number.isFinite(Number(profile.tasks_completed))) {
    setUserValue(username, PROFILE_KEYS.tasks_completed, Number(profile.tasks_completed));
  }

  return {
    name: typeof profile.name === "string" ? profile.name : String(identity?.name || ""),
    surname: typeof profile.surname === "string" ? profile.surname : String(identity?.surname || ""),
  };
}

export async function registerCloudAccount({ apiUrl, identity, password }) {
  const response = await fetch(`${cleanApiUrl(apiUrl)}/sync/account`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      account_id: requireAccountId(identity?.accountId),
      username: String(identity?.username || "").trim(),
      password,
      profile: buildProfileSnapshot(identity),
    }),
  });

  const body = await readJsonResponse(response);
  setSyncToken(identity.accountId, body.token);
  markSynced(identity.accountId, body.profile_version, body.updated_at || new Date().toISOString());
  return body;
}

export async function loginCloudAccount({ apiUrl, username, password }) {
  const response = await fetch(`${cleanApiUrl(apiUrl)}/sync/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const body = await readJsonResponse(response);
  setSyncToken(body.account_id, body.token);
  markSynced(body.account_id, body.profile_version, body.updated_at || new Date().toISOString());
  return body;
}

export async function pullCloudProfile({ apiUrl, identity }) {
  const accountId = requireAccountId(identity?.accountId);
  const url = new URL(`${cleanApiUrl(apiUrl)}/sync/profile`);
  url.searchParams.set("account_id", accountId);

  const response = await fetch(url, {
    headers: authHeaders(accountId),
  });

  const body = await readJsonResponse(response);
  const identityUpdate = applyProfileSnapshot(body.profile, identity);
  markSynced(accountId, body.profile_version, body.updated_at || new Date().toISOString());

  return {
    ...body,
    identityUpdate,
  };
}

export async function pushCloudProfile({ apiUrl, identity }) {
  const accountId = requireAccountId(identity?.accountId);
  const response = await fetch(`${cleanApiUrl(apiUrl)}/sync/profile`, {
    method: "PUT",
    headers: authHeaders(accountId, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      account_id: accountId,
      base_version: getProfileVersion(accountId),
      profile: buildProfileSnapshot(identity),
    }),
  });

  if (response.status === 409) {
    let conflict = null;
    try {
      conflict = await response.json();
    } catch {
      conflict = null;
    }

    const error = new Error(conflict?.message || "The cloud profile changed on another device.");
    error.status = 409;
    error.code = conflict?.code || "profile_sync_conflict";
    error.body = conflict;
    throw error;
  }

  const body = await readJsonResponse(response);
  markSynced(accountId, body.profile_version, body.updated_at || new Date().toISOString());
  return body;
}

export async function autoSyncProfile({ apiUrl, identity }) {
  if (getSyncMode() !== SYNC_MODES.AUTO) {
    return { skipped: true, reason: "manual-mode" };
  }

  window.dispatchEvent(
    new CustomEvent("ascendra:profile-syncing", {
      detail: { accountId: identity?.accountId || "" },
    }),
  );

  try {
    return await pushCloudProfile({ apiUrl, identity });
  } catch (error) {
    if (error?.status === 409 && error?.body?.profile) {
      const identityUpdate = applyProfileSnapshot(error.body.profile, identity);
      markSynced(
        identity.accountId,
        error.body.profile_version,
        error.body.updated_at || new Date().toISOString(),
      );

      window.dispatchEvent(
        new CustomEvent("ascendra:profile-sync-conflict", {
          detail: {
            accountId: identity.accountId,
            identityUpdate,
          },
        }),
      );

      return {
        status: "conflict-resolved-from-cloud",
        identityUpdate,
      };
    }

    window.dispatchEvent(
      new CustomEvent("ascendra:profile-sync-error", {
        detail: {
          accountId: identity?.accountId || "",
          message: error?.message || "Profile sync failed.",
        },
      }),
    );

    throw error;
  }
}
