"use strict";
import { STORAGE_KEYS } from "./data/storageKeys.js";
import { responses, manualResponses } from "./ascendraAI/responses.js";
const app = document.getElementById("app");
const backButton = document.getElementById("spaBackButton");
const initializedCleanups = new Map();
let progressionToastTimer = null;
const PASSWORD_ITERATIONS = 600000;
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const PROGRESSION_STORAGE_KEY = "ascendraProgression";
const PROGRESSION_VERSION = 1;
const XP_PER_LEVEL = 100;
const DEFAULT_APP_NAME = "Ascendra";
const APP_NAME_ATTRIBUTES = Object.freeze(["alt", "aria-label", "content", "placeholder", "title"]);
const HABIT_IMPORT_DAY_KEYS = Object.freeze(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
const HABIT_IMPORT_MAX_LENGTH = 10000;
const HABIT_IMPORT_MAX_HABITS = 30;

function getStartOfWeek(date = new Date(), offsetWeeks = 0) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday + offsetWeeks * 7);
  return start;
}

function getHabitImportWeekDates(weekStart) {
  const start = parseLocalDateTime(weekStart);
  if (!start) return [];

  return HABIT_IMPORT_DAY_KEYS.map(function (_, index) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    date.setDate(start.getDate() + index);
    return date;
  });
}

function normalizeHabitImportStatus(value) {
  if (value === true || value === false || value === null || value === undefined) {
    return value ?? null;
  }
  throw new Error("Habit results must be true, false, or blank.");
}

function normalizeImportedHabit(value, index, compact = false) {
  const source = compact
    ? {
        habit: value?.[0],
        emoji: value?.[1],
        type: value?.[2],
        frequency: value?.[3],
        results: value?.[4],
      }
    : value;

  if (!isPlainRecord(source)) {
    throw new Error(`Habit ${index + 1} is not a valid object.`);
  }

  const name = String(source.habit ?? source.name ?? "").trim();
  const emoji = String(source.emoji ?? "").trim();
  const type = source.type ?? "good";
  const frequency = source.frequency ?? "daily";

  if (!name || name.length > 120) {
    throw new Error(`Habit ${index + 1} needs a name between 1 and 120 characters.`);
  }
  if (emoji.length > 8) {
    throw new Error(`Habit ${index + 1} has an invalid emoji.`);
  }
  if (!["good", "bad"].includes(type)) {
    throw new Error(`Habit ${index + 1} has an invalid type.`);
  }
  if (!["daily", "weekdays", "weekends"].includes(frequency)) {
    throw new Error(`Habit ${index + 1} has an invalid frequency.`);
  }

  const compactResults = Array.isArray(source.results) ? source.results : null;
  if (compactResults && compactResults.length > HABIT_IMPORT_DAY_KEYS.length) {
    throw new Error(`Habit ${index + 1} contains too many daily results.`);
  }

  const results = HABIT_IMPORT_DAY_KEYS.map(function (dayKey, dayIndex) {
    return normalizeHabitImportStatus(compactResults ? compactResults[dayIndex] : source[dayKey]);
  });

  return { name, emoji, type, frequency, results };
}

function validateHabitImportPayload(value) {
  if (!isPlainRecord(value)) {
    throw new Error("The QR data must contain a habit object.");
  }

  const isEnvelope =
    Array.isArray(value.habits) || Array.isArray(value.h) || value.version !== undefined || value.v !== undefined || value.type === "ascendra-habit-week";
  const version = value.version ?? value.v ?? 1;
  if (version !== 1) {
    throw new Error("This habit QR version is not supported.");
  }
  if (isEnvelope && value.type && value.type !== "ascendra-habit-week") {
    throw new Error("This QR code is not an Ascendra weekly habit tracker.");
  }

  const requestedWeekStart = value.weekStart ?? value.w;
  const fallbackWeekStart = formatLocalDate(getStartOfWeek());
  const weekStart = requestedWeekStart === undefined ? fallbackWeekStart : String(requestedWeekStart);
  const weekDates = getHabitImportWeekDates(weekStart);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart) || weekDates.length !== 7 || formatLocalDate(weekDates[0]) !== weekStart) {
    throw new Error("The imported week start date is invalid.");
  }

  let candidates;
  let compact = false;
  if (Array.isArray(value.habits)) {
    candidates = value.habits;
  } else if (Array.isArray(value.h)) {
    candidates = value.h;
    compact = true;
  } else if (value.habit !== undefined || value.name !== undefined) {
    candidates = [value];
  } else {
    throw new Error("The QR data does not contain any habits.");
  }

  if (candidates.length === 0 || candidates.length > HABIT_IMPORT_MAX_HABITS) {
    throw new Error(`A habit QR can contain between 1 and ${HABIT_IMPORT_MAX_HABITS} habits.`);
  }

  const habits = candidates.map((habit, index) => normalizeImportedHabit(habit, index, compact));
  const todayKey = formatLocalDate();
  habits.forEach(function (habit) {
    habit.results.forEach(function (result, index) {
      if (typeof result === "boolean" && formatLocalDate(weekDates[index]) > todayKey) {
        throw new Error("Future habit check-ins must stay blank.");
      }
    });
  });

  const names = new Set();
  habits.forEach(function (habit) {
    const key = habit.name.toLocaleLowerCase();
    if (names.has(key)) throw new Error(`The QR data repeats the habit “${habit.name}”.`);
    names.add(key);
  });

  return { version: 1, type: "ascendra-habit-week", weekStart, habits };
}

function consumeHabitImportParameter() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("habitImport")) return null;

  const serializedImport = url.searchParams.get("habitImport");
  url.searchParams.delete("habitImport");
  history.replaceState(history.state, "", `${url.pathname}${url.search}${url.hash}`);

  try {
    if (!serializedImport || serializedImport.length > HABIT_IMPORT_MAX_LENGTH) {
      throw new Error("The habit QR data is empty or too large.");
    }

    let parsedImport;
    try {
      parsedImport = JSON.parse(serializedImport);
    } catch {
      throw new Error("The habit QR data is not valid JSON.");
    }

    return { data: validateHabitImportPayload(parsedImport), error: null };
  } catch (error) {
    console.warn("Ascendra ignored an invalid habit import.", error);
    return { data: null, error: error instanceof Error ? error.message : "The habit QR data could not be read." };
  }
}

let pendingHabitImport = consumeHabitImportParameter();
console.log(
  "Hello there! If there is an error that you would like to report, we would really appreciate it if you would go to https://github.com/AscendraOfficial/Ascendra/issues, thank you! 😃",
);
function changeText(element, newText) {
  element.textContent = newText;
}

function configuredAppText(value) {
  const configuredName = String(APP_CONFIG.name || "").trim() || DEFAULT_APP_NAME;
  return String(value).split(DEFAULT_APP_NAME).join(configuredName);
}

function renderAppMetadata(root = document) {
  const elements = [];
  if (root.nodeType === Node.ELEMENT_NODE) elements.push(root);
  if (typeof root.querySelectorAll === "function") {
    elements.push(...root.querySelectorAll("*"));
  }

  elements.forEach((element) => {
    element.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
        node.nodeValue = configuredAppText(node.nodeValue);
      }
    });

    APP_NAME_ATTRIBUTES.forEach((attribute) => {
      if (element.hasAttribute(attribute)) {
        element.setAttribute(attribute, configuredAppText(element.getAttribute(attribute)));
      }
    });
  });

  root.querySelectorAll("[data-app-version]").forEach((element) => {
    element.textContent = APP_CONFIG.version;
  });
  root.querySelectorAll("[data-app-update]").forEach((element) => {
    element.textContent = APP_CONFIG.update;
  });
}

renderAppMetadata(document.head);
renderAppMetadata(document.body);

const TAB_IDENTITY_PREFIX = "ascendra:tab-identity:";
const TAB_IDENTITY_FIELDS = Object.freeze(["loggedInUser", "name", "surname", "username", "accountId"]);
const LEGACY_USER_KEYS = Object.freeze([
  "todos",
  "habits",
  "events",
  "timeCapsules",
  "ascendraSettings",
  "ascendra-profile-bio",
  "ascendra-profile-picture",
  "ascendra-streak",
  "ascendra-tasks-completed",
  "ascendra-achievements",
  "ascendraProgression",
]);
const LEGACY_JOURNAL_PREFIX = "journal-";
const XP_REWARDS = Object.freeze({
  task: 10,
  habit: 5,
  miniTool: 10,
  zenSession: 10,
});
const MINI_TOOL_IDS = Object.freeze(["coin", "dice", "random-number"]);
const achievements = [
  {
    id: "firstTask",
    name: "First Step",
    description: "Complete your first task.",
    stat: "tasksCompleted",
    goal: 1,
    icon: "\u2705",
    category: "productivity",
    progress: 0,
    unlocked: false,
  },
  {
    id: "taskMaster",
    name: "Task Master",
    description: "Complete 10 tasks.",
    stat: "tasksCompleted",
    goal: 10,
    icon: "\u{1F3C6}",
    category: "productivity",
    progress: 0,
    unlocked: false,
  },
  {
    id: "habitStarter",
    name: "Habit Starter",
    description: "Complete your first habit.",
    stat: "habitsCompleted",
    goal: 1,
    icon: "\u{1F331}",
    category: "habits",
    progress: 0,
    unlocked: false,
  },
  {
    id: "noZeroDays",
    name: "No Zero Days",
    description: "Complete a seven-day streak with no missed tasks or habits.",
    stat: "noZeroDaysStreak",
    goal: 7,
    icon: "\u{1F525}",
    category: "habits",
    progress: 0,
    unlocked: false,
  },
  {
    id: "firstCoinFlip",
    name: "Heads or Tails?",
    description: "Use the Coin Flip tool for the first time.",
    eventId: "minitool:coin",
    goal: 1,
    icon: "\u{1FA99}",
    category: "miniTools",
    progress: 0,
    unlocked: false,
  },
  {
    id: "firstDiceRoll",
    name: "Roll With It",
    description: "Use the Dice Roll tool for the first time.",
    eventId: "minitool:dice",
    goal: 1,
    icon: "\u{1F3B2}",
    category: "miniTools",
    progress: 0,
    unlocked: false,
  },
  {
    id: "firstRandomNumber",
    name: "By the Numbers",
    description: "Generate your first valid random number.",
    eventId: "minitool:random-number",
    goal: 1,
    icon: "\u{1F522}",
    category: "miniTools",
    progress: 0,
    unlocked: false,
  },
  {
    id: "miniToolsMaster",
    name: "Mini Tools Master",
    description: "Use every Mini Tool at least once.",
    stat: "miniToolsUsed",
    goal: 3,
    icon: "\u{1F9F0}",
    category: "miniTools",
    progress: 0,
    unlocked: false,
  },
  {
    id: "momentOfZen",
    name: "A Moment of Zen",
    description: "Complete your first Zen Timer session.",
    stat: "zenSessionsCompleted",
    goal: 1,
    icon: "\u{1F9D8}",
    category: "wellbeing",
    progress: 0,
    unlocked: false,
  },
  {
    id: "zenRegular",
    name: "Zen Regular",
    description: "Complete 5 Zen Timer sessions.",
    stat: "zenSessionsCompleted",
    goal: 5,
    icon: "\u{1F33F}",
    category: "wellbeing",
    progress: 0,
    unlocked: false,
  },
];

const badges = [
  {
    id: "genesis",
    name: "GENESIS",
    description: configuredAppText("Awarded to the first person in the world to use Ascendra."),
    icon: "\u{1F30C}",
    obtained: false,
  },
  {
    id: "coFounder",
    name: "Co-Founder",
    description: configuredAppText("Awarded to someone who helped create and shape Ascendra from the beginning."),
    icon: "\u{1F91D}",
    obtained: false,
  },
  {
    id: "founder",
    name: "Founder",
    description: configuredAppText("Awarded to the creator and lead developer of Ascendra."),
    icon: "\u{1F451}",
    obtained: false,
  },
];

function formatLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatLocalDateTimeInput(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${formatLocalDate(date)}T${hours}:${minutes}`;
}

function parseLocalDateTime(value, fallbackTime = "") {
  const match = String(value || "")
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::\d{2})?)?$/);
  if (!match) return null;

  const fallbackMatch = String(fallbackTime || "").match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4] ?? fallbackMatch?.[1] ?? 0);
  const minute = Number(match[5] ?? fallbackMatch?.[2] ?? 0);
  const parsed = new Date(year, month - 1, day, hour, minute, 0, 0);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day ||
    parsed.getHours() !== hour ||
    parsed.getMinutes() !== minute
  ) {
    return null;
  }

  return parsed;
}

function dateKeyDayNumber(value) {
  const parsed = value instanceof Date ? value : parseLocalDateTime(value);
  if (!parsed) return Number.NaN;
  return Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()) / DAY_IN_MILLISECONDS;
}

function eventDateTime(event) {
  return parseLocalDateTime(event?.date, event?.time);
}

function formatEventDateTime(event) {
  const date = eventDateTime(event);
  if (!date) return "Date unavailable";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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

async function derivePasswordDigest(password, salt, iterations) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Secure password storage requires HTTPS or localhost.");
  }

  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);

  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, keyMaterial, 256);
  return new Uint8Array(bits);
}

async function createPasswordCredentials(password) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Secure password storage requires HTTPS or localhost.");
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const digest = await derivePasswordDigest(password, salt, PASSWORD_ITERATIONS);
  return {
    version: 1,
    kdf: "PBKDF2",
    hash: "SHA-256",
    iterations: PASSWORD_ITERATIONS,
    salt: bytesToBase64(salt),
    digest: bytesToBase64(digest),
  };
}

async function verifyPasswordCredentials(password, credentials) {
  if (
    !credentials ||
    credentials.kdf !== "PBKDF2" ||
    credentials.hash !== "SHA-256" ||
    !Number.isInteger(credentials.iterations) ||
    credentials.iterations < 100000 ||
    credentials.iterations > 1000000
  ) {
    return false;
  }

  let salt;
  let expected;
  try {
    salt = base64ToBytes(credentials.salt);
    expected = base64ToBytes(credentials.digest);
  } catch (error) {
    return false;
  }

  const actual = await derivePasswordDigest(password, salt, credentials.iterations);
  if (actual.length !== expected.length) return false;

  let difference = 0;
  for (let index = 0; index < actual.length; index++) {
    difference |= actual[index] ^ expected[index];
  }
  return difference === 0;
}

function accountStorageKey(username) {
  return `ascendra:user:${String(username || "")
    .trim()
    .toLowerCase()}`;
}

function createAccountId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeUsername(username) {
  return String(username || "").trim();
}

function getUsernameValidationMessage(username, { allowLegacyUsername = "" } = {}) {
  const normalized = normalizeUsername(username);
  const allowedLegacy = normalizeUsername(allowLegacyUsername);

  if (!normalized) return "Please enter a username.";
  if (allowedLegacy && normalized.toLowerCase() === allowedLegacy.toLowerCase()) {
    return "";
  }
  if (normalized.length > 20) {
    return "Usernames can be up to 20 characters.";
  }
  if (!/^[A-Za-z0-9._-]+$/.test(normalized)) {
    return "Use only letters, numbers, periods, underscores, or hyphens.";
  }
  return "";
}

function readStoredJson(key) {
  if (!key) return null;
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch (error) {
    return null;
  }
}

function findStoredAccount(username) {
  const modernKey = accountStorageKey(username);
  const modernAccount = readStoredJson(modernKey);
  if (modernAccount && !Array.isArray(modernAccount)) {
    return { account: modernAccount, key: modernKey, legacy: false };
  }

  const requestedUsername = String(username || "").trim();
  const requestedUsernameLower = requestedUsername.toLowerCase();
  const legacyKeys = [requestedUsername];

  for (let index = 0; index < localStorage.length; index++) {
    const candidateKey = localStorage.key(index);
    if (candidateKey && candidateKey.toLowerCase() === requestedUsernameLower && !legacyKeys.includes(candidateKey)) {
      legacyKeys.push(candidateKey);
    }
  }

  for (const legacyKey of legacyKeys) {
    const legacyAccount = readStoredJson(legacyKey);
    if (legacyAccount && !Array.isArray(legacyAccount) && (legacyAccount.credentials || typeof legacyAccount.password === "string")) {
      return { account: legacyAccount, key: legacyKey, legacy: true };
    }
  }

  return null;
}

function saveStoredAccount(account) {
  localStorage.setItem(accountStorageKey(account.username), JSON.stringify(account));
}

function ensureStoredAccountId(accountRecord) {
  if (!accountRecord) return null;
  if (String(accountRecord.account?.accountId || "").trim()) {
    return accountRecord;
  }

  const previousValue = localStorage.getItem(accountRecord.key);
  const updatedAccount = {
    ...accountRecord.account,
    accountId: createAccountId(),
  };
  const serializedAccount = JSON.stringify(updatedAccount);

  try {
    localStorage.setItem(accountRecord.key, serializedAccount);
    if (localStorage.getItem(accountRecord.key) !== serializedAccount) {
      throw new Error(configuredAppText("Ascendra could not verify this account."));
    }
  } catch (error) {
    if (previousValue === null) {
      localStorage.removeItem(accountRecord.key);
    } else {
      localStorage.setItem(accountRecord.key, previousValue);
    }
    throw error;
  }

  return {
    ...accountRecord,
    account: updatedAccount,
  };
}

const tabIdentityFallback = new Map();

function tabIdentityStorageKey(field) {
  return TAB_IDENTITY_PREFIX + field;
}

function readTabIdentityItem(field) {
  const key = tabIdentityStorageKey(field);
  try {
    if (typeof sessionStorage !== "undefined") {
      return sessionStorage.getItem(key);
    }
  } catch (error) {
    console.warn(configuredAppText("Ascendra could not read this tab's session identity."), error);
  }
  return tabIdentityFallback.has(key) ? tabIdentityFallback.get(key) : null;
}

function writeTabIdentityItem(field, value) {
  const key = tabIdentityStorageKey(field);
  const normalizedValue = value === null || value === undefined ? null : String(value);

  try {
    if (typeof sessionStorage !== "undefined") {
      if (normalizedValue === null) {
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, normalizedValue);
      }
      return;
    }
  } catch (error) {
    console.warn(configuredAppText("Ascendra could not save this tab's session identity."), error);
  }

  if (normalizedValue === null) {
    tabIdentityFallback.delete(key);
  } else {
    tabIdentityFallback.set(key, normalizedValue);
  }
}

function initializeTabIdentity() {
  if (readTabIdentityItem("initialized") === "true") {
    const tabUsername = String(readTabIdentityItem("loggedInUser") || "").trim();
    const tabAccountId = String(readTabIdentityItem("accountId") || "");
    const accountRecord = tabUsername ? findStoredAccount(tabUsername) : null;

    if (tabUsername && (!tabAccountId || accountRecord?.account?.accountId !== tabAccountId)) {
      clearActiveIdentity();
      history.replaceState({ route: "login" }, "", "#/login");
    }
    return;
  }

  let publishedUsername = String(localStorage.getItem("loggedInUser") || "").trim();
  let accountRecord = publishedUsername ? findStoredAccount(publishedUsername) : null;

  try {
    if (accountRecord) {
      accountRecord = ensureStoredAccountId(accountRecord);
    } else if (publishedUsername) {
      throw new Error("The published account no longer exists.");
    }
  } catch (error) {
    console.warn(configuredAppText("Ascendra signed out an unverifiable account."), error);
    TAB_IDENTITY_FIELDS.forEach((field) => localStorage.removeItem(field));
    publishedUsername = "";
    accountRecord = null;
  }

  const account = accountRecord?.account || null;

  TAB_IDENTITY_FIELDS.forEach((field) => {
    let value;
    if (field === "loggedInUser") {
      value = publishedUsername || null;
    } else if (account) {
      value = account[field] ?? null;
    } else {
      value = localStorage.getItem(field);
    }
    writeTabIdentityItem(field, value);
  });
  writeTabIdentityItem("initialized", "true");
}

function getActiveIdentityItem(field) {
  return readTabIdentityItem(field) || "";
}

function setActiveIdentity(identity, { publish = true, previousUsername = null } = {}) {
  const username = String(identity?.username || "").trim();
  const loggedInUser = identity?.loggedInUser === null ? "" : String(identity?.loggedInUser ?? username).trim();
  const values = {
    loggedInUser,
    name: String(identity?.name || ""),
    surname: String(identity?.surname || ""),
    username,
    accountId: String(identity?.accountId || ""),
  };

  TAB_IDENTITY_FIELDS.forEach((field) => {
    writeTabIdentityItem(field, values[field]);
  });
  writeTabIdentityItem("initialized", "true");

  const sharedUsername = String(localStorage.getItem("loggedInUser") || "")
    .trim()
    .toLowerCase();
  const previousClean = String(previousUsername || "")
    .trim()
    .toLowerCase();
  const canPublish = publish || (previousClean ? sharedUsername === previousClean : sharedUsername === "");

  if (!canPublish) return;

  try {
    Object.entries(values).forEach(([field, value]) => {
      if (field === "loggedInUser" && value === "") {
        localStorage.removeItem(field);
      } else {
        localStorage.setItem(field, value);
      }
    });
  } catch (error) {
    console.warn(configuredAppText("Ascendra could not publish this tab's identity."), error);
  }
}

function clearActiveIdentity() {
  const tabUsername = String(readTabIdentityItem("loggedInUser") || "")
    .trim()
    .toLowerCase();
  const tabAccountId = String(readTabIdentityItem("accountId") || "");
  const sharedUsername = String(localStorage.getItem("loggedInUser") || "")
    .trim()
    .toLowerCase();
  const sharedAccountId = String(localStorage.getItem("accountId") || "");

  TAB_IDENTITY_FIELDS.forEach((field) => writeTabIdentityItem(field, null));
  writeTabIdentityItem("initialized", "true");

  if (
    (tabUsername && sharedUsername === tabUsername && (!sharedAccountId || sharedAccountId === tabAccountId)) ||
    (!tabUsername && !sharedUsername)
  ) {
    try {
      TAB_IDENTITY_FIELDS.forEach((field) => localStorage.removeItem(field));
    } catch (error) {
      console.warn(configuredAppText("Ascendra could not clear the published identity."), error);
    }
  }
}

function getLoggedInUsername() {
  return String(readTabIdentityItem("loggedInUser") || "")
    .trim()
    .toLowerCase();
}

initializeTabIdentity();

function userStorageKey(key, username = getLoggedInUsername()) {
  const cleanUsername = String(username || "")
    .trim()
    .toLowerCase();
  return cleanUsername ? `ascendra:data:${cleanUsername}:${key}` : `ascendra:guest:${key}`;
}

function getUserItem(key, username = getLoggedInUsername()) {
  if (!ensureActiveAccountAccess(username)) return null;
  return localStorage.getItem(userStorageKey(key, username));
}

function setUserItem(key, value, username = getLoggedInUsername()) {
  assertActiveAccountForWrite(username);
  localStorage.setItem(userStorageKey(key, username), value);
}

function removeUserItem(key, username = getLoggedInUsername()) {
  assertActiveAccountForWrite(username);
  localStorage.removeItem(userStorageKey(key, username));
}

function readUserJson(key, fallback = null, username = getLoggedInUsername()) {
  const storedValue = getUserItem(key, username);
  if (storedValue === null) return fallback;

  try {
    const parsedValue = JSON.parse(storedValue);
    return parsedValue === null ? fallback : parsedValue;
  } catch (error) {
    console.warn(`Could not read saved ${key}; using a safe default.`);
    return fallback;
  }
}

function getUserArray(key, username = getLoggedInUsername()) {
  const value = readUserJson(key, [], username);
  const items = Array.isArray(value) ? value.filter((item) => item && typeof item === "object" && !Array.isArray(item)) : [];

  if (key === "todos" || key === "habits") {
    ensureStableActivityIds(items, key === "todos" ? "task" : "habit", key, username);
  }

  return items;
}

function isPlainRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getRewardXp(eventId) {
  const normalizedEventId = String(eventId || "");

  if (/^task:[^:]{1,240}$/.test(normalizedEventId)) {
    return XP_REWARDS.task;
  }

  const habitMatch = normalizedEventId.match(/^habit:([^:]{1,240}):(\d{4}-\d{2}-\d{2})$/);
  if (habitMatch && parseLocalDateTime(habitMatch[2])) {
    return XP_REWARDS.habit;
  }

  if (MINI_TOOL_IDS.some((toolId) => normalizedEventId === `minitool:${toolId}`)) {
    return XP_REWARDS.miniTool;
  }

  if (/^unwind:zen:\d{1,9}$/.test(normalizedEventId)) {
    return XP_REWARDS.zenSession;
  }

  return 0;
}

function normalizeStoredTimestamp(value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    return null;
  }
  return new Date(value).toISOString();
}

function createEmptyProgressionState() {
  return {
    version: PROGRESSION_VERSION,
    rewardedEvents: {},
    achievements: {},
    badges: {},
  };
}

function normalizeProgressionState(value) {
  const state = createEmptyProgressionState();
  if (!isPlainRecord(value)) return state;

  if (isPlainRecord(value.rewardedEvents)) {
    Object.entries(value.rewardedEvents).forEach(([eventId, storedReward]) => {
      const xp = getRewardXp(eventId);
      if (!xp) return;

      const awardedAt = normalizeStoredTimestamp(isPlainRecord(storedReward) ? storedReward.awardedAt : storedReward);

      state.rewardedEvents[eventId] = {
        xp,
        awardedAt: awardedAt || new Date(0).toISOString(),
      };
    });
  }

  const storedAchievements = isPlainRecord(value.achievements) ? value.achievements : {};

  achievements.forEach((achievement) => {
    const stored = isPlainRecord(storedAchievements[achievement.id]) ? storedAchievements[achievement.id] : {};

    const progressValue = Number(stored.progress);
    const progress = Number.isFinite(progressValue) ? Math.min(achievement.goal, Math.max(0, progressValue)) : 0;
    const unlockedAt = normalizeStoredTimestamp(stored.unlockedAt);

    state.achievements[achievement.id] = {
      progress,
      unlocked: stored.unlocked === true || Boolean(unlockedAt),
      unlockedAt,
    };
  });

  const storedBadges = isPlainRecord(value.badges) ? value.badges : {};

  badges.forEach((badge) => {
    const stored = isPlainRecord(storedBadges[badge.id]) ? storedBadges[badge.id] : {};

    state.badges[badge.id] = {
      obtained: stored.obtained === true,
      obtainedAt: normalizeStoredTimestamp(stored.obtainedAt),
    };
  });

  return state;
}

function loadProgressionState() {
  return normalizeProgressionState(readUserJson(PROGRESSION_STORAGE_KEY, null));
}

function saveProgressionState(state) {
  try {
    setUserItem(PROGRESSION_STORAGE_KEY, JSON.stringify(normalizeProgressionState(state)));
    return true;
  } catch (error) {
    console.warn(configuredAppText("Ascendra could not save progression."), error);
    return false;
  }
}

function hashProgressIdentifier(value) {
  let hash = 2166136261;
  const textValue = String(value || "");

  for (let index = 0; index < textValue.length; index++) {
    hash ^= textValue.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function ensureStableActivityIds(items, type, storageKey, username = getLoggedInUsername()) {
  const usedIds = new Set();
  const changedItems = [];
  const migrationSeed = Date.now().toString(36);

  items.forEach((item, index) => {
    const existingId = item?.id ?? item?.createdAt;
    const normalizedId = existingId === undefined || existingId === null ? "" : String(existingId);

    if (normalizedId && !usedIds.has(normalizedId)) {
      usedIds.add(normalizedId);
      return;
    }

    const previousId = item.id;
    const hadOwnId = Object.prototype.hasOwnProperty.call(item, "id");
    const fingerprint = hashProgressIdentifier(
      JSON.stringify({
        type,
        index,
        name: item?.name || "",
        title: item?.title || item?.text || item?.task || "",
        date: item?.date || "",
        time: item?.time || "",
      }),
    );

    let generatedId = `legacy-${type}-${migrationSeed}-${index}-${fingerprint}`;
    let suffix = 1;
    while (usedIds.has(generatedId)) {
      generatedId = `legacy-${type}-${migrationSeed}-${index}-${fingerprint}-${suffix}`;
      suffix++;
    }

    item.id = generatedId;
    usedIds.add(generatedId);
    changedItems.push({ item, previousId, hadOwnId });
  });

  if (changedItems.length === 0) return true;

  try {
    setUserItem(storageKey, JSON.stringify(items), username);
    return true;
  } catch (error) {
    changedItems.forEach(({ item, previousId, hadOwnId }) => {
      if (hadOwnId) {
        item.id = previousId;
      } else {
        delete item.id;
      }
    });
    console.warn(configuredAppText(`Ascendra could not migrate legacy ${storageKey}.`), error);
    return false;
  }
}

function getActivityIdentifier(item) {
  const storedId = item?.id ?? item?.createdAt;
  if (storedId !== undefined && storedId !== null && String(storedId) !== "") {
    return encodeURIComponent(String(storedId));
  }
  return null;
}

function grantProgressReward(state, eventId, awardedAt = new Date()) {
  if (!isPlainRecord(state.rewardedEvents)) {
    state.rewardedEvents = {};
  }

  if (Object.prototype.hasOwnProperty.call(state.rewardedEvents, eventId)) {
    return false;
  }

  const xp = getRewardXp(eventId);
  if (!xp) return false;

  state.rewardedEvents[eventId] = {
    xp,
    awardedAt: awardedAt.toISOString(),
  };

  return true;
}

function addExistingActivityRewards(state) {
  let xpAwarded = 0;
  const todos = getUserArray("todos");
  const habits = getUserArray("habits");

  todos.forEach((todo) => {
    if (!isTodoCompleted(todo)) return;

    const taskId = getActivityIdentifier(todo);
    if (!taskId) return;
    const eventId = `task:${taskId}`;

    if (grantProgressReward(state, eventId)) {
      xpAwarded += getRewardXp(eventId);
    }
  });

  habits.forEach((habit) => {
    const habitId = getActivityIdentifier(habit);
    if (!habitId) return;

    getScheduledHabitHistoryEntries(habit).forEach(([dateKey, result]) => {
      if (result !== true) return;

      const eventId = `habit:${habitId}:${dateKey}`;
      if (grantProgressReward(state, eventId)) {
        xpAwarded += getRewardXp(eventId);
      }
    });
  });

  return xpAwarded;
}

function getProgressionStatistics(state) {
  const eventIds = Object.keys(state.rewardedEvents || {});
  const miniTools = new Set();
  let tasksCompleted = 0;
  let habitsCompleted = 0;
  let zenSessionsCompleted = 0;

  eventIds.forEach((eventId) => {
    if (eventId.startsWith("task:")) {
      tasksCompleted++;
    } else if (eventId.startsWith("habit:")) {
      habitsCompleted++;
    } else if (eventId.startsWith("minitool:")) {
      miniTools.add(eventId);
    } else if (eventId.startsWith("unwind:zen:")) {
      zenSessionsCompleted++;
    }
  });

  return {
    tasksCompleted,
    habitsCompleted,
    miniToolsUsed: miniTools.size,
    zenSessionsCompleted,
    noZeroDaysStreak: 0,
  };
}

function reconcileAchievementState(state) {
  const statistics = getProgressionStatistics(state);
  const newlyUnlocked = [];
  let unlockOffset = 0;

  achievements.forEach((achievement) => {
    const existing = isPlainRecord(state.achievements?.[achievement.id]) ? state.achievements[achievement.id] : {};

    let progress = 0;
    if (achievement.id !== "noZeroDays") {
      if (achievement.eventId) {
        progress = Object.prototype.hasOwnProperty.call(state.rewardedEvents, achievement.eventId) ? 1 : 0;
      } else {
        progress = Number(statistics[achievement.stat] || 0);
      }
    }

    progress = Math.min(achievement.goal, Math.max(0, Number.isFinite(progress) ? progress : 0));

    if (achievement.id === "noZeroDays") {
      state.achievements[achievement.id] = {
        progress: 0,
        unlocked: false,
        unlockedAt: null,
      };
      return;
    }

    let unlockedAt = normalizeStoredTimestamp(existing.unlockedAt);
    const wasUnlocked = existing.unlocked === true || Boolean(unlockedAt);
    const shouldUnlock = wasUnlocked || progress >= achievement.goal;

    if (shouldUnlock && !unlockedAt) {
      unlockedAt = new Date(Date.now() + unlockOffset).toISOString();
      unlockOffset++;
    }

    if (!wasUnlocked && shouldUnlock) {
      newlyUnlocked.push(achievement);
    }

    if (shouldUnlock) {
      progress = achievement.goal;
    }

    state.achievements[achievement.id] = {
      progress,
      unlocked: shouldUnlock,
      unlockedAt: shouldUnlock ? unlockedAt : null,
    };
  });

  return newlyUnlocked;
}

function reconcileBadgeState(state) {
  const normalizedName = String(getActiveIdentityItem("name") || "")
    .trim()
    .toLowerCase();

  badges.forEach((badge) => {
    const existing = isPlainRecord(state.badges?.[badge.id]) ? state.badges[badge.id] : {};

    let obtained = false;
    if (badge.id === "genesis") {
      obtained = existing.obtained === true;
    } else if (badge.id === "founder") {
      obtained = normalizedName === "declan";
    } else if (badge.id === "coFounder") {
      obtained = normalizedName === "jayden";
    }

    state.badges[badge.id] = {
      obtained,
      obtainedAt: obtained ? normalizeStoredTimestamp(existing.obtainedAt) || new Date().toISOString() : null,
    };
  });
}

function syncProgressionFromActivity() {
  const state = loadProgressionState();
  const xpAwarded = addExistingActivityRewards(state);
  const newlyUnlocked = reconcileAchievementState(state);
  reconcileBadgeState(state);
  const saved = saveProgressionState(state);

  if (!saved) {
    return {
      state: loadProgressionState(),
      newlyUnlocked: [],
      xpAwarded: 0,
      saved: false,
    };
  }

  return {
    state,
    newlyUnlocked,
    xpAwarded,
    saved,
  };
}

function recordMiniToolUse(toolId) {
  if (!MINI_TOOL_IDS.includes(toolId)) {
    return {
      state: loadProgressionState(),
      newlyUnlocked: [],
      xpAwarded: 0,
      saved: false,
    };
  }

  const state = loadProgressionState();
  addExistingActivityRewards(state);

  const eventId = `minitool:${toolId}`;
  const awarded = grantProgressReward(state, eventId);
  const newlyUnlocked = reconcileAchievementState(state);
  reconcileBadgeState(state);
  const saved = saveProgressionState(state);

  if (!saved) {
    return {
      state: loadProgressionState(),
      newlyUnlocked: [],
      xpAwarded: 0,
      saved: false,
    };
  }

  return {
    state,
    newlyUnlocked: newlyUnlocked.filter((achievement) => achievement.category === "miniTools"),
    xpAwarded: awarded && saved ? getRewardXp(eventId) : 0,
    saved,
  };
}

function recordZenSession() {
  const state = loadProgressionState();
  addExistingActivityRewards(state);

  const completedSessionIds = Object.keys(state.rewardedEvents || {}).filter((eventId) => /^unwind:zen:\d{1,9}$/.test(eventId));
  let sessionNumber = completedSessionIds.length + 1;
  let eventId = `unwind:zen:${sessionNumber}`;

  while (Object.prototype.hasOwnProperty.call(state.rewardedEvents, eventId)) {
    sessionNumber++;
    eventId = `unwind:zen:${sessionNumber}`;
  }

  const awarded = grantProgressReward(state, eventId);
  const newlyUnlocked = reconcileAchievementState(state);
  reconcileBadgeState(state);
  const saved = saveProgressionState(state);

  if (!saved) {
    return {
      state: loadProgressionState(),
      newlyUnlocked: [],
      xpAwarded: 0,
      saved: false,
    };
  }

  return {
    state,
    newlyUnlocked: newlyUnlocked.filter((achievement) => achievement.category === "wellbeing"),
    xpAwarded: awarded ? getRewardXp(eventId) : 0,
    saved,
  };
}

function getTotalXp(state) {
  return Object.keys(state.rewardedEvents || {}).reduce((total, eventId) => total + getRewardXp(eventId), 0);
}

function getLevelProgress(totalXp) {
  const safeXp = Math.max(0, Math.floor(Number(totalXp) || 0));
  const level = Math.floor(safeXp / XP_PER_LEVEL) + 1;
  const levelStartXp = (level - 1) * XP_PER_LEVEL;
  const nextLevelXp = level * XP_PER_LEVEL;
  const currentLevelXp = safeXp - levelStartXp;

  return {
    totalXp: safeXp,
    level,
    levelStartXp,
    nextLevelXp,
    currentLevelXp,
    remainingXp: nextLevelXp - safeXp,
    percent: Math.min(100, (currentLevelXp / XP_PER_LEVEL) * 100),
  };
}

function getUnlockedAchievements(state) {
  return achievements.filter((achievement) => state.achievements?.[achievement.id]?.unlocked === true);
}

function getLatestUnlockedAchievement(state) {
  return (
    getUnlockedAchievements(state)
      .map((achievement) => ({
        definition: achievement,
        unlockedAt: normalizeStoredTimestamp(state.achievements[achievement.id].unlockedAt) || new Date(0).toISOString(),
      }))
      .sort((first, second) => {
        return Date.parse(second.unlockedAt) - Date.parse(first.unlockedAt);
      })[0] || null
  );
}

function setProgressText(selector, value) {
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = String(value);
  });
}

function renderProgressionSummary(state) {
  const levelProgress = getLevelProgress(getTotalXp(state));
  const unlockedCount = getUnlockedAchievements(state).length;
  const miniToolAchievements = achievements.filter((achievement) => achievement.category === "miniTools");
  const unlockedMiniTools = miniToolAchievements.filter((achievement) => state.achievements?.[achievement.id]?.unlocked === true).length;

  setProgressText("[data-xp-total]", `${levelProgress.totalXp} XP`);
  setProgressText("[data-xp-number]", levelProgress.totalXp);
  setProgressText("[data-xp-level]", levelProgress.level);
  setProgressText("[data-xp-level-start]", `${levelProgress.levelStartXp} XP`);
  setProgressText("[data-xp-level-end]", `${levelProgress.nextLevelXp} XP`);
  setProgressText("[data-xp-message]", `${levelProgress.remainingXp} XP to Level ${levelProgress.level + 1}`);
  setProgressText("[data-achievement-count]", unlockedCount);
  setProgressText("[data-mini-tools-achievement-count]", `${unlockedMiniTools} / ${miniToolAchievements.length}`);

  document.querySelectorAll("[data-xp-progress-fill]").forEach((fill) => {
    fill.style.width = `${levelProgress.percent}%`;
  });

  document.querySelectorAll("[data-xp-progress]").forEach((progress) => {
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", String(XP_PER_LEVEL));
    progress.setAttribute("aria-valuenow", String(levelProgress.currentLevelXp));
    progress.setAttribute(
      "aria-valuetext",
      `${levelProgress.currentLevelXp} of ${XP_PER_LEVEL} XP toward Level ${levelProgress.level + 1}`,
    );
  });
}

function renderLatestAchievement(state) {
  const icon = document.getElementById("achievement-icon");
  const title = document.getElementById("achievement-title");
  const description = document.getElementById("achievement-description");
  const date = document.getElementById("achievement-unlocked-date");

  if (!icon || !title || !description) return;

  const latest = getLatestUnlockedAchievement(state);
  if (!latest) {
    icon.textContent = "\u{1F331}";
    title.textContent = "Getting Started";
    description.textContent = "Complete a task, habit, or Mini Tool to unlock your first achievement.";
    if (date) date.textContent = "No achievements unlocked yet";
    return;
  }

  icon.textContent = latest.definition.icon || "\u{1F3C6}";
  title.textContent = latest.definition.name;
  description.textContent = latest.definition.description;

  if (date) {
    date.textContent = `Unlocked ${new Date(latest.unlockedAt).toLocaleDateString()}`;
  }
}

function createAchievementCard(achievement, state) {
  const achievementState = state.achievements[achievement.id] || {
    progress: 0,
    unlocked: false,
    unlockedAt: null,
  };

  const item = document.createElement("li");
  item.className = "progress-achievement";
  item.dataset.state = achievementState.unlocked ? "unlocked" : "locked";

  const icon = document.createElement("div");
  icon.className = "progress-achievement-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = achievement.icon || "\u{1F3C6}";

  const content = document.createElement("div");
  content.className = "progress-achievement-content";

  const heading = document.createElement("h3");
  heading.textContent = achievement.name;

  const description = document.createElement("p");
  description.textContent = achievement.description;

  const status = document.createElement("strong");
  status.className = "progress-achievement-status";
  status.textContent = achievementState.unlocked ? "Unlocked" : `${achievementState.progress} / ${achievement.goal}`;

  const progress = document.createElement("div");
  progress.className = "achievement-progress-track";
  progress.setAttribute("role", "progressbar");
  progress.setAttribute("aria-label", `${achievement.name} achievement progress`);
  progress.setAttribute("aria-valuemin", "0");
  progress.setAttribute("aria-valuemax", String(achievement.goal));
  progress.setAttribute("aria-valuenow", String(achievementState.progress));

  const fill = document.createElement("div");
  fill.style.width = `${Math.min(100, (achievementState.progress / achievement.goal) * 100)}%`;
  progress.appendChild(fill);

  content.append(heading, description, status, progress);

  if (achievementState.unlockedAt) {
    const unlockedDate = document.createElement("span");
    unlockedDate.className = "progress-achievement-date";
    unlockedDate.textContent = `Unlocked ${new Date(achievementState.unlockedAt).toLocaleDateString()}`;
    content.appendChild(unlockedDate);
  }

  item.append(icon, content);
  return item;
}

function renderAchievementCollection(state) {
  const container = document.getElementById("achievement-list");
  if (!container) return;

  const fragment = document.createDocumentFragment();
  achievements.forEach((achievement) => {
    fragment.appendChild(createAchievementCard(achievement, state));
  });
  container.replaceChildren(fragment);
}

function renderBadgeCollection(state) {
  const container = document.getElementById("badge-list");
  if (!container) return;

  const fragment = document.createDocumentFragment();

  badges.forEach((badge) => {
    const badgeState = state.badges[badge.id] || {
      obtained: false,
      obtainedAt: null,
    };
    const item = document.createElement("li");
    item.className = "progress-badge";
    item.dataset.state = badgeState.obtained ? "obtained" : "locked";

    const icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = badge.icon || "\u{1F396}\uFE0F";

    const content = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = badge.name;
    const description = document.createElement("p");
    description.textContent = badge.description;
    const status = document.createElement("strong");
    status.textContent = badgeState.obtained ? "Earned" : "Locked";

    content.append(heading, description, status);
    item.append(icon, content);
    fragment.appendChild(item);
  });

  container.replaceChildren(fragment);
}

function announceProgressionReward(progression) {
  if (!progression?.saved || progression.xpAwarded <= 0) return;

  let toast = document.getElementById("progression-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "progression-toast";
    toast.className = "progression-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.setAttribute("aria-atomic", "true");
    document.body.appendChild(toast);
  }

  const unlockedNames = progression.newlyUnlocked.map((achievement) => achievement.name).join(" and ");
  const unlockText = unlockedNames ? ` \u2022 Unlocked: ${unlockedNames}` : "";

  toast.textContent = `+${progression.xpAwarded} XP${unlockText}`;
  toast.classList.add("show");

  clearTimeout(progressionToastTimer);
  progressionToastTimer = setTimeout(() => {
    toast.classList.remove("show");
    toast.remove();
  }, 4500);
}

window.syncProgressionFromActivity = syncProgressionFromActivity;
window.getLevelProgress = getLevelProgress;
window.getTotalXp = getTotalXp;

function isTodoCompleted(todo) {
  return todo?.completed === true || todo?.completed === "true" || todo?.done === true || todo?.done === "true";
}

function getHabitHistory(habit) {
  const history = habit?.history;
  return history && typeof history === "object" && !Array.isArray(history) ? history : {};
}

function isHabitScheduledForDate(habit, date = new Date()) {
  const dayOfWeek = date.getDay();

  if (habit?.frequency === "weekdays") {
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  }

  if (habit?.frequency === "weekends") {
    return dayOfWeek === 0 || dayOfWeek === 6;
  }

  return true;
}

function getScheduledHabitHistoryEntries(habit) {
  return Object.entries(getHabitHistory(habit)).filter(([dateKey]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false;
    const date = parseLocalDateTime(dateKey);
    return date && isHabitScheduledForDate(habit, date);
  });
}

function getHabitCurrentStreak(habit, fromDate = new Date()) {
  const history = getHabitHistory(habit);

  const date = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());

  let streak = 0;
  let inspectedDays = 0;
  const startingDateKey = formatLocalDate(date);

  while (inspectedDays < 3660) {
    if (isHabitScheduledForDate(habit, date)) {
      const dateKey = formatLocalDate(date);
      const result = history[dateKey];

      if (result === true) {
        streak++;
      } else if (dateKey === startingDateKey && result === undefined) {
        // Today's scheduled check-in is allowed to remain unanswered.
      } else {
        break;
      }
    }

    date.setDate(date.getDate() - 1);
    inspectedDays++;
  }

  return streak;
}

function collectStorageEntries(prefix) {
  const entries = [];
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (!key?.startsWith(prefix)) continue;
    const value = localStorage.getItem(key);
    if (value !== null) entries.push({ key, value });
  }
  return entries;
}

function collectUserDataEntries(username) {
  const cleanUsername = String(username || "")
    .trim()
    .toLowerCase();
  if (!cleanUsername) return [];

  const prefix = `ascendra:data:${cleanUsername}:`;
  return collectStorageEntries(prefix).filter((entry) => {
    const suffix = entry.key.slice(prefix.length);
    return LEGACY_USER_KEYS.includes(suffix) || /^journal-\d{4}-\d{1,2}-\d{1,2}$/.test(suffix);
  });
}

function hasUserDataNamespace(username) {
  return collectUserDataEntries(username).length > 0;
}

function activeAccountMatchesIdentity(username = getLoggedInUsername()) {
  const cleanUsername = String(username || "")
    .trim()
    .toLowerCase();
  if (!cleanUsername) return true;

  const accountId = getActiveIdentityItem("accountId");
  const accountRecord = findStoredAccount(cleanUsername);
  return Boolean(accountId && accountRecord?.account?.accountId === accountId);
}

function invalidateMissingActiveAccount() {
  const username = getLoggedInUsername();
  if (!username || activeAccountMatchesIdentity(username)) return false;

  clearActiveIdentity();
  alert("This account changed in another tab. Please log in again.");
  navigate("login", true);
  return true;
}

function ensureActiveAccountAccess(username) {
  const cleanUsername = String(username || "")
    .trim()
    .toLowerCase();
  const activeUsername = getLoggedInUsername();
  if (cleanUsername && cleanUsername === activeUsername && !activeAccountMatchesIdentity(activeUsername)) {
    invalidateMissingActiveAccount();
    return false;
  }
  return true;
}

function assertActiveAccountForWrite(username) {
  if (!ensureActiveAccountAccess(username)) {
    throw new Error(configuredAppText("Ascendra stopped a save because this account changed in another tab."));
  }
}

function copyStorageEntries(entries, getTargetKey, collisionMessage) {
  const plan = entries.map((entry) => ({
    ...entry,
    targetKey: getTargetKey(entry.key),
  }));

  plan.forEach((entry) => {
    const existingValue = localStorage.getItem(entry.targetKey);
    if (existingValue !== null && existingValue !== entry.value) {
      throw new Error(collisionMessage);
    }
  });

  const writtenEntries = [];
  try {
    plan.forEach((entry) => {
      if (localStorage.getItem(entry.targetKey) === null) {
        localStorage.setItem(entry.targetKey, entry.value);
        writtenEntries.push(entry);
      }
      if (localStorage.getItem(entry.targetKey) !== entry.value) {
        throw new Error(configuredAppText("Ascendra could not verify copied data."));
      }
    });
  } catch (error) {
    writtenEntries.forEach((entry) => {
      if (localStorage.getItem(entry.targetKey) === entry.value) {
        localStorage.removeItem(entry.targetKey);
      }
    });
    throw error;
  }

  return { plan, writtenEntries };
}

function rollbackCopiedStorageEntries(writtenEntries) {
  writtenEntries.forEach((entry) => {
    if (localStorage.getItem(entry.targetKey) === entry.value) {
      localStorage.removeItem(entry.targetKey);
    }
  });
}

function renameStoredAccountAndData(accountRecord, updatedAccount, oldUsername, newUsername) {
  const oldClean = String(oldUsername || "")
    .trim()
    .toLowerCase();
  const newClean = String(newUsername || "")
    .trim()
    .toLowerCase();
  const oldAccountKey = accountRecord.key;
  const newAccountKey = accountStorageKey(newClean);

  if (oldClean === newClean || oldAccountKey === newAccountKey) {
    const previousValue = localStorage.getItem(oldAccountKey);
    const serializedAccount = JSON.stringify(updatedAccount);
    try {
      localStorage.setItem(oldAccountKey, serializedAccount);
      if (localStorage.getItem(oldAccountKey) !== serializedAccount) {
        throw new Error(configuredAppText("Ascendra could not verify the updated account."));
      }
    } catch (error) {
      if (previousValue === null) {
        localStorage.removeItem(oldAccountKey);
      } else {
        localStorage.setItem(oldAccountKey, previousValue);
      }
      throw error;
    }
    return;
  }

  if (localStorage.getItem(newAccountKey) !== null) {
    throw new Error("That username is already in use.");
  }
  if (hasUserDataNamespace(newClean)) {
    throw new Error("Saved data already exists for that username.");
  }

  const oldPrefix = `ascendra:data:${oldClean}:`;
  const newPrefix = `ascendra:data:${newClean}:`;
  const entries = collectUserDataEntries(oldClean);
  let copied = { plan: [], writtenEntries: [] };
  let wroteNewAccount = false;

  try {
    copied = copyStorageEntries(
      entries,
      (oldKey) => newPrefix + oldKey.slice(oldPrefix.length),
      "Saved data already exists for that username.",
    );
    const serializedAccount = JSON.stringify(updatedAccount);
    localStorage.setItem(newAccountKey, serializedAccount);
    wroteNewAccount = true;
    if (localStorage.getItem(newAccountKey) !== serializedAccount) {
      throw new Error(configuredAppText("Ascendra could not verify the renamed account."));
    }
  } catch (error) {
    rollbackCopiedStorageEntries(copied.writtenEntries);
    if (wroteNewAccount) localStorage.removeItem(newAccountKey);
    throw error;
  }

  copied.plan.forEach((entry) => localStorage.removeItem(entry.key));
  localStorage.removeItem(oldAccountKey);

  const ownerKey = "ascendra:legacy-data-owner";
  if (String(localStorage.getItem(ownerKey) || "").toLowerCase() === oldClean) {
    localStorage.setItem(ownerKey, newClean);
  }
}

function transferGuestDataToUser(username) {
  const cleanUsername = String(username || "")
    .trim()
    .toLowerCase();
  if (!cleanUsername) return 0;

  const guestPrefix = "ascendra:guest:";
  const userPrefix = `ascendra:data:${cleanUsername}:`;
  const entries = collectStorageEntries(guestPrefix);
  const copied = copyStorageEntries(
    entries,
    (guestKey) => userPrefix + guestKey.slice(guestPrefix.length),
    "Saved account data already exists for that username.",
  );
  copied.plan.forEach((entry) => localStorage.removeItem(entry.key));
  return entries.length;
}

function getLegacyStorageEntries() {
  const entries = [];
  LEGACY_USER_KEYS.forEach((key) => {
    const value = localStorage.getItem(key);
    if (value !== null) entries.push({ key, value });
  });

  collectStorageEntries(LEGACY_JOURNAL_PREFIX).forEach((entry) => {
    if (!entries.some((savedEntry) => savedEntry.key === entry.key)) {
      entries.push(entry);
    }
  });
  return entries;
}

function deleteOwnedLegacyData(username) {
  const cleanUsername = String(username || "")
    .trim()
    .toLowerCase();
  const ownerKey = "ascendra:legacy-data-owner";
  const owner = String(localStorage.getItem(ownerKey) || "")
    .trim()
    .toLowerCase();
  const ownsLegacyData = cleanUsername ? owner === cleanUsername : owner === "";

  if (!ownsLegacyData) return;
  getLegacyStorageEntries().forEach((entry) => {
    localStorage.removeItem(entry.key);
  });
  localStorage.removeItem(ownerKey);
}

function deleteCurrentAccountData() {
  const username = getLoggedInUsername();
  if (username) assertActiveAccountForWrite(username);
  const dataEntries = username ? collectUserDataEntries(username) : collectStorageEntries("ascendra:guest:");

  dataEntries.forEach((entry) => {
    localStorage.removeItem(entry.key);
  });
  if (username) {
    const accountRecord = findStoredAccount(username);
    localStorage.removeItem(accountStorageKey(username));
    if (accountRecord?.key) localStorage.removeItem(accountRecord.key);
  }

  deleteOwnedLegacyData(username);
  clearActiveIdentity();
  localStorage.removeItem("password");
}

function migrateLegacyUserData(username) {
  const cleanUsername = String(username || "")
    .trim()
    .toLowerCase();
  if (!cleanUsername) return false;

  const ownerKey = "ascendra:legacy-data-owner";
  const existingOwner = String(localStorage.getItem(ownerKey) || "")
    .trim()
    .toLowerCase();
  if (existingOwner && existingOwner !== cleanUsername) return false;

  const entries = getLegacyStorageEntries();
  const missingEntries = entries.filter((entry) => {
    return localStorage.getItem(userStorageKey(entry.key, cleanUsername)) === null;
  });
  let copied = { writtenEntries: [] };

  try {
    copied = copyStorageEntries(
      missingEntries,
      (oldKey) => userStorageKey(oldKey, cleanUsername),
      configuredAppText("Ascendra could not safely migrate legacy data."),
    );
    localStorage.setItem(ownerKey, cleanUsername);
    if (
      String(localStorage.getItem(ownerKey) || "")
        .trim()
        .toLowerCase() !== cleanUsername
    ) {
      throw new Error(configuredAppText("Ascendra could not verify the legacy data owner."));
    }
  } catch (error) {
    rollbackCopiedStorageEntries(copied.writtenEntries);
    console.warn(configuredAppText("Ascendra could not migrate legacy data."), error);
    return false;
  }

  entries.forEach((entry) => localStorage.removeItem(entry.key));
  return true;
}

function createModalController(dialog, initialFocus, options = {}) {
  const focusableSelector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled]):not([type='hidden'])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
  ].join(",");
  let previousFocus = null;

  function getFocusableElements() {
    return [...dialog.querySelectorAll(focusableSelector)].filter((element) => element.getClientRects().length > 0);
  }

  function close({ restoreFocus = true } = {}) {
    dialog.style.display = "none";
    dialog.setAttribute("aria-hidden", "true");
    document.removeEventListener("keydown", handleKeydown);
    options.onClose?.();

    if (restoreFocus && previousFocus?.isConnected) {
      previousFocus.focus();
    }
    previousFocus = null;
  }

  function handleKeydown(event) {
    if (dialog.getAttribute("aria-hidden") !== "false") return;

    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    if (event.key !== "Tab") return;
    const focusable = getFocusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!dialog.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function open() {
    previousFocus = document.activeElement;
    dialog.style.display = options.display || "block";
    dialog.setAttribute("aria-hidden", "false");
    options.onOpen?.();
    document.addEventListener("keydown", handleKeydown);

    requestAnimationFrame(() => {
      if (dialog.getAttribute("aria-hidden") !== "false") return;
      const target = typeof initialFocus === "function" ? initialFocus() : initialFocus;
      (target || getFocusableElements()[0] || dialog).focus();
    });
  }

  function destroy() {
    document.removeEventListener("keydown", handleKeydown);
    dialog.setAttribute("aria-hidden", "true");
    previousFocus = null;
  }

  return { open, close, destroy };
}

function formatHabitImportWeek(weekStart) {
  const dates = getHabitImportWeekDates(weekStart);
  if (dates.length !== 7) return "Unknown week";

  const format = { month: "short", day: "numeric", year: "numeric" };
  return `${dates[0].toLocaleDateString(undefined, format)} – ${dates[6].toLocaleDateString(undefined, format)}`;
}

function decodeHabitTrackerPhoto(file) {
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return Promise.reject(new Error("Choose a photo of the printed habit table."));
  }
  if (file.size > 20 * 1024 * 1024) {
    return Promise.reject(new Error("That photo is larger than 20 MB. Choose a smaller image."));
  }

  if (typeof createImageBitmap === "function") return createImageBitmap(file);

  return new Promise(function (resolve, reject) {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = function () {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = function () {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Ascendra could not open that photo."));
    };
    image.src = objectUrl;
  });
}

function findHabitTrackerScanCorners(imageData) {
  const { data, width, height } = imageData;
  const pixelCount = width * height;
  const dark = new Uint8Array(pixelCount);

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex++) {
    const dataIndex = pixelIndex * 4;
    const luminance = data[dataIndex] * 0.299 + data[dataIndex + 1] * 0.587 + data[dataIndex + 2] * 0.114;
    dark[pixelIndex] = data[dataIndex + 3] > 80 && luminance < 85 ? 1 : 0;
  }

  const queue = new Int32Array(pixelCount);
  const candidates = [];
  for (let start = 0; start < pixelCount; start++) {
    if (!dark[start]) continue;

    let head = 0;
    let tail = 0;
    let count = 0;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;
    queue[tail++] = start;
    dark[start] = 0;

    while (head < tail) {
      const current = queue[head++];
      const x = current % width;
      const y = Math.floor(current / width);
      count++;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      if (x > 0 && dark[current - 1]) {
        dark[current - 1] = 0;
        queue[tail++] = current - 1;
      }
      if (x + 1 < width && dark[current + 1]) {
        dark[current + 1] = 0;
        queue[tail++] = current + 1;
      }
      if (y > 0 && dark[current - width]) {
        dark[current - width] = 0;
        queue[tail++] = current - width;
      }
      if (y + 1 < height && dark[current + width]) {
        dark[current + width] = 0;
        queue[tail++] = current + width;
      }
    }

    const boxWidth = maxX - minX + 1;
    const boxHeight = maxY - minY + 1;
    const density = count / (boxWidth * boxHeight);
    const aspect = boxWidth / boxHeight;
    if (boxWidth >= 5 && boxHeight >= 5 && boxWidth <= 90 && boxHeight <= 90 && aspect >= 0.72 && aspect <= 1.38 && density >= 0.72) {
      candidates.push({
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
        side: (boxWidth + boxHeight) / 2,
      });
    }
  }

  const largest = candidates.sort((a, b) => b.side - a.side).slice(0, 16);
  let best = null;

  for (let a = 0; a < largest.length - 3; a++) {
    for (let b = a + 1; b < largest.length - 2; b++) {
      for (let c = b + 1; c < largest.length - 1; c++) {
        for (let d = c + 1; d < largest.length; d++) {
          const points = [largest[a], largest[b], largest[c], largest[d]];
          const averageSide = points.reduce((sum, point) => sum + point.side, 0) / 4;
          if (points.some((point) => Math.abs(point.side - averageSide) / averageSide > 0.28)) continue;

          const orderedByY = [...points].sort((left, right) => left.y - right.y);
          const top = orderedByY.slice(0, 2).sort((left, right) => left.x - right.x);
          const bottom = orderedByY.slice(2).sort((left, right) => left.x - right.x);
          const [topLeft, topRight] = top;
          const [bottomLeft, bottomRight] = bottom;
          const topWidth = Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y);
          const bottomWidth = Math.hypot(bottomRight.x - bottomLeft.x, bottomRight.y - bottomLeft.y);
          const leftHeight = Math.hypot(bottomLeft.x - topLeft.x, bottomLeft.y - topLeft.y);
          const rightHeight = Math.hypot(bottomRight.x - topRight.x, bottomRight.y - topRight.y);

          if (Math.min(topWidth, bottomWidth) < averageSide * 12 || Math.min(leftHeight, rightHeight) < averageSide * 3.5) continue;
          if (Math.max(topWidth, bottomWidth) / Math.min(topWidth, bottomWidth) > 1.55) continue;
          if (Math.max(leftHeight, rightHeight) / Math.min(leftHeight, rightHeight) > 1.8) continue;
          if (Math.abs(topRight.y - topLeft.y) / topWidth > 0.3 || Math.abs(bottomRight.y - bottomLeft.y) / bottomWidth > 0.3) continue;
          if (Math.abs(bottomLeft.x - topLeft.x) / leftHeight > 0.3 || Math.abs(bottomRight.x - topRight.x) / rightHeight > 0.3) continue;

          const area = ((topWidth + bottomWidth) / 2) * ((leftHeight + rightHeight) / 2);
          const score = area * averageSide;
          if (!best || score > best.score) best = { topLeft, topRight, bottomLeft, bottomRight, score };
        }
      }
    }
  }

  if (!best) throw new Error("Ascendra could not find all four table corner squares. Retake the photo straight-on with the whole table visible.");
  return best;
}

function mapHabitTrackerPoint(corners, horizontal, vertical) {
  const topX = corners.topLeft.x + (corners.topRight.x - corners.topLeft.x) * horizontal;
  const topY = corners.topLeft.y + (corners.topRight.y - corners.topLeft.y) * horizontal;
  const bottomX = corners.bottomLeft.x + (corners.bottomRight.x - corners.bottomLeft.x) * horizontal;
  const bottomY = corners.bottomLeft.y + (corners.bottomRight.y - corners.bottomLeft.y) * horizontal;
  return { x: topX + (bottomX - topX) * vertical, y: topY + (bottomY - topY) * vertical };
}

function measureHabitTrackerMark(imageData, corners, horizontal, vertical, horizontalRadius, verticalRadius) {
  const { data, width, height } = imageData;
  let darkPixels = 0;
  let sampledPixels = 0;

  for (let yStep = -5; yStep <= 5; yStep++) {
    for (let xStep = -5; xStep <= 5; xStep++) {
      const point = mapHabitTrackerPoint(corners, horizontal + horizontalRadius * (xStep / 5), vertical + verticalRadius * (yStep / 5));
      const x = Math.max(0, Math.min(width - 1, Math.round(point.x)));
      const y = Math.max(0, Math.min(height - 1, Math.round(point.y)));
      const dataIndex = (y * width + x) * 4;
      const luminance = data[dataIndex] * 0.299 + data[dataIndex + 1] * 0.587 + data[dataIndex + 2] * 0.114;
      if (luminance < 145) darkPixels++;
      sampledPixels++;
    }
  }

  return darkPixels / sampledPixels;
}

async function detectHabitTrackerMarks(file, importData) {
  const image = await decodeHabitTrackerPhoto(file);
  const maximumDimension = 1600;
  const scale = Math.min(1, maximumDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser cannot analyze the photo.");
  context.drawImage(image, 0, 0, width, height);
  if (typeof image.close === "function") image.close();

  const imageData = context.getImageData(0, 0, width, height);
  const corners = findHabitTrackerScanCorners(imageData);
  const dates = getHabitImportWeekDates(importData.weekStart);
  const todayKey = formatLocalDate();
  const nameColumnWidth = 0.23;
  const dayColumnWidth = (1 - nameColumnWidth) / 7;
  const rowHeight = 1 / (importData.habits.length + 1);
  let detected = 0;

  importData.habits.forEach(function (habit, habitIndex) {
    habit.results = dates.map(function (date, dayIndex) {
      if (!isHabitScheduledForDate(habit, date) || formatLocalDate(date) > todayKey) return null;
      const horizontal = nameColumnWidth + dayColumnWidth * (dayIndex + 0.5);
      const vertical = rowHeight * (habitIndex + 1.5);
      const inkRatio = measureHabitTrackerMark(imageData, corners, horizontal, vertical, dayColumnWidth * 0.09, rowHeight * 0.13);
      const marked = inkRatio >= 0.035;
      if (marked) detected++;
      return marked;
    });
  });

  return detected;
}

function initializeHabitImportPreview() {
  if (!pendingHabitImport) return;

  const dialog = document.getElementById("habit-import-dialog");
  const title = document.getElementById("habit-import-title");
  const description = document.getElementById("habit-import-description");
  const preview = document.getElementById("habit-import-preview");
  const status = document.getElementById("habit-import-status");
  const photoSection = document.getElementById("habit-photo-detection");
  const photoInput = document.getElementById("habit-photo-input");
  const photoStatus = document.getElementById("habit-photo-status");
  const confirmButton = document.getElementById("confirm-habit-import");
  const cancelButton = document.getElementById("cancel-habit-import");
  const closeButton = document.getElementById("close-habit-import");

  if (!dialog || !title || !description || !preview || !status || !photoSection || !photoInput || !photoStatus || !confirmButton || !cancelButton || !closeButton) return;

  const modal = createModalController(dialog, pendingHabitImport.error ? closeButton : confirmButton, { display: "flex" });

  function closeImportPreview() {
    pendingHabitImport = null;
    modal.close();
  }

  function renderImportPreview(data) {
    const dates = getHabitImportWeekDates(data.weekStart);
    const todayKey = formatLocalDate();
    preview.innerHTML = "";

    data.habits.forEach(function (habit) {
      const item = document.createElement("article");
      item.className = "habit-import-item";

      const heading = document.createElement("h3");
      heading.textContent = `${habit.emoji ? `${habit.emoji} ` : ""}${habit.name}`;

      const details = document.createElement("p");
      const frequency = habit.frequency === "weekdays" ? "Weekdays" : habit.frequency === "weekends" ? "Weekends" : "Every day";
      details.textContent = `${habit.type === "bad" ? "Avoid habit" : "Build habit"} · ${frequency}`;

      const results = document.createElement("ul");
      results.className = "habit-import-results";
      habit.results.forEach(function (result, index) {
        const resultItem = document.createElement("li");
        const resultButton = document.createElement("button");
        const dateKey = formatLocalDate(dates[index]);
        const scheduled = isHabitScheduledForDate(habit, dates[index]);
        const future = dateKey > todayKey;
        const day = dates[index].toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

        function updateResultButton() {
          const current = habit.results[index];
          resultButton.dataset.result = current === null ? "pending" : String(current);
          resultButton.textContent = !scheduled ? `— ${day}` : future ? `• ${day} · Future` : current === true ? `✅ ${day}` : current === false ? `❌ ${day}` : `• ${day} · Review`;
          resultButton.setAttribute(
            "aria-label",
            !scheduled ? `${day}, not scheduled` : future ? `${day}, future date` : `${day}, ${current === true ? "successful" : current === false ? "missed" : "not reviewed"}. Activate to change.`,
          );
        }

        resultButton.type = "button";
        resultButton.disabled = !scheduled || future;
        resultButton.addEventListener("click", function () {
          const current = habit.results[index];
          habit.results[index] = current === null ? true : current === true ? false : null;
          updateResultButton();
        });
        updateResultButton();
        resultItem.appendChild(resultButton);
        results.appendChild(resultItem);
      });

      item.append(heading, details, results);
      preview.appendChild(item);
    });
  }

  async function analyzeHabitPhoto() {
    const file = photoInput.files?.[0];
    const data = pendingHabitImport?.data;
    if (!file || !data) return;

    photoInput.disabled = true;
    photoStatus.textContent = "Analyzing the table on this device…";
    try {
      const detected = await detectHabitTrackerMarks(file, data);
      renderImportPreview(data);
      photoStatus.textContent = `Detected ${detected} checkmark${detected === 1 ? "" : "s"}. Review every result below before importing.`;
    } catch (error) {
      console.warn("Ascendra could not detect the paper habit checkmarks.", error);
      photoStatus.textContent = error instanceof Error ? error.message : "Ascendra could not analyze that photo.";
    } finally {
      photoInput.disabled = false;
      photoInput.value = "";
    }
  }

  function importReviewedHabits() {
    const data = pendingHabitImport?.data;
    const username = getLoggedInUsername();

    if (!data) return;
    if (!username) {
      status.textContent = "Log in to an Ascendra account before importing these habits.";
      return;
    }

    const savedHabits = getUserArray("habits");
    const dates = getHabitImportWeekDates(data.weekStart);
    let addedHabits = 0;
    let updatedResults = 0;

    data.habits.forEach(function (importedHabit, index) {
      const normalizedName = importedHabit.name.toLocaleLowerCase();
      let savedHabit = savedHabits.find((habit) => String(habit.name || "").trim().toLocaleLowerCase() === normalizedName);

      if (!savedHabit) {
        savedHabit = {
          id: Date.now() + index,
          name: importedHabit.name,
          emoji: importedHabit.emoji,
          type: importedHabit.type,
          frequency: importedHabit.frequency,
          goal: null,
          unit: "",
          reminder: null,
          notes: "",
          history: {},
        };
        savedHabits.push(savedHabit);
        addedHabits++;
      }

      const history = { ...getHabitHistory(savedHabit) };
      importedHabit.results.forEach(function (result, dayIndex) {
        if (typeof result !== "boolean") return;
        const dateKey = formatLocalDate(dates[dayIndex]);
        if (history[dateKey] !== result) updatedResults++;
        history[dateKey] = result;
      });
      savedHabit.history = history;
    });

    try {
      if (addedHabits > 0 || updatedResults > 0) {
        setUserItem("habits", JSON.stringify(savedHabits));
        syncProgressionFromActivity();
      }
    } catch (error) {
      console.error("Ascendra could not save the reviewed habit import.", error);
      status.textContent = "The import could not be saved. Your existing habits were not changed.";
      return;
    }

    pendingHabitImport = null;
    modal.close();
    if (["habits", "stats"].includes(getRoute())) renderRoute(getRoute(), { focusRoute: false });
  }

  closeButton.addEventListener("click", closeImportPreview);
  cancelButton.addEventListener("click", closeImportPreview);
  confirmButton.addEventListener("click", importReviewedHabits);
  photoInput.addEventListener("change", analyzeHabitPhoto);
  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) closeImportPreview();
  });

  if (pendingHabitImport.error) {
    title.textContent = "Habit import could not be opened";
    description.textContent = pendingHabitImport.error;
    preview.hidden = true;
    photoSection.hidden = true;
    confirmButton.hidden = true;
    cancelButton.textContent = "Dismiss";
  } else {
    const data = pendingHabitImport.data;
    title.textContent = "Review habit import";
    description.textContent = `${data.habits.length} habit${data.habits.length === 1 ? "" : "s"} · ${formatHabitImportWeek(data.weekStart)}`;
    photoSection.hidden = false;
    confirmButton.textContent = "Import Reviewed Habits";
    renderImportPreview(data);
  }

  modal.open();
}

localStorage.removeItem("password");

function normalizeRoute(value) {
  let route = String(value || "welcome")
    .replace(/^#\/?/, "")
    .replace(/\.html$/, "");
  if (route === "index" || route === "") route = "welcome";
  if (route === "alert") route = "alerts";
  return document.getElementById("page-" + route) ? route : "welcome";
}
function getRoute() {
  return normalizeRoute(location.hash);
}
function canonicalRouteHash(route) {
  return "#/" + normalizeRoute(route);
}
function navigate(route, replace = false) {
  route = normalizeRoute(route);
  const hash = canonicalRouteHash(route);
  if (replace) history.replaceState({ route }, "", hash);
  else if (location.hash !== hash) history.pushState({ route }, "", hash);
  renderRoute(route);
}
function goBack() {
  if (history.length > 1) {
    history.back();
  } else {
    navigate(getRoute() === "login" || getRoute() === "signup" ? "welcome" : "home", true);
  }
}
window.navigate = navigate;
window.goTo = function (page) {
  navigate(page);
};
window.goBack = goBack;
window.addEventListener("storage", function handleAccountStorageChange() {
  invalidateMissingActiveAccount();
});
window.addEventListener("focus", function handleAccountWindowFocus() {
  invalidateMissingActiveAccount();
});
document.addEventListener("visibilitychange", function handleAccountVisibility() {
  if (!document.hidden) invalidateMissingActiveAccount();
});

function getSavedSettings() {
  // Default to enabled so accounts created before this option keep their existing companion experience.
  const defaults = { accentColor: "purple", lightMode: true, ascendraAIEnabled: true };
  const saved = readUserJson("ascendraSettings", null);
  return saved && typeof saved === "object" && !Array.isArray(saved) ? { ...defaults, ...saved } : defaults;
}

function applySavedSettings() {
  const colors = {
    purple: "rgb(127, 0, 255)",
    blue: "rgb(37, 99, 235)",
    green: "rgb(21, 128, 61)",
    pink: "rgb(219, 39, 119)",
  };
  const settings = getSavedSettings();
  const darkModeEnabled = settings.lightMode === false;
  document.documentElement.style.setProperty("--accent", colors[settings.accentColor] || colors.purple);
  document.documentElement.style.setProperty("--bg", darkModeEnabled ? "#17131f" : "#f6f3ff");
  document.documentElement.style.setProperty("--card", darkModeEnabled ? "#241d30" : "white");
  document.documentElement.style.setProperty("--text", darkModeEnabled ? "#f5f5f5" : "#222");
  document.documentElement.style.setProperty("--muted", darkModeEnabled ? "#cbd5e1" : "#666");
  document.body.classList.toggle("dark-mode", darkModeEnabled);

  // Only an explicit opt-out hides the companion; missing legacy values continue to mean enabled.
  const ascendraAIEnabled = settings.ascendraAIEnabled !== false;
  const companion = document.getElementById("ascendra-ai");
  if (companion) {
    companion.hidden = !ascendraAIEnabled;

    if (!ascendraAIEnabled) {
      // Clear temporary movement states so turning the companion back on starts from a stable position.
      companion.classList.remove(
        "is-roaming",
        "is-jumping",
        "is-speaking",
        "is-tail-wagging",
        "is-looking-around",
        "is-stretching",
        "is-napping",
      );
      companion.style.setProperty("--ai-shift-x", "0px");
      companion.style.setProperty("--ai-shift-y", "0px");
    }
  }

  const modeToggle = document.getElementById("mode");
  if (modeToggle) modeToggle.checked = darkModeEnabled;

  const ascendraAIToggle = document.getElementById("ascendra-ai-enabled");
  if (ascendraAIToggle) ascendraAIToggle.checked = ascendraAIEnabled;
}

function clearWindowRouteFunction(name, routeFunction) {
  if (window[name] === routeFunction) {
    delete window[name];
  }
}

function renderRoute(route, { focusRoute = true } = {}) {
  route = normalizeRoute(route);
  if (route !== "login" && invalidateMissingActiveAccount()) return;
  const template = document.getElementById("page-" + route);
  if (!template) {
    app.innerHTML = '<div class="spa-error" role="main"><h1>Page not found</h1></div>';
    return;
  }
  // stop route-owned intervals/animations when possible by replacing the DOM and calling cleanup
  const old = app.dataset.route;
  if (old && initializedCleanups.has(old)) {
    try {
      initializedCleanups.get(old)();
    } catch (e) {
      console.warn(e);
    }
    initializedCleanups.delete(old);
  }
  app.innerHTML = "";
  const page = document.createElement("section");
  page.className = "ascendra-page";
  page.dataset.route = route;
  page.tabIndex = -1;
  page.appendChild(template.content.cloneNode(true));
  if (!page.querySelector("main")) page.setAttribute("role", "main");
  app.appendChild(page);
  renderAppMetadata(page);
  app.dataset.route = route;
  document.title = APP_CONFIG.name + " - " + route.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  backButton.hidden = route === "welcome";
  applySavedSettings();
  page.querySelectorAll(".navbar").forEach((navbar) => {
    if (navbar.tagName !== "NAV") {
      navbar.setAttribute("role", "navigation");
    }
    if (!navbar.hasAttribute("aria-label")) {
      navbar.setAttribute("aria-label", "Primary navigation");
    }
    navbar.querySelectorAll(".current").forEach((item) => {
      item.setAttribute("aria-current", "page");
    });
  });
  try {
    const cleanup = (ROUTE_INITIALIZERS[route] || function () {})();
    if (typeof cleanup === "function") initializedCleanups.set(route, cleanup);
  } catch (error) {
    console.error(configuredAppText("Ascendra page error on ") + route + ":", error);
    const box = document.createElement("div");
    box.className = "spa-error";
    box.innerHTML = "<h2>This page hit an error</h2><p>Open DevTools Console for the exact line.</p>";
    page.prepend(box);
  }
  if (focusRoute) {
    page.focus({ preventScroll: true });
  }
  window.scrollTo(0, 0);
}
function handleLocationChange() {
  const route = getRoute();
  const canonicalHash = canonicalRouteHash(route);
  if (location.hash !== canonicalHash) {
    history.replaceState({ route }, "", canonicalHash);
  }
  if (app.dataset.route !== route) renderRoute(route);
}
window.addEventListener("popstate", handleLocationChange);
window.addEventListener("hashchange", handleLocationChange);
document.addEventListener("click", function (e) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest('a[href^="#/"]');
  if (!a || a.hasAttribute("download") || (a.target && a.target.toLowerCase() !== "_self")) return;
  e.preventDefault();
  navigate(a.getAttribute("href"));
});

const ROUTE_INITIALIZERS = {
  welcome: function init_welcome() {},
  "loading-screen": function init_loading_screen() {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    const reduceLoadingMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let backgroundStars = [];
    let viewportWidth = window.innerWidth;
    let viewportHeight = window.innerHeight;
    let animationFrame = null;

    // Resize canvas and create stars
    function resizeCanvas() {
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.width = viewportWidth + "px";
      canvas.style.height = viewportHeight + "px";
      canvas.width = Math.round(viewportWidth * pixelRatio);
      canvas.height = Math.round(viewportHeight * pixelRatio);
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      backgroundStars = [];

      // Create random stars
      for (let i = 0; i < 75; i++) {
        backgroundStars.push({
          x: Math.random() * viewportWidth,
          y: Math.random() * viewportHeight,
          size: Math.random() * 2.5 + 1,
          color: Math.random() < 0.85 ? "white" : "rgb(242,241,153)",
        });
      }
    }

    resizeCanvas();

    // Shooting star variables
    let xPos = 300;
    let yPos = 100;
    let starSize = 8;
    let starEdge = 12;

    // Draw a circle
    function circle(x, y, size, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    function handleCanvasResize() {
      resizeCanvas();
      if (reduceLoadingMotion) draw();
    }

    window.addEventListener("resize", handleCanvasResize);

    function draw() {
      // Background
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, viewportWidth, viewportHeight);

      // Draw random stars
      for (const star of backgroundStars) {
        circle(star.x, star.y, star.size, star.color);
      }

      // Center the shooting star
      ctx.save();

      const sceneScale = Math.min(1, (viewportWidth * 0.9) / 400, (viewportHeight * 0.9) / 400);
      const offsetX = (viewportWidth - 400 * sceneScale) / 2;
      const offsetY = (viewportHeight - 400 * sceneScale) / 2;
      ctx.translate(offsetX, offsetY);
      ctx.scale(sceneScale, sceneScale);

      // Red glow
      circle(xPos, yPos, starEdge, "red");

      // Shooting star
      ctx.lineWidth = 5;
      ctx.strokeStyle = "orange";
      ctx.fillStyle = "yellow";

      ctx.beginPath();
      ctx.arc(xPos, yPos, starSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();

      if (!reduceLoadingMotion) {
        xPos -= 3;
        yPos += 3;
        starSize += 0.7;
        starEdge += 0.7;

        if (xPos < -150 || yPos > 550) {
          xPos = 500;
          yPos = -50;
          starSize = 8;
          starEdge = 12;
        }

        animationFrame = requestAnimationFrame(draw);
      }
    }

    draw();
    return () => {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", handleCanvasResize);
    };
  },
  login: function init_login() {
    const loginForm = document.getElementById("login");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const submitButton = loginForm.querySelector('[type="submit"]');
    let loginActive = true;

    async function handleLoginSubmit(event) {
      event.preventDefault();

      const username = usernameInput.value.trim();
      const password = passwordInput.value;
      const record = findStoredAccount(username);
      const recordSnapshot = record ? localStorage.getItem(record.key) : null;

      function accountChangedDuringLogin() {
        return Boolean(record && localStorage.getItem(record.key) !== recordSnapshot);
      }

      submitButton.disabled = true;
      try {
        let savedUser = record?.account || null;
        let passwordMatches = false;
        let needsMigration = false;

        if (savedUser?.credentials) {
          passwordMatches = await verifyPasswordCredentials(password, savedUser.credentials);
          if (!loginActive) return;
          if (accountChangedDuringLogin()) {
            alert("That account changed. Please try logging in again.");
            return;
          }
          needsMigration =
            passwordMatches && (savedUser.credentials.iterations < PASSWORD_ITERATIONS || typeof savedUser.password === "string");
        } else if (savedUser && typeof savedUser.password === "string") {
          passwordMatches = savedUser.password === password;
          needsMigration = passwordMatches;
        }

        if (!passwordMatches) {
          alert("Wrong username or password!");
          passwordInput.value = "";
          passwordInput.focus();
          return;
        }

        if (needsMigration || !savedUser.accountId) {
          const credentials = needsMigration ? await createPasswordCredentials(password) : savedUser.credentials;
          if (!loginActive) return;
          if (accountChangedDuringLogin()) {
            alert("That account changed. Please try logging in again.");
            return;
          }
          savedUser = {
            ...savedUser,
            username: savedUser.username || username,
            accountId: savedUser.accountId || createAccountId(),
            credentials,
          };
          delete savedUser.password;
          saveStoredAccount(savedUser);
          if (record.key !== accountStorageKey(savedUser.username)) {
            localStorage.removeItem(record.key);
          }
        }

        const savedUsername = savedUser.username || username;
        migrateLegacyUserData(savedUsername);
        setActiveIdentity({
          loggedInUser: savedUsername,
          name: savedUser.name || "",
          surname: savedUser.surname || "",
          username: savedUsername,
          accountId: savedUser.accountId,
        });
        localStorage.removeItem("password");
        alert("Welcome back, " + (savedUser.name || savedUsername) + "!");
        loginForm.reset();
        navigate("home");
      } catch (error) {
        if (!loginActive) return;
        console.error("Could not verify the account:", error);
        alert(error.message || "Could not securely verify this account.");
      } finally {
        if (loginActive) submitButton.disabled = false;
      }
    }

    loginForm.addEventListener("submit", handleLoginSubmit);
    return () => {
      loginActive = false;
      loginForm.removeEventListener("submit", handleLoginSubmit);
    };
  },
  signup: function init_signup() {
    const signupForm = document.getElementById("signupForm");
    const submitButton = signupForm.querySelector('[type="submit"]');
    let signupActive = true;

    async function handleSignupSubmit(event) {
      event.preventDefault();

      const name = document.getElementById("name").value.trim();
      const surname = document.getElementById("surname").value.trim();
      const username = normalizeUsername(document.getElementById("username").value);
      const password = document.getElementById("password").value;

      if (!name || !surname || !username) {
        alert("Enter your first name, last name, and username.");
        return;
      }

      const usernameValidationMessage = getUsernameValidationMessage(username);
      if (usernameValidationMessage) {
        alert(usernameValidationMessage);
        return;
      }

      if (password.length < 8) {
        alert("Use a password with at least 8 characters.");
        return;
      }

      if (findStoredAccount(username) || hasUserDataNamespace(username)) {
        alert("That username is already in use.");
        return;
      }

      submitButton.disabled = true;
      let accountSaved = false;
      let guestTransferComplete = false;
      try {
        const credentials = await createPasswordCredentials(password);
        if (!signupActive) return;
        if (findStoredAccount(username) || hasUserDataNamespace(username)) {
          alert("That username is already in use.");
          return;
        }

        const user = {
          version: 2,
          name,
          surname,
          username,
          accountId: createAccountId(),
          credentials,
        };

        saveStoredAccount(user);
        accountSaved = true;
        transferGuestDataToUser(username);
        guestTransferComplete = true;
        migrateLegacyUserData(username);
        setActiveIdentity({
          loggedInUser: username,
          name,
          surname,
          username,
          accountId: user.accountId,
        });
        localStorage.removeItem("password");

        alert("Account created!");
        signupForm.reset();
        navigate("home");
      } catch (error) {
        if (!signupActive) return;
        if (accountSaved && !guestTransferComplete) {
          localStorage.removeItem(accountStorageKey(username));
        }
        console.error("Could not create the account:", error);
        alert(error.message || "Could not securely create this account.");
      } finally {
        if (signupActive) submitButton.disabled = false;
      }
    }

    signupForm.addEventListener("submit", handleSignupSubmit);
    return () => {
      signupActive = false;
      signupForm.removeEventListener("submit", handleSignupSubmit);
    };
  },
  home: function init_home() {
    // ===========================
    // Greeting
    // ===========================

    const greeting = document.getElementById("greeting");
    const dateText = document.getElementById("dateText");

    const now = new Date();
    const hour = now.getHours();

    const firstName = getActiveIdentityItem("name");
    const lastName = getActiveIdentityItem("surname");
    const fullName = `${firstName} ${lastName}`.trim();

    let greetingText = "";
    let emoji = "";

    if (hour >= 5 && hour < 12) {
      greetingText = "Good morning";
      emoji = "☀️";
    } else if (hour >= 12 && hour < 17) {
      greetingText = "Good afternoon";
      emoji = "🌤️";
    } else if (hour >= 17 && hour < 21) {
      greetingText = "Good evening";
      emoji = "🌅";
    } else {
      greetingText = "Good night";
      emoji = "🌙";
    }

    if (greeting) {
      if (fullName !== "") {
        greeting.textContent = `${greetingText}, ${fullName}! ${emoji}`;
      } else {
        greeting.textContent = `${greetingText}! ${emoji}`;
      }
    }

    if (dateText) {
      dateText.textContent = now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }

    // ===========================
    // Motivational Message
    // ===========================

    const messages = [
      {
        text1: "Cristiano Ronaldo - 'Talent without working hard is nothing.'",
      },
      {
        text2: 'Audrey Hepburn - "Nothing is impossible. The word itself even says I\'m possible!"',
      },
      {
        text3: "孔丘 - 'It doesn't matter how slow you go, as long as you never stop'",
      },
      {
        text4: "Thomas Edison - 'Many of life's failures are people who did not realize how close they were to success when they gave up.'",
      },
      {
        text5: "Nelson Mandela - 'It always seems impossible until it's done.'",
      },
      { text6: "Wayne Gretzky - 'You miss 100% of the shots you don't take.'" },
      {
        text7: "Vincent Van Gogh - 'Great things are done by a series of small things brought together'",
      },
    ];

    // Gets a random message from messages
    const randomIndex = Math.floor(Math.random() * messages.length);

    // Changes the text to the random message
    const message = document.getElementById("motivational-message");

    if (randomIndex === 0) {
      message.textContent = messages[0].text1;
    } else if (randomIndex === 1) {
      message.textContent = messages[1].text2;
    } else if (randomIndex === 2) {
      message.textContent = messages[2].text3;
    } else if (randomIndex === 3) {
      message.textContent = messages[3].text4;
    } else if (randomIndex === 4) {
      message.textContent = messages[4].text5;
    } else if (randomIndex === 5) {
      message.textContent = messages[5].text6;
    } else if (randomIndex === 6) {
      message.textContent = messages[6].text7;
    } else {
      message.textContent = "It seems the message couldn't load.";
    }

    // ===========================
    // Load Data
    // ===========================

    const todos = getUserArray("todos");
    const events = getUserArray("events");
    const habits = getUserArray("habits");
    const todayDateKey = formatLocalDate(now);
    const todayTodos = todos.filter((todo) => todo.date === todayDateKey);
    const scheduledHabits = habits.filter((habit) => {
      return isHabitScheduledForDate(habit, now);
    });

    // ===========================
    // Elements
    // ===========================

    const todoList = document.getElementById("todoList");
    const calendarList = document.getElementById("calendarList");
    const habitList = document.getElementById("habitList");

    const progressFill = document.getElementById("progressFill");
    const progressText = document.getElementById("progressText");

    // ===========================
    // To-Dos
    // ===========================

    if (todoList) {
      todoList.innerHTML = "";

      const activeTodos = todayTodos.filter((todo) => !isTodoCompleted(todo)).slice(0, 5);

      if (activeTodos.length === 0) {
        todoList.innerHTML = "<li>No to-dos due today 🎉</li>";
      } else {
        activeTodos.forEach((todo) => {
          const li = document.createElement("li");

          li.textContent = todo.date ? `${todo.task} — ${todo.date}` : `${todo.task} — No due date`;

          todoList.appendChild(li);
        });
      }
    }
    // ===========================
    // Calendar
    // ===========================

    if (calendarList) {
      calendarList.innerHTML = "";

      const nextEvents = events
        .filter((event) => {
          const date = eventDateTime(event);
          return date && date.getTime() >= now.getTime();
        })
        .sort((a, b) => {
          const dateA = eventDateTime(a);
          const dateB = eventDateTime(b);
          return (dateA?.getTime() ?? Number.POSITIVE_INFINITY) - (dateB?.getTime() ?? Number.POSITIVE_INFINITY);
        })
        .slice(0, 3);

      if (nextEvents.length === 0) {
        calendarList.innerHTML = "<li>No upcoming events</li>";
      } else {
        nextEvents.forEach((event) => {
          const li = document.createElement("li");

          li.textContent = `${formatEventDateTime(event)} — ${event.title || event.name || "Event"}`;

          calendarList.appendChild(li);
        });
      }
    }

    // ===========================
    // Habits
    // ===========================

    if (habitList) {
      habitList.innerHTML = "";

      if (habits.length === 0) {
        habitList.innerHTML = "<li>No habits yet</li>";
      } else {
        habits.slice(0, 5).forEach((habit) => {
          const li = document.createElement("li");

          li.textContent = `${habit.type === "bad" ? "⚠️" : "✅"} ${habit.name}`;

          habitList.appendChild(li);
        });
      }
    }

    // ===========================
    // Progress
    // ===========================

    let totalItems = todayTodos.length + scheduledHabits.length;
    let completedItems = 0;

    todayTodos.forEach((todo) => {
      if (isTodoCompleted(todo)) completedItems++;
    });

    scheduledHabits.forEach((habit) => {
      if (getHabitHistory(habit)[todayDateKey] === true) {
        completedItems++;
      }
    });

    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    if (progressFill && progressText) {
      progressFill.style.width = progress + "%";
      progressText.textContent = progress + "% complete";
      const progressBar = progressFill.closest(".progress-bar");
      if (progressBar) {
        progressBar.setAttribute("role", "progressbar");
        progressBar.setAttribute("aria-valuemin", "0");
        progressBar.setAttribute("aria-valuemax", "100");
        progressBar.setAttribute("aria-valuenow", String(progress));
        progressBar.setAttribute("aria-valuetext", `${completedItems} of ${totalItems} items complete (${progress}%)`);
      }
    }

    // ===========================
    // Shooting Star
    // ===========================

    const starContainer = document.getElementById("shootingStars");
    const reduceHomeMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function createStar() {
      if (!starContainer) return;

      const star = document.createElement("div");
      star.className = "star";

      // Start on the RIGHT side of the hero
      star.style.left = starContainer.offsetWidth - 30 + "px";

      // Random height near the top
      star.style.top = Math.random() * 80 + 20 + "px";

      starContainer.appendChild(star);

      star.addEventListener("animationend", () => {
        star.remove();
      });
    }

    // Random every 3–7 seconds
    let starInterval = null;
    if (!reduceHomeMotion) {
      createStar();
      starInterval = setInterval(
        () => {
          createStar();
        },
        Math.random() * 4000 + 3000,
      );
    }

    return () => {
      if (starInterval !== null) clearInterval(starInterval);
    };
  },

  alerts: function init_alerts() {
    const alertList = document.getElementById("alertList");

    let todos = getUserArray("todos");

    function saveTodos() {
      setUserItem("todos", JSON.stringify(todos));
      announceProgressionReward(syncProgressionFromActivity());
    }

    function formatPriority(priority) {
      if (priority === "high") return "🔴 High";
      if (priority === "low") return "🟢 Low";
      return "🟡 Medium";
    }

    function getStatus(todo) {
      const now = new Date();
      const dueDayNumber = dateKeyDayNumber(todo.date);
      const todayDayNumber = dateKeyDayNumber(now);
      const daysLeft = dueDayNumber - todayDayNumber;

      if (!Number.isFinite(daysLeft)) {
        return {
          text: "Date unavailable",
          className: "status-unavailable",
        };
      }

      if (daysLeft < 0) {
        const overdueDays = Math.abs(daysLeft);

        return {
          text: `🔴 Overdue by ${overdueDays} ${overdueDays === 1 ? "day" : "days"}`,
          className: "status-overdue",
        };
      }

      if (daysLeft === 0) {
        const dueDateTime = todo.time ? parseLocalDateTime(todo.date, todo.time) : null;
        if (dueDateTime && dueDateTime.getTime() < now.getTime()) {
          return {
            text: "Overdue",
            className: "status-overdue",
          };
        }
        return {
          text: "🟠 Due Today",
          className: "status-today",
        };
      }

      if (daysLeft === 1) {
        return {
          text: "🟡 Due Tomorrow",
          className: "status-tomorrow",
        };
      }

      return {
        text: `🟢 Due in ${daysLeft} days`,
        className: "status-upcoming",
      };
    }

    function sortAlerts(a, b) {
      const dateDifference = dateKeyDayNumber(a.date) - dateKeyDayNumber(b.date);

      if (dateDifference !== 0) {
        return dateDifference;
      }

      return String(a.time || "").localeCompare(String(b.time || ""));
    }

    function showAlerts() {
      alertList.innerHTML = "";

      // Ignore completed tasks and tasks with no due date.
      const activeAlerts = todos.filter((todo) => !isTodoCompleted(todo) && todo.date).sort(sortAlerts);

      if (activeAlerts.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "alert-empty";
        emptyMessage.textContent = "No alerts 🎉";

        alertList.appendChild(emptyMessage);
        return;
      }

      activeAlerts.forEach((todo) => {
        const card = document.createElement("article");
        card.classList.add("alert-card");

        const details = document.createElement("div");
        details.classList.add("alert-details");

        const title = document.createElement("h3");
        title.classList.add("alert-title");
        title.textContent = todo.task;

        const dueDate = document.createElement("p");
        dueDate.classList.add("alert-date");

        dueDate.textContent = todo.time ? `📅 ${todo.date} at ${todo.time}` : `📅 ${todo.date}`;

        const status = getStatus(todo);

        const statusText = document.createElement("p");
        statusText.classList.add("alert-status", status.className);
        statusText.textContent = status.text;

        const priorityText = document.createElement("p");
        priorityText.classList.add("alert-priority", `priority-${todo.priority || "medium"}`);
        priorityText.textContent = `Priority: ${formatPriority(todo.priority)}`;

        details.append(title, dueDate, statusText, priorityText);

        if (todo.estimatedMinutes) {
          const estimate = document.createElement("p");
          estimate.classList.add("alert-estimate");
          estimate.textContent = `⏱ Estimated time: ${todo.estimatedMinutes} min`;

          details.appendChild(estimate);
        }

        if (todo.notes) {
          const notes = document.createElement("p");
          notes.classList.add("alert-notes");
          notes.textContent = todo.notes;

          details.appendChild(notes);
        }

        const actions = document.createElement("div");
        actions.classList.add("alert-actions");

        const completeButton = document.createElement("button");
        completeButton.classList.add("alert-complete-btn");
        completeButton.type = "button";
        completeButton.textContent = "Mark Done";

        completeButton.setAttribute("aria-label", `Mark task complete: ${todo.task}`);

        completeButton.onclick = () => {
          todo.completed = true;
          saveTodos();
          showAlerts();
          const remainingTodos = todos.filter((savedTodo) => !isTodoCompleted(savedTodo)).length;
          showAscendraAIResponse(remainingTodos === 0 ? "allTasksComplete" : "taskComplete", {
            username: getLoggedInUsername(),
            remainingTodos,
          });
        };

        const viewButton = document.createElement("button");
        viewButton.classList.add("alert-view-btn");
        viewButton.type = "button";
        viewButton.textContent = "View To-Do";

        viewButton.onclick = () => {
          navigate("todos");
        };

        actions.append(completeButton, viewButton);

        card.append(details, actions);

        alertList.appendChild(card);
      });
    }

    showAlerts();
  },
  todos: function init_todos() {
    const addBtn = document.getElementById("add-btn");
    const popup = document.getElementById("popup");
    const cancelBtn = document.getElementById("cancel-btn");
    const todoForm = document.getElementById("todo-form");

    const taskInput = document.getElementById("task-input");
    const priorityInput = document.getElementById("priority-input");
    const estimatedInput = document.getElementById("estimated-input");
    const noDateInput = document.getElementById("no-date-input");
    const dueDateFields = document.getElementById("due-date-fields");
    const dateInput = document.getElementById("date-input");
    const timeInput = document.getElementById("time-input");
    const notesInput = document.getElementById("notes-input");

    const todoList = document.getElementById("todo-list");
    const todoSummary = document.getElementById("todo-summary");
    const filterButtons = [...document.querySelectorAll(".todo-filter")];

    const modal = createModalController(popup, taskInput, {
      onClose: () => {
        todoForm.reset();
        priorityInput.value = "medium";
        updateDueDateFields();
      },
    });

    let todos = getUserArray("todos");
    let activeFilter = "all";

    function saveTodos() {
      setUserItem("todos", JSON.stringify(todos));
      announceProgressionReward(syncProgressionFromActivity());
    }

    function updateDueDateFields() {
      const hasNoDueDate = noDateInput.checked;

      dateInput.disabled = hasNoDueDate;
      timeInput.disabled = hasNoDueDate;
      dueDateFields.classList.toggle("disabled", hasNoDueDate);

      if (hasNoDueDate) {
        dateInput.value = "";
        timeInput.value = "";
      }
    }

    function formatPriority(priority) {
      if (priority === "high") return "🔴 High";
      if (priority === "low") return "🟢 Low";
      return "🟡 Medium";
    }

    function formatDueDate(todo) {
      if (!todo.date) {
        return "No due date";
      }

      if (todo.time) {
        return `Due: ${todo.date} at ${todo.time}`;
      }

      return `Due: ${todo.date}`;
    }

    function sortTodos(a, b) {
      if (!a.date && !b.date) {
        return Number(a.id) - Number(b.id);
      }

      if (!a.date) return 1;
      if (!b.date) return -1;

      const dateComparison = String(a.date).localeCompare(String(b.date));

      if (dateComparison !== 0) {
        return dateComparison;
      }

      return String(a.time || "").localeCompare(String(b.time || ""));
    }

    function showTodos() {
      todoList.innerHTML = "";

      const remaining = todos.filter((todo) => !isTodoCompleted(todo)).length;

      todoSummary.textContent = `${remaining} ${remaining === 1 ? "task" : "tasks"} remaining`;

      const visibleTodos = todos
        .filter((todo) => {
          if (activeFilter === "completed") {
            return isTodoCompleted(todo);
          }

          if (activeFilter === "active") {
            return !isTodoCompleted(todo);
          }

          return true;
        })
        .sort(sortTodos);

      if (visibleTodos.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "todo-empty";

        emptyMessage.textContent = todos.length === 0 ? "No tasks yet" : `No ${activeFilter} tasks`;

        todoList.appendChild(emptyMessage);
        return;
      }

      visibleTodos.forEach((todo) => {
        const card = document.createElement("div");
        card.classList.add("todo-card");

        if (isTodoCompleted(todo)) {
          card.classList.add("completed");
        }

        const info = document.createElement("div");
        info.className = "todo-info";

        const title = document.createElement("div");
        title.className = "todo-title";
        title.textContent = todo.task;

        const dueDate = document.createElement("div");
        dueDate.className = "todo-date";
        dueDate.textContent = formatDueDate(todo);

        const priority = document.createElement("div");
        priority.className = `todo-priority priority-${todo.priority || "medium"}`;
        priority.textContent = `Priority: ${formatPriority(todo.priority)}`;

        info.append(title, dueDate, priority);

        if (todo.estimatedMinutes) {
          const estimate = document.createElement("div");
          estimate.className = "todo-estimate";
          estimate.textContent = `Estimated time: ${todo.estimatedMinutes} min`;

          info.appendChild(estimate);
        }

        if (todo.notes) {
          const notes = document.createElement("p");
          notes.className = "todo-notes";
          notes.textContent = todo.notes;

          info.appendChild(notes);
        }

        const completeBtn = document.createElement("button");
        completeBtn.className = "complete-btn";
        completeBtn.type = "button";
        completeBtn.textContent = isTodoCompleted(todo) ? "Undo" : "Done";

        completeBtn.setAttribute("aria-label", `${isTodoCompleted(todo) ? "Mark incomplete" : "Mark complete"}: ${todo.task}`);

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-btn";
        deleteBtn.type = "button";
        deleteBtn.textContent = "Delete";

        deleteBtn.setAttribute("aria-label", `Delete task: ${todo.task}`);

        completeBtn.onclick = () => {
          const isCompleting = !isTodoCompleted(todo);
          todo.completed = isCompleting;
          saveTodos();
          showTodos();

          if (isCompleting) {
            const remainingTodos = todos.filter((savedTodo) => !isTodoCompleted(savedTodo)).length;
            showAscendraAIResponse(remainingTodos === 0 ? "allTasksComplete" : "taskComplete", {
              username: getLoggedInUsername(),
              remainingTodos,
            });
          }
        };

        deleteBtn.onclick = () => {
          todos = todos.filter((savedTodo) => savedTodo.id !== todo.id);
          saveTodos();
          showTodos();
        };

        card.append(info, completeBtn, deleteBtn);
        todoList.appendChild(card);
      });
    }

    addBtn.onclick = () => {
      dateInput.min = formatLocalDate();
      priorityInput.value = "medium";
      noDateInput.checked = false;
      updateDueDateFields();
      modal.open();
    };

    cancelBtn.onclick = () => {
      modal.close();
    };

    noDateInput.onchange = () => {
      updateDueDateFields();
    };

    filterButtons.forEach((button) => {
      button.onclick = () => {
        activeFilter = button.dataset.filter;

        filterButtons.forEach((item) => {
          const selected = item === button;

          item.classList.toggle("active", selected);
          item.setAttribute("aria-pressed", String(selected));
        });

        showTodos();
      };

      button.setAttribute("aria-pressed", String(button.dataset.filter === activeFilter));
    });

    todoForm.onsubmit = (event) => {
      event.preventDefault();

      const task = taskInput.value.trim();
      const noDueDate = noDateInput.checked;
      const date = noDueDate ? null : dateInput.value;
      const time = noDueDate ? null : timeInput.value;
      const priority = priorityInput.value;
      const notes = notesInput.value.trim();

      const estimatedMinutes = estimatedInput.value === "" ? null : Number(estimatedInput.value);

      if (task === "") {
        alert("Add a task name first!");
        return;
      }

      if (!noDueDate && date === "") {
        alert("Choose a due date or select No due date.");
        return;
      }

      if (estimatedMinutes !== null && (!Number.isFinite(estimatedMinutes) || estimatedMinutes < 1)) {
        alert("Estimated minutes must be at least 1.");
        return;
      }

      todos.push({
        id: Date.now(),
        task: task,
        date: date,
        time: time,
        priority: priority,
        notes: notes,
        estimatedMinutes: estimatedMinutes,
        completed: false,
      });

      saveTodos();
      showTodos();
      modal.close();
    };

    popup.onclick = (event) => {
      if (event.target === popup) {
        modal.close();
      }
    };

    updateDueDateFields();
    showTodos();

    window.saveTodos = saveTodos;
    window.showTodos = showTodos;

    window.createTodoFromAI = (task, note, priority) => {
      console.log("AI CREATE TASK CALLED:", task, note, priority);

      todos.push({
        id: Date.now(),
        task: task,
        date: null,
        time: null,
        priority: priority || "medium",
        notes: note || "",
        estimatedMinutes: null,
        completed: false,
      });

      saveTodos();
      showTodos();
    };

    return () => {
      modal.destroy();
      clearWindowRouteFunction("saveTodos", saveTodos);
      clearWindowRouteFunction("showTodos", showTodos);
    };
  },
  habits: function init_habits() {
    const addHabitBtn = document.getElementById("addHabitBtn");
    const habitPopup = document.getElementById("habitPopup");
    const habitForm = document.getElementById("habitForm");
    const cancelHabitBtn = document.getElementById("cancelHabitBtn");

    const habitInput = document.getElementById("habitInput");
    const habitEmoji = document.getElementById("habitEmoji");
    const habitType = document.getElementById("habitType");
    const habitFrequency = document.getElementById("habitFrequency");
    const habitGoal = document.getElementById("habitGoal");
    const habitUnit = document.getElementById("habitUnit");
    const habitReminder = document.getElementById("habitReminder");
    const noReminderInput = document.getElementById("noReminderInput");
    const reminderFields = document.getElementById("reminderFields");
    const habitNotes = document.getElementById("habitNotes");

    const habitList = document.getElementById("habitList");

    const modal = createModalController(habitPopup, habitInput, {
      display: "flex",

      onClose: () => {
        habitForm.reset();
        habitType.value = "good";
        habitFrequency.value = "daily";
        updateReminderFields();
      },
    });

    let habits = getUserArray("habits");

    function saveHabits() {
      setUserItem("habits", JSON.stringify(habits));
      announceProgressionReward(syncProgressionFromActivity());
    }

    function getToday() {
      return formatLocalDate();
    }

    function updateReminderFields() {
      // Some versions of the Habits HTML do not include every reminder field.
      // Do not crash the whole route when an optional element is missing.
      if (!noReminderInput || !habitReminder || !reminderFields) {
        return;
      }

      const noReminder = noReminderInput.checked;

      habitReminder.disabled = noReminder;
      reminderFields.classList.toggle("disabled", noReminder);

      if (noReminder) {
        habitReminder.value = "";
      }
    }

    function saveHabitResult(habit, result) {
      if (!isHabitScheduledForDate(habit)) {
        return false;
      }

      const today = getToday();
      habit.history = getHabitHistory(habit);

      habit.history[today] = result;

      saveHabits();
      return true;
    }

    function getHabitResultText(habit) {
      if (!isHabitScheduledForDate(habit)) {
        return "Not scheduled today";
      }

      const today = getToday();
      const result = getHabitHistory(habit)[today];

      if (result === true) {
        return habit.type === "bad" ? "Avoided today ✅" : "Completed today ✅";
      }

      if (result === false) {
        return habit.type === "bad" ? "Habit happened today ❌" : "Missed today ❌";
      }

      return "Not checked today";
    }

    function getFrequencyText(frequency) {
      if (frequency === "weekdays") {
        return "Weekdays";
      }

      if (frequency === "weekends") {
        return "Weekends";
      }

      return "Every day";
    }

    function getCurrentStreak(habit) {
      return getHabitCurrentStreak(habit);
    }

    function showHabits() {
      habitList.innerHTML = "";

      if (habits.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "habit-empty";
        emptyMessage.textContent = "No habits yet";
        habitList.appendChild(emptyMessage);
        return;
      }

      habits.forEach((habit) => {
        const habitCard = document.createElement("div");
        habitCard.classList.add("habit");
        const isScheduledToday = isHabitScheduledForDate(habit);

        const leftSide = document.createElement("div");
        leftSide.classList.add("left");

        const habitTitle = document.createElement("div");
        habitTitle.classList.add("habit-title");

        const emoji = habit.emoji ? `${habit.emoji} ` : "";
        habitTitle.textContent = `${emoji}${habit.name}`;

        const habitTypeText = document.createElement("div");
        habitTypeText.classList.add("habit-type");

        habitTypeText.textContent = habit.type === "bad" ? "Bad habit" : "Good habit";

        const habitFrequencyText = document.createElement("div");
        habitFrequencyText.classList.add("habit-frequency");
        habitFrequencyText.textContent = `Frequency: ${getFrequencyText(habit.frequency)}`;

        const habitResult = document.createElement("div");
        habitResult.classList.add("habit-result");
        habitResult.textContent = getHabitResultText(habit);

        const habitStreak = document.createElement("div");
        habitStreak.classList.add("habit-streak");

        const streak = getCurrentStreak(habit);
        habitStreak.textContent = `🔥 ${streak} day${streak === 1 ? "" : "s"} streak`;

        leftSide.append(habitTitle, habitTypeText, habitFrequencyText, habitResult, habitStreak);

        if (habit.goal && habit.unit) {
          const goalText = document.createElement("div");
          goalText.classList.add("habit-goal");
          goalText.textContent = `Goal: ${habit.goal} ${habit.unit}`;

          leftSide.appendChild(goalText);
        }

        if (habit.reminder) {
          const reminderText = document.createElement("div");
          reminderText.classList.add("habit-reminder");
          reminderText.textContent = `Reminder: ${habit.reminder}`;

          leftSide.appendChild(reminderText);
        }

        if (habit.notes) {
          const notesText = document.createElement("p");
          notesText.classList.add("habit-notes");
          notesText.textContent = habit.notes;

          leftSide.appendChild(notesText);
        }

        const rightSide = document.createElement("div");
        rightSide.classList.add("right");

        const checkButton = document.createElement("button");
        checkButton.classList.add("check-btn");
        checkButton.type = "button";
        checkButton.textContent = "✅";

        checkButton.setAttribute("aria-label", `Mark ${habit.name} successful today`);
        checkButton.disabled = !isScheduledToday;

        const xButton = document.createElement("button");
        xButton.classList.add("x-btn");
        xButton.type = "button";
        xButton.textContent = "❌";

        xButton.setAttribute("aria-label", `Mark ${habit.name} missed today`);
        xButton.disabled = !isScheduledToday;

        if (!isScheduledToday) {
          const scheduleMessage = `${habit.name} is not scheduled today`;
          checkButton.title = scheduleMessage;
          xButton.title = scheduleMessage;
        }

        const deleteButton = document.createElement("button");
        deleteButton.classList.add("delete-btn");
        deleteButton.type = "button";
        deleteButton.textContent = "🗑️";

        deleteButton.setAttribute("aria-label", `Delete habit: ${habit.name}`);

        checkButton.onclick = () => {
          saveHabitResult(habit, true);
          showHabits();
          showAscendraAIResponse("habitComplete", {
            username: getLoggedInUsername(),
          });
        };

        xButton.onclick = () => {
          saveHabitResult(habit, false);
          showHabits();
        };

        deleteButton.onclick = () => {
          habits = habits.filter((savedHabit) => {
            return savedHabit.id !== habit.id;
          });

          saveHabits();
          showHabits();
        };

        rightSide.append(checkButton, xButton, deleteButton);

        habitCard.append(leftSide, rightSide);

        habitList.appendChild(habitCard);
      });
    }

    addHabitBtn.onclick = () => {
      habitType.value = "good";
      habitFrequency.value = "daily";

      updateReminderFields();
      modal.open();
    };

    cancelHabitBtn.onclick = () => {
      modal.close();
    };

    if (noReminderInput) {
      noReminderInput.onchange = () => {
        updateReminderFields();
      };
    }
    habitPopup.onclick = (event) => {
      if (event.target === habitPopup) {
        modal.close();
      }
    };

    habitForm.onsubmit = (event) => {
      event.preventDefault();

      const name = habitInput.value.trim();
      const emoji = habitEmoji.value.trim();
      const unit = habitUnit.value.trim();
      const notes = habitNotes.value.trim();

      const goal = habitGoal.value === "" ? null : Number(habitGoal.value);

      const reminder = noReminderInput && habitReminder && !noReminderInput.checked ? habitReminder.value || null : null;

      if (name === "") {
        alert("Add a habit name first!");
        return;
      }

      if (goal !== null && (!Number.isFinite(goal) || goal < 1)) {
        alert("The habit goal must be at least 1.");
        return;
      }

      if (goal !== null && unit === "") {
        alert("Add a unit for your goal.");
        return;
      }

      const newHabit = {
        id: Date.now(),
        name: name,
        emoji: emoji,
        type: habitType.value,
        frequency: habitFrequency.value,
        goal: goal,
        unit: unit,
        reminder: reminder,
        notes: notes,
        history: {},
      };

      habits.push(newHabit);

      saveHabits();
      showHabits();
      modal.close();
    };

    updateReminderFields();
    showHabits();

    window.getHabitResultText = getHabitResultText;
    window.getToday = getToday;
    window.saveHabitResult = saveHabitResult;
    window.saveHabits = saveHabits;
    window.showHabits = showHabits;

    function cleanupHabits() {
      modal.destroy();
      clearWindowRouteFunction("getHabitResultText", getHabitResultText);
      clearWindowRouteFunction("getToday", getToday);
      clearWindowRouteFunction("saveHabitResult", saveHabitResult);
      clearWindowRouteFunction("saveHabits", saveHabits);
      clearWindowRouteFunction("showHabits", showHabits);
    }

    return cleanupHabits;
  },

  breathing: function init_breathing() {
    const exercises = {
      box: {
        title: "Box Breathing",
        instructions: "Breathe in for 4, hold for 4, exhale for 4, hold for 4.",
        phases: [
          { text: "Breathe In", time: 4, scale: 1.4 },
          { text: "Hold", time: 4, scale: 1.4 },
          { text: "Exhale", time: 4, scale: 1 },
          { text: "Hold", time: 4, scale: 1 },
        ],
      },

      calm: {
        title: "Calm Breathing",
        instructions: "Breathe in for 5 seconds, then exhale for 5 seconds.",
        phases: [
          { text: "Breathe In", time: 5, scale: 1.4 },
          { text: "Exhale", time: 5, scale: 1 },
        ],
      },

      relax: {
        title: "4-7-8 Breathing",
        instructions: "Breathe in for 4, hold for 7, exhale for 8.",
        phases: [
          { text: "Breathe In", time: 4, scale: 1.4 },
          { text: "Hold", time: 7, scale: 1.4 },
          { text: "Exhale", time: 8, scale: 1 },
        ],
      },
    };

    let currentExercise = exercises.box;
    let phaseIndex = 0;
    let countdown = 0;
    let timer = null;

    const exerciseTitle = document.getElementById("exerciseTitle");
    const instructions = document.getElementById("instructions");
    const circle = document.getElementById("circle");
    const phaseText = document.getElementById("phaseText");
    const countdownText = document.getElementById("countdown");

    function chooseExercise(type) {
      stopBreathing();

      currentExercise = exercises[type];

      exerciseTitle.textContent = currentExercise.title;
      instructions.textContent = currentExercise.instructions;
      phaseText.textContent = "Ready";
      countdownText.textContent = "0";
      circle.style.transform = "scale(1)";
    }

    function startBreathing() {
      stopBreathing();

      phaseIndex = 0;
      runPhase();
    }

    function runPhase() {
      const phase = currentExercise.phases[phaseIndex];

      countdown = phase.time;

      phaseText.textContent = phase.text;
      countdownText.textContent = countdown;
      circle.style.transform = `scale(${phase.scale})`;

      timer = setInterval(() => {
        countdown--;
        countdownText.textContent = countdown;

        if (countdown <= 0) {
          clearInterval(timer);

          phaseIndex++;

          if (phaseIndex >= currentExercise.phases.length) {
            phaseIndex = 0;
          }

          runPhase();
        }
      }, 1000);
    }

    function stopBreathing() {
      clearInterval(timer);
      timer = null;

      phaseIndex = 0;
      phaseText.textContent = "Ready";
      countdownText.textContent = "0";
      circle.style.transform = "scale(1)";
    }
    window.chooseExercise = chooseExercise;
    window.runPhase = runPhase;
    window.startBreathing = startBreathing;
    window.stopBreathing = stopBreathing;
    return function () {
      try {
        stopBreathing();
      } catch (e) {}
      clearWindowRouteFunction("chooseExercise", chooseExercise);
      clearWindowRouteFunction("runPhase", runPhase);
      clearWindowRouteFunction("startBreathing", startBreathing);
      clearWindowRouteFunction("stopBreathing", stopBreathing);
    };
  },
  calendar: function init_calendar() {
    let today = new Date();
    let currentMonth = today.getMonth();
    let currentYear = today.getFullYear();

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const calendarTitle = document.querySelector(".calendar-header h2");
    const calendarBody = document.getElementById("calendarBody");

    const prevMonth = document.getElementById("prevMonth");
    const nextMonth = document.getElementById("nextMonth");

    const addEventBtn = document.querySelector(".addEvent");
    const popup = document.getElementById("eventPopup");
    const closePopupButton = document.getElementById("closePopup");
    const saveEvent = document.getElementById("saveEvent");

    const eventTitleInput = document.getElementById("eventTitle");
    const eventDateInput = document.getElementById("eventDate");

    let events = getUserArray("events");

    const eventPicker =
      typeof window.flatpickr === "function"
        ? window.flatpickr(eventDateInput, {
            enableTime: true,
            dateFormat: "Y-m-d H:i",
            altInput: true,
            altFormat: "F j, Y h:i K",
            minDate: new Date(),
          })
        : {
            altInput: null,
            clear() {
              eventDateInput.value = "";
            },
            destroy() {},
          };

    if (typeof window.flatpickr !== "function") {
      eventDateInput.type = "datetime-local";
      eventDateInput.min = formatLocalDateTimeInput();
    }
    eventPicker.altInput?.setAttribute("aria-label", "Event date and time");

    const modal = createModalController(popup, eventTitleInput, {
      display: "flex",
      onClose: () => {
        eventTitleInput.value = "";
        eventPicker.clear();
      },
    });

    function renderCalendar() {
      calendarBody.innerHTML = "";
      calendarTitle.textContent = `${monthNames[currentMonth]} ${currentYear}`;

      const firstDay = new Date(currentYear, currentMonth, 1).getDay();
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

      let date = 1;

      for (let row = 0; row < 6; row++) {
        const tr = document.createElement("tr");

        for (let col = 0; col < 7; col++) {
          const td = document.createElement("td");

          if (row === 0 && col < firstDay) {
            td.classList.add("empty-day");
          } else if (date > daysInMonth) {
            td.classList.add("empty-day");
          } else {
            td.textContent = date;

            if (date === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
              td.classList.add("today");
            }

            showEventsForDay(td, date);
            date++;
          }

          tr.appendChild(td);
        }

        calendarBody.appendChild(tr);
      }
    }

    function showEventsForDay(dayCell, dayNumber) {
      events.forEach((event) => {
        const eventDate = eventDateTime(event);

        if (
          eventDate &&
          eventDate.getDate() === dayNumber &&
          eventDate.getMonth() === currentMonth &&
          eventDate.getFullYear() === currentYear
        ) {
          const eventText = document.createElement("button");
          eventText.classList.add("calendar-event");
          eventText.type = "button";
          eventText.textContent = event.title;
          eventText.setAttribute("aria-label", `Delete event: ${event.title}`);

          eventText.onclick = () => {
            if (confirm(`Delete "${event.title}"?`)) {
              events = events.filter((e) => e.id !== event.id);
              setUserItem("events", JSON.stringify(events));
              renderCalendar();
            }
          };

          dayCell.appendChild(eventText);
        }
      });
    }

    prevMonth.onclick = () => {
      currentMonth--;

      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }

      renderCalendar();
    };

    nextMonth.onclick = () => {
      currentMonth++;

      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }

      renderCalendar();
    };

    addEventBtn.onclick = () => {
      modal.open();
    };

    closePopupButton.onclick = () => {
      modal.close();
    };

    popup.onclick = (event) => {
      if (event.target === popup) modal.close();
    };

    saveEvent.onclick = () => {
      const title = eventTitleInput.value.trim();
      const dateValue = eventDateInput.value;

      if (title === "" || dateValue === "") {
        alert("Add an event name and date first!");
        return;
      }

      const parsedDate = eventDateTime({ date: dateValue });
      if (!parsedDate) {
        alert("Choose a valid event date and time.");
        return;
      }

      if (parsedDate.getTime() < Date.now()) {
        alert("Events must be scheduled for a future time.");
        return;
      }

      events.push({
        id: Date.now(),
        title: title,
        date: dateValue,
      });

      setUserItem("events", JSON.stringify(events));

      renderCalendar();
      modal.close();
    };

    renderCalendar();
    window.renderCalendar = renderCalendar;
    window.showEventsForDay = showEventsForDay;
    return () => {
      modal.destroy();
      eventPicker.destroy();
      clearWindowRouteFunction("renderCalendar", renderCalendar);
      clearWindowRouteFunction("showEventsForDay", showEventsForDay);
    };
  },
  journal: function init_journal() {
    const today = new Date();

    const todayDay = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();
    let journalDateKey = formatLocalDate(today);

    let currentMonth = todayMonth;
    let currentYear = todayYear;
    let selectedDay = todayDay;

    // Holds the journal entries downloaded from the backend.
    let journalEntries = [];

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const monthTitle = document.getElementById("monthTitle");
    const dateGrid = document.getElementById("dateGrid");
    const entryTitle = document.getElementById("entryTitle");

    const prevMonth = document.getElementById("prevMonth");
    const nextMonth = document.getElementById("nextMonth");

    const mood = document.getElementById("mood");
    const dayText = document.getElementById("dayText");
    const gratefulText = document.getElementById("gratefulText");
    const learnText = document.getElementById("learnText");
    const goalText = document.getElementById("goalText");

    const saveEntry = document.getElementById("saveEntry");
    const statusMessage = document.getElementById("statusMessage");

    function getCurrentUserId() {
      return getActiveIdentityItem("accountId");
    }

    function getEntryKey(day) {
      return `journal-${currentYear}-${currentMonth + 1}-${day}`;
    }

    function getCurrentDateParts() {
      const currentDate = new Date();

      return {
        day: currentDate.getDate(),
        month: currentDate.getMonth(),
        year: currentDate.getFullYear(),
      };
    }

    function isTodayDate(day) {
      const currentDate = getCurrentDateParts();

      return day === currentDate.day && currentMonth === currentDate.month && currentYear === currentDate.year;
    }

    function isFutureDate(day) {
      const selectedDate = new Date(currentYear, currentMonth, day);
      const currentDate = getCurrentDateParts();

      const realToday = new Date(currentDate.year, currentDate.month, currentDate.day);

      return selectedDate > realToday;
    }

    async function loadJournalEntries() {
      const currentUserId = getCurrentUserId();

      if (!currentUserId) {
        journalEntries = [];
        return journalEntries;
      }

      const query = new URLSearchParams({ user_id: currentUserId });
      const response = await fetch(`${API_URL}/journal?${query}`);

      if (!response.ok) {
        throw new Error(`Journal request failed: ${response.status}`);
      }

      const data = await response.json();

      journalEntries = Array.isArray(data) ? data : [];

      // Normalize backend field names so frontend code can rely on `userId`
      journalEntries = journalEntries.map((e) => {
        const uid = e.userId || e.user_id || "";
        return { ...e, userId: uid, user_id: uid };
      });

      return journalEntries;
    }

    function findEntry(day) {
      const currentUserId = getCurrentUserId();
      const dateKey = getEntryKey(day);

      return journalEntries.find((entry) => (entry.userId || entry.user_id) === currentUserId && entry.date === dateKey) || null;
    }

    async function loadEntry(day) {
      selectedDay = day;

      let entry = null;

      try {
        await loadJournalEntries();
        entry = findEntry(day) || readUserJson(getEntryKey(day), null);

        if (statusMessage.textContent === "Backend unavailable. Loaded the local backup.") {
          statusMessage.textContent = "";
        }
      } catch (error) {
        console.error("Could not load the journal backend:", error);

        // Temporary backup while the backend is still being tested.
        entry = readUserJson(getEntryKey(day), null);

        statusMessage.textContent = "Backend unavailable. Loaded the local backup.";
      }

      entryTitle.textContent = `Entry for ${monthNames[currentMonth]} ${day}, ${currentYear}`;

      mood.value = entry?.mood || "Happy";
      dayText.value = entry?.day || "";
      gratefulText.value = entry?.grateful || "";
      learnText.value = entry?.learn || "";
      goalText.value = entry?.goal || "";

      const canEdit = isTodayDate(day);

      mood.disabled = !canEdit;
      dayText.disabled = !canEdit;
      gratefulText.disabled = !canEdit;
      learnText.disabled = !canEdit;
      goalText.disabled = !canEdit;

      saveEntry.style.display = canEdit ? "block" : "none";

      if (!canEdit) {
        statusMessage.textContent = isFutureDate(day) ? "Future entries cannot be edited." : "Past entries are read-only.";
      } else if (statusMessage.textContent !== "Backend unavailable. Loaded the local backup.") {
        statusMessage.textContent = "";
      }
    }

    function buildDateGrid() {
      dateGrid.innerHTML = "";
      monthTitle.textContent = `${monthNames[currentMonth]} ${currentYear}`;

      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

      const currentUserId = getCurrentUserId();

      for (let day = 1; day <= daysInMonth; day++) {
        const button = document.createElement("button");

        button.textContent = day;
        button.classList.add("date-button");

        const dateKey = getEntryKey(day);

        const hasBackendEntry = journalEntries.some((entry) => (entry.userId || entry.user_id) === currentUserId && entry.date === dateKey);
        const hasLocalEntry = Boolean(readUserJson(dateKey, null));

        if (hasBackendEntry || hasLocalEntry) {
          button.classList.add("has-entry");
        }

        if (isTodayDate(day)) {
          button.classList.add("today");
        }

        if (day === selectedDay) {
          button.classList.add("selected-day");
        }

        if (isFutureDate(day)) {
          button.classList.add("future");
          button.disabled = true;
        } else {
          button.onclick = async () => {
            await loadEntry(day);
            buildDateGrid();
          };
        }

        dateGrid.appendChild(button);
      }
    }

    prevMonth.onclick = async () => {
      currentMonth--;

      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }

      selectedDay = 1;

      await loadEntry(selectedDay);
      buildDateGrid();
    };

    nextMonth.onclick = async () => {
      currentMonth++;

      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }

      selectedDay = 1;

      await loadEntry(selectedDay);
      buildDateGrid();
    };

    saveEntry.onclick = async () => {
      if (!isTodayDate(selectedDay)) {
        statusMessage.textContent = isFutureDate(selectedDay) ? "Future entries cannot be edited." : "Past entries are read-only.";

        return;
      }

      const uid = getCurrentUserId() || localStorage.getItem("accountId") || localStorage.getItem(STORAGE_KEYS.ACCOUNT_ID);
      const entry = {
        user_id: uid,
        date: getEntryKey(selectedDay),
        mood: mood.value,
        day: dayText.value,
        grateful: gratefulText.value,
        learn: learnText.value,
        goal: goalText.value,
      };

      if (!entry.user_id) {
        statusMessage.textContent = "Could not identify the logged-in account.";
        return;
      }

      saveEntry.disabled = true;
      statusMessage.textContent = "Saving...";

      try {
        const response = await fetch(API_URL + "/journal", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(entry),
        });

        if (!response.ok) {
          throw new Error(`Journal save failed: ${response.status}`);
        }

        const existingIndex = journalEntries.findIndex(
          (savedEntry) => (savedEntry.userId || savedEntry.user_id) === (entry.userId || entry.user_id) && savedEntry.date === entry.date,
        );

        if (existingIndex === -1) {
          journalEntries.push(entry);
        } else {
          journalEntries[existingIndex] = entry;
        }

        // Keep this temporarily as a backup.
        setUserItem(getEntryKey(selectedDay), JSON.stringify(entry));

        statusMessage.textContent = "Entry saved!";
        buildDateGrid();
      } catch (error) {
        console.error("Could not save the journal entry:", error);

        // Save locally if the backend fails.
        setUserItem(getEntryKey(selectedDay), JSON.stringify(entry));

        statusMessage.textContent = "Saved locally, but the backend could not be reached.";
      } finally {
        saveEntry.disabled = false;
      }
    };

    async function refreshJournalDateRules() {
      const currentDateKey = formatLocalDate();

      if (currentDateKey === journalDateKey) return;

      journalDateKey = currentDateKey;

      buildDateGrid();
      await loadEntry(selectedDay);
    }

    function handleJournalVisibilityChange() {
      if (!document.hidden) {
        refreshJournalDateRules();
      }
    }

    window.addEventListener("focus", refreshJournalDateRules);

    document.addEventListener("visibilitychange", handleJournalVisibilityChange);

    async function initializeJournal() {
      await loadEntry(selectedDay);
      buildDateGrid();
    }

    initializeJournal();

    window.buildDateGrid = buildDateGrid;
    window.getEntryKey = getEntryKey;
    window.isFutureDate = isFutureDate;
    window.isTodayDate = isTodayDate;
    window.loadEntry = loadEntry;

    return () => {
      window.removeEventListener("focus", refreshJournalDateRules);

      document.removeEventListener("visibilitychange", handleJournalVisibilityChange);

      clearWindowRouteFunction("buildDateGrid", buildDateGrid);
      clearWindowRouteFunction("getEntryKey", getEntryKey);
      clearWindowRouteFunction("isFutureDate", isFutureDate);
      clearWindowRouteFunction("isTodayDate", isTodayDate);
      clearWindowRouteFunction("loadEntry", loadEntry);
    };
  },
  menu: function init_menu() {
    const menuNavigation = document.getElementById("nav");
    const buttons = document.querySelectorAll("#nav button");

    const compactMenuQuery = window.matchMedia("(max-width: 768px), (max-height: 820px)");
    const reduceMenuMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function clearOrbitPositions() {
      buttons.forEach((button) => {
        button.style.left = "";
        button.style.top = "";
        button.style.transform = "";
      });
    }

    let radius = 0;

    function updateOrbitRadius() {
      const firstButton = buttons[0];
      radius = firstButton ? firstButton.getBoundingClientRect().width * 1.65 : 0;
    }

    let angle = 0;
    let hoverPaused = false;
    let focusPaused = false;
    let animationFrame = null;

    function handleMenuMouseEnter() {
      hoverPaused = true;
    }

    function handleMenuMouseLeave() {
      hoverPaused = false;
    }

    function handleMenuFocusIn() {
      focusPaused = true;
    }

    function handleMenuFocusOut(event) {
      if (!menuNavigation.contains(event.relatedTarget)) {
        focusPaused = false;
      }
    }

    buttons.forEach((button) => {
      button.addEventListener("mouseenter", handleMenuMouseEnter);
      button.addEventListener("mouseleave", handleMenuMouseLeave);
    });
    menuNavigation.addEventListener("focusin", handleMenuFocusIn);
    menuNavigation.addEventListener("focusout", handleMenuFocusOut);

    function positionOrbitButtons() {
      buttons.forEach((button, i) => {
        const currentAngle = angle + i * ((Math.PI * 2) / buttons.length);
        const x = Math.cos(currentAngle) * radius;
        const y = Math.sin(currentAngle) * radius;

        button.style.left = `${x}px`;
        button.style.top = `${y}px`;
        button.style.transform = "translate(-50%, -50%)";
      });
    }

    function animate() {
      if (compactMenuQuery.matches || reduceMenuMotion) {
        if (reduceMenuMotion && !compactMenuQuery.matches) {
          positionOrbitButtons();
        } else {
          clearOrbitPositions();
        }
        animationFrame = null;
        return;
      }

      if (!hoverPaused && !focusPaused) {
        angle += 0.0015; // Rotation speed
      }

      positionOrbitButtons();

      animationFrame = requestAnimationFrame(animate);
    }

    function syncMenuLayout() {
      if (compactMenuQuery.matches) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
        clearOrbitPositions();
      } else {
        updateOrbitRadius();
        if (reduceMenuMotion) {
          if (animationFrame !== null) cancelAnimationFrame(animationFrame);
          animationFrame = null;
          positionOrbitButtons();
        } else if (animationFrame === null) {
          animate();
        }
      }
    }

    window.addEventListener("resize", syncMenuLayout);
    syncMenuLayout();
    return () => {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", syncMenuLayout);
      buttons.forEach((button) => {
        button.removeEventListener("mouseenter", handleMenuMouseEnter);
        button.removeEventListener("mouseleave", handleMenuMouseLeave);
      });
      menuNavigation.removeEventListener("focusin", handleMenuFocusIn);
      menuNavigation.removeEventListener("focusout", handleMenuFocusOut);
    };
  },
  settings: function init_settings() {
    const modeToggle = document.getElementById("mode");
    const ascendraAIToggle = document.getElementById("ascendra-ai-enabled");

    function handleModeChange() {
      const settings = getSavedSettings();
      settings.lightMode = !modeToggle.checked;
      setUserItem("ascendraSettings", JSON.stringify(settings));
      applySavedSettings();
    }

    if (modeToggle) {
      modeToggle.checked = getSavedSettings().lightMode === false;
      modeToggle.addEventListener("change", handleModeChange);
    }

    function handleAscendraAIChange() {
      // Use the account-scoped settings store so each signed-in user keeps their own preference.
      const settings = getSavedSettings();
      settings.ascendraAIEnabled = ascendraAIToggle.checked;
      setUserItem("ascendraSettings", JSON.stringify(settings));
      applySavedSettings();
    }

    if (ascendraAIToggle) {
      ascendraAIToggle.checked = getSavedSettings().ascendraAIEnabled !== false;
      ascendraAIToggle.addEventListener("change", handleAscendraAIChange);
    }

    function resetSettings() {
      const confirmReset = confirm(configuredAppText("Reset Ascendra settings back to default?"));

      if (confirmReset) {
        removeUserItem("ascendraSettings");
        applySavedSettings();
        alert("Settings reset.");
      }
    }

    function deleteAllData() {
      const warning = prompt(configuredAppText("Type DELETE to delete all local Ascendra data."));

      if (warning === "DELETE") {
        deleteCurrentAccountData();
        alert(configuredAppText("This account and its Ascendra data have been deleted."));
        navigate("welcome");
      } else if (warning !== null) {
        alert("Delete cancelled.");
      }
    }

    window.resetSettings = resetSettings;
    window.deleteAllData = deleteAllData;

    return () => {
      if (modeToggle) modeToggle.removeEventListener("change", handleModeChange);
      if (ascendraAIToggle) ascendraAIToggle.removeEventListener("change", handleAscendraAIChange);
      clearWindowRouteFunction("resetSettings", resetSettings);
      clearWindowRouteFunction("deleteAllData", deleteAllData);
    };
  },

  stats: function init_stats() {
    const totalTasksElement = document.getElementById("total-tasks");

    const completedTasksElement = document.getElementById("completed-tasks");

    const remainingTasksElement = document.getElementById("remaining-tasks");

    const taskCompletionRateElement = document.getElementById("task-completion-rate");

    const taskProgressLabel = document.getElementById("task-progress-label");

    const taskProgressFill = document.getElementById("task-progress-fill");

    const taskProgressMessage = document.getElementById("task-progress-message");

    const totalHabitsElement = document.getElementById("total-habits");

    const successfulHabitDaysElement = document.getElementById("successful-habit-days");

    const missedHabitDaysElement = document.getElementById("missed-habit-days");

    const habitSuccessRateElement = document.getElementById("habit-success-rate");

    const habitProgressLabel = document.getElementById("habit-progress-label");

    const habitProgressFill = document.getElementById("habit-progress-fill");

    const habitProgressMessage = document.getElementById("habit-progress-message");

    const dueTodayElement = document.getElementById("due-today");

    const overdueTasksElement = document.getElementById("overdue-tasks");

    const futureTasksElement = document.getElementById("future-tasks");

    const habitsSuccessfulTodayElement = document.getElementById("habits-successful-today");

    const habitsMissedTodayElement = document.getElementById("habits-missed-today");

    const habitsUncheckedTodayElement = document.getElementById("habits-unchecked-today");

    const habitHistoryTable = document.querySelector(".habit-history-table table");

    const habitHistoryDayHeaders = Array.from(document.querySelectorAll("[data-habit-history-day]"));

    const habitHistoryBody = document.getElementById("habit-history-body");

    const habitHistoryEmpty = document.getElementById("habit-history-empty");

    const habitHistorySummary = document.getElementById("habit-history-summary");

    const printStatsButton = document.getElementById("print-stats");

    const habitTrackerQr = document.getElementById("habit-tracker-qr");

    const habitTrackerQrStatus = document.getElementById("habit-tracker-qr-status");

    const achievementIcon = document.getElementById("achievement-icon");

    const achievementTitle = document.getElementById("achievement-title");

    const achievementDescription = document.getElementById("achievement-description");

    const recentTasksContainer = document.getElementById("recent-tasks");

    const welcomeMessage = document.getElementById("welcome-message");

    function getStoredArray(key) {
      return getUserArray(key);
    }

    function getTodayString() {
      const today = new Date();

      const year = today.getFullYear();

      const month = String(today.getMonth() + 1).padStart(2, "0");

      const day = String(today.getDate()).padStart(2, "0");

      return year + "-" + month + "-" + day;
    }

    function updateWelcomeMessage() {
      const name = getActiveIdentityItem("name");

      if (name) {
        welcomeMessage.textContent = "Keep building momentum, " + name + ".";
      }
    }

    function updateTaskStatistics(todos) {
      const totalTasks = todos.length;
      let completedTasks = 0;

      todos.forEach(function (todo) {
        if (isTodoCompleted(todo)) {
          completedTasks++;
        }
      });

      const remainingTasks = totalTasks - completedTasks;

      let completionRate = 0;

      if (totalTasks > 0) {
        completionRate = Math.round((completedTasks / totalTasks) * 100);
      }

      totalTasksElement.textContent = totalTasks;

      completedTasksElement.textContent = completedTasks;

      remainingTasksElement.textContent = remainingTasks;

      taskCompletionRateElement.textContent = completionRate + "%";

      taskProgressLabel.textContent = completionRate + "%";

      taskProgressFill.style.width = completionRate + "%";
      const taskProgressTrack = document.getElementById("task-progress-track");
      if (taskProgressTrack) {
        taskProgressTrack.setAttribute("role", "progressbar");
        taskProgressTrack.setAttribute("aria-valuemin", "0");
        taskProgressTrack.setAttribute("aria-valuemax", "100");
        taskProgressTrack.setAttribute("aria-valuenow", String(completionRate));
        taskProgressTrack.setAttribute("aria-valuetext", `${completedTasks} of ${totalTasks} tasks complete (${completionRate}%)`);
      }

      updateTaskProgressMessage(totalTasks, completedTasks, completionRate);

      return completedTasks;
    }

    function updateTaskProgressMessage(totalTasks, completedTasks, completionRate) {
      if (totalTasks === 0) {
        taskProgressMessage.textContent = "Add your first task to begin tracking progress.";
      } else if (completionRate === 100) {
        taskProgressMessage.textContent = "Every task is complete. Absolute productivity monster.";
      } else if (completionRate >= 75) {
        taskProgressMessage.textContent = "You are nearly there. Finish strong.";
      } else if (completionRate >= 50) {
        taskProgressMessage.textContent = "More than halfway complete. Nice work.";
      } else if (completedTasks > 0) {
        taskProgressMessage.textContent = "Progress is progress. Keep stacking wins.";
      } else {
        taskProgressMessage.textContent = "Your tasks are ready when you are.";
      }
    }

    function updateTaskDateStatistics(todos) {
      const today = getTodayString();

      let dueToday = 0;
      let overdueTasks = 0;
      let futureTasks = 0;

      todos.forEach(function (todo) {
        if (isTodoCompleted(todo)) {
          return;
        }

        if (todo.date === today) {
          dueToday++;
        } else if (todo.date && todo.date < today) {
          overdueTasks++;
        } else if (todo.date && todo.date > today) {
          futureTasks++;
        }
      });

      dueTodayElement.textContent = dueToday;

      overdueTasksElement.textContent = overdueTasks;

      futureTasksElement.textContent = futureTasks;
    }

    function updateHabitStatistics(habits) {
      let successfulHabitDays = 0;
      let missedHabitDays = 0;

      habits.forEach(function (habit) {
        getScheduledHabitHistoryEntries(habit).forEach(function ([, result]) {
          if (result === true) {
            successfulHabitDays++;
          } else if (result === false) {
            missedHabitDays++;
          }
        });
      });

      const totalCheckIns = successfulHabitDays + missedHabitDays;

      let habitSuccessRate = 0;

      if (totalCheckIns > 0) {
        habitSuccessRate = Math.round((successfulHabitDays / totalCheckIns) * 100);
      }

      totalHabitsElement.textContent = habits.length;

      successfulHabitDaysElement.textContent = successfulHabitDays;

      missedHabitDaysElement.textContent = missedHabitDays;

      habitSuccessRateElement.textContent = habitSuccessRate + "%";

      habitProgressLabel.textContent = habitSuccessRate + "%";

      habitProgressFill.style.width = habitSuccessRate + "%";
      const habitProgressTrack = document.getElementById("habit-progress-track");
      if (habitProgressTrack) {
        habitProgressTrack.setAttribute("role", "progressbar");
        habitProgressTrack.setAttribute("aria-valuemin", "0");
        habitProgressTrack.setAttribute("aria-valuemax", "100");
        habitProgressTrack.setAttribute("aria-valuenow", String(habitSuccessRate));
        habitProgressTrack.setAttribute(
          "aria-valuetext",
          `${successfulHabitDays} of ${totalCheckIns} scheduled check-ins successful (${habitSuccessRate}%)`,
        );
      }

      updateHabitProgressMessage(habits.length, totalCheckIns, habitSuccessRate);

      return successfulHabitDays;
    }

    function updateHabitProgressMessage(totalHabits, totalCheckIns, habitSuccessRate) {
      if (totalHabits === 0) {
        habitProgressMessage.textContent = "Add your first habit to begin tracking progress.";
      } else if (totalCheckIns === 0) {
        habitProgressMessage.textContent = "Check off a habit to begin tracking it.";
      } else if (habitSuccessRate === 100) {
        habitProgressMessage.textContent = "Perfect habit record so far. Huge win.";
      } else if (habitSuccessRate >= 75) {
        habitProgressMessage.textContent = "Your habits are looking strong.";
      } else if (habitSuccessRate >= 50) {
        habitProgressMessage.textContent = "You are building consistency. Keep going.";
      } else {
        habitProgressMessage.textContent = "Every new day is another chance.";
      }
    }

    function updateTodayHabitStatistics(habits) {
      const today = getTodayString();

      let successfulToday = 0;
      let missedToday = 0;
      let uncheckedToday = 0;

      habits.forEach(function (habit) {
        if (!isHabitScheduledForDate(habit)) {
          return;
        }

        const history = getHabitHistory(habit);

        if (history[today] === undefined) {
          uncheckedToday++;
        } else if (history[today] === true) {
          successfulToday++;
        } else {
          missedToday++;
        }
      });

      habitsSuccessfulTodayElement.textContent = successfulToday;

      habitsMissedTodayElement.textContent = missedToday;

      habitsUncheckedTodayElement.textContent = uncheckedToday;
    }

    function getRecentHabitHistoryDates() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return Array.from({ length: 7 }, function (_, index) {
        const date = new Date(today);
        date.setDate(today.getDate() - (6 - index));
        return date;
      });
    }

    function renderHabitHistoryHeaders(dates) {
      habitHistoryDayHeaders.forEach(function (header, index) {
        const date = dates[index];
        if (!date) return;

        const weekday = document.createElement("span");
        weekday.textContent = date.toLocaleDateString(undefined, { weekday: "short" });

        const day = document.createElement("small");
        day.textContent = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });

        header.replaceChildren(weekday, day);
        header.setAttribute(
          "aria-label",
          date.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
        );
      });
    }

    function displayHabitHistory(habits) {
      if (!habitHistoryTable || !habitHistoryBody || !habitHistoryEmpty) {
        return;
      }

      const dates = getRecentHabitHistoryDates();
      habitHistoryBody.innerHTML = "";
      renderHabitHistoryHeaders(dates);

      habitHistoryTable.hidden = habits.length === 0;
      habitHistoryEmpty.hidden = habits.length !== 0;
      if (habitHistorySummary) habitHistorySummary.textContent = "Your latest seven days of habit check-ins.";

      habits.forEach(function (habit) {
        const row = document.createElement("tr");
        const habitName = document.createElement("th");
        const emoji = typeof habit.emoji === "string" && habit.emoji.trim() ? `${habit.emoji.trim()} ` : "";

        habitName.scope = "row";
        habitName.textContent = `${emoji}${habit.name || "Untitled habit"}`;
        row.appendChild(habitName);

        const history = getHabitHistory(habit);

        dates.forEach(function (date) {
          const cell = document.createElement("td");
          const status = document.createElement("span");
          const dateKey = formatLocalDate(date);
          const result = history[dateKey];
          const isScheduled = isHabitScheduledForDate(habit, date);
          let statusText = "Not checked";
          let statusIcon = "•";
          let statusClass = "unchecked";

          if (!isScheduled) {
            statusText = "Not scheduled";
            statusIcon = "—";
            statusClass = "not-scheduled";
          } else if (result === true) {
            statusText = habit.type === "bad" ? "Successfully avoided" : "Completed";
            statusIcon = "✅";
            statusClass = "successful";
          } else if (result === false) {
            statusText = habit.type === "bad" ? "Habit occurred" : "Missed";
            statusIcon = "❌";
            statusClass = "missed";
          }

          status.className = `habit-history-status ${statusClass}`;
          status.textContent = statusIcon;
          status.setAttribute("role", "img");
          status.setAttribute("aria-label", statusText);
          status.title = statusText;
          cell.appendChild(status);
          row.appendChild(cell);
        });

        habitHistoryBody.appendChild(row);
      });
    }

    function createPrintableHabitPayload(habits, weekStart) {
      return {
        v: 1,
        w: weekStart,
        h: habits.map(function (habit) {
          return [
            String(habit.name || "Untitled habit").trim().slice(0, 120),
            String(habit.emoji || "").trim().slice(0, 8),
            habit.type === "bad" ? "bad" : "good",
            ["weekdays", "weekends"].includes(habit.frequency) ? habit.frequency : "daily",
            [null, null, null, null, null, null, null],
          ];
        }),
      };
    }

    function createHabitImportUrl(payload) {
      const url = new URL(window.location.href);
      url.search = "";
      url.searchParams.set("habitImport", JSON.stringify(payload));
      url.hash = "#/stats";
      return url.href;
    }

    function preparePrintableHabitTracker() {
      if (!habitHistoryTable || !habitHistoryBody || !habitHistoryEmpty) return;

      const habits = getStoredArray("habits");
      const weekStart = formatLocalDate(getStartOfWeek(new Date(), 1));
      const dates = getHabitImportWeekDates(weekStart);
      habitHistoryBody.innerHTML = "";
      renderHabitHistoryHeaders(dates);
      habitHistoryTable.hidden = habits.length === 0;
      habitHistoryEmpty.hidden = habits.length !== 0;
      habitHistoryEmpty.textContent = "Add habits before printing a weekly tracker.";

      habits.forEach(function (habit) {
        const row = document.createElement("tr");
        const habitName = document.createElement("th");
        const emoji = typeof habit.emoji === "string" && habit.emoji.trim() ? `${habit.emoji.trim()} ` : "";
        habitName.scope = "row";
        habitName.textContent = `${emoji}${habit.name || "Untitled habit"}`;
        row.appendChild(habitName);

        dates.forEach(function (date) {
          const cell = document.createElement("td");
          const blank = document.createElement("span");
          const scheduled = isHabitScheduledForDate(habit, date);
          blank.className = `habit-history-status print-blank${scheduled ? "" : " not-scheduled"}`;
          blank.textContent = scheduled ? "" : "—";
          blank.setAttribute("aria-hidden", "true");
          cell.appendChild(blank);
          row.appendChild(cell);
        });

        habitHistoryBody.appendChild(row);
      });

      if (habitHistorySummary) {
        habitHistorySummary.textContent = `Blank tracker for ${formatHabitImportWeek(weekStart)}. Your saved history is unchanged.`;
      }

      if (!habitTrackerQr || !habitTrackerQrStatus) return;
      habitTrackerQr.innerHTML = "";

      if (habits.length === 0) {
        habitTrackerQrStatus.textContent = "Add a habit before generating an import QR code.";
        return;
      }
      if (habits.length > HABIT_IMPORT_MAX_HABITS) {
        habitTrackerQrStatus.textContent = `QR import supports up to ${HABIT_IMPORT_MAX_HABITS} habits at a time.`;
        return;
      }
      if (typeof window.QRCode !== "function") {
        habitTrackerQrStatus.textContent = "The QR generator did not load. The blank tracker can still be printed.";
        return;
      }

      try {
        const payload = createPrintableHabitPayload(habits, weekStart);
        new window.QRCode(habitTrackerQr, {
          text: createHabitImportUrl(payload),
          width: 144,
          height: 144,
          correctLevel: window.QRCode.CorrectLevel.L,
        });
        habitTrackerQrStatus.textContent = "Scan this code to review and import these blank weekly habits.";
      } catch (error) {
        console.warn("Ascendra could not generate the habit tracker QR code.", error);
        habitTrackerQrStatus.textContent = "The QR data is too large, but the blank tracker can still be printed.";
      }
    }

    function restoreHabitHistoryAfterPrint() {
      displayHabitHistory(getStoredArray("habits"));
      if (habitTrackerQr) habitTrackerQr.innerHTML = "";
    }

    function printHabitTracker() {
      preparePrintableHabitTracker();
      try {
        window.print();
      } finally {
        restoreHabitHistoryAfterPrint();
      }
    }

    function updateAchievements() {
      const progression = syncProgressionFromActivity();
      renderProgressionSummary(progression.state);
      renderLatestAchievement(progression.state);
      return progression.state;
    }

    function displayLatestAchievement(state = loadProgressionState()) {
      renderLatestAchievement(state);
    }

    function updateBadges(state = loadProgressionState()) {
      reconcileBadgeState(state);
      saveProgressionState(state);
      renderBadgeCollection(state);
      return state;
    }

    function formatDate(dateString) {
      if (!dateString) {
        return "No due date";
      }

      const date = new Date(dateString + "T00:00:00");

      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }

    function displayRecentTasks(todos) {
      recentTasksContainer.innerHTML = "";

      if (todos.length === 0) {
        const emptyMessage = document.createElement("p");

        emptyMessage.classList.add("empty-message");

        emptyMessage.textContent = "No tasks yet. Your productivity empire awaits.";

        recentTasksContainer.appendChild(emptyMessage);

        return;
      }

      const recentTasks = todos.map(function (todo, index) {
        return { todo, index };
      });

      recentTasks.sort(function (firstEntry, secondEntry) {
        const firstId = Number(firstEntry.todo.id);
        const secondId = Number(secondEntry.todo.id);
        if (Number.isFinite(firstId) && Number.isFinite(secondId)) {
          return secondId - firstId;
        }
        return secondEntry.index - firstEntry.index;
      });

      const limitedTasks = recentTasks.slice(0, 5).map((entry) => entry.todo);

      limitedTasks.forEach(function (todo) {
        const taskRow = document.createElement("div");

        taskRow.classList.add("recent-task");

        const taskInfo = document.createElement("div");

        taskInfo.classList.add("recent-task-info");

        const taskTitle = document.createElement("p");

        taskTitle.classList.add("recent-task-title");

        if (isTodoCompleted(todo)) {
          taskTitle.textContent = "✅ " + todo.task;
        } else {
          taskTitle.textContent = "⬜ " + todo.task;
        }

        const taskDate = document.createElement("p");

        taskDate.classList.add("recent-task-date");

        taskDate.textContent = "Due: " + formatDate(todo.date);

        const taskStatus = document.createElement("span");

        taskStatus.classList.add("task-status");

        if (isTodoCompleted(todo)) {
          taskStatus.classList.add("completed");

          taskStatus.textContent = "Completed";
        } else {
          taskStatus.classList.add("pending");

          taskStatus.textContent = "Pending";
        }

        taskInfo.appendChild(taskTitle);
        taskInfo.appendChild(taskDate);

        taskRow.appendChild(taskInfo);
        taskRow.appendChild(taskStatus);

        recentTasksContainer.appendChild(taskRow);
      });
    }

    function loadStats() {
      const todos = getStoredArray("todos");

      const habits = getStoredArray("habits");

      updateWelcomeMessage();

      const completedTasks = updateTaskStatistics(todos);

      updateTaskDateStatistics(todos);

      const successfulHabitDays = updateHabitStatistics(habits);

      updateTodayHabitStatistics(habits);

      displayHabitHistory(habits);

      updateAchievements();

      displayRecentTasks(todos);
    }

    if (printStatsButton) printStatsButton.addEventListener("click", printHabitTracker);
    window.addEventListener("beforeprint", preparePrintableHabitTracker);
    window.addEventListener("afterprint", restoreHabitHistoryAfterPrint);

    loadStats();

    window.displayRecentTasks = displayRecentTasks;
    window.displayHabitHistory = displayHabitHistory;
    window.preparePrintableHabitTracker = preparePrintableHabitTracker;
    window.formatDate = formatDate;
    window.getStoredArray = getStoredArray;
    window.getTodayString = getTodayString;
    window.loadStats = loadStats;
    window.updateAchievements = updateAchievements;
    window.displayLatestAchievement = displayLatestAchievement;
    window.updateBadges = updateBadges;
    window.updateHabitProgressMessage = updateHabitProgressMessage;
    window.updateHabitStatistics = updateHabitStatistics;
    window.updateTaskDateStatistics = updateTaskDateStatistics;
    window.updateTaskProgressMessage = updateTaskProgressMessage;
    window.updateTaskStatistics = updateTaskStatistics;
    window.updateTodayHabitStatistics = updateTodayHabitStatistics;
    window.updateWelcomeMessage = updateWelcomeMessage;
    return () => {
      Object.entries({
        displayRecentTasks,
        displayHabitHistory,
        preparePrintableHabitTracker,
        formatDate,
        getStoredArray,
        getTodayString,
        loadStats,
        updateAchievements,
        displayLatestAchievement,
        updateBadges,
        updateHabitProgressMessage,
        updateHabitStatistics,
        updateTaskDateStatistics,
        updateTaskProgressMessage,
        updateTaskStatistics,
        updateTodayHabitStatistics,
        updateWelcomeMessage,
      }).forEach(([name, routeFunction]) => {
        clearWindowRouteFunction(name, routeFunction);
      });
      if (printStatsButton) printStatsButton.removeEventListener("click", printHabitTracker);
      window.removeEventListener("beforeprint", preparePrintableHabitTracker);
      window.removeEventListener("afterprint", restoreHabitHistoryAfterPrint);
    };
  },
  achievements: function init_achievements() {
    const progression = syncProgressionFromActivity();
    renderProgressionSummary(progression.state);
    renderAchievementCollection(progression.state);
    renderBadgeCollection(progression.state);
  },

  unwind: function init_unwind() {
    const startButton = document.getElementById("start");
    const elapsedInput = document.getElementById("elapsed");
    const resetButton = document.getElementById("reset");
    const pauseButton = document.getElementById("pause");
    const timerDisplay = document.getElementById("timer-display");
    const timerCard = document.getElementById("display-card");
    const timerStatus = document.getElementById("timer-status");
    let timerId = null;
    let remainingSeconds = 5 * 60;
    let sessionInProgress = false;

    function readDuration() {
      const minutes = Number(elapsedInput.value);
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 120) {
        return null;
      }
      return minutes * 60;
    }

    function formatTime(seconds) {
      const safeSeconds = Math.max(0, Math.floor(seconds));
      const minutes = Math.floor(safeSeconds / 60);
      const remainder = safeSeconds % 60;
      return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
    }

    function updateDisplay() {
      timerDisplay.textContent = formatTime(remainingSeconds);
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      timerCard.setAttribute(
        "aria-label",
        `${minutes} ${minutes === 1 ? "minute" : "minutes"} and ` + `${seconds} ${seconds === 1 ? "second" : "seconds"} remaining`,
      );
    }

    function setRunning(running) {
      startButton.disabled = running;
      pauseButton.disabled = !running;
      elapsedInput.disabled = sessionInProgress;
      timerCard.classList.toggle("is-running", running);
    }

    function clearTimer() {
      if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
      }
    }

    function finishSession() {
      clearTimer();
      remainingSeconds = 0;
      sessionInProgress = false;
      setRunning(false);
      updateDisplay();

      const reward = recordZenSession();
      announceProgressionReward(reward);

      if (!reward.saved) {
        timerStatus.textContent = "Session complete. Your progress could not be saved.";
        return;
      }

      const unlockedNames = reward.newlyUnlocked.map((achievement) => achievement.name).join(" and ");
      timerStatus.textContent = unlockedNames
        ? `Session complete! Achievement unlocked: ${unlockedNames}.`
        : `Session complete! You earned ${reward.xpAwarded} XP.`;
    }

    function tick() {
      remainingSeconds--;
      updateDisplay();
      if (remainingSeconds <= 0) finishSession();
    }

    function startTimer() {
      if (timerId !== null) return;

      if (!sessionInProgress || remainingSeconds <= 0) {
        const duration = readDuration();
        if (duration === null) {
          timerStatus.textContent = "Enter a whole number from 1 to 120 minutes.";
          elapsedInput.focus();
          return;
        }
        remainingSeconds = duration;
        sessionInProgress = true;
        updateDisplay();
      }

      timerStatus.textContent = "Your quiet time has started.";
      timerId = setInterval(tick, 1000);
      setRunning(true);
    }

    function pauseTimer() {
      if (timerId === null) return;
      clearTimer();
      setRunning(false);
      timerStatus.textContent = "Paused. Start again when you are ready.";
    }

    function resetTimer() {
      clearTimer();
      sessionInProgress = false;
      remainingSeconds = readDuration() || 5 * 60;
      setRunning(false);
      updateDisplay();
      timerStatus.textContent = "Ready when you are.";
    }

    function handleDurationInput() {
      if (sessionInProgress) return;
      const duration = readDuration();
      if (duration !== null) {
        remainingSeconds = duration;
        updateDisplay();
        timerStatus.textContent = "Ready when you are.";
      }
    }

    startButton.addEventListener("click", startTimer);
    pauseButton.addEventListener("click", pauseTimer);
    resetButton.addEventListener("click", resetTimer);
    elapsedInput.addEventListener("input", handleDurationInput);
    updateDisplay();

    return () => {
      clearTimer();
      startButton.removeEventListener("click", startTimer);
      pauseButton.removeEventListener("click", pauseTimer);
      resetButton.removeEventListener("click", resetTimer);
      elapsedInput.removeEventListener("input", handleDurationInput);
    };
  },
  profile: function init_profile() {
    const nameInput = document.getElementById("name-input");
    const surnameInput = document.getElementById("surname-input");
    const usernameInput = document.getElementById("username-input");
    const bioInput = document.getElementById("bio-input");

    const displayName = document.getElementById("display-name");
    const displayUsername = document.getElementById("display-username");
    const displayBio = document.getElementById("display-bio");

    const saveButton = document.getElementById("save-button");
    const saveMessage = document.getElementById("save-message");

    const profileUpload = document.getElementById("profile-upload");
    const profilePicture = document.getElementById("profile-picture");
    const cameraButton = document.querySelector(".camera-button");

    const characterCount = document.getElementById("character-count");
    const logoutButton = document.getElementById("logout-button");

    const streakNumber = document.getElementById("streak-number");
    const tasksNumber = document.getElementById("tasks-number");
    const achievementsNumber = document.getElementById("achievements-number");
    let messageTimeout = null;
    let profileActive = true;
    let profileOwner = getLoggedInUsername();

    function loadProfile() {
      const savedName = getActiveIdentityItem("name") || APP_CONFIG.name;

      const savedSurname = getActiveIdentityItem("surname") || "User";

      const savedUsername = getActiveIdentityItem("username") || "ascendrauser";

      const savedBio = getUserItem("ascendra-profile-bio", profileOwner) || "Becoming better, one day at a time.";

      const savedPicture = getUserItem("ascendra-profile-picture", profileOwner);

      nameInput.value = savedName;
      surnameInput.value = savedSurname;
      usernameInput.value = savedUsername;
      bioInput.value = savedBio;

      displayName.textContent = savedName + " " + savedSurname;

      displayUsername.textContent = "@" + savedUsername;

      displayBio.textContent = savedBio;

      characterCount.textContent = savedBio.length + " / 120";

      const todos = getUserArray("todos", profileOwner);
      const habits = getUserArray("habits", profileOwner);
      const completedTasks = todos.filter(isTodoCompleted).length;
      const longestCurrentStreak = habits.reduce((longest, habit) => {
        return Math.max(longest, getHabitCurrentStreak(habit));
      }, 0);
      const progression = syncProgressionFromActivity();

      streakNumber.textContent = String(longestCurrentStreak);
      tasksNumber.textContent = String(completedTasks);
      achievementsNumber.textContent = String(getUnlockedAchievements(progression.state).length);
      renderProgressionSummary(progression.state);

      if (savedPicture) {
        profilePicture.src = savedPicture;
      }
    }

    function cleanUsername(username) {
      return normalizeUsername(username);
    }

    function showMessage(message, type) {
      saveMessage.textContent = message;

      if (type === "success") {
        saveMessage.className = "success-message";
      } else {
        saveMessage.className = "error-message";
      }

      clearTimeout(messageTimeout);
      messageTimeout = setTimeout(function () {
        saveMessage.textContent = "";
        saveMessage.className = "";
      }, 3000);
    }

    function handleProfileSave() {
      const name = nameInput.value.trim();
      const surname = surnameInput.value.trim();
      const username = cleanUsername(usernameInput.value);
      const bio = bioInput.value.trim();
      const oldUsername = getActiveIdentityItem("username") || profileOwner;

      if (name === "") {
        showMessage("Please enter your first name.", "error");

        return;
      }

      if (surname === "") {
        showMessage("Please enter your surname.", "error");

        return;
      }

      const usernameValidationMessage = getUsernameValidationMessage(username, {
        allowLegacyUsername: oldUsername,
      });
      if (usernameValidationMessage) {
        showMessage(usernameValidationMessage, "error");

        return;
      }

      if (profileOwner && !activeAccountMatchesIdentity(profileOwner)) {
        invalidateMissingActiveAccount();
        return;
      }

      const accountRecord = profileOwner ? findStoredAccount(oldUsername) || findStoredAccount(profileOwner) : null;
      const usernameRecord = findStoredAccount(username);

      if (usernameRecord && usernameRecord.key !== accountRecord?.key) {
        showMessage("That username is already in use.", "error");
        return;
      }

      if (accountRecord?.legacy && oldUsername.toLowerCase() !== username.toLowerCase()) {
        showMessage("Log in once before changing this legacy username.", "error");
        return;
      }

      if (profileOwner && !accountRecord) {
        showMessage("Account data was not found. Please log in again.", "error");
        return;
      }

      const updatedAccountId = accountRecord?.account?.accountId || getActiveIdentityItem("accountId");

      try {
        if (accountRecord) {
          const updatedUser = {
            ...accountRecord.account,
            name,
            surname,
            username,
          };

          renameStoredAccountAndData(accountRecord, updatedUser, oldUsername, username);
        }

        const updatedOwner = accountRecord ? username : "";
        setActiveIdentity(
          {
            loggedInUser: accountRecord ? username : null,
            name,
            surname,
            username,
            accountId: accountRecord ? updatedAccountId : "",
          },
          {
            publish: false,
            previousUsername: oldUsername || null,
          },
        );
        profileOwner = updatedOwner;

        setUserItem("ascendra-profile-bio", bio, updatedOwner);
        const progression = syncProgressionFromActivity();
        renderProgressionSummary(progression.state);

        displayName.textContent = name + " " + surname;

        displayUsername.textContent = "@" + username;

        displayBio.textContent = bio || "Becoming better, one day at a time.";

        usernameInput.value = username;

        showMessage("Profile saved successfully!", "success");
      } catch (error) {
        console.error("Could not safely save the profile:", error);
        showMessage(error.message || "Could not safely save your profile.", "error");
      }
    }

    function handleBioInput() {
      characterCount.textContent = bioInput.value.length + " / 120";
    }

    function handleLogout() {
      clearActiveIdentity();
      navigate("login");
    }

    logoutButton.addEventListener("click", handleLogout);

    function handleCameraKeydown(event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      profileUpload.click();
    }

    cameraButton.addEventListener("keydown", handleCameraKeydown);

    function handleProfileUpload(event) {
      const selectedFile = event.target.files[0];

      if (!selectedFile) {
        return;
      }

      if (!selectedFile.type.startsWith("image/")) {
        showMessage("Please choose an image file.", "error");

        profileUpload.value = "";
        return;
      }

      const pictureOwner = getLoggedInUsername();
      const reader = new FileReader();

      reader.addEventListener("load", function () {
        if (!profileActive || pictureOwner !== getLoggedInUsername()) {
          return;
        }

        try {
          setUserItem("ascendra-profile-picture", reader.result, pictureOwner);
          profilePicture.src = reader.result;

          showMessage("Profile picture updated!", "success");
        } catch (error) {
          showMessage("That image is too large.", "error");
        }
      });

      reader.readAsDataURL(selectedFile);
    }

    saveButton.addEventListener("click", handleProfileSave);
    bioInput.addEventListener("input", handleBioInput);
    profileUpload.addEventListener("change", handleProfileUpload);

    loadProfile();

    window.cleanUsername = cleanUsername;
    window.loadProfile = loadProfile;
    window.showMessage = showMessage;
    return () => {
      profileActive = false;
      clearTimeout(messageTimeout);
      saveButton.removeEventListener("click", handleProfileSave);
      bioInput.removeEventListener("input", handleBioInput);
      profileUpload.removeEventListener("change", handleProfileUpload);
      logoutButton.removeEventListener("click", handleLogout);
      cameraButton.removeEventListener("keydown", handleCameraKeydown);
      clearWindowRouteFunction("cleanUsername", cleanUsername);
      clearWindowRouteFunction("loadProfile", loadProfile);
      clearWindowRouteFunction("showMessage", showMessage);
    };
  },
  extras: function init_extras() {},
  studyspace: function init_studyspace() {
    const minutesInput = document.getElementById("pomodoro-minutes");
    const startButton = document.getElementById("pomodoro-start");
    const pauseButton = document.getElementById("stop-pomodoro");
    const resetButton = document.getElementById("restart-pomodoro");
    const timerDisplay = document.getElementById("pomodoro-display");
    const timeLeft = document.getElementById("timeLeft");
    const timerStatus = document.getElementById("pomodoro-status");
    const trackButtons = [...document.querySelectorAll(".studyspace-track")];
    const audio = document.getElementById("studyspace-audio");
    const song = document.getElementById("song");
    const playButton = document.getElementById("play");
    const backButton = document.getElementById("back-20");
    const forwardButton = document.getElementById("forward-20");
    const progress = document.getElementById("studyspace-progress");
    const elapsed = document.getElementById("music-elapsed");
    const duration = document.getElementById("music-duration");
    const musicStatus = document.getElementById("music-status");
    const tracks = Object.freeze({
      fluidscape: {
        title: "Fluidscape",
        artist: "Kevin MacLeod",
        src: "assets/music/Fluidscape.mp3",
        fallbackDuration: "30:21",
      },
      forestal: {
        title: "Forestal",
        artist: "Liborio Conti",
        src: "assets/music/Forestal.mp3",
        fallbackDuration: "7:25",
      },
    });
    let timerId = null;
    let remainingSeconds = 5 * 60;
    let sessionStarted = false;
    let activeTrackId = "fluidscape";

    function formatClock(totalSeconds) {
      const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
      const minutes = Math.floor(safeSeconds / 60);
      const seconds = safeSeconds % 60;
      return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    function formatTrackTime(totalSeconds) {
      const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
      return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, "0")}`;
    }

    function readTimerDuration() {
      const minutes = Number(minutesInput.value);
      return Number.isInteger(minutes) && minutes >= 1 && minutes <= 180 ? minutes * 60 : null;
    }

    function updateTimerDisplay() {
      timeLeft.textContent = formatClock(remainingSeconds);
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      timerDisplay.setAttribute(
        "aria-label",
        `${minutes} ${minutes === 1 ? "minute" : "minutes"} and ${seconds} ${seconds === 1 ? "second" : "seconds"} remaining`,
      );
    }

    function clearTimer() {
      if (timerId === null) return;
      clearInterval(timerId);
      timerId = null;
    }

    function setTimerRunning(running) {
      startButton.disabled = running;
      pauseButton.disabled = !running;
      minutesInput.disabled = sessionStarted;
      timerDisplay.classList.toggle("is-running", running);
    }

    function finishTimer() {
      clearTimer();
      remainingSeconds = 0;
      sessionStarted = false;
      setTimerRunning(false);
      updateTimerDisplay();
      timerStatus.textContent = "Focus session complete. Nice work!";
    }

    function tickTimer() {
      remainingSeconds -= 1;
      updateTimerDisplay();
      if (remainingSeconds <= 0) finishTimer();
    }

    function startTimer() {
      if (timerId !== null) return;

      if (!sessionStarted || remainingSeconds <= 0) {
        const durationInSeconds = readTimerDuration();
        if (durationInSeconds === null) {
          timerStatus.textContent = "Enter a whole number from 1 to 180 minutes.";
          minutesInput.focus();
          return;
        }
        remainingSeconds = durationInSeconds;
        sessionStarted = true;
        updateTimerDisplay();
      }

      timerId = setInterval(tickTimer, 1000);
      setTimerRunning(true);
      timerStatus.textContent = "Focus session in progress.";
    }

    function pauseTimer() {
      if (timerId === null) return;
      clearTimer();
      setTimerRunning(false);
      timerStatus.textContent = "Paused. Continue whenever you are ready.";
    }

    function resetTimer() {
      clearTimer();
      sessionStarted = false;
      remainingSeconds = readTimerDuration() || 5 * 60;
      setTimerRunning(false);
      updateTimerDisplay();
      timerStatus.textContent = "Ready when you are.";
    }

    function handleMinutesInput() {
      if (sessionStarted) return;
      const durationInSeconds = readTimerDuration();
      if (durationInSeconds === null) return;
      remainingSeconds = durationInSeconds;
      updateTimerDisplay();
      timerStatus.textContent = "Ready when you are.";
    }

    function updatePlayButton() {
      const isPlaying = !audio.paused && !audio.ended;
      const activeTrack = tracks[activeTrackId];
      playButton.innerHTML = isPlaying
        ? '<i class="fa-solid fa-pause" aria-hidden="true"></i>'
        : '<i class="fa-solid fa-play" aria-hidden="true"></i>';
      playButton.setAttribute("aria-label", `${isPlaying ? "Pause" : "Play"} ${activeTrack.title}`);
    }

    function updateMusicProgress() {
      const trackDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
      const currentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      progress.value = trackDuration ? String((currentTime / trackDuration) * 100) : "0";
      elapsed.textContent = formatTrackTime(currentTime);
      if (trackDuration) duration.textContent = formatTrackTime(trackDuration);
      progress.setAttribute("aria-valuetext", `${formatTrackTime(currentTime)} of ${formatTrackTime(trackDuration)}`);
    }

    async function toggleMusic() {
      if (!audio.paused) {
        audio.pause();
        musicStatus.textContent = "Music paused.";
        return;
      }

      try {
        await audio.play();
        musicStatus.textContent = `Playing ${tracks[activeTrackId].title}.`;
      } catch (error) {
        console.warn("Study Space could not start the selected track.", error);
        musicStatus.textContent = "The music could not start. Please try again.";
      }
    }

    function seekBy(seconds) {
      const trackDuration = Number.isFinite(audio.duration) ? audio.duration : Infinity;
      audio.currentTime = Math.min(trackDuration, Math.max(0, audio.currentTime + seconds));
      updateMusicProgress();
    }

    function seekFromProgress() {
      if (!Number.isFinite(audio.duration)) return;
      audio.currentTime = (Number(progress.value) / 100) * audio.duration;
      updateMusicProgress();
    }

    function selectTrack(event) {
      const selectedButton = event.currentTarget;
      const selectedTrackId = selectedButton.dataset.track;
      const selectedTrack = tracks[selectedTrackId];

      if (!selectedTrack || selectedTrackId === activeTrackId) {
        playButton.focus();
        return;
      }

      audio.pause();
      activeTrackId = selectedTrackId;
      audio.src = selectedTrack.src;
      audio.load();
      song.textContent = `${selectedTrack.title} · ${selectedTrack.artist}`;
      duration.textContent = selectedTrack.fallbackDuration;
      progress.value = "0";
      elapsed.textContent = "0:00";
      trackButtons.forEach((button) => {
        const isSelected = button === selectedButton;
        button.classList.toggle("is-selected", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));
      });
      updatePlayButton();
      musicStatus.textContent = `${selectedTrack.title} selected.`;
      playButton.focus();
    }

    function handleTrackEnded() {
      updatePlayButton();
      musicStatus.textContent = `${tracks[activeTrackId].title} finished.`;
    }

    function handleAudioError() {
      musicStatus.textContent = `${tracks[activeTrackId].title} could not be loaded.`;
    }

    const seekBackward = () => seekBy(-20);
    const seekForward = () => seekBy(20);

    startButton.addEventListener("click", startTimer);
    pauseButton.addEventListener("click", pauseTimer);
    resetButton.addEventListener("click", resetTimer);
    minutesInput.addEventListener("input", handleMinutesInput);
    trackButtons.forEach((button) => button.addEventListener("click", selectTrack));
    playButton.addEventListener("click", toggleMusic);
    backButton.addEventListener("click", seekBackward);
    forwardButton.addEventListener("click", seekForward);
    progress.addEventListener("input", seekFromProgress);
    audio.addEventListener("timeupdate", updateMusicProgress);
    audio.addEventListener("loadedmetadata", updateMusicProgress);
    audio.addEventListener("play", updatePlayButton);
    audio.addEventListener("pause", updatePlayButton);
    audio.addEventListener("ended", handleTrackEnded);
    audio.addEventListener("error", handleAudioError);
    updateTimerDisplay();
    updateMusicProgress();
    updatePlayButton();

    return () => {
      clearTimer();
      audio.pause();
      startButton.removeEventListener("click", startTimer);
      pauseButton.removeEventListener("click", pauseTimer);
      resetButton.removeEventListener("click", resetTimer);
      minutesInput.removeEventListener("input", handleMinutesInput);
      trackButtons.forEach((button) => button.removeEventListener("click", selectTrack));
      playButton.removeEventListener("click", toggleMusic);
      backButton.removeEventListener("click", seekBackward);
      forwardButton.removeEventListener("click", seekForward);
      progress.removeEventListener("input", seekFromProgress);
      audio.removeEventListener("timeupdate", updateMusicProgress);
      audio.removeEventListener("loadedmetadata", updateMusicProgress);
      audio.removeEventListener("play", updatePlayButton);
      audio.removeEventListener("pause", updatePlayButton);
      audio.removeEventListener("ended", handleTrackEnded);
      audio.removeEventListener("error", handleAudioError);
    };
  },
  capsule: function init_capsule() {
    const form = document.getElementById("capsule-form");
    const titleInput = document.getElementById("capsule-title");
    const messageInput = document.getElementById("capsule-message");
    const dateInput = document.getElementById("capsule-date");
    const characterCount = document.getElementById("capsule-character-count");
    const status = document.getElementById("capsule-status");
    const summary = document.getElementById("capsule-summary");
    const list = document.getElementById("capsule-list");
    let statusTimer = null;

    function toLocalDateString(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    function getTomorrowString() {
      const tomorrow = new Date();
      tomorrow.setHours(0, 0, 0, 0);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return toLocalDateString(tomorrow);
    }

    function parseCapsuleDate(value) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
      const date = new Date(`${value}T00:00:00`);
      return !Number.isNaN(date.getTime()) && toLocalDateString(date) === value ? date : null;
    }

    function isUnlocked(capsule) {
      const unlockDate = parseCapsuleDate(capsule.unlockDate);
      if (!unlockDate) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return unlockDate <= today;
    }

    function formatUnlockDate(value) {
      const date = parseCapsuleDate(value);
      return date ? date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "Unknown date";
    }

    function getCapsules() {
      return getUserArray(STORAGE_KEYS.TIME_CAPSULES).filter(
        (capsule) =>
          typeof capsule.id === "string" &&
          typeof capsule.title === "string" &&
          typeof capsule.message === "string" &&
          parseCapsuleDate(capsule.unlockDate),
      );
    }

    function saveCapsules(capsules) {
      setUserItem(STORAGE_KEYS.TIME_CAPSULES, JSON.stringify(capsules));
    }

    function showStatus(message, type = "success") {
      status.textContent = message;
      status.className = `capsule-status ${type}`;
      clearTimeout(statusTimer);
      statusTimer = setTimeout(() => {
        status.textContent = "";
        status.className = "capsule-status";
      }, 5000);
    }

    function createCapsuleCard(capsule) {
      const unlocked = isUnlocked(capsule);
      const article = document.createElement("article");
      article.className = `saved-capsule ${unlocked ? "is-unlocked" : "is-locked"}`;

      const icon = document.createElement("span");
      icon.className = "saved-capsule-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = unlocked ? '<i class="fa-solid fa-lock-open"></i>' : '<i class="fa-solid fa-lock"></i>';

      const content = document.createElement("div");
      content.className = "saved-capsule-content";
      const heading = document.createElement("h3");
      heading.textContent = capsule.title;
      const date = document.createElement("p");
      date.className = "saved-capsule-date";
      date.textContent = `${unlocked ? "Unlocked" : "Unlocks"} ${formatUnlockDate(capsule.unlockDate)}`;
      const message = document.createElement("p");
      message.className = "saved-capsule-message";
      message.textContent = unlocked ? capsule.message : "This message is sealed until its unlock date.";

      const deleteButton = document.createElement("button");
      deleteButton.className = "capsule-delete";
      deleteButton.type = "button";
      deleteButton.dataset.capsuleId = capsule.id;
      deleteButton.setAttribute("aria-label", `Delete ${capsule.title}`);
      deleteButton.innerHTML = '<i class="fa-solid fa-trash" aria-hidden="true"></i>';

      content.append(heading, date, message);
      article.append(icon, content, deleteButton);
      return article;
    }

    function renderCapsules() {
      const capsules = getCapsules().sort((first, second) => first.unlockDate.localeCompare(second.unlockDate));
      list.replaceChildren();

      if (capsules.length === 0) {
        const emptyState = document.createElement("div");
        emptyState.className = "capsule-empty";
        emptyState.innerHTML = '<i class="fa-solid fa-hourglass-start" aria-hidden="true"></i>';
        const emptyText = document.createElement("p");
        emptyText.textContent = "Your future messages will appear here after you seal them.";
        emptyState.appendChild(emptyText);
        list.appendChild(emptyState);
        summary.textContent = "No capsules saved yet.";
        return;
      }

      const unlockedCount = capsules.filter(isUnlocked).length;
      summary.textContent = `${capsules.length} saved · ${capsules.length - unlockedCount} locked · ${unlockedCount} unlocked`;
      capsules.forEach((capsule) => list.appendChild(createCapsuleCard(capsule)));
    }

    function updateCharacterCount() {
      characterCount.textContent = `${messageInput.value.length} / 2000`;
    }

    function handleSubmit(event) {
      event.preventDefault();
      const title = titleInput.value.trim();
      const message = messageInput.value.trim();
      const unlockDate = parseCapsuleDate(dateInput.value);
      const tomorrow = parseCapsuleDate(getTomorrowString());

      if (!title || !message || !unlockDate) {
        showStatus("Complete every field before sealing your capsule.", "error");
        return;
      }
      if (unlockDate < tomorrow) {
        showStatus("Choose tomorrow or a later unlock date.", "error");
        dateInput.focus();
        return;
      }

      const capsules = getCapsules();
      capsules.push({
        id: createAccountId(),
        title,
        message,
        unlockDate: dateInput.value,
        createdAt: new Date().toISOString(),
      });

      try {
        saveCapsules(capsules);
        form.reset();
        dateInput.min = getTomorrowString();
        updateCharacterCount();
        renderCapsules();
        showStatus("Your time capsule has been sealed.");
        titleInput.focus();
      } catch (error) {
        console.warn("Ascendra could not save the time capsule.", error);
        showStatus("Your capsule could not be saved. Please try again.", "error");
      }
    }

    function handleListClick(event) {
      const deleteButton = event.target.closest("[data-capsule-id]");
      if (!deleteButton) return;
      const capsules = getCapsules();
      const capsule = capsules.find((item) => item.id === deleteButton.dataset.capsuleId);
      if (!capsule || !confirm(`Delete the time capsule “${capsule.title}”?`)) return;

      try {
        saveCapsules(capsules.filter((item) => item.id !== capsule.id));
        renderCapsules();
        showStatus("Time capsule deleted.");
      } catch (error) {
        console.warn("Ascendra could not delete the time capsule.", error);
        showStatus("The capsule could not be deleted.", "error");
      }
    }

    dateInput.min = getTomorrowString();
    form.addEventListener("submit", handleSubmit);
    messageInput.addEventListener("input", updateCharacterCount);
    list.addEventListener("click", handleListClick);
    updateCharacterCount();
    renderCapsules();

    return () => {
      clearTimeout(statusTimer);
      form.removeEventListener("submit", handleSubmit);
      messageInput.removeEventListener("input", updateCharacterCount);
      list.removeEventListener("click", handleListClick);
    };
  },
  minitools: function init_minitools() {
    const flipButton = document.getElementById("flip");
    const rollButton = document.getElementById("roll");
    const generateButton = document.getElementById("gen");
    const minimumInput = document.getElementById("min");
    const maximumInput = document.getElementById("max");
    const coinOutput = document.getElementById("coin-flip-output");
    const diceOutput = document.getElementById("dice-roll-output");
    const numberOutput = document.getElementById("random-number-output");

    const initialProgression = syncProgressionFromActivity();
    renderProgressionSummary(initialProgression.state);

    function addMiniToolReward(resultText, toolId) {
      const reward = recordMiniToolUse(toolId);
      renderProgressionSummary(reward.state);

      if (!reward.xpAwarded) return resultText;

      const unlockedNames = reward.newlyUnlocked.map((achievement) => achievement.name).join(" and ");
      const unlockMessage = unlockedNames ? ` Achievement unlocked \u2014 ${unlockedNames}` : " First-use reward earned";

      return `${resultText}${unlockMessage} (+${reward.xpAwarded} XP)`;
    }

    function flipCoin() {
      const result = Math.random() < 0.5 ? "Heads!" : "Tails!";
      coinOutput.textContent = addMiniToolReward(result, "coin");
    }

    function rollDie() {
      const result = Math.floor(Math.random() * 6) + 1;
      diceOutput.textContent = addMiniToolReward("You rolled a " + result + ".", "dice");
    }

    function generateRandomNumber() {
      const minimumText = minimumInput.value.trim();
      const maximumText = maximumInput.value.trim();

      if (!minimumText || !maximumText) {
        numberOutput.textContent = "Enter both a minimum and maximum number.";
        return;
      }

      const minimum = Number(minimumText);
      const maximum = Number(maximumText);
      const range = maximum - minimum + 1;

      if (!Number.isSafeInteger(minimum) || !Number.isSafeInteger(maximum)) {
        numberOutput.textContent = "Use whole numbers within the safe number range.";
        return;
      }

      if (minimum > maximum) {
        numberOutput.textContent = "The minimum must be less than or equal to the maximum.";
        return;
      }

      if (!Number.isSafeInteger(range) || range < 1) {
        numberOutput.textContent = "Choose a smaller range of numbers.";
        return;
      }

      const result = Math.floor(Math.random() * range) + minimum;

      numberOutput.textContent = addMiniToolReward("Your random number is " + result + ".", "random-number");
    }

    flipButton.addEventListener("click", flipCoin);
    rollButton.addEventListener("click", rollDie);
    generateButton.addEventListener("click", generateRandomNumber);

    return () => {
      flipButton.removeEventListener("click", flipCoin);
      rollButton.removeEventListener("click", rollDie);
      generateButton.removeEventListener("click", generateRandomNumber);
    };
  },
  privacy: function init_privacy() {},
  terms: function init_terms() {},
  about: function init_about() {},
  credits: function init_credits() {},
  roadmap: function init_roadmap() {},
  comingsoon: function init_comingsoon() {},
  projects: function init_projects() {},
};

