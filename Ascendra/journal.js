"use strict";

/*
=========================================================
 ASCENDRA JOURNAL — HIGH SECURITY VERSION
=========================================================

Security features:
- AES-256-GCM authenticated encryption
- PBKDF2-SHA-256 key derivation
- 600,000 PBKDF2 iterations
- Cryptographically random salt
- Cryptographically random IV
- Encryption key exists only in memory
- No plaintext journal entries in localStorage
- Strict validation of decrypted data
- Maximum journal field lengths
- Safe DOM manipulation
- Past entries cannot be saved through the normal app
- Future dates cannot be edited
- Corrupted/tampered encrypted data is rejected
- Storage errors are handled
- Versioned encrypted storage format
- Old plaintext journal entries are NOT automatically trusted
=========================================================
*/


/* =====================================================
   SECURITY CONFIGURATION
===================================================== */

const STORAGE_KEY = "ascendra-journal-v2";

const CRYPTO_VERSION = 2;

const PBKDF2_ITERATIONS = 600000;

const SALT_LENGTH = 16;
const IV_LENGTH = 12;

const MAX_FIELD_LENGTH = 5000;

const MAX_PASSPHRASE_LENGTH = 256;


/* =====================================================
   CURRENT DATE
===================================================== */

const today = new Date();

const todayDay = today.getDate();
const todayMonth = today.getMonth();
const todayYear = today.getFullYear();

let currentMonth = todayMonth;
let currentYear = todayYear;
let selectedDay = todayDay;


/* =====================================================
   JOURNAL STATE
===================================================== */

/*
 * The encryption key is deliberately kept ONLY in memory.
 *
 * It is never written to localStorage.
 */
let encryptionKey = null;


/*
 * Journal data exists only in memory while unlocked.
 *
 * Example:
 *
 * {
 *   "2026-9-6": {
 *      mood: "😄 Happy",
 *      day: "...",
 *      grateful: "...",
 *      learn: "...",
 *      goal: "..."
 *   }
 * }
 */
let journalData = {};


/* =====================================================
   MONTH NAMES
===================================================== */

const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];


/* =====================================================
   ALLOWED MOODS
===================================================== */

const allowedMoods = [
    "😄 Happy",
    "🙂 Good",
    "😐 Okay",
    "😔 Sad",
    "😴 Tired"
];


/* =====================================================
   DOM ELEMENTS
===================================================== */

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


/* =====================================================
   BASIC VALIDATION
===================================================== */

function isValidString(value, maxLength = MAX_FIELD_LENGTH) {
    return (
        typeof value === "string" &&
        value.length <= maxLength
    );
}


function sanitizeEntry(entry) {

    if (
        entry === null ||
        typeof entry !== "object" ||
        Array.isArray(entry)
    ) {
        return null;
    }

    if (
        !isValidString(entry.mood, 100) ||
        !isValidString(entry.day) ||
        !isValidString(entry.grateful) ||
        !isValidString(entry.learn) ||
        !isValidString(entry.goal)
    ) {
        return null;
    }

    /*
     * Only predefined moods are accepted.
     */
    if (!allowedMoods.includes(entry.mood)) {
        return null;
    }

    return {
        mood: entry.mood,
        day: entry.day,
        grateful: entry.grateful,
        learn: entry.learn,
        goal: entry.goal
    };
}


/* =====================================================
   DATE KEY
===================================================== */

function getDateKey(day) {

    if (
        !Number.isInteger(currentYear) ||
        !Number.isInteger(currentMonth) ||
        !Number.isInteger(day)
    ) {
        return null;
    }

    if (
        currentMonth < 0 ||
        currentMonth > 11
    ) {
        return null;
    }

    const daysInMonth =
        new Date(
            currentYear,
            currentMonth + 1,
            0
        ).getDate();

    if (
        day < 1 ||
        day > daysInMonth
    ) {
        return null;
    }

    return `${currentYear}-${currentMonth + 1}-${day}`;
}


/* =====================================================
   RANDOM BYTES
===================================================== */

function randomBytes(length) {

    const bytes = new Uint8Array(length);

    crypto.getRandomValues(bytes);

    return bytes;
}


/* =====================================================
   ARRAY BUFFER → BASE64
===================================================== */

function bytesToBase64(bytes) {

    let binary = "";

    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary);
}


