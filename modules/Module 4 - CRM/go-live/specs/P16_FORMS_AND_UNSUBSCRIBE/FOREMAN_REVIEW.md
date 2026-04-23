# FOREMAN_REVIEW — P16_FORMS_AND_UNSUBSCRIBE

> **Location:** `modules/Module 4 - CRM/go-live/specs/P16_FORMS_AND_UNSUBSCRIBE/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman)
> **Written on:** 2026-04-23
> **Reviews:** `SPEC.md` (author: opticup-strategic/Cowork) + `EXECUTION_REPORT.md` (executor: opticup-executor / Claude Code Windows desktop)
> **Commit range reviewed:** `e72d156..5caa7d9` (3 feature commits + 1 retrospective)

---

## 1. Verdict

**CLOSED — with 2 post-close findings from Daniel's review**

All three tracks shipped and were end-to-end verified:

- **Track A (Unsubscribe):** EF now sets both `status='unsubscribed'` AND
  `unsubscribed_at`. Branded HTML page pulls tenant logo from
  `tenants.logo_url` (Rule 9 compliant). Deployed and curl-tested.
- **Track B (Registered tab filter):** Default view hides unsubscribed leads.
  Existing status filter checkbox reveals them. No new UI control needed.
- **Track C (Registration form):** New public form + Edge Function. GET
  bootstraps event+lead context, POST wraps `register_lead_to_event` RPC +
  updates 3 form-only fields. Hebrew UTF-8 verified in hex. Success popup
  works.

The execution was strong (9/10 self-assessment, defensible). The file-split
deviation (378L → 3 files for Rule 12) was the correct call. The EF-wrapper
choice over Supabase JS client was architecturally sound.

**Post-close items (from Daniel's review of the live form):**
1. Registration form footer says "© Optic Up" — violates the branding rule:
   customer-facing pages must show tenant branding only, never Optic Up.
   Goes to next SPEC.
2. Daniel clarified event capacity model (3 parameters, not 1) — see §4.1.

---

## 2. SPEC Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Goal clarity | 5 | Three tracks with clear before/after. All links traced back to Daniel's requests. |
| Measurability of success criteria | 5 | 10 criteria, most with deterministic expected values (DB state, HTTP status, template substitution, wc -l). |
| Completeness of autonomy envelope | 5 | HIGH AUTONOMY with 3 checkpoints — correct for a 3-track SPEC. |
| Stop-trigger specificity | 4 | 4 triggers, all binary and useful. Missing: no stop-trigger for the file-size cap on the registration form itself (which did hit 378L, triggering a split). |
| Rollback plan realism | 5 | "Revert commits individually. Redeploy unsubscribe from HEAD~1." Correct. |
| Expected final state accuracy | 3 | Predicted `event-register.html` at "~150-200 lines" as a single file. Actual: 378 lines requiring a 3-file split. Also predicted "+2 lines" for unsubscribe — actual was +55/-8 (the HTML upgrade was much larger than estimated). Both estimates were materially wrong, though neither caused execution failure. |
| Commit plan usefulness | 5 | 3 commit messages pre-written, all used verbatim by executor. |
| Technical design quality | 4 | Good code snippets for all 3 tracks. Gap: didn't account for Rule 12 on the new HTML file. Also, SPEC offered "Option A (HMAC) vs Option B (UUID)" for form security — recommending Option B was correct, but the executor chose the EF-wrapper path (which was also offered) for a different reason (extra column updates). The SPEC covered the design space well. |

**Average score:** 4.5/5.

The SPEC's main weakness was underestimating the size of the registration
form (predicted 150-200L, actual 378L requiring split) and the unsubscribe
HTML overhaul (predicted +2L, actual net +55L). Both were non-blocking
because the executor has Rule 12 enforcement baked in, but the estimates
should have been better. The lesson: any SPEC creating a new customer-facing
HTML page with CSS+JS should budget for 300+ lines and plan the file-split
upfront.

---

## 3. Execution Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Adherence to SPEC scope | 5 | All 3 tracks delivered. File-split and EF-wrapper were both within SPEC flexibility ("or a new lightweight Edge Function wrapper"). |
| Adherence to Iron Rules | 5 | Rule 9 (logo from `tenants.logo_url` — except footer, see §4.1), Rule 12 (all files ≤350), Rule 8 (`esc()` helper on all user input), Rule 22 (tenant_id verified on both sides of EF), Rule 23 (no secrets). |
| Commit hygiene | 5 | 3 commits matching SPEC §8 exactly. Each independently revertible. |
| Handling of deviations | 5 | File-split was the right call, documented clearly. EF-wrapper path was architecturally superior to the Supabase-JS-client alternative. |
| Documentation currency | 4 | Self-assessed 7/10. `FILE_STRUCTURE.md` not updated for 5 new files — flagged in FINDINGS as tech debt. Fair assessment. |
| EXECUTION_REPORT honesty | 5 | 9/10 self-assessment is justified. Detailed evidence for every claim. Raw command log with hex verification of Hebrew encoding. Transparent about the MCP deploy failure and HMAC token detour. |

**Average score:** 4.83/5.

This was a complex SPEC (3 tracks, 2 EF deployments, cross-cutting
concerns) executed cleanly in ~1.5 hours with zero questions. The tenant-
aware logo pull was a smart Rule 9 call that the SPEC author didn't
anticipate (SPEC suggested hardcoding `prizma-optic.co.il/images/logo.png`).

---

## 4. Findings Processing

### Finding M4-DOC-P16-01 — `FILE_STRUCTURE.md` not updated

- **Executor severity:** LOW
- **Foreman disposition:** **ACCEPTED as TECH_DEBT.** Bundle with the next
  Integration Ceremony doc refresh. Not worth a dedicated SPEC.

### Finding M4-DATA-P16-01 — Stale Prizma logo URL in SPEC

- **Executor severity:** INFO
- **Foreman disposition:** **DISMISSED.** SPEC offered it as a suggestion
  with "verify actual URL." Executor verified, found 404, used the correct
  `tenants.logo_url` source. Future SPECs should not reference that URL.

### Finding M4-BRAND-P16-01 (NEW — from Daniel's review)

- **Code:** `M4-BRAND-P16-01`
- **Severity:** MEDIUM
- **Source:** Daniel's post-execution review (2026-04-23)
- **Description:** The registration form footer (`event-register.html:13`)
  says `© Optic Up`. Daniel's rule: **all customer-facing pages must use
  tenant branding and link to the tenant's storefront — NEVER show Optic Up
  system branding.** The unsubscribe page is clean (footer says
  "ניתן לסגור חלון זה", no Optic Up mention), but the registration form
  violates this rule.
- **Fix:** Replace the static footer with a dynamic tenant-name footer
  populated from the EF bootstrap response (which already returns
  `tenant_name`). Link to the tenant's storefront domain (e.g.,
  `prizma-optic.co.il`). This requires adding `storefront_url` to the
  EF bootstrap or deriving it from tenant config.
- **Action:** Goes to the next SPEC (P17 or a micro-SPEC hotfix).

### 4.1 — Daniel's Event Capacity Clarification (NOT a finding — business context for future SPECs)

Daniel clarified that events have **three** capacity parameters, not one:

1. **קיבולת מקסימלית (max registrants):** Beyond this, new registrants go
   to waiting list. The `register_lead_to_event` RPC already handles this.
2. **כמות קופונים מקסימלית (max coupons):** How many people can pay a
   deposit and receive a coupon. Usually equals max capacity. Cancellation
   releases a slot. This column may need to be added to `crm_events`.
3. **כמות קופונים נוספת (extra coupons):** NEW concept. Mid-event overflow
   for walk-ins when no-shows happen. Staff sets this number during the
   event to allow issuing more coupons beyond the original max.

Additionally, the waiting-list flow has a specific business process:
Prizma typically waits ~24 hours after registration opens, then sends
registration links to waiting-list people if original registrants haven't
confirmed/paid. There are existing Make automation messages for this.

**Action:** Not a P16 scope issue. Goes to a future SPEC (event management
enhancements). Saved to project memory for reference.

---

## 5. Spot-Check Verification

| Claim | Method | Result |
|-------|--------|--------|
| 3 commits with correct messages | `git log --oneline` | **CONFIRMED** — `82444d7`, `7258122`, `5caa7d9` |
| 8 files changed, +601/-9 | `git diff --stat e72d156..5caa7d9` | **CONFIRMED** — 8 files, +601 insertions |
| All files ≤350 lines | Executor §6 Rule 12 audit | **CONFIRMED** — largest is `event-register.js` at 194L |
| `unsubscribe` EF sets `status='unsubscribed'` | Executor curl test + DB verification | **CONFIRMED** per execution evidence |
| Registration form shows success popup | Executor Chrome DevTools test + screenshot | **CONFIRMED** per execution evidence |
| Hebrew UTF-8 stored correctly | Executor hex dump: `d79cd790` = לא | **CONFIRMED** |
| `%registration_url%` wired in `buildVariables` | `git diff` on `crm-automation-engine.js` | **CONFIRMED** — +11/-1 lines |
| Registration form footer says "© Optic Up" | Read `event-register.html:13` | **CONFIRMED** — branding violation (see §4) |

**Spot-check result:** 8/8 verified (including the branding issue).

---

## 6. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal 1 — Size estimation for customer-facing HTML pages

- **Where:** `.claude/skills/opticup-strategic/SKILL.md` § "SPEC Authoring Protocol"
- **Change:** Add: _"When a SPEC creates a new customer-facing HTML page
  with CSS + JS + form logic + error handling + popup, estimate ≥300 lines
  total. If the estimate exceeds 200 lines, plan a 3-file split (html/css/js)
  in the SPEC itself, not as a runtime deviation. Reference: P16's
  `event-register.html` was estimated at 150-200L, actual was 378L."_
- **Rationale:** The SPEC's size estimate was 50% low, forcing a runtime
  file-split. The executor handled it correctly, but the deviation was
  avoidable.
- **Source:** P16 EXECUTION_REPORT §3 deviation #1.

### Proposal 2 — Customer-facing branding checklist

- **Where:** `.claude/skills/opticup-strategic/SKILL.md` § "SPEC Authoring Protocol" → new "Customer-Facing Pages" subsection
- **Change:** Add: _"Every SPEC that creates a page visible to end customers
  (not staff) must include a branding checklist in the success criteria:
  (a) Logo from `tenants.logo_url` — never hardcoded, (b) Footer shows
  tenant name, not 'Optic Up' or 'Opticalis', (c) Links point to tenant
  storefront domain, not `app.opticalis.co.il`, (d) No system-internal
  branding visible. Reference: P16 missed (b) and (c) — caught by Daniel
  in post-execution review."_
- **Rationale:** Daniel explicitly stated this rule. It should be enforced
  at SPEC-authoring time so executors don't have to guess.
- **Source:** Daniel's feedback (2026-04-23): "חשוב שזה יהיה עם קישור של
  אופטיקה פריזמה מהסטורפרונט ובלי לוגוים של המערכת אופטיק אפ!"

---

## 7. Executor-Skill Improvement Proposals — Foreman Endorsement

### Executor Proposal 1 — EF-testing troubleshooting block

- **Endorsement:** **ACCEPTED.** The 3-item block (MCP vs CLI, HMAC tokens
  locally, UTF-8 payloads on Windows bash) is practical and would have
  saved ~15 minutes on this SPEC. Add verbatim to the executor SKILL.md.

### Executor Proposal 2 — GH-Pages pre-flight step

- **Endorsement:** **ACCEPTED.** Add as a mandatory step when SPECs create
  new files under `modules/**/public/`. The curl check is cheap and
  prevents a latent "where does this page actually get served from?" blocker.

---

## 8. Master-Doc Checklist

| Document | Needs Update? | What |
|----------|--------------|------|
| `CLAUDE.md` | No | No new rules (branding rule saved to memory, not CLAUDE.md — it's a SPEC-authoring concern, not an Iron Rule) |
| `docs/GLOBAL_MAP.md` | **Yes** | New `event-register` EF not registered |
| `docs/GLOBAL_SCHEMA.sql` | No | No DDL (reused existing columns) |
| `docs/FILE_STRUCTURE.md` | **Yes** | 5 new files not listed (per M4-DOC-P16-01) |
| Module 4 `MODULE_MAP.md` | **Yes** | New EF, new public files, `buildVariables` change |
| Module 4 `SESSION_CONTEXT.md` | **Yes** | P14, P15, P16 not recorded |
| Module 4 `go-live/ROADMAP.md` | **Yes** | P14, P15, P16 not listed |

---

## 9. Daniel-Facing Summary (Hebrew)

**P16 — טפסים וביטול הרשמה: סגור. ✅**

שלושת הטראקים עובדים:
- ביטול הרשמה — מעדכן סטטוס + דף ממותג עם הלוגו של השוכר
- טאב רשומים — מסתיר "הוסרו" כברירת מחדל, אפשר לסנן אותם בחזרה
- טופס הרשמה לאירוע — עובד עם שעת הגעה, בדיקת ראייה, הערות + פופאפ הצלחה

**דברים שתפסתי מההערות שלך:**
1. ⚠️ הפוטר של טופס ההרשמה אומר "© Optic Up" — צריך לתקן. שום דבר שלקוח רואה לא צריך להראות "אופטיק אפ". ייכנס ל-SPEC הבא.
2. 📝 שמרתי את המודל של קיבולת/קופונים/קופונים נוספים — 3 פרמטרים, לא 1. זה ייכנס ל-SPEC של ניהול אירועים.
3. 📝 הכלל: כל דף שלקוח רואה = מותג פריזמה + קישור לסטורפרונט, בלי אופטיק אפ.

---

*End of FOREMAN_REVIEW — P16_FORMS_AND_UNSUBSCRIBE*
