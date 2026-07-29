console.log("Ascendra loaded!")
"use strict";
const app = document.getElementById("app");
const backButton = document.getElementById("spaBackButton");
const initializedCleanups = new Map();
let progressionToastTimer = null;
const PASSWORD_ITERATIONS = 600000;
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const PROGRESSION_STORAGE_KEY = "ascendraProgression";
const PROGRESSION_VERSION = 1;
const XP_PER_LEVEL = 100;
const TAB_IDENTITY_PREFIX = "ascendra:tab-identity:";
const TAB_IDENTITY_FIELDS = Object.freeze([
    "loggedInUser",
    "name",
    "surname",
    "username",
    "accountId"
]);
const LEGACY_USER_KEYS = Object.freeze([
    "todos",
    "habits",
    "events",
    "ascendraSettings",
    "ascendra-profile-bio",
    "ascendra-profile-picture",
    "ascendra-streak",
    "ascendra-tasks-completed",
    "ascendra-achievements",
    "ascendraProgression"
]);
const LEGACY_JOURNAL_PREFIX = "journal-";
const XP_REWARDS = Object.freeze({
    task: 10,
    habit: 5,
    miniTool: 10
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
];

const badges = [
    {
        id: "genesis",
        name: "GENESIS",
        description: "Awarded to the first person in the world to use Ascendra.",
        icon: "\u{1F30C}",
        obtained: false,
    },
    {
        id: "coFounder",
        name: "Co-Founder",
        description: "Awarded to someone who helped create and shape Ascendra from the beginning.",
        icon: "\u{1F91D}",
        obtained: false,
    },
    {
        id: "founder",
        name: "Founder",
        description: "Awarded to the creator and lead developer of Ascendra.",
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
    const match = String(value || "").trim().match(
        /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::\d{2})?)?$/
    );
    if (!match) return null;

    const fallbackMatch = String(fallbackTime || "").match(
        /^(\d{1,2}):(\d{2})(?::\d{2})?$/
    );
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
        timeStyle: "short"
    }).format(date);
}

function bytesToBase64(bytes) {
    let binary = "";
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary);
}

function base64ToBytes(value) {
    const binary = atob(value);
    return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function derivePasswordDigest(password, salt, iterations) {
    if (!globalThis.crypto?.subtle) {
        throw new Error("Secure password storage requires HTTPS or localhost.");
    }

    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
    );

    const bits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", hash: "SHA-256", salt, iterations },
        keyMaterial,
        256
    );
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
        digest: bytesToBase64(digest)
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
    return `ascendra:user:${String(username || "").trim().toLowerCase()}`;
}

