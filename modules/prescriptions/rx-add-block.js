/* rx-add-block.js — M6 per-eye ADD block (4 ADD fields × 2 eyes + copy R→L) */
(function () {
  'use strict';

  var ADD_FIELDS = [
    { key: 'read_add', label: 'READ-add', sub: 'קריאה' },
    { key: 'int_add', label: 'INT-add', sub: 'ביניים' },
    { key: 'bif_add', label: 'BIF-add', sub: 'ביפוקל' },
    { key: 'mul_add', label: 'MUL-add', sub: 'מולטיפוקל' }
  ];

  function render(rx, readOnly) {
    var rEye = rx.eyes_r || {};
    var lEye = rx.eyes_l || {};

    var thCols = ADD_FIELDS.map(function (f) {
      return '<th>' + escapeHtml(f.label) + '<span class="sub">' + escapeHtml(f.sub) + '</span></th>';
    }).join('');

    function eyeRow(eye, data) {
      var label = eye === 'R' ? 'R · OD' : 'L · OS';
      var cls = eye === 'R' ? 'eye-cell r' : 'eye-cell l';
      var cells = ADD_FIELDS.map(function (f) {
        var val = data[f.key] != null ? String(data[f.key]) : '';
        return '<td><input data-eye="' + eye + '" data-field="' + f.key + '" value="' + escapeHtml(val) + '"' +
          ' placeholder="—"' + (readOnly ? ' disabled' : '') + ' /></td>';
      }).join('');
      return '<td class="' + cls + '">' + escapeHtml(label) + '</td>' + cells;
    }

    var copyCell = readOnly ? '<td style="background:var(--bg-surface-alt);"></td>' :
      '<td style="background:var(--bg-surface-alt);">' +
        '<button type="button" id="rx-copy-add-rl" style="background:var(--accent);color:#fff;border:0;' +
        'padding:5px 10px;border-radius:4px;font-size:10px;cursor:pointer;font-family:inherit;white-space:nowrap;">' +
        '⤵ העתק לעין שמאל</button></td>';

    return '<div class="rx-param-section" data-add-block>' +
      '<div class="ph"><span class="ttl">תוספת קריאה (ADD) · פר-עין</span>' +
      '<span class="extra">ADD נפרד לכל עין · לחץ "העתק לעין שמאל" כדי להעתיק</span></div>' +
      '<div class="rx-param-table"><table>' +
      '<thead><tr><th class="eye-col"></th>' + thCols + '<th style="background:var(--bg-surface-alt);"></th></tr></thead>' +
      '<tbody>' +
        '<tr>' + eyeRow('R', rEye) + copyCell + '</tr>' +
        '<tr>' + eyeRow('L', lEye) + '<td style="background:var(--bg-surface-alt);"></td></tr>' +
      '</tbody></table></div></div>';
  }

  function mount(rx, readOnly) {
    if (readOnly) return;
    var rEye = rx.eyes_r || {};
    var lEye = rx.eyes_l || {};

    var block = document.querySelector('[data-add-block]');
    if (!block) return;

    block.querySelectorAll('[data-eye][data-field]').forEach(function (el) {
      el.addEventListener('change', function () {
        var eye = el.getAttribute('data-eye');
        var eyeId = eye === 'R' ? rEye.id : lEye.id;
        if (!eyeId) return;
        window.RxEditor.autosaveField('prescription_glasses_eyes', eyeId, el.getAttribute('data-field'), el.value);
      });
    });

    var copyBtn = document.getElementById('rx-copy-add-rl');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        ADD_FIELDS.forEach(function (f) {
          var rInput = block.querySelector('[data-eye="R"][data-field="' + f.key + '"]');
          var lInput = block.querySelector('[data-eye="L"][data-field="' + f.key + '"]');
          if (rInput && lInput) {
            lInput.value = rInput.value;
            if (lEye.id) {
              window.RxEditor.autosaveField('prescription_glasses_eyes', lEye.id, f.key, lInput.value);
            }
          }
        });
        window.RxEditor.trace('copy_add_r_to_l');
        Toast.success('ADD הועתק מעין ימין לעין שמאל.');
      });
    }
  }

  window.RxAddBlock = { render: render, mount: mount };
})();
