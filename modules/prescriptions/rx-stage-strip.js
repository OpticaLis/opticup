/* rx-stage-strip.js — M6 multi-prescription stage strip (per-visit stages) */
(function () {
  'use strict';

  var STAGES = [
    { type: 'old', label: 'ישן/קיים', icon: '📋' },
    { type: 'objective', label: 'אובייקטיבי · מכונה', icon: '🔬' },
    { type: 'subjective', label: 'סובייקטיבי · אופטומטריסט', icon: '👁' },
    { type: 'final', label: 'סופי', icon: '✅' }
  ];

  var _visitDate = null;
  var _stages = [];

  async function load() {
    var S = window.RxEditor.state;
    if (!S.prescription || !S.prescription.exam_id) { _visitDate = null; _stages = []; return; }
    var examRes = await DB.select('eye_exams', { id: S.prescription.exam_id }, { single: true, silent: true });
    if (!examRes || !examRes.data) { _visitDate = null; _stages = []; return; }
    _visitDate = examRes.data.exam_date;
    var allExams = await DB.select('eye_exams', { customer_id: S.customerId }, {
      silent: true, rawFilters: function (q) { return q.eq('exam_date', _visitDate).eq('is_deleted', false); }
    });
    if (!allExams || !allExams.data) { _stages = []; return; }
    var parentTable = S.kind === 'glasses' ? 'prescriptions_glasses' : 'prescriptions_contacts';
    var examIds = allExams.data.map(function (e) { return e.id; });
    _stages = [];
    for (var i = 0; i < allExams.data.length; i++) {
      var ex = allExams.data[i];
      var rxRes = await DB.select(parentTable, { exam_id: ex.id }, { silent: true, limit: 1 });
      var rx = rxRes && rxRes.data && rxRes.data[0];
      if (rx) _stages.push({ id: rx.id, status: rx.status, examType: ex.exam_type, examId: ex.id });
    }
  }

  function render() {
    var S = window.RxEditor.state;
    if (!_examId) return '';
    var html = '<div class="rx-stage-strip">';
    html += '<span class="rx-stage-label">שלבי ביקור:</span>';
    STAGES.forEach(function (st) {
      var match = _stages.filter(function (s) { return s.examType === st.type; })[0];
      var active = match && match.id === S.prescriptionId;
      var filled = !!match;
      var cls = 'rx-stage' + (active ? ' active' : '') + (!filled ? ' dimmed' : '');
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
    document.querySelectorAll('.rx-stage-strip [data-stage-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-stage-id');
        if (id) window.RxEditor.selectPrescription(id);
      });
    });
    document.querySelectorAll('.rx-stage-strip [data-stage-type]:not([data-stage-id])').forEach(function (btn) {
      btn.addEventListener('click', function () {
        createStage(btn.getAttribute('data-stage-type'));
      });
    });
    var copyBtn = document.getElementById('rx-stage-copy');
    if (copyBtn) copyBtn.addEventListener('click', copyFromPrevious);
  }

  async function createStage(examType) {
    var S = window.RxEditor.state;
    if (!_visitDate) return;
    var newExamId = await DB.rpc('create_exam', {
      p_tenant_id: getTenantId(),
      p_customer_id: S.customerId,
      p_exam_date: _visitDate,
      p_exam_type: examType
    }, { silent: true });
    if (newExamId.error) { Toast.error('Stage creation failed'); return; }
    var rxRes = await DB.rpc('create_prescription_draft', {
      p_tenant_id: getTenantId(),
      p_customer_id: S.customerId,
      p_kind: S.kind,
      p_exam_id: newExamId.data
    }, { silent: true });
    if (rxRes.error) { Toast.error('Draft creation failed'); return; }
    Toast.success('שלב ' + examType + ' נוצר.');
    window.RxEditor.trace('stage_created', { examType: examType, rxId: rxRes.data });
    await window.RxSidebar.load();
    if (rxRes.data) window.RxEditor.selectPrescription(rxRes.data);
  }

  async function copyFromPrevious() {
    var S = window.RxEditor.state;
    if (!S.prescription) return;
    var currentIdx = -1;
    for (var i = 0; i < _stages.length; i++) {
      if (_stages[i].id === S.prescriptionId) { currentIdx = i; break; }
    }
    if (currentIdx <= 0) { Toast.info('אין שלב קודם להעתקה.'); return; }
    var prevId = _stages[currentIdx - 1].id;
    var eyeTable = S.kind === 'glasses' ? 'prescription_glasses_eyes' : 'prescription_contacts_eyes';
    var prevEyes = await DB.select(eyeTable, { prescription_id: prevId }, { silent: true });
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
