/* ============================================================
   M5 Customer Card — Tab 1 (Details).
   Source: state.customer (merged v_customer_for_exam + v_customer_full).
   Edit mode: header toggle → editable rows; per-field 500ms debounced
   auto-save via DB.update('customers', ...). Iron Rule 22: tenant_id filter.
   ============================================================ */
(function () {
  'use strict';

  var DEBOUNCE_MS = 500;
  var medicalSubTab = 'medical_q';   // 'medical_q' | 'diagnostics'

  // Editable field descriptors — (key, label, type, pinGated)
  var FIELDS_PERSONAL = [
    { k: 'first_name', l: 'שם פרטי', t: 'text' },
    { k: 'last_name',  l: 'שם משפחה', t: 'text' },
    { k: 'id_number',  l: 'ת"ז',      t: 'text', pinGated: true },
    { k: 'birth_date', l: 'תאריך-לידה', t: 'date' },
    { k: 'gender',     l: 'מין',       t: 'select', options: [{v:'M',l:'זכר'},{v:'F',l:'נקבה'},{v:'O',l:'אחר'}] },
    { k: 'language_code', l: 'שפה', t: 'text' }
  ];
  var FIELDS_ADDRESS = [
    { k: 'city',    l: 'עיר',     t: 'text' },
    { k: 'address', l: 'כתובת',   t: 'text' }
  ];
  var FIELDS_CONTACT = [
    { k: 'phone', l: 'נייד',   t: 'text', pinGated: true },
    { k: 'email', l: 'אימייל', t: 'email', pinGated: true }
  ];
  var FIELDS_ADDITIONAL = [
    { k: 'profession', l: 'מקצוע', t: 'text' },
    { k: 'source',     l: 'מקור',  t: 'text' }
  ];

  function fmt(val, type) {
    if (val == null || val === '') return null;
    if (type === 'date') {
      try { return new Date(val).toLocaleDateString('he-IL'); } catch (_) { return String(val); }
    }
    return String(val);
  }

  function rowDisplay(field, value, opts) {
    opts = opts || {};
    var safeLabel = escapeHtml(field.l);
    if (value == null || value === '') {
      return '<div class="cust-field-row empty" data-field="' + escapeHtml(field.k) + '">' +
               '<span class="lbl">' + safeLabel + '</span>' +
               '<span class="val">—</span>' +
             '</div>';
    }
    var formatted = fmt(value, field.t);
    return '<div class="cust-field-row" data-field="' + escapeHtml(field.k) + '">' +
             '<span class="lbl">' + safeLabel + '</span>' +
             '<span class="val">' + escapeHtml(formatted) + '</span>' +
           '</div>';
  }

  function rowEdit(field, value) {
    var safeLabel = escapeHtml(field.l);
    var safeVal = value == null ? '' : escapeHtml(String(value));
    var input;
    if (field.t === 'select') {
      var opts = (field.options || []).map(function (o) {
        var sel = (String(o.v) === String(value || '')) ? ' selected' : '';
        return '<option value="' + escapeHtml(o.v) + '"' + sel + '>' + escapeHtml(o.l) + '</option>';
      }).join('');
      input = '<select class="cust-input" data-edit-key="' + escapeHtml(field.k) + '" data-pin="' + (field.pinGated ? '1' : '0') + '">' +
              '<option value=""></option>' + opts + '</select>';
    } else if (field.t === 'date') {
      var dateVal = value ? String(value).slice(0, 10) : '';
      input = '<input type="date" class="cust-input" data-edit-key="' + escapeHtml(field.k) + '" data-pin="' + (field.pinGated ? '1' : '0') + '" value="' + escapeHtml(dateVal) + '">';
    } else {
      var inputType = field.t === 'email' ? 'email' : 'text';
      input = '<input type="' + inputType + '" class="cust-input" data-edit-key="' + escapeHtml(field.k) + '" data-pin="' + (field.pinGated ? '1' : '0') + '" value="' + safeVal + '">';
    }
    return '<div class="cust-field-row" data-field="' + escapeHtml(field.k) + '">' +
             '<span class="lbl">' + safeLabel + '</span>' +
             input +
           '</div>';
  }

  function renderFieldBlock(title, fields, customer, editing) {
    var rows = fields.map(function (f) {
      var v = customer[f.k];
      return editing ? rowEdit(f, v) : rowDisplay(f, v);
    }).join('');
    return '<div class="cust-field-block"><h3>' + escapeHtml(title) + '</h3>' + rows + '</div>';
  }

  function renderHealthFundRow(customer) {
    var name = customer.health_fund_name || '—';
    return '<div class="cust-field-block"><h3>מידע נוסף</h3>' +
             '<div class="cust-field-row"><span class="lbl">קופ"ח</span><span class="val">' + escapeHtml(name) + '</span></div>' +
             FIELDS_ADDITIONAL.map(function (f) {
               return (window.M5Card.state.editMode ? rowEdit(f, customer[f.k]) : rowDisplay(f, customer[f.k]));
             }).join('') +
           '</div>';
  }

  function renderNotesBlock(notes, noteType) {
    var filtered = (notes || []).filter(function (n) { return n.note_type === noteType; });
    if (!filtered.length) {
      return '<div class="cust-notes"><div class="cust-note-line" style="color:var(--text-tertiary);font-style:italic;">אין הערות.</div></div>';
    }
    var rows = filtered.map(function (n) {
      var ts = '';
      try { ts = new Date(n.created_at).toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: '2-digit' }); }
      catch (_) { ts = String(n.created_at); }
      return '<div class="cust-note-line"><span class="ts">' + escapeHtml(ts) + '</span> · ' +
             '<span class="actor">' + escapeHtml(n.created_by || 'system') + ':</span> ' +
             escapeHtml(n.content || '') + '</div>';
    }).join('');
    return '<div class="cust-notes">' + rows + '</div>';
  }

  function renderMedicalArea(customer, notes) {
    return '<div class="cust-medical-area">' +
             '<h3>🩺 הערות-רפואיות (פנימי — לא נשלח ללקוח)</h3>' +
             '<div class="cust-medical-tabs">' +
               '<button class="cust-medical-tab' + (medicalSubTab === 'medical_q' ? ' active' : '') + '" data-medical="medical_q">Medical Q.</button>' +
               '<button class="cust-medical-tab' + (medicalSubTab === 'diagnostics' ? ' active' : '') + '" data-medical="diagnostics">Diagnostics</button>' +
             '</div>' +
             '<div id="cust-medical-body">' + renderNotesBlock(notes, medicalSubTab) + '</div>' +
           '</div>';
  }

  function renderQueueBlock() {
    // M14 — entirely blurred + coming-soon (D-BADGES)
    return '<div class="cust-queue-block cust-blurred" data-coming-soon="queue_position">' +
             '<div>' +
               '<strong>📋 תור לבדיקת-ראיה</strong>' +
               '<div class="hint">לחץ "הוסף לתור" כשהלקוח מגיע (M14 — בקרוב)</div>' +
             '</div>' +
             '<div style="display:flex;gap:8px;align-items:center;">' +
               '<span class="cust-pill cust-pill-teal" style="font-size:13px;padding:4px 12px;">+ הוסף לתור</span>' +
             '</div>' +
           '</div>';
  }

  function renderFlagsRow(customer) {
    var isDormant = customer.lifecycle_stage === 'dormant';
    var ts = new Date().toLocaleTimeString('he-IL');
    return '<div class="cust-flags-row">' +
             '<span class="cust-flag" title="lifecycle_stage=dormant">' +
               '<span class="box' + (isDormant ? ' checked' : '') + '"></span> Inactive' +
             '</span>' +
             '<span class="cust-flag blurred" data-coming-soon="subscription">' +
               '<span class="box"></span> Subscription' +
             '</span>' +
             '<span class="cust-autosave" id="cust-autosave-ind">✓ נשמר אוטומטית · ' + escapeHtml(ts) + '</span>' +
           '</div>';
  }

  window.renderTabDetails = function (pane, S) {
    var c = S.customer || {};
    var editing = !!S.editMode;
    var birthdayTag = '<div class="cust-auto-tag">🎂 ביום-הולדת תישלח אוטומטית הודעת-WhatsApp + קופון. <strong>(עתיד — מודול-תקשורת/אוטומציות.)</strong></div>';
    pane.innerHTML =
      '<div class="cust-col-3">' +
        renderFieldBlock('פרטים אישיים', FIELDS_PERSONAL, c, editing) + birthdayTag.replace('<div class="cust-auto-tag">', '<div class="cust-auto-tag" style="margin-top:-8px;">') +
        renderFieldBlock('כתובת', FIELDS_ADDRESS, c, editing) +
        renderFieldBlock('תקשורת', FIELDS_CONTACT, c, editing) +
      '</div>' +
      '<div class="cust-col-2">' +
        renderHealthFundRow(c) +
        '<div class="cust-field-block"><h3>הערות-עסקיות</h3>' + renderNotesBlock(S.notes, 'business') + '</div>' +
      '</div>' +
      renderMedicalArea(c, S.notes) +
      renderQueueBlock() +
      renderFlagsRow(c);
  };

  window.mountTabDetails = function (pane, S) {
    // Wire coming-soon
    pane.querySelectorAll('[data-coming-soon]').forEach(function (el) {
      window.bindComingSoon(el, el.getAttribute('data-coming-soon'));
    });

    // Medical sub-tabs
    pane.querySelectorAll('.cust-medical-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        medicalSubTab = btn.getAttribute('data-medical');
        // Re-render just the medical body + tabs (cheap)
        if (window.M5Card) window.M5Card.rerenderActiveTab();
      });
    });

    // Edit-mode: wire debounced auto-save on every input
    if (!S.editMode) return;
    var debounceTimers = {};
    pane.querySelectorAll('[data-edit-key]').forEach(function (input) {
      input.addEventListener('blur', function () { triggerSave(input); });
      input.addEventListener('change', function () {
        var k = input.getAttribute('data-edit-key');
        clearTimeout(debounceTimers[k]);
        debounceTimers[k] = setTimeout(function () { triggerSave(input); }, DEBOUNCE_MS);
      });
    });
  };

  async function triggerSave(input) {
    var key = input.getAttribute('data-edit-key');
    var pinGated = input.getAttribute('data-pin') === '1';
    var rawVal = input.value;
    var newVal = rawVal === '' ? null : rawVal;
    var S = window.M5Card.state;
    var cur = S.customer ? S.customer[key] : undefined;

    // Coerce so we compare "same" correctly across types
    var same = (newVal == null && (cur == null || cur === '')) || (String(newVal) === String(cur || ''));
    if (same) return;

    window.M5Card.trace('edit_start', { field: key, from: cur, to: newVal });

    if (pinGated) {
      var ok = await new Promise(function (res) {
        confirmDialog('אימות עריכה', 'שדה רגיש (' + key + ') — לאשר את השינוי?').then(res);
      });
      if (!ok) {
        input.value = cur == null ? '' : String(cur);
        window.M5Card.trace('edit_cancelled', { field: key });
        return;
      }
    }

    window.M5Card.trace('update_sent', { field: key, value: newVal });
    var patch = {}; patch[key] = newVal;
    // DB.update signature: (table, idValue, changes, opts) — idValue is the SCALAR uuid.
    var res = await DB.update('customers', S.customerId, patch, { silent: true });
    window.M5Card.trace('update_resolved', { field: key, error: res.error ? String(res.error.message || res.error) : null });

    if (res.error) {
      Toast.error('שמירה נכשלה: ' + (res.error.message || 'unknown'));
      input.value = cur == null ? '' : String(cur);
      return;
    }
    S.customer[key] = newVal;
    var ind = document.getElementById('cust-autosave-ind');
    if (ind) ind.textContent = '✓ נשמר אוטומטית · ' + new Date().toLocaleTimeString('he-IL');
    window.M5Card.trace('autosave_indicator_updated', { field: key });
  }
})();
