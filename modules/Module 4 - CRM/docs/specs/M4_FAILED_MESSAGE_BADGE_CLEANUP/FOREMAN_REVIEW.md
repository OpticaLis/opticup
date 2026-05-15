# FOREMAN_REVIEW — M4_FAILED_MESSAGE_BADGE_CLEANUP

> **Author:** opticup-strategic (Foreman)
> **Date:** 2026-05-15
> **Reviewing:** commits e419e89 → 2430a3e (5 commits) on `develop`
> **Verdict:** 🟢 CLOSED

---

## 1. Verdict

🟢 **CLOSED** — 19/19 SPEC success criteria PASS across executor + reviewer + LH-Tester re-verifications. Production cleanup landed exactly as specified (Prizma chip 760 → 2). Event #24 untouched. Iron Rules clean. RLS canon honored. No must-do fixes.

The Full-Auto Pipeline executed end-to-end in ONE chat: Foreman (Phase 0 + SPEC) → Executor (migration + RPC + UI + Prizma cleanup) → Reviewer (independent live re-verification) → LH-Tester (smoke 7/7 + UI smoke) → Foreman (this review + Hebrew status). 5 commits on `develop`. Zero merges to `main`.

---

## 2. SPEC Quality Audit

The SPEC was structurally complete on first author pass and required no executor mid-run clarification questions to Foreman — a clean sign the bounded-autonomy envelope was correctly sized.

