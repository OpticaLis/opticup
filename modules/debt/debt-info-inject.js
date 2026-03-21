// debt-info-inject.js — Monkey-patches to inject ❓ buttons into supplier debt screens (Phase 5.5j)
// Load LAST after debt-info-content.js
// Provides: _injectModalInfoBtn helper + all monkey-patches for tabs & modals

// =========================================================
// 1. HELPER — inject ❓ into modal header (next to h3)
// =========================================================
function _injectModalInfoBtn(modalId, infoFn) {
  var modal = document.getElementById(modalId);
  if (!modal) return;
  var h3 = modal.querySelector('h3');
  if (!h3 || h3.parentNode.querySelector('.info-help-btn')) return;
  var btn = document.createElement('button');
  btn.className = 'info-help-btn';
  btn.title = '\u05E2\u05D6\u05E8\u05D4';
  btn.textContent = '\u2753';
  btn.style.cssText = 'margin-right:8px';
  btn.onclick = function(e) { e.stopPropagation(); e.preventDefault(); infoFn(); };
  h3.insertAdjacentElement('afterend', btn);
}

// =========================================================
// 2. TAB MONKEY-PATCHES
// =========================================================

// #1 Dashboard — inject ❓ next to main title on page load
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    var topbar = document.querySelector('.debt-topbar');
    _injectInfoBtn(topbar, _showDashboardInfo);
  }, 100);
});

// #2 Suppliers tab
var _origRenderSuppliersTable = typeof renderSuppliersTable === 'function' ? renderSuppliersTable : null;
if (_origRenderSuppliersTable) {
  renderSuppliersTable = function(data) {
    _origRenderSuppliersTable(data);
    var wrap = document.getElementById('dtab-suppliers');
    if (wrap) {
      var tbl = wrap.querySelector('.data-table thead tr');
      if (tbl && !wrap.querySelector('.info-help-btn')) {
        var container = document.createElement('div');
        container.style.cssText = 'display:flex;justify-content:flex-end;margin-bottom:6px';
        _injectInfoBtn(container, _showSuppliersInfo);
        wrap.insertBefore(container, wrap.firstChild);
      }
    }
  };
}

// #3 Documents tab
var _origRenderDocFilterBar = typeof renderDocFilterBar === 'function' ? renderDocFilterBar : null;
if (_origRenderDocFilterBar) {
  renderDocFilterBar = function() {
    _origRenderDocFilterBar();
    var wrap = document.getElementById('dtab-documents');
    if (wrap && !wrap.querySelector('.info-help-btn')) {
      var container = document.createElement('div');
      container.style.cssText = 'display:flex;justify-content:flex-end;margin-bottom:6px';
      _injectInfoBtn(container, _showDocumentsInfo);
      wrap.insertBefore(container, wrap.firstChild);
    }
  };
}

// #5 Payments tab
var _origRenderPaymentsToolbar = typeof renderPaymentsToolbar === 'function' ? renderPaymentsToolbar : null;
if (_origRenderPaymentsToolbar) {
  renderPaymentsToolbar = function() {
    _origRenderPaymentsToolbar();
    var wrap = document.getElementById('dtab-payments');
    if (wrap && !wrap.querySelector('.info-help-btn')) {
      var container = document.createElement('div');
      container.style.cssText = 'display:flex;justify-content:flex-end;margin-bottom:6px';
      _injectInfoBtn(container, _showPaymentsInfo);
      wrap.insertBefore(container, wrap.firstChild);
    }
  };
}

// #7 Prepaid tab
var _origRenderPrepaidToolbar = typeof renderPrepaidToolbar === 'function' ? renderPrepaidToolbar : null;
if (_origRenderPrepaidToolbar) {
  renderPrepaidToolbar = function() {
    _origRenderPrepaidToolbar();
    var wrap = document.getElementById('dtab-prepaid');
    if (wrap && !wrap.querySelector('.info-help-btn')) {
      var container = document.createElement('div');
      container.style.cssText = 'display:flex;justify-content:flex-end;margin-bottom:6px';
      _injectInfoBtn(container, _showPrepaidInfo);
      wrap.insertBefore(container, wrap.firstChild);
    }
  };
}