/* =====================================================
   BASE64 → UINT8ARRAY
===================================================== */

function base64ToBytes(base64) {

    if (
        typeof base64 !== "string" ||
        base64.length === 0
    ) {
        throw new Error("Invalid encoded data.");
    }

    const binary = atob(base64);

    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
}


/* =====================================================
   UTF-8 ENCODING
===================================================== */

function encodeText(text) {

    return new TextEncoder().encode(text);
}


function decodeText(bytes) {

    return new TextDecoder().decode(bytes);
}


/* =====================================================
   DERIVE ENCRYPTION KEY
===================================================== */

async function deriveEncryptionKey(passphrase, salt) {

    const encodedPassphrase =
        encodeText(passphrase);

    const baseKey =
        await crypto.subtle.importKey(
            "raw",
            encodedPassphrase,
            {
                name: "PBKDF2"
            },
            false,
            ["deriveKey"]
        );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: PBKDF2_ITERATIONS,
            hash: "SHA-256"
        },
        baseKey,
        {
            name: "AES-GCM",
            length: 256
        },
        false,
        [
            "encrypt",
            "decrypt"
        ]
    );
}


/* =====================================================
   ENCRYPT DATA
===================================================== */

async function encryptData(data) {

    if (!encryptionKey) {
        throw new Error("Journal is locked.");
    }

    const plaintext =
        encodeText(JSON.stringify(data));

    /*
     * New random IV every time.
     */
    const iv =
        randomBytes(IV_LENGTH);

    const encrypted =
        await crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv,
                tagLength: 128
            },
            encryptionKey,
            plaintext
        );

    return {
        version: CRYPTO_VERSION,
        iv: bytesToBase64(iv),
        data: bytesToBase64(
            new Uint8Array(encrypted)
        )
    };
}


/* =====================================================
   DECRYPT DATA
===================================================== */

async function decryptData(container) {

    if (!encryptionKey) {
        throw new Error("Journal is locked.");
    }

    if (
        !container ||
        typeof container !== "object" ||
        container.version !== CRYPTO_VERSION ||
        typeof container.iv !== "string" ||
        typeof container.data !== "string"
    ) {
        throw new Error("Invalid journal storage.");
    }

    const iv =
        base64ToBytes(container.iv);

    const encrypted =
        base64ToBytes(container.data);

    if (iv.length !== IV_LENGTH) {
        throw new Error("Invalid encryption IV.");
    }

    const decrypted =
        await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv,
                tagLength: 128
            },
            encryptionKey,
            encrypted
        );

    const text =
        decodeText(
            new Uint8Array(decrypted)
        );

    const parsed =
        JSON.parse(text);

    if (
        parsed === null ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
    ) {
        throw new Error("Invalid journal data.");
    }

    return parsed;
}


/* =====================================================
   CHECK IF ENCRYPTED JOURNAL EXISTS
===================================================== */

function journalExists() {

    try {
        return localStorage.getItem(
            STORAGE_KEY
        ) !== null;
    } catch (error) {

        console.error(
            "Unable to access journal storage.",
            error
        );

        return false;
    }
}


/* =====================================================
   SAVE ENCRYPTED JOURNAL
===================================================== */

async function saveEncryptedJournal() {

    if (!encryptionKey) {
        throw new Error("Journal is locked.");
    }

    const encrypted =
        await encryptData(journalData);

    const serialized =
        JSON.stringify(encrypted);

    /*
     * Protect against unexpectedly enormous data.
     */
    if (serialized.length > 5000000) {
        throw new Error(
            "Journal storage size is too large."
        );
    }

    localStorage.setItem(
        STORAGE_KEY,
        serialized
    );
}


/* =====================================================
   LOAD ENCRYPTED JOURNAL
===================================================== */

async function loadEncryptedJournal() {

    const stored =
        localStorage.getItem(STORAGE_KEY);

    if (!stored) {
        journalData = {};
        return;
    }

    let container;

    try {

        container = JSON.parse(stored);

    } catch (error) {

        throw new Error(
            "The journal storage is corrupted."
        );
    }

    const decrypted =
        await decryptData(container);

    /*
     * Validate every stored entry.
     */
    const validatedData = {};

    for (const key of Object.keys(decrypted)) {

        /*
         * Only accept YYYY-M-D style date keys.
         */
        if (
            !/^\d{4}-\d{1,2}-\d{1,2}$/.test(key)
        ) {
            continue;
        }

        const entry =
            sanitizeEntry(decrypted[key]);

        if (entry) {
            validatedData[key] = entry;
        }
    }

    journalData = validatedData;
}