const initialRoute = getRoute();
if (location.hash !== canonicalRouteHash(initialRoute)) {
  history.replaceState({ route: initialRoute }, "", canonicalRouteHash(initialRoute));
}
renderRoute(initialRoute, { focusRoute: false });
initializeHabitImportPreview();

const searchablePages = [
  { name: "Home", route: "home" },
  { name: "Alerts", route: "alerts" },
  { name: "Calendar", route: "calendar" },
  { name: "Journal", route: "journal" },
  { name: "Habits", route: "habits" },
  { name: "To-Dos", route: "todos" },
  { name: "Breathing", route: "breathing" },
  { name: "Menu", route: "menu" },
  { name: "Extras", route: "extras" },
  { name: "Profile", route: "profile" },
  { name: "Statistics", route: "stats" },
  { name: "Achievements", route: "achievements" },
  { name: "Settings", route: "settings" },
  { name: "Roadmap", route: "roadmap" },
  { name: "Mini Tools", route: "minitools" },
  { name: "About", route: "about" },
  { name: "Credits", route: "credits" },
  { name: "Privacy Policy", route: "privacy" },
  { name: "Terms of Service", route: "terms" },
  { name: "Unwind", route: "unwind" },
  { name: "Study Space", route: "studyspace" },
  { name: "Time Capsule", route: "capsule" },
  { name: "Projects", route: "projects" },
  { name: "Coming Soon", route: "comingsoon" },
];
let searchPreviousFocus = null;

