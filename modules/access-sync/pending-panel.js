// =========================================================
// PENDING PANEL — Filter toggle + count badge
// =========================================================

// -- renderPendingPanel: toggle filter on sync log table ----
function renderPendingPanel() {
  togglePendingFilter();
}

// -- closePendingPanel: remove filter -----------------------
function closePendingPanel() {
  if (syncPendingFilterActive) {
    togglePendingFilter();
  }
}

// -- updatePendingPanelCount: refresh badge count -----------
async function updatePendingPanelCount() {
  await loadPendingBadge();
}

// -- searchBarcodeInInventory: navigate to inventory tab ----
function searchBarcodeInInventory(barcode) {
  showTab('inventory');
  setTimeout(() => {
    const input = $('inv-search');
    if (input) {
      input.value = barcode;
      if (typeof filterInventoryTable === 'function') filterInventoryTable();
    }
  }, 200);
}
