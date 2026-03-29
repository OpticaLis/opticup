// debt-expense-folders.js — Expense folders CRUD for general invoices
// Load after: shared.js, supabase-ops.js, shared/js/modal-builder.js
// Provides: renderExpenseFolders(), loadExpenseFolders(), getExpenseFolders()

window._expenseFoldersCache = [];
var _expFoldersVisible = false;

// ── Load folders from DB ────────────────────────────────────
async function loadExpenseFolders() {
  try {
    var { data, error } = await sb.from(T.EXPENSE_FOLDERS).select('*')
      .eq('tenant_id', getTenantId())
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (error) throw error;
    window._expenseFoldersCache = data || [];
  } catch (e) {
    console.warn('loadExpenseFolders:', e.message);
    window._expenseFoldersCache = [];
  }
  return window._expenseFoldersCache;
}

function getExpenseFolders() {
  return window._expenseFoldersCache.filter(function(f) { return f.is_active; });
}

// ── Toggle visibility ───────────────────────────────────────
function toggleExpenseFolders() {
  _expFoldersVisible = !_expFoldersVisible;
  var container = document.getElementById('expense-folders-container');
  if (!container) return;
  if (_expFoldersVisible) {
    container.style.display = 'block';
    renderExpenseFolders();
  } else {
    container.style.display = 'none';
  }
}

// ── Render folders section ──────────────────────────────────
async function renderExpenseFolders() {
  var container = document.getElementById('expense-folders-container');
  if (!container) return;
  await loadExpenseFolders();
  var folders = window._expenseFoldersCache;

  var rows = folders.map(function(f) {
    var cls = f.is_active ? '' : 'style="opacity:.5"';
    return '<tr ' + cls + '>' +
      '<td style="padding:6px 10px;font-size:1.2rem;text-align:center">' + escapeHtml(f.icon || '\uD83D\uDCC1') + '</td>' +
      '<td style="padding:6px 10px;font-weight:600">' + escapeHtml(f.name) + '</td>' +
      '<td style="padding:6px 10px;text-align:center">' +
        '<label style="cursor:pointer"><input type="checkbox" ' + (f.is_active ? 'checked' : '') +
        ' onchange="_toggleFolderActive(\'' + f.id + '\',this.checked)"></label></td>' +
      '<td style="padding:6px 10px;text-align:center">' +
        '<button class="btn btn-sm" style="background:none;border:none;cursor:pointer;font-size:14px" ' +
          'onclick="editExpenseFolder(\'' + f.id + '\')" title="\u05E2\u05E8\u05D9\u05DB\u05D4">\u270F\uFE0F</button>' +
        '<button class="btn btn-sm" style="background:none;border:none;cursor:pointer;font-size:14px;color:#ef4444" ' +
          'onclick="deleteExpenseFolder(\'' + f.id + '\')" title="\u05DE\u05D7\u05D9\u05E7\u05D4">\uD83D\uDDD1\uFE0F</button>' +
      '</td></tr>';
  }).join('');

  if (!folders.length) {
    rows = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#999">\u05D0\u05D9\u05DF \u05EA\u05D9\u05E7\u05D9\u05D5\u05EA \u2014 \u05DC\u05D7\u05E5 "\u05D4\u05D5\u05E1\u05E3 \u05EA\u05D9\u05E7\u05D9\u05D4"</td></tr>';
  }

  container.innerHTML =
    '<div style="background:white;border-radius:10px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.08);margin-bottom:16px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
        '<h3 style="margin:0;font-size:1rem">\uD83D\uDCC1 \u05EA\u05D9\u05E7\u05D9\u05D5\u05EA \u05D4\u05D5\u05E6\u05D0\u05D5\u05EA</h3>' +
        '<button class="btn btn-sm" style="background:#059669;color:#fff" onclick="addExpenseFolder()">\u2795 \u05D4\u05D5\u05E1\u05E3 \u05EA\u05D9\u05E7\u05D9\u05D4</button>' +
      '</div>' +
      '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.88rem">' +
        '<thead><tr style="background:var(--g100);text-align:right">' +
          '<th style="padding:6px 10px;width:50px">\u05D0\u05D9\u05D9\u05E7\u05D5\u05DF</th>' +
          '<th style="padding:6px 10px">\u05E9\u05DD</th>' +
          '<th style="padding:6px 10px;text-align:center;width:60px">\u05E4\u05E2\u05D9\u05DC</th>' +
          '<th style="padding:6px 10px;text-align:center;width:80px">\u05E4\u05E2\u05D5\u05DC\u05D5\u05EA</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '</div>';
}

