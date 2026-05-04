# FOREMAN_REVIEW — DELETE_EMPTY_EVENT

> **Reviewer:** opticup-strategic (Foreman, in-session)
> **Reviewed on:** 2026-05-04 late night
> **Inputs:** SPEC.md, ACTIVATION_PROMPT.md, EXECUTION_REPORT.md (19✅ + 1⚠️), FINDINGS.md (4)
> **Verdict at top:** 🟡 **CLOSED WITH FOLLOW-UPS** — feature ships, all 3 smoke-test cases passed, but F1 (double activity-log write) needs a follow-up SPEC.

---

## 1. SPEC quality audit

This SPEC was authored in the same Cowork session that closed QUICK_REGISTER_QR_FLOW, by Campaign Overseer with `opticup-strategic` skill loaded in-session per L-002. It demonstrates the in-session SPEC-authoring pattern working as designed: tight scope (1 RPC + 1 JS module + 1 button), 20 measurable success criteria, 5 narrow stop-triggers, 2-commit plan + retro.

**What was strong:**
- §2 evidence section listed 6 verified facts before authoring (column existence, related trigger pattern, queue mechanism, prior SPEC patterns reusable). Step 0 "reproduce-the-bug-first" honored: schema, existing RPC list, and modal pattern were all probed live before §3 was written.
- §10 cross-reference check explicitly flagged 2 names as UNVERIFIED (`window.reloadCrmEventsTab`, `T.EVENTS` family) and gave the executor a Step 1.5 mandate. **This is the right pattern** — not authoring is sometimes the right move when the executor has cheaper access to ground truth.
- §5 stop-triggers were narrow and specific (purchase_amount semantics, function name collision, race-condition deadlock, off-by-one cascade count) rather than blanket "stop on any error".
- §14 pre-flight gate captured the cross-session state cleanup (4 stranded files from the prior Cowork session) so the executor could resolve it cleanly without ambiguity.

**What was weak:**
- **§3.13 cited `crm_activity_log` as the audit-table name.** The actual table is shared `activity_log` (M1.5-owned, filtered by `entity_type`). Catching this earlier would have prevented Decision D3 in execution. **Lesson:** when a SPEC references any `*_log` / `*_audit` table by a module-prefixed name, the author MUST grep `information_schema.tables` to confirm. If the prefixed name doesn't exist verbatim, the SPEC must explicitly use the shared name.
- **§3.13 expected exactly 1 row per delete.** It got 2 because both the new RPC and the existing JS-side `ActivityLog.write` fired on the same delete event. The SPEC didn't ask "is the JS layer ALREADY writing audit rows that this RPC duplicates?" Authoring an audit-write feature without surveying existing client-side audit paths is the source of F1. **Lesson:** when a SPEC introduces audit-row writes from a new layer (server RPC or client JS), the author must audit existing callers in the OPPOSITE layer for the same action string.
- **ACTIVATION_PROMPT §3.a "do NOT call sb.rpc directly per Iron Rule 7"** was overbroad. Rule 7 covers `sb.from()` (table reads/writes), not `sb.rpc()` calls. Executor caught this in real time (Decision D2) and matched the established CRM convention. **Lesson:** Iron-Rule citations in ACTIVATION_PROMPTs must quote the rule's actual scope; over-citing creates ambiguity that the executor has to resolve mid-flight.

**SPEC quality score:** 9/10. Strong scoping, strong probe discipline, clean criteria. Two minor authoring slips (D3 table name, overbroad rule cite) caught by the executor in real time without rework.

---

## 2. Execution quality audit

The executor (Claude Code on Windows desktop) ran this SPEC under Bounded Autonomy. Two-commit code chain + 1 retro commit, plus a pre-flight overseer-close bundle that grew from 4 named files to 11 (justified — see below).

