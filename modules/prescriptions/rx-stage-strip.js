/* rx-stage-strip.js — M6 multi-prescription stage strip (per-visit stages)
   Correct model: ONE eye_exam per visit, MULTIPLE prescriptions under it,
   each prescription carrying its own exam_type stage. */
(function () {
  'use strict';

  var STAGES = [
    { type: 'old', label: 'ישן/קיים', icon: '📋' },
    { type: 'objective', label: 'אובייקטיבי · מכונה', icon: '🔬' },
    { type: 'subjective', label: 'סובייקטיבי · אופטומטריסט', icon: '👁' },
    { type: 'final', label: 'סופי', icon: '✅' }
  ];

  var _examId = null;
  var _stages = [];

  async function load() {
    var S = window.RxEditor.state;
    if (!S.prescription || !S.prescription.exam_id) { _examId = null; _stages = []; return; }
    _examId = S.prescription.exam_id;
    var parentTable = S.kind === 'glasses' ? 'prescriptions_glasses' : 'prescriptions_contacts';
    var eyeTable = S.kind === 'glasses' ? 'prescription_glasses_eyes' : 'prescription_contacts_eyes';
    var dataField = S.kind === 'glasses' ? 'sphere' : 'power';
    var res = await DB.select(parentTable, { exam_id: _examId }, {
      silent: true, order: 'created_at.asc',
      rawFilters: function (q) { return q.eq('is_deleted', false); }
    });
    var rxRows = (res && res.data) || [];
    var rxIds = rxRows.map(function (r) { return r.id; });
    var eyeRes = rxIds.length > 0 ? await DB.select(eyeTable, {}, {
      silent: true,
      rawFilters: function (q) { return q.in('prescription_id', rxIds).not(dataField, 'is', null); }
    }) : { data: [] };
    var rxWithData = {};
    ((eyeRes && eyeRes.data) || []).forEach(function (e) { rxWithData[e.prescription_id] = true; });
    _stages = rxRows.map(function (rx) {
      return { id: rx.id, status: rx.status, examType: rx.exam_type, examId: _examId,
               hasData: !!rxWithData[rx.id] || rx.status === 'committed' };
    });
  }

  function render() {
    var S = window.RxEditor.state;
    if (!_examId) return '';
    var html = '<div class="rx-stage-strip">';
    html += '<span class="rx-stage-label">שלבי ביקור:</span>';
    STAGES.forEach(function (st) {
      var match = _stages.filter(function (s) { return s.examType === st.type; })[0];
      var active = match && match.id === S.prescriptionId;
      var filled = match && match.hasData;
      var cls = 'rx-stage' + (active && filled ? ' active' : '') + (!filled ? ' dimmed' : '');
      var tag = !filled ? ' <span class="rx-stage-skip">(דולג)</span>' : '';
      html += '<button class="' + cls + '" data-stage-type="' + st.type + '"' +
        (match ? ' data-stage-id="' + match.id + '"' : '') + '>' +
        '<span class="ic">' + st.icon + '</span>' + escapeHtml(st.label) + tag + '</button>';
    });
    html += '<button class="rx-stage-copy" id="rx-stage-copy" title="העתק מהשלב הקודם">⤵ העתק מהשלב הקודם</button>';
    html += '<button class="rx-stage-compare" disabled title="השוואה (בקרוב)">⇄ השוואה (בקרוב)</button>';
    html += '</div>';
    return html;
  }

  function mount() {
    document.querySelectorAll('.rx-stage-strip [data-stage-type]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var stageId = btn.getAttribute('data-stage-id');
        var stageType = btn.getAttribute('data-stage-type');
        if (stageId) {
          window.RxEditor.selectPrescription(stageId);
        } else {
          createStage(stageType);
        }
      });
    });
    var copyBtn = document.getElementById('rx-stage-copy');
    if (copyBtn) copyBtn.addEventListener('click', copyFromPrevious);
  }

  async function createStage(examType) {
    var S = window.RxEditor.state;
    if (!_examId) return;
    var rxRes = await DB.rpc('create_prescription_draft', {
      p_tenant_id: getTenantId(),
      p_customer_id: S.customerId,
      p_kind: S.kind,
      p_exam_id: _examId,
      p_exam_type: examType
    }, { silent: true });
    if (rxRes.error) { Toast.error('Stage creation failed: ' + (rxRes.error.message || '')); return; }
    Toast.success('שלב נוצר.');
    window.RxEditor.trace('stage_created', { examType: examType, rxId: rxRes.data });
    await window.RxSidebar.load();
    if (rxRes.data) window.RxEditor.selectPrescription(rxRes.data);
  }

  async function copyFromPrevious() {
    var S = window.RxEditor.state;
    if (!S.prescription) return;
    var currentStage = S.prescription.exam_type;
    var stageOrder = STAGES.map(function (s) { return s.type; });
    var currentIdx = stageOrder.indexOf(currentStage);
    var prevStage = null;
    for (var i = currentIdx - 1; i >= 0; i--) {
      var m = _stages.filter(function (s) { return s.examType === stageOrder[i]; })[0];
      if (m) { prevStage = m; break; }
    }
    if (!prevStage) { Toast.info('אין שלב קודם להעתקה.'); return; }
    var eyeTable = S.kind === 'glasses' ? 'prescription_glasses_eyes' : 'prescription_contacts_eyes';
    var prevEyes = await DB.select(eyeTable, { prescription_id: prevStage.id }, { silent: true });
    if (!prevEyes || !prevEyes.data || !prevEyes.data.length) { Toast.info('אין נתונים בשלב הקודם.'); return; }
    var currR = (S.prescription.eyes_r || {}).id;
    var currL = (S.prescription.eyes_l || {}).id;
    for (var j = 0; j < prevEyes.data.length; j++) {
      var src = prevEyes.data[j];
      var targetId = src.eye === 'R' ? currR : currL;
      if (!targetId) continue;
      var changes = Object.assign({}, src);
      delete changes.id; delete changes.tenant_id; delete changes.prescription_id; delete changes.eye; delete changes.created_at; delete changes.updated_at;
      await DB.update(eyeTable, targetId, changes, { silent: true });
    }
    Toast.success('ערכים הועתקו מהשלב הקודם.');
    window.RxEditor.trace('stage_copy_from_previous');
    window.RxEditor.refresh();
  }

  window.RxStageStrip = { load: load, render: render, mount: mount };
})();
