/* rx-editor.js — M6 Prescription Editor bootstrap + state + type toggle */
(function () {
  'use strict';

  window.__rxTrace = window.__rxTrace || [];
  function trace(ev, payload) {
    try { window.__rxTrace.push(Object.assign({ event: ev, t: Date.now() }, payload || {})); }
    catch (_) { /* best-effort */ }
  }

  var state = {
    customerId: null,
    customer: null,
    kind: 'glasses',
    prescriptionId: null,
    prescription: null,
    list: [],
    filter: 'all'
  };

  window.RxEditor = {
    state: state,
    trace: trace,
    setKind: setKind,
    selectPrescription: selectPrescription,
    refresh: refresh,
    autosaveField: autosaveField
  };

  function parseParams() {
    var params = new URLSearchParams(window.location.search);
    return {
      customerId: params.get('customer_id'),
      prescriptionId: params.get('prescription_id'),
      kind: params.get('kind') || 'glasses'
    };
  }

  async function boot() {
    trace('boot_start');
    var p = parseParams();
    state.customerId = p.customerId;
    state.kind = p.kind;
    if (p.prescriptionId) state.prescriptionId = p.prescriptionId;

    if (!state.customerId) {
      document.getElementById('rx-lede-status').textContent = 'חסר customer_id בכתובת.';
      trace('boot_no_customer');
      return;
    }

    var attempts = 0;
    while (!getTenantId() && attempts < 30) {
      await new Promise(function (r) { setTimeout(r, 100); });
      attempts++;
    }
    if (!getTenantId()) {
      document.getElementById('rx-lede-status').textContent = 'שגיאת tenant — חזור ל-/landing.html';
      trace('boot_tenant_failed');
      return;
    }

    if (typeof loadSession === 'function') {
      try {
        var session = await loadSession();
        if (!session) {
          document.getElementById('rx-lede-status').textContent = 'אינך מחובר. חזור למסך הראשי והזן PIN.';
          trace('boot_no_session');
          return;
        }
      } catch (e) { trace('auth_session_error', { error: String(e) }); }
    }

    await loadCustomerHeader();
    if (window.RxMetaGrid && window.RxMetaGrid.loadTypes) await window.RxMetaGrid.loadTypes();
    renderTypeBar();
    await refresh();

    document.getElementById('rx-lede-status').style.display = 'none';
    document.getElementById('rx-app').style.display = 'block';
    trace('boot_ready');
  }

  async function loadCustomerHeader() {
    var res = await DB.select('v_customer_for_exam', { id: state.customerId }, { single: true, silent: true });
    if (res.error || !res.data) {
      document.getElementById('rx-lede-status').textContent = 'לקוח לא נמצא.';
      return;
    }
    state.customer = res.data;
    var c = res.data;
    var hdr = document.getElementById('rx-cust-header');
    hdr.innerHTML =
      '<div class="left">' +
        '<div class="av">' + escapeHtml(c.customer_number_display || '') + '</div>' +
        '<div><div class="nm">' + escapeHtml((c.first_name || '') + ' ' + (c.last_name || '')) + '</div>' +
        '<div class="meta">' + escapeHtml((c.phone || '') + ' · ' + (c.city || '')) + '</div></div>' +
      '</div>' +
      '<div class="right">' +
        '<span class="crumbs">כרטיס-לקוח / בדיקות-ראייה</span>' +
        '<button id="rx-back-btn">← חזור לכרטיס</button>' +
      '</div>';
    document.getElementById('rx-back-btn').addEventListener('click', function () {
      window.location.href = 'customers.html?t=' + encodeURIComponent(new URLSearchParams(window.location.search).get('t') || '') +
        '&customer_id=' + encodeURIComponent(state.customerId);
    });
  }

  function renderTypeBar() {
    var bar = document.getElementById('rx-type-bar');
    bar.innerHTML =
      '<span class="label">סוג מרשם:</span>' +
      '<button class="rx-type-btn' + (state.kind === 'glasses' ? ' active' : '') + '" data-kind="glasses"><span class="ic">&#x1F453;</span>משקפיים</button>' +
      '<button class="rx-type-btn' + (state.kind === 'contacts' ? ' active' : '') + '" data-kind="contacts"><span class="ic">&#x1F441;&#xFE0F;</span>עדשות-מגע</button>' +
      '<span class="ct" id="rx-count"></span>';
    bar.querySelectorAll('.rx-type-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { setKind(btn.getAttribute('data-kind')); });
    });
  }

  function setKind(k) {
    if (k === state.kind) return;
    state.kind = k;
    state.prescriptionId = null;
    state.prescription = null;
    renderTypeBar();
    refresh();
    trace('set_kind', { kind: k });
  }

  async function refresh() {
    await window.RxSidebar.load();
    if (state.prescriptionId) {
      await loadPrescription(state.prescriptionId);
    } else if (state.list.length > 0) {
      await selectPrescription(state.list[0].id);
    } else {
      window.RxCenter.renderEmpty();
    }
  }

  async function selectPrescription(id) {
    state.prescriptionId = id;
    await loadPrescription(id);
    window.RxSidebar.highlight(id);
    trace('select_prescription', { id: id });
  }

  async function loadPrescription(id) {
    var parentTable = state.kind === 'glasses' ? 'v_prescription_full_for_editor' : 'prescriptions_contacts';
    var eyeTable = state.kind === 'glasses' ? 'prescription_glasses_eyes' : 'prescription_contacts_eyes';
    var [rxRes, eyeRes, recallRes] = await Promise.all([
      DB.select(parentTable, { id: id }, { single: true, silent: true }),
      DB.select(eyeTable, { prescription_id: id }, { silent: true }),
      DB.select('prescription_recall_axes', { prescription_id: id }, { silent: true })
    ]);
    if (rxRes.error || !rxRes.data) {
      state.prescription = null;
      window.RxCenter.renderEmpty();
      return;
    }
    var rx = rxRes.data;
    var eyes = (eyeRes && eyeRes.data) || [];
    if (rx.status === 'draft' && eyes.length === 0) {
      var ins = await Promise.all([
        DB.insert(eyeTable, { prescription_id: id, eye: 'R', tenant_id: getTenantId() }, { silent: true }),
        DB.insert(eyeTable, { prescription_id: id, eye: 'L', tenant_id: getTenantId() }, { silent: true })
      ]);
      eyes = [ins[0].data, ins[1].data].filter(Boolean);
    }
    if (rx.status === 'draft' && !rx.exam_id) {
      var parentTbl = state.kind === 'glasses' ? 'prescriptions_glasses' : 'prescriptions_contacts';
      var examRes = await DB.rpc('create_exam', {
        p_tenant_id: getTenantId(), p_customer_id: state.customerId,
        p_exam_date: rx.valid_from || new Date().toISOString().substring(0, 10)
      }, { silent: true });
      if (examRes && examRes.data) {
        await DB.update(parentTbl, id, { exam_id: examRes.data, exam_type: rx.exam_type || 'final' }, { silent: true });
        rx.exam_id = examRes.data;
        rx.exam_type = rx.exam_type || 'final';
      }
    }
    rx.eyes_r = eyes.filter(function (e) { return e.eye === 'R'; })[0] || {};
    rx.eyes_l = eyes.filter(function (e) { return e.eye === 'L'; })[0] || {};
    rx.recall_axes = (recallRes && recallRes.data) || [];
    state.prescription = rx;
    if (window.RxStageStrip) await window.RxStageStrip.load();
    window.RxCenter.render(rx);
  }

  var _debounceTimers = {};
  function autosaveField(table, id, field, value) {
    var key = table + '.' + id + '.' + field;
    clearTimeout(_debounceTimers[key]);
    _debounceTimers[key] = setTimeout(async function () {
      var changes = {};
      changes[field] = value === '' ? null : value;
      var res = await DB.update(table, id, changes, { silent: true });
      trace('autosave', { table: table, id: id, field: field, ok: !res.error });
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
