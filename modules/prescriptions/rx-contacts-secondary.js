/* rx-contacts-secondary.js — M6 contacts secondary row (manufacturer, model, material, water, Dk/L, tint) */
(function () {
  'use strict';

  var FIELDS = [
    { key: 'manufacturer_id', label: 'חברה (יצרן)', type: 'select', options: [] },
    { key: 'model_name', label: 'שם דגם', type: 'input' },
    { key: 'cl_material', label: 'חומר', type: 'select',
      options: [
        { v: '', l: '—' }, { v: 'silicone_hydrogel', l: 'סיליקון-הידרוג\'ל' },
        { v: 'hydrogel', l: 'הידרוג\'ל' }, { v: 'rgp', l: 'RGP' }
      ]
    },
    { key: 'water_content_pct', label: 'אחוז-מים', type: 'input' },
    { key: 'dk_l_value', label: 'Dk/L', type: 'input' },
    { key: 'cl_tint', label: 'צבע (Tint)', type: 'select',
      options: [{ v: '', l: '—' }, { v: 'clear', l: 'שקוף' }, { v: 'colored', l: 'צבעוני' }]
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
        inner = '<select data-field="' + f.key + '" data-table="prescriptions_contacts"' + (readOnly ? ' disabled' : '') + '>' + opts + '</select>';
      } else {
        inner = '<input data-field="' + f.key + '" data-table="prescriptions_contacts" value="' + escapeHtml(val) + '"' + (readOnly ? ' disabled' : '') + ' />';
      }
      return '<div class="sec-cell"><label>' + escapeHtml(f.label) + '</label><div class="v">' + inner + '</div></div>';
    }).join('');

    return '<div class="rx-secondary-row" style="grid-template-columns:repeat(6,1fr);">' + cells + '</div>';
  }

  function mount(rx, readOnly) {
    if (readOnly) return;
    document.querySelectorAll('.rx-secondary-row [data-field][data-table="prescriptions_contacts"]').forEach(function (el) {
      el.addEventListener('change', function () {
        window.RxEditor.autosaveField('prescriptions_contacts', rx.id, el.getAttribute('data-field'), el.value);
      });
    });
  }

  window.RxContactsSecondary = { render: render, mount: mount };
})();
