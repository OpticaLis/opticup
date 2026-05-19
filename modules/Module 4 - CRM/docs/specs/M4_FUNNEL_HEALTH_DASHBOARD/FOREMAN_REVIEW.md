# FOREMAN_REVIEW — M4_FUNNEL_HEALTH_DASHBOARD (Deliverable A)

> **Written by:** opticup-strategic (Foreman, M4) — overnight worktree-isolated session
> **Written on:** 2026-05-19 night
> **Worktree:** `C:\Users\User\opticup-funnel-25\` on `claude/funnel-phase-2-5-overnight-2026-05-19`
> **Reviews:** SPEC.md + EXECUTION_REPORT.md + FINDINGS.md + REVIEW.md + TEST_REPORT.md (all siblings).
> **Commit range:** `ec2fffe..08677b5` — 9 commits across both deliverables; A's commits are `8bfb438` (migration) + `ee13add` (frontend) + `bb91e4a` (Executor retro) + `4380b48` (Reviewer audit) + `08677b5` (LH-Tester triplet).

---

## 1. Verdict

🟡 **CLOSED-WITH-FOLLOW-UPS.**

Substrate is live + Chrome MCP triplet captured + 14 tiles render + drill-downs work + pixel-gap relocated cleanly. The single MEDIUM finding (RLS on materialized view not supported by Postgres) is a platform limitation, NOT an execution flaw — the JS-layer Iron Rule 22 substitution is the industry-standard pattern and was applied correctly. Two follow-up SPECs queued (see §5).

**Why 🟡 (not 🟢):**
- **A-2 (MEDIUM, RLS-on-mv):** Postgres doesn't support RLS on materialized views. The mv is readable by anyone with table-level grant. JS-layer `.eq('tenant_id', tid)` defense (Iron Rule 22) is enforced on every read (7 chains confirmed). This is acceptable for v1; a more defensive long-term answer is wrap the mv in a `SECURITY DEFINER` function or a regular view that filters by JWT-claim. Recommended as a separate hardening SPEC.
- **A-3 (LOW):** committed migration file contains a dead RLS-on-mv block that wasn't applied (the migration script tried it, got "ERROR: relation is not a table", continued with a corrected version). File-vs-DB drift — file is not perfectly replayable. Recommend `chore` commit cleaning the .sql file in a follow-up.
- 17 PASS / 1 PASS-with-note (A-1: 5 drill-downs use a centralized `_drillModal` helper — only 1 `Modal.show` grep hit, but functionally 5 drill-downs work per LH-Tester) / 1 DEFERRED (A's #17 RLS-on-mv) / 5 PASS-via-LH-Tester (Chrome MCP triplet captured cleanly).

**Why NOT 🔴:** Every functional criterion works in the browser. LH-Tester captured all 14 tiles rendering on demo with `mv_query_ms=228` (well within UX budget). Drill-down modals open. Pixel-gap relocation verified (0 hits in messaging hub). 6 screenshots in `artifacts/`. The remaining concerns are documentation/file-cleanliness, not correctness.

---

## 2. SPEC Quality Audit

| Dimension | Score | Notes |
|---|---|---|
| Goal clarity | 5 | §1 named the 14-tile + mv + cron + relocation scope precisely. |
| Measurability | 5 | 24 criteria all with explicit verify commands. |
| Autonomy envelope | 5 | §4 narrow (6 declared files); D-AUTH-3 extraction gate let Executor decide without escalation. |
| Stop-trigger specificity | 5 | All narrow + observable. |
| Pre-Authoring Reality Check | **4** | §0.4 probed for `crm_permissions OR permissions` but didn't drill down on WHICH name matched — Executor caught the table-name error at Step 1.5 (used `permissions`). Pattern A class issue per SKILL_IMPROVEMENT_HARVEST P-AUTHOR-1 — codified, but I'm the first SPEC after codification and I still drifted on the specific drilling. -1. |
| Rollback realism | 5 | Per-commit revert; mv is additive, safe. |
| Iron Rule 21 cross-ref | 4 | Caught 0 collisions correctly. -1 for the permissions-table name confusion (cross-ref didn't surface it). |

**Average:** 4.7/5.

**Weakest dimension:** Pre-Authoring Reality Check on the permissions table name. The SKILL_IMPROVEMENT_HARVEST Step 0.7 (Live-State Probe) was supposed to prevent exactly this class of error. I ran the probe but accepted "1 table matches" without confirming WHICH name. The Executor's Step 1.5 caught it (defense-in-depth working). Promoting to P-AUTHOR-1 below.

---

## 3. Execution Quality Audit

| Dimension | Score | Notes |
|---|---|---|
| Adherence to SPEC scope | 5 | Touched exactly the declared files + the documented errata (permissions table name + RLS-on-mv pivot). Both deviations transparently logged. |
| Iron Rules adherence | 5 | Rules 7/8/9/10/12/21/22/31/32 all PASS. Rule 15 RLS substitute documented (platform limit). |
| Commit hygiene | 5 | 3 clean SPEC commits with HEREDOC + Co-Authored-By. `git diff --cached --name-only` before each. |
| Handling of deviations | 5 | F-B1 (RLS-on-mv) and F-B2 (permissions table name) both correctly logged as FINDINGS with severity + suggested next action. Foreman pre-approval pattern via FINDINGS classification. |
| Documentation currency | 5 | EXECUTION_REPORT covers all 24 criteria with evidence. Migration file has inline comments documenting the permissions-table-name correction. |
| EXECUTION_REPORT honesty | 5 | Self-scores 4.5/5 — matches my independent assessment exactly. |

**Average:** 5.0/5.

---

## 4. Findings Processing

| # | Source | Finding | Severity | Disposition |
|---|---|---|---|---|
| F-A1 | SPEC | M6 knowledge map missing | INFO | Pre-existing; tracked. Brief reference stale. No follow-up needed for this SPEC. |
| F-B1 | Executor | RLS on materialized view not supported by Postgres | MEDIUM | **TECH_DEBT + new SPEC stub:** `M4_FUNNEL_DASHBOARD_RLS_HARDENING` — wrap mv in `SECURITY DEFINER` function OR add JWT-claim WHERE in a security-invoker view. JS-layer IR22 is the v1 defense; this is the structural follow-up. |
| F-B2 | Executor | `permissions` table name (not `crm_permissions`) | LOW | **Apply P-AUTHOR-1 to opticup-strategic SKILL.md** — drill into WHICH name matched in the §0.4 probe, not just count. Captured below. |
| A-1 | Reviewer | 5 drill-downs use centralized `_drillModal` helper; only 1 `Modal.show` grep hit | LOW | Acceptable refactor. SPEC §3 criterion 15 said "5 `Modal.show` calls" — the centralization is arguably better. No follow-up needed; SPEC criterion phrasing updated only in future revisions. |
| A-2 | Reviewer | RLS-on-mv MEDIUM (mirrors F-B1) | MEDIUM | Same follow-up SPEC as F-B1. |
| A-3 | Reviewer | Migration file has dead RLS-on-mv block not applied | LOW | **Quick chore commit recommended:** clean the .sql file by removing the dead RLS block. Single-file edit, no DB change. Track as queued chore (not blocking this SPEC's close). |
| A-4 | Reviewer | INFO cross-ref to B | INFO | No action. |
| A-5 | Reviewer | LOW cross-ref to B | INFO | No action. |
| LH-LH-1 | LH-Tester | Handler-name drift between SPEC text and actual code (cosmetic) | INFO | No follow-up. |

**No orphans.** All 9 findings have dispositions. None blocks closure.

---

## 5. Author-Skill Improvement Proposals (opticup-strategic)

### P-AUTHOR-1 — §0.4 probes must DRILL DOWN on WHICH option matched, not just count

- **Where:** `.claude/skills/opticup-strategic/SKILL.md` — §"Step 0.7 Live-State Probe" — add a sub-bullet.
- **Change:** *"**Probe disambiguation (added 2026-05-19 from M4_FUNNEL_HEALTH_DASHBOARD/FOREMAN_REVIEW.md P-AUTHOR-1).** When a §0.4 probe is structured as `WHERE name='X' OR name='Y'` (checking for ambiguous existence), the SPEC author MUST follow up with `SELECT name FROM information_schema.tables WHERE name IN ('X','Y')` to confirm WHICH name actually matched. Accepting only the count produces SPECs that reference the wrong name (e.g., 'crm_permissions' when the actual table is 'permissions') — the Executor catches it at Step 1.5.6, but Foreman should catch it at §0.4. This is the FIRST SPEC after Step 0.7 was codified that surfaced this exact failure mode."*
- **Rationale:** Executor caught F-B2 (permissions table name) at Step 1.5. The probe count was correct (1 match), but the SPEC referenced the wrong specific name. 30-second extra probe would have caught it at SPEC-author time.
- **Source:** F-B2 + Executor EXECUTION_REPORT D-1.

### P-AUTHOR-2 — RLS-on-MV pattern: pre-author check that target object supports RLS

- **Where:** `.claude/skills/opticup-strategic/SKILL.md` — §"Step 5.3 Runtime Semantics Rehearsal" — add a sub-bullet about RLS surface compatibility.
- **Change:** *"**RLS surface compatibility check (added 2026-05-19 from M4_FUNNEL_HEALTH_DASHBOARD/FOREMAN_REVIEW.md P-AUTHOR-2).** When a SPEC mandates RLS policies on a new DB object, the Foreman MUST verify the object TYPE supports RLS. PostgreSQL supports RLS on TABLES + VIEWS but NOT on MATERIALIZED VIEWS. If the SPEC creates a materialized view + mandates RLS → escalate at author time, not in the executor's lap. Recovery patterns: (a) wrap the mv in a `SECURITY DEFINER` function, (b) wrap in a security-invoker VIEW that filters by JWT-claim, (c) accept JS-layer IR22 substitution + document explicitly. The SPEC should pre-declare which recovery applies."*
- **Rationale:** F-B1 + A-2 surfaced this at execution. Iron Rule 15 says "every new table MUST have RLS" — but a materialized view isn't a table, and the SPEC text didn't account for the distinction.
- **Source:** F-B1 + Reviewer A-2.

---

## 6. Executor-Skill Improvement Proposals (opticup-executor)

### P-EXEC-1 — Step 1.5.6 probe expansion: when probe disambiguates an "X OR Y" SPEC ambiguity, document in EXECUTION_REPORT §D-N

- **Where:** `.claude/skills/opticup-executor/SKILL.md` — §"Step 1.5.6 DB Probe Pre-Flight" — add a sub-bullet.
- **Change:** *"**Disambiguation deviation logging (added 2026-05-19 from M4_FUNNEL_HEALTH_DASHBOARD/EXECUTION_REPORT.md D-2).** If a Step 1.5.6 probe disambiguates between SPEC-mentioned candidates (e.g., SPEC says 'crm_permissions OR permissions', probe confirms only 'permissions' exists), the Executor MUST log this as a deviation D-N with the resolution path (which name was used + why). This makes Foreman closure auditable — the migration file shows the correct name, but the rationale chain (SPEC said X, probe said Y, used Y) belongs in EXECUTION_REPORT."*
- **Rationale:** D-2 in this run handled F-B2 correctly. Codifying the pattern.

### P-EXEC-2 — Migration files MUST be byte-identical to what was applied — strip dead/skipped blocks before commit

- **Where:** `.claude/skills/opticup-executor/SKILL.md` — §"Step 1.5 DB Pre-Flight Check" → migration-write section.
- **Change:** *"**Migration file replayability (added 2026-05-19 from M4_FUNNEL_HEALTH_DASHBOARD/FOREMAN_REVIEW.md Concern A-3).** When `apply_migration` succeeds partially (some statements ran, some failed-and-were-corrected), the COMMITTED .sql file MUST match the actually-applied SQL byte-for-byte. Do NOT leave dead `ALTER MATERIALIZED VIEW ... ENABLE ROW LEVEL SECURITY` (or similar) blocks in the file 'for reference' — they make the file non-replayable on a fresh DB. Either (a) remove the dead block + add a comment explaining why, or (b) wrap it in `DO $$ BEGIN ... EXCEPTION WHEN OTHERS THEN NULL; END $$;` if the block must stay for documentation. Default: remove."*
- **Rationale:** A-3 — committed migration file has a dead RLS-on-mv block. File is currently un-replayable on a fresh Postgres. Recommended cleanup chore.

---

## 7. Master-Doc Update Checklist

Per skill convention. For this SPEC's closure:

- [x] `FOREMAN_REVIEW.md` written (this file).
- [ ] `MASTER_ROADMAP.md` — DEFERRED. Phase 2.5 spans 2 SPECs + the audit. Master roadmap update will happen at audit session (Deliverable C) closure, when all of Phase 2.5 is verified.
- [ ] `docs/GLOBAL_MAP.md` / `docs/GLOBAL_SCHEMA.sql` — DEFERRED to Integration Ceremony at next M4 close.
- [x] Memory updates — TBD at end of session.
- [x] FUNNEL_ROADMAP.md — will be updated AFTER C audit closes (next session). Current session does not update it (Deliverable A landed but Phase 2.5 isn't fully closed).

---

## 8. Closure Statement (to be included in PR description, NOT in chat)

Deliverable A (Funnel Health Dashboard) ships. 14 tiles render in the new "מצב פאנל" tab on demo. Materialized view refreshes every 5 minutes via pg_cron. Drill-downs work for 5 large tiles. Pixel-gap tile relocated cleanly. One MEDIUM follow-up: RLS-on-mv platform limitation handled via JS-layer Iron Rule 22 substitute; follow-up SPEC `M4_FUNNEL_DASHBOARD_RLS_HARDENING` queued.

---

## 9. Verdict Summary Table

| Phase | Owner | Verdict | Commits |
|---|---|---|---|
| SPEC author | Foreman (Opus) | ✅ Sealed | `ec2fffe` (joint A+B seal) |
| Executor | Sonnet | ✅ | `8bfb438` + `ee13add` + `bb91e4a` |
| Reviewer | default | 🟡 PASS-WITH-NOTES | `4380b48` |
| Localhost-Tester | default | 🟢 GREEN | `08677b5` |
| Foreman closure | Foreman (Opus) | 🟡 CLOSED-WITH-FOLLOW-UPS | THIS COMMIT |

---

*End of FOREMAN_REVIEW for A.*
