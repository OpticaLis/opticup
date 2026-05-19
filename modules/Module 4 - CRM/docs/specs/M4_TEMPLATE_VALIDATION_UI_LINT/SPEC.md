# SPEC — M4_TEMPLATE_VALIDATION_UI_LINT

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_TEMPLATE_VALIDATION_UI_LINT/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, M4)
> **Authored on:** 2026-05-19
> **Module:** 4 — CRM
> **Phase:** FUNNEL_ROADMAP Phase 2 P2.3 Layer D — UI lint (Layer A + B + C shipped 2026-05-14 in prior SPEC `M4_TEMPLATE_VALIDATION_UNIFIED`)
> **Author signature:** Claude Code single-chat Full-Auto Pipeline (Opus author → Sonnet executor → default reviewer → default LH-Tester → Opus closure)
> **Brief origin:** `modules/Module 4 - CRM/architecture-brief/M4_TEMPLATE_VALIDATION_UNIFIED_BRIEF.md` (sealed 2026-05-19 evening)
> **Risk class:** LOW. Frontend-only. Zero DB / EF / trigger touches.

---

## 0. Pre-Authoring Reality Check

- ✅ Brief read in FULL including §4 Cross-Module Safety Audit (binding).
- ✅ `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md` §1 read — canonical placeholder universe (lead + event level).
- ✅ `supabase/functions/_shared/template-validation.ts` read in full (98 lines) — Layer A/B regex `/%([a-z][a-z0-9_]*)%/g` is the mirror this SPEC's lint MUST use.
- ✅ `supabase/functions/_shared/event-variables.ts` read (95 lines) — provides hebrewDayOfWeek + formatters; not a placeholder source.
- ✅ `supabase/functions/send-message/event-variables.ts:55,108-113` read via grep — **confirms `coupon_code` IS a real EF-resolved placeholder** (P33 Fix A 2026-04-30, after `%coupon_code%` literal reached a customer in `event_coupon_delivery_email_he`). The M4 contract §1.3 is stale on this — coupon_code is auto-filled by the EF reading `crm_events.coupon_code`, not "out-of-scope" as the contract claims.
- ✅ `modules/crm/crm-messaging-templates-editor.js` read in full (155 lines) — parent file. `saveLogicalTemplate` at lines 83-130 — lint hook lands at top of that function. `_editorState.channels[ch]` holds `.body` + `.subject` per channel.
- ✅ `modules/crm/crm-messaging-templates.js` (242 lines) — sibling sidebar/list file; NOT touched.
- ✅ `modules/crm/crm-template-section.js` — per-channel input wiring; NOT touched.
- ✅ Prior 2026-05-14 SPEC `M4_TEMPLATE_VALIDATION_UNIFIED/FOREMAN_REVIEW.md` read — 🟢 CLOSED, no lessons applicable to this SPEC (different layer; that one was Layer B engine work).
- ✅ **Live DB probe** of distinct placeholders in active templates on demo + prizma — 14 distinct names + `payment_url_50` (see §0.5 baselines). Confirms the production universe.
- ✅ Cross-Reference Check (Rule 21) — `grep -rn "validateTemplateBodyPlaceholders\|KNOWN_PLACEHOLDERS\|crm-template-lint" modules/ shared/ docs/ supabase/` → 0 hits in code (only in this Brief + Activation Prompt). Net-new — no duplicates.
- ✅ Knowledge map at cited path `roles/site-overseer/knowledge-build/funnel-q3/M1_TEMPLATE_VALIDATION_MAP.md` does NOT exist (same class of issue as the prior 2 SPECs in this session). Brief §3 + §5 D1–D7 + M4 contract §1 + live DB probe + EF source together provide complete semantic coverage. SPEC §3.5 below defines the canonical KNOWN_PLACEHOLDERS list verbatim. Logged as F-A1.

### 0.4 Live DB Baselines

| Symbol | Source | Value (captured 2026-05-19) |
|---|---|---|
| `BASE_EDITOR_LINES` | `wc -l modules/crm/crm-messaging-templates-editor.js` | 155 (target ≤ 230 after embed; absolute ≤ 350 per Iron Rule 12). If lint addition would push past 230 → extract to `modules/crm/crm-template-lint.js`. |
| `BASE_ACTIVE_PLACEHOLDERS` | live SELECT of `%[a-z][a-z0-9_]*%` patterns in active templates on demo + prizma | 14 distinct names + `payment_url_50` (`name`, `event_name`, `unsubscribe_url`, `event_date`, `event_day_of_week`, `event_time`, `event_max_attendees`, `event_deposit_amount`, `registration_url`, `phone`, `email`, `coupon_code`, `lead_id`, `event_location`) |
| `BASE_REJECTIONS_30D_COUPON_CODE` | `SELECT count(*) FROM crm_message_log WHERE error_message LIKE '%coupon_code%' AND created_at > NOW() - INTERVAL '30 days'` | 0 — confirms coupon_code is healthily resolved (not rejected) → it's a REAL placeholder |
| `BASE_PAYMENT_LINKS_KEYS` | `SELECT jsonb_object_keys(payment_links) FROM tenants WHERE slug IN ('demo','prizma')` | both tenants have only key `'50'` today. D6 lint flags `%payment_url_<N>%` where N is not in this set. |
| `BASE_RULE_21_LINT_NAMES` | grep across modules/ shared/ docs/ supabase/ for new names | 0 hits — genuinely new |
| `BASE_TEMPLATE_VALIDATION_TS_LINES` | `wc -l supabase/functions/_shared/template-validation.ts` | 98 (NOT touched by this SPEC — Layer A/B already correct) |

