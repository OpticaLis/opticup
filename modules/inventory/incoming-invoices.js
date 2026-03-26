// =========================================================
// incoming-invoices.js — Upload invoices that arrived without goods
// Runs in inventory.html (has shared components: Toast, Modal, etc.)
// Provides: loadIncomingInvoicesTab(), _submitIncomingInvoice()
// =========================================================

var _incInvSupSelect = null; // searchable supplier dropdown instance
var _incInvFile = null;      // staged File object
var _incInvFolders = [];     // expense folders loaded inline (not from debt module)

// =========================================================
// Tab loader — called from showTab('incoming-invoices')
// =========================================================
async function loadIncomingInvoicesTab() {
  var container = $('tab-incoming-invoices');
  if (!container) return;

  container.innerHTML =
    '<div style="max-width:640px;margin:0 auto">' +
      '<p style="font-size:.92rem;color:var(--g600);margin-bottom:14px">' +
        '\uD83D\uDCE8 \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA \u05D4\u05D2\u05D9\u05E2\u05D4 \u05D1\u05DC\u05D9 \u05E1\u05D7\u05D5\u05E8\u05D4? \u05D4\u05E2\u05DC\u05D4 \u05D0\u05D5\u05EA\u05D4 \u05DB\u05D0\u05DF \u05D5\u05E9\u05DC\u05D7 \u05DC\u05D8\u05D9\u05E4\u05D5\u05DC' +
      '</p>' +
      // Target dropdown (supplier or folder)
      '<div style="margin-bottom:12px">' +
        '<label style="font-size:.88rem;font-weight:600;display:block;margin-bottom:4px">\u05E9\u05D9\u05D9\u05DA \u05DC:</label>' +
        '<div id="inc-inv-supplier-wrap"></div>' +
      '</div>' +
      // Drop zone
      '<div id="inc-inv-dropzone" style="border:2px dashed var(--g300);border-radius:8px;padding:28px 16px;text-align:center;cursor:pointer;transition:border-color .2s;margin-bottom:12px">' +
        '<div style="font-size:1.3rem;margin-bottom:4px">\uD83D\uDCC4</div>' +
        '<div style="font-size:.88rem;color:var(--g500)">\u05D2\u05E8\u05D5\u05E8 \u05E7\u05D5\u05D1\u05E5 \u05DC\u05DB\u05D0\u05DF \u05D0\u05D5 \u05DC\u05D7\u05E5 \u05DC\u05D1\u05D7\u05D9\u05E8\u05D4</div>' +
        '<div style="font-size:.78rem;color:var(--g400);margin-top:4px">PDF, JPG, PNG \u2014 \u05E2\u05D3 10MB</div>' +
      '</div>' +
      // File preview (hidden until file selected)
      '<div id="inc-inv-file-preview" style="display:none;margin-bottom:12px"></div>' +
      // Submit
      '<button class="btn btn-primary" id="inc-inv-submit" style="width:100%;margin-bottom:20px" ' +
        'onclick="_submitIncomingInvoice()">' +
        '\uD83D\uDCE4 \u05E9\u05DC\u05D7 \u05DC\u05D8\u05D9\u05E4\u05D5\u05DC</button>' +
      // Recent pending invoices table
      '<div id="inc-inv-recent"></div>' +
    '</div>';

  // Load expense folders inline (inventory.html doesn't have debt-expense-folders.js)
  try {
    var { data: fRows } = await sb.from(T.EXPENSE_FOLDERS).select('id, name, icon')
      .eq('tenant_id', getTenantId()).eq('is_active', true).order('sort_order');
    _incInvFolders = fRows || [];
  } catch (e) { _incInvFolders = []; }
  // Build combined list: suppliers + folders
  var supNames = (typeof suppliers !== 'undefined' ? suppliers : []).filter(Boolean)
    .map(function(s) { return 'supplier:' + s; });
  var folderNames = _incInvFolders.map(function(f) { return 'folder:' + (f.icon || '\uD83D\uDCC1') + ' ' + f.name; });
  var allNames = supNames.concat(folderNames);
  _incInvSupSelect = createSearchSelect(allNames, '', function() {});
  var wrap = $('inc-inv-supplier-wrap');
  if (wrap && _incInvSupSelect) wrap.appendChild(_incInvSupSelect);

  // Init drop zone events
  _initIncInvDropzone();

  // Load recent pending invoices
  await _loadRecentPendingInvoices();
}