// ── Add folder ──────────────────────────────────────────────
function addExpenseFolder() {
  Modal.form({
    title: '\u05EA\u05D9\u05E7\u05D9\u05D4 \u05D7\u05D3\u05E9\u05D4',
    size: 'sm',
    submitText: '\u05E9\u05DE\u05D5\u05E8',
    cancelText: '\u05D1\u05D9\u05D8\u05D5\u05DC',
    content:
      '<label style="display:block;margin-bottom:10px;font-size:.9rem">\u05E9\u05DD \u05EA\u05D9\u05E7\u05D9\u05D4 <span style="color:red">*</span>' +
        '<input id="ef-name" class="nd-field" placeholder="\u05DC\u05DE\u05E9\u05DC: \u05D7\u05E9\u05DE\u05DC, \u05E9\u05DC\u05D9\u05D7\u05D5\u05D9\u05D5\u05EA..." required></label>' +
      '<label style="display:block;margin-bottom:10px;font-size:.9rem">\u05D0\u05D9\u05D9\u05E7\u05D5\u05DF' +
        '<input id="ef-icon" class="nd-field" value="\uD83D\uDCC1" style="width:60px;font-size:1.2rem;text-align:center"></label>',
    onSubmit: async function() {
      var name = (document.getElementById('ef-name').value || '').trim();
      if (!name) { Toast.error('\u05E9\u05DD \u05EA\u05D9\u05E7\u05D9\u05D4 \u05D7\u05D5\u05D1\u05D4'); return; }
      var icon = (document.getElementById('ef-icon').value || '').trim() || '\uD83D\uDCC1';
      try {
        await batchCreate(T.EXPENSE_FOLDERS, [{
          tenant_id: getTenantId(), name: name, icon: icon, is_active: true
        }]);
        writeLog('expense_folder_created', null, { name: name, icon: icon });
        Toast.success('\u05EA\u05D9\u05E7\u05D9\u05D4 \u05E0\u05D5\u05E6\u05E8\u05D4');
        Modal.close();
        renderExpenseFolders();
      } catch (e) {
        if (e.message && e.message.includes('23505')) {
          Toast.error('\u05EA\u05D9\u05E7\u05D9\u05D4 \u05D1\u05E9\u05DD \u05D6\u05D4 \u05DB\u05D1\u05E8 \u05E7\u05D9\u05D9\u05DE\u05EA');
        } else {
          Toast.error('\u05E9\u05D2\u05D9\u05D0\u05D4: ' + (e.message || ''));
        }
      }
    }
  });
}

