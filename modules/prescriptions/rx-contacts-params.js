/* rx-contacts-params.js — M6 contacts per-eye parameter table (CL params + kerato + OR) */
(function () {
  'use strict';

  var COLS = [
    { key: 'power', label: 'POWER', sub: "דיופ'", section: 'cl' },
    { key: 'cyl', label: 'CYL', sub: 'טורית', section: 'cl' },
    { key: 'axis', label: 'AXIS', sub: '°', section: 'cl' },
    { key: 'add_power', label: 'ADD', sub: "מולטיפ'", section: 'cl' },
    { key: 'bc_mm', label: 'BC', sub: 'base curve mm', section: 'cl' },
    { key: 'dia_mm', label: 'DIA', sub: 'קוטר mm', section: 'cl' },
    { key: 'va_with_correction', label: 'VAcc', sub: '', section: 'va' },
    { key: 'va_without_correction', label: 'VAsc', sub: '', section: 'va' },
    { key: 'k1', label: 'K1', sub: '', section: 'kerato' },
    { key: 'k2', label: 'K2', sub: '', section: 'kerato' },
    { key: 'k_avg', label: 'K avg', sub: '', section: 'kerato' },
    { key: 'k_axis', label: 'K axis', sub: '', section: 'kerato' },
    { key: 'over_refraction_power', label: 'OR', sub: '', section: 'or' },
    { key: 'va_over_refraction', label: 'VA-OR', sub: '', section: 'or' }
  ];

  var SECTIONS = [
    { id: 'cl', label: 'פרמטרי עדשה', count: 6, cls: 'h-cl' },
    { id: 'va', label: 'חדות ראייה', count: 2, cls: 'h-va' },
    { id: 'kerato', label: 'קרטומטריה (קריטי)', count: 4, cls: 'h-kerato' },
    { id: 'or', label: 'Over-Refraction', count: 2, cls: 'h-or' }
  ];

  function thRow1() {
    return '<tr><th class="eye-col" rowspan="2"></th>' +
      SECTIONS.map(function (s) {
        return '<th colspan="' + s.count + '" class="' + s.cls + '">' + escapeHtml(s.label) + '</th>';
      }).join('') + '</tr>';
  }

  function thRow2() {
    return '<tr>' + COLS.map(function (c) {
      var sub = c.sub ? '<span class="sub">' + escapeHtml(c.sub) + '</span>' : '';
      return '<th>' + escapeHtml(c.label) + sub + '</th>';
    }).join('') + '</tr>';
  }

  function eyeRow(eye, eyeData, readOnly) {
    var label = eye === 'R' ? 'R · OD' : 'L · OS';
    var cls = eye === 'R' ? 'eye-cell r' : 'eye-cell l';
    var cells = '<td class="' + cls + '">' + escapeHtml(label) + '</td>';
    COLS.forEach(function (c) {
      var val = eyeData[c.key] != null ? String(eyeData[c.key]) : '';
      cells += '<td><input data-eye="' + eye + '" data-field="' + c.key + '" value="' + escapeHtml(val) + '"' +
        ' placeholder="—"' + (readOnly ? ' disabled' : '') + ' /></td>';
    });
    return '<tr>' + cells + '</tr>';
  }

  function render(rx, readOnly) {
    var rEye = rx.eyes_r || {};
    var lEye = rx.eyes_l || {};
    return '<div class="rx-param-section">' +
      '<div class="ph"><span class="ttl">פרמטרים פר-עין · עדשות-מגע</span>' +
      '<span class="extra">קרטומטריה קריטית להתאמה · OR = Over-Refraction מעל-העדשה</span></div>' +
      '<div class="rx-param-table"><table><thead>' + thRow1() + thRow2() + '</thead><tbody>' +
      eyeRow('R', rEye, readOnly) + eyeRow('L', lEye, readOnly) +
      '</tbody></table></div></div>';
  }

  function mount(rx, readOnly) {
    if (readOnly) return;
    var rEye = rx.eyes_r || {};
    var lEye = rx.eyes_l || {};
    document.querySelectorAll('.rx-param-section:not([data-add-block]) .rx-param-table [data-eye][data-field]').forEach(function (el) {
      el.addEventListener('change', function () {
        var eye = el.getAttribute('data-eye');
        var eyeId = eye === 'R' ? rEye.id : lEye.id;
        if (!eyeId) return;
        window.RxEditor.autosaveField('prescription_contacts_eyes', eyeId, el.getAttribute('data-field'), el.value);
      });
    });
  }

  window.RxContactsParams = { render: render, mount: mount };
})();