// =========================================================
// Drop zone — drag/drop + click-to-pick
// =========================================================
function _initIncInvDropzone() {
  var zone = $('inc-inv-dropzone');
  if (!zone) return;

  zone.addEventListener('dragover', function(e) {
    e.preventDefault();
    zone.style.borderColor = 'var(--primary, #1a73e8)';
    zone.style.background = '#f0f7ff';
  });
  zone.addEventListener('dragleave', function() {
    zone.style.borderColor = 'var(--g300)';
    zone.style.background = '';
  });
  zone.addEventListener('drop', function(e) {
    e.preventDefault();
    zone.style.borderColor = 'var(--g300)';
    zone.style.background = '';
    var file = e.dataTransfer.files[0];
    if (file) _stageIncInvFile(file);
  });
  zone.addEventListener('click', function() {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.pdf,.jpg,.jpeg,.png';
    inp.onchange = function() { if (inp.files[0]) _stageIncInvFile(inp.files[0]); };
    inp.click();
  });
}

function _stageIncInvFile(file) {
  var allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  if (!allowed.includes(file.type)) {
    Toast.error('\u05E1\u05D5\u05D2 \u05E7\u05D5\u05D1\u05E5 \u05DC\u05D0 \u05E0\u05EA\u05DE\u05DA \u2014 \u05E8\u05E7 PDF, JPG, PNG');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    Toast.error('\u05E7\u05D5\u05D1\u05E5 \u05D2\u05D3\u05D5\u05DC \u05DE\u05D3\u05D9 \u2014 \u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD 10MB');
    return;
  }
  _incInvFile = file;
  var preview = $('inc-inv-file-preview');
  var zone = $('inc-inv-dropzone');
  if (zone) zone.style.display = 'none';
  if (preview) {
    var ext = (file.name || '').split('.').pop().toLowerCase();
    var icon = ext === 'pdf' ? '\uD83D\uDCC4' : '\uD83D\uDDBC\uFE0F';
    preview.style.display = 'flex';
    preview.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--g100);border-radius:6px;margin-bottom:12px';
    preview.innerHTML =
      '<span style="font-size:1.4rem">' + icon + '</span>' +
      '<span style="flex:1;font-size:.88rem">' + escapeHtml(file.name) +
        ' <span style="color:var(--g400)">(' + (file.size / 1024).toFixed(0) + 'KB)</span></span>' +
      '<button class="btn-sm" style="background:#ef4444;color:#fff" onclick="_clearIncInvFile()">\u2715</button>';
  }
}

function _clearIncInvFile() {
  _incInvFile = null;
  var preview = $('inc-inv-file-preview');
  var zone = $('inc-inv-dropzone');
  if (preview) preview.style.display = 'none';
  if (zone) zone.style.display = '';
}

