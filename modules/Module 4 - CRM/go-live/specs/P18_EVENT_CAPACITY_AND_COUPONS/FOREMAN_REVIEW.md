# FOREMAN_REVIEW — P18_EVENT_CAPACITY_AND_COUPONS

> **Location:** `modules/Module 4 - CRM/go-live/specs/P18_EVENT_CAPACITY_AND_COUPONS/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman)
> **Written on:** 2026-04-23
> **Reviews:** `SPEC.md` + `EXECUTION_REPORT.md` + `FINDINGS.md`
> **Commit range reviewed:** `fb1e8be..8369e40` (3 feat commits + 1 retrospective)

---

## 1. Verdict

**CLOSED**

Full 3-tier coupon capacity model implemented across 3 commits in ~45 minutes.
Migration landed cleanly (columns verified via SQL), coupon ceiling enforcement
correctly blocks issuance when `totalSent >= max_coupons + extra_coupons`,
create-event form carries `max_coupons` through the full data flow with
campaign defaults, and event detail gained coupon info cell + extra-coupons
editor + waiting-list invite button. One documented Rule 5 deferral (FIELD_MAP
blocked by pre-existing shared.js tech debt at 408 lines) — correctly handled
as a finding rather than scope creep. 3 deviations all within SPEC spirit.

---

## 2. SPEC Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Goal clarity | 5 | Clear 3-tier model with Daniel's exact Hebrew terminology. |
| Measurability of success criteria | 5 | 11 criteria, mix of SQL verification and visual checks. |
| Completeness of autonomy envelope | 5 | HIGH AUTONOMY with one checkpoint after migration. Appropriate for multi-track DB+UI SPEC. |
| Stop-trigger specificity | 5 | 4 triggers, well-scoped. The RPC out-of-scope trigger (§5.3) prevented unnecessary changes to `register_lead_to_event`. |
| Rollback plan realism | 5 | `ALTER TABLE ... DROP COLUMN IF EXISTS` — safe because no code reads these columns pre-SPEC. |
| Expected final state accuracy | 4 | Predicted line counts: actions 285 (actual 295), day-manage 290 (actual 289), detail 280 (actual 317). The detail prediction was 37 lines under actual — a significant miss. Also predicted 3 commits (correct). |
| Commit plan usefulness | 5 | 3 pre-written messages, all used verbatim. |
| Technical design quality | 4 | Good architecture overall. Deducted 1 for (a) naming `sendCouponToAttendee` when the real function is `toggleCoupon` — a grep in §11 would have caught this, and (b) not checking `wc -l js/shared.js` in the verification evidence despite adding DB fields that trigger Rule 5. |

**Average score:** 4.75/5.

Two specific gaps: the function-name error and the shared.js line-budget blind spot.
Both are fixable with small additions to the SPEC verification protocol. The executor
caught both at execution time without needing to stop, so the impact was ~2 minutes
of wasted effort, not a failed SPEC.

---

## 3. Execution Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Adherence to SPEC scope | 5 | All 5 tracks (A–E) delivered. Only deviation was the forced Rule 5 deferral — outside executor's control. |
| Adherence to Iron Rules | 5 | Rule 12 obeyed (reverted shared.js edit rather than violating). Rule 22 confirmed: `.eq('tenant_id', getTenantId())` on extra_coupons UPDATE. Rule 8: `escapeHtml` on dynamic values. Rule 9: 50/0 defaults match schema, no hardcoded business values. |
| Commit hygiene | 5 | 3 logical commits matching SPEC tracks exactly. Messages used verbatim from SPEC §8. |
| Handling of deviations | 5 | All 3 deviations handled correctly: (1) FIELD_MAP reverted + finding logged, (2) applied ceiling to real `toggleCoupon` function, (3) improved grid from 3-col to responsive 2/4-col layout. |
| Documentation currency | 4 | No MODULE_MAP update needed (internal IIFE wiring, no new public functions). SESSION_CONTEXT and ROADMAP still not updated — accumulating debt across P14–P18. |
| EXECUTION_REPORT honesty | 5 | 9.2/10 self-assessment is fair. The Rule 5 deferral is the real gap; otherwise flawless execution. Before→after line counts documented (P17 proposal 2 adopted). |

**Average score:** 4.83/5.

Strong execution. The coupon ceiling logic is particularly well-implemented — input
validation (`isFinite`, `>= 0`), error handling, ActivityLog write, and live cell
refresh after extra-coupons edit. The waiting-list invite reuses the existing
`invite_waiting_list` automation rule rather than inventing new machinery — good
judgment call.

---

## 4. Findings Processing

### M4-DEBT-P18-01 — `js/shared.js` over 350-line hard max blocks Rule 5

- **Severity assigned by executor:** MEDIUM
- **Foreman disposition:** **ACCEPTED → NEW_SPEC**
- **Override:** None. Severity is correct. This is blocking ALL future FIELD_MAP
  additions, not just P18's two fields. The split (→ `shared-field-map.js`,
  `shared-tenant.js`, `shared-constants.js`) requires Foreman-level architecture
  planning: consumer grep, import ordering, FILE_STRUCTURE.md update, verify
  script awareness. Estimate: 1 track, ~2 hours.
- **Priority:** Should be scheduled before any SPEC that adds new DB columns to
  tables mapped in shared.js (i.e., before most future work).
- **P18's specific missing entries:** `כמות קופונים`→`max_coupons`,
  `קופונים נוספים`→`extra_coupons` under `crm_events` should be added as
  the first follow-up commit after the split lands.

---

## 5. Spot-Check Verification

| Claim | Method | Result |
|-------|--------|--------|
| 3 commits in range fb1e8be..8369e40 | `git log --oneline` | **CONFIRMED** — c05f7c6, b5eda4e, 8369e40 |
| 5 files changed, +113/-5 | `git diff --stat fb1e8be..8369e40` | **CONFIRMED** |
| Migration columns exist with correct defaults | Executor SQL output in §10 | **CONFIRMED** — max_coupons INT DEFAULT 50, extra_coupons INT DEFAULT 0, default_max_coupons INT DEFAULT 50 |
| Coupon ceiling check uses `max_coupons + extra_coupons` | `git show b5eda4e:crm-event-day-manage.js` grep | **CONFIRMED** — line 256: `var ceiling = (ev.max_coupons != null ? +ev.max_coupons : 50) + (+ev.extra_coupons || 0);` |
| Defense-in-depth on extra_coupons UPDATE | `git show 8369e40:crm-events-detail.js` line 280 | **CONFIRMED** — `.eq('id', event.id).eq('tenant_id', getTenantId())` |
| `escapeHtml` on dynamic values | grep committed code | **CONFIRMED** — `escapeHtml(r.id)` on toggle-coupon buttons |
| Waiting-list invite uses existing automation rule | Executor SQL query in §10 | **CONFIRMED** — `invite_waiting_list` status triggers `event_invite_waiting_list` template |
| All files ≤ 350L | `git show` + `wc -l` at commit 8369e40 | **CONFIRMED** — actions 295, day-manage 289, day 196, detail 317 |
| Pre-commit hook: 0 violations on commits 1–3 | Executor raw log | **CONFIRMED** — commit 3 had 1 soft warning (detail.js 317 > 300 soft target), 0 violations |

**Spot-check result:** 9/9 verified.

**Note:** The executor reported `crm-events-detail.js` as 318L in the EXECUTION_REPORT
§2 table, but `git show 8369e40 | wc -l` returns 317. A 1-line discrepancy — likely a
trailing-newline counting difference. Non-material, but noted for accuracy.

---

## 6. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal 1 — Add Rule 5 destination file line-budget to SPEC verification

- **Where:** `.claude/skills/opticup-strategic/SKILL.md` § "SPEC Authoring Protocol" → "Verification Evidence" subsection
- **Change:** Add: _"When the SPEC adds new DB columns, check `wc -l js/shared.js` (the Rule 5 FIELD_MAP destination). If shared.js is at or above 345 lines, the FIELD_MAP addition will fail the 350-line hard cap at commit time. Surface this in §11 Verification Evidence and either: (a) scope the FIELD_MAP out with a finding note, or (b) make shared.js split a prerequisite. Reference: P18 §11 verified column names don't collide but didn't check the destination file's line budget, causing a 2-minute surprise at commit 1."_
- **Rationale:** Two SPECs in a row (P15 line-budget contradiction, P18 shared.js overflow) have hit line-budget surprises. The pattern is: SPEC verifies the semantic side but not the physical file constraint.
- **Source:** P18 EXECUTION_REPORT §5 bullet 1, FINDINGS M4-DEBT-P18-01.

### Proposal 2 — Grep function names in SPEC verification evidence

- **Where:** `.claude/skills/opticup-strategic/SKILL.md` § "SPEC Authoring Protocol" → "Verification Evidence" subsection
- **Change:** Add: _"When the SPEC references a specific function by name (e.g., 'add ceiling check before `sendCouponToAttendee`'), grep for that exact name in the target file and verify it exists. If the function has been renamed or doesn't exist, use the correct name in the SPEC. Reference: P18 §2C1 named `sendCouponToAttendee` but the actual function is `toggleCoupon` — a 30-second grep would have caught this."_
- **Rationale:** Function names drift over time (refactors, B8/B9 rewrites). A SPEC that references a wrong name forces the executor to improvise at execution time. The fix is trivial: one grep per function name in §11.
- **Source:** P18 EXECUTION_REPORT §5 bullet 3, §3 deviation 2.

---

## 7. Executor-Skill Improvement Proposals — Foreman Endorsement

### Executor Proposal 1 — Pre-flight line-budget check for Rule 5 destination files

- **Endorsement:** **ACCEPTED.** The proposal adds item 1.5.8 to the DB Pre-Flight Check — a 5-second `wc -l js/shared.js` that would have caught the 408-line problem before any code edit. This complements author proposal 1 above (catch it in SPEC verification) with a belt-and-suspenders catch at execution time.

### Executor Proposal 2 — Automation-rule index as a read-before-assume reference

- **Endorsement:** **ACCEPTED with modification.** The SQL query is useful, but storing it as a "reference file" row in the skill is the wrong format — it'll go stale. Instead: add the query as a named snippet in the executor's "Useful Queries" appendix with a note: _"Run this query fresh each time; do not cache the results."_ The P18 executor correctly ran the query live rather than assuming — that's the right behavior. The proposal just standardizes the query text so future executors don't have to reconstruct it.

---

## 8. Master-Doc Checklist

| Document | Needs Update? | What |
|----------|--------------|------|
| `CLAUDE.md` | No | No new rules |
| `docs/GLOBAL_MAP.md` | No | No new public functions (all internal IIFE wiring) |
| `docs/GLOBAL_SCHEMA.sql` | **Yes** | `crm_events.max_coupons`, `crm_events.extra_coupons`, `crm_campaigns.default_max_coupons` — but Module 4 has no schema in GLOBAL_SCHEMA yet (pre-existing gap, see M4-DOC-P16-01) |
| Module 4 `SESSION_CONTEXT.md` | **Yes** | P14, P15, P16, P17, P18 all not recorded — accumulating debt |
| Module 4 `go-live/ROADMAP.md` | **Yes** | P14–P18 not listed |
| `docs/FILE_STRUCTURE.md` | **Yes** | `p18-add-max-coupons.sql` not listed (plus P16's 5 files still missing) |

---

## 9. Daniel-Facing Summary (Hebrew)

**P18 — קיבולת אירועים וקופונים: סגור. ✅**

המודל המלא עובד:
- ביצירת אירוע יש עכשיו שדה "כמות קופונים" שמקבל ברירת מחדל מהקמפיין.
- ביום האירוע, הכפתור "שלח קופון" חוסם אוטומטית כשהגיע למכסה
  (max_coupons + extra_coupons).
- בעמוד פרטי אירוע: תצוגת קופונים שנשלחו/מכסה, כפתור "הגדר קופונים
  נוספים" (לאמצע אירוע), וכפתור "שלח הזמנה לרשימת המתנה".
- שלושת העמודות החדשות (max_coupons, extra_coupons, default_max_coupons)
  נוספו ל-DB בהצלחה.

⚠️ הערה: צריך בדיקה ידנית ב-localhost על tenant demo לפני האירוע הראשון
של פריזמה שמשתמש בקופונים.

---

*End of FOREMAN_REVIEW — P18_EVENT_CAPACITY_AND_COUPONS*