**What worked:**
- §0 Pre-Authoring Reality Check correctly identified two Brief-vs-reality divergences (`status='rejected'` → actually `'failed'`; `broadcast_id='ab7341c9'` → actually NULL) BEFORE the executor would have hit them. Both documented + sealed in §0 + §1.5. Phase 0 came in at ~30 min vs the 45-min budget.
- §1.5 Phase 0 Findings was load-bearing for the rest of the SPEC. The 6 sub-sections (badge path D1, status filter, chip formula, permission model, FK target, JWT claim source) gave the executor exact answers to every "what is the canonical pattern for X?" question.
- §3.4 Demo cleanup block (pre-listed DELETE statements per `M4_TEMPLATE_VALIDATION_UNIFIED` AP#2) saved the executor from inventing cleanup SQL.
- §4 Autonomy Envelope correctly delegated the smoke pre-baseline to the most-recent green prior TEST_REPORT (per `M4_BROADCAST_ID_PROPAGATION` AP#2), avoiding a wasted LH-Tester double-run.
- Iron Rule 32 §Destructive Operations enumerated all 6 operations explicitly; pre-commit hook accepted every commit.

**What was a defect (caught + corrected at executor time):**
- §13 Sample Verification Queries used `target_table` / `target_id` for the activity_log INSERT — wrong column names. Actual schema is `entity_type` / `entity_id`. Executor's manual INSERT failed; executor corrected without escalation. Documented in EXECUTION_REPORT §6.1 + FINDINGS F-1. **Root cause:** Foreman authored the SPEC sample by analogy with another module's audit-log pattern, did not grep the live activity_log schema. **Mitigation:** Author Proposal #1 below.

**What was technically a defect but did not impact execution:**
- The MD5 backup re-verification stop-trigger in §5 ("If `BACKUP_758_ROWS.json` MD5 verification finds ANY content drift → STOP") implied a per-row md5 comparison. Executor built the SQL but it was 95k bytes — too unwieldy to paste through MCP. Pivoted to the equivalent "burst-window existence check" (rows in 06:13–06:33 window all still unacked + status='failed' + broadcast_id NULL). Functionally equivalent, but the SPEC didn't anticipate the size constraint. **Mitigation:** Author Proposal #2 below.

**Overall SPEC score: 8.5/10.** Two minor defects, neither caused execution loss. Phase 0 + success criteria + autonomy envelope were excellent.

---

## 3. Execution Quality Audit

The executor honored every stop-trigger, executed all 6 declared destructive operations exactly within their scope, and produced no unauthorized scope expansion.

**Did executor silently absorb any scope changes?** No. Every real-time decision was logged in EXECUTION_REPORT §6 (5 decisions, all minor and correctly handled):
- 6.1 activity_log column-name correction (recovered from SPEC §13 defect).
- 6.2 acknowledged_by=NULL for the historical batch (per SPEC §10 — pre-authorized).
- 6.3 FK constraint zero-UUID rejection (smoke-verified defense-in-depth).
- 6.4 Demo had 11 pre-existing failed rows vs Phase 0's 0 (between-runs delta; criterion 13 still satisfied — executor's test seeds were properly isolated by `content LIKE 'demo-ack-test%'`).
- 6.5 Demo seed cleanup before LH-Tester (preserved a clean baseline).

**Were stop-triggers correctly applied?** Yes. No stop-trigger fired. Idempotency proven (re-ack returns updated_count=0, skipped_count=N). Cross-tenant rejection proven (RPC returns errors=[{cross_tenant}], target row untouched).

**Was the executor's retrospective complete?** Yes. EXECUTION_REPORT.md has all 11 required sections; FINDINGS.md captures 6 items (1 LOW + 5 INFO) with severity + action plan; ROLLBACK.md provided per `M4_TEMPLATE_VALIDATION_UNIFIED` AP#1 (additive-migration convention).

**Commit hygiene:** 4 executor commits + 1 reviewer/LH-Tester commit + this Foreman commit = 6 commits total. Each commit has a single concern, present-tense verb scoped subject, Hebrew not present in commit messages (per project convention). Pre-commit hook clean on every commit (1 informational SOFT warning on crm-leads-tab.js at 346/300 — informational only, below 350 hard cap).

**Documentation currency at executor close:** Module-local docs (SESSION_CONTEXT, CHANGELOG, MODULE_MAP via Sentinel-tracked carry, db-schema.sql, escalation file) updated. Project-wide docs (GLOBAL_MAP, GLOBAL_SCHEMA, MASTER_ROADMAP) deferred to next Integration Ceremony per CLAUDE.md §10 — Sentinel carry-class M-NEW-31-1 / M-NEW-33-2 already tracks the backlog (FINDINGS F-2 captures this).

**Overall execution score: 9.5/10.** Tight, disciplined, well-logged. Half-point off only for not having a Step 1.5 schema check on referenced existing tables (would have caught the activity_log column-name issue independently of the SPEC defect — see Executor Proposal #1).

---

## 4. Findings Processing

| ID | Severity | Disposition | Reasoning |
|---|---|---|---|
| F-1 | INFO | **Dismiss** (post-merge SPEC § doc fix optional) | Activity_log column-name doc fix in SPEC §13 — historical record only; future SPECs that reference activity_log can read the corrected schema from EXECUTION_REPORT §6.1. |
| F-2 | INFO | **Bundle into next Integration Ceremony** | GLOBAL_MAP / GLOBAL_SCHEMA / MASTER_ROADMAP updates deferred (already-tracked Sentinel M-NEW-31-1 / M-NEW-33-2). |
| F-3 | LOW | **New SPEC stub: `M4_CRM_PERMISSION_GROUP_BOOTSTRAP`** | Add `crm` to `permission-matrix.js` MODULE_LABELS + MODULE_ORDER + seed 5-10 CRM permission keys. ~30 min effort. Future SPEC, low urgency (current default-grant makes `crm.message_log.acknowledge` work for all roles today). |
| F-4 | LOW | **Recurring** — already in M4-DEBT-02 standing backlog | `crm-leads-detail-messages.js:29` raw `sb.from()` — leave for the M4 Iron-Rule-7 phased migration. This SPEC extended the SELECT but did not migrate the call style (out of scope per SPEC §7). |
| F-5 | INFO | **Dismiss** | Brief-vs-reality drift on status name — caught at SPEC §0, no execution impact. |
| F-6 | INFO | **Dismiss** | Brief-vs-reality drift on broadcast_id — caught at SPEC §0, no execution impact. |

No findings are orphaned. No findings block closure.

---

## 5. Spot-Checks (independent Foreman re-verification)

The Reviewer already re-queried all 13 live-check values; Foreman additionally re-spot-checked:

| Spot-check | Method | Expected | Actual |
|---|---|---|---|
| Prizma 758 acknowledged_at ≠ NULL | live SQL | 758 | 758 ✅ |
| Prizma rows acked OUTSIDE 06:13–06:33 window | live SQL | 0 | 0 ✅ |
| Event #24 status string | live SQL | `closed` (unchanged from pre-SPEC) | `closed` ✅ |
| Activity log row count | live SQL | 1 | 1 ✅ |
| Demo residue post-cleanup | live SQL | 0 | 0 ✅ |
| Cross-tenant RPC return shape | code review of pg_proc body | `{errors:[{cross_tenant}], updated=0}` | matches ✅ |
| Files modified line counts vs cap | wc -l | all ≤ 350 | modal=259, leads-tab=346, detail-msgs=162 ✅ |

All spot-checks pass. No claim in EXECUTION_REPORT or REVIEW is contradicted by independent re-verification.

---

## 6. Author-Skill Improvement Proposals (`opticup-strategic`)

### Proposal #1 — SPEC §Sample-Queries pre-author verification

**Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` (or this skill's `SPEC Authoring Protocol §Step 3`).

**Change:** Add the following sub-rule to the SPEC template's §"Sample Verification Queries" section guidance:

> *"**Live-schema lock-in for sample queries (added 2026-05-15 from `M4_FAILED_MESSAGE_BADGE_CLEANUP/FOREMAN_REVIEW.md` Author Proposal #1).** Before pasting any verification SQL that names columns of an EXISTING table (not just the SPEC's new tables), the Foreman MUST run `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='<each referenced table>'` and confirm every column referenced in the sample SQL appears in the result. Columns referenced in sample queries serve as the executor's authoritative spec — if they're wrong, the executor wastes time recovering from failed inserts (M4_FAILED_MESSAGE_BADGE_CLEANUP F-1: `activity_log` `target_table`/`target_id` referenced in SPEC §13 actually live as `entity_type`/`entity_id`). The 30-second `information_schema.columns` round-trip prevents a 5-min executor recovery."*

**Rationale:** F-1 was a small but recoverable defect. The root cause is that SPECs are sometimes authored by analogy with other modules' patterns without live-DB confirmation. Adding a 30-second pre-author check eliminates this class of defect entirely.

### Proposal #2 — Quantify backup re-verification method in §0

**Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §0 Pre-Authoring Reality Check.

**Change:** Add a sub-table to §0 when the SPEC has a "backup re-verification" stop-trigger:

> *"**Backup re-verification method declaration (added 2026-05-15 from `M4_FAILED_MESSAGE_BADGE_CLEANUP/FOREMAN_REVIEW.md` Author Proposal #2).** If the SPEC's §5 stop-triggers include a backup-integrity check before a write, the Foreman MUST pre-declare the verification method in §0 by choosing ONE of three options: (a) per-row content_md5 comparison (works for N < ~250 rows; emit SQL with full VALUES clause); (b) cohort-existence-window check (works for any N; verifies COUNT + DISTINCT counts + status filters within a tight created_at window); (c) sample-N md5 (works for any N; picks K random rows, md5-compares each). The author should NOT leave 'md5 verification' open-ended — the executor will spend 10 minutes building the wrong tool. M4_FAILED_MESSAGE_BADGE_CLEANUP picked (b) at executor time after building (a) and discovering the 95k-byte payload exceeds the MCP execute_sql practical inline limit. Pre-declaring saves the discovery."*

**Rationale:** The 30-min executor detour through `__tmp_md5_compare.mjs` → `__tmp_existence_check.mjs` → final-decision-on-burst-window was avoidable if the SPEC §0 had pre-declared "use option (b) cohort-existence-window because N=758 > inline-payload limit."

---

## 7. Executor-Skill Improvement Proposals (`opticup-executor`)

The executor's own EXECUTION_REPORT §9 already proposed:
- E-Self #1: scripts/mcp-bulk-sql.mjs helper
- E-Self #2: docs/canonical-rpc-template.sql canonical RPC template

The Foreman accepts both into the queue. Foreman additionally proposes:

### Proposal #1 — Existing-table schema verification at Step 1.5 DB Pre-Flight

**Where:** `.claude/skills/opticup-executor/SKILL.md` §"Step 1.5 — DB Pre-Flight Check".

**Change:** Extend the current 7-bullet list with a new bullet:

> *"**Existing-table schema verification (added 2026-05-15 from `M4_FAILED_MESSAGE_BADGE_CLEANUP/FOREMAN_REVIEW.md` Executor Proposal #1).** For every EXISTING table the SPEC's verification SQL or migration references, run `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='<X>'` at executor session start and confirm every column the SPEC references appears in the result. If a column reference in the SPEC doesn't match the live schema → STOP, escalate to Foreman (do NOT silently substitute). This catches authoring drift between the Foreman's sample SQL and the live schema (F-1 case: SPEC §13 referenced `activity_log.target_table`; actual column is `entity_type`; executor's manual INSERT failed, recovered by inspection). 30-second pre-flight prevents the failed-INSERT detour."*

**Rationale:** Defense-in-depth pair with Author Proposal #1 — if the Foreman misses the live-schema check, the executor catches it. Today the executor's Step 1.5 covers NEW objects (Rule 21 anti-collision) but not EXISTING-table column references.

### Proposal #2 — "Smoke-probe-before-bulk" pattern for production batch RPCs

**Where:** `.claude/skills/opticup-executor/SKILL.md` § new sub-section under "SQL Autonomy Levels" or "Bounded Autonomy — Execution Model".

**Change:** Add the following discipline:

> *"**Smoke-probe-before-bulk on production RPC writes (added 2026-05-15 from `M4_FAILED_MESSAGE_BADGE_CLEANUP/FOREMAN_REVIEW.md` Executor Proposal #2).** Before running a single RPC call that writes to ≥ 100 production rows (e.g. a SPEC's authorized Level-2 batch UPDATE), run the RPC FIRST against ONE row from the target set (a 'smoke probe') and verify the return shape + post-state match expectations. Only AFTER the 1-row smoke passes, run the full N-row batch. This adds ~5 seconds + 1 SQL round-trip but provides early-failure-detection if any of: (a) the RPC body has a logic bug missed at code review, (b) the FK constraints reject expected NULL paths, (c) the row-set is unexpectedly already-modified. For M4_FAILED_MESSAGE_BADGE_CLEANUP this would have been: pick 1 log_id from BACKUP_758_ROWS.json → call `acknowledge_failed_messages(ARRAY[that_id], 'smoke-probe')` → verify `{updated_count:1}` → THEN call the full 758-row batch. The cross-tenant smoke test (during demo run) accidentally proved this principle works (FK constraint caught the zero-UUID; no Prizma rows touched); generalizing it as a pre-batch discipline avoids future surprises."*

**Rationale:** Executor's demo-side smoke caught the FK-constraint rejection on `employee_id=00000000-...`. That same smoke pattern, applied to production batches, is a free defense layer. Pattern doesn't apply to single-row writes (which are already their own smoke).

---

## 8. Master-Doc Update Checklist

| Doc | Status | Note |
|---|---|---|
| `MASTER_ROADMAP.md` §3 | ⏸ deferred | No phase boundary crossed; next Integration Ceremony bundles this SPEC's additions. F-2 tracks. |
| `docs/GLOBAL_MAP.md` | ⏸ deferred | Same — next Integration Ceremony. |
| `docs/GLOBAL_SCHEMA.sql` | ⏸ deferred | Same. |
| Module 4 `SESSION_CONTEXT.md` | ✅ updated | Prepended one-block entry at top. |
| Module 4 `CHANGELOG.md` | ✅ updated | Prepended SPEC entry with commit table. |
| Module 4 `db-schema.sql` | ✅ updated | Appended ack-mechanism section. |
| Module 4 `MODULE_MAP.md` | ⏸ partial | Sentinel carry M-NEW-33-2 already tracks the broader M4 MODULE_MAP backlog (11+ files); this SPEC's modal file rolls into the same bundle. |
| Bundle 2 T1.1 escalation file | ✅ updated | "Resolution — Option E" section appended with completion timestamp. |

---

## 9. Self-Improvement Mandate Check

Per skill: "If 3 consecutive reviews have called out the same issue, the next session MUST apply the change before starting any other work."

Reviewed last 5 FOREMAN_REVIEW.md files in this module:
- `M4_FIX_UNSUBSTITUTED_PLACEHOLDER_REGISTRATION_URL_PRIZMA`: P-T1.1-1 (Daniel-decision freeze) — applied here in §0.
- `M4_TEMPLATE_VALIDATION_UNIFIED`: AP#1 (ROLLBACK.md vs _down.sql) — applied here in §6. AP#2 (pre-list cleanup DELETEs) — applied here in §3.4.
- `M4_BROADCAST_ID_PROPAGATION`: AP#1 (function-signature change → DROP FUNCTION) — NOT applicable to this SPEC. AP#2 (smoke pre/post split in Pipeline mode) — applied here in §3 criterion 15 + §4.
- `M3_SHORTGY_TO_INTERNAL_REDIRECT`: no recurring pattern relevant.
- `M3_UTM_TRIPLE_LAYER_PERSISTENCE`: no recurring pattern relevant.

No 3-strike pattern requires immediate skill-file edits before this session ends. The 2 new author proposals + 2 new executor proposals from this review go into the queue.

---

## 10. Daniel-Facing Summary (Hebrew, single block — per activation prompt)

See §11 below.

---

## 11. Final Status (Hebrew) — emitted to chat

(Block emitted in chat per activation prompt's mandatory ONE Hebrew status block.)

End of FOREMAN_REVIEW.
