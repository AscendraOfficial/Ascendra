"use strict";

const sync_statuses = Object.freeze({
  manual_sync_statuses: Object.freeze(["Synced", "Not synced"]),
  auto_sync_statuses: Object.freeze(["Synced", "Syncing"]),
});

function getSyncStatusDisplay() {
  return document.getElementById("sync-status-display");
}

function setSyncStatus(status) {
  const display = getSyncStatusDisplay();

  if (!display) {
    return;
  }

  display.textContent = String(status || sync_statuses.manual_sync_statuses[1]);
}

function setManualSyncStatus(isSynced) {
  setSyncStatus(
    isSynced
      ? sync_statuses.manual_sync_statuses[0]
      : sync_statuses.manual_sync_statuses[1],
  );
}

function setAutoSyncStatus(isSyncing) {
  setSyncStatus(
    isSyncing
      ? sync_statuses.auto_sync_statuses[1]
      : sync_statuses.auto_sync_statuses[0],
  );
}

document.addEventListener("DOMContentLoaded", function () {
  setManualSyncStatus(false);
});

window.ascendraSyncUI = Object.freeze({
  statuses: sync_statuses,
  setStatus: setSyncStatus,
  setManualStatus: setManualSyncStatus,
  setAutoStatus: setAutoSyncStatus,
});