function createAccountId() {
    if (typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return [...bytes]
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}

function normalizeUsername(username) {
    return String(username || "").trim();
}

function getUsernameValidationMessage(
    username,
    { allowLegacyUsername = "" } = {}
) {
    const normalized = normalizeUsername(username);
    const allowedLegacy = normalizeUsername(allowLegacyUsername);

    if (!normalized) return "Please enter a username.";
    if (
        allowedLegacy &&
        normalized.toLowerCase() === allowedLegacy.toLowerCase()
    ) {
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
        if (
            candidateKey &&
            candidateKey.toLowerCase() === requestedUsernameLower &&
            !legacyKeys.includes(candidateKey)
        ) {
            legacyKeys.push(candidateKey);
        }
    }

    for (const legacyKey of legacyKeys) {
        const legacyAccount = readStoredJson(legacyKey);
        if (
            legacyAccount &&
            !Array.isArray(legacyAccount) &&
            (legacyAccount.credentials || typeof legacyAccount.password === "string")
        ) {
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
        accountId: createAccountId()
    };
    const serializedAccount = JSON.stringify(updatedAccount);

    try {
        localStorage.setItem(accountRecord.key, serializedAccount);
        if (localStorage.getItem(accountRecord.key) !== serializedAccount) {
            throw new Error("Ascendra could not verify this account.");
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
        account: updatedAccount
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
        console.warn("Ascendra could not read this tab's session identity.", error);
    }
    return tabIdentityFallback.has(key) ? tabIdentityFallback.get(key) : null;
}

function writeTabIdentityItem(field, value) {
    const key = tabIdentityStorageKey(field);
    const normalizedValue = value === null || value === undefined
        ? null
        : String(value);

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
        console.warn("Ascendra could not save this tab's session identity.", error);
    }

    if (normalizedValue === null) {
        tabIdentityFallback.delete(key);
    } else {
        tabIdentityFallback.set(key, normalizedValue);
    }
}

function initializeTabIdentity() {
    if (readTabIdentityItem("initialized") === "true") {
        const tabUsername = String(
            readTabIdentityItem("loggedInUser") || ""
        ).trim();
        const tabAccountId = String(
            readTabIdentityItem("accountId") || ""
        );
        const accountRecord = tabUsername
            ? findStoredAccount(tabUsername)
            : null;

        if (
            tabUsername &&
            (
                !tabAccountId ||
                accountRecord?.account?.accountId !== tabAccountId
            )
        ) {
            clearActiveIdentity();
            history.replaceState({ route: "login" }, "", "#/login");
        }
        return;
    }

    let publishedUsername = String(
        localStorage.getItem("loggedInUser") || ""
    ).trim();
    let accountRecord = publishedUsername
        ? findStoredAccount(publishedUsername)
        : null;

    try {
        if (accountRecord) {
            accountRecord = ensureStoredAccountId(accountRecord);
        } else if (publishedUsername) {
            throw new Error("The published account no longer exists.");
        }
    } catch (error) {
        console.warn("Ascendra signed out an unverifiable account.", error);
        TAB_IDENTITY_FIELDS.forEach(field => localStorage.removeItem(field));
        publishedUsername = "";
        accountRecord = null;
    }

    const account = accountRecord?.account || null;

    TAB_IDENTITY_FIELDS.forEach(field => {
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

function setActiveIdentity(
    identity,
    { publish = true, previousUsername = null } = {}
) {
    const username = String(identity?.username || "").trim();
    const loggedInUser = identity?.loggedInUser === null
        ? ""
        : String(identity?.loggedInUser ?? username).trim();
    const values = {
        loggedInUser,
        name: String(identity?.name || ""),
        surname: String(identity?.surname || ""),
        username,
        accountId: String(identity?.accountId || "")
    };

    TAB_IDENTITY_FIELDS.forEach(field => {
        writeTabIdentityItem(field, values[field]);
    });
    writeTabIdentityItem("initialized", "true");

    const sharedUsername = String(
        localStorage.getItem("loggedInUser") || ""
    ).trim().toLowerCase();
    const previousClean = String(previousUsername || "")
        .trim()
        .toLowerCase();
    const canPublish = publish || (
        previousClean
            ? sharedUsername === previousClean
            : sharedUsername === ""
    );

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
        console.warn("Ascendra could not publish this tab's identity.", error);
    }
}

function clearActiveIdentity() {
    const tabUsername = String(
        readTabIdentityItem("loggedInUser") || ""
    ).trim().toLowerCase();
    const tabAccountId = String(
        readTabIdentityItem("accountId") || ""
    );
    const sharedUsername = String(
        localStorage.getItem("loggedInUser") || ""
    ).trim().toLowerCase();
    const sharedAccountId = String(
        localStorage.getItem("accountId") || ""
    );

    TAB_IDENTITY_FIELDS.forEach(field => writeTabIdentityItem(field, null));
    writeTabIdentityItem("initialized", "true");

    if (
        (
            tabUsername &&
            sharedUsername === tabUsername &&
            (!sharedAccountId || sharedAccountId === tabAccountId)
        ) ||
        (!tabUsername && !sharedUsername)
    ) {
        try {
            TAB_IDENTITY_FIELDS.forEach(field => localStorage.removeItem(field));
        } catch (error) {
            console.warn("Ascendra could not clear the published identity.", error);
        }
    }
}

function getLoggedInUsername() {
    return String(
        readTabIdentityItem("loggedInUser") || ""
    ).trim().toLowerCase();
}

initializeTabIdentity();

function userStorageKey(key, username = getLoggedInUsername()) {
    const cleanUsername = String(username || "").trim().toLowerCase();
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

function readUserJson(
    key,
    fallback = null,
    username = getLoggedInUsername()
) {
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
    const items = Array.isArray(value)
        ? value.filter(item => item && typeof item === "object" && !Array.isArray(item))
        : [];

    if (key === "todos" || key === "habits") {
        ensureStableActivityIds(
            items,
            key === "todos" ? "task" : "habit",
            key,
            username
        );
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

    const habitMatch = normalizedEventId.match(
        /^habit:([^:]{1,240}):(\d{4}-\d{2}-\d{2})$/
    );
    if (habitMatch && parseLocalDateTime(habitMatch[2])) {
        return XP_REWARDS.habit;
    }

    if (
        MINI_TOOL_IDS.some(
            toolId => normalizedEventId === `minitool:${toolId}`
        )
    ) {
        return XP_REWARDS.miniTool;
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
        badges: {}
    };
}

function normalizeProgressionState(value) {
    const state = createEmptyProgressionState();
    if (!isPlainRecord(value)) return state;

    if (isPlainRecord(value.rewardedEvents)) {
        Object.entries(value.rewardedEvents).forEach(([eventId, storedReward]) => {
            const xp = getRewardXp(eventId);
            if (!xp) return;

            const awardedAt = normalizeStoredTimestamp(
                isPlainRecord(storedReward)
                    ? storedReward.awardedAt
                    : storedReward
            );

            state.rewardedEvents[eventId] = {
                xp,
                awardedAt: awardedAt || new Date(0).toISOString()
            };
        });
    }

    const storedAchievements = isPlainRecord(value.achievements)
        ? value.achievements
        : {};

    achievements.forEach(achievement => {
        const stored = isPlainRecord(storedAchievements[achievement.id])
            ? storedAchievements[achievement.id]
            : {};

        const progressValue = Number(stored.progress);
        const progress = Number.isFinite(progressValue)
            ? Math.min(achievement.goal, Math.max(0, progressValue))
            : 0;
        const unlockedAt = normalizeStoredTimestamp(stored.unlockedAt);

        state.achievements[achievement.id] = {
            progress,
            unlocked: stored.unlocked === true || Boolean(unlockedAt),
            unlockedAt
        };
    });

    const storedBadges = isPlainRecord(value.badges)
        ? value.badges
        : {};

    badges.forEach(badge => {
        const stored = isPlainRecord(storedBadges[badge.id])
            ? storedBadges[badge.id]
            : {};

        state.badges[badge.id] = {
            obtained: stored.obtained === true,
            obtainedAt: normalizeStoredTimestamp(stored.obtainedAt)
        };
    });

    return state;
}

function loadProgressionState() {
    return normalizeProgressionState(
        readUserJson(PROGRESSION_STORAGE_KEY, null)
    );
}

function saveProgressionState(state) {
    try {
        setUserItem(
            PROGRESSION_STORAGE_KEY,
            JSON.stringify(normalizeProgressionState(state))
        );
        return true;
    } catch (error) {
        console.warn("Ascendra could not save progression.", error);
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

function ensureStableActivityIds(
    items,
    type,
    storageKey,
    username = getLoggedInUsername()
) {
    const usedIds = new Set();
    const changedItems = [];
    const migrationSeed = Date.now().toString(36);

    items.forEach((item, index) => {
        const existingId = item?.id ?? item?.createdAt;
        const normalizedId = existingId === undefined || existingId === null
            ? ""
            : String(existingId);

        if (normalizedId && !usedIds.has(normalizedId)) {
            usedIds.add(normalizedId);
            return;
        }

        const previousId = item.id;
        const hadOwnId = Object.prototype.hasOwnProperty.call(item, "id");
        const fingerprint = hashProgressIdentifier(JSON.stringify({
            type,
            index,
            name: item?.name || "",
            title: item?.title || item?.text || item?.task || "",
            date: item?.date || "",
            time: item?.time || ""
        }));

        let generatedId = `legacy-${type}-${migrationSeed}-${index}-${fingerprint}`;
        let suffix = 1;
        while (usedIds.has(generatedId)) {
            generatedId =
                `legacy-${type}-${migrationSeed}-${index}-${fingerprint}-${suffix}`;
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
        console.warn(`Ascendra could not migrate legacy ${storageKey}.`, error);
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
        awardedAt: awardedAt.toISOString()
    };

    return true;
}

function addExistingActivityRewards(state) {
    let xpAwarded = 0;
    const todos = getUserArray("todos");
    const habits = getUserArray("habits");

    todos.forEach(todo => {
        if (!isTodoCompleted(todo)) return;

        const taskId = getActivityIdentifier(todo);
        if (!taskId) return;
        const eventId = `task:${taskId}`;

        if (grantProgressReward(state, eventId)) {
            xpAwarded += getRewardXp(eventId);
        }
    });

    habits.forEach(habit => {
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

    eventIds.forEach(eventId => {
        if (eventId.startsWith("task:")) {
            tasksCompleted++;
        } else if (eventId.startsWith("habit:")) {
            habitsCompleted++;
        } else if (eventId.startsWith("minitool:")) {
            miniTools.add(eventId);
        }
    });

    return {
        tasksCompleted,
        habitsCompleted,
        miniToolsUsed: miniTools.size,
        noZeroDaysStreak: 0
    };
}

function reconcileAchievementState(state) {
    const statistics = getProgressionStatistics(state);
    const newlyUnlocked = [];
    let unlockOffset = 0;

    achievements.forEach(achievement => {
        const existing = isPlainRecord(state.achievements?.[achievement.id])
            ? state.achievements[achievement.id]
            : {};

        let progress = 0;
        if (achievement.id !== "noZeroDays") {
            if (achievement.eventId) {
                progress = Object.prototype.hasOwnProperty.call(
                    state.rewardedEvents,
                    achievement.eventId
                ) ? 1 : 0;
            } else {
                progress = Number(statistics[achievement.stat] || 0);
            }
        }

        progress = Math.min(
            achievement.goal,
            Math.max(0, Number.isFinite(progress) ? progress : 0)
        );

        if (achievement.id === "noZeroDays") {
            state.achievements[achievement.id] = {
                progress: 0,
                unlocked: false,
                unlockedAt: null
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
            unlockedAt: shouldUnlock ? unlockedAt : null
        };
    });

    return newlyUnlocked;
}

function reconcileBadgeState(state) {
    const normalizedName = String(
        getActiveIdentityItem("name") || ""
    ).trim().toLowerCase();

    badges.forEach(badge => {
        const existing = isPlainRecord(state.badges?.[badge.id])
            ? state.badges[badge.id]
            : {};

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
            obtainedAt: obtained
                ? normalizeStoredTimestamp(existing.obtainedAt) ||
                    new Date().toISOString()
                : null
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
            saved: false
        };
    }

    return {
        state,
        newlyUnlocked,
        xpAwarded,
        saved
    };
}

function recordMiniToolUse(toolId) {
    if (!MINI_TOOL_IDS.includes(toolId)) {
        return {
            state: loadProgressionState(),
            newlyUnlocked: [],
            xpAwarded: 0,
            saved: false
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
            saved: false
        };
    }

    return {
        state,
        newlyUnlocked: newlyUnlocked.filter(
            achievement => achievement.category === "miniTools"
        ),
        xpAwarded: awarded && saved ? getRewardXp(eventId) : 0,
        saved
    };
}

function getTotalXp(state) {
    return Object.keys(state.rewardedEvents || {}).reduce(
        (total, eventId) => total + getRewardXp(eventId),
        0
    );
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
        percent: Math.min(100, (currentLevelXp / XP_PER_LEVEL) * 100)
    };
}

function getUnlockedAchievements(state) {
    return achievements.filter(
        achievement => state.achievements?.[achievement.id]?.unlocked === true
    );
}

function getLatestUnlockedAchievement(state) {
    return getUnlockedAchievements(state)
        .map(achievement => ({
            definition: achievement,
            unlockedAt:
                normalizeStoredTimestamp(
                    state.achievements[achievement.id].unlockedAt
                ) || new Date(0).toISOString()
        }))
        .sort((first, second) => {
            return Date.parse(second.unlockedAt) - Date.parse(first.unlockedAt);
        })[0] || null;
}

function setProgressText(selector, value) {
    document.querySelectorAll(selector).forEach(element => {
        element.textContent = String(value);
    });
}

function renderProgressionSummary(state) {
    const levelProgress = getLevelProgress(getTotalXp(state));
    const unlockedCount = getUnlockedAchievements(state).length;
    const miniToolAchievements = achievements.filter(
        achievement => achievement.category === "miniTools"
    );
    const unlockedMiniTools = miniToolAchievements.filter(
        achievement => state.achievements?.[achievement.id]?.unlocked === true
    ).length;

    setProgressText("[data-xp-total]", `${levelProgress.totalXp} XP`);
    setProgressText("[data-xp-number]", levelProgress.totalXp);
    setProgressText("[data-xp-level]", levelProgress.level);
    setProgressText("[data-xp-level-start]", `${levelProgress.levelStartXp} XP`);
    setProgressText("[data-xp-level-end]", `${levelProgress.nextLevelXp} XP`);
    setProgressText(
        "[data-xp-message]",
        `${levelProgress.remainingXp} XP to Level ${levelProgress.level + 1}`
    );
    setProgressText("[data-achievement-count]", unlockedCount);
    setProgressText(
        "[data-mini-tools-achievement-count]",
        `${unlockedMiniTools} / ${miniToolAchievements.length}`
    );

    document.querySelectorAll("[data-xp-progress-fill]").forEach(fill => {
        fill.style.width = `${levelProgress.percent}%`;
    });

    document.querySelectorAll("[data-xp-progress]").forEach(progress => {
        progress.setAttribute("aria-valuemin", "0");
        progress.setAttribute("aria-valuemax", String(XP_PER_LEVEL));
        progress.setAttribute(
            "aria-valuenow",
            String(levelProgress.currentLevelXp)
        );
        progress.setAttribute(
            "aria-valuetext",
            `${levelProgress.currentLevelXp} of ${XP_PER_LEVEL} XP toward Level ${levelProgress.level + 1}`
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
        description.textContent =
            "Complete a task, habit, or Mini Tool to unlock your first achievement.";
        if (date) date.textContent = "No achievements unlocked yet";
        return;
    }

    icon.textContent = latest.definition.icon || "\u{1F3C6}";
    title.textContent = latest.definition.name;
    description.textContent = latest.definition.description;

    if (date) {
        date.textContent = `Unlocked ${new Date(
            latest.unlockedAt
        ).toLocaleDateString()}`;
    }
}

function createAchievementCard(achievement, state) {
    const achievementState = state.achievements[achievement.id] || {
        progress: 0,
        unlocked: false,
        unlockedAt: null
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
    status.textContent = achievementState.unlocked
        ? "Unlocked"
        : `${achievementState.progress} / ${achievement.goal}`;

    const progress = document.createElement("div");
    progress.className = "achievement-progress-track";
    progress.setAttribute("role", "progressbar");
    progress.setAttribute(
        "aria-label",
        `${achievement.name} achievement progress`
    );
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", String(achievement.goal));
    progress.setAttribute(
        "aria-valuenow",
        String(achievementState.progress)
    );

    const fill = document.createElement("div");
    fill.style.width =
        `${Math.min(100, (achievementState.progress / achievement.goal) * 100)}%`;
    progress.appendChild(fill);

    content.append(heading, description, status, progress);

    if (achievementState.unlockedAt) {
        const unlockedDate = document.createElement("span");
        unlockedDate.className = "progress-achievement-date";
        unlockedDate.textContent =
            `Unlocked ${new Date(
                achievementState.unlockedAt
            ).toLocaleDateString()}`;
        content.appendChild(unlockedDate);
    }

    item.append(icon, content);
    return item;
}

function renderAchievementCollection(state) {
    const container = document.getElementById("achievement-list");
    if (!container) return;

    const fragment = document.createDocumentFragment();
    achievements.forEach(achievement => {
        fragment.appendChild(createAchievementCard(achievement, state));
    });
    container.replaceChildren(fragment);
}

function renderBadgeCollection(state) {
    const container = document.getElementById("badge-list");
    if (!container) return;

    const fragment = document.createDocumentFragment();

    badges.forEach(badge => {
        const badgeState = state.badges[badge.id] || {
            obtained: false,
            obtainedAt: null
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

    const unlockedNames = progression.newlyUnlocked
        .map(achievement => achievement.name)
        .join(" and ");
    const unlockText = unlockedNames
        ? ` \u2022 Unlocked: ${unlockedNames}`
        : "";

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
    return (
        todo?.completed === true ||
        todo?.completed === "true" ||
        todo?.done === true ||
        todo?.done === "true"
    );
}

function getHabitHistory(habit) {
    const history = habit?.history;
    return history && typeof history === "object" && !Array.isArray(history)
        ? history
        : {};
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

const date = new Date(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    fromDate.getDate()
);

let streak = 0;
let inspectedDays = 0;
const startingDateKey = formatLocalDate(date);

while (inspectedDays < 3660) {
    if (isHabitScheduledForDate(habit, date)) {
        const dateKey = formatLocalDate(date);
        const result = history[dateKey];

        if (result === true) {
            streak++;
        } else if (
            dateKey === startingDateKey &&
            result === undefined
        ) {
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
    const cleanUsername = String(username || "").trim().toLowerCase();
    if (!cleanUsername) return [];

    const prefix = `ascendra:data:${cleanUsername}:`;
    return collectStorageEntries(prefix).filter(entry => {
        const suffix = entry.key.slice(prefix.length);
        return LEGACY_USER_KEYS.includes(suffix) ||
            /^journal-\d{4}-\d{1,2}-\d{1,2}$/.test(suffix);
    });
}

function hasUserDataNamespace(username) {
    return collectUserDataEntries(username).length > 0;
}

function activeAccountMatchesIdentity(username = getLoggedInUsername()) {
    const cleanUsername = String(username || "").trim().toLowerCase();
    if (!cleanUsername) return true;

    const accountId = getActiveIdentityItem("accountId");
    const accountRecord = findStoredAccount(cleanUsername);
    return Boolean(
        accountId &&
        accountRecord?.account?.accountId === accountId
    );
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
    const cleanUsername = String(username || "").trim().toLowerCase();
    const activeUsername = getLoggedInUsername();
    if (
        cleanUsername &&
        cleanUsername === activeUsername &&
        !activeAccountMatchesIdentity(activeUsername)
    ) {
        invalidateMissingActiveAccount();
        return false;
    }
    return true;
}

function assertActiveAccountForWrite(username) {
    if (!ensureActiveAccountAccess(username)) {
        throw new Error(
            "Ascendra stopped a save because this account changed in another tab."
        );
    }
}

function copyStorageEntries(entries, getTargetKey, collisionMessage) {
    const plan = entries.map(entry => ({
        ...entry,
        targetKey: getTargetKey(entry.key)
    }));

    plan.forEach(entry => {
        const existingValue = localStorage.getItem(entry.targetKey);
        if (existingValue !== null && existingValue !== entry.value) {
            throw new Error(collisionMessage);
        }
    });

    const writtenEntries = [];
    try {
        plan.forEach(entry => {
            if (localStorage.getItem(entry.targetKey) === null) {
                localStorage.setItem(entry.targetKey, entry.value);
                writtenEntries.push(entry);
            }
            if (localStorage.getItem(entry.targetKey) !== entry.value) {
                throw new Error("Ascendra could not verify copied data.");
            }
        });
    } catch (error) {
        writtenEntries.forEach(entry => {
            if (localStorage.getItem(entry.targetKey) === entry.value) {
                localStorage.removeItem(entry.targetKey);
            }
        });
        throw error;
    }

    return { plan, writtenEntries };
}

function rollbackCopiedStorageEntries(writtenEntries) {
    writtenEntries.forEach(entry => {
        if (localStorage.getItem(entry.targetKey) === entry.value) {
            localStorage.removeItem(entry.targetKey);
        }
    });
}

function renameStoredAccountAndData(
    accountRecord,
    updatedAccount,
    oldUsername,
    newUsername
) {
    const oldClean = String(oldUsername || "").trim().toLowerCase();
    const newClean = String(newUsername || "").trim().toLowerCase();
    const oldAccountKey = accountRecord.key;
    const newAccountKey = accountStorageKey(newClean);

    if (oldClean === newClean || oldAccountKey === newAccountKey) {
        const previousValue = localStorage.getItem(oldAccountKey);
        const serializedAccount = JSON.stringify(updatedAccount);
        try {
            localStorage.setItem(oldAccountKey, serializedAccount);
            if (localStorage.getItem(oldAccountKey) !== serializedAccount) {
                throw new Error("Ascendra could not verify the updated account.");
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
            oldKey => newPrefix + oldKey.slice(oldPrefix.length),
            "Saved data already exists for that username."
        );
        const serializedAccount = JSON.stringify(updatedAccount);
        localStorage.setItem(newAccountKey, serializedAccount);
        wroteNewAccount = true;
        if (localStorage.getItem(newAccountKey) !== serializedAccount) {
            throw new Error("Ascendra could not verify the renamed account.");
        }
    } catch (error) {
        rollbackCopiedStorageEntries(copied.writtenEntries);
        if (wroteNewAccount) localStorage.removeItem(newAccountKey);
        throw error;
    }

    copied.plan.forEach(entry => localStorage.removeItem(entry.key));
    localStorage.removeItem(oldAccountKey);

    const ownerKey = "ascendra:legacy-data-owner";
    if (String(localStorage.getItem(ownerKey) || "").toLowerCase() === oldClean) {
        localStorage.setItem(ownerKey, newClean);
    }
}

function transferGuestDataToUser(username) {
    const cleanUsername = String(username || "").trim().toLowerCase();
    if (!cleanUsername) return 0;

    const guestPrefix = "ascendra:guest:";
    const userPrefix = `ascendra:data:${cleanUsername}:`;
    const entries = collectStorageEntries(guestPrefix);
    const copied = copyStorageEntries(
        entries,
        guestKey => userPrefix + guestKey.slice(guestPrefix.length),
        "Saved account data already exists for that username."
    );
    copied.plan.forEach(entry => localStorage.removeItem(entry.key));
    return entries.length;
}

function getLegacyStorageEntries() {
    const entries = [];
    LEGACY_USER_KEYS.forEach(key => {
        const value = localStorage.getItem(key);
        if (value !== null) entries.push({ key, value });
    });

    collectStorageEntries(LEGACY_JOURNAL_PREFIX).forEach(entry => {
        if (!entries.some(savedEntry => savedEntry.key === entry.key)) {
            entries.push(entry);
        }
    });
    return entries;
}

function deleteOwnedLegacyData(username) {
    const cleanUsername = String(username || "").trim().toLowerCase();
    const ownerKey = "ascendra:legacy-data-owner";
    const owner = String(localStorage.getItem(ownerKey) || "")
        .trim()
        .toLowerCase();
    const ownsLegacyData = cleanUsername
        ? owner === cleanUsername
        : owner === "";

    if (!ownsLegacyData) return;
    getLegacyStorageEntries().forEach(entry => {
        localStorage.removeItem(entry.key);
    });
    localStorage.removeItem(ownerKey);
}

function deleteCurrentAccountData() {
    const username = getLoggedInUsername();
    if (username) assertActiveAccountForWrite(username);
    const dataEntries = username
        ? collectUserDataEntries(username)
        : collectStorageEntries("ascendra:guest:");

    dataEntries.forEach(entry => {
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
    const cleanUsername = String(username || "").trim().toLowerCase();
    if (!cleanUsername) return false;

    const ownerKey = "ascendra:legacy-data-owner";
    const existingOwner = String(localStorage.getItem(ownerKey) || "")
        .trim()
        .toLowerCase();
    if (existingOwner && existingOwner !== cleanUsername) return false;

    const entries = getLegacyStorageEntries();
    const missingEntries = entries.filter(entry => {
        return localStorage.getItem(userStorageKey(entry.key, cleanUsername)) === null;
    });
    let copied = { writtenEntries: [] };

    try {
        copied = copyStorageEntries(
            missingEntries,
            oldKey => userStorageKey(oldKey, cleanUsername),
            "Ascendra could not safely migrate legacy data."
        );
        localStorage.setItem(ownerKey, cleanUsername);
        if (
            String(localStorage.getItem(ownerKey) || "").trim().toLowerCase() !==
            cleanUsername
        ) {
            throw new Error("Ascendra could not verify the legacy data owner.");
        }
    } catch (error) {
        rollbackCopiedStorageEntries(copied.writtenEntries);
        console.warn("Ascendra could not migrate legacy data.", error);
        return false;
    }

    entries.forEach(entry => localStorage.removeItem(entry.key));
    return true;
}

function createModalController(dialog, initialFocus, options = {}) {
    const focusableSelector = [
        "a[href]",
        "button:not([disabled])",
        "input:not([disabled]):not([type='hidden'])",
        "select:not([disabled])",
        "textarea:not([disabled])",
        "[tabindex]:not([tabindex='-1'])"
    ].join(",");
    let previousFocus = null;

    function getFocusableElements() {
        return [...dialog.querySelectorAll(focusableSelector)]
            .filter(element => element.getClientRects().length > 0);
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

localStorage.removeItem("password");

function normalizeRoute(value) {
    let route = String(value || "welcome").replace(/^#\/?/, "").replace(/\.html$/, "");
    if (route === "index" || route === "") route = "welcome";
    if (route === "alert") route = "alerts";
    return document.getElementById("page-" + route) ? route : "welcome";
}
function getRoute(){ return normalizeRoute(location.hash); }
function canonicalRouteHash(route) {
    return "#/" + normalizeRoute(route);
}
function navigate(route, replace=false){
    route=normalizeRoute(route);
    const hash=canonicalRouteHash(route);
    if(replace) history.replaceState({route},"",hash);
    else if(location.hash!==hash) history.pushState({route},"",hash);
    renderRoute(route);
}
function goBack(){
    if(history.length>1){ history.back(); }
    else { navigate(getRoute()==="login"||getRoute()==="signup"?"welcome":"home",true); }
}
window.navigate=navigate;
window.goTo=function(page){ navigate(page); };
window.goBack=goBack;
window.addEventListener("storage", function handleAccountStorageChange() {
    invalidateMissingActiveAccount();
});
window.addEventListener("focus", function handleAccountWindowFocus() {
    invalidateMissingActiveAccount();
});
document.addEventListener("visibilitychange", function handleAccountVisibility() {
    if (!document.hidden) invalidateMissingActiveAccount();
});

function getSavedSettings(){
    const defaults={accentColor:"purple",lightMode:true};
    const saved=readUserJson("ascendraSettings",null);
    return saved && typeof saved==="object" && !Array.isArray(saved)
        ? {...defaults,...saved}
        : defaults;
}

function applySavedSettings(){
    const colors={purple:"rgb(127, 0, 255)",blue:"rgb(37, 99, 235)",green:"rgb(21, 128, 61)",pink:"rgb(219, 39, 119)"};
    const settings=getSavedSettings();
    const darkModeEnabled=settings.lightMode===false;
    document.documentElement.style.setProperty("--accent",colors[settings.accentColor]||colors.purple);
    document.documentElement.style.setProperty("--bg",darkModeEnabled?"#17131f":"#f6f3ff");
    document.documentElement.style.setProperty("--card",darkModeEnabled?"#241d30":"white");
    document.documentElement.style.setProperty("--text",darkModeEnabled?"#f5f5f5":"#222");
    document.documentElement.style.setProperty("--muted",darkModeEnabled?"#cbd5e1":"#666");
    document.body.classList.toggle("dark-mode",darkModeEnabled);

    const modeToggle=document.getElementById("mode");
    if(modeToggle) modeToggle.checked=darkModeEnabled;
}

function clearWindowRouteFunction(name, routeFunction) {
    if (window[name] === routeFunction) {
        delete window[name];
    }
}

function renderRoute(route, { focusRoute = true } = {}){
    route=normalizeRoute(route);
    if (route !== "login" && invalidateMissingActiveAccount()) return;
    const template=document.getElementById("page-"+route);
    if(!template){ app.innerHTML='<div class="spa-error" role="main"><h1>Page not found</h1></div>'; return; }
    // stop route-owned intervals/animations when possible by replacing the DOM and calling cleanup
    const old=app.dataset.route;
    if(old && initializedCleanups.has(old)){
        try{ initializedCleanups.get(old)(); }catch(e){ console.warn(e); }
        initializedCleanups.delete(old);
    }
    app.innerHTML='';
    const page=document.createElement('section');
    page.className='ascendra-page';
    page.dataset.route=route;
    page.tabIndex=-1;
    page.appendChild(template.content.cloneNode(true));
    if(!page.querySelector('main')) page.setAttribute('role','main');
    app.appendChild(page);
    app.dataset.route=route;
    document.title='Ascendra - '+route.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
    backButton.hidden=(route==='welcome');
    applySavedSettings();
    page.querySelectorAll(".navbar").forEach(navbar => {
        if (navbar.tagName !== "NAV") {
            navbar.setAttribute("role", "navigation");
        }
        if (!navbar.hasAttribute("aria-label")) {
            navbar.setAttribute("aria-label", "Primary navigation");
        }
        navbar.querySelectorAll(".current").forEach(item => {
            item.setAttribute("aria-current", "page");
        });
    });
    try{
        const cleanup=(ROUTE_INITIALIZERS[route]||function(){})();
        if(typeof cleanup==='function') initializedCleanups.set(route,cleanup);
    }catch(error){
        console.error('Ascendra page error on '+route+':',error);
        const box=document.createElement('div'); box.className='spa-error';
        box.innerHTML='<h2>This page hit an error</h2><p>Open DevTools Console for the exact line.</p>';
        page.prepend(box);
    }
    if (focusRoute) {
        page.focus({preventScroll:true});
    }
    window.scrollTo(0,0);
}
function handleLocationChange(){
    const route=getRoute();
    const canonicalHash=canonicalRouteHash(route);
    if(location.hash!==canonicalHash){
        history.replaceState({route},"",canonicalHash);
    }
    if(app.dataset.route!==route) renderRoute(route);
}
window.addEventListener('popstate',handleLocationChange);
window.addEventListener('hashchange',handleLocationChange);
document.addEventListener('click',function(e){
    if(
        e.defaultPrevented ||
        e.button!==0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
    ) return;
    const a=e.target.closest('a[href^="#/"]');
    if(
        !a ||
        a.hasAttribute("download") ||
        (a.target && a.target.toLowerCase()!=="_self")
    ) return;
    e.preventDefault();
    navigate(a.getAttribute('href'));
});

const ROUTE_INITIALIZERS = {
"welcome": function init_welcome(){


},
"loading-screen": function init_loading_screen(){
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const reduceLoadingMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
).matches;

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
            color: Math.random() < 0.85
                ? "white"
                : "rgb(242,241,153)"
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

    const sceneScale = Math.min(1, viewportWidth * 0.9 / 400, viewportHeight * 0.9 / 400);
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
"login": function init_login(){
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
    const recordSnapshot = record
        ? localStorage.getItem(record.key)
        : null;

    function accountChangedDuringLogin() {
        return Boolean(
            record &&
            localStorage.getItem(record.key) !== recordSnapshot
        );
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
            needsMigration = passwordMatches && (
                savedUser.credentials.iterations < PASSWORD_ITERATIONS ||
                typeof savedUser.password === "string"
            );
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
            const credentials = needsMigration
                ? await createPasswordCredentials(password)
                : savedUser.credentials;
            if (!loginActive) return;
            if (accountChangedDuringLogin()) {
                alert("That account changed. Please try logging in again.");
                return;
            }
            savedUser = {
                ...savedUser,
                username: savedUser.username || username,
                accountId: savedUser.accountId || createAccountId(),
                credentials
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
            accountId: savedUser.accountId
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
"signup": function init_signup(){
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

    const usernameValidationMessage =
        getUsernameValidationMessage(username);
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
            credentials
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
            accountId: user.accountId
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
"home": function init_home(){
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
        year: "numeric"
    });
}

// ===========================
// Motivational Message
// ===========================

const messages = [
    { text1: "Cristiano Ronaldo - 'Talent without working hard is nothing.'" },
    { text2: "Audrey Hepburn - \"Nothing is impossible. The word itself even says I'm possible!\"" },
    { text3: "孔丘 - 'It doesn't matter how slow you go, as long as you never stop'" },
    { text4: "Thomas Edison - 'Many of life's failures are people who did not realize how close they were to success when they gave up.'"},
    { text5: "Nelson Mandela - 'It always seems impossible until it's done.'"},
    { text6: "Wayne Gretzky - 'You miss 100% of the shots you don't take.'"},
    { text7: "Vincent Van Gogh - 'Great things are done by a series of small things brought together'"},
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
const todayTodos = todos.filter(todo => todo.date === todayDateKey);
const scheduledHabits = habits.filter(habit => {
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

    const activeTodos = todayTodos
        .filter(todo => !isTodoCompleted(todo))
        .slice(0, 5);

    if (activeTodos.length === 0) {
        todoList.innerHTML = "<li>No to-dos due today 🎉</li>";
    } else {
        activeTodos.forEach(todo => {
            const li = document.createElement("li");

            li.textContent = todo.date
                ? `${todo.task} — ${todo.date}`
                : `${todo.task} — No due date`;

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
        .filter(event => {
            const date = eventDateTime(event);
            return date && date.getTime() >= now.getTime();
        })
        .sort((a, b) => {
            const dateA = eventDateTime(a);
            const dateB = eventDateTime(b);
            return (dateA?.getTime() ?? Number.POSITIVE_INFINITY) -
                (dateB?.getTime() ?? Number.POSITIVE_INFINITY);
        })
        .slice(0, 3);

    if (nextEvents.length === 0) {

        calendarList.innerHTML = "<li>No upcoming events</li>";

    } else {

        nextEvents.forEach(event => {

            const li = document.createElement("li");

            li.textContent =
                `${formatEventDateTime(event)} — ${event.title || event.name || "Event"}`;

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

        habits.slice(0, 5).forEach(habit => {

            const li = document.createElement("li");

            li.textContent =
                `${habit.type === "bad" ? "⚠️" : "✅"} ${habit.name}`;

            habitList.appendChild(li);

        });

    }

}

// ===========================
// Progress
// ===========================

let totalItems = todayTodos.length + scheduledHabits.length;
let completedItems = 0;

todayTodos.forEach(todo => {
    if (isTodoCompleted(todo)) completedItems++;
});

scheduledHabits.forEach(habit => {
    if (getHabitHistory(habit)[todayDateKey] === true) {
        completedItems++;
    }
});

const progress = totalItems > 0
    ? Math.round((completedItems / totalItems) * 100)
    : 0;

if (progressFill && progressText) {
    progressFill.style.width = progress + "%";
    progressText.textContent = progress + "% complete";
    const progressBar = progressFill.closest(".progress-bar");
    if (progressBar) {
        progressBar.setAttribute("role", "progressbar");
        progressBar.setAttribute("aria-valuemin", "0");
        progressBar.setAttribute("aria-valuemax", "100");
        progressBar.setAttribute("aria-valuenow", String(progress));
        progressBar.setAttribute(
            "aria-valuetext",
            `${completedItems} of ${totalItems} items complete (${progress}%)`
        );
    }
}

// ===========================
// Shooting Star
// ===========================

const starContainer = document.getElementById("shootingStars");
const reduceHomeMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
).matches;

function createStar(){

    if(!starContainer) return;

    const star = document.createElement("div");
    star.className = "star";

    // Start on the RIGHT side of the hero
    star.style.left = (starContainer.offsetWidth - 30) + "px";

    // Random height near the top
    star.style.top = (Math.random() * 80 + 20) + "px";

    starContainer.appendChild(star);

    star.addEventListener("animationend", () => {
        star.remove();
    });

}

// Random every 3–7 seconds
let starInterval = null;
if (!reduceHomeMotion) {
    createStar();
    starInterval = setInterval(() => {
        createStar();
    }, Math.random() * 4000 + 3000);
}

return () => {
    if (starInterval !== null) clearInterval(starInterval);
};
},
    
"alerts": function init_alerts() {
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
                className: "status-unavailable"
            };
        }

        if (daysLeft < 0) {
            const overdueDays = Math.abs(daysLeft);

            return {
                text: `🔴 Overdue by ${overdueDays} ${
                    overdueDays === 1 ? "day" : "days"
                }`,
                className: "status-overdue"
            };
        }

        if (daysLeft === 0) {
            const dueDateTime = todo.time
                ? parseLocalDateTime(todo.date, todo.time)
                : null;
            if (dueDateTime && dueDateTime.getTime() < now.getTime()) {
                return {
                    text: "Overdue",
                    className: "status-overdue"
                };
            }
            return {
                text: "🟠 Due Today",
                className: "status-today"
            };
        }

        if (daysLeft === 1) {
            return {
                text: "🟡 Due Tomorrow",
                className: "status-tomorrow"
            };
        }

        return {
            text: `🟢 Due in ${daysLeft} days`,
            className: "status-upcoming"
        };
    }

    function sortAlerts(a, b) {
        const dateDifference =
            dateKeyDayNumber(a.date) - dateKeyDayNumber(b.date);

        if (dateDifference !== 0) {
            return dateDifference;
        }

        return String(a.time || "").localeCompare(
            String(b.time || "")
        );
    }

    function showAlerts() {
        alertList.innerHTML = "";

        // Ignore completed tasks and tasks with no due date.
        const activeAlerts = todos
            .filter(todo => !isTodoCompleted(todo) && todo.date)
            .sort(sortAlerts);

        if (activeAlerts.length === 0) {
            const emptyMessage = document.createElement("p");
            emptyMessage.className = "alert-empty";
            emptyMessage.textContent = "No alerts 🎉";

            alertList.appendChild(emptyMessage);
            return;
        }

        activeAlerts.forEach(todo => {
            const card = document.createElement("article");
            card.classList.add("alert-card");

            const details = document.createElement("div");
            details.classList.add("alert-details");

            const title = document.createElement("h3");
            title.classList.add("alert-title");
            title.textContent = todo.task;

            const dueDate = document.createElement("p");
            dueDate.classList.add("alert-date");

            dueDate.textContent = todo.time
                ? `📅 ${todo.date} at ${todo.time}`
                : `📅 ${todo.date}`;

            const status = getStatus(todo);

            const statusText = document.createElement("p");
            statusText.classList.add(
                "alert-status",
                status.className
            );
            statusText.textContent = status.text;

            const priorityText = document.createElement("p");
            priorityText.classList.add(
                "alert-priority",
                `priority-${todo.priority || "medium"}`
            );
            priorityText.textContent =
                `Priority: ${formatPriority(todo.priority)}`;

            details.append(
                title,
                dueDate,
                statusText,
                priorityText
            );

            if (todo.estimatedMinutes) {
                const estimate = document.createElement("p");
                estimate.classList.add("alert-estimate");
                estimate.textContent =
                    `⏱ Estimated time: ${todo.estimatedMinutes} min`;

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

            completeButton.setAttribute(
                "aria-label",
                `Mark task complete: ${todo.task}`
            );

            completeButton.onclick = () => {
                todo.completed = true;
                saveTodos();
                showAlerts();
            };

            const viewButton = document.createElement("button");
            viewButton.classList.add("alert-view-btn");
            viewButton.type = "button";
            viewButton.textContent = "View To-Do";

            viewButton.onclick = () => {
                navigate("todos");
            };

            actions.append(
                completeButton,
                viewButton
            );

            card.append(
                details,
                actions
            );

            alertList.appendChild(card);
        });
    }

    showAlerts();
},
"todos": function init_todos() {

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
        }
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

        const remaining = todos.filter(todo => !isTodoCompleted(todo)).length;

        todoSummary.textContent =
            `${remaining} ${remaining === 1 ? "task" : "tasks"} remaining`;

        const visibleTodos = todos
            .filter(todo => {
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

            emptyMessage.textContent =
                todos.length === 0
                    ? "No tasks yet"
                    : `No ${activeFilter} tasks`;

            todoList.appendChild(emptyMessage);
            return;
        }

        visibleTodos.forEach(todo => {
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
                estimate.textContent =
                    `Estimated time: ${todo.estimatedMinutes} min`;

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

            completeBtn.setAttribute(
                "aria-label",
                `${isTodoCompleted(todo) ? "Mark incomplete" : "Mark complete"}: ${todo.task}`
            );

            const deleteBtn = document.createElement("button");
            deleteBtn.className = "delete-btn";
            deleteBtn.type = "button";
            deleteBtn.textContent = "Delete";

            deleteBtn.setAttribute(
                "aria-label",
                `Delete task: ${todo.task}`
            );

            completeBtn.onclick = () => {
                todo.completed = !isTodoCompleted(todo);
                saveTodos();
                showTodos();
            };

            deleteBtn.onclick = () => {
                todos = todos.filter(savedTodo => savedTodo.id !== todo.id);
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

    filterButtons.forEach(button => {
        button.onclick = () => {
            activeFilter = button.dataset.filter;

            filterButtons.forEach(item => {
                const selected = item === button;

                item.classList.toggle("active", selected);
                item.setAttribute("aria-pressed", String(selected));
            });

            showTodos();
        };

        button.setAttribute(
            "aria-pressed",
            String(button.dataset.filter === activeFilter)
        );
    });

    todoForm.onsubmit = event => {
        event.preventDefault();

        const task = taskInput.value.trim();
        const noDueDate = noDateInput.checked;
        const date = noDueDate ? null : dateInput.value;
        const time = noDueDate ? null : timeInput.value;
        const priority = priorityInput.value;
        const notes = notesInput.value.trim();

        const estimatedMinutes =
            estimatedInput.value === ""
                ? null
                : Number(estimatedInput.value);

        if (task === "") {
            alert("Add a task name first!");
            return;
        }

        if (!noDueDate && date === "") {
            alert("Choose a due date or select No due date.");
            return;
        }

        if (
            estimatedMinutes !== null &&
            (!Number.isFinite(estimatedMinutes) || estimatedMinutes < 1)
        ) {
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
            completed: false
        });

        saveTodos();
        showTodos();
        modal.close();
    };

    popup.onclick = event => {
        if (event.target === popup) {
            modal.close();
        }
    };

    updateDueDateFields();
    showTodos();

    window.saveTodos = saveTodos;
    window.showTodos = showTodos;

    return () => {
        modal.destroy();
        clearWindowRouteFunction("saveTodos", saveTodos);
        clearWindowRouteFunction("showTodos", showTodos);
    };
},
"habits": function init_habits() {

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
        }
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
            return habit.type === "bad"
                ? "Avoided today ✅"
                : "Completed today ✅";
        }

        if (result === false) {
            return habit.type === "bad"
                ? "Habit happened today ❌"
                : "Missed today ❌";
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

        habits.forEach(habit => {
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

            habitTypeText.textContent =
                habit.type === "bad"
                    ? "Bad habit"
                    : "Good habit";

            const habitFrequencyText = document.createElement("div");
            habitFrequencyText.classList.add("habit-frequency");
            habitFrequencyText.textContent =
                `Frequency: ${getFrequencyText(habit.frequency)}`;

            const habitResult = document.createElement("div");
            habitResult.classList.add("habit-result");
            habitResult.textContent = getHabitResultText(habit);

            const habitStreak = document.createElement("div");
            habitStreak.classList.add("habit-streak");

            const streak = getCurrentStreak(habit);
            habitStreak.textContent =
                `🔥 ${streak} day${streak === 1 ? "" : "s"} streak`;

            leftSide.append(
                habitTitle,
                habitTypeText,
                habitFrequencyText,
                habitResult,
                habitStreak
            );

            if (habit.goal && habit.unit) {
                const goalText = document.createElement("div");
                goalText.classList.add("habit-goal");
                goalText.textContent =
                    `Goal: ${habit.goal} ${habit.unit}`;

                leftSide.appendChild(goalText);
            }

            if (habit.reminder) {
                const reminderText = document.createElement("div");
                reminderText.classList.add("habit-reminder");
                reminderText.textContent =
                    `Reminder: ${habit.reminder}`;

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

            checkButton.setAttribute(
                "aria-label",
                `Mark ${habit.name} successful today`
            );
            checkButton.disabled = !isScheduledToday;

            const xButton = document.createElement("button");
            xButton.classList.add("x-btn");
            xButton.type = "button";
            xButton.textContent = "❌";

            xButton.setAttribute(
                "aria-label",
                `Mark ${habit.name} missed today`
            );
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

            deleteButton.setAttribute(
                "aria-label",
                `Delete habit: ${habit.name}`
            );

            checkButton.onclick = () => {
                saveHabitResult(habit, true);
                showHabits();
            };

            xButton.onclick = () => {
                saveHabitResult(habit, false);
                showHabits();
            };

            deleteButton.onclick = () => {
                habits = habits.filter(savedHabit => {
                    return savedHabit.id !== habit.id;
                });

                saveHabits();
                showHabits();
            };

            rightSide.append(
                checkButton,
                xButton,
                deleteButton
            );

            habitCard.append(
                leftSide,
                rightSide
            );

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
        }
    }
    habitPopup.onclick = event => {
        if (event.target === habitPopup) {
            modal.close();
        }
    };

    habitForm.onsubmit = event => {
        event.preventDefault();

        const name = habitInput.value.trim();
        const emoji = habitEmoji.value.trim();
        const unit = habitUnit.value.trim();
        const notes = habitNotes.value.trim();

        const goal =
            habitGoal.value === ""
                ? null
                : Number(habitGoal.value);

        const reminder =
            noReminderInput && habitReminder && !noReminderInput.checked
                ? habitReminder.value || null
                : null;

        if (name === "") {
            alert("Add a habit name first!");
            return;
        }

        if (
            goal !== null &&
            (!Number.isFinite(goal) || goal < 1)
        ) {
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
            history: {}
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

"breathing": function init_breathing() {
const exercises = {
    box: {
        title: "Box Breathing",
        instructions: "Breathe in for 4, hold for 4, exhale for 4, hold for 4.",
        phases: [
            { text: "Breathe In", time: 4, scale: 1.4 },
            { text: "Hold", time: 4, scale: 1.4 },
            { text: "Exhale", time: 4, scale: 1 },
            { text: "Hold", time: 4, scale: 1 }
        ]
    },

    calm: {
        title: "Calm Breathing",
        instructions: "Breathe in for 5 seconds, then exhale for 5 seconds.",
        phases: [
            { text: "Breathe In", time: 5, scale: 1.4 },
            { text: "Exhale", time: 5, scale: 1 }
        ]
    },

    relax: {
        title: "4-7-8 Breathing",
        instructions: "Breathe in for 4, hold for 7, exhale for 8.",
        phases: [
            { text: "Breathe In", time: 4, scale: 1.4 },
            { text: "Hold", time: 7, scale: 1.4 },
            { text: "Exhale", time: 8, scale: 1 }
        ]
    }
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
return function(){
    try{ stopBreathing(); }catch(e){}
    clearWindowRouteFunction("chooseExercise", chooseExercise);
    clearWindowRouteFunction("runPhase", runPhase);
    clearWindowRouteFunction("startBreathing", startBreathing);
    clearWindowRouteFunction("stopBreathing", stopBreathing);
};
},
"calendar": function init_calendar(){
let today = new Date();
let currentMonth = today.getMonth();
let currentYear = today.getFullYear();

const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
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

const eventPicker = typeof window.flatpickr === "function"
    ? window.flatpickr(eventDateInput, {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        altInput: true,
        altFormat: "F j, Y h:i K",
        minDate: new Date()
    })
    : {
        altInput: null,
        clear() {
            eventDateInput.value = "";
        },
        destroy() {}
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
    }
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

                if (
                    date === today.getDate() &&
                    currentMonth === today.getMonth() &&
                    currentYear === today.getFullYear()
                ) {
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
    events.forEach(event => {
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
                    events = events.filter(e => e.id !== event.id);
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

popup.onclick = event => {
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
        date: dateValue
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
"journal": function init_journal(){
const today = new Date();

const todayDay = today.getDate();
const todayMonth = today.getMonth();
const todayYear = today.getFullYear();
let journalDateKey = formatLocalDate(today);

let currentMonth = todayMonth;
let currentYear = todayYear;
let selectedDay = todayDay;

const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
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

function getEntryKey(day) {
    return `journal-${currentYear}-${currentMonth + 1}-${day}`;
}

function getCurrentDateParts() {
    const currentDate = new Date();
    return {
        day: currentDate.getDate(),
        month: currentDate.getMonth(),
        year: currentDate.getFullYear()
    };
}

function isTodayDate(day) {
    const currentDate = getCurrentDateParts();
    return day === currentDate.day &&
        currentMonth === currentDate.month &&
        currentYear === currentDate.year;
}

function isFutureDate(day) {
    const selectedDate = new Date(currentYear, currentMonth, day);
    const currentDate = getCurrentDateParts();
    const realToday = new Date(
        currentDate.year,
        currentDate.month,
        currentDate.day
    );
    return selectedDate > realToday;
}

function loadEntry(day) {
    selectedDay = day;

    const savedEntry = readUserJson(getEntryKey(day), null);
    const entry =
        savedEntry && typeof savedEntry === "object" && !Array.isArray(savedEntry)
            ? savedEntry
            : null;

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
    statusMessage.textContent = canEdit
        ? ""
        : isFutureDate(day)
            ? "Future entries cannot be edited."
            : "Past entries are read-only.";
}

function buildDateGrid() {
    dateGrid.innerHTML = "";
    monthTitle.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
        const button = document.createElement("button");
        button.textContent = day;
        button.classList.add("date-button");

        if (getUserItem(getEntryKey(day))) {
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
            button.onclick = () => {
                loadEntry(day);
                buildDateGrid();
            };
        }

        dateGrid.appendChild(button);
    }
}

prevMonth.onclick = () => {
    currentMonth--;

    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }

    selectedDay = 1;
    buildDateGrid();
    loadEntry(selectedDay);
};

nextMonth.onclick = () => {
    currentMonth++;

    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }

    selectedDay = 1;
    buildDateGrid();
    loadEntry(selectedDay);
};

saveEntry.onclick = () => {
    if (!isTodayDate(selectedDay)) {
        statusMessage.textContent = isFutureDate(selectedDay)
            ? "Future entries cannot be edited."
            : "Past entries are read-only.";
        return;
    }

    const entry = {
        mood: mood.value,
        day: dayText.value,
        grateful: gratefulText.value,
        learn: learnText.value,
        goal: goalText.value
    };

    setUserItem(getEntryKey(selectedDay), JSON.stringify(entry));

    statusMessage.textContent = "Entry saved!";
    buildDateGrid();
};

function refreshJournalDateRules() {
    const currentDateKey = formatLocalDate();
    if (currentDateKey === journalDateKey) return;
    journalDateKey = currentDateKey;
    buildDateGrid();
    loadEntry(selectedDay);
}

function handleJournalVisibilityChange() {
    if (!document.hidden) refreshJournalDateRules();
}

window.addEventListener("focus", refreshJournalDateRules);
document.addEventListener("visibilitychange", handleJournalVisibilityChange);

buildDateGrid();
loadEntry(selectedDay);

window.buildDateGrid = buildDateGrid;
window.getEntryKey = getEntryKey;
window.isFutureDate = isFutureDate;
window.isTodayDate = isTodayDate;
window.loadEntry = loadEntry;
return () => {
    window.removeEventListener("focus", refreshJournalDateRules);
    document.removeEventListener(
        "visibilitychange",
        handleJournalVisibilityChange
    );
    clearWindowRouteFunction("buildDateGrid", buildDateGrid);
    clearWindowRouteFunction("getEntryKey", getEntryKey);
    clearWindowRouteFunction("isFutureDate", isFutureDate);
    clearWindowRouteFunction("isTodayDate", isTodayDate);
    clearWindowRouteFunction("loadEntry", loadEntry);
};
},
"menu": function init_menu(){
const menuNavigation = document.getElementById("nav");
const buttons = document.querySelectorAll("#nav button");

const compactMenuQuery = window.matchMedia("(max-width: 768px), (max-height: 820px)");
const reduceMenuMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
).matches;

function clearOrbitPositions() {
    buttons.forEach(button => {
        button.style.left = "";
        button.style.top = "";
        button.style.transform = "";
    });
}

let radius = 0;

function updateOrbitRadius() {
    const firstButton = buttons[0];
    radius = firstButton
        ? firstButton.getBoundingClientRect().width * 1.65
        : 0;
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

buttons.forEach(button => {
    button.addEventListener("mouseenter", handleMenuMouseEnter);
    button.addEventListener("mouseleave", handleMenuMouseLeave);
});
menuNavigation.addEventListener("focusin", handleMenuFocusIn);
menuNavigation.addEventListener("focusout", handleMenuFocusOut);

function positionOrbitButtons() {
    buttons.forEach((button, i) => {
        const currentAngle = angle + i * (Math.PI * 2 / buttons.length);
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
    buttons.forEach(button => {
        button.removeEventListener("mouseenter", handleMenuMouseEnter);
        button.removeEventListener("mouseleave", handleMenuMouseLeave);
    });
    menuNavigation.removeEventListener("focusin", handleMenuFocusIn);
    menuNavigation.removeEventListener("focusout", handleMenuFocusOut);
};
},
"settings": function init_settings() {
    const modeToggle=document.getElementById("mode");

    function handleModeChange(){
        const settings=getSavedSettings();
        settings.lightMode=!modeToggle.checked;
        setUserItem("ascendraSettings",JSON.stringify(settings));
        applySavedSettings();
    }

    if(modeToggle){
        modeToggle.checked=getSavedSettings().lightMode===false;
        modeToggle.addEventListener("change",handleModeChange);
    }

    function resetSettings() {
        const confirmReset = confirm(
            "Reset Ascendra settings back to default?"
        );

        if (confirmReset) {
            removeUserItem("ascendraSettings");
            applySavedSettings();
            alert("Settings reset.");
        }
    }

    function deleteAllData() {
        const warning = prompt(
            "Type DELETE to delete all local Ascendra data."
        );

        if (warning === "DELETE") {
            deleteCurrentAccountData();
            alert("This account and its Ascendra data have been deleted.");
            navigate("welcome");
        } else if (warning !== null) {
            alert("Delete cancelled.");
        }
    }

    window.resetSettings = resetSettings;
    window.deleteAllData = deleteAllData;

    return () => {
        if(modeToggle) modeToggle.removeEventListener("change",handleModeChange);
        clearWindowRouteFunction("resetSettings", resetSettings);
        clearWindowRouteFunction("deleteAllData", deleteAllData);
    };
},

"stats": function init_stats(){

    const totalTasksElement =
        document.getElementById("total-tasks");

    const completedTasksElement =
        document.getElementById("completed-tasks");

    const remainingTasksElement =
        document.getElementById("remaining-tasks");

    const taskCompletionRateElement =
        document.getElementById("task-completion-rate");

    const taskProgressLabel =
        document.getElementById("task-progress-label");

    const taskProgressFill =
        document.getElementById("task-progress-fill");

    const taskProgressMessage =
        document.getElementById("task-progress-message");

    const totalHabitsElement =
        document.getElementById("total-habits");

    const successfulHabitDaysElement =
        document.getElementById("successful-habit-days");

    const missedHabitDaysElement =
        document.getElementById("missed-habit-days");

    const habitSuccessRateElement =
        document.getElementById("habit-success-rate");

    const habitProgressLabel =
        document.getElementById("habit-progress-label");

    const habitProgressFill =
        document.getElementById("habit-progress-fill");

    const habitProgressMessage =
        document.getElementById("habit-progress-message");

    const dueTodayElement =
        document.getElementById("due-today");

    const overdueTasksElement =
        document.getElementById("overdue-tasks");

    const futureTasksElement =
        document.getElementById("future-tasks");

    const habitsSuccessfulTodayElement =
        document.getElementById("habits-successful-today");

    const habitsMissedTodayElement =
        document.getElementById("habits-missed-today");

    const habitsUncheckedTodayElement =
        document.getElementById("habits-unchecked-today");

    const achievementIcon =
        document.getElementById("achievement-icon");

    const achievementTitle =
        document.getElementById("achievement-title");

    const achievementDescription =
        document.getElementById("achievement-description");

    const recentTasksContainer =
        document.getElementById("recent-tasks");

    const welcomeMessage =
        document.getElementById("welcome-message");

    function getStoredArray(key) {
        return getUserArray(key);
    }

    function getTodayString() {
        const today = new Date();

        const year = today.getFullYear();

        const month = String(
            today.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            today.getDate()
        ).padStart(2, "0");

        return year + "-" + month + "-" + day;
    }

    function updateWelcomeMessage() {
        const name = getActiveIdentityItem("name");

        if (name) {
            welcomeMessage.textContent =
                "Keep building momentum, " + name + ".";
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

        const remainingTasks =
            totalTasks - completedTasks;

        let completionRate = 0;

        if (totalTasks > 0) {
            completionRate = Math.round(
                completedTasks / totalTasks * 100
            );
        }

        totalTasksElement.textContent =
            totalTasks;

        completedTasksElement.textContent =
            completedTasks;

        remainingTasksElement.textContent =
            remainingTasks;

        taskCompletionRateElement.textContent =
            completionRate + "%";

        taskProgressLabel.textContent =
            completionRate + "%";

        taskProgressFill.style.width =
            completionRate + "%";
        const taskProgressTrack =
            document.getElementById("task-progress-track");
        if (taskProgressTrack) {
            taskProgressTrack.setAttribute("role", "progressbar");
            taskProgressTrack.setAttribute("aria-valuemin", "0");
            taskProgressTrack.setAttribute("aria-valuemax", "100");
            taskProgressTrack.setAttribute("aria-valuenow", String(completionRate));
            taskProgressTrack.setAttribute(
                "aria-valuetext",
                `${completedTasks} of ${totalTasks} tasks complete (${completionRate}%)`
            );
        }

        updateTaskProgressMessage(
            totalTasks,
            completedTasks,
            completionRate
        );

        return completedTasks;
    }

    function updateTaskProgressMessage(
        totalTasks,
        completedTasks,
        completionRate
    ) {
        if (totalTasks === 0) {
            taskProgressMessage.textContent =
                "Add your first task to begin tracking progress.";
        } else if (completionRate === 100) {
            taskProgressMessage.textContent =
                "Every task is complete. Absolute productivity monster.";
        } else if (completionRate >= 75) {
            taskProgressMessage.textContent =
                "You are nearly there. Finish strong.";
        } else if (completionRate >= 50) {
            taskProgressMessage.textContent =
                "More than halfway complete. Nice work.";
        } else if (completedTasks > 0) {
            taskProgressMessage.textContent =
                "Progress is progress. Keep stacking wins.";
        } else {
            taskProgressMessage.textContent =
                "Your tasks are ready when you are.";
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

        dueTodayElement.textContent =
            dueToday;

        overdueTasksElement.textContent =
            overdueTasks;

        futureTasksElement.textContent =
            futureTasks;
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

        const totalCheckIns =
            successfulHabitDays + missedHabitDays;

        let habitSuccessRate = 0;

        if (totalCheckIns > 0) {
            habitSuccessRate = Math.round(
                successfulHabitDays /
                totalCheckIns *
                100
            );
        }

        totalHabitsElement.textContent =
            habits.length;

        successfulHabitDaysElement.textContent =
            successfulHabitDays;

        missedHabitDaysElement.textContent =
            missedHabitDays;

        habitSuccessRateElement.textContent =
            habitSuccessRate + "%";

        habitProgressLabel.textContent =
            habitSuccessRate + "%";

        habitProgressFill.style.width =
            habitSuccessRate + "%";
        const habitProgressTrack =
            document.getElementById("habit-progress-track");
        if (habitProgressTrack) {
            habitProgressTrack.setAttribute("role", "progressbar");
            habitProgressTrack.setAttribute("aria-valuemin", "0");
            habitProgressTrack.setAttribute("aria-valuemax", "100");
            habitProgressTrack.setAttribute("aria-valuenow", String(habitSuccessRate));
            habitProgressTrack.setAttribute(
                "aria-valuetext",
                `${successfulHabitDays} of ${totalCheckIns} scheduled check-ins successful (${habitSuccessRate}%)`
            );
        }

        updateHabitProgressMessage(
            habits.length,
            totalCheckIns,
            habitSuccessRate
        );

        return successfulHabitDays;
    }

    function updateHabitProgressMessage(
        totalHabits,
        totalCheckIns,
        habitSuccessRate
    ) {
        if (totalHabits === 0) {
            habitProgressMessage.textContent =
                "Add your first habit to begin tracking progress.";
        } else if (totalCheckIns === 0) {
            habitProgressMessage.textContent =
                "Check off a habit to begin tracking it.";
        } else if (habitSuccessRate === 100) {
            habitProgressMessage.textContent =
                "Perfect habit record so far. Huge win.";
        } else if (habitSuccessRate >= 75) {
            habitProgressMessage.textContent =
                "Your habits are looking strong.";
        } else if (habitSuccessRate >= 50) {
            habitProgressMessage.textContent =
                "You are building consistency. Keep going.";
        } else {
            habitProgressMessage.textContent =
                "Every new day is another chance.";
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

        habitsSuccessfulTodayElement.textContent =
            successfulToday;

        habitsMissedTodayElement.textContent =
            missedToday;

        habitsUncheckedTodayElement.textContent =
            uncheckedToday;
    }

    function updateAchievements() {
        const progression = syncProgressionFromActivity();
        renderProgressionSummary(progression.state);
        renderLatestAchievement(progression.state);
        return progression.state;
    }

    function displayLatestAchievement(
        state = loadProgressionState()
    ) {
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

        const date = new Date(
            dateString + "T00:00:00"
        );

        return date.toLocaleDateString(
            undefined,
            {
                year: "numeric",
                month: "short",
                day: "numeric"
            }
        );
    }

    function displayRecentTasks(todos) {
        recentTasksContainer.innerHTML = "";

        if (todos.length === 0) {
            const emptyMessage =
                document.createElement("p");

            emptyMessage.classList.add(
                "empty-message"
            );

            emptyMessage.textContent =
                "No tasks yet. Your productivity empire awaits.";

            recentTasksContainer.appendChild(
                emptyMessage
            );

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

        const limitedTasks =
            recentTasks.slice(0, 5).map(entry => entry.todo);

        limitedTasks.forEach(function (todo) {
            const taskRow =
                document.createElement("div");

            taskRow.classList.add(
                "recent-task"
            );

            const taskInfo =
                document.createElement("div");

            taskInfo.classList.add(
                "recent-task-info"
            );

            const taskTitle =
                document.createElement("p");

            taskTitle.classList.add(
                "recent-task-title"
            );

            if (isTodoCompleted(todo)) {
                taskTitle.textContent =
                    "✅ " + todo.task;
            } else {
                taskTitle.textContent =
                    "⬜ " + todo.task;
            }

            const taskDate =
                document.createElement("p");

            taskDate.classList.add(
                "recent-task-date"
            );

            taskDate.textContent =
                "Due: " + formatDate(todo.date);

            const taskStatus =
                document.createElement("span");

            taskStatus.classList.add(
                "task-status"
            );

            if (isTodoCompleted(todo)) {
                taskStatus.classList.add(
                    "completed"
                );

                taskStatus.textContent =
                    "Completed";
            } else {
                taskStatus.classList.add(
                    "pending"
                );

                taskStatus.textContent =
                    "Pending";
            }

            taskInfo.appendChild(taskTitle);
            taskInfo.appendChild(taskDate);

            taskRow.appendChild(taskInfo);
            taskRow.appendChild(taskStatus);

            recentTasksContainer.appendChild(
                taskRow
            );
        });
    }

    function loadStats() {
        const todos =
            getStoredArray("todos");

        const habits =
            getStoredArray("habits");

        updateWelcomeMessage();

        const completedTasks =
            updateTaskStatistics(todos);

        updateTaskDateStatistics(todos);

        const successfulHabitDays =
            updateHabitStatistics(habits);

        updateTodayHabitStatistics(habits);

        updateAchievements();

        displayRecentTasks(todos);
    }

    loadStats();

window.displayRecentTasks = displayRecentTasks;
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
        updateWelcomeMessage
    }).forEach(([name, routeFunction]) => {
        clearWindowRouteFunction(name, routeFunction);
    });
};
},
"achievements": function init_achievements(){
    const progression = syncProgressionFromActivity();
    renderProgressionSummary(progression.state);
    renderAchievementCollection(progression.state);
    renderBadgeCollection(progression.state);
},

"unwind": function init_unwind() {
    const start = document.getElementById("start");
    const elapsed = document.getElementById("elapsed");
    const reset = document.getElementById("reset");
    const pause = document.getElementById("pause");
    const timerDisplay = document.getElementById("timer-display");

    start.addEventListener("click", () => {
        
    })
},
"profile": function init_profile(){

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
    const achievementsNumber =
        document.getElementById("achievements-number");
    let messageTimeout = null;
    let profileActive = true;
    let profileOwner = getLoggedInUsername();

    function loadProfile() {
        const savedName =
            getActiveIdentityItem("name") || "Ascendra";

        const savedSurname =
            getActiveIdentityItem("surname") || "User";

        const savedUsername =
            getActiveIdentityItem("username") || "ascendrauser";

        const savedBio =
            getUserItem("ascendra-profile-bio", profileOwner) ||
            "Becoming better, one day at a time.";

        const savedPicture =
            getUserItem("ascendra-profile-picture", profileOwner);

        nameInput.value = savedName;
        surnameInput.value = savedSurname;
        usernameInput.value = savedUsername;
        bioInput.value = savedBio;

        displayName.textContent =
            savedName + " " + savedSurname;

        displayUsername.textContent =
            "@" + savedUsername;

        displayBio.textContent = savedBio;

        characterCount.textContent =
            savedBio.length + " / 120";

        const todos = getUserArray("todos", profileOwner);
        const habits = getUserArray("habits", profileOwner);
        const completedTasks = todos.filter(isTodoCompleted).length;
        const longestCurrentStreak = habits.reduce((longest, habit) => {
            return Math.max(longest, getHabitCurrentStreak(habit));
        }, 0);
        const progression = syncProgressionFromActivity();

        streakNumber.textContent = String(longestCurrentStreak);
        tasksNumber.textContent = String(completedTasks);
        achievementsNumber.textContent = String(
            getUnlockedAchievements(progression.state).length
        );
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
        const oldUsername =
            getActiveIdentityItem("username") || profileOwner;

        if (name === "") {
            showMessage(
                "Please enter your first name.",
                "error"
            );

            return;
        }

        if (surname === "") {
            showMessage(
                "Please enter your surname.",
                "error"
            );

            return;
        }

        const usernameValidationMessage =
            getUsernameValidationMessage(username, {
                allowLegacyUsername: oldUsername
            });
        if (usernameValidationMessage) {
            showMessage(
                usernameValidationMessage,
                "error"
            );

            return;
        }

        if (
            profileOwner &&
            !activeAccountMatchesIdentity(profileOwner)
        ) {
            invalidateMissingActiveAccount();
            return;
        }

        const accountRecord = profileOwner
            ? findStoredAccount(oldUsername) || findStoredAccount(profileOwner)
            : null;
        const usernameRecord = findStoredAccount(username);

        if (usernameRecord && usernameRecord.key !== accountRecord?.key) {
            showMessage("That username is already in use.", "error");
            return;
        }

        if (
            accountRecord?.legacy &&
            oldUsername.toLowerCase() !== username.toLowerCase()
        ) {
            showMessage("Log in once before changing this legacy username.", "error");
            return;
        }

        if (profileOwner && !accountRecord) {
            showMessage("Account data was not found. Please log in again.", "error");
            return;
        }

        const updatedAccountId = accountRecord?.account?.accountId ||
            getActiveIdentityItem("accountId");

        try {
            if (accountRecord) {
                const updatedUser = {
                    ...accountRecord.account,
                    name,
                    surname,
                    username
                };

                renameStoredAccountAndData(
                    accountRecord,
                    updatedUser,
                    oldUsername,
                    username
                );
            }

            const updatedOwner = accountRecord ? username : "";
            setActiveIdentity({
                loggedInUser: accountRecord ? username : null,
                name,
                surname,
                username,
                accountId: accountRecord ? updatedAccountId : ""
            }, {
                publish: false,
                previousUsername: oldUsername || null
            });
            profileOwner = updatedOwner;

            setUserItem(
                "ascendra-profile-bio",
                bio,
                updatedOwner
            );
            const progression = syncProgressionFromActivity();
            renderProgressionSummary(progression.state);

            displayName.textContent =
                name + " " + surname;

            displayUsername.textContent =
                "@" + username;

            displayBio.textContent =
                bio ||
                "Becoming better, one day at a time.";

            usernameInput.value = username;

            showMessage(
                "Profile saved successfully!",
                "success"
            );
        } catch (error) {
            console.error("Could not safely save the profile:", error);
            showMessage(
                error.message || "Could not safely save your profile.",
                "error"
            );
        }
    }

    function handleBioInput() {
        characterCount.textContent =
            bioInput.value.length + " / 120";
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
        const selectedFile =
            event.target.files[0];

        if (!selectedFile) {
            return;
        }

        if (
            !selectedFile.type.startsWith("image/")
        ) {
            showMessage(
                "Please choose an image file.",
                "error"
            );

            profileUpload.value = "";
            return;
        }

        const pictureOwner = getLoggedInUsername();
        const reader = new FileReader();

        reader.addEventListener(
            "load",
            function () {
                if (
                    !profileActive ||
                    pictureOwner !== getLoggedInUsername()
                ) {
                    return;
                }

                try {
                    setUserItem(
                        "ascendra-profile-picture",
                        reader.result,
                        pictureOwner
                    );
                    profilePicture.src =
                        reader.result;

                    showMessage(
                        "Profile picture updated!",
                        "success"
                    );
                } catch (error) {
                    showMessage(
                        "That image is too large.",
                        "error"
                    );
                }
            }
        );

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
"extras": function init_extras(){


},
"minitools": function init_minitools(){
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

    const unlockedNames = reward.newlyUnlocked
        .map(achievement => achievement.name)
        .join(" and ");
    const unlockMessage = unlockedNames
        ? ` Achievement unlocked \u2014 ${unlockedNames}`
        : " First-use reward earned";

    return `${resultText}${unlockMessage} (+${reward.xpAwarded} XP)`;
}

function flipCoin() {
    const result = Math.random() < 0.5 ? "Heads!" : "Tails!";
    coinOutput.textContent = addMiniToolReward(result, "coin");
}

function rollDie() {
    const result = Math.floor(Math.random() * 6) + 1;
    diceOutput.textContent = addMiniToolReward(
        "You rolled a " + result + ".",
        "dice"
    );
}

function generateRandomNumber() {
    const minimumText = minimumInput.value.trim();
    const maximumText = maximumInput.value.trim();

    if (!minimumText || !maximumText) {
        numberOutput.textContent =
            "Enter both a minimum and maximum number.";
        return;
    }

    const minimum = Number(minimumText);
    const maximum = Number(maximumText);
    const range = maximum - minimum + 1;

    if (
        !Number.isSafeInteger(minimum) ||
        !Number.isSafeInteger(maximum)
    ) {
        numberOutput.textContent =
            "Use whole numbers within the safe number range.";
        return;
    }

    if (minimum > maximum) {
        numberOutput.textContent =
            "The minimum must be less than or equal to the maximum.";
        return;
    }

    if (!Number.isSafeInteger(range) || range < 1) {
        numberOutput.textContent =
            "Choose a smaller range of numbers.";
        return;
    }

    const result =
        Math.floor(Math.random() * range) + minimum;

    numberOutput.textContent = addMiniToolReward(
        "Your random number is " + result + ".",
        "random-number"
    );
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
"privacy": function init_privacy(){


},
"terms": function init_terms(){


},
"about": function init_about(){


},
"credits": function init_credits(){


},
"roadmap": function init_roadmap(){


},
"comingsoon": function init_comingsoon(){


},
"projects": function init_projects(){


}
};

const initialRoute=getRoute();
if(location.hash!==canonicalRouteHash(initialRoute)){
    history.replaceState({route:initialRoute},"",canonicalRouteHash(initialRoute));
}
renderRoute(initialRoute,{focusRoute:false});

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
    { name: "Unwind", route: "unwind"}
];
let searchPreviousFocus = null;

function getSearchElements() {
    return {
        overlay: document.getElementById("searchOverlay"),
        input: document.getElementById("searchInput"),
        results: document.getElementById("searchResults")
    };
}

function openSearch() {
    const { overlay, input } = getSearchElements();
    if (!overlay || !input) {
        console.warn("Search UI is not available on this page.");
        return;
    }

    const activeRouteDialog = app.querySelector(
        '[role="dialog"][aria-hidden="false"], dialog[open], .modal[aria-hidden="false"]'
    );
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

    pages.forEach(function(page) {
        const button = document.createElement("button");
        button.className = "search-result";
        button.textContent = page.name;

        button.addEventListener("click", function() {
            navigate(page.route);
            closeSearch();
        });

        results.appendChild(button);
    });
}

// Event delegation works even if the search UI is inserted later by a route/template.
document.addEventListener("input", function(event) {
    if (event.target.id !== "searchInput") return;

    const searchText = event.target.value.toLowerCase().trim();
    const matches = searchablePages.filter(function(page) {
        return page.name.toLowerCase().includes(searchText);
    });

    showSearchResults(matches);
});

document.addEventListener("keydown", function(event) {
    if ((event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
        return;
    }

    const { overlay } = getSearchElements();
    if (!overlay || overlay.hidden) return;

    if (event.key === "Tab") {
        const focusableElements = [...overlay.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        )].filter(element => !element.hidden);
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

document.addEventListener("click", function(event) {
    const { overlay } = getSearchElements();
    if (
        overlay &&
        (event.target === overlay || event.target.closest("#searchClose"))
    ) {
        closeSearch();
    }
});

window.openSearch = openSearch;
window.closeSearch = closeSearch;


