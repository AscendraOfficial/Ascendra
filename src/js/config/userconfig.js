let USER_CONFIG = {
  parentalMode: false,
};

// Load the journal security layer before any journal request is allowed.
// Non-journal requests continue to use the browser's normal fetch immediately.
const ascendraNativeFetch = window.fetch.bind(window);
let ascendraJournalFetch = null;

const journalSecurityReady = import(new URL("src/js/journal.js", document.baseURI).href).then((module) => {
  ascendraJournalFetch = module.createJournalFetch(ascendraNativeFetch);
});

window.fetch = async function ascendraSecureFetch(input, init) {
  const rawUrl =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input?.url || "";

  let isJournalRequest = false;

  try {
    const pathname = new URL(rawUrl, window.location.href).pathname;
    isJournalRequest = pathname.endsWith("/journal");
  } catch {
    // Let the native fetch handle malformed/non-standard URLs.
  }

  if (!isJournalRequest) {
    return ascendraNativeFetch(input, init);
  }

  try {
    await journalSecurityReady;
  } catch (error) {
    console.error("Ascendra could not load journal security.", error);
    throw new Error("Journal security could not be loaded.");
  }

  return ascendraJournalFetch(input, init);
};
