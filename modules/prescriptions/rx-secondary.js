/* rx-secondary.js — M6 glasses secondary row (lens type, material, BCVA, refraction method) */
(function () {
  'use strict';

  var FIELDS = [
    { key: 'recommended_lens_type', label: 'סוג עדשה', type: 'select',
      options: [
        { v: '', l: '—' }, { v: 'single_vision', l: 'חד-מוקד' }, { v: 'progressive', l: 'פרוגרסיבי' },
        { v: 'bifocal', l: 'ביפוקל' }, { v: 'reading', l: 'קריאה' }, { v: 'computer', l: 'מחשב' }
      ]
    },
    { key: 'recommended_lens_material', label: 'חומר עדשה', type: 'select',
      options: [
        { v: '', l: '—' }, { v: 'plastic_1_50', l: 'פלסטיק 1.50' }, { v: '1_60', l: '1.60' },
        { v: '1_67', l: '1.67' }, { v: '1_74', l: '1.74' }, { v: 'polycarbonate', l: 'פוליקרבונט' }
      ]
    },
    { key: 'bcva_binocular', label: 'BCVA · דו-עיני', type: 'input' },
    { key: 'refraction_method', label: 'שיטת רפרקציה', type: 'select',
      options: [
        { v: '', l: '—' }, { v: 'phoropter', l: 'פורופטר' },
        { v: 'auto_refractor', l: 'אוטו-רפרקטור' }, { v: 'wavefront', l: 'Wavefront' }
      ]
    }
  ];

  function render(rx, readOnly) {
    var cells = FIELDS.map(function (f) {
      var val = rx[f.key] != null ? String(rx[f.key]) : '';
      var inner;
      if (f.type === 'select') {
        var opts = f.options.map(function (o) {
          var sel = o.v === val ? ' selected' : '';
          return '<option value="' + escapeHtml(o.v) + '"' + sel + '>' + escapeHtml(o.l) + '</option>';
        }).join('');
        inner = '<select data-field="' + f.key + '" data-table="prescriptions_glasses"' + (readOnly ? ' disabled' : '') + '>' + opts + '</select>';
      } else {
        inner = '<input data-field="' + f.key + '" data-table="prescriptions_glasses" value="' + escapeHtml(val) + '"' + (readOnly ? ' disabled' : '') + ' />';
      }
      return '<div class="sec-cell"><label>' + escapeHtml(f.label) + '</label><div class="v">' + inner + '</div></div>';
    }).join('');

    return '<div class="rx-secondary-row" style="grid-template-columns:repeat(4,1fr);">' + cells + '</div>';
  }

  function mount(rx, readOnly) {
    if (readOnly) return;
    document.querySelectorAll('.rx-secondary-row [data-field][data-table="prescriptions_glasses"]').forEach(function (el) {
      el.addEventListener('change', function () {
        window.RxEditor.autosaveField('prescriptions_glasses', rx.id, el.getAttribute('data-field'), el.value);
      });
    });
  }

  window.RxSecondary = { render: render, mount: mount };
})();
