/* =============================================================================
   crm-template-lint.js — Layer D client-side placeholder lint for CRM template editor.
   Extracted from crm-messaging-templates-editor.js (M4_TEMPLATE_VALIDATION_UI_LINT,
   2026-05-19). Mirrors _shared/template-validation.ts:59 regex for consistency.
   Exposes: window.CrmTemplateLint = { KNOWN_PLACEHOLDERS, validate, levenshtein }
   ============================================================================= */
(function () {
  'use strict';

  // CANONICAL KNOWN_PLACEHOLDERS — 14 names + payment_url_<digits> family.
  // Source: roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md §1 + live DB probe
  // 2026-05-19 (14 distinct placeholders in active templates) + EF source
  // confirmation (send-message/event-variables.ts:113 — coupon_code resolved).
  // MIRRORS supabase/functions/_shared/template-validation.ts:59 regex.
  //
  // Adding a new name requires an Architect SPEC per Iron Rule 35.
  var KNOWN_PLACEHOLDERS = [
    // Lead-level (always resolvable)
    'name', 'phone', 'email', 'lead_id', 'unsubscribe_url',
    // Event-level (resolved when triggerData.eventId set; LINT does NOT check
    // context-availability — only name-existence. Layer A still fail-CLOSEs on
    // context-missing at send-time.)
    'event_name', 'event_date', 'event_time', 'event_location',
    'event_day_of_week', 'event_deposit_amount', 'event_max_attendees',
    'registration_url',
    // Coupon (P33 Fix A 2026-04-30 — auto-resolved from crm_events.coupon_code)
    'coupon_code'
  ];

  // payment_url_<digits> is a family pattern — validated separately against
  // OpticupConfig.tenant.payment_links jsonb keys.
  var PAYMENT_URL_PATTERN = /^payment_url_(\d+)$/;

  // Byte-identical to _shared/template-validation.ts:59
  var PLACEHOLDER_REGEX = /%([a-z][a-z0-9_]*)%/g;

  var LEVENSHTEIN_TYPO_THRESHOLD = 2;

  // Standard DP Levenshtein (~15 lines).
  function levenshtein(a, b) {
    if (a === b) return 0;
    var la = a.length, lb = b.length;
    if (la === 0) return lb;
    if (lb === 0) return la;
    var prev = new Array(lb + 1);
    for (var i = 0; i <= lb; i++) prev[i] = i;
    for (var i = 1; i <= la; i++) {
      var curr = [i];
      for (var j = 1; j <= lb; j++) {
        var cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      }
      prev = curr;
    }
    return prev[lb];
  }

  // validate(body, subject, opts) → { unknownPlaceholders, typos, paymentUrlErrors }
  // Pure function — does not mutate editor state (D-AUTH-7).
  function validate(body, subject, opts) {
    opts = opts || {};
    var paymentLinkKeys = opts.paymentLinkKeys || [];
    var combined = (body || '') + ' ' + (subject || '');

    // Extract every distinct placeholder name.
    var found = new Set();
    var m;
    PLACEHOLDER_REGEX.lastIndex = 0; // reset global flag
    while ((m = PLACEHOLDER_REGEX.exec(combined)) !== null) found.add(m[1]);

    var unknownPlaceholders = [];
    var typos = [];
    var paymentUrlErrors = [];

    found.forEach(function (name) {
      if (KNOWN_PLACEHOLDERS.indexOf(name) >= 0) return; // known — OK

      var pm = name.match(PAYMENT_URL_PATTERN);
      if (pm) {
        var n = pm[1];
        if (paymentLinkKeys.indexOf(n) < 0) {
          paymentUrlErrors.push({ name: name, missingKey: n });
        }
        return;
      }

      // Genuinely unknown — try Levenshtein for typo class.
      var suggestion = null;
      var bestDistance = Infinity;
      KNOWN_PLACEHOLDERS.forEach(function (known) {
        var d = levenshtein(name, known);
        if (d < bestDistance) { bestDistance = d; suggestion = known; }
      });

      if (bestDistance <= LEVENSHTEIN_TYPO_THRESHOLD) {
        typos.push({ name: name, suggestion: suggestion });
      } else {
        unknownPlaceholders.push({ name: name });
      }
    });

    return { unknownPlaceholders: unknownPlaceholders, typos: typos, paymentUrlErrors: paymentUrlErrors };
  }

  window.CrmTemplateLint = {
    KNOWN_PLACEHOLDERS: KNOWN_PLACEHOLDERS,
    validate: validate,
    levenshtein: levenshtein
  };
})();
