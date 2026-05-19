# REVIEW — M4_TEMPLATE_VALIDATION_UI_LINT

> **Reviewer:** opticup-reviewer (default)
> **Phase:** Phase 3 of Full-Auto Pipeline (Foreman → Executor → **Reviewer** → LH-Tester → Foreman closure)
> **Reviewed on:** 2026-05-19
> **Commit range audited:** `fdec327..f7ed9f8` (C1 SPEC seal → C2 lint code → C3 retro)
> **SPEC folder:** `modules/Module 4 - CRM/docs/specs/M4_TEMPLATE_VALIDATION_UI_LINT/`

---

## §1 Verdict

🟢 **PASS** — proceed to LH-Tester phase.

All 16 Executor-deliverable criteria PASS. The remaining 6 criteria (13a/13b/13c Chrome MCP triplet, 21 smoke runtime) are DEFERRED to LH-Tester by SPEC design — not Executor scope. Iron Rule audit clean (12, 21, 22, 31, 32, 35). Iron Rule 34 is correctly deferred to LH-Tester per SPEC §6 + D-AUTH-8. Brief §4 Cross-Module Safety Audit holds (zero touch to EFs, migrations, `_shared/template-validation.ts`). Spot-check runtime probes of three large EXECUTION_REPORT claims (KNOWN_PLACEHOLDERS = 14, regex byte-identical, Levenshtein distances 1 and 2) all reproduce independently.

One LOW-severity concern (C-1) about a non-functional textual divergence in the smoke test message. No CRITICAL/HIGH/MEDIUM concerns.

---

