/* rx-sidebar.js — M6 Prescription Editor sidebar (history list + search + filters) */
(function () {
  'use strict';

  var STATUS_LABELS = { draft: 'DRAFT', committed: 'פעיל', expired: 'פג', cancelled: 'מבוטל', superseded: 'ישן' };
  var FILTER_LABELS = [
    { id: 'all', label: 'הכל' },
    { id: 'committed', label: 'פעיל' },
    { id: 'draft', label: 'DRAFT' },
    { id: 'expired', label: 'פג' }
  ];

  function formatDate(d) {
    if (!d) return '—';
    var dt = new Date(d);
    return dt.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function buildSummary(row) {
    return row.type_name_he || row.type_code || '—';
  }

  function filterRows(rows, f) {
    if (f === 'all') return rows;
    return rows.filter(function (r) { return r.status === f; });
  }

  function countByFilter(rows) {
    var c = { all: rows.length, committed: 0, draft: 0, expired: 0 };
    rows.forEach(function (r) {
      if (r.status === 'committed') c.committed++;
      else if (r.status === 'draft') c.draft++;
      else if (r.status === 'expired' || r.status === 'superseded') c.expired++;
    });
    return c;
  }

  async function load() {
    var S = window.RxEditor.state;
    var res = await DB.select('v_prescriptions_list_for_customer', { customer_id: S.customerId }, {
      silent: true,
      order: 'created_at.desc',
      rawFilters: function (q) { return q.eq('kind', S.kind); }
    });
    S.list = (res && res.data) || [];
    render();
    updateCount();
  }

  function render() {
    var S = window.RxEditor.state;
    var container = document.getElementById('rx-sidebar');
    var filtered = filterRows(S.list, S.filter);
    var counts = countByFilter(S.list);
    var searchVal = container.querySelector && container.querySelector('.rx-sb-search input')
      ? container.querySelector('.rx-sb-search input').value : '';

    var kindTitle = S.kind === 'glasses' ? 'משקפיים' : 'עדשות-מגע';
    var html =
      '<div class="rx-sb-head">' +
        '<span class="ttl">היסטוריית מרשמים · ' + escapeHtml(kindTitle) + '</span>' +
        '<button class="add-btn" id="rx-add-btn">+ מרשם</button>' +
      '</div>' +
      '<div class="rx-sb-search"><input placeholder="חיפוש לפי תאריך / סוג / אופטומטריסט..." value="' + escapeHtml(searchVal) + '" /></div>' +
      '<div class="rx-sb-filters">' +
        FILTER_LABELS.map(function (fl) {
          return '<button class="f' + (S.filter === fl.id ? ' on' : '') + '" data-filter="' + fl.id + '">' +
            escapeHtml(fl.label) + ' (' + (counts[fl.id] || 0) + ')</button>';
        }).join('') +
      '</div>' +
      '<div class="rx-sb-list">' + renderList(filtered, searchVal) + '</div>' +
      '<div class="rx-sb-footer">סה"כ: ' + S.list.length + ' מרשמים</div>';

    container.innerHTML = html;
    bindEvents(container);
  }

  function renderList(rows, searchVal) {
    var S = window.RxEditor.state;
    if (searchVal) {
      var lc = searchVal.toLowerCase();
      rows = rows.filter(function (r) {
        var haystack = (formatDate(r.created_at) + ' ' + (r.type_name_he || '') + ' ' + (r.type_code || '')).toLowerCase();
        return haystack.indexOf(lc) !== -1;
      });
    }
    if (!rows.length) return '<div style="padding:20px;text-align:center;color:var(--text-tertiary);font-size:11px;">אין מרשמים.</div>';
    return rows.map(function (r) {
      var sel = r.id === S.prescriptionId ? ' selected' : '';
      return '<div class="rx-item' + sel + '" data-id="' + escapeHtml(r.id) + '">' +
        '<div class="top">' +
          '<span class="when">' + formatDate(r.created_at) + '</span>' +
          '<span class="badge badge-' + escapeHtml(r.status || 'draft') + '">' + escapeHtml(STATUS_LABELS[r.status] || r.status || '') + '</span>' +
        '</div>' +
        '<div class="desc">' + escapeHtml(buildSummary(r)) + '</div>' +
        (r.expires_at ? '<div class="summary">תוקף: ' + formatDate(r.expires_at) + '</div>' : '') +
      '</div>';
    }).join('');
  }

  function bindEvents(container) {
    container.querySelector('#rx-add-btn').addEventListener('click', createDraft);
    container.querySelectorAll('.rx-sb-filters .f').forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.RxEditor.state.filter = btn.getAttribute('data-filter');
        render();
      });
    });
    container.querySelectorAll('.rx-item').forEach(function (el) {
      el.addEventListener('click', function () {
        window.RxEditor.selectPrescription(el.getAttribute('data-id'));
      });
    });
    var searchInput = container.querySelector('.rx-sb-search input');
    if (searchInput) {
      searchInput.addEventListener('input', function () { render(); });
    }
  }

  function highlight(id) {
    document.querySelectorAll('.rx-item').forEach(function (el) {
      el.classList.toggle('selected', el.getAttribute('data-id') === id);
    });
  }

  async function createDraft() {
    var S = window.RxEditor.state;
    window.RxEditor.trace('create_draft_start', { kind: S.kind });
    var examRes = await DB.rpc('create_exam', {
      p_tenant_id: getTenantId(),
      p_customer_id: S.customerId,
      p_exam_date: new Date().toISOString().substring(0, 10)
    }, { silent: true });
    if (examRes.error) { Toast.error('Exam creation failed'); return; }
    var res = await DB.rpc('create_prescription_draft', {
      p_tenant_id: getTenantId(),
      p_customer_id: S.customerId,
      p_kind: S.kind,
      p_exam_id: examRes.data,
      p_exam_type: 'final'
    }, { silent: true });
    if (res.error) {
      Toast.error('יצירת מרשם נכשלה: ' + (res.error.message || ''));
      return;
    }
    Toast.success('מרשם חדש נוצר (טיוטה).');
    var newId = res.data;
    window.RxEditor.trace('create_draft_done', { id: newId });
    await load();
    if (newId) window.RxEditor.selectPrescription(newId);
  }

  function updateCount() {
    var S = window.RxEditor.state;
    var el = document.getElementById('rx-count');
    if (el) {
      var kindHeb = S.kind === 'glasses' ? 'משקפיים' : 'עדשות-מגע';
      el.textContent = S.list.length + ' מרשמי-' + kindHeb + ' בהיסטוריה';
    }
  }

  window.RxSidebar = { load: load, render: render, highlight: highlight };
})();
