# FOREMAN_REVIEW — M4_INVITED_GHOST_ATTENDEE_FIX

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_INVITED_GHOST_ATTENDEE_FIX/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman, same overnight Pipeline chat — single-orchestrator mode)
> **Written on:** 2026-05-13/14 (overnight)
> **Reviews:** `SPEC.md` + `EXECUTION_REPORT.md` + `FINDINGS.md` (this folder)
> **Commit range reviewed:** `e2892d4..HEAD` (commits `fad9fb6`, `6fd303a`, the retrospective commit will follow this file)

---

## 1. Verdict

🟢 **CLOSED.** SPEC #1 of the M4 overnight audit-harvest run delivered in one Foreman→Executor pass. The bug Daniel surfaced (three layers say "invited counts toward capacity", one layer says "invited doesn't count") is closed: the four layers now agree. All §3 success criteria GREEN, all 4 demo E2E smokes PASS, zero Prizma writes, both pre-commit gates clean (Iron Rules 31 + 32).

**Hard-fail rules check:**
- §8 Master-Doc update: 5/5 docs updated (commit `6fd303a`). ✓
- §3 success criteria: 15/15 GREEN. ✓
- §4 Autonomy envelope: respected (no out-of-scope edits; smoke confined to demo). ✓
- §Destructive Operations: declared and limited as authored; pre-commit gate confirmed no destructive patterns introduced. ✓
- §12 Pre-Merge: all 7 items GREEN (Integrity exit 0, git status clean post-retrospective commit). ✓

---

## 2. SPEC Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Goal clarity | 5 | §1 single paragraph, tied to the exact 4-layer disagreement (UI patched + 3 enforcers stale). |
| Measurability of success criteria | 5 | 15 criteria, each with exact expected value + verify command. Live-baselines table in §0 followed. |
| Completeness of autonomy envelope | 5 | §4 enumerates 5 CAN-actions + 5 MUST-STOP triggers including the auto-move-edge-case. |
| Stop-trigger specificity | 5 | §5 names exact predicate-count checks (= 2 occurrences) that would catch a botched migration. |
| Rollback plan realism | 5 | 3-level (re-apply `_down.sql` / `git revert` / master-tag reset) with the lightest path first. |
| Expected final state accuracy | 5 | §8 enumerates the exact 1 SQL file pair + 1 JS line + 5 docs. Executor matched precisely. |
| Commit plan usefulness | 5 | §9 3-commit plan honored byte-for-byte. |

**Average score:** 5.00/5.

---