function getSearchElements() {
  return {
    overlay: document.getElementById("searchOverlay"),
    input: document.getElementById("searchInput"),
    results: document.getElementById("searchResults"),
  };
}

function openSearch() {
  const { overlay, input } = getSearchElements();
  if (!overlay || !input) {
    console.warn("Search UI is not available on this page.");
    return;
  }

  const activeRouteDialog = app.querySelector('[role="dialog"][aria-hidden="false"], dialog[open], .modal[aria-hidden="false"]');
  if (activeRouteDialog) {
    console.info("Close the current dialog before opening Search.");
    return;
  }

  if (!overlay.hidden) {
    input.focus();
    return;
  }

  searchPreviousFocus = document.activeElement;
  overlay.hidden = false;
  input.value = "";
  showSearchResults(searchablePages);
  input.focus();
}

function closeSearch({ restoreFocus = true } = {}) {
  const { overlay } = getSearchElements();
  if (overlay) overlay.hidden = true;

  if (restoreFocus && searchPreviousFocus?.isConnected) {
    searchPreviousFocus.focus();
  }
  searchPreviousFocus = null;
}

function showSearchResults(pages) {
  const { results } = getSearchElements();
  if (!results) return;

  results.innerHTML = "";

  if (pages.length === 0) {
    results.innerHTML = '<p class="no-results">No results found</p>';
    return;
  }

  pages.forEach(function (page) {
    const button = document.createElement("button");
    button.className = "search-result";
    button.textContent = page.name;

    button.addEventListener("click", function () {
      navigate(page.route);
      closeSearch();
    });

    results.appendChild(button);
  });
}

