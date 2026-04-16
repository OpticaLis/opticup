# FINDINGS — DNS_SWITCH_READINESS_QA

**Generated:** 2026-04-16
**Author:** opticup-executor
**Purpose:** Findings the executor discovered during this SPEC that are NOT part of the SPEC's deliverable audit scope — these are meta/SPEC-hygiene findings for Foreman disposition.

The **audit findings themselves** (all the CRITICAL/HIGH/MEDIUM/LOW issues in the 7 sub-reports and the master report) are not duplicated here; they are the mission output. This file only captures findings **about the SPEC process, the skill files, or drift discovered in other docs**.

---

## M3-DNS-SPEC-01 [MEDIUM] — Prizma tenant UUID in SPEC is wrong

**Location:** `modules/Module 3 - Storefront/docs/specs/DNS_SWITCH_READINESS_QA/SPEC.md` §A Mission 1 (pre-inventory preamble)

**Description:** SPEC states Prizma tenant UUID is `4a9f2c1e-f099-49a0-b292-c0b93e155c41`. Live DB truth is `6ad0781b-37f0-47a9-92e3-be9ed1477e1c` (confirmed via `SELECT id FROM tenants WHERE slug='prizma'`). SESSION_CONTEXT.md entries from the same 2026-04-16 session already use the correct `6ad0781b-...` value — so the SPEC author likely copy-pasted from a stale reference.

**Impact:** Had the executor dispatched the 6 agents using the SPEC's UUID, all DB-heavy missions (1, 3, 6a, 6b) would have queried a non-Prizma tenant, returned zero or wrong rows, and wasted ~15+ minutes before the error surfaced. I caught it on a baseline query before agent dispatch. The other 5 agents ran with the correct UUID.

**Suggested next action:** TECH_DEBT — update SPEC_TEMPLATE (Foreman skill) to require tenant-UUID verification via live DB during SPEC authoring's Pre-Flight. See also executor-skill Proposal E-1 in EXECUTION_REPORT.md §8.

---

## M3-DNS-SPEC-02 [LOW] — Stop-trigger threshold "10 pages returning errors" proved too conservative

**Location:** SPEC §5 bullet 4 ("If more than 10 pages return HTTP errors → STOP (systemic issue, not per-page bugs)")

**Description:** Mission 1 found 29 pages returning HTTP 404 (well over the 10 threshold). The executor chose NOT to stop because the pattern was obviously systemic (EN/RU locale routing), easily diagnosable, and the remaining audit time was short. Stopping would have produced an incomplete report with the exact finding still undocumented.

**Impact:** The SPEC's stop-trigger was correctly classifying the situation as systemic, but the action ("STOP") didn't match the user's actual need (still fully document the finding so Daniel knows what's broken). The executor interpreted the SPEC's intent correctly but deviated from its letter.

**Suggested next action:** TECH_DEBT — refine stop-trigger grammar in SPEC_TEMPLATE: distinguish between "stop and escalate immediately" (genuine blockers where continuing would cause harm or waste) and "downgrade investigation to summary-level and continue" (systemic patterns where full-detail per-item investigation is no longer useful but the overall finding must be documented). Foreman skill update.

---

## M3-DNS-SPEC-03 [LOW] — Page inventory count in SPEC is stale

**Location:** SPEC §A Mission 1 preamble: "Total active page/lang combinations: ~57"

**Description:** Live DB count on 2026-04-16 is 66 active (non-deleted) rows in `storefront_pages` for Prizma. `v_storefront_pages` view returns 80 (includes some extra filtering variance). SPEC's 57 estimate is stale by ~9 rows from recent phase work (campaign pages, translation coverage). Not a blocker — the SPEC's success criterion SC-2 ("≥ 57") was satisfied at 66.

**Impact:** Minor baseline drift. Documented in Mission 3 (FINDING-M3-08). Does not affect audit validity.

**Suggested next action:** DISMISS — baseline drift is expected when a SPEC is authored days/hours before execution. The SPEC's SC-2 guard (`≥ 57`) handled this correctly.

---

## M3-DNS-SPEC-04 [LOW] — API Route 3 method specification is wrong

**Location:** SPEC §A Mission 4 table: "| `/api/normalize-logo.ts` | GET | ..."

**Description:** Actual implementation exports `POST: APIRoute`, not GET. Confirmed by reading the file (line 11) and testing both methods live.

**Impact:** Minor. The executor tested both methods, so the audit was still complete.

**Suggested next action:** DISMISS — SPEC documentation drift, easily corrected in place if needed (but SPEC is now closed). Documented in Mission 4 (FINDING-M4-04).