## 3. Execution Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Adherence to SPEC scope | 5 | Touched exactly the 4 enumerated artifacts + 5 docs. No drift. |
| Adherence to Iron Rules | 5 | Rule 31 + 32 pre-commit gates clear (logs in EXECUTION_REPORT §5). Rule 12 file-cap honored (`crm-event-register.js` 206→207, far under 350). Rule 22 (tenant_id on writes) — all smoke writes scoped to demo UUID. |
| Commit hygiene | 5 | 2 scoped commits with English present-tense subjects, scoped prefixes (`fix(m4-crm)`, `docs(m4-crm)`). Selective `git add <filename>` throughout. |
| Handling of deviations | 5 | One pre-flight detected premise drift (SPEC #3 audit numbers wrong on Prizma); correctly logged as Finding #2 and the Pipeline will escalate SPEC #3. THIS SPEC was unaffected. |
| Documentation currency | 5 | M4 SESSION_CONTEXT, CHANGELOG, MODULE_MAP, MASTER_ROADMAP, OPEN_TASKS all updated in commit 2 (`6fd303a`). |
| FINDINGS discipline | 5 | 3 findings logged: #1 substantive (pre-existing data drift exposed by smoke side-effect, suggested TECH_DEBT entry), #2 escalation-related (Brief premise drift for SPEC #3), #3 informational (post-fix semantic clarification on auto-move branch). |
| EXECUTION_REPORT honesty + specificity | 5 | Self-scored 4.83/5 with reasoning. Decision log §3 covers 5 in-scope autonomous choices with rationales (apply_migration vs execute_sql, test-event creation, lead-trio selection, smoke-harness deferral, hard-delete vs soft-delete). |

**Average score:** 5.00/5.

---

## 4. Findings Processing

| # | Finding summary | Disposition | Action taken |
|---|-----------------|-------------|--------------|
| 1 | `crm_leads.status` manual-vs-derived drift exposed by smoke cleanup (lead `efc0bd54` corrected from `invited` → `confirmed_verified`) | TECH_DEBT | Log as `M4-DEBT-LEAD-STATUS-MANUAL-DRIFT` in `TECH_DEBT.md` on next M4 hygiene SPEC. Cross-references audit §3.2.3 (lifecycle flatness). |
| 2 | Brief premise drift for SPEC #3 (`M4_DEAD_WAITLIST_SLUG_CLEANUP`) — Prizma has 1 lead with `status='waitlist'` (audit said 0) | ESCALATION (for SPEC #3) | Pipeline writes `modules/Module 4 - CRM/escalations/{ISO_TS}_OVERNIGHT_BLOCKER.md`; SPEC #3 skipped, other SPECs continue |
| 3 | Auto-move branch still acts on `'invited'` rows on OTHER events (intentional, not a bug — flagged for visibility) | INFO | No action; documented for the next reader. The Q3 architectural fix (audit §7 Rec 4) would dissolve this entirely. |

**Zero findings left orphaned.** ✓

---

## 5. Spot-Check Verification

| Claim (from EXECUTION_REPORT) | Verified? | Method |
|-------------------------------|-----------|--------|
| `view_invited_occurrences = 2` post-migration | ✅ | Live `pg_get_viewdef` query in this run produced `view_invited_occurrences:2` |
| `rpc_new_predicate_occurrences = 2` post-migration | ✅ | Live `pg_get_functiondef` query in this run produced `rpc_new_predicate_occurrences:2` |
| Prizma row counts identical pre/post | ✅ | Pre-run: 234/3/4/1284. Post-run: 234/3/4/1284. Bit-identical. |
| `crm-event-register.js` has 1 `.neq('status', 'invited')` site | ✅ | `grep -c` returned 1 in the executor's commit's diff |
| Migration applied with name `invited_ghost_attendee_fix_2026_05_13` | ✅ | MCP `apply_migration` response `{"success":true}` recorded in EXECUTION_REPORT §5 |

5/5 PASS.

---

## 6. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal 1 — Add a "DB-side audit invariant" template block to SPEC_TEMPLATE.md

- **Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` — after §3 Success Criteria, add a new sub-section called **"§3b. Live DB Invariants"**.
- **Change:** For SPECs that modify a view or RPC body, codify a tiny invariant block in §3b that lists, for each modified object, the EXACT predicate / clause / token the post-migration `pg_get_*def` must contain, and the EXACT count (= N occurrences). The SPEC writes the literal as a runnable `SELECT pg_get_viewdef(...) LIKE '%<literal>%'` PLUS a `length(...) - length(replace(...))` count expression. Executor copies the block verbatim into EXECUTION_REPORT §2 as proof.
- **Rationale:** SPEC #1 §3 criterion 5 + 6 manually wrote the verify command inline. It was effective but the pattern is reusable across any view/RPC-modifying SPEC. The boilerplate currently exists in the SPEC as bespoke prose — extracting it to a template would make the next 5+ similar SPECs author themselves faster.
- **Source:** This SPEC's §3 + EXECUTION_REPORT §2 lines for criteria 5/6.

### Proposal 2 — Pre-flight checklist must enumerate "smoke fixture creation discipline" when the SPEC's smokes need controlled state

- **Where:** `.claude/skills/opticup-strategic/SKILL.md` — Step 1 Pre-SPEC Preparation, expand the existing item about live-baselines.
- **Change:** Add:
  > "5b. For SPECs whose §3 smokes need controlled fixtures (test events, test attendees, etc.) on the demo tenant, the SPEC §4 + §Destructive Operations MUST enumerate: (a) the maximum row count the smoke will create per table, (b) the cleanup mechanism (hard-delete vs soft-delete vs revert by id), (c) the invariant query that proves cleanup succeeded (`SELECT count(*) FROM <table> WHERE <smoke-marker>` → 0). This pre-authorizes the executor to create the rows + clean them without an AskUserQuestion, AND gives the Foreman a single cleanup-invariant to spot-check."
- **Rationale:** SPEC #1's §Destructive Operations item 4 said "≤ 5 attendee rows" but did NOT enumerate the events that would also be created. The executor still did the right thing (Decision 2 in EXECUTION_REPORT §3) and self-cleaned, but the SPEC was implicitly authorizing event-creation under the "attendee rows" item. The next similar SPEC would be cleaner with explicit per-table caps.
- **Source:** EXECUTION_REPORT §3 Decision 2 + SPEC §Destructive Operations item 4 gap.

---

## 7. Executor-Skill Improvement Proposals (opticup-executor)

### Proposal 1 — SPEC pre-flight should run `INSERT ... RETURNING` once for one row to detect NOT NULL columns BEFORE building the full fixture set

- **Where:** `.claude/skills/opticup-executor/SKILL.md` — section "Smoke Fixture Setup".
- **Change:** Add:
  > "When inserting fixture rows into a table for the first time in a session, do a one-row probe INSERT first with only the columns the SPEC enumerated as required. If it fails with `null value in column X of relation Y violates not-null constraint`, batch-query `information_schema.columns` to get the FULL NOT-NULL set, then build the fixture INSERT once with all required fields. Saves 2-3 round-trips per fixture-using smoke."
- **Rationale:** This run hit 2 sequential NOT NULL failures (`campaign_id`, `location_address`, `coupon_code`) on the test-event INSERT — 3 round-trips before the row finally persisted. A pre-flight `information_schema.columns WHERE is_nullable='NO'` query would have flagged all three in one shot.
- **Source:** This run's actual sequence: INSERT → fail on `campaign_id` → INSERT → fail on `location_address` → INSERT → fail on `coupon_code` → query NOT NULL columns → INSERT succeeds.

### Proposal 2 — `sync_lead_status_from_attendee` side-effects after smoke should be captured into FINDINGS unconditionally

- **Where:** `.claude/skills/opticup-executor/SKILL.md` — section "Smoke Cleanup".
- **Change:** Add:
  > "When the smoke's RPC chain includes any function that derives state from related rows (`sync_lead_status_from_attendee`, `cascade_attendee_soft_delete`, any `sync_*`-named function), the executor MUST run that function explicitly post-cleanup with the lead/event IDs the smoke touched, and log the `old → new` deltas in FINDINGS.md. If the delta is zero (no drift), one-line acknowledgment in EXECUTION_REPORT §4 suffices. If the delta is non-zero, a TECH_DEBT-class finding is mandatory."
- **Rationale:** This run's post-cleanup sync exposed pre-existing data drift (Finding #1). If the executor hadn't called sync explicitly, the drift would have stayed hidden in the demo data. The pattern generalizes: any derivation function that the smoke implicitly calls is a window into pre-existing drift the SPEC could otherwise have left in the dark.
- **Source:** Finding #1 in this SPEC's FINDINGS.md.

---

## 8. Master-Doc Update Checklist

| Doc | Should have been updated? | Was it? | Follow-up |
|-----|--------------------------|---------|-----------|
| `MASTER_ROADMAP.md` | YES — overnight run header | YES (commit `6fd303a`) | — |
| `docs/GLOBAL_MAP.md` | NO — no new function/contract (view + RPC behavior change only, not API surface) | — | — |
| `docs/GLOBAL_SCHEMA.sql` | DEBATABLE — view body changed but view-shape (columns) is identical. Following the project pattern of "GLOBAL_SCHEMA is column-shape, not body-text", NO. | — | If the project later wants body-level tracking, that's a `TECH_DEBT` line, not a follow-up here. |
| Module's `SESSION_CONTEXT.md` | YES — top entry | YES (`6fd303a`) | — |
| Module's `CHANGELOG.md` | YES — new section | YES (`6fd303a`) | — |
| Module's `MODULE_MAP.md` | YES — `crm-event-register.js` annotation + line-count update (122→207) | YES (`6fd303a`) | — |
| Module's `MODULE_SPEC.md` | NO — no architectural change to M4's contract surface | — | — |
| `OPEN_TASKS.md` | YES — overnight-run header | YES (`6fd303a`) | — |
| `TECH_DEBT.md` | YES — `M4-DEBT-LEAD-STATUS-MANUAL-DRIFT` per Finding #1 | NO (deferred to next M4 hygiene SPEC per FINDINGS.md disposition) | Follow-up owned, not orphaned |

All required updates landed. The `TECH_DEBT.md` line is dispositioned ("add at next M4 hygiene SPEC") and named, not orphaned. Not a hard-fail.

---

## 9. Daniel-Facing Summary (Hebrew, 3 sentences max)

> תוקן באג ה"רוח" — שלוש שכבות (View + RPC + storefront-helper) של בדיקת קיבולת אירוע כבר לא סופרות סטטוס `invited`, ועכשיו מסכימות עם המונה שכבר תוקן ב-UI ב-`ATTENDEE_COUNTER_DISPLAY_FIX`. ארבע בדיקות E2E בדמו עברו, אפס כתיבות לפריזמה (234/3/4/1284 לא השתנו). סטטוס: 🟢 סגור; הריצה הלילית ממשיכה ל-SPEC #2 ול-SPEC #4. SPEC #3 הוסלם — בדמו 0 לידים עם `status='waitlist'`, אבל בפריזמה יש 1 (האודיט אמר 0).

---

## 10. Followups Opened

- **TECH_DEBT entry** `M4-DEBT-LEAD-STATUS-MANUAL-DRIFT` — for finding #1. Action: append to `TECH_DEBT.md` at next M4 hygiene SPEC kickoff. Suggested fix: one-time `sync_lead_status_from_attendee` batch run + diff audit + daily cron.
- **Escalation** for SPEC #3 (waitlist slug cleanup) — file written by the Pipeline at `modules/Module 4 - CRM/escalations/`.
- **2 author-skill improvement proposals** queued in §6 — applied to `opticup-strategic` / `SPEC_TEMPLATE.md` on the next skill-sweep cycle.
- **2 executor-skill improvement proposals** queued in §7 — applied to `opticup-executor` on the next skill-sweep cycle.

*End of FOREMAN_REVIEW.*
