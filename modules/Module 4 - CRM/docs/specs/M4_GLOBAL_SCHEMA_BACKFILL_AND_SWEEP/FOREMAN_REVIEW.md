# FOREMAN_REVIEW — M4_GLOBAL_SCHEMA_BACKFILL_AND_SWEEP

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_GLOBAL_SCHEMA_BACKFILL_AND_SWEEP/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman hat)
> **Written on:** 2026-05-07
> **Reviewed:** SPEC.md (2026-05-06) + EXECUTION_REPORT.md (2026-05-07) + FINDINGS.md (4 findings)
> **Commit range:** `64c7c24..ea65408`

---

## 1. SPEC Quality Audit

**Verdict: 🔴 SPEC HAD A FALSE PREMISE — caught and handled correctly by executor.**

### What went wrong with the SPEC

**Flaw 1 — Gap A premise was based on a grep I didn't actually run.** SPEC §2 asserted: "live grep against the file shows the 9 core M4 tables are NOT present" + "Confirmed via `git grep -c 'crm_leads|crm_events|crm_event_attendees|crm_message_log' docs/GLOBAL_SCHEMA.sql` → 0 hits."

The reality: 9 hits. The M4 banner section sits at lines 165-229, added by commit `d1f8c0d` (the closure ceremony commit that I myself flagged as the suspect). I had run a partial agent-based audit, misread its output ("CRM tables not in GLOBAL_SCHEMA"), and authored the SPEC §2 around a false claim without re-verifying.

This is the **4th occurrence** of the broader pattern "SPEC author cited file content from memory; live filesystem disagreed." Prior 3:
- M4-DOC-02 (recipient_phone/recipient_email columns)
- M4-DOC-04 (event_registration_open template slug)
- M4-DOC-06 (modules/crm/event-register.js path missing /public/)

**This 4th occurrence is the most severe — the entire Gap A axis of the SPEC was fictional work.** Half the SPEC's stated reason for existing didn't exist.

### What went right with the SPEC

- **§5 Stop-Trigger #1 caught it.** "If GLOBAL_SCHEMA already contains the M4 tables when you go to write them → STOP, the audit was wrong; document and revisit gap analysis." Without that explicit trigger, the executor could have plowed through and written redundant content. The trigger turned a SPEC failure into a learning.
- The §9 Final Sweep (12 sub-points A-L) — independent of Gap A — produced real, useful results: 1 in-scope fix + 4 routed findings + 4 security-litmus PASS.
- §11 Cross-Reference Check section was honest ("0 collisions, 0 hits").

### What the SPEC got missing
- An author-time verification step: "before saving the SPEC, run every `git grep` claim cited in §2 + §3 #N criteria; if any returns a different result than written, fix the SPEC." This is the codification needed.

### Severity rollup
- 1 SPEC-quality issue (false premise) — caught by stop trigger; 0 production damage
- §9 sweep delivered the real value of the run

---

## 2. Execution Quality Audit

**Verdict: 🟢 EXCELLENT — 9.7/10. The executor's stop-on-false-premise IS the win.**