// ── Edit folder ─────────────────────────────────────────────
function editExpenseFolder(folderId) {
  var folder = window._expenseFoldersCache.find(function(f) { return f.id === folderId; });
  if (!folder) return;
  Modal.form({
    title: '\u05E2\u05E8\u05D9\u05DB\u05EA \u05EA\u05D9\u05E7\u05D9\u05D4',
    size: 'sm',
    submitText: '\u05E9\u05DE\u05D5\u05E8',
    cancelText: '\u05D1\u05D9\u05D8\u05D5\u05DC',
    content:
      '<label style="display:block;margin-bottom:10px;font-size:.9rem">\u05E9\u05DD \u05EA\u05D9\u05E7\u05D9\u05D4 <span style="color:red">*</span>' +
        '<input id="ef-name" class="nd-field" value="' + escapeHtml(folder.name) + '" required></label>' +
      '<label style="display:block;margin-bottom:10px;font-size:.9rem">\u05D0\u05D9\u05D9\u05E7\u05D5\u05DF' +
        '<input id="ef-icon" class="nd-field" value="' + escapeHtml(folder.icon || '\uD83D\uDCC1') + '" style="width:60px;font-size:1.2rem;text-align:center"></label>',
    onSubmit: async function() {
      var name = (document.getElementById('ef-name').value || '').trim();
      if (!name) { Toast.error('\u05E9\u05DD \u05EA\u05D9\u05E7\u05D9\u05D4 \u05D7\u05D5\u05D1\u05D4'); return; }
      var icon = (document.getElementById('ef-icon').value || '').trim() || '\uD83D\uDCC1';
      try {
        await batchUpdate(T.EXPENSE_FOLDERS, [{ id: folderId, name: name, icon: icon }]);
        writeLog('expense_folder_edited', null, { folder_id: folderId, name: name });
        Toast.success('\u05EA\u05D9\u05E7\u05D9\u05D4 \u05E2\u05D5\u05D3\u05DB\u05E0\u05D4');
        Modal.close();
        renderExpenseFolders();
      } catch (e) { Toast.error('\u05E9\u05D2\u05D9\u05D0\u05D4: ' + (e.message || '')); }
    }
  });
}

// ── Delete (deactivate) folder ──────────────────────────────
async function deleteExpenseFolder(folderId) {
  var folder = window._expenseFoldersCache.find(function(f) { return f.id === folderId; });
  if (!folder) return;
  // Check if documents linked
  var warning = '';
  try {
    var { count } = await sb.from(T.SUP_DOCS).select('id', { count: 'exact', head: true })
      .eq('expense_folder_id', folderId).eq('tenant_id', getTenantId()).eq('is_deleted', false);
    if (count > 0) warning = '\u26A0\uFE0F \u05D9\u05E9 ' + count + ' \u05DE\u05E1\u05DE\u05DB\u05D9\u05DD \u05DE\u05E9\u05D5\u05D9\u05DB\u05D9\u05DD \u05DC\u05EA\u05D9\u05E7\u05D9\u05D4 \u05D6\u05D5.\n';
  } catch (e) { /* ignore */ }
  var ok = await confirmDialog('\u05D4\u05E9\u05D1\u05EA\u05EA \u05EA\u05D9\u05E7\u05D9\u05D4',
    warning + '\u05DC\u05D4\u05E9\u05D1\u05D9\u05EA \u05D0\u05EA \u05D4\u05EA\u05D9\u05E7\u05D9\u05D4 "' + escapeHtml(folder.name) + '"?');
  if (!ok) return;
  try {
    await batchUpdate(T.EXPENSE_FOLDERS, [{ id: folderId, is_active: false }]);
    writeLog('expense_folder_deactivated', null, { folder_id: folderId, name: folder.name });
    Toast.success('\u05EA\u05D9\u05E7\u05D9\u05D4 \u05D4\u05D5\u05E9\u05D1\u05EA\u05D4');
    renderExpenseFolders();
  } catch (e) { Toast.error('\u05E9\u05D2\u05D9\u05D0\u05D4: ' + (e.message || '')); }
}

// ── Toggle active ───────────────────────────────────────────
async function _toggleFolderActive(folderId, isActive) {
  try {
    await batchUpdate(T.EXPENSE_FOLDERS, [{ id: folderId, is_active: isActive }]);
    var folder = window._expenseFoldersCache.find(function(f) { return f.id === folderId; });
    if (folder) folder.is_active = isActive;
    Toast.success(isActive ? '\u05EA\u05D9\u05E7\u05D9\u05D4 \u05D4\u05D5\u05E4\u05E2\u05DC\u05D4' : '\u05EA\u05D9\u05E7\u05D9\u05D4 \u05D4\u05D5\u05E9\u05D1\u05EA\u05D4');
    renderExpenseFolders();
  } catch (e) { Toast.error('\u05E9\u05D2\u05D9\u05D0\u05D4: ' + (e.message || '')); }
}
