/* rx-meta-grid.js — M6 meta grid (7 fields) for glasses + contacts */
(function () {
  'use strict';

  var EXAM_TYPE_OPTIONS = [
    { v: '', l: '—' }, { v: 'final', l: 'סופי' }, { v: 'old', l: 'ישן' },
    { v: 'subjective', l: 'סובייקטיבי' }, { v: 'objective', l: 'אובייקטיבי' }
  ];

  var _rxTypeOptions = [{ v: '', l: '—' }];
  var _typesLoaded = false;
  async function loadPrescriptionTypes() {
    if (_typesLoaded) return;
    var res = await DB.select('prescription_types', {}, { silent: true, order: 'name_he.asc' });
    if (res && res.data && res.data.length > 0) {
      _rxTypeOptions = [{ v: '', l: '—' }].concat(res.data.map(function (r) { return { v: r.id, l: r.name_he }; }));
      _typesLoaded = true;
    }
  }

  var GLASSES_FIELDS = [
    { key: 'valid_from', label: 'תאריך מרשם', type: 'date', table: 'prescriptions_glasses' },
    { key: 'exam_type', label: 'סוג בדיקה', type: 'select', table: 'prescriptions_glasses',
      options: EXAM_TYPE_OPTIONS },
    { key: 'prescription_type_id', label: 'סוג מרשם', type: 'select', table: 'prescriptions_glasses',
      optionsRef: '_rxTypeOptions'
    },
    { key: 'exam_reason', label: 'סיבת בדיקה', type: 'select', table: 'prescriptions_glasses',
      options: [
        { v: '', l: '—' }, { v: 'routine', l: 'שגרתי' }, { v: 'vision_complaint', l: 'תלונה ראייתית' },
        { v: 'new', l: 'חדש' }, { v: 'post_op', l: 'פוסט-ניתוח' }, { v: 'myopia_control', l: 'בקרת-מיופיה' }
      ]
    },
    { key: 'optometrist_id', label: 'אופטומטריסט', type: 'select', table: 'prescriptions_glasses', options: [] },
    { key: 'source', label: 'מקור הבדיקה', type: 'select', table: 'prescriptions_glasses',
      options: [
        { v: '', l: '—' }, { v: 'internal_exam', l: 'אצלנו' }, { v: 'vision_function', l: 'מתפקודי-ראייה' },
        { v: 'health_fund', l: 'קופ"ח' }, { v: 'external_optometrist', l: 'חיצוני (אופט\')' },
        { v: 'external_doctor', l: 'חיצוני (רופא)' }
      ]
    },
    { key: 'expires_at', label: 'תוקף עד', type: 'date', table: 'prescriptions_glasses' }
  ];

  var CONTACTS_FIELDS = [
    { key: 'valid_from', label: 'תאריך', type: 'date', table: 'prescriptions_contacts' },
    { key: 'exam_type', label: 'סוג בדיקה', type: 'select', table: 'prescriptions_contacts',
      options: EXAM_TYPE_OPTIONS },
    { key: 'cl_lens_type', label: 'סוג עדשה', type: 'select', table: 'prescriptions_contacts',
      options: [
        { v: '', l: '—' }, { v: 'daily_soft', l: 'יומית · רכה' }, { v: 'monthly_soft', l: 'חודשית · רכה' },
        { v: 'yearly_soft', l: 'שנתית · רכה' }, { v: 'toric', l: 'טורית' },
        { v: 'multifocal', l: 'מולטיפוקל' }, { v: 'rgp', l: 'RGP' }, { v: 'ortho_k', l: 'אורתו-K' }
      ]
    },
    { key: 'cl_replacement_period', label: 'תקופת החלפה', type: 'select', table: 'prescriptions_contacts',
      options: [
        { v: '', l: '—' }, { v: 'daily', l: 'יומית' }, { v: 'weekly', l: 'שבועית' },
        { v: 'monthly', l: 'חודשית' }, { v: 'quarterly', l: 'רבעונית' }, { v: 'yearly', l: 'שנתית' }
      ]
    },
    { key: 'cl_wear_schedule', label: 'זמן הרכבה', type: 'select', table: 'prescriptions_contacts',
      options: [
        { v: '', l: '—' }, { v: 'daily_remove_at_night', l: 'יומי (להוריד בלילה)' },
        { v: 'extended_wear', l: 'הרכבה מתמשכת' }
      ]
    },
    { key: 'optometrist_id', label: 'אופטומטריסט', type: 'select', table: 'prescriptions_contacts', options: [] },
    { key: 'expires_at', label: 'תוקף עד', type: 'date', table: 'prescriptions_contacts' }
  ];

  function cellHtml(field, rx, readOnly) {
    var val = rx[field.key] != null ? rx[field.key] : '';
    if (field.type === 'readonly') {
      return '<div class="rx-meta-cell"><label>' + escapeHtml(field.label) + '</label>' +
        '<div class="v" style="font-size:11px;padding:4px 0;font-weight:500;">' + escapeHtml(String(val || '—')) + '</div></div>';
    }
    if (field.type === 'date') {
      var dv = val ? val.substring(0, 10) : '';
      return '<div class="rx-meta-cell"><label>' + escapeHtml(field.label) + '</label>' +
        '<div class="v"><input type="date" data-field="' + field.key + '" data-table="' + field.table + '" value="' + escapeHtml(dv) + '"' +
        (readOnly ? ' disabled' : '') + ' /></div></div>';
    }
    if (field.type === 'select') {
      var fieldOpts = field.optionsRef ? _rxTypeOptions : (field.options || []);
      var opts = fieldOpts.map(function (o) {
        var sel = o.v === String(val) ? ' selected' : '';
        return '<option value="' + escapeHtml(o.v) + '"' + sel + '>' + escapeHtml(o.l) + '</option>';
      }).join('');
      return '<div class="rx-meta-cell"><label>' + escapeHtml(field.label) + '</label>' +
        '<div class="v"><select data-field="' + field.key + '" data-table="' + (field.table || '') + '"' +
        (readOnly ? ' disabled' : '') + '>' + opts + '</select></div></div>';
    }
    return '';
  }

  function renderGrid(fields, rx, readOnly) {
    return '<div class="rx-meta-grid">' + fields.map(function (f) { return cellHtml(f, rx, readOnly); }).join('') + '</div>';
  }

  function mountGrid(container, rx, readOnly) {
    if (readOnly) return;
    container.querySelectorAll('.rx-meta-grid [data-field]').forEach(function (el) {
      el.addEventListener('change', function () {
        window.RxEditor.autosaveField(el.getAttribute('data-table'), rx.id, el.getAttribute('data-field'), el.value);
      });
    });
  }

  window.RxMetaGrid = {
    loadTypes: loadPrescriptionTypes,
    render: function (rx, ro) { return renderGrid(GLASSES_FIELDS, rx, ro); },
    renderContacts: function (rx, ro) { return renderGrid(CONTACTS_FIELDS, rx, ro); },
    mount: function (rx, ro) { mountGrid(document.getElementById('rx-center'), rx, ro); },
    mountContacts: function (rx, ro) { mountGrid(document.getElementById('rx-center'), rx, ro); }
  };
})();
