/* Ascendra browser diagnostics: local-device only; no network transmission. */
(() => {
  "use strict";
  if (window.AscendraDiagnostics) return;

  const STORAGE_KEY = "ascendra_diagnostics_v1";
  const MAX_ENTRIES = 120;
  const MAX_AGE_MS = 24 * 60 * 60 * 1000;
  const methods = ["log", "info", "warn", "error", "debug"];

  // Only record short, plain text. Never serialize objects, which can contain
  // passwords, account details, profiles, tokens, or other private information.
  function safeText(value) {
    if (typeof value !== "string") return "[" + typeof value + " omitted]";
    let text = value.slice(0, 400);
    text = text.replace(/https?:\/\/\S+/gi, "[URL omitted]");
    text = text.replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email omitted]");
    text = text.replace(/\b(?:bearer|token|password|secret|authorization|api[_-]?key|session|credential|cookie)\b\s*[:=]?\s*\S*/gi, "[credential detail omitted]");
    text = text.replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, "[identifier omitted]");
    text = text.replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[long value omitted]");
    return text;
  }

  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(value)) return [];
      const cutoff = Date.now() - MAX_AGE_MS;
      return value.filter((entry) => entry && Number.isFinite(entry.time) && entry.time > cutoff).slice(-MAX_ENTRIES);
    } catch (_) {
      return [];
    }
  }

  function record(level, args) {
    try {
      const entries = read();
      entries.push({
        time: Date.now(),
        level,
        page: location.pathname.slice(0, 120),
        message: args.map(safeText).join(" ").slice(0, 500)
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
    } catch (_) {
      // Storage can be unavailable; never break the application.
    }
  }

  for (const method of methods) {
    const original = console[method];
    if (typeof original !== "function") continue;
    console[method] = function (...args) {
      record(method, args);
      return original.apply(console, args);
    };
  }

  window.addEventListener("error", (event) => {
    record("error", ["Uncaught error:", event.message || "Unknown error"]);
  });
  window.addEventListener("unhandledrejection", () => {
    // Promise rejection reasons may contain private data; omit the reason.
    record("error", ["Unhandled promise rejection (details omitted)"]);
  });

  window.AscendraDiagnostics = Object.freeze({
    read,
    clear() {
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    }
  });
})();