/* =====================================================
   CREATE NEW JOURNAL
===================================================== */

async function createNewJournal(passphrase) {

    encryptionKey =
        await deriveEncryptionKey(
            passphrase,
            randomBytes(SALT_LENGTH)
        );

    /*
     * The salt must be saved so that the same
     * passphrase can derive the same key later.
     *
     * We therefore need a persistent salt.
     */
    const salt =
        randomBytes(SALT_LENGTH);

    encryptionKey =
        await deriveEncryptionKey(
            passphrase,
            salt
        );

    journalData = {};

    const encrypted =
        await encryptData(journalData);

    const storageObject = {
        version: CRYPTO_VERSION,
        salt: bytesToBase64(salt),
        iv: encrypted.iv,
        data: encrypted.data
    };

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(storageObject)
    );
}


/* =====================================================
   UNLOCK EXISTING JOURNAL
===================================================== */

async function unlockExistingJournal(passphrase) {

    const stored =
        localStorage.getItem(STORAGE_KEY);

    if (!stored) {
        throw new Error("Journal does not exist.");
    }

    let container;

    try {

        container = JSON.parse(stored);

    } catch (error) {

        throw new Error(
            "Journal storage is corrupted."
        );
    }

    if (
        !container ||
        container.version !== CRYPTO_VERSION ||
        typeof container.salt !== "string" ||
        typeof container.iv !== "string" ||
        typeof container.data !== "string"
    ) {
        throw new Error(
            "Invalid journal storage format."
        );
    }

    const salt =
        base64ToBytes(container.salt);

    if (salt.length !== SALT_LENGTH) {
        throw new Error(
            "Invalid encryption salt."
        );
    }

    const candidateKey =
        await deriveEncryptionKey(
            passphrase,
            salt
        );

    /*
     * Temporarily use candidate key.
     */
    encryptionKey = candidateKey;

    try {

        const decrypted =
            await decryptData(container);

        const validatedData = {};

        for (const key of Object.keys(decrypted)) {

            if (
                !/^\d{4}-\d{1,2}-\d{1,2}$/.test(key)
            ) {
                continue;
            }

            const entry =
                sanitizeEntry(decrypted[key]);

            if (entry) {
                validatedData[key] = entry;
            }
        }

        journalData = validatedData;

    } catch (error) {

        /*
         * Wrong password OR tampered data.
         *
         * Do not reveal which one.
         */
        encryptionKey = null;
        journalData = {};

        throw new Error(
            "Unable to unlock journal."
        );
    }
}


/* =====================================================
   INITIALIZE SECURITY
===================================================== */

async function initializeJournalSecurity() {

    /*
     * Check browser crypto support.
     */
    if (
        !window.crypto ||
        !window.crypto.subtle
    ) {
        alert(
            "Your browser does not support the security features required by Ascendra Journal."
        );

        throw new Error(
            "Web Crypto API unavailable."
        );
    }


    /*
     * First-time journal setup.
     */
    if (!journalExists()) {

        let passphrase = null;

        while (!passphrase) {

            passphrase =
                prompt(
                    "Create a passphrase for your Ascendra Journal.\n\n" +
                    "This passphrase is NOT stored anywhere.\n" +
                    "You will need it whenever the journal is opened again."
                );

            if (passphrase === null) {
                throw new Error(
                    "Journal setup cancelled."
                );
            }

            if (
                passphrase.length < 12
            ) {
                alert(
                    "Please use a passphrase of at least 12 characters."
                );

                passphrase = null;
            }

            if (
                passphrase &&
                passphrase.length > MAX_PASSPHRASE_LENGTH
            ) {
                alert(
                    "Passphrase is too long."
                );

                passphrase = null;
            }
        }


        let confirmation =
            prompt(
                "Confirm your journal passphrase:"
            );

        if (
            confirmation === null ||
            confirmation !== passphrase
        ) {
            alert(
                "Passphrases did not match. The journal was not created."
            );

            throw new Error(
                "Journal setup cancelled."
            );
        }


        await createNewJournal(passphrase);

        /*
         * Remove the passphrase from local variables.
         */
        passphrase = null;
        confirmation = null;

        return;
    }


    /*
     * Existing journal.
     */
    let unlocked = false;

    while (!unlocked) {

        let passphrase =
            prompt(
                "Enter your Ascendra Journal passphrase:"
            );

        if (passphrase === null) {
            throw new Error(
                "Journal unlock cancelled."
            );
        }

        if (
            passphrase.length === 0 ||
            passphrase.length > MAX_PASSPHRASE_LENGTH
        ) {
            alert(
                "Invalid passphrase."
            );

            passphrase = null;
            continue;
        }

        try {

            await unlockExistingJournal(
                passphrase
            );

            unlocked = true;

        } catch (error) {

            alert(
                "Unable to unlock the journal. Please check your passphrase."
            );
        }

        passphrase = null;
    }
}