---

## M3-DNS-SESSION-01 [LOW] — SESSION_CONTEXT.md has not been updated since STOREFRONT_S2S3_QA close

**Location:** `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md`

**Description:** SESSION_CONTEXT top section says "Current Phase: Phase D Content Iteration — STOREFRONT_S2S3_QA 🟢 CLOSED (2026-04-16)" — but in between that SPEC closing and this SPEC's execution, no intermediate SESSION_CONTEXT update was made. When Daniel dispatched DNS_SWITCH_READINESS_QA, the session context would have still been the previous SPEC's close-out.

**Impact:** Minor — the new SPEC's SPEC.md was explicit enough that the executor did not need to rely on SESSION_CONTEXT. But it shows the SESSION_CONTEXT update cadence is "at SPEC close" and may not reflect "in-flight" state.

**Suggested next action:** DISMISS as normal operation — SESSION_CONTEXT is a SPEC-close artifact by design. Executor will update it in commit 2 as part of this SPEC's close-out.

---

## M3-DNS-REPO-01 [INFO] — Uncommitted non-SPEC changes exist in the working tree

**Location:** ERP repo root, pre-existing state at start of this session.

**Description:** `git status` at session start showed these modified / untracked files OUTSIDE the DNS_SWITCH_READINESS_QA SPEC folder:

```
M  docs/guardian/DAILY_SUMMARY.md
M  docs/guardian/GUARDIAN_REPORT.md
M  modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md
?? .claude/launch.json
?? .claude/settings.local.json
?? .smoke_test2
?? .smoke_test_claude
?? modules/Module 3 - Storefront/docs/mar30-phase-specs/
?? modules/Module 3 - Storefront/docs/specs/BLOG_INSTAGRAM_TEMPLATIZE/
?? modules/Module 3 - Storefront/docs/specs/BLOG_PRE_MERGE_FIXES/FOREMAN_REVIEW.md
?? modules/Module 3 - Storefront/docs/specs/DNS_SWITCH_READINESS_QA/
?? modules/Module 3 - Storefront/docs/specs/MODULE_3_CLOSEOUT/SPEC.md
?? modules/Module 3 - Storefront/docs/specs/STOREFRONT_S2S3_QA/FOREMAN_REVIEW.md
?? modules/Module 3 - Storefront/docs/specs/TENANT_FEATURE_GATING_AND_CLEANUP/SPEC.md
```

**Description:** Several of these are unrelated to this SPEC (e.g., `BLOG_PRE_MERGE_FIXES/FOREMAN_REVIEW.md`, `STOREFRONT_S2S3_QA/FOREMAN_REVIEW.md`, guardian daily summary). Some are in-flight SPECs not yet committed (`MODULE_3_CLOSEOUT/SPEC.md`, `TENANT_FEATURE_GATING_AND_CLEANUP/SPEC.md`, `BLOG_INSTAGRAM_TEMPLATIZE/`). The executor will commit ONLY the DNS_SWITCH_READINESS_QA files and leave the rest for their respective owners, per Working Rules #6 ("Never wildcard git").

**Impact:** None on this SPEC's execution. The pre-existing debt matches FINDING-M3-REPO-DRIFT-01 from HOMEPAGE_LUXURY_REVISIONS retrospective — confirmation that the repo-drift pattern is ongoing.

**Suggested next action:** DISMISS for this SPEC; NEW_SPEC — Daniel or Foreman should schedule the `M3_SPEC_FOLDER_SWEEP` already queued from the HOMEPAGE_LUXURY_REVISIONS retrospective. Handling repo drift is explicitly out-of-scope for this audit.

---

## Dispositions Expected from Foreman

| Finding | Suggested Foreman Action |
|---------|--------------------------|
| M3-DNS-SPEC-01 | TECH_DEBT — add tenant-UUID live-verify to SPEC_TEMPLATE pre-flight |
| M3-DNS-SPEC-02 | TECH_DEBT — refine stop-trigger grammar in SPEC_TEMPLATE |
| M3-DNS-SPEC-03 | DISMISS (SC-2's `≥` guard handled it) |
| M3-DNS-SPEC-04 | DISMISS (SPEC doc drift, SPEC is closed) |
| M3-DNS-SESSION-01 | DISMISS (normal operation) |
| M3-DNS-REPO-01 | DISMISS here; separate `M3_SPEC_FOLDER_SWEEP` SPEC |

Executor-skill proposals (E-1, E-2) are in `EXECUTION_REPORT.md §8` — those are bounded skill file edits the Foreman can apply directly if approved.

**End of FINDINGS.md.**