// Event delegation works even if the search UI is inserted later by a route/template.
document.addEventListener("input", function (event) {
  if (event.target.id !== "searchInput") return;

  const searchText = event.target.value.toLowerCase().trim();
  const matches = searchablePages.filter(function (page) {
    return page.name.toLowerCase().includes(searchText);
  });

  showSearchResults(matches);
});

document.addEventListener("keydown", function (event) {
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openSearch();
    return;
  }

  const { overlay } = getSearchElements();
  if (!overlay || overlay.hidden) return;

  if (event.key === "Tab") {
    const focusableElements = [
      ...overlay.querySelectorAll('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'),
    ].filter((element) => !element.hidden);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements.at(-1);
    const focusIsOutside = !overlay.contains(document.activeElement);

    if (
      firstElement &&
      (focusIsOutside ||
        (event.shiftKey && document.activeElement === firstElement) ||
        (!event.shiftKey && document.activeElement === lastElement))
    ) {
      event.preventDefault();
      (event.shiftKey && !focusIsOutside ? lastElement : firstElement).focus();
    }
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    closeSearch();
  }
});

document.addEventListener("click", function (event) {
  const { overlay } = getSearchElements();
  if (overlay && (event.target === overlay || event.target.closest("#searchClose"))) {
    closeSearch();
  }
});