/* =====================================================
   DATE FUNCTIONS
===================================================== */

function isTodayDate(day) {

    return (
        day === todayDay &&
        currentMonth === todayMonth &&
        currentYear === todayYear
    );
}


function isFutureDate(day) {

    const selectedDate =
        new Date(
            currentYear,
            currentMonth,
            day
        );

    const realToday =
        new Date(
            todayYear,
            todayMonth,
            todayDay
        );

    return selectedDate > realToday;
}


/* =====================================================
   LOAD ENTRY INTO UI
===================================================== */

function loadEntry(day) {

    selectedDay = day;

    const dateKey =
        getDateKey(day);

    if (!dateKey) {
        return;
    }

    const entry =
        journalData[dateKey] || null;

    entryTitle.textContent =
        `Entry for ${monthNames[currentMonth]} ${day}, ${currentYear}`;


    if (
        entry &&
        allowedMoods.includes(entry.mood)
    ) {
        mood.value = entry.mood;
    } else {
        mood.value = "😄 Happy";
    }


    dayText.value =
        entry?.day || "";

    gratefulText.value =
        entry?.grateful || "";

    learnText.value =
        entry?.learn || "";

    goalText.value =
        entry?.goal || "";


    const canEdit =
        isTodayDate(day);


    mood.disabled =
        !canEdit;

    dayText.disabled =
        !canEdit;

    gratefulText.disabled =
        !canEdit;

    learnText.disabled =
        !canEdit;

    goalText.disabled =
        !canEdit;


    saveEntry.style.display =
        canEdit ? "block" : "none";


    statusMessage.textContent =
        canEdit
            ? ""
            : "Past entries are read-only.";
}


/* =====================================================
   BUILD CALENDAR
===================================================== */

function buildDateGrid() {

    /*
     * Clear the existing buttons.
     */
    dateGrid.replaceChildren();

    monthTitle.textContent =
        `${monthNames[currentMonth]} ${currentYear}`;


    const daysInMonth =
        new Date(
            currentYear,
            currentMonth + 1,
            0
        ).getDate();


    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const button =
            document.createElement("button");


        /*
         * Safe text insertion.
         */
        button.textContent =
            String(day);


        button.classList.add(
            "date-button"
        );


        const dateKey =
            getDateKey(day);


        if (
            dateKey &&
            Object.prototype.hasOwnProperty.call(
                journalData,
                dateKey
            )
        ) {
            button.classList.add(
                "has-entry"
            );
        }


        if (
            isTodayDate(day)
        ) {
            button.classList.add(
                "today"
            );
        }


        if (
            day === selectedDay
        ) {
            button.classList.add(
                "selected-day"
            );
        }


        if (
            isFutureDate(day)
        ) {

            button.classList.add(
                "future"
            );

            button.disabled = true;

        } else {

            button.addEventListener(
                "click",
                () => {

                    loadEntry(day);

                    buildDateGrid();
                }
            );
        }


        dateGrid.appendChild(
            button
        );
    }
}


/* =====================================================
   PREVIOUS MONTH
===================================================== */

prevMonth.addEventListener(
    "click",
    () => {

        currentMonth--;

        if (currentMonth < 0) {

            currentMonth = 11;

            currentYear--;
        }

        selectedDay = 1;

        buildDateGrid();

        loadEntry(selectedDay);
    }
);


/* =====================================================
   NEXT MONTH
===================================================== */