// #8 Weekly report
var _origRenderWeeklyReport = typeof _renderWeeklyReport === 'function' ? _renderWeeklyReport : null;
if (_origRenderWeeklyReport) {
  _renderWeeklyReport = function(weekStart, weekEnd) {
    _origRenderWeeklyReport(weekStart, weekEnd);
    var header = document.querySelector('.weekly-report-header');
    if (header) _injectInfoBtn(header, _showWeeklyReportInfo);
  };
}

// =========================================================
// 3. MODAL MONKEY-PATCHES
// =========================================================

// #4 New Document modal
var _origOpenNewDocModal = typeof openNewDocumentModal === 'function' ? openNewDocumentModal : null;
if (_origOpenNewDocModal) {
  openNewDocumentModal = function() {
    _origOpenNewDocModal();
    _injectModalInfoBtn('new-doc-modal', _showNewDocInfo);
  };
}

// #6 Payment Wizard — both entry points
var _origOpenPayWiz = typeof openNewPaymentWizard === 'function' ? openNewPaymentWizard : null;
if (_origOpenPayWiz) {
  openNewPaymentWizard = function() {
    _origOpenPayWiz();
    _injectModalInfoBtn('pay-wizard-modal', _showPayWizardInfo);
  };
}
var _origOpenPayForSup = typeof openPaymentForSupplier === 'function' ? openPaymentForSupplier : null;
if (_origOpenPayForSup) {
  openPaymentForSupplier = async function(supplierId) {
    await _origOpenPayForSup(supplierId);
    _injectModalInfoBtn('pay-wizard-modal', _showPayWizardInfo);
  };
}

// #9 Batch Upload modal
var _origOpenBatchUpload = typeof _openBatchUploadModal === 'function' ? _openBatchUploadModal : null;
if (_origOpenBatchUpload) {
  _openBatchUploadModal = function() {
    _origOpenBatchUpload();
    _injectModalInfoBtn('batch-upload-modal', _showBatchUploadInfo);
  };
}

// #10 Historical Import modal
var _origOpenHistImport = typeof _openHistoricalImportModal === 'function' ? _openHistoricalImportModal : null;
if (_origOpenHistImport) {
  _openHistoricalImportModal = function() {
    _origOpenHistImport();
    _injectModalInfoBtn('hist-import-modal', _showHistImportInfo);
  };
}

// #11 OCR Review modal
var _origShowOCRReview = typeof showOCRReview === 'function' ? showOCRReview : null;
if (_origShowOCRReview) {
  showOCRReview = async function(result, fileUrl, existingDocId) {
    await _origShowOCRReview(result, fileUrl, existingDocId);
    _injectModalInfoBtn('ocr-review-modal', _showOCRReviewInfo);
  };
}

// #12 AI Config modal
var _origRenderAIConfig = typeof _renderAIConfigModal === 'function' ? _renderAIConfigModal : null;
if (_origRenderAIConfig) {
  _renderAIConfigModal = function(config, stats) {
    _origRenderAIConfig(config, stats);
    var overlay = document.getElementById('ai-config-overlay');
    if (overlay) {
      var h3 = overlay.querySelector('h3');
      if (h3 && !h3.parentNode.querySelector('.info-help-btn')) {
        var btn = document.createElement('button');
        btn.className = 'info-help-btn';
        btn.title = '\u05E2\u05D6\u05E8\u05D4';
        btn.textContent = '\u2753';
        btn.style.cssText = 'margin-right:8px';
        btn.onclick = function(e) { e.stopPropagation(); _showAIConfigInfo(); };
        h3.insertAdjacentElement('afterend', btn);
      }
    }
  };
}