window.openSearch = openSearch;
window.closeSearch = closeSearch;

const todos = readUserJson(STORAGE_KEYS.TODOS, []);
const totalTodos = todos.length;
const username = getLoggedInUsername() || "there";

const hour = new Date().getHours();

const timeOfDay = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

const greeting = responses.greeting[Math.floor(Math.random() * responses.greeting.length)](username, totalTodos, timeOfDay);

let aiMessage = document.getElementById("ai-message");

let aiSpeakingTimer = null;
let lastAiSpokenAt = 0;
const aiRecentMessages = [];
const AI_MESSAGE_COOLDOWN = 12000;
const AI_MESSAGE_HISTORY_LIMIT = 4;

function buildResponseMessage(category, responseFactory, responseIndex, context) {
  if (category === "taskComplete") {
    if (responseIndex === 3) return responseFactory(context.username);
    if (responseIndex === 4) return responseFactory(context.remainingTodos);
  }

  if (category === "allTasksComplete" && responseIndex === 1) {
    return responseFactory(context.username);
  }

  if (category === "habitComplete" && responseIndex === 3) {
    return responseFactory(context.username);
  }

  if (category === "reminder" && responseIndex === 0) {
    return responseFactory(context.totalTodos);
  }

  return responseFactory();
}

function responseMessage(category, context = {}) {
  const responseGroup = responses[category];

  if (!Array.isArray(responseGroup) || responseGroup.length === 0) {
    return "";
  }

  const candidates = responseGroup.map((responseFactory, responseIndex) =>
    buildResponseMessage(category, responseFactory, responseIndex, context),
  );

  const freshCandidates = candidates.filter((message) => !aiRecentMessages.includes(message));

  const availableCandidates = freshCandidates.length > 0 ? freshCandidates : candidates;

  return availableCandidates[Math.floor(Math.random() * availableCandidates.length)];
}