**What was strong:**
- **Pre-flight scope-expansion was handled correctly.** The dispatcher named 4 files; reality had 11 stranded. Executor stopped, surveyed, asked Daniel via the dispatcher, got approval, and bundled all 11 into one commit. Per CLAUDE.md §3a "survey before destroy" rule, this was textbook execution.
- **Decision D1, D2, D3, D4 in the EXECUTION_REPORT are the gold standard for transparent execution.** Each is named, justified, and lessons-learned attached. This is what self-auditing executor work looks like.
- **The race-safety implementation in the RPC** matches the SPEC §3.3 requirement (`SELECT FOR UPDATE` on the event row, then `SUM(...)`, then conditional `UPDATE`s within one function call). Verified via the migration file — the lock is released only when the function returns.
- **Stop-on-deviation was honored** when smoke test §12 step 7 (queue-cancel branch) couldn't be exercised because Daniel didn't seed a queued message. Executor logged it as F2 (LOW) rather than synthesizing a fake "verified" outcome. Honest reporting.

**What was weak:**
- **F1 was NOT caught at commit time.** The 2-row audit write was visible in the migration source (RPC INSERTs into `activity_log`) AND the JS source (`crm-event-delete.js` calls `ActivityLog.write`). A grep at commit-2 time would have caught it. Executor caught it post-commit during smoke-test verification (Daniel's `crm_activity_log` query failed). **This is the executor self-improvement P2 below.**

**Execution quality score:** 9/10. One missed pre-commit lint (F1) but everything else exemplary. The transparent F1 finding instead of a silent fix is itself the right call — fixes outside the SPEC's commit plan would have violated §3.19.

---

## 3. Findings processing

| Finding | Severity | Decision |
|---|---|---|
| F1 — Double activity-log write per event delete | HIGH | **NEW SPEC: `ACTIVITY_LOG_DEDUPLICATION_DELETE_EVENT`** authored in same Cowork session as part of M4 closure rush. Single 1-line patch removing the client-side `ActivityLog.write` call. Server-side row is canonical (richer, atomic with the data change). |
| F2 — Queue-cancel branch live-untested | LOW | Defer. Implementation is in place per migration source; live-test will happen the first time a real delete fires while a queued message exists. NOT a SPEC-worthy follow-up. |
| F3 — SPEC §3.13 cited wrong table name (`crm_activity_log`) | INFO | Already addressed: this Foreman review's §1 codifies the lesson + `opticup-executor` P1 below makes it a binding pre-flight bullet. |
| F4 — REC-010 forward link (restore-deleted-event UI) | INFO | Already in DECISIONS_LOG as REC-010 + new SPEC `RESTORE_DELETED_EVENT_UI` authored in same Cowork session. |

No findings dismissed. No findings orphaned.

---

## 4. Author-skill improvement proposals (opticup-strategic)

**P1 — Audit-row authoring requires cross-layer survey.** When a SPEC introduces audit-row writes from one layer (server RPC or client JS), the author MUST audit the OTHER layer for existing callers writing the same action string. F1 (double activity_log write) would have been caught at SPEC-author time if §10 cross-reference check had included a "audit existing audit-row writers for the same action" line. **Where:** `.claude/skills/opticup-strategic/SKILL.md`, Step 1.5 cross-reference check table — add a new row: "Audit-row paths — if SPEC adds an audit/log row write from any layer (RPC, JS, EF, hook), grep all OTHER layers for the matching `action` string. If a peer writer exists, the SPEC must explicitly state which is canonical."

**P2 — Iron-Rule citations in ACTIVATION_PROMPTs must quote the rule's exact scope.** "Do NOT call sb.rpc directly per Iron Rule 7" was overbroad — Rule 7 covers `from()` not `rpc()`. The executor had to resolve this at runtime (D2). **Where:** `.claude/skills/opticup-strategic/SKILL.md`, the section about authoring ACTIVATION_PROMPTs — add a line: "When citing an Iron Rule in an ACTIVATION_PROMPT constraint, quote the rule's exact scope (which API surface, which call site type). Bare 'per Iron Rule N' without scope creates ambiguity the executor has to resolve mid-flight."

---

## 5. Executor-skill improvement proposals (opticup-executor)

**P1 — Shared-table pre-flight check.** When a SPEC mentions a module-prefixed `*_log` or `*_audit` table name, grep `information_schema.tables` to confirm it exists before authoring SQL referencing it. The Optic Up project uses ONE shared `activity_log` table (M1.5-owned), filtered by `entity_type`. **Where:** `.claude/skills/opticup-executor/SKILL.md`, Step 1.5 DB Pre-Flight — add a 6th bullet about shared tables. (Verbatim text already drafted in EXECUTION_REPORT §9 P1; apply that text.)

**P2 — Double-audit lint at commit time.** When a new RPC INSERTs into `activity_log` AND the same SPEC's JS files call `ActivityLog.write` with the matching action string, that's a double-audit: STOP and decide canonical layer before committing. Default policy: server-side wins. **Where:** `.claude/skills/opticup-executor/SKILL.md`, "Verification After Changes" section. (Verbatim text already drafted in EXECUTION_REPORT §9 P2; apply that text.)

**Note on the "3-review accumulation rule":** the QUICK_REGISTER FOREMAN_REVIEW (sibling to this one) cited "stop after 3 platform-deploy failures" as the 2nd consecutive review surfacing a similar `opticup-executor` defensive-stop proposal. **This (DELETE_EMPTY_EVENT) review's P1 + P2 are different proposals** — neither is a 2nd citation of the deploy-stop rule. So the deploy-stop rule remains at 2 citations (one more and the SKILL.md edit becomes mandatory).

---

## 6. Master-doc updates

- ✅ HANDOFF §"Open follow-ups" updated by Overseer in same session (REC-009 marked CLOSED, REC-010 added, F1 + activity-log-name flagged as next-Foreman items).
- ✅ DECISIONS_LOG REC-009 marked APPLIED with commit hashes + 19✅+1⚠️ outcome.
- ✅ MEMORY entry updated with both SPEC closures + 60% rolling rate.
- ⚠️ `MASTER_ROADMAP.md` Module 4 status — needs update to reflect "DELETE_EMPTY_EVENT closed + B6 baseline-at-1 unblocked". Pending next opticup-strategic session.
- ⚠️ `docs/GLOBAL_MAP.md` — should list the new `soft_delete_event_if_empty` RPC + new `window.CrmEventActions.softDeleteEventIfEmpty` JS function. Pending Integration Ceremony.
- ⚠️ `docs/GLOBAL_SCHEMA.sql` — should reflect the new RPC. Pending Integration Ceremony.
- ✅ Module 4 `MODULE_MAP.md` — minor update needed for `crm-event-delete.js`. Recommend bundling with the M4 closure Integration Ceremony.

---

## 7. Verdict

🟡 **CLOSED WITH FOLLOW-UPS.**

Live state: 4 commits on develop, 3 smoke-test cases passed on demo, RPC + UI + cascade all working as specified.

4 follow-ups remain:
1. **F1 fix** — `ACTIVITY_LOG_DEDUPLICATION_DELETE_EVENT` SPEC, single 1-line patch (remove client-side audit write).
2. **REC-010** — `RESTORE_DELETED_EVENT_UI` SPEC, separate session.
3. **MASTER_ROADMAP + GLOBAL_MAP** updates — next opticup-strategic session, paired with M4 closure Integration Ceremony.
4. **Skill edits per P1/P2** in §4 + §5 above — next opticup-strategic session.

No reopens. No execution rework. The SPEC + execution combination produced exactly the operational capability Daniel asked for (clean QA event deletion, B6 unblocked) with one transparent finding ready for follow-up.

---

*End of FOREMAN_REVIEW.md.*