### 0.5 Cross-Reference Check (Iron Rule 21)

| New name | Search target | Hits | Resolution |
|---|---|---|---|
| `validateTemplateBodyPlaceholders` (function) | repo-wide JS grep | 0 | Genuinely new |
| `KNOWN_PLACEHOLDERS` (constant) | repo-wide grep | 0 | Genuinely new |
| `modules/crm/crm-template-lint.js` (optional new file — if extraction needed) | filesystem | does-not-exist | Genuinely new (gated by editor file size after embed; may not be created at all) |
| `docs/CRM_TEMPLATE_LINT.md` (optional new doc — if separate file chosen) | filesystem | does-not-exist | Genuinely new (alternative: extend existing `docs/CRM_RULE_CHAINING.md`) |

**Cross-Reference Check completed 2026-05-19 against GLOBAL_SCHEMA + FILE_STRUCTURE + grep across modules/shared/docs/supabase: 0 collisions / 0 hits.**

### 0.6 Runtime Semantics Rehearsal (per skill §1.5 Step 5.3)

This SPEC is pure JS. Mental rehearsal of the validation function across edge cases:

**Function signature:** `validateTemplateBodyPlaceholders(body, subject, opts) → { unknownPlaceholders, typos, paymentUrlErrors }`

Where:
- `body` = string (the template body — may be empty for SMS edge case which shouldn't happen).
- `subject` = string OR null (subject only meaningful for email channels).
- `opts` = `{ paymentLinkKeys: string[] }` — caller (saveLogicalTemplate) passes the current tenant's payment_links jsonb keys.

**Returns:**
- `unknownPlaceholders`: array of `{ name, suggestion?: string }` — placeholders that are NEITHER in KNOWN_PLACEHOLDERS NOR match `payment_url_<digits>`.
- `typos`: array of `{ name, suggestion }` — subset of unknownPlaceholders where Levenshtein ≤ 2 to a known name. These HARD-BLOCK save (Brief D3).
- `paymentUrlErrors`: array of `{ name, missingKey }` — `%payment_url_<N>%` where N is not in `paymentLinkKeys`. These HARD-BLOCK save (Brief D3 — clear typo class).

**Cases (rehearsed):**

| Case | Body example | unknownPlaceholders | typos | paymentUrlErrors | Save UI |
|---|---|---|---|---|---|
| Clean known | `שלום %name%, יום %event_day_of_week%` | [] | [] | [] | green ✓, Save enabled |
| Single typo | `שלום %name%, יום %event_dayof_week%` | [{name:'event_dayof_week', suggestion:'event_day_of_week'}] | [{name:'event_dayof_week', suggestion:'event_day_of_week'}] | [] | red, "Did you mean %event_day_of_week%?", Save DISABLED |
| Genuinely new | `שלום %name%, %vip_status% ניחוח` | [{name:'vip_status'}] | [] | [] | yellow, "Unknown placeholder — open Architect SPEC first?", Save disabled UNTIL user clicks override checkbox |
| payment_url valid | `%payment_url_50% ש"ח` | [] | [] | [] | green (if tenant has payment_links.50) |
| payment_url broken | `%payment_url_75%` (no .75 key) | [] | [] | [{name:'payment_url_75', missingKey:'75'}] | red, "tenant has no payment_links.75", Save DISABLED |
| Multiple unknowns | `%foo% %bar% %baz%` | 3 entries | 0 (none similar to known) | [] | yellow, soft-block + override |
| Subject only typo | body OK, subject `%registratoin_url%` | [{name:'registratoin_url', suggestion:'registration_url'}] | typo entry | [] | red banner above subject |
| Empty body+subject | both empty | [] | [] | [] | (existing "תוכן חסר" save guard fires — lint doesn't conflict) |
| URL-encoded hex %D7% | body contains `%D7%A9` (uppercase hex) | [] (regex requires lowercase first char) | [] | [] | green — Layer A regex's lowercase-first-char rule already excludes URL-encoded sequences |

**Critical:** the regex `/%([a-z][a-z0-9_]*)%/g` is byte-identical to `_shared/template-validation.ts:59`. Mirroring guarantees the lint catches the EXACT same set of names the EF scanner would later complain about.

**Save-button gate logic:**
- typos.length > 0 OR paymentUrlErrors.length > 0 → **HARD-BLOCK**: button disabled, red banner, no override.
- typos.length === 0 AND unknownPlaceholders.length > 0 AND paymentUrlErrors.length === 0 → **SOFT-BLOCK**: button disabled until user ticks an override checkbox in a confirmation modal that says "Unknown placeholder(s) — Resolver does not know these. Messages will be rejected by Layer A until an Architect SPEC adds them. Continue saving anyway?"
- All three arrays empty → **CLEAN**: button enabled, no warning UI.

Runtime semantics rehearsed: yes — function shape covers all 9 case-classes above; HARD vs SOFT branching is explicit and matches Brief D3.

### Lessons Applied from Recent FOREMAN_REVIEWs

| From | Lesson | Applied here |
|---|---|---|
| `M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX/FOREMAN_REVIEW.md` P-AUTHOR-1 (2026-05-19) | Probe `pg_proc.namespace` at SPEC author time for extension functions | N/A — this SPEC has zero DB/extension function calls. |
| `M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX/FOREMAN_REVIEW.md` P-AUTHOR-2 | Migration line-budget includes ≥ 5 lines header overhead | N/A — no migration. |
| `M4_PIXEL_VALIDATION_GAP_DASHBOARD/FOREMAN_REVIEW.md` P-AUTHOR-1 (2026-05-19) | Verify column names against live schema for any verbatim SQL | N/A — this SPEC's §3.5 has zero SQL. |
| `M4_PIXEL_VALIDATION_GAP_DASHBOARD/FOREMAN_REVIEW.md` P-AUTHOR-2 | Line-budget sub-allocation for tight criteria | APPLIED in §3 criterion 3a/3b — explicit sub-budget for editor file (≤230) AND for new lint file (≤120 if extracted). |
| `M4_PIXEL_VALIDATION_GAP_DASHBOARD` parent precedent | Iron Rule 34 triplet for UI-touching SPECs | APPLIED — §3 criterion 13a/13b/13c require Chrome MCP screenshot + runtime trace + DB-/UI-probe evidence at LH-Tester phase. |
| 2026-05-14 prior SPEC `M4_TEMPLATE_VALIDATION_UNIFIED` (Layer B) | `_shared/template-validation.ts` regex is canonical | APPLIED — §3.5 mandates byte-identical regex `/%([a-z][a-z0-9_]*)%/g` so Layer D + Layer A behave consistently. |

### D-AUTH (Foreman decisions pre-committed at author time)

- **D-AUTH-1 (KNOWN_PLACEHOLDERS list — canonical universe).** The lint's KNOWN_PLACEHOLDERS constant is **14 named placeholders** + the `payment_url_<digits>` family pattern. Per live DB probe + EF source verification (send-message/event-variables.ts:113 confirms coupon_code is real). The 14 names: `name, phone, email, lead_id, unsubscribe_url, event_name, event_date, event_time, event_location, event_day_of_week, event_deposit_amount, event_max_attendees, registration_url, coupon_code`. The Brief says "15 names" — Foreman-amended to 14 + payment_url family = "15 slots" matches the spirit. **Stale-doc note:** `M4_INFRASTRUCTURE_CONTRACT.md` §1.3 is wrong about coupon_code being out-of-scope. Logged as F-A2; recommend a separate Daniel-approved doc-only edit to refresh the contract. NOT in this SPEC's scope.

- **D-AUTH-2 (extraction decision — file size gate).** Editor file is 155 lines. The lint addition is estimated at 50–80 lines (KNOWN_PLACEHOLDERS, validate function, Levenshtein helper, soft-block modal, save-gate wiring). Target: keep editor ≤ 230 lines absolute (well under Iron Rule 12's 350 ceiling). If post-edit count > 230 → extract `modules/crm/crm-template-lint.js` (≤ 120 lines) exporting `window.CrmTemplateLint = { validate, KNOWN_PLACEHOLDERS, levenshtein }`; editor calls `CrmTemplateLint.validate(body, subject, opts)`. **Executor decides at Step 2 BEFORE writing**: if estimated insert pushes editor past 200 → extract eagerly rather than reactively-compress.

- **D-AUTH-3 (regex byte-identical to Layer A).** The lint regex MUST be `/%([a-z][a-z0-9_]*)%/g` — byte-identical to `_shared/template-validation.ts:59`. ANY deviation (e.g., allowing uppercase) is a stop-trigger.

- **D-AUTH-4 (Levenshtein threshold ≤ 2).** Per Brief D4. Implementation: standard dynamic-programming Levenshtein (~15 lines). For each unknown placeholder, compute min distance to all KNOWN_PLACEHOLDERS (NOT the payment_url family — that has its own check). If min ≤ 2, classify as typo + suggest the closest known.

- **D-AUTH-5 (payment_url validation reads tenant config from existing client cache).** Reuse `OpticupConfig.tenant.payment_links` (the global config object loaded at session start). Do NOT make a new sb.from('tenants') round-trip — that adds latency + duplicates config access. If `OpticupConfig.tenant.payment_links` is undefined → graceful fallback: skip the payment_url validation arm (don't false-positive on missing config).

- **D-AUTH-6 (soft-block override UX).** The override is a checkbox inside a small confirmation modal (NOT a full Modal.show — keep it simple). On `Save` click with unknownPlaceholders > 0 + 0 typos + 0 paymentUrlErrors, show inline checkbox in the warning banner: `[ ] I confirm this is a NEW placeholder; the resolver will need an Architect SPEC.` Save only enabled once checked.

- **D-AUTH-7 (NO refactor of saveLogicalTemplate body).** Brief D7 explicit. The lint integration is a single new top-of-function check + a single new UI-rendering call. Don't restructure the existing 47-line function; only add bracketing logic.

- **D-AUTH-8 (Iron Rule 34 — UI verification mandatory).** This SPEC modifies a browser-consumed `.js` file → Iron Rule 34 triplet at LH-Tester phase: (a) Chrome MCP screenshots of 3 states (clean / typo-blocked / soft-block-modal), (b) `window.__lintTrace` runtime trace showing validate() output per save attempt, (c) DB-/UI-probe evidence showing the templates that would be flagged.

- **D-AUTH-9 (Iron Rule 32 — Destructive Operations declared 0).** No file deletes, no DROP, no schema changes, no DML. Pure additive code.

- **D-AUTH-10 (Documentation choice — new file).** Create `docs/CRM_TEMPLATE_LINT.md` (~40-60 lines) — separate canonical doc rather than extending `docs/CRM_RULE_CHAINING.md`. Reason: rule chaining doc is about engine behavior; lint is a UI/UX guide. Different audience (Campaign Overseer / Operator) vs different audience (M4 developer). Avoid topic mixing.

### 0.7 Findings at SPEC Author Time

| # | Finding | Severity | Disposition |
|---|---|---|---|
| F-A1 | Knowledge map `M1_TEMPLATE_VALIDATION_MAP.md` at cited path does not exist (same class as prior 2 SPECs in this session). Brief was authored assuming it would be the source-of-truth. | INFO | SPEC §0 + §3.5 contain the equivalent content (canonical placeholder list + UI placement). No blocker. Foreman recommends a separate session removes the citation from Brief or finally authors the knowledge map. |
| F-A2 | `M4_INFRASTRUCTURE_CONTRACT.md` §1.3 is stale on `coupon_code` (says out-of-scope; in reality it's auto-resolved by send-message/event-variables.ts:113). 2 active templates use it; 0 rejections in 30 days. | INFO | Tracked in OPEN_TASKS at closure for a doc-only refresh — outside this SPEC's scope (the SPEC reads contract §1 but doesn't write to it). |
| F-A3 | Brief says "15 names"; Foreman-counted as 14 named + `payment_url_<N>` family. Amended in D-AUTH-1 above. Doesn't affect lint correctness — KNOWN_PLACEHOLDERS list is exact. | INFO | Resolved in SPEC body; no follow-up. |

---

## 1. Goal

Add client-side placeholder lint to the CRM template editor (`crm-messaging-templates-editor.js`) so authors get **inline visual feedback** when they save a template body or subject containing a placeholder the resolver does not know about. Behavior tier:
- HARD-BLOCK on Levenshtein-detected typos OR on `payment_url_<N>` where N is not in the tenant's `payment_links`.
- SOFT-BLOCK with override on genuinely-new placeholders.
- CLEAN green on all-known.

After this SPEC: the 2026-05-13 class of incident (758 SMS rejected because a manual-send raw body had `%registration_url%` with no event_id) becomes structurally impossible — Layer D catches it 5 seconds after the author types it, before save.

---

## 2. Background & Motivation

Layer A (`send-message` EF, pre-dispatch scanner) + Layer B (`automation-engine` engine.ts, pre-enqueue scanner) + Layer C (`_shared/template-validation.ts`, canonical regex+helper) all shipped 2026-05-14 in prior SPEC `M4_TEMPLATE_VALIDATION_UNIFIED`. They fail-CLOSED correctly. But the validation universe is currently checked SERVER-SIDE only — the author writing the template doesn't see the warning until Layer A rejects at send-time, hours later, after `crm_message_log.error_message` rows accumulate.

Layer D — **UI editor lint** — closes the upstream loop. Same regex, client-side, save-time.

The 2026-05-13 incident:
- Operator authored a manual-send broadcast body containing `%registration_url%`.
- `event_id` was NULL on the broadcast (it was a tier-2 lead-list send, not event-scoped).
- `injectAutoUrls` skipped the URL-building branch → `%registration_url%` survived substitution.
- Universal scanner (Layer A) fail-CLOSED → 758 messages rejected.
- Author found out the next morning by checking `crm_message_log.error_message`.

This SPEC ships Layer D so the author would have seen a red warning the moment they clicked Save: "Did you mean %registration_url% (requires event_id — broadcast doesn't have one)?" or "Unknown placeholder %registration_url%, open Architect SPEC?" — either path saves the 758-rejection cycle.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|----------------|----------------|
| 1 | Branch state | On `develop`, scope-clean at SPEC close | `git status --short` shows only pre-existing-from-prior-sessions paths |
| 2 | Commits produced | 3 commits: C1 (SPEC seal) + C2 (lint code + UI + docs) + C3 (retro). Reviewer + LH-Tester + Foreman each add their own = 6 total in range. ±1 acceptable. | `git log {SPEC_SEAL}..HEAD --oneline \| wc -l` → 3–5 from Executor; 6–8 total |
| 3a | Editor file final line count | ≤ 230 (was 155; +75 budget) | `wc -l modules/crm/crm-messaging-templates-editor.js` ≤ 230 |
| 3b | Lint extraction (conditional) — if editor would exceed 230 | new file `modules/crm/crm-template-lint.js` ≤ 120 lines | `wc -l modules/crm/crm-template-lint.js` ≤ 120 (only if file exists) |
| 4 | `KNOWN_PLACEHOLDERS` constant contains exactly 14 names from D-AUTH-1 | array length 14 | grep + JS eval |
| 5 | Lint regex byte-identical to `_shared/template-validation.ts:59` | `/%([a-z][a-z0-9_]*)%/g` | grep |
| 6 | `validateTemplateBodyPlaceholders(body, subject, opts)` function exists | exposed via `window.CrmTemplateLint.validate` OR equivalent | grep |
| 7 | Levenshtein helper present with threshold ≤ 2 | function exists; threshold constant set to 2 | grep |
| 8 | Payment URL validator reads `OpticupConfig.tenant.payment_links` (no new DB round-trip) | code path verified | grep |
| 9a | Save-button gate — HARD-BLOCK on typo | when typos.length > 0, save button disabled, red banner shown | Chrome MCP test |
| 9b | Save-button gate — SOFT-BLOCK on genuinely-new | when unknownPlaceholders > 0 + 0 typos, save disabled until override checkbox checked | Chrome MCP test |
| 9c | Save-button gate — CLEAN passes through | when all 3 arrays empty, save runs normally | Chrome MCP test |
| 10 | Subject field linted when present (email templates) | code path runs validate() on subject too | grep + Chrome MCP test |
| 11a | "Did you mean?" suggestion for `event_dayof_week` → `event_day_of_week` | Levenshtein=1, suggested | Chrome MCP test |
| 11b | "Did you mean?" suggestion for `registratoin_url` → `registration_url` | Levenshtein=2, suggested | Chrome MCP test |
| 12 | URL-encoded `%D7%A9` does NOT trigger warning (uppercase-first-char rule) | regex excludes | unit-level reasoning + grep |
| 13a | Iron Rule 34 — Chrome MCP screenshots (≥ 3 — clean / typo / new) | 3 PNG files in `artifacts/` | LH-Tester writes paths to TEST_REPORT |
| 13b | Iron Rule 34 — `window.__lintTrace` runtime trace | JSON object with per-save attempt: `{ body, subject, result }` records | LH-Tester captures via `evaluate_script` |
| 13c | Iron Rule 34 — DB/UI probe evidence | for each Chrome MCP state, the displayed warning text + Save-button disabled-attribute state | LH-Tester pastes 3 evidence blocks |
| 14 | `tests/smoke/baseline.test.mjs` extended | 1 new test case asserting `crm-template-lint` exposure on ERP `crm.html` page load (loose: assertion is that the global `window.CrmTemplateLint` (or in-editor lint function) is reachable in a JSDOM-style or curl-and-grep check) | smoke 8/8 OR 7/7 if Executor judges the smoke harness can't easily mount JSDOM |
| 15 | New doc `docs/CRM_TEMPLATE_LINT.md` exists | ≤ 60 lines documenting the lint behavior + 3 UI states + KNOWN_PLACEHOLDERS list | `wc -l` |
| 16 | Iron Rule 31 integrity gate passes at every commit | exit 0 or 2 | pre-commit hook |
| 17 | Iron Rule 32 destructive-ops gate | declared 0 ops; hook accepts clean | pre-commit hook + visual confirm §11 |
| 18 | Brief §4 Cross-Module Safety Audit holds | no §4.2 touch | Reviewer reads `git diff` |
| 19 | `_shared/template-validation.ts` UNCHANGED | byte-identical to current HEAD | `git diff` empty |
| 20 | Any `supabase/functions/**` UNCHANGED | byte-identical | `git diff` empty |
| 21 | Smoke 7/7 PASS (or 8/8 if criterion 14 adds a test) | all passing | LH-Tester |
| 22 | Cross-module audit: no other module touched | only modules/crm/ + docs/ + tests/smoke/ in diff | `git diff --name-only` |

### 3.5 Verbatim KNOWN_PLACEHOLDERS list + lint function shape

The Executor implements the lint with the canonical universe FROZEN at this list (per D-AUTH-1 — Foreman-amended from live DB probe):

```js
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
```

**Function shape:**

```js
function validateTemplateBodyPlaceholders(body, subject, opts) {
  opts = opts || {};
  var paymentLinkKeys = opts.paymentLinkKeys || [];
  var combined = (body || '') + ' ' + (subject || '');
  
  // 1. Extract every distinct placeholder name.
  var found = new Set();
  var m;
  // Reset regex state for global flag
  PLACEHOLDER_REGEX.lastIndex = 0;
  while ((m = PLACEHOLDER_REGEX.exec(combined)) !== null) found.add(m[1]);
  
  // 2. Classify each.
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
      // else: payment_url_N is valid — OK
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
```

**Levenshtein helper (standard DP, ~15 lines):**

```js
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
```

**Save-button gate (inside `saveLogicalTemplate` at top, before any sb.from() call):**

```js
// Layer D lint — added by M4_TEMPLATE_VALIDATION_UI_LINT (2026-05-19).
// Run AFTER name/channel/slug guards but BEFORE building ops[].
var paymentLinkKeys = (window.OpticupConfig && OpticupConfig.tenant && OpticupConfig.tenant.payment_links)
  ? Object.keys(OpticupConfig.tenant.payment_links)
  : [];
var lintErrors = { unknownPlaceholders: [], typos: [], paymentUrlErrors: [] };
_ctx.CHANNELS.forEach(function (ch) {
  var cs = _editorState.channels[ch];
  if (!cs.exists) return;
  var r = validateTemplateBodyPlaceholders(cs.body || '', cs.subject || null,
    { paymentLinkKeys: paymentLinkKeys });
  Array.prototype.push.apply(lintErrors.unknownPlaceholders, r.unknownPlaceholders);
  Array.prototype.push.apply(lintErrors.typos, r.typos);
  Array.prototype.push.apply(lintErrors.paymentUrlErrors, r.paymentUrlErrors);
});

// Trace for Iron Rule 34 verification (D-AUTH-8).
window.__lintTrace = window.__lintTrace || [];
window.__lintTrace.push({ at: Date.now(), result: lintErrors });

// HARD-BLOCK: typos or payment_url errors.
if (lintErrors.typos.length > 0 || lintErrors.paymentUrlErrors.length > 0) {
  renderLintBanner(lintErrors, 'hard');
  _ctx.toast('error', 'בעיות באימות placeholders — תקן לפני שמירה');
  return;
}
// SOFT-BLOCK: unknowns require override (modal confirmation).
if (lintErrors.unknownPlaceholders.length > 0) {
  renderLintBanner(lintErrors, 'soft');
  // The renderLintBanner sets up an override checkbox; save only resumes
  // when the operator clicks it AND re-clicks Save. For this initial
  // gate-check, return; the override path re-enters saveLogicalTemplate
  // with a sentinel flag (executor's choice of mechanism).
  if (!_editorState._lintOverrideAcknowledged) return;
}
// CLEAN — proceed with existing save flow below.
// ... existing ops[] building and Promise.allSettled() block ...
```

**`renderLintBanner` is a 20-30 line helper that builds an inline `<div class="bg-red-50 ..." OR "bg-amber-50 ...">` listing each error type with Hebrew labels.** Renders below the textareas. Cleared on next save attempt (cleanup discipline).

### 3.6 Documentation deliverable

Create `docs/CRM_TEMPLATE_LINT.md` (≤ 60 lines) with these sections:
- §1 What it does (one paragraph).
- §2 KNOWN_PLACEHOLDERS list (14 + payment_url family).
- §3 Three UI states + screenshots paths.
- §4 Adding a new placeholder (steps for Daniel / Architect — open SPEC, add to resolver in `_shared/event-variables.ts` and `automation-engine/prepare-plan.ts`, then add to KNOWN_PLACEHOLDERS).
- §5 Cross-refs: M4 contract §1, `_shared/template-validation.ts`, this SPEC.

---

## 4. Autonomy Envelope

### CAN do autonomously

- Read any file in repo.
- Modify exactly these files:
  - `modules/crm/crm-messaging-templates-editor.js` (MODIFIED) — line additions per §3.5 above.
  - `modules/crm/crm-template-lint.js` (OPTIONAL NEW — only if editor would exceed 230 lines, gated by D-AUTH-2).
  - `crm.html` (MODIFIED — only if the optional lint file is extracted: 1-line `<script>` insert immediately after `crm-messaging-templates-editor.js` tag).
  - `tests/smoke/baseline.test.mjs` (MODIFIED — 1 new test case per criterion 14).
  - `docs/CRM_TEMPLATE_LINT.md` (NEW — per criterion 15).
- Use `window.OpticupConfig.tenant.payment_links` — confirmed at `tenants.payment_links` JSONB load. No new round-trip.
- Stage by explicit filename; `git diff --cached --name-only` before every commit.

### MUST STOP

- Editor file would exceed 230 lines AND extraction to `crm-template-lint.js` would also exceed 120 lines → STOP, escalate (different design needed).
- Need to modify ANY file outside the 5 declared.
- Need to touch `_shared/template-validation.ts` (Brief §4.2 forbids).
- Need to touch ANY EF source.
- Need to modify any DB schema, table, trigger, RLS, or policy.
- Need to add ANY new placeholder to the resolver (Iron Rule 35).
- Iron Rule 31 fails (exit 1).
- Iron Rule 32 fires unexpectedly.
- Smoke regresses (any of the 7 fails).

### Bounded handling of EXPECTED deviations

- **Editor file post-edit reaches 200-230 lines** → no extraction; OK. Document the decision in EXECUTION_REPORT §3.
- **Editor file post-edit > 230** → extract to `crm-template-lint.js` BEFORE finalizing the commit. Document the trigger + the chosen extraction split.
- **smoke harness can't easily mount JSDOM to test the lint** → criterion 14 may be relaxed to a `grep`-based assertion ("the lint module is loaded by crm.html and exposes the documented API surface") rather than full execution. Executor decides + documents.
- **OpticupConfig.tenant.payment_links is undefined** → graceful skip of payment_url validation arm (don't false-positive). Already handled in D-AUTH-5.

---

## 5. Stop-Triggers (extended)

In addition to CLAUDE.md §9 + Brief §8:

1. Lint regex is NOT byte-identical to `_shared/template-validation.ts:59` → STOP (D-AUTH-3 violation).
2. `validateTemplateBodyPlaceholders` mutates editor state → STOP (it must be pure).
3. Save-gate logic accidentally short-circuits existing name/channel/slug guards → STOP (D-AUTH-7).
4. Levenshtein threshold differs from 2 → STOP (Brief D4).
5. KNOWN_PLACEHOLDERS list differs from the 14 names in D-AUTH-1 → STOP.

---

## 6. Pipeline

1. **Foreman (Opus)** authors this SPEC.md (DONE).
2. **Executor (Sonnet)** implements:
   - Step 1.5 pre-flight: confirm baselines from §0.4; re-grep for KNOWN_PLACEHOLDERS/validateTemplateBodyPlaceholders to confirm still 0 hits.
   - C1 already committed (this SPEC.md).
   - C2: write lint code + UI + docs. Commit.
   - C3: write EXECUTION_REPORT + FINDINGS. Commit.
3. **Reviewer (default)** validates against §3 + §5 + Brief §4 + Iron Rules 12/21/22/23/31/32/34/35. Writes REVIEW.md.
4. **Localhost-Tester (default)** runs smoke + Chrome MCP triplet (3 states: clean / typo / new). Writes TEST_REPORT.md with Iron Rule 34 artifacts.
5. **Foreman closes (Opus)** with FOREMAN_REVIEW + 4 skill improvements + memory update + FUNNEL_ROADMAP row.

---

## 7. Out of Scope

- All Edge Functions (`fb-capi-dispatch`, `pixel-fired`, `automation-engine`, `dispatch-queue`, `send-message`, `lead-intake`, `submit-lead`, `pin-auth`, `quick-register`).
- `_shared/template-validation.ts` (Layer A/B/C — already correct).
- `_shared/event-variables.ts` (helper file — not a lint source).
- All DB schema, tables, triggers, RLS, GRANTs, policies.
- Adding new placeholders to the resolver (Iron Rule 35).
- Whatsapp template support (zero rows; not needed today).
- Modifying `M4_INFRASTRUCTURE_CONTRACT.md` (separate session per F-A2).
- Modifying `crm-messaging-templates.js` (sibling sidebar/list file — not editor).
- Modifying `crm-template-section.js` (per-channel input wiring).
- Modifying any other M4 file beyond the 5 declared.
- Auto-fix / quick-fix actions (just suggest + let operator fix).
- Real-time linting on every keystroke (Brief implicitly: save-time only).

---

## 8. Expected Final State

| File | Action | Expected size |
|---|---|---|
| `modules/crm/crm-messaging-templates-editor.js` | MODIFIED | 155 → ≤ 230 lines (~+45-75) |
| `modules/crm/crm-template-lint.js` | OPTIONAL NEW | ≤ 120 lines if created |
| `crm.html` | OPTIONAL MODIFIED | +1 line script tag (only if optional lint file created) |
| `docs/CRM_TEMPLATE_LINT.md` | NEW | ≤ 60 lines |
| `tests/smoke/baseline.test.mjs` | MODIFIED | +1 test case |
| `modules/Module 4 - CRM/docs/specs/M4_TEMPLATE_VALIDATION_UI_LINT/SPEC.md` | NEW (this) | this file |
| `.../EXECUTION_REPORT.md` | NEW (Executor) | ~140 lines |
| `.../FINDINGS.md` | NEW (Executor) | ~25 lines |
| `.../REVIEW.md` | NEW (Reviewer) | ~100 lines |
| `.../TEST_REPORT.md` | NEW (LH-Tester) | ~120 lines + 3 PNG artifacts in `artifacts/` |
| `.../FOREMAN_REVIEW.md` | NEW (Foreman closure) | ~250 lines |

**Memory update at closure:**
- `project_fb_capi_p21_state.md` OR a new note — record that Layer D (UI lint) is now live; FUNNEL Phase 2 P2.3 fully closed (Layers A+B+C+D all shipped).

**Git state:**
- 6-8 commits in range from this SPEC seal.
- Working tree scope-clean.
- No push to main.

---

## 9. Rollback Plan

Pure JS revert. No DB, no EF, no triggers, no schema.

**If C2 (lint code + UI + docs) is bad:**
```
git revert <c2_commit_hash>
```
Restores editor + (deletes lint file if extracted) + removes docs + reverts crm.html script tag + reverts smoke test addition. Atomic.

Working tag `pre-template-lint-start` at SPEC start (Executor creates).

No DB cleanup needed — this SPEC never writes to DB.

---

## 10. Commit Plan

- **C1** (already done — this SPEC.md): `chore(spec): seal M4_TEMPLATE_VALIDATION_UI_LINT — Layer D save-time lint`
- **C2**: `feat(m4): M4_TEMPLATE_VALIDATION_UI_LINT — placeholder lint + save gate + docs`
  - Files: editor + (optional lint file + crm.html if extracted) + docs + smoke test.
- **C3**: `chore(spec): M4_TEMPLATE_VALIDATION_UI_LINT — Executor retrospective`
  - Files: EXECUTION_REPORT.md + FINDINGS.md.

Reviewer + LH-Tester + Foreman each add their commit.

---

## 11. Destructive Operations

**Count: 0.**

Per Iron Rule 32, the gate `destructive-ops-declared.mjs` scans for: file deletes, `git rm`, mass renames, `git rebase`, `git reset --hard`, `git push --force`, `DROP TABLE`, `DROP COLUMN`, `DROP POLICY`, `TRUNCATE`, `ALTER TABLE ... DROP`, DML mass-delete, CLAUDE.md/SKILL.md section deletion, main-branch modification.

**This SPEC has none of these.** All work additive:
- New JS code inside an existing function + (optional) new file.
- New doc file.
- New test case (additive — does not delete or modify existing tests).
- 1-line script-tag addition to `crm.html` (additive).

If the Executor encounters any need for a destructive op → STOP, escalate.

---

## 12. Cross-References

- **Brief:** `modules/Module 4 - CRM/architecture-brief/M4_TEMPLATE_VALIDATION_UNIFIED_BRIEF.md` (sealed 2026-05-19 evening).
- **Layer A/B/C prior SPEC:** `modules/Module 4 - CRM/docs/specs/M4_TEMPLATE_VALIDATION_UNIFIED/` (closed 🟢 2026-05-14).
- **Canonical regex source:** `supabase/functions/_shared/template-validation.ts:59`.
- **Contract:** `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md` §1 (with F-A2 caveat about coupon_code staleness).
- **Coupon_code resolver source:** `supabase/functions/send-message/event-variables.ts:108-113`.
- **Stale knowledge map citation:** `roles/site-overseer/knowledge-build/funnel-q3/M1_TEMPLATE_VALIDATION_MAP.md` (does NOT exist; F-A1).
- **Recent FOREMAN_REVIEW lessons:** `M4_PIXEL_VALIDATION_GAP_DASHBOARD/FOREMAN_REVIEW.md` + `M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX/FOREMAN_REVIEW.md` (both 2026-05-19).
- **Iron Rules:** 12, 21, 22, 23, 31, 32, 34, 35.
- **Memory:** `project_fb_capi_p21_state.md` (will be updated at closure to note Layer D shipped).

---

## 13. Author Notes

This SPEC closes the upstream end of the validation chain — the only end that wasn't validated yet.

After this lands: FUNNEL Phase 2 is FULLY closed (all 4 SPECs — P2.1 substrate + P2.2 dashboard + P2.3 template validation A+B+C+D + P2.4 purchase events). The 2026-05-13 class of incident (758 SMS rejected because operator typed a placeholder the resolver didn't know) is structurally hard to repeat — Layer D catches it at save-time, before the message ever reaches the queue.

**Why "15 names" in the Brief became "14 + payment_url family" here:** Live DB probe + EF source verification at SPEC-author time showed 14 named placeholders are in active production use (the M4 contract §1 lists 13; coupon_code is the 14th, real-but-stale-in-the-contract). The `payment_url_<digits>` family is a separate validator arm. Brief's "15" was an approximate; the lint's KNOWN_PLACEHOLDERS list is exact (14) per D-AUTH-1.

---

*End of SPEC.*