// =========================================================
// Submit — upload file + create pending_invoice document
// =========================================================
async function _submitIncomingInvoice() {
  // Validate target (supplier or folder)
  var supHidden = _incInvSupSelect ? _incInvSupSelect.querySelector('input[type="hidden"]') : null;
  var rawValue = supHidden ? supHidden.value : '';
  var supplierId = null, folderId = null;
  if (rawValue.startsWith('supplier:')) {
    var supName = rawValue.substring(9);
    supplierId = supName ? supplierCache[supName] : null;
    if (!supplierId) { Toast.error('\u05D9\u05E9 \u05DC\u05D1\u05D7\u05D5\u05E8 \u05E1\u05E4\u05E7'); return; }
  } else if (rawValue.startsWith('folder:')) {
    var folderLabel = rawValue.substring(7).trim();
    var match = _incInvFolders.find(function(f) { return ((f.icon || '\uD83D\uDCC1') + ' ' + f.name) === folderLabel; });
    folderId = match ? match.id : null;
    if (!folderId) { Toast.error('\u05D9\u05E9 \u05DC\u05D1\u05D7\u05D5\u05E8 \u05EA\u05D9\u05E7\u05D9\u05D4'); return; }
  } else {
    Toast.error('\u05D9\u05E9 \u05DC\u05D1\u05D7\u05D5\u05E8 \u05E1\u05E4\u05E7 \u05D0\u05D5 \u05EA\u05D9\u05E7\u05D9\u05D4'); return;
  }

  // Validate file
  if (!_incInvFile) { Toast.error('\u05D9\u05E9 \u05DC\u05E6\u05E8\u05E3 \u05E7\u05D5\u05D1\u05E5'); return; }

  showLoading('\u05E9\u05D5\u05DC\u05D7 \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA...');
  try {
    // 1. Upload file (use supplierId or 'general' for folder-based uploads)
    var uploadResult = await uploadSupplierFile(_incInvFile, supplierId || 'general');
    if (!uploadResult) throw new Error('\u05D4\u05E2\u05DC\u05D0\u05EA \u05E7\u05D5\u05D1\u05E5 \u05E0\u05DB\u05E9\u05DC\u05D4');

    // 2. Generate internal number
    var { data: internalNumber, error: numErr } = await sb.rpc('next_internal_doc_number', {
      p_tenant_id: getTenantId(), p_prefix: 'INV'
    });
    if (numErr) throw numErr;

    // 3. Get invoice document_type_id
    var types = await fetchAll(T.DOC_TYPES, [['code', 'eq', 'invoice']]);
    var invoiceType = types[0];
    if (!invoiceType) throw new Error('\u05E1\u05D5\u05D2 \u05DE\u05E1\u05DE\u05DA \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0');

    // 4. Create supplier_document
    var today = new Date().toISOString().split('T')[0];
    var emp = typeof getCurrentEmployee === 'function' ? getCurrentEmployee() : null;
    var docRow = {
      tenant_id: getTenantId(),
      supplier_id: supplierId || null,
      expense_folder_id: folderId || null,
      document_type_id: invoiceType.id,
      internal_number: internalNumber,
      document_number: '',
      document_date: today,
      received_date: today,
      subtotal: 0,
      vat_rate: 0,
      vat_amount: 0,
      total_amount: 0,
      status: 'pending_invoice',
      missing_price: true,
      created_by: emp ? emp.id : null
    };
    var created = await batchCreate(T.SUP_DOCS, [docRow]);
    var newDoc = created[0];
    if (!newDoc) throw new Error('\u05D9\u05E6\u05D9\u05E8\u05EA \u05DE\u05E1\u05DE\u05DA \u05E0\u05DB\u05E9\u05DC\u05D4');

    // 5. Save file record
    await batchCreate(T.DOC_FILES, [{
      tenant_id: getTenantId(),
      document_id: newDoc.id,
      file_url: uploadResult.url,
      file_name: _incInvFile.name,
      sort_order: 0,
      created_by: emp ? emp.id : null
    }]);
    // Also set primary file_url on document
    await batchUpdate(T.SUP_DOCS, [{ id: newDoc.id, file_url: uploadResult.url, file_name: _incInvFile.name }]);

    // 6. Log
    writeLog('incoming_invoice', null, {
      document_id: newDoc.id,
      internal_number: internalNumber,
      supplier_id: supplierId || null,
      expense_folder_id: folderId || null,
      source_ref: 'incoming-invoices-tab'
    });

    Toast.success('\u05D4\u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA \u05E0\u05E9\u05DC\u05D7\u05D4 \u05DC\u05D8\u05D9\u05E4\u05D5\u05DC \u05D1\u05DE\u05E2\u05E7\u05D1 \u05D7\u05D5\u05D1\u05D5\u05EA');

    // 7. Clear form + refresh
    _clearIncInvFile();
    if (_incInvSupSelect) {
      var visInput = _incInvSupSelect.querySelector('input[type="text"]');
      var hidInput = _incInvSupSelect.querySelector('input[type="hidden"]');
      if (visInput) visInput.value = '';
      if (hidInput) hidInput.value = '';
    }
    await _loadRecentPendingInvoices();
  } catch (e) {
    console.error('_submitIncomingInvoice error:', e);
    Toast.error('\u05E9\u05D2\u05D9\u05D0\u05D4: ' + (e.message || ''));
  } finally {
    hideLoading();
  }
}