## §2 SPEC §3 22-criteria checklist

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | Branch state — `develop`, scope-clean | ✅ | `git status` shows only pre-existing dirty paths (logged in EXECUTION_REPORT §0); 7 in-scope files staged in C2/C3 |
| 2 | Commits produced (Executor): 3 | ✅ | C1=fdec327, C2=45c98b4, C3=f7ed9f8 → 3 Executor commits, will become 6 total |
| 3a | Editor ≤ 230 lines | ✅ | `wc -l` = 229 (1 under ceiling) |
| 3b | Lint extraction ≤ 120 lines | ✅ | `wc -l` = 110 (10 under ceiling); D-AUTH-2 extraction trigger correctly fired |
| 4 | KNOWN_PLACEHOLDERS count == 14 | ✅ | Node eval: 14, exact verbatim list matches D-AUTH-1 (see §5 below) |
| 5 | Regex byte-identical to TS:59 | ✅ | Both = `/%([a-z][a-z0-9_]*)%/g` — node-eval compared byte-by-byte → identical |
| 6 | validate() exposed via window.CrmTemplateLint | ✅ | `crm-template-lint.js:105-109` exposes `{ KNOWN_PLACEHOLDERS, validate, levenshtein }` |
| 7 | Levenshtein helper + threshold === 2 | ✅ | `crm-template-lint.js:37` `LEVENSHTEIN_TYPO_THRESHOLD = 2`; function at `:40-56` |
| 8 | Payment URL reads OpticupConfig (no DB call) | ✅ | `editor:99-100` `Object.keys(OpticupConfig.tenant.payment_links)`; no `sb.from('tenants')` in diff |
| 9a | HARD-BLOCK on typo | ✅ (code) | `editor:115-119` `if (typos.length>0 \|\| paymentUrlErrors.length>0) renderLintBanner('hard'); return;` |
| 9b | SOFT-BLOCK on unknown + override | ✅ (code) | `editor:121-124` `if (unknownPlaceholders.length>0) renderLintBanner('soft'); return;` + checkbox at `editor:199-202` sets `_lintOverrideAcknowledged` |
| 9c | CLEAN proceeds | ✅ (code) | `editor:125-128` stale-banner removal + fall-through; runtime via LH-Tester |
| 10 | Subject field linted | ✅ | `editor:105` passes `cs.subject \|\| null` to validate(); validate concatenates body+subject at `lint:63` |
| 11a | "Did you mean?" event_dayof_week | ✅ | Node-eval: levenshtein=1 → typos[]={ suggestion: 'event_day_of_week' } |
| 11b | "Did you mean?" registratoin_url | ✅ | Node-eval: levenshtein=2 → typos[]={ suggestion: 'registration_url' } |
| 12 | URL-encoded `%D7%A9` not flagged | ✅ | Regex `[a-z]` first-char excludes uppercase `D`; node-eval validate returned all-empty arrays |
| 13a | Chrome MCP screenshots (3 states) | ⏭️ DEFERRED | Per SPEC §6 + D-AUTH-8: LH-Tester deliverable |
| 13b | window.__lintTrace runtime trace | ⏭️ DEFERRED | LH-Tester captures via evaluate_script (trace push wired at editor:112-113) |
| 13c | DB/UI probe evidence | ⏭️ DEFERRED | LH-Tester captures per state |
| 14 | Smoke test extended | ✅ | `tests/smoke/baseline.test.mjs:157-170` adds Test 8; readFileSync static assertion (executor's documented relaxation per criterion 14 note) |
| 15 | docs/CRM_TEMPLATE_LINT.md ≤ 60 lines | ✅ | `wc -l` = 53; all 5 required sections present (§1 What it does, §2 KNOWN_PLACEHOLDERS, §3 Three UI states, §4 Adding new, §5 Cross-refs) |
| 16 | Iron Rule 31 at every commit | ✅ | `npm run verify:integrity` exit 0, "10 files scanned" — clean |
| 17 | Iron Rule 32 destructive-ops gate | ✅ | SPEC declared 0; diff grep for DROP/TRUNCATE/DELETE/git rm/ALTER DROP/reset --hard/push --force → 0 hits |
| 18 | Brief §4 Cross-Module Safety holds | ✅ | See §4 below — verified 4 distinct paths all empty diff |
| 19 | `_shared/template-validation.ts` UNCHANGED | ✅ | `git diff fdec327..f7ed9f8 -- supabase/functions/_shared/template-validation.ts` empty |
| 20 | `supabase/functions/**` UNCHANGED | ✅ | `git diff fdec327..f7ed9f8 -- supabase/functions/` empty |
| 21 | Smoke 7/7 or 8/8 PASS | ⏭️ DEFERRED | Runtime to LH-Tester; static structure check landed |
| 22 | Cross-module — only modules/crm/ + docs/ + tests/smoke/ + crm.html + SPEC retro in diff | ✅ | `git diff --stat`: crm.html, docs/CRM_TEMPLATE_LINT.md, modules/crm/*, tests/smoke/baseline.test.mjs, SPEC retro files — all in declared scope |

**Tally:** 16 PASS, 6 DEFERRED (4 to LH-Tester by SPEC design, 2 inherited from those), 0 FAIL, 0 ⚠️.

---

## §3 Iron Rule audit

### Rule 12 — File size (target ≤300, absolute ≤350)

| File | Lines | Status |
|---|---|---|
| `modules/crm/crm-messaging-templates-editor.js` | 229 | ✅ (≤ 230 budget, 121 below absolute 350) |
| `modules/crm/crm-template-lint.js` | 110 | ✅ (≤ 120 budget) |
| `docs/CRM_TEMPLATE_LINT.md` | 53 | ✅ (≤ 60 budget) |

### Rule 21 — No Duplicates

Grep `validateTemplateBodyPlaceholders\|KNOWN_PLACEHOLDERS` repo-wide → 8 files: 1 definition (`crm-template-lint.js`), 1 usage (`crm-messaging-templates-editor.js`), 1 doc (`docs/CRM_TEMPLATE_LINT.md`), 1 smoke test (`baseline.test.mjs`), 1 brief, 1 activation prompt, SPEC + EXECUTION_REPORT + FINDINGS. **No code-level duplicates.** All hits are intended definition/usage/documentation.

### Rule 22 — Defense in depth (tenant_id on every write + read)

Lint does no DB I/O — not directly subject to Rule 22. But Rule 22 still applies to the **existing** `saveLogicalTemplate` chains the SPEC integrates into. Grepped editor for `.eq('tenant_id', tid)`:
- `:144` update with `.eq('id', cs.id).eq('tenant_id', tid)` — intact
- `:152` deactivate update — intact
- `:213` delete-via-deactivate — intact
- `:146` insert includes `tenant_id: tid` — intact

The lint code lands BEFORE the ops[] build (editor:96-129), then control passes through to the original chains unchanged. **Rule 22 not disturbed.**

### Rule 31 — Integrity gate

`npm run verify:integrity` → exit 0, "All clear — 10 files scanned". ✅

### Rule 32 — Destructive Operations Gate

SPEC §11 declared count: **0**. `git diff fdec327..f7ed9f8 -p` grep for `DROP TABLE|TRUNCATE|DELETE FROM|git rm|DROP COLUMN|DROP POLICY|ALTER TABLE.*DROP|reset --hard|push --force` → **0 hits**. ✅

### Rule 34 — UI-touching SPECs require Chrome MCP triplet

This SPEC modifies `modules/crm/crm-messaging-templates-editor.js` + `modules/crm/crm-template-lint.js` (browser-consumed `.js`) + `crm.html`. Iron Rule 34 applies. Per SPEC §6 + D-AUTH-8, the triplet (screenshot + window.__lintTrace + DB/UI evidence) is **DEFERRED to LH-Tester phase** (the 4th agent in the chain). Not an Executor deliverable. Executor wired `window.__lintTrace` at `editor:112-113` to enable LH-Tester capture. **Correctly deferred — no violation at Reviewer phase.**

### Rule 35 — Campaign Overseer authority boundary

The lint **reads** the resolver universe; it does **not** add new placeholders. Verified by zero-diff on:
- `supabase/functions/_shared/event-variables.ts` — empty diff
- `supabase/functions/automation-engine/prepare-plan.ts` — empty diff
- `supabase/functions/send-message/event-variables.ts` — empty diff
- `supabase/functions/_shared/template-validation.ts` — empty diff

No new `%var%`, no new `action_type`, no new `trigger_type`. ✅

---

## §4 Brief §4 Cross-Module Safety Audit verification

| §4.2 forbidden surface | `git diff fdec327..f7ed9f8` result |
|---|---|
| `supabase/functions/**` | **EMPTY** ✅ |
| `supabase/migrations/**` | **EMPTY** ✅ |
| `supabase/functions/_shared/template-validation.ts` | **EMPTY** ✅ |
| Any DB table / trigger / RLS / GRANT | not in diff ✅ |
| `crm_message_templates.required_variables` column | not modified ✅ |
| `crm_automation_rules` | not modified ✅ |
| Other modules (M1/M2/M3/M5+) | not in diff ✅ |
| `M4_INFRASTRUCTURE_CONTRACT.md` | not modified (per F-A2 disposition — separate session) ✅ |

**Files actually touched** (`git diff --stat`):
```
crm.html                                           |  1 +
docs/CRM_TEMPLATE_LINT.md                          | 53 +
.../EXECUTION_REPORT.md                            | 126 +
.../FINDINGS.md                                    | 30 +
modules/crm/crm-messaging-templates-editor.js      | 74 +
modules/crm/crm-template-lint.js                   | 110 +
tests/smoke/baseline.test.mjs                      | 19 +
```

All 7 paths are inside the SPEC §4 "CAN do autonomously" declared envelope. Brief §4 holds.

---

## §5 KNOWN_PLACEHOLDERS verbatim list verification

Executed: `node -e "global.window = {}; eval(readFileSync('modules/crm/crm-template-lint.js','utf8')); console.log(window.CrmTemplateLint.KNOWN_PLACEHOLDERS)"`.

**Captured:**

```
name, phone, email, lead_id, unsubscribe_url,
event_name, event_date, event_time, event_location,
event_day_of_week, event_deposit_amount, event_max_attendees,
registration_url,
coupon_code
```

**Count:** 14. **D-AUTH-1 expected:** 14. **Match:** ✅ exact (verbatim order matches SPEC §3.5 verbatim block lines 207-216).

`PAYMENT_URL_PATTERN` at `lint:32` = `/^payment_url_(\d+)$/` ✅
`PLACEHOLDER_REGEX` at `lint:35` = `/%([a-z][a-z0-9_]*)%/g` ✅ byte-identical to `_shared/template-validation.ts:59`
`LEVENSHTEIN_TYPO_THRESHOLD` at `lint:37` = `2` ✅

---

## §6 Save-gate logic verification (HARD / SOFT / CLEAN paths)

Read `crm-messaging-templates-editor.js:84-129` (the saveLogicalTemplate top section):

**Order of gates (executes top-down):**
1. `:85` editor-state guard
2. `:87` `name` empty guard (existing — UNCHANGED)
3. `:88` "at least one active channel" guard (existing — UNCHANGED)
4. `:89-92` tid + slug derivation (existing — UNCHANGED)
5. `:93-94` "תוכן חסר" empty-body guard (existing — UNCHANGED)
6. **`:96-129` NEW Layer D lint block** ← inserted here per SPEC §3.5
7. `:131+` existing ops[] build + Promise.allSettled (UNCHANGED)

D-AUTH-7 ("NO refactor of saveLogicalTemplate body") respected — Executor only inserted a single contiguous block; did not restructure the surrounding 47-line function.

**HARD-BLOCK path (`editor:115-119`):**
```js
if (lintErrors.typos.length > 0 || lintErrors.paymentUrlErrors.length > 0) {
  renderLintBanner(lintErrors, 'hard');
  _ctx.toast('error', 'בעיות באימות placeholders — תקן לפני שמירה');
  return;
}
```
✅ matches SPEC §3.5 verbatim semantics. Returns early — no override available.

**SOFT-BLOCK path (`editor:121-124`):**
```js
if (lintErrors.unknownPlaceholders.length > 0) {
  renderLintBanner(lintErrors, 'soft');
  return; // banner sets _lintOverrideAcknowledged when checkbox is checked
}
```
✅ Returns; the override mechanism is: checkbox at `:199-202` sets `_editorState._lintOverrideAcknowledged = true`, user clicks Save again, top-of-function check at `:98` `!_editorState._lintOverrideAcknowledged` skips the entire lint block on the second pass. This is the SPEC's sentinel-flag mechanism (D-AUTH-6 + §3.5 "the override path re-enters saveLogicalTemplate with a sentinel flag (executor's choice of mechanism)").

**CLEAN path (`editor:125-128`):**
```js
var stale = document.getElementById('tpl-lint-banner');
if (stale) stale.remove();
```
✅ Removes stale banner from prior failed save attempt, then falls through to existing `ops[]` build at `:131+` unchanged.

**Important: the `_editorState._lintOverrideAcknowledged = false` reset.** Initialized at `editor:27` on every `open()` call → guarantees that opening a different template resets the override. Without this, a user soft-overriding template A then opening template B would inherit the acknowledgement. **Defense-in-depth on UI state — well done.**

All three paths match the SPEC verbatim. ✅

---

## §7 Spot-check log (3 independent re-probes)

I re-verified three of the Executor's largest claims by running fresh node-eval against the committed code (not trusting EXECUTION_REPORT text):

**Spot-check #1 — Criterion 4: KNOWN_PLACEHOLDERS exact match to D-AUTH-1.**
```
node -e "global.window={}; eval(readFileSync('modules/crm/crm-template-lint.js','utf8'));
        console.log(window.CrmTemplateLint.KNOWN_PLACEHOLDERS.length, ':', ...)"
→ Count: 14
→ List: name,phone,email,lead_id,unsubscribe_url,event_name,event_date,event_time,
        event_location,event_day_of_week,event_deposit_amount,event_max_attendees,
        registration_url,coupon_code
```
**Match D-AUTH-1 verbatim:** ✅

**Spot-check #2 — Criterion 11a/11b: Levenshtein distances reproduce.**
```
levenshtein('event_dayof_week','event_day_of_week') = 1  ← typo class (≤2)
levenshtein('registratoin_url','registration_url')  = 2  ← typo class (≤2, edge)
```
✅ matches EXECUTION_REPORT claims (11a/11b reasoning).

**Spot-check #3 — Criterion 12: URL-encoded %D7%A9 not flagged + criterion 5 regex byte-identity.**
```
validate('%D7%A9 %name%', null, { paymentLinkKeys: ['50'] })
→ {"unknownPlaceholders":[], "typos":[], "paymentUrlErrors":[]}
```
✅ The regex `[a-z]` first-char rule excludes uppercase `D`. Independently confirmed lint regex string matches TS regex string at `_shared/template-validation.ts:59`.

**Bonus spot-check — Criterion 8: payment_url validation arm.**
```
validate('%payment_url_75%', null, { paymentLinkKeys: ['50'] })
→ {"unknownPlaceholders":[], "typos":[],
   "paymentUrlErrors":[{"name":"payment_url_75","missingKey":"75"}]}
```
✅ correctly diagnoses missing tenant key.

All 4 spot-checks pass independently. EXECUTION_REPORT honesty: ✅ high (no inflated claims).

---

## §8 Concerns

### C-1 (LOW) — Smoke test grep mentions a symbol that doesn't exist in the lint file

- **Severity:** LOW (cosmetic / robustness)
- **Location:** `tests/smoke/baseline.test.mjs:163`
- **Evidence:**
  ```js
  if (!lintJs.includes('validateTemplateBodyPlaceholders') && !lintJs.includes('window.CrmTemplateLint')) {
    throw new Error('CrmTemplateLint global not exposed in crm-template-lint.js');
  }
  ```
  The actual lint file exposes `window.CrmTemplateLint = { ..., validate, ... }` — the public function is named `validate`, **not** `validateTemplateBodyPlaceholders`. The OR-short-circuit (`||` in the negation = AND) saves this from failing because `window.CrmTemplateLint` is present, but if a future refactor renamed the export, the first arm would mislead a debugger into thinking the validate function had been deleted.
- **Suggested fix:** Either rename the test arm to `lintJs.includes('function validate(')` (matches the actual private function name at lint:60) OR remove the obsolete `validateTemplateBodyPlaceholders` arm — it's a vestigial reference to the SPEC §3.5 function-shape pseudocode that the Executor correctly chose not to export under that name. Not a blocker; the test still passes.

(No other concerns. C-2 through C-N intentionally empty.)

---

## §9 LH-Tester handoff

LH-Tester to capture the Iron Rule 34 triplet (Chrome MCP) for the 3 UI states. **The lint module is wired and verified at the code level — runtime verification is the only remaining gap.**

**Required Chrome MCP artifacts** (per SPEC §3 criteria 13a/13b/13c):

| State | UI to capture | Action | Expected runtime trace |
|---|---|---|---|
| **CLEAN** | Open existing template (e.g. `event_attendee_registered_sms`) → click Save | Save succeeds, no banner | `window.__lintTrace[N].result = { unknownPlaceholders:[], typos:[], paymentUrlErrors:[] }` |
| **HARD-BLOCK (typo)** | Open template, change body to include `%event_dayof_week%`, click Save | Red banner with "כוונת %event_day_of_week%?", Save button does not progress (toast: "בעיות באימות placeholders — תקן לפני שמירה") | `__lintTrace[N].result.typos = [{ name:'event_dayof_week', suggestion:'event_day_of_week' }]` |
| **SOFT-BLOCK (new)** | Open template, change body to include `%vip_status%`, click Save | Amber banner with override checkbox; click checkbox → click Save → succeeds | `__lintTrace[N].result.unknownPlaceholders = [{ name:'vip_status' }]`; then a second `__lintTrace[N+1]` push with all-empty (the override path) |

**Localhost-Tester smoke regression:** run `npm test` and confirm baseline 8/8 (was 7/7; the new Test 8 is additive). The new test is `readFileSync`-based and pure-static — should pass even without ERP up. But run full smoke to confirm no regression in 1-7.

**No Chrome MCP probe needed of `_shared/template-validation.ts` — Layer A is untouched.**

---

## §10 Foreman closure handoff

LH-Tester writes TEST_REPORT.md → Foreman (opticup-strategic) writes FOREMAN_REVIEW.md + 4 skill improvements + memory note + roadmap row.

**Pre-cooked closure facts (Reviewer's contribution to the closure):**

1. **Iron Rule audit clean** — 12, 21, 22, 31, 32, 35. Rule 34 deferred to LH-Tester (correct per SPEC §6 + D-AUTH-8).
2. **Brief §4 Cross-Module Safety holds** — zero diff on all 8 forbidden surfaces.
3. **3 spot-checks reproduce independently** — KNOWN_PLACEHOLDERS=14, regex byte-identical to TS:59, Levenshtein distances 1/2 confirmed.
4. **Executor's 2 deviations were both correct:**
   - D-1 (script tag order before editor, not after) — SPEC §4 text was wrong; dependency graph is right. Executor caught + resolved. **F-EXEC-1 finding** is a legitimate SPEC-authoring lesson for the Foreman (P-AUTHOR proposal: check dependency graph when specifying script tag order).
   - D-2 (renderLintBanner stayed in editor, not lint file) — architectural correctness. Lint file is now DOM-pure.
5. **D-AUTH-2 extraction trigger fired correctly** — 155+110=265 > 230 → extract. Editor ended at 229 (1 under budget); lint at 110 (10 under).
6. **EXECUTION_REPORT honesty:** high. Self-assessment 9/10 on deviation handling is appropriate. No inflated claims, no glossed deviations.
7. **One LOW concern (C-1):** smoke test references obsolete symbol name in OR clause. Not a blocker; suggest fix in a follow-up commit if convenient. Not required for closure.

**FUNNEL roadmap update:** Phase 2 P2.3 Layer D now structurally complete. With Layers A+B+C+D all shipped, FUNNEL Phase 2 P2.3 (template validation chain) is fully closed.

**Memory update (Foreman):** Add note to `project_fb_capi_p21_state.md` or similar — Layer D (UI lint) is now live; the 2026-05-13 incident class (758 SMS rejected for unknown `%registration_url%`) is structurally hard to repeat.

---

*End of REVIEW.*
