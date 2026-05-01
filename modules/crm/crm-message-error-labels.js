/* =============================================================================
   crm-message-error-labels.js — Hebrew translation map for error_message
   values that appear in crm_message_log.status='failed' / 'rejected' rows.
   The operator UI (P31 commits 5-6) surfaces these to admins instead of the
   raw English error codes that come back from send-message EF.

   Public API:
     CrmMessageErrorLabels.errorLabel(rawError) -> string
       Returns Hebrew text for known error codes; falls back to the raw
       string for unknown codes (no crash, no silent swallow).

   Coverage (P31 SPEC §3.5 #25): missing_required_variable, phone_not_allowed,
   template_not_found, payment_link_missing_or_mismatch, recipient_invalid,
   make_webhook_failed, plus generic HTTP-5xx mappings via prefix matching.
   ============================================================================= */
(function () {
  'use strict';

  // Exact-match map first (most error codes are atomic strings).
  var EXACT = {
    'missing_required_variable':       'משתנה חובה חסר בתבנית',
    'phone_not_allowed':               'מספר טלפון מחוץ לרשימה המותרת',
    'template_not_found':              'תבנית הודעה לא נמצאה',
    'recipient_invalid':               'נמען לא תקין',
    'make_webhook_failed':             'תקלה זמנית במשלוח (Make)',
    'make_webhook_url_not_configured': 'הגדרות שליחה חסרות (פנה לתמיכה)',
    'make_call_exception':             'תקלה זמנית במשלוח',
    'Could not create log entry':      'תקלה בכתיבה ללוג'
  };

  // Prefix-match map second (some codes carry data after a colon).
  // Order matters: checked top-down; first hit wins.
  var PREFIX = [
    { prefix: 'missing_required_variable:',         label: 'משתנה חובה חסר' },
    { prefix: 'phone_not_allowed:',                 label: 'מספר טלפון מחוץ לרשימה המותרת' },
    { prefix: 'template_not_found:',                label: 'תבנית הודעה לא נמצאה' },
    { prefix: 'payment_link_missing_or_mismatch:',  label: 'קישור תשלום חסר או לא תואם' },
    { prefix: 'make_webhook_',                      label: 'תקלה זמנית במשלוח' },
    { prefix: 'make_call_exception:',               label: 'תקלה זמנית במשלוח' }
  ];

  function errorLabel(rawError) {
    if (rawError == null) return '';
    var s = String(rawError);
    if (!s) return '';
    if (Object.prototype.hasOwnProperty.call(EXACT, s)) return EXACT[s];
    for (var i = 0; i < PREFIX.length; i++) {
      if (s.indexOf(PREFIX[i].prefix) === 0) return PREFIX[i].label;
    }
    return s; // Unknown code → fall through with raw text (no swallow).
  }

  window.CrmMessageErrorLabels = { errorLabel: errorLabel };
})();