function showAscendraAIMessage(message, options = {}) {
  const companion = document.getElementById("ascendra-ai");
  const messageElement = document.getElementById("ai-message");
  const cleanMessage = String(message || "").trim();
  const now = Date.now();

  if (!companion || companion.hidden || !messageElement || cleanMessage === "") {
    return false;
  }

  if (!options.bypassCooldown && now - lastAiSpokenAt < AI_MESSAGE_COOLDOWN) {
    return false;
  }

  changeText(messageElement, cleanMessage);

  companion.classList.remove("is-roaming", "is-napping");
  companion.classList.add("is-speaking");

  lastAiSpokenAt = now;

  aiRecentMessages.push(cleanMessage);

  if (aiRecentMessages.length > AI_MESSAGE_HISTORY_LIMIT) {
    aiRecentMessages.shift();
  }

  clearTimeout(aiSpeakingTimer);

  const speakingDuration = Math.min(6000, Math.max(1700, cleanMessage.length * 48));

  aiSpeakingTimer = window.setTimeout(() => {
    companion.classList.remove("is-speaking");
  }, speakingDuration);

  return true;
}

function showAscendraAIResponse(category, context = {}) {
  const isMilestoneResponse = ["taskComplete", "allTasksComplete", "habitComplete"].includes(category);

  return showAscendraAIMessage(responseMessage(category, context), {
    bypassCooldown: isMilestoneResponse,
  });
}