nextMonth.addEventListener(
    "click",
    () => {

        currentMonth++;

        if (currentMonth > 11) {

            currentMonth = 0;

            currentYear++;
        }

        selectedDay = 1;

        buildDateGrid();


        if (
            !isFutureDate(selectedDay)
        ) {

            loadEntry(selectedDay);

        } else {

            /*
             * Clear the form when navigating
             * into a future month.
             */
            entryTitle.textContent =
                `${monthNames[currentMonth]} ${currentYear}`;

            mood.value =
                "😄 Happy";

            dayText.value =
                "";

            gratefulText.value =
                "";

            learnText.value =
                "";

            goalText.value =
                "";

            mood.disabled = true;
            dayText.disabled = true;
            gratefulText.disabled = true;
            learnText.disabled = true;
            goalText.disabled = true;

            saveEntry.style.display =
                "none";

            statusMessage.textContent =
                "Future entries cannot be created yet.";
        }
    }
);


/* =====================================================
   SAVE ENTRY
===================================================== */

saveEntry.addEventListener(
    "click",
    async () => {

        /*
         * SECURITY:
         *
         * The interface is not trusted.
         *
         * Even if somebody changes disabled=false
         * through Developer Tools, this check remains.
         */
        if (
            !isTodayDate(selectedDay)
        ) {

            statusMessage.textContent =
                "Past entries are read-only.";

            return;
        }


        if (!encryptionKey) {

            statusMessage.textContent =
                "Journal is locked.";

            return;
        }


        const dateKey =
            getDateKey(selectedDay);


        if (!dateKey) {

            statusMessage.textContent =
                "Unable to save entry.";

            return;
        }


        /*
         * Validate mood.
         */
        const selectedMood =
            allowedMoods.includes(mood.value)
                ? mood.value
                : "😄 Happy";


        /*
         * Validate text lengths.
         */
        if (
            !isValidString(dayText.value) ||
            !isValidString(gratefulText.value) ||
            !isValidString(learnText.value) ||
            !isValidString(goalText.value)
        ) {

            statusMessage.textContent =
                "One or more fields are too long.";

            return;
        }


        const entry = {
            mood: selectedMood,
            day: dayText.value,
            grateful: gratefulText.value,
            learn: learnText.value,
            goal: goalText.value
        };


        const validatedEntry =
            sanitizeEntry(entry);


        if (!validatedEntry) {

            statusMessage.textContent =
                "Unable to validate entry.";

            return;
        }


        /*
         * Store only in memory first.
         */
        journalData[dateKey] =
            validatedEntry;


        try {

            /*
             * Entire journal is encrypted before
             * touching localStorage.
             */
            await saveEncryptedJournal();


            statusMessage.textContent =
                "Entry saved!";


            buildDateGrid();


        } catch (error) {

            console.error(
                "Unable to save encrypted journal.",
                error
            );


            statusMessage.textContent =
                "Unable to save entry. Please try again.";
        }
    }
);


/* =====================================================
   AUTO-LOCK WHEN PAGE LEAVES
===================================================== */

/*
 * When the page is hidden, remove the encryption key
 * from memory.
 *
 * This means returning to the page requires unlocking
 * the journal again.
 *
 * If you want the journal to remain unlocked while
 * switching browser tabs, remove this section.
 */

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.visibilityState === "hidden"
        ) {

            encryptionKey = null;

            journalData = {};

            /*
             * Clear sensitive form contents.
             */
            dayText.value = "";
            gratefulText.value = "";
            learnText.value = "";
            goalText.value = "";

            mood.value =
                "😄 Happy";

            mood.disabled = true;
            dayText.disabled = true;
            gratefulText.disabled = true;
            learnText.disabled = true;
            goalText.disabled = true;

            saveEntry.style.display =
                "none";

            statusMessage.textContent =
                "Journal locked.";
        }
    }
);


/* =====================================================
   INITIALIZE
===================================================== */

(async function initialize() {

    try {

        await initializeJournalSecurity();

        buildDateGrid();

        loadEntry(selectedDay);

    } catch (error) {

        console.error(
            "Journal initialization failed.",
            error
        );

        /*
         * Disable journal controls if initialization
         * fails.
         */
        mood.disabled = true;
        dayText.disabled = true;
        gratefulText.disabled = true;
        learnText.disabled = true;
        goalText.disabled = true;

        saveEntry.style.display =
            "none";

        statusMessage.textContent =
            "Journal is locked.";

    }

})();
