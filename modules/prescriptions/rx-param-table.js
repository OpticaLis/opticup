/* rx-param-table.js — M6 per-eye parameter table (glasses refraction + VA + PD + kerato) */
(function () {
  'use strict';

  var COLS = [
    { key: 'sphere', label: 'SPH', sub: "דיופ'", section: 'refraction' },
    { key: 'cyl', label: 'CYL', sub: "דיופ'", section: 'refraction' },
    { key: 'axis', label: 'AXIS', sub: '°', section: 'refraction' },
    { key: 'prism', label: 'PRISM', sub: "דיופ'", section: 'refraction' },
    { key: 'prism_base', label: 'BASE', sub: '', section: 'refraction', type: 'select',
      options: ['—', 'UP', 'DN', 'IN', 'OUT'] },
    { key: 'va_with_correction', label: 'VAcc', sub: 'עם תיקון', section: 'va' },
    { key: 'va_without_correction', label: 'VAsc', sub: 'ללא תיקון', section: 'va' },
    { key: 'va_pinhole', label: 'PH', sub: 'pinhole', section: 'va' },
    { key: 'pd_distance', label: 'PD-D', sub: 'מרחק', section: 'pd' },
    { key: 'pd_near', label: 'PD-N', sub: 'קריאה', section: 'pd' },
    { key: 'pupil_diameter_mm', label: 'Pupil', sub: 'קוטר mm', section: 'pd' },
    { key: 'k1', label: 'K1', sub: '', section: 'kerato' },
    { key: 'k2', label: 'K2', sub: '', section: 'kerato' },
    { key: 'k_avg', label: 'K avg', sub: '', section: 'kerato' },
    { key: 'k_axis', label: 'K axis', sub: '', section: 'kerato' },
    { key: 'axial_length_mm', label: 'אורך-גלגל', sub: 'mm', section: 'axial' },
    { key: 'pupil_height_mm', label: 'גובה', sub: 'mm', section: 'axial' }
  ];

  var SECTIONS = [
    { id: 'refraction', label: 'רפרקציה', count: 5, cls: 'h-refraction' },
    { id: 'va', label: 'חדות ראייה', count: 3, cls: 'h-va' },
    { id: 'pd', label: 'PD · אישונים', count: 3, cls: 'h-pd' },
    { id: 'kerato', label: 'קרטומטריה', count: 4, cls: 'h-kerato' },
    { id: 'axial', label: 'ביומטריה', count: 2, cls: 'h-axial' }
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
      if (c.type === 'select') {
        var opts = c.options.map(function (o) {
          var sel = (o === val || (o === '—' && !val)) ? ' selected' : '';
          return '<option value="' + (o === '—' ? '' : escapeHtml(o)) + '"' + sel + '>' + escapeHtml(o) + '</option>';
        }).join('');
        cells += '<td><select data-eye="' + eye + '" data-field="' + c.key + '"' + (readOnly ? ' disabled' : '') + '>' + opts + '</select></td>';
      } else {
        var disp = val && window.RxFieldFormat ? window.RxFieldFormat.formatField(c.key, val).display : val;
        cells += '<td><input data-eye="' + eye + '" data-field="' + c.key + '" value="' + escapeHtml(disp || val) + '"' +
          ' placeholder="—"' + (readOnly ? ' disabled' : '') + ' /></td>';
      }
    });
    return '<tr>' + cells + '</tr>';
  }

  function render(rx, readOnly) {
    var rEye = rx.eyes_r || {};
    var lEye = rx.eyes_l || {};
    return '<div class="rx-param-section">' +
      '<div class="ph"><span class="ttl">פרמטרים פר-עין · משקפיים</span>' +
      '<span class="extra">Tab בין שדות · אוטו-שמירה · ערכים שגויים מסומנים אדום</span></div>' +
      '<div class="rx-param-table"><table><thead>' + thRow1() + thRow2() + '</thead><tbody>' +
      eyeRow('R', rEye, readOnly) + eyeRow('L', lEye, readOnly) +
      '</tbody></table></div></div>';
  }

  function mount(rx, readOnly) {
    if (readOnly) return;
    var rEye = rx.eyes_r || {};
    var lEye = rx.eyes_l || {};
    document.querySelectorAll('.rx-param-table [data-eye][data-field]').forEach(function (el) {
      if (el.closest('.rx-param-section .ph')) return;
      if (el.closest('[data-add-block]')) return;
      if (el.tagName === 'SELECT') {
        el.addEventListener('change', function () {
          var eye = el.getAttribute('data-eye');
          var eyeId = eye === 'R' ? rEye.id : lEye.id;
          if (!eyeId) return;
          window.RxEditor.autosaveField('prescription_glasses_eyes', eyeId, el.getAttribute('data-field'), el.value);
        });
        return;
      }
      var fieldKey = el.getAttribute('data-field');
      window.RxFieldFormat.bindInput(el, fieldKey, function (dbVal) {
        var eye = el.getAttribute('data-eye');
        var eyeId = eye === 'R' ? rEye.id : lEye.id;
        if (!eyeId) return;
        window.RxEditor.autosaveField('prescription_glasses_eyes', eyeId, fieldKey, dbVal);
      });
    });
  }

  window.RxParamTable = { render: render, mount: mount };
})();
