// ============================================================
// stock-count-approve.js — Bulk selection toolbar + approval state helpers
// Phase 7 Step 3: partial approval support
// Depends on: stock-count-report.js (tab._scReportAllItems)
// ============================================================

// ── Bulk selection helpers ────────────────────────────────────
function scReportCheckAll() {
  document.querySelectorAll('.sc-approve-cb').forEach(cb => { cb.checked = true; });
}

function scReportUncheckAll() {
  document.querySelectorAll('.sc-approve-cb').forEach(cb => { cb.checked = false; });
}

function scReportCheckDiffsOnly() {
  const tab = document.getElementById('tab-stock-count');
  const allItems = tab._scReportAllItems || [];
  const diffIds = new Set(
    allItems.filter(i => i.status === 'counted' && i.actual_qty !== i.expected_qty).map(i => i.id)
  );
  document.querySelectorAll('.sc-approve-cb').forEach(cb => {
    cb.checked = diffIds.has(cb.dataset.itemId);
  });
}

// ── Collect checkbox + reason state from DOM ─────────────────
function _scCollectApprovalState(allItems) {
  const approvedIds = new Set();
  document.querySelectorAll('.sc-approve-cb').forEach(cb => {
    if (cb.checked) approvedIds.add(cb.dataset.itemId);
  });
  const reasons = {};
  document.querySelectorAll('.sc-reason-input').forEach(inp => {
    const val = (inp.value || '').trim();
    if (val) reasons[inp.dataset.itemId] = val;
  });
  const countedItems = allItems.filter(i => i.status === 'counted' && i.inventory_id);
  const approved = countedItems.filter(i => approvedIds.has(i.id));
  const skipped = countedItems.filter(i => !approvedIds.has(i.id));
  return { approved, skipped, reasons };
}