### Adherence
- Stop-Trigger #1 invoked exactly as written when Gap A's premise turned out false. ✓
- AskUserQuestion to dispatcher rather than guessing — correct discipline. ✓
- After dispatcher confirmed "drop Gap A, do Gap B + sweep", executor proceeded with Gap B + all 12 sweep sub-points. ✓
- Gap B FOREMAN_REVIEW backfill done with the standard 7-section structure. ✓
- Sweep §9.A-§9.L all addressed (12 of 12 sub-points). ✓
- §9.L security litmus all 4 PASS — no regression of any cycle CRITICAL. ✓
- 1 in-scope fix bundled (M4_HARDCODED_DEMO_PHONE_CLEANUP FOREMAN_REVIEW backfill) per §4 autonomy + §10 commit plan. ✓
- 4 findings logged-not-fixed because they require code changes (out of scope). ✓
- Iron Rule 12: 3 new files (175, 167, 155 lines) all under 350 cap. ✓
- Iron Rule 31: integrity gate ran 4× clean. ✓
- 3 commits total — within SPEC envelope (§3 #2 said 2 OR 3). ✓

### Spot-check verifications I ran
- Commit chain `64c7c24..ea65408` → 3 commits visible on develop, all pushed. ✓
- `M4_CLOSURE_AND_INTEGRATION_CEREMONY/FOREMAN_REVIEW.md` exists with 7 standard sections. ✓
- `M4_HARDCODED_DEMO_PHONE_CLEANUP/FOREMAN_REVIEW.md` exists. ✓
- `docs/GLOBAL_SCHEMA.sql` lines 165-229: M4 banner section confirmed present (executor was correct, my SPEC was wrong). ✓
- §9.L queries reproduce: 2 cms_leads policies, 7 v_crm_* views security_invoker=on, 2 RPCs anon=false+auth=false, send-message v20 has suppression at index.ts:162-165. ✓

### Real-time decisions (§4 of EXECUTION_REPORT)
1. **Stop on §5 trigger #1, escalate via AskUserQuestion** — correct discipline, prevented destructive edits to GLOBAL_SCHEMA.
2. **Bundled Gap B FR + this SPEC's SPEC.md into Commit 1** — saved a commit, didn't violate the SPEC's commit-count envelope.
3. **§9.B sweep finding (DEMO_PHONE_CLEANUP missing FR) fixed in same SPEC** — same class as Gap B (self-closing-SPEC FOREMAN gap). Bundled into Commit 2 per §10 explicit allowance.
4. **§9.D event-register reads tenants directly: logged-not-fixed** — code change out of scope. Routed to NEW_SPEC stub correctly.
5. **§9.G Sentinel alerts (M-10 + M-12): logged as MEDIUM future-SPEC stubs, not escalated** — correct (Sentinel rated MEDIUM, not CRITICAL/HIGH).

---

## 3. Findings Disposition

| Code | Severity | Description | Foreman decision | Rationale |
|------|----------|-------------|------------------|-----------|
| M4-FINDING-01 | LOW | event-register reads `tenants.ui_config` directly, doesn't use `_shared/tenant-config.ts` | **TECH_DEBT — `M4_EVENT_REGISTER_TENANT_CONFIG_HELPER` future-SPEC** | Code consistency improvement. Not a bug. ~10 lines refactor. Bundle with M4_TEMPLATE_BODY_PRIZMA_REMOVAL when that ships pre-tenant-2. |
| M4-FINDING-02 | MEDIUM | DB_TABLES_REFERENCE.md missing 28 M4 tables + short_links | **NEW_SPEC `M4_DB_TABLES_REFERENCE_BACKFILL`** | Per Sentinel M-12 + Iron Rule 21. Daily-reference file for T-constant lookups. The original M4_CLOSURE_AND_INTEGRATION_CEREMONY explicitly listed only GLOBAL_MAP + GLOBAL_SCHEMA in §10 — DB_TABLES_REFERENCE was missed. Single SPEC, ~30 min, doc-only. **Worth doing in the next maintenance pass.** |
| M4-FINDING-03 | MEDIUM | 75 SECURITY DEFINER advisor warnings | **NEW_SPEC `M4_SECURITY_DEFINER_FUNCTION_AUDIT`** | Per Sentinel M-10. 41 anon-executable + 34 authenticated-executable + 36 mutable search_path. Mostly hygiene, not exploitable today (PART2 closed the truly anon-exploitable cases). But the search_path_mutable subset can interact badly with future schema changes. **Future-SPEC pre-tenant-2.** |
| M4-FINDING-04 | LOW | CHANGELOG.md missing entry for cdbba26 | **DISMISS — bundle into next master-doc sweep** | Single-line drift. Not blocking. Anyone authoring CHANGELOG additions next session can add the line. |

**No findings re-opened the SPEC.** All 4 routed correctly.

---

## 4. Master Doc Update Checklist

| File | Touched in this SPEC range? | Status |
|------|------------------------------|--------|
| `MASTER_ROADMAP.md` | No — not a phase boundary | ✅ Correctly skipped |
| `docs/GLOBAL_MAP.md` | No (no new contracts) | ✅ Correctly skipped |
| `docs/GLOBAL_SCHEMA.sql` | No (Gap A skipped because already done — false premise) | ✅ Correctly skipped |
| `docs/DB_TABLES_REFERENCE.md` | No (logged as M4-FINDING-02 future SPEC) | 🟡 Drift remains but routed |
| `modules/Module 4 - CRM/docs/MODULE_MAP.md` | No (no new code names) | ✅ Correctly skipped |
| `modules/Module 4 - CRM/docs/CHANGELOG.md` | No (one missing-line drift logged as M4-FINDING-04) | 🟡 Single-line drift |
| `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` | No (M4 already in MAINTENANCE; no status change) | ✅ Correctly skipped |

**Master-doc state at SPEC close: aligned, with 2 known drifts (FINDING-02 + FINDING-04) routed to future cleanup.**

---

## 5. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal 1 — APPLY immediately: verify all §2/§3 grep claims at SPEC author time

**Where:** `.claude/skills/opticup-strategic/SKILL.md` §"Step 0 — Reproduce-The-Bug-First (MANDATORY, applied 2026-04-27)" — extend.

**Change:** Add to Step 0:
> *"For every claim in §2 Background or §3 Success Criteria that cites a specific grep / `wc -l` / SQL count / file content fact, RUN that exact command at SPEC authoring time. Paste the actual output as the SPEC's evidence. If the actual output contradicts the assumed premise, the SPEC is not ready — fix the diagnosis or escalate.*
>
> *Specifically: any §3 success-criterion of the form `git grep -c "X" file → N hits` MUST be authored with N matching the live count at author time. The executor will re-verify post-execution; if the SPEC's claimed N differs from author-time live N, the SPEC was authored on a stale or fabricated premise and the executor's stop-trigger will fire.*
>
> *This is the 4th occurrence of 'SPEC author cited file content from memory; live filesystem disagreed' — making it binding rather than aspirational. Source: M4_GLOBAL_SCHEMA_BACKFILL_AND_SWEEP Gap A false premise (4th in M4 cycle: prior were M4-DOC-02 columns, M4-DOC-04 template, M4-DOC-06 path)."*

**Rationale:** The 3-occurrence rule was triggered for `pg_proc.prosrc` (M4-DOC-05) and added in Step 1.5 §6. The 4th occurrence is broader — not just DB objects, but any factual claim about file content. The fix is upstream: Step 0 already says "actually run the measurements." Strengthening the wording so it explicitly covers grep/grep-count claims closes the gap.

**Source:** This SPEC's Gap A false premise. Self-evident.

### Proposal 2 — Document GLOBAL_SCHEMA.sql is a MAP, not DDL storage

**Where:** `.claude/skills/opticup-strategic/SKILL.md` §"Reference: Key Project Files" — annotate the GLOBAL_SCHEMA.sql row.

**Change:** Update the row from:
> `Database schema | docs/GLOBAL_SCHEMA.sql`

to:
> `Database schema (banner-style MAP, not DDL) | docs/GLOBAL_SCHEMA.sql — header at line 15 explicitly says 'This file is a MAP. Column types... live in db-audit/*.md'. New tables get banner mention; full DDL lives in module's db-schema.sql.`

**Rationale:** The Foreman searched for `CREATE TABLE crm_*` in GLOBAL_SCHEMA, didn't find it, concluded the merge was partial. If the SKILL had documented "this is a MAP, banner mention is the canonical form", I would have searched correctly the first time.

**Source:** This SPEC's Gap A false premise.

---

## 6. Executor-Skill Improvement Proposals (opticup-executor)

### Proposal 1 (executor + Foreman) — Documented win: `Stop-Trigger #1 → AskUserQuestion` is the right path
**Where:** `.claude/skills/opticup-executor/SKILL.md` §"Bounded Autonomy — Execution Model"
**Change:** Add a positive-pattern note: *"When a SPEC's premise is verified FALSE during pre-execution checks, this is NOT a deviation to absorb silently. The correct path is: (a) stop per the SPEC's relevant stop-trigger, (b) AskUserQuestion to dispatcher with 4 paths forward including 'drop the false-premise axis', (c) document the false premise as a finding in EXECUTION_REPORT regardless of which path is taken — it's a SPEC-author-skill improvement input."*
**Endorsed:** Yes. This SPEC's executor did exactly this and it was the correct discipline.

### Proposal 2 (executor-suggested) — Read GUARDIAN_ALERTS first in any sweep SPEC
**Where:** `.claude/skills/opticup-executor/SKILL.md` §"Common Test Patterns" or new §"Sweep / Audit SPEC Pattern"
**Change:** Add: *"For any sweep / audit / read-only-discovery SPEC, the FIRST file to read is `docs/guardian/GUARDIAN_ALERTS.md`. The Sentinel runs continuous read-only audits and pre-classifies findings (CRITICAL/HIGH/MEDIUM/LOW) with proposed-SPEC names already attached. Sweep SPECs that re-discover what the Sentinel already documented are wasted time. The Sentinel's M-10 + M-12 alerts in this SPEC saved 20+ minutes of manual rediscovery."*
**Endorsed:** Yes. Executor's instinct was right.

---

## 7. Verdict

🟢 **CLOSED.**

**Closed:**
- M4_GLOBAL_SCHEMA_BACKFILL_AND_SWEEP SPEC complete; 3 commits on `develop`.
- Gap A skipped (false premise; executor caught it via stop-trigger).
- Gap B done (M4_CLOSURE FOREMAN_REVIEW backfilled).
- Sweep done (12 sub-points; 1 fix; 4 findings routed).
- §9.L security litmus PASS — no regression of any of the 4 audit CRITICALs.

**Action items for the next opticup-strategic session (per Self-Improvement Mandate):**
1. **APPLY Author Proposal 1 NOW** (Step 0 strengthening — verify §2/§3 grep claims at author time). 4-occurrence rule triggered.
2. **APPLY Author Proposal 2** (annotate GLOBAL_SCHEMA.sql is a MAP in Reference table).
3. **APPLY Executor Proposals 1+2** (stop-on-false-premise positive pattern; GUARDIAN_ALERTS-first sweep pattern).
4. **Author 2 future-SPEC stubs** (don't dispatch yet, let Daniel decide priority):
   - `M4_DB_TABLES_REFERENCE_BACKFILL` (M4-FINDING-02, MEDIUM, doc-only)
   - `M4_SECURITY_DEFINER_FUNCTION_AUDIT` (M4-FINDING-03, MEDIUM, hygiene)
   - `M4_EVENT_REGISTER_TENANT_CONFIG_HELPER` (M4-FINDING-01, LOW, refactor)
5. **Daniel-only:** these are not blockers for tenant 2 (tenant 2 needs `M4_TEMPLATE_BODY_PRIZMA_REMOVAL` first, the bigger-scope item from PRE_MERGE_QA F1).

**Module 4 status confirmed:** All 4 audit CRITICALs verified still CLOSED post-merge. M4 in MAINTENANCE phase. Documentation drift is at acceptable hygiene level (3 doc-only future SPECs + 1 single-line CHANGELOG drift).

*End of FOREMAN_REVIEW.*