// =========================================================
// Recent pending invoices table (last 10)
// =========================================================
async function _loadRecentPendingInvoices() {
  var wrap = $('inc-inv-recent');
  if (!wrap) return;
  try {
    var { data: docs, error } = await sb.from(T.SUP_DOCS)
      .select('id, internal_number, supplier_id, expense_folder_id, document_date, status, created_at')
      .eq('tenant_id', getTenantId())
      .eq('status', 'pending_invoice')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) throw error;
    if (!docs || !docs.length) {
      wrap.innerHTML = '<div style="text-align:center;color:var(--g400);font-size:.85rem;padding:12px">\u05D0\u05D9\u05DF \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05D5\u05EA \u05DE\u05DE\u05EA\u05D9\u05E0\u05D5\u05EA</div>';
      return;
    }
    var supMap = {};
    (typeof _docSuppliers !== 'undefined' ? _docSuppliers : []).forEach(function(s) { supMap[s.id] = s.name; });
    // Fallback: use supplierCacheRev if _docSuppliers not loaded (inventory page)
    if (!Object.keys(supMap).length && typeof supplierCacheRev !== 'undefined') supMap = supplierCacheRev;

    var folderMap = {};
    _incInvFolders.forEach(function(f) { folderMap[f.id] = f; });
    var rows = docs.map(function(d) {
      var target = supMap[d.supplier_id] || '';
      if (!target && d.expense_folder_id) {
        var f = folderMap[d.expense_folder_id];
        target = f ? (f.icon || '\uD83D\uDCC1') + ' ' + f.name : '\u05EA\u05D9\u05E7\u05D9\u05D4';
      }
      return '<tr>' +
        '<td>' + escapeHtml(d.internal_number || '') + '</td>' +
        '<td>' + escapeHtml(target) + '</td>' +
        '<td>' + escapeHtml(d.document_date || '') + '</td>' +
        '<td><span style="background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:4px;font-size:11px">\u05DE\u05DE\u05EA\u05D9\u05DF \u05DC\u05D8\u05D9\u05E4\u05D5\u05DC</span></td>' +
      '</tr>';
    }).join('');
    wrap.innerHTML =
      '<div style="font-size:.88rem;font-weight:600;margin-bottom:6px">\u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05D5\u05EA \u05D0\u05D7\u05E8\u05D5\u05E0\u05D5\u05EA \u05E9\u05E0\u05E9\u05DC\u05D7\u05D5</div>' +
      '<div style="overflow-x:auto"><table class="data-table" style="width:100%;font-size:.85rem">' +
        '<thead><tr><th>\u05DE\u05E1\u05E4\u05E8</th><th>\u05E9\u05D5\u05D9\u05DA \u05DC:</th><th>\u05EA\u05D0\u05E8\u05D9\u05DA</th><th>\u05E1\u05D8\u05D8\u05D5\u05E1</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div>';
  } catch (e) {
    console.warn('_loadRecentPendingInvoices error:', e);
  }
}
