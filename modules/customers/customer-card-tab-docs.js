/* ============================================================
   M5 Customer Card — Tab 5 (Docs). D-T5 = customer-docs bucket
   + upload + list + open. NO delete + NO scan this SPEC.
   Storage path: customer-docs/{tenant_id}/{customer_id}/{document_id}.{ext}
   ============================================================ */
(function () {
  'use strict';

  var BUCKET = 'customer-docs';
  var MAX_MB = 10;
  var ACCEPT = ['application/pdf', 'image/jpeg', 'image/png'];
  var EXT_MAP = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' };

  var filter = 'all';   // 'all' | 'doctor_prescription' | 'external_exam' | 'health_fund' | 'other'
  var docs = [];

  function catLabel(c) {
    var m = { doctor_prescription: 'מרשם-רופא', external_exam: 'בדיקה-חיצונית', health_fund: 'קופ"ח', other: 'אחר' };
    return m[c] || c || '—';
  }
  function catPillClass(c) {
    if (c === 'doctor_prescription') return 'cust-pill-navy';
    if (c === 'external_exam') return 'cust-pill-green';
    if (c === 'health_fund') return 'cust-pill-blue';
    return 'cust-pill-coral';
  }
  function applyFilter(rows) {
    if (filter === 'all') return rows;
    return rows.filter(function (r) { return r.category === filter; });
  }

  function rowHtml(d, idx) {
    var dateStr = d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString('he-IL') : '—';
    return '<tr data-doc-id="' + escapeHtml(d.id) + '" data-path="' + escapeHtml(d.file_path) + '">' +
             '<td>' + escapeHtml(dateStr) + '</td>' +
             '<td><span class="cust-pill ' + catPillClass(d.category) + '">' + escapeHtml(catLabel(d.category)) + '</span></td>' +
             '<td>' + escapeHtml(d.original_name || '—') + '</td>' +
             '<td class="cust-row-action">' +
               '<button class="cust-doc-open" data-doc-idx="' + idx + '">פתח</button>' +
               '<button data-coming-soon="docs_delete" class="danger">🗑</button>' +
             '</td>' +
           '</tr>';
  }

  function renderTable() {
    var rows = applyFilter(docs);
    if (!rows.length) {
      return '<div class="cust-stub-panel" style="padding:24px;"><p>אין מסמכים לסינון הנוכחי.</p></div>';
    }
    return '<table class="cust-table">' +
             '<thead><tr><th>תאריך</th><th>קטגוריה</th><th>שם קובץ</th><th>פעולות</th></tr></thead>' +
             '<tbody>' + rows.map(rowHtml).join('') + '</tbody>' +
           '</table>';
  }

  function renderFilters() {
    var counts = { all: docs.length };
    ['doctor_prescription', 'external_exam', 'health_fund', 'other'].forEach(function (c) {
      counts[c] = docs.filter(function (d) { return d.category === c; }).length;
    });
    var btns = [
      { id: 'all', l: 'הכל' },
      { id: 'doctor_prescription', l: 'מרשם-רופא' },
      { id: 'external_exam', l: 'בדיקה-חיצונית' },
      { id: 'health_fund', l: 'קופ"ח' },
      { id: 'other', l: 'אחר' }
    ];
    return btns.map(function (b) {
      return '<button class="cust-filter' + (filter === b.id ? ' active' : '') + '" data-filter="' + escapeHtml(b.id) + '">' +
             escapeHtml(b.l) + ' (' + counts[b.id] + ')</button>';
    }).join('');
  }

  async function refresh(customerId) {
    var res = await DB.select('customer_documents',
      { customer_id: customerId },
      { rawFilters: function (q) { return q.eq('is_deleted', false); }, order: 'uploaded_at.desc', silent: true });
    docs = (res && res.data) || [];
    var pane = document.getElementById('cust-pane-docs');
    if (!pane) return;
    pane.querySelector('[data-docs-host]').innerHTML = renderTable();
    pane.querySelector('[data-filter-host]').innerHTML = renderFilters();
    bindEvents(pane);
    window.M5Card.trace('docs_loaded', { count: docs.length });
  }

  function chooseCategoryModal() {
    return new Promise(function (resolve) {
      var bg = document.createElement('div');
      bg.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:9999;display:flex;align-items:center;justify-content:center;';
      bg.innerHTML =
        '<div style="background:var(--bg-surface);padding:24px 28px;border-radius:10px;min-width:320px;text-align:center;">' +
          '<h3 style="margin:0 0 14px;font-size:14px;font-weight:500;">קטגוריית מסמך</h3>' +
          '<div style="display:flex;flex-direction:column;gap:8px;">' +
            '<button data-cat="doctor_prescription" class="cust-filter">מרשם-רופא</button>' +
            '<button data-cat="external_exam" class="cust-filter">בדיקה-חיצונית</button>' +
            '<button data-cat="health_fund" class="cust-filter">קופ"ח</button>' +
            '<button data-cat="other" class="cust-filter">אחר</button>' +
            '<button data-cat="" class="cust-filter" style="margin-top:6px;">ביטול</button>' +
          '</div>' +
        '</div>';
      bg.addEventListener('click', function (ev) {
        var c = ev.target && ev.target.getAttribute && ev.target.getAttribute('data-cat');
        if (c !== null) { document.body.removeChild(bg); resolve(c || null); }
      });
      document.body.appendChild(bg);
    });
  }

  async function uploadFile(file, customerId) {
    if (!file) return;
    if (ACCEPT.indexOf(file.type) === -1) { Toast.warning('סוג קובץ לא נתמך (PDF/JPG/PNG בלבד).'); return; }
    if (file.size > MAX_MB * 1024 * 1024) { Toast.warning('הקובץ גדול מ-' + MAX_MB + 'MB.'); return; }

    var category = await chooseCategoryModal();
    if (!category) return;

    var tid = getTenantId();
    var docId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : ('d_' + Date.now());
    var ext = EXT_MAP[file.type] || 'bin';
    var path = tid + '/' + customerId + '/' + docId + '.' + ext;

    window.M5Card.trace('storage_upload_called', { path: path, size: file.size });
    showLoading('מעלה…');
    try {
      var upRes = await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      window.M5Card.trace('storage_upload_resolved', {
        path: path,
        error: upRes.error ? String(upRes.error.message || upRes.error) : null
      });
      if (upRes.error) {
        Toast.error('העלאת קובץ נכשלה: ' + (upRes.error.message || 'unknown'));
        return;
      }

      window.M5Card.trace('customer_documents_insert_called', { doc_id: docId, size: file.size });
      // Schema (as of M5_SCHEMA): id, tenant_id, customer_id, category, file_path,
      // original_name, uploaded_at, uploaded_by, is_deleted, deleted_at. No size_bytes /
      // mime_type / description columns yet — see FINDINGS F-2 (column expansion follow-up).
      var insRes = await DB.insert('customer_documents', {
        id: docId,
        customer_id: customerId,
        category: category,
        file_path: path,
        original_name: file.name
      }, { silent: true });
      window.M5Card.trace('customer_documents_insert_resolved', {
        doc_id: docId,
        error: insRes.error ? String(insRes.error.message || insRes.error) : null
      });
      if (insRes.error) {
        Toast.error('רישום המסמך נכשל: ' + (insRes.error.message || 'unknown'));
        // Best-effort cleanup of the orphan storage object
        try { await sb.storage.from(BUCKET).remove([path]); } catch (_) {}
        return;
      }
      Toast.success('המסמך נשמר.');
      await refresh(customerId);
    } finally {
      hideLoading();
    }
  }

  async function openDoc(rowEl) {
    var path = rowEl.getAttribute('data-path');
    if (!path) return;
    var res = await sb.storage.from(BUCKET).createSignedUrl(path, 60);
    if (res.error) { Toast.error('פתיחת קובץ נכשלה.'); return; }
    window.open(res.data.signedUrl, '_blank');
  }

  function bindEvents(pane) {
    if (!pane) return;
    pane.querySelectorAll('[data-coming-soon]').forEach(function (el) {
      window.bindComingSoon(el, el.getAttribute('data-coming-soon'));
    });
    pane.querySelectorAll('[data-filter]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        filter = btn.getAttribute('data-filter');
        refresh(window.M5Card.state.customerId);
      });
    });
    pane.querySelectorAll('.cust-doc-open').forEach(function (btn) {
      btn.addEventListener('click', function () { openDoc(btn.closest('tr')); });
    });

    var zone = pane.querySelector('#cust-upload-zone');
    var input = pane.querySelector('#cust-upload-input');
    if (zone && input) {
      zone.addEventListener('click', function () { input.click(); });
      input.addEventListener('change', function () {
        if (input.files && input.files[0]) uploadFile(input.files[0], window.M5Card.state.customerId);
      });
      zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.classList.add('dragover'); });
      zone.addEventListener('dragleave', function () { zone.classList.remove('dragover'); });
      zone.addEventListener('drop', function (e) {
        e.preventDefault();
        zone.classList.remove('dragover');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          uploadFile(e.dataTransfer.files[0], window.M5Card.state.customerId);
        }
      });
    }
  }

  window.renderTabDocs = function (pane, S) {
    pane.innerHTML =
      '<div class="cust-table-toolbar">' +
        '<div class="cust-filters" data-filter-host>' + renderFilters() + '</div>' +
        '<div style="display:flex;gap:6px;">' +
          '<button class="cust-filter" data-coming-soon="docs_scan">📷 סרוק (בקרוב)</button>' +
        '</div>' +
      '</div>' +
      '<div data-docs-host>טוען…</div>' +
      '<div class="cust-upload-zone" id="cust-upload-zone">' +
        '<strong>📤 גרור-לכאן קובץ או לחץ להעלאה</strong> · PDF/JPG/PNG · מקסימום ' + MAX_MB + 'MB' +
        '<div style="font-size:10px;margin-top:5px;color:var(--text-secondary);">קטגוריה (חובה) · תיאור · מי-העלה + תאריך נשמרים אוטומטית</div>' +
        '<input type="file" id="cust-upload-input" accept=".pdf,.jpg,.jpeg,.png" style="display:none;">' +
      '</div>';
  };

  window.mountTabDocs = async function (pane, S) {
    bindEvents(pane);
    await refresh(S.customerId);
  };
})();