showAscendraAIMessage(greeting, {
  bypassCooldown: true,
});

function showIdleAscendraAIResponse() {
  const route = getRoute();

  if (route === "journal") {
    showAscendraAIResponse("journalReminder");
  } else if (route === "todos" || route === "alerts") {
    const remainingTodos = getUserArray("todos").filter((todo) => !isTodoCompleted(todo)).length;

    showAscendraAIResponse("reminder", {
      totalTodos: remainingTodos,
    });
  } else {
    showAscendraAIResponse("motivation");
  }
}

function chooseFreshAiChatReply(replies) {
  const availableReplies = replies.filter((reply) => !aiRecentMessages.includes(reply));

  const replyPool = availableReplies.length > 0 ? availableReplies : replies;

  return replyPool[Math.floor(Math.random() * replyPool.length)];
}

function ascendraAIReply(question) {
  const normalizedQuestion = question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim();

  const navigationIntent = /^(open|go to|show|take me to)\s+/.test(normalizedQuestion);

  if (/\b(what can you do|help|commands|abilities)\b/.test(normalizedQuestion)) {
    return "I can open Ascendra pages, count your remaining tasks, check how many habits you have, and explain features. Try ‘open journal’ or ‘how many tasks?’";
  }

  if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(normalizedQuestion)) {
    const currentUsername = getLoggedInUsername() || "there";
    return chooseFreshAiChatReply([
      `Hey ${currentUsername}! What are we working on?`,
      "Hi! Ask what I can do, or tell me which Ascendra page to open.",
      "Hello! Tiny fox, ready to help.",
    ]);
  }

  if (/\b(thanks|thank you|thx)\b/.test(normalizedQuestion)) {
    return chooseFreshAiChatReply(["You’re welcome!", "Anytime!", "Happy to help!"]);
  }

  if (/\b(task|tasks|todo|to-do|to-dos)\b/.test(normalizedQuestion) && !navigationIntent) {
    const remainingTodos = getUserArray("todos").filter((todo) => !isTodoCompleted(todo)).length;

    return remainingTodos === 0
      ? "You have no unfinished tasks. Nice work!"
      : `You have ${remainingTodos} unfinished ${remainingTodos === 1 ? "task" : "tasks"}.`;
  }

  if (/\b(habit|habits)\b/.test(normalizedQuestion) && !navigationIntent) {
    const habitCount = getUserArray("habits").length;

    return habitCount === 0
      ? "You haven’t added any habits yet. Open Habits when you’re ready to start one."
      : `You currently have ${habitCount} ${habitCount === 1 ? "habit" : "habits"} set up.`;
  }

  if (/\b(journal|privacy|private)\b/.test(normalizedQuestion) && !navigationIntent) {
    return "Your journal entries sync through Ascendra’s backend and also keep a local browser backup. Avoid entering sensitive secrets because the journal is not end-to-end encrypted.";
  }

  if (/\b(achievement|achievements|badge|badges|xp)\b/.test(normalizedQuestion) && !navigationIntent) {
    return "Open Achievements to see your XP, unlocked achievements, and badges. Statistics shows your broader progress.";
  }

  if (navigationIntent) {
    const requestedPage = normalizedQuestion.replace(/^(open|go to|show|take me to)\s+/, "").replace(/\s+page$/, "");

    const pageAliases = {
      tasks: "To-Dos",
      todos: "To-Dos",
      "to dos": "To-Dos",
      stats: "Statistics",
      tools: "Mini Tools",
    };

    const requestedName = pageAliases[requestedPage] || requestedPage;

    const destination = searchablePages.find((page) =>
      [page.name, page.route].some(
        (value) => value.toLowerCase().replace(/[^a-z0-9]/g, "") === requestedName.toLowerCase().replace(/[^a-z0-9]/g, ""),
      ),
    );

    if (destination) {
      location.hash = canonicalRouteHash(destination.route);

      return `Opening ${destination.name}.`;
    }

    return "I couldn’t find that page. Try ‘open journal,’ ‘open habits,’ or ‘open settings.’";
  }

  return chooseFreshAiChatReply([
    "I’m still learning that one. Ask what I can do to see my current tricks.",
    "I don’t know that yet, but I can help with Ascendra pages, tasks, habits, journaling, achievements, and XP.",
    "My fox brain is focused on Ascendra for now. Try asking me to open a page or check your tasks.",
  ]);
}

/* ============================= */
/* MANUAL RESPONSE COMMANDS      */
/* ============================= */

function checkManualResponse(input) {
  const text = input.toLowerCase().trim();

  // HELP TASK
  if (text.includes("help task") || text.includes("task help") || text.includes("how do i make a task")) {
    return {
      type: "taskHelp",
      response: manualResponses.taskHelp,
    };
  }

  // MAKE TASK
  if (text.includes("make") && text.includes("task")) {
    let name = "";
    let note = "";
    let priority = "medium";

    // Get task name
    const nameMatch = input.match(/task named (.*?)(?:,\s*add a note|\s+add a note|,\s*priority|\s+priority|$)/i);

    if (nameMatch) {
      name = nameMatch[1].trim();
    }

    // Get note
    const noteMatch = input.match(/add a note saying (.*?)(?:,\s*priority|\s+priority|$)/i);

    if (noteMatch) {
      note = noteMatch[1].trim();
    }

    // Get priority
    const priorityMatch = input.match(/priority\s+(low|medium|high)/i);

    if (priorityMatch) {
      priority = priorityMatch[1].toLowerCase();
    }

    return {
      type: "makeTask",
      name,
      note,
      priority,
      response: `Making a task named ${name}...`,
    };
  }

  return null;
}

/* ============================= */
/* AI CHAT                       */
/* ============================= */

function initializeAscendraAIChat() {
  const form = document.getElementById("ai-chat-form");
  const input = document.getElementById("ai-chat-input");

  if (!form || !input) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const question = input.value.trim();
    if (!question) return;

    input.value = "";
    const manualResponse = checkManualResponse(question);

    if (manualResponse) {
      if (manualResponse.type === "makeTask" && typeof window.createTodoFromAI === "function") {
        window.createTodoFromAI(manualResponse.name, manualResponse.note, manualResponse.priority);
      }

      showAscendraAIMessage(manualResponse.response, { bypassCooldown: true });
      return;
    }

    showAscendraAIMessage(ascendraAIReply(question), { bypassCooldown: true });
  });
}

/* ============================= */
/* AI COMPANION                  */
/* ============================= */

function initializeAscendraAI() {
  const companion = document.getElementById("ascendra-ai");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!companion) return;

  const idleBeforeRoaming = 6500;
  const roamingInterval = 9000;
  const landingOverlap = 10;

  const idleAnimationClasses = ["is-tail-wagging", "is-looking-around", "is-stretching", "is-napping"];

  let lastInteraction = Date.now();
  let lastTarget = null;
  let movementTimer = null;
  let homeTimer = null;
  let idleAnimationTimer = null;

  function clearIdleAnimation() {
    clearTimeout(idleAnimationTimer);

    idleAnimationClasses.forEach((className) => companion.classList.remove(className));
  }

  function scheduleIdleAnimation(delay = 2800 + Math.random() * 3200) {
    clearTimeout(idleAnimationTimer);

    idleAnimationTimer = window.setTimeout(() => {
      if (companion.hidden || reduceMotion.matches || document.hidden || companion.classList.contains("is-jumping")) {
        scheduleIdleAnimation();
        return;
      }

      clearIdleAnimation();

      const animationClass = idleAnimationClasses[Math.floor(Math.random() * idleAnimationClasses.length)];

      companion.classList.add(animationClass);

      const shiftX = Number.parseFloat(getComputedStyle(companion).getPropertyValue("--ai-shift-x")) || 0;

      const shiftY = Number.parseFloat(getComputedStyle(companion).getPropertyValue("--ai-shift-y")) || 0;

      if (shiftX === 0 && shiftY === 0 && Math.random() < 0.65) {
        showIdleAscendraAIResponse();
      }

      idleAnimationTimer = window.setTimeout(() => {
        companion.classList.remove(animationClass);

        scheduleIdleAnimation();
      }, 1550);
    }, delay);
  }

  function homePosition() {
    companion.style.setProperty("--ai-shift-x", "0px");

    companion.style.setProperty("--ai-shift-y", "0px");
  }

  function returnHome() {
    clearTimeout(homeTimer);

    companion.classList.add("is-roaming");

    companion.classList.remove("is-jumping");

    homePosition();

    homeTimer = window.setTimeout(() => {
      companion.classList.remove("is-roaming");
    }, 760);
  }

  function visibleLandingButtons() {
    return [...document.querySelectorAll("button:not([disabled])")].filter((button) => {
      if (button.closest("#ascendra-ai, [hidden], .search-overlay, .popup")) {
        return false;
      }

      const style = getComputedStyle(button);

      const box = button.getBoundingClientRect();

      return (
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        Number(style.opacity) > 0 &&
        box.width >= 34 &&
        box.height >= 28 &&
        box.top > 70 &&
        box.bottom < window.innerHeight - 72 &&
        box.left > 20 &&
        box.right < window.innerWidth - 20
      );
    });
  }

  function jumpToButton() {
    if (companion.hidden || reduceMotion.matches || document.hidden || Date.now() - lastInteraction < idleBeforeRoaming) {
      return;
    }

    const buttons = visibleLandingButtons().filter((button) => button !== lastTarget);

    if (buttons.length === 0) {
      returnHome();
      scheduleIdleAnimation(1600);
    } else {
      const target = buttons[Math.floor(Math.random() * buttons.length)];

      const targetBox = target.getBoundingClientRect();

      const homeBox = companion.getBoundingClientRect();

      const currentX = Number.parseFloat(getComputedStyle(companion).getPropertyValue("--ai-shift-x")) || 0;

      const currentY = Number.parseFloat(getComputedStyle(companion).getPropertyValue("--ai-shift-y")) || 0;

      const baseLeft = homeBox.left - currentX;

      const baseTop = homeBox.top - currentY;

      const avatarWidth = companion.offsetWidth;

      const avatarHeight = companion.offsetHeight;

      const desiredLeft = targetBox.left + targetBox.width / 2 - avatarWidth / 2;

      const desiredTop = targetBox.top - avatarHeight + landingOverlap;

      const safeLeft = Math.min(window.innerWidth - avatarWidth - 10, Math.max(10, desiredLeft));

      const safeTop = Math.min(window.innerHeight - avatarHeight - 82, Math.max(12, desiredTop));

      const travelDistance = Math.hypot(safeLeft - homeBox.left, safeTop - homeBox.top);

      const travelDuration = Math.min(1800, Math.max(720, Math.round(travelDistance * 1.8)));

      clearTimeout(homeTimer);
      clearIdleAnimation();

      companion.classList.add("is-roaming", "is-jumping");

      companion.style.setProperty("--ai-travel-duration", `${travelDuration}ms`);

      companion.style.setProperty("--ai-shift-x", `${safeLeft - baseLeft}px`);

      companion.style.setProperty("--ai-shift-y", `${safeTop - baseTop}px`);

      lastTarget = target;

      window.setTimeout(() => {
        companion.classList.remove("is-jumping");

        scheduleIdleAnimation(1400);
      }, travelDuration + 40);
    }
  }

  function noteInteraction(event) {
    lastInteraction = Date.now();
    lastTarget = null;

    const interactionIsInsideChat = event.target instanceof Element && event.target.closest("#ascendra-ai");

    const chatStillHasFocus = companion.contains(document.activeElement);

    if (interactionIsInsideChat || chatStillHasFocus) {
      clearTimeout(homeTimer);
      clearIdleAnimation();

      companion.classList.remove("is-roaming", "is-jumping");

      homePosition();
      scheduleIdleAnimation(4000);

      return;
    }

    returnHome();
  }

  ["pointerdown", "keydown", "focusin", "wheel", "touchstart"].forEach((eventName) => {
    document.addEventListener(eventName, noteInteraction, { passive: true });
  });

  window.addEventListener("scroll", noteInteraction, { passive: true });

  window.addEventListener("resize", noteInteraction, { passive: true });

  window.visualViewport?.addEventListener("resize", noteInteraction, { passive: true });

  reduceMotion.addEventListener("change", noteInteraction);

  movementTimer = window.setInterval(jumpToButton, roamingInterval);

  scheduleIdleAnimation();

  window.addEventListener(
    "pagehide",
    () => {
      clearInterval(movementTimer);
      clearTimeout(homeTimer);
      clearTimeout(idleAnimationTimer);
      clearTimeout(aiSpeakingTimer);
    },
    { once: true },
  );
}

initializeAscendraAIChat();
initializeAscendraAI();
