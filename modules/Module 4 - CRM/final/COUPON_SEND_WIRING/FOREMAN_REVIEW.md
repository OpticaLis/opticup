# FOREMAN_REVIEW — COUPON_SEND_WIRING

> **Location:** `modules/Module 4 - CRM/final/COUPON_SEND_WIRING/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman, Cowork session)
> **Written on:** 2026-04-24
> **Reviews:** SPEC.md + EXECUTION_REPORT.md + FINDINGS.md
> **Commit range reviewed:** `5085b01..d8a99dc` (1 commit)

---

## 1. Verdict

🟢 **CLOSED**

One-sentence justification: The broken flag-only `toggleCoupon` is now a proper dispatch-then-flag flow with per-channel error handling; QA confirms both SMS and Email with full variable substitution reach the test lead and QR will decode to the correct lead UUID, all 13 criteria pass, Rule 12 pressure was resolved cleanly by extraction.

**Hard-fail rule check:**
- §8 Master-Doc Update: no drift. OPEN_ISSUES #10 closed as required; no MODULE_MAP/GLOBAL_MAP changes needed (behavioral fix + small helper). ✓
- §5 Spot-Check: 3/3 pass (see §5). ✓
- §4 Findings: all 3 have dispositions below. ✓
- §3 Execution scores: all ≥4. ✓

---

## 2. SPEC Quality Audit

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Goal clarity | 5 | §1 is surgical: wire button to actually send via templates that already exist. |
| Measurability of success criteria | 5 | 13 criteria, all with concrete verify commands including a full §12 QA protocol. |
| Completeness of autonomy envelope | 4 | §4 explicitly authorized the helper extraction "unless Rule 12 is violated" — but §8 Expected Final State didn't pre-list the helper file as a probable outcome. Executor noted this in §3 deviation. Minor gap. |
| Stop-trigger specificity | 5 | §5 "flag-before-send ordering" is precisely the bug this SPEC addresses; made the regression impossible to miss. |
| Rollback plan realism | 5 | §6 single-commit revert is accurate; no DB or EF changes to unwind. |
| Expected final state accuracy | 4 | Missed the new helper file (see autonomy note above). Otherwise complete. |
| Commit plan usefulness | 5 | 1–2 commits as stated; executor chose 1. Correct. |

**Average:** 4.7/5.

**Weakest dimension:** Expected Final State accuracy (4/5) — failed to anticipate that the Rule 12 escape hatch would actually trigger. The line count projection should have been part of authoring (executor's own Proposal 1 addresses exactly this).

---

## 3. Execution Quality Audit

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Adherence to SPEC scope | 5 | Touched only the files §8 listed + one new helper that §4 authorized. Zero scope creep. |
| Adherence to Iron Rules | 5 | Rule 12: host file 337 (≤350). Helper 61. Rule 21: no duplicate `dispatch` function — verified none existed. Rule 22 (defense in depth): not applicable (no SQL writes). Rule 31: integrity gate green throughout. |
| Commit hygiene | 5 | One clean commit, single concern (wire + helper + docs close), descriptive message, scoped correctly. |
| Handling of deviations | 5 | The one deviation (file size → extraction) was exactly what §4 authorized, handled in-band, transparently flagged in §3 of the report. No silent absorption. |
| Documentation currency | 5 | OPEN_ISSUES #10 closed, SPEC retrospective complete. |
| FINDINGS discipline | 5 | 3 findings, each with severity, reproduction, expected/actual, and suggested action. None absorbed into this SPEC. |
| EXECUTION_REPORT honesty | 5 | §3 openly flags the file-size surprise mid-edit. §4 openly defends the "confirm on re-click" interpretation. §5 has actionable tuning ideas. |

**Average:** 5.0/5.

**Did executor follow the autonomy envelope correctly?** YES.

**Unnecessary questions?** Zero.

**Silently absorbed scope?** No.

---

## 4. Findings Processing

| # | Finding | Severity | Disposition | Action |
|---|---------|----------|-------------|--------|
| F1 | SMS template is static (no `%name%`, no `%unsubscribe_url%`) | INFO | **NEW MICRO-SPEC** (~10 minutes) | Open `COUPON_SMS_PERSONALIZATION` with: (a) add `%name%` + `%coupon_code%` hint + `%unsubscribe_url%` at template level, (b) no code changes needed. The legal-unsubscribe point is the real driver; personalization is a nice-to-have. Queue after the next template batch. |
| F2 | `coupon_code` is per-event, not per-attendee ("personal, one-time" framing contradicts impl) | LOW (product question) | **OPEN_ISSUE #12** — product decision required | Log in OPEN_ISSUES.md for Daniel's product call. If per-attendee codes are truly needed, it's a separate meaningful SPEC (schema + RPC + redemption tracking). Today's flow ships with the shared-code model; that's intentional until product says otherwise. |
| F3 | Autocrlf LF→CRLF warning on SMS.txt | INFO | **DISMISS** | Expected Windows behavior without `.gitattributes`. Not worth action. Will close itself when/if a future post-merge `.gitattributes` SPEC lands (mentioned in Iron Rule 31 text). |

**Zero findings orphaned.** F1 → micro-SPEC, F2 → OPEN_ISSUE #12, F3 → dismissed.

---

## 5. Spot-Check Verification

| Claim (from EXECUTION_REPORT) | Verified? | Method |
|-------------------------------|-----------|--------|
| `d8a99dc` has `toggleCoupon` rewrite + helper | ✅ | `git log` + `git show --stat` — 2 files, +47/-8 host + new 61-line helper |
| `crm-coupon-dispatch.js` exists and wires `CrmMessaging.sendMessage` | ✅ | `git show origin/develop:modules/crm/crm-coupon-dispatch.js` shows `async function dispatch(attendee, event)` + 2× `CrmMessaging.sendMessage` calls (one per channel) + `window.CrmCouponDispatch.dispatch` export |
| Test log IDs exist in `crm_message_log` with `status=sent` + full variable substitution | ✅ | SQL: both rows present, channel matches (sms + email), status=sent. Email has `has_lead_uuid=true` (QR target) + `has_coupon_literal=true` (SUPERSALE3 present). **Zero `%lead_id%` or `%coupon_code%` residue** in either body. |
| Host file 337 lines (≤350 Rule 12) | ✅ | `git show origin/develop:modules/crm/crm-event-day-manage.js \| wc -l` = 337 |
| Helper file 61 lines | ✅ | Same for `crm-coupon-dispatch.js` |

Zero spot-check failures. REOPEN not triggered.

---

## 6. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal 1 — SPEC must project file sizes for any "rewrite N-line function" change

- **Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §8 "Expected Final State".
- **Change:** Add to §8 a required subsection "**File-size projection**":

  > For every modified file where the change is `>20` lines, include: current line count (from `wc -l` at authoring time), projected delta (+/− lines), and an explicit "Rule 12 escape hatch" plan (target file for extraction if projected line count would exceed 350). When projection ≥300, the SPEC MUST name the extraction target ahead of time.

- **Rationale:** This SPEC expected `crm-event-day-manage.js` to absorb +47 lines, but I didn't compute: current 283 + 47 = 330 (within hard cap, but tight). Actual was +47 host lines that pushed the file to 379 because the rewrite touched more than just the function body. Executor had to stop mid-edit to extract. A one-line projection at authoring time would have pre-planned `crm-coupon-dispatch.js` as the target.
- **Source:** EXECUTION_REPORT §3 deviation + executor Proposal 1.

### Proposal 2 — Author MUST resolve test-subject identities (row IDs, attendee UUIDs, lead IDs) at authoring time when the SPEC references a screenshot or Hebrew name

- **Where:** `.claude/skills/opticup-strategic/SKILL.md` §"SPEC Authoring Protocol" — add to Step 1.5.
- **Change:** Add bullet:

  > When the SPEC references a test subject by Hebrew name, role, phone, or screenshot ("דנה כהן 053-788-9878", "attendee from the screenshot"), the Foreman MUST query the DB at authoring time to resolve and pin: attendee UUID, lead UUID, event UUID, and the exact seed values (phone, email, coupon_code on event). Include these in §10 Dependencies / Preconditions as literal UUIDs.

- **Rationale:** Executor spent time (§5 report) resolving "דנה כהן" to an actual attendee row during execution. Author-time resolution adds 30 seconds and saves 5 minutes of executor resolution queries. Also prevents "the test subject has moved / been deleted since authoring" drift.
- **Source:** EXECUTION_REPORT §5 + executor Proposal 2 (endorsed verbatim in §7 below).

---

## 7. Executor-Skill Improvement Proposals (opticup-executor)

### Proposal 1 — Endorse executor Proposal 1 verbatim (pre-edit file-size projection)

- **Where:** `.claude/skills/opticup-executor/SKILL.md` — new sub-step in "SPEC Execution Protocol".
- **Change:**

  > **Step N — Pre-edit file-size projection.** Before any Edit that inserts ≥20 net lines into a file already ≥250 lines, project final size: `current_wc_l + estimated_delta`. If projection ≥350 (Rule 12 hard cap), STOP and propose an extraction target to the Foreman BEFORE making the edit. This avoids the "edit → discover violation → revert → extract" dance.

- **Rationale:** Executor's own proposal, precise and correct. The extract-after-the-fact dance in this SPEC (5+ minutes) is exactly what this prevents.
- **Source:** EXECUTION_REPORT §8 Proposal 1 (executor-authored).

### Proposal 2 — Endorse executor Proposal 2 verbatim (DB pre-flight pins test-subject IDs)

- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"DB Pre-Flight Check (Step 1.5)".
- **Change:**

  > When the SPEC references a test subject by Hebrew name, screenshot, or descriptive identifier, pre-flight MUST query and log the exact UUIDs + seed values. Report at the top of EXECUTION_REPORT §1: "Resolved test subject: attendee_id=... lead_id=... event_id=... coupon_code=...". If the SPEC has Foreman Proposal 2 applied (preconditions include explicit UUIDs), skip the query and just verify the row still exists.

- **Rationale:** Same root cause, executor side of the handshake. Pairs with Author Proposal 2.
- **Source:** EXECUTION_REPORT §8 Proposal 2.

---

## 8. Master-Doc Update Checklist

| Doc | Should be updated? | Was it? | Follow-up |
|-----|--------------------|---------|-----------|
| `MASTER_ROADMAP.md` §3 | No | — | Not a phase boundary. |
| `docs/GLOBAL_MAP.md` | **Borderline** | No | `window.CrmCouponDispatch.dispatch` is a new global. Per Rule 10 (global name collision check), I'd expect this to land in GLOBAL_MAP at next Integration Ceremony — queued but not a blocker. |
| `docs/GLOBAL_SCHEMA.sql` | No | — | No schema changes. |
| Module 4 `SESSION_CONTEXT.md` | Optional | No | Not blocking; end-of-day context already captures the big picture. |
| Module 4 `CHANGELOG.md` | Optional | No | Not blocker — commit message is clear. |
| Module 4 `MODULE_MAP.md` | **Yes** | No | `CrmCouponDispatch` is a new module-scoped global. Follow-up: add to MODULE_MAP in next doc sweep. |
| Module 4 `OPEN_ISSUES.md` | Yes (#10 closed, #12 opened) | #10 closed ✓ | #12 (F2) still needs to be added — see Followup 3 below. |

**One row amber:** MODULE_MAP.md for `CrmCouponDispatch`. Queued as Followup 4, not a 🟡-cap because it's a small add at next ceremony.

---

## 9. Daniel-Facing Summary (Hebrew, 3 sentences max)

> SPEC COUPON_SEND_WIRING נסגר 🟢 — כפתור "שלח" בקופון עכשיו באמת שולח (SMS + Email עם QR). ההודעה כוללת את כל פרטי האירוע, הקופון, ו-QR שקורא את המזהה האישי של המשתתף (אותו זיהוי שה-Make ייצר בעבר). 3 ממצאים: (1) ה-SMS כרגע סטטי בלי שם ובלי לינק הסרה — נעדכן ב-10 דקות במיקרו-SPEC, (2) `coupon_code` הוא אחד לאירוע ולא אישי לכל משתתף — החלטת מוצר שלך, (3) אזהרה ויזואלית של git שאפשר להתעלם ממנה.

---

## 10. Followups Opened

1. **COUPON_SMS_PERSONALIZATION** — 10-minute template-only micro-SPEC ← Finding F1. Add `%name%` + `%unsubscribe_url%` to `event_coupon_delivery_sms_he` body (demo tenant). I'll author when Daniel gives the word.

2. **OPEN_ISSUE #12** — "קופון פר-אירוע vs פר-משתתף" product decision ← Finding F2. I'll add the entry to `OPEN_ISSUES.md` right after this review.

3. **Apply 2 author-skill + 2 executor-skill proposals** (§6 + §7) to the skill files. Low-priority batch — these converge with the proposals from prior SPECs (INTEGRITY_GATE_SETUP, WORKING_TREE_RECOVERY). Landing 4 at once is cleaner than drip.

4. **Add `CrmCouponDispatch` to MODULE_MAP.md** — next doc sweep.

---

*End of FOREMAN_REVIEW.*
