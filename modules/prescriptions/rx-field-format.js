/* rx-field-format.js — M6 shared field normalization (Iron Rule 21: single source) */
(function () {
  'use strict';

  var MINUS_SIGN = ['sphere', 'cyl', 'power', 'over_refraction_power'];
  var PLUS_SIGN = ['read_add', 'int_add', 'bif_add', 'mul_add', 'add_power'];
  var SNAP_025 = MINUS_SIGN.concat(PLUS_SIGN).concat(['prism']);
  var AXIS_FIELDS = ['axis', 'k_axis'];
  var MM_FIELDS = ['pd_distance', 'pd_near', 'bc_mm', 'dia_mm', 'pupil_diameter_mm', 'axial_length_mm', 'pupil_height_mm'];
  var K_FIELDS = ['k1', 'k2', 'k_avg'];
  var VA_FIELDS = ['va_with_correction', 'va_without_correction', 'va_pinhole', 'va_over_refraction', 'bcva_binocular'];

  function snap025(n) { return Math.round(n * 4) / 4; }

  function formatField(key, raw, fromDb) {
    var s = String(raw || '').trim();
    if (!s || s === '—') return { display: '', dbValue: null, autoSigned: false };

    if (VA_FIELDS.indexOf(key) !== -1) return { display: s, dbValue: s, autoSigned: false };
    if (key === 'prism_base') return { display: s, dbValue: s, autoSigned: false };

    if (AXIS_FIELDS.indexOf(key) !== -1) {
      var ai = parseInt(s.replace(/[°\s]/g, ''), 10);
      if (isNaN(ai)) return { display: s, dbValue: null, autoSigned: false };
      ai = Math.max(0, Math.min(180, ai));
      return { display: ai + '°', dbValue: ai, autoSigned: false };
    }

    var hasExplicitSign = /^[+\-]/.test(s);
    var num = parseFloat(s.replace(/[^\d.+\-]/g, ''));
    if (isNaN(num)) return { display: s, dbValue: null, autoSigned: false };

    if (SNAP_025.indexOf(key) !== -1) num = snap025(num);

    var autoSigned = false;
    if (!fromDb && !hasExplicitSign && num !== 0) {
      if (MINUS_SIGN.indexOf(key) !== -1) {
        num = -Math.abs(num);
        autoSigned = true;
      } else if (PLUS_SIGN.indexOf(key) !== -1) {
        num = Math.abs(num);
        autoSigned = true;
      }
    }

    var dp = 2;
    var suffix = '';
    if (key === 'prism') suffix = '△';
    else if (MM_FIELDS.indexOf(key) !== -1) suffix = 'mm';

    var formatted = num.toFixed(dp);
    if (MINUS_SIGN.indexOf(key) !== -1 || PLUS_SIGN.indexOf(key) !== -1) {
      if (num > 0) formatted = '+' + formatted;
    }
    var display = formatted + suffix;

    return { display: display, dbValue: num, autoSigned: autoSigned };
  }

  function stripForEdit(key, display) {
    var s = String(display || '').trim();
    if (!s || s === '—') return '';
    s = s.replace(/[°△]/g, '').replace(/mm$/i, '').trim();
    s = s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
    return s;
  }

  function bindInput(el, key, saveCb) {
    el.addEventListener('focus', function () {
      el.value = stripForEdit(key, el.value);
    });
    function commit() {
      var result = formatField(key, el.value);
      if (result.display !== '') {
        el.value = result.display;
      }
      if (result.autoSigned) {
        el.classList.add('rx-auto-signed');
        setTimeout(function () { el.classList.remove('rx-auto-signed'); }, 1200);
      }
      if (saveCb) saveCb(result.dbValue);
    }
    el.addEventListener('blur', commit);
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); commit(); el.blur(); }
    });
  }

  window.RxFieldFormat = { formatField: formatField, stripForEdit: stripForEdit, bindInput: bindInput };
})();
