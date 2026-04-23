(function () {
  'use strict';
  var EF_BASE = 'https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/event-register';
  var MAX_NOTES = 2000;

  function qs(name) {
    var m = new URLSearchParams(location.search).get(name);
    return m ? m.trim() : '';
  }
  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function formatDate(s) {
    if (!s) return '';
    var parts = String(s).slice(0, 10).split('-');
    if (parts.length !== 3) return s;
    return parts[2] + '.' + parts[1] + '.' + parts[0];
  }
  function formatTime(s) { return s ? String(s).slice(0, 5) : ''; }

  function renderError(msg) {
    el('root').innerHTML = '<div class="msg error">' + esc(msg) + '</div>' +
      '<p class="hint" style="text-align:center;color:var(--muted)">אם הקישור שלך שבור, בדוק את ההודעה האחרונה ששלחנו או פנה אלינו.</p>';
  }

  function showPopup(kind, titleHe, bodyHe) {
    var icons = {
      success: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4 10-10"/></svg>',
      warn:    '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><circle cx="12" cy="17" r="1" fill="#d97706"/><path d="M10.3 3.9L2.4 17.7a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>',
      info:    '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v5"/><circle cx="12" cy="17" r="1" fill="#2563eb"/></svg>',
      error:   '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9 9l6 6M15 9l-6 6"/></svg>'
    };
    var icon = icons[kind] || icons.info;
    var html = '<div class="overlay"><div class="popup ' + kind + '">' +
      '<div class="icon-wrap">' + icon + '</div>' +
      '<h2>' + esc(titleHe) + '</h2>' +
      '<p>' + esc(bodyHe) + '</p>' +
    '</div></div>';
    var div = document.createElement('div');
    div.innerHTML = html;
    document.body.appendChild(div.firstChild);
  }

  function renderForm(data) {
    var dateStr = formatDate(data.event_date);
    var timeStr = formatTime(data.event_time);
    var greeting = data.lead_name ? ('היי ' + data.lead_name + ',') : 'היי,';
    var fee = (data.booking_fee != null) ? Number(data.booking_fee) : 50;
    var logoHtml = data.tenant_logo_url
      ? '<div class="brand"><img src="' + esc(data.tenant_logo_url) + '" alt="' + esc(data.tenant_name || '') + '"></div>'
      : '';

    el('root').innerHTML = logoHtml +
      '<div class="hero">' +
        '<h1>אישור הגעה לאירוע</h1>' +
      '</div>' +
      '<div class="info-notice">' +
        '<p>שימו לב: כדי להבטיח לכם שירות אישי ללא המתנה, אישור ההגעה הסופי וקבלת הברקוד כרוכים בפיקדון סמלי (<strong>' + esc(String(fee)) + ' ש"ח</strong>) המתקזז במלואו מהרכישה (או מוחזר בביטול עד 48 שעות מראש).</p>' +
        '<p>איך זה עובד? לאחר שליחת הטופס, תישלח אליכם הודעה אוטומטית להשלמת השריון וקבלת הברקוד האישי באופן עצמאי.</p>' +
        '<p>לשאלות ועזרה ניתן לפנות אלינו בוואטסאפ: <a href="https://wa.me/972533645404" target="_blank" rel="noopener">053-3645404</a></p>' +
      '</div>' +
      '<p class="greeting">' + esc(greeting) + '</p>' +
      '<div class="event-card">' +
        '<div class="label">פרטי האירוע</div>' +
        '<div class="name">' + esc(data.event_name || '') + '</div>' +
        '<div class="meta">' +
          (dateStr ? '<div class="meta-row">📅 ' + esc(dateStr) + '</div>' : '') +
          (timeStr ? '<div class="meta-row">⏰ ' + esc(timeStr) + '</div>' : '') +
          (data.event_location ? '<div class="meta-row">📍 ' + esc(data.event_location) + '</div>' : '') +
        '</div>' +
      '</div>' +
      '<form id="reg-form" novalidate>' +
        '<div class="field">' +
          '<label for="arrival_time">שעת הגעה מועדפת</label>' +
          '<p class="hint">ההגעה גמישה - בחירת השעה עוזרת לנו לנהל את האירוע בצורה נוחה עבורך.</p>' +
          '<select id="arrival_time" name="arrival_time">' +
            '<option value="">-- בחר/י --</option>' +
            '<option value="09:00 - 12:00">09:00 - 12:00 (בוקר)</option>' +
            '<option value="12:00 - 14:00">12:00 - 14:00 (צהריים)</option>' +
            '<option value="09:00 - 12:00, 12:00 - 14:00">גמיש - כל השעות</option>' +
          '</select>' +
        '</div>' +
        '<div class="field">' +
          '<label for="eye_exam">בדיקת ראייה*</label>' +
          '<p class="hint">האם יש צורך בבדיקת ראייה?</p>' +
          '<select id="eye_exam" name="eye_exam">' +
            '<option value="">-- בחר/י --</option>' +
            '<option value="כן">כן, אשמח לבדיקה</option>' +
            '<option value="לא">לא, יש לי מרשם עדכני</option>' +
          '</select>' +
        '</div>' +
        '<div class="field">' +
          '<label for="notes">הערות</label>' +
          '<p class="hint">אם יש משהו שאנחנו צריכים לדעת לפני ההגעה (נגישות, העדפות וכו\') - אפשר לכתוב כאן.</p>' +
          '<textarea id="notes" name="notes" maxlength="' + MAX_NOTES + '" placeholder="לדוגמה: מעדיף מסגרות קלאסיות, מגיעה עם בן הזוג..."></textarea>' +
          '<div class="counter"><span id="notes-count">0</span> / ' + MAX_NOTES + '</div>' +
        '</div>' +
        '<button type="submit" class="submit" id="submit-btn">אישור</button>' +
      '</form>';

    var footEl = document.querySelector('.foot');
    if (footEl && data.tenant_name) footEl.textContent = '© ' + data.tenant_name;

    var notes = el('notes');
    var cnt = el('notes-count');
    if (notes && cnt) notes.addEventListener('input', function () { cnt.textContent = notes.value.length; });

    el('reg-form').addEventListener('submit', function (e) {
      e.preventDefault();
      submitForm(data);
    });
  }

  function handleResult(resp) {
    if (!resp) {
      showPopup('error', 'אירעה שגיאה', 'לא התקבלה תגובה מהשרת. נסה שוב או פנה אלינו.');
      return;
    }
    if (resp.success === true && resp.status === 'registered') {
      showPopup('success', 'ההרשמה בוצעה בהצלחה!', 'נתראה באירוע — ניתן לסגור חלון זה.');
      return;
    }
    if (resp.success === true && resp.status === 'waiting_list') {
      showPopup('warn', 'נרשמת לרשימת ההמתנה', 'האירוע מלא כרגע, אבל נעדכן אותך ברגע שיתפנה מקום.');
      return;
    }
    if (resp.error === 'already_registered') {
      showPopup('info', 'כבר נרשמת לאירוע זה', 'נתראה ביום האירוע.');
      return;
    }
    if (resp.error === 'event_not_found') {
      showPopup('error', 'אירוע לא נמצא', 'ייתכן שהאירוע נמחק או שהקישור שגוי.');
      return;
    }
    if (resp.error === 'lead_not_found') {
      showPopup('error', 'פרטי ליד לא נמצאו', 'אנא פנה אלינו ונעזור לסדר את זה.');
      return;
    }
    showPopup('error', 'אירעה שגיאה', resp.error || 'נסה שוב מאוחר יותר.');
  }

  function submitForm(ctx) {
    var btn = el('submit-btn');
    btn.disabled = true;
    btn.textContent = 'שולח...';
    var payload = {
      tenant_id: ctx.tenant_id,
      lead_id: ctx.lead_id,
      event_id: ctx.event_id,
      arrival_time: (el('arrival_time').value || '').trim(),
      eye_exam: (el('eye_exam').value || '').trim(),
      notes: (el('notes').value || '').trim()
    };
    fetch(EF_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json().catch(function () { return null; }); })
      .then(handleResult)
      .catch(function () {
        showPopup('error', 'אירעה שגיאה', 'בעיית חיבור. בדוק את האינטרנט ונסה שוב.');
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = 'אישור';
      });
  }

  function init() {
    var eventId = qs('event_id');
    var leadId = qs('lead_id');
    if (!eventId || !leadId) {
      renderError('הקישור חסר פרטים חיוניים (event_id או lead_id). פנה אלינו עם הקישור שקיבלת.');
      return;
    }
    fetch(EF_BASE + '?event_id=' + encodeURIComponent(eventId) + '&lead_id=' + encodeURIComponent(leadId))
      .then(function (r) { return r.json().catch(function () { return null; }); })
      .then(function (resp) {
        if (!resp) { renderError('לא התקבלה תגובה מהשרת.'); return; }
        if (resp.success !== true) {
          var errMap = {
            invalid_ids: 'הקישור שגוי — פרטי הזיהוי אינם חוקיים.',
            event_not_found: 'האירוע לא נמצא. ייתכן שהאירוע בוטל.',
            lead_not_found: 'פרטי הליד לא נמצאו. ייתכן שהקישור ישן מדי.'
          };
          renderError(errMap[resp.error] || ('שגיאה: ' + (resp.error || 'לא ידוע')));
          return;
        }
        resp.event_id = eventId;
        resp.lead_id = leadId;
        renderForm(resp);
      })
      .catch(function () { renderError('לא הצלחנו להתחבר לשרת. בדוק את החיבור ונסה שוב.'); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
