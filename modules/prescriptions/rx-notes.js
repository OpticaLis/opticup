/* rx-notes.js — M6 notes + recall axes display + health fund info + print strip */
(function () {
  'use strict';

  var AXIS_LABELS = {
    next_exam: 'בדיקה הבאה',
    health_fund_validity: 'תוקף קופ"ח',
    prescription_validity: 'תוקף מרשם',
    glasses_delivery: 'מסירת-משקפיים',
    fit_check: 'בקרת התאמה'
  };

  var TREATMENT_LABELS = {
    none: '— ללא —', myocare: 'MiyoSmart', atropine: 'אטרופין',
    ortho_k: 'אורתו-K', blue_light: 'Blue-Light', dry_eye_drops: 'טיפות'
  };

  var PRINT_BTNS = [
    { label: '📄 PDF · עברית', id: 'rx_print_heb' },
    { label: '📄 PDF · אנגלית', id: 'rx_print_eng' },
    { label: '💬 שלח ב-WhatsApp', id: 'rx_send_wa' },
    { label: '📧 שלח באימייל', id: 'rx_send_email' },
    { label: '🖨️ הדפסה פר-עין', id: 'rx_print_per_eye' },
    { label: '➕ צור הזמנה מהמרשם', id: 'rx_create_order' }
  ];

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('he-IL');
  }

  function renderRecallAxes(rx) {
    var axes = rx.recall_axes || [];
    if (!axes.length) return '<span style="color:var(--text-tertiary);font-size:11px;">אין צירי-תזכורת.</span>';
    var html = axes.map(function (a) {
      var offCls = a.is_enabled === false ? ' off' : '';
      var whenStr = a.due_at ? formatDate(a.due_at) : 'לא הופעל';
      return '<span class="rx-recall-ax' + offCls + '">' +
        '<span>' + escapeHtml(AXIS_LABELS[a.axis_kind] || a.axis_kind) + '</span>' +
        '<span class="when">' + escapeHtml(whenStr) + '</span></span>';
    }).join('');

    var treatment = rx.treatment_selected || 'none';
    html += '<span class="rx-recall-ax treatment"><span>טיפול-נבחר:</span>' +
      '<span class="when">' + escapeHtml(TREATMENT_LABELS[treatment] || treatment) + '</span></span>';
    return html;
  }

  function renderHealthFund(rx) {
    var hfName = rx.health_fund_name || '';
    var hfPlan = rx.health_fund_plan || '';
    if (!hfName) return '<span style="color:var(--text-tertiary);font-size:11px;">אין מידע קופ"ח.</span>';
    return '<div class="rx-hf-info">' +
      '<div class="hf-name">' + escapeHtml(hfName + (hfPlan ? ' · ' + hfPlan : '')) + '</div>' +
      '<div style="font-size:10px;color:var(--text-tertiary);margin-top:4px;">חישוב מדויק יבוצע בהזמנה. תצוגה-בלבד.</div>' +
    '</div>';
  }

  function renderPrintStrip(rx) {
    var isDraft = rx.status === 'draft';
    var btns = PRINT_BTNS.map(function (b) {
      return '<button' + (isDraft ? ' disabled' : '') + ' data-coming-soon="' + b.id + '">' + b.label + '</button>';
    }).join('');
    return '<div class="rx-print-strip">' +
      '<span class="lab">פעולות (זמין רק בסטטוס COMMITTED):</span>' + btns + '</div>';
  }

  function render(rx, readOnly) {
    var kind = window.RxEditor.state.kind;
    var table = kind === 'glasses' ? 'prescriptions_glasses' : 'prescriptions_contacts';

    var html = '<div class="rx-notes-grid">' +
      '<div class="nt"><label>הערות אופטומטריסט (פנימי, לא מודפס)</label>' +
        '<textarea data-field="notes_internal" data-table="' + table + '"' + (readOnly ? ' disabled' : '') + '>' +
        escapeHtml(rx.notes_internal || '') + '</textarea></div>' +
      '<div class="nt"><label>הוראות-לקוח (מודפסות במרשם)</label>' +
        '<textarea data-field="instructions_for_customer" data-table="' + table + '"' + (readOnly ? ' disabled' : '') + '>' +
        escapeHtml(rx.instructions_for_customer || '') + '</textarea></div>' +
    '</div>';

    html += '<div class="rx-bottom-strip">' +
      '<div class="rx-bs-card"><h3>תזכורות (Recall) · multi-axis</h3>' +
        '<div class="rx-recall-axes">' + renderRecallAxes(rx) + '</div></div>' +
      '<div class="rx-bs-card"><h3>קופ"ח · השתתפות</h3>' + renderHealthFund(rx) + '</div>' +
    '</div>';

    html += renderPrintStrip(rx);
    return html;
  }

  function mount(rx, readOnly) {
    if (!readOnly) {
      document.querySelectorAll('.rx-notes-grid textarea[data-field]').forEach(function (el) {
        el.addEventListener('input', function () {
          window.RxEditor.autosaveField(el.getAttribute('data-table'), rx.id, el.getAttribute('data-field'), el.value);
        });
      });
    }
    document.querySelectorAll('.rx-print-strip [data-coming-soon]').forEach(function (el) {
      if (typeof window.showComingSoon === 'function') {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          window.showComingSoon(el.getAttribute('data-coming-soon'));
        });
      }
    });
  }

  window.RxNotes = { render: render, mount: mount };
})();
