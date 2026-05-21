# MISSION 02 — Skill Harvest Pre-Flight

**Audit:** M4_PRE_NIGHT_COMPREHENSIVE_AUDIT  
**Date:** 2026-05-20  
**Auditor:** opticup-localhost-tester (read-only)

---

## 1. Queued Proposals from Today's FOREMAN_REVIEWs

### From M4_SHORT_LINKS_400_FIX

**P-AUTHOR-1** (opticup-strategic) — Diagnosis-driven SPECs from investigation reports are gold-standard  
- Target: `.claude/skills/opticup-strategic/SKILL.md` §"SPEC Authoring Protocol"
- Verification: Searched SKILL.md for "Investigation-first authoring" — **NOT FOUND** (not yet applied)
- Status: **PENDING HARVEST**

**P-AUTHOR-2** (opticup-strategic) — PostgREST URL-size limit (~16KB) needs a docs entry  
- Target: `docs/CONVENTIONS.md` — add "PostgREST query patterns" section
- Verification: Searched CONVENTIONS.md for "PostgREST" — not confirmed in scope (docs file not read; treat as PENDING)
- Status: **PENDING HARVEST**

**P-EXEC-1** (opticup-executor) — Two-grep verification for `.removed + preserved` edits  
- Target: `.claude/skills/opticup-executor/SKILL.md` §"Step 4: Verify"
- Verification: Searched executor SKILL.md for "Two-grep verification" — **NOT FOUND**
- Status: **PENDING HARVEST**

**P-EXEC-2** (opticup-executor) — Anchor comments citing SPEC slug + reason  
- Target: `.claude/skills/opticup-executor/SKILL.md` §"Comment Discipline"
- Verification: Searched executor SKILL.md for "Anchor comments" — **NOT FOUND**
- Status: **PENDING HARVEST**

### From M4_SMS_RATE_LIMIT_HOTFIX_2026_05_20

**P-AUTHOR-1** (opticup-strategic) — P0 hotfix shape: Light Pipeline + same-thread Foreman-as-Executor  
- Target: `.claude/skills/opticup-strategic/SKILL.md` §"SPEC Authoring Protocol" + Light Pipeline
- Verification: Searched SKILL.md for "P0 hotfix shape" — **NOT FOUND**
- Status: **PENDING HARVEST**

**P-AUTHOR-2** (opticup-strategic) — Destructive-DML snapshot mandate  
- Target: `.claude/skills/opticup-strategic/SKILL.md` §"Step 5.3 Runtime Semantics Rehearsal"
- Verification: Searched for "Destructive-DML snapshot mandate" — **NOT FOUND**
- Status: **PENDING HARVEST**

### From M4_SHORT_LINKS_DASHBOARD_REDESIGN (§5-§6 P-AUTHOR-1/2, §11 P-AUTHOR-3/P-EXEC-3, §12 P-AUTHOR-4/P-EXEC-4, §13 P-AUTHOR-5/P-EXEC-5)

**P-AUTHOR-1** (opticup-strategic) — Enum-distribution probe for typed columns in §0  
- Target: `.claude/skills/opticup-strategic/SKILL.md` §"Step 5.3 Runtime Semantics Rehearsal"
- Verification: Searched for "Enum-distribution probe" — **NOT FOUND**
- Status: **PENDING HARVEST**

**P-AUTHOR-2** (opticup-strategic) — Brief data-drift table in §0 Reality Check  
- Target: `.claude/skills/opticup-strategic/SKILL.md` §"Step 5.3"
- Verification: Searched for "Brief data-drift table" — **NOT FOUND**
- Status: **PENDING HARVEST**

**P-AUTHOR-3** (opticup-strategic) — Column-existence probe for JOINs/SELECTs  
- Target: `.claude/skills/opticup-strategic/SKILL.md` §"Step 5.3 Runtime Semantics Rehearsal" §5.3a
- Verification: Searched for "Column-existence probe" — **NOT FOUND**
- Status: **PENDING HARVEST**

**P-AUTHOR-4** (opticup-strategic) — PostgREST 1000-row limit: response-row cardinality probe  
- Target: `.claude/skills/opticup-strategic/SKILL.md` §"Step 5.3 Runtime Semantics Rehearsal" §5.3b
- Verification: Searched for "Response-row cardinality probe" — **NOT FOUND**
- Note: SKILL.md does contain "PostgREST URL-size limit" guidance but NOT the 1000-row cardinality probe
- Status: **PENDING HARVEST**

**P-AUTHOR-5** (opticup-strategic) — Click-vs-action disambiguation in §0 for metrics  
- Target: `.claude/skills/opticup-strategic/SKILL.md` §"Step 5.3 Runtime Semantics Rehearsal" §5.3c
- Verification: Searched for "Click-vs-action" — **NOT FOUND**
- Status: **PENDING HARVEST**

**P-EXEC-1** (opticup-executor) — Intent comment vs implementation gap  
- Target: `.claude/skills/opticup-executor/SKILL.md` §"Verify"
- Verification: Searched for "Intent comment" — **NOT FOUND**
- Status: **PENDING HARVEST**

**P-EXEC-2** (opticup-executor) — Narrow exception accounting in EXECUTION_REPORT  
- Target: `.claude/skills/opticup-executor/SKILL.md` §"EXECUTION_REPORT format"
- Verification: Searched for "Narrow exception accounting" — **NOT FOUND**
- Status: **PENDING HARVEST**

**P-EXEC-3** (opticup-executor) — SELECT-projection probe before writing sb.from().select()  
- Target: `.claude/skills/opticup-executor/SKILL.md` §"Step 1.5 DB Pre-Flight Check"
- Verification: Searched for "SELECT-projection probe" — **NOT FOUND**
- Status: **PENDING HARVEST**

**P-EXEC-4** (opticup-executor) — Embed-vs-standalone heuristic for parent-child queries  
- Target: `.claude/skills/opticup-executor/SKILL.md` §"Step 1.5 DB Pre-Flight Check"
- Verification: Searched for "Embed-vs-standalone" — **NOT FOUND**
- Status: **PENDING HARVEST**

**P-EXEC-5** (opticup-executor) — Business-state vs event-log preference for metrics  
- Target: `.claude/skills/opticup-executor/SKILL.md` §"Step 1.5 DB Pre-Flight Check"
- Verification: Searched for "Business-state vs event-log" — **NOT FOUND**
- Status: **PENDING HARVEST**

---

## 2. Summary Table

| Proposal | Source SPEC | Target Skill | Section | Status |
|---|---|---|---|---|
| P-AUTHOR-1 (diagnosis-driven SPECs) | M4_SHORT_LINKS_400_FIX | opticup-strategic | §SPEC Authoring Protocol | PENDING |
| P-AUTHOR-2 (PostgREST URL docs entry) | M4_SHORT_LINKS_400_FIX | docs/CONVENTIONS.md | New section | PENDING |
| P-EXEC-1 (two-grep verification) | M4_SHORT_LINKS_400_FIX | opticup-executor | §Step 4: Verify | PENDING |
| P-EXEC-2 (anchor comments) | M4_SHORT_LINKS_400_FIX | opticup-executor | §Comment Discipline | PENDING |
| P-AUTHOR-1 (P0 hotfix shape) | M4_SMS_RATE_LIMIT | opticup-strategic | §SPEC Authoring Protocol | PENDING |
| P-AUTHOR-2 (DML snapshot mandate) | M4_SMS_RATE_LIMIT | opticup-strategic | §Step 5.3 | PENDING |
| P-AUTHOR-1 (enum-distribution probe) | M4_SHORT_LINKS_REDESIGN | opticup-strategic | §5.3 Runtime Semantics | PENDING |
| P-AUTHOR-2 (brief data-drift table) | M4_SHORT_LINKS_REDESIGN | opticup-strategic | §5.3 | PENDING |
| P-AUTHOR-3 (column-existence probe) | M4_SHORT_LINKS_REDESIGN | opticup-strategic | §5.3a | PENDING |
| P-AUTHOR-4 (1000-row cardinality probe) | M4_SHORT_LINKS_REDESIGN | opticup-strategic | §5.3b | PENDING |
| P-AUTHOR-5 (click-vs-action disambig) | M4_SHORT_LINKS_REDESIGN | opticup-strategic | §5.3c | PENDING |
| P-EXEC-1 (intent comment gap) | M4_SHORT_LINKS_REDESIGN | opticup-executor | §Verify | PENDING |
| P-EXEC-2 (narrow exception accounting) | M4_SHORT_LINKS_REDESIGN | opticup-executor | §EXECUTION_REPORT format | PENDING |
| P-EXEC-3 (SELECT-projection probe) | M4_SHORT_LINKS_REDESIGN | opticup-executor | §Step 1.5 DB Pre-Flight | PENDING |
| P-EXEC-4 (embed-vs-standalone) | M4_SHORT_LINKS_REDESIGN | opticup-executor | §Step 1.5 DB Pre-Flight | PENDING |
| P-EXEC-5 (business-state vs event-log) | M4_SHORT_LINKS_REDESIGN | opticup-executor | §Step 1.5 DB Pre-Flight | PENDING |

**Total: 16 proposals pending harvest** (6 for opticup-strategic, 8 for opticup-executor, 1 for docs/CONVENTIONS.md, 1 for SMS hotfix strategic SKILL)

**None of these are currently in the SKILL.md files** — confirmed by search. Iron Rule 21 satisfied: no duplicates.

---

## 3. Conflict Analysis

**No direct contradictions found** between the 16 proposals. Two groupings to be aware of:

**Grouping A — §Step 5.3 overload (5 new opticup-strategic sub-sections):**  
P-AUTHOR-3 (column-existence) + P-AUTHOR-4 (1000-row cardinality) + P-AUTHOR-5 (click-vs-action) from M4_SHORT_LINKS_REDESIGN are all targeted at §5.3 Runtime Semantics Rehearsal. Plus P-AUTHOR-1 (enum-distribution) from the same SPEC. They are distinct sub-rules (5.3a through 5.3c). No conflict — additive.

**Grouping B — §Step 1.5 DB Pre-Flight overload (3 new opticup-executor sub-patterns):**  
P-EXEC-3, P-EXEC-4, P-EXEC-5 all target the same section. Additive, no contradiction.

**Naming collision note:** M4_SHORT_LINKS_400_FIX uses "P-AUTHOR-1/P-EXEC-1/P-EXEC-2" and M4_SHORT_LINKS_REDESIGN uses the same numbering. The Foreman must disambiguate by SPEC slug when applying. No conflict — they are independent improvements.

---

## 4. Prerequisite Memory Updates

Two new memory files were written during today's session (per §10.5 of FOREMAN_REVIEW for M4_SHORT_LINKS_REDESIGN):
- `feedback_probe_biggest_production_tenant.md` — probe Prizma cardinality, not just demo
- `feedback_clicks_are_not_actions.md` — click events != business state; prefer unsubscribed_at

Verify these exist at `C:\Users\User\.claude\projects\C--Users-User-opticup\memory\`:
- If present: prerequisite met for P-AUTHOR-4 and P-AUTHOR-5 harvest
- If absent: must be created before or during the Skill Harvest SPEC run

---

## 5. Recommended Execution Order for Night-Run Skill Harvest

1. **opticup-executor SKILL.md first** (P-EXEC-1 through P-EXEC-5 + P-EXEC-1/2 from 400_FIX) — 8 proposals, same file, same §1.5 target
2. **opticup-strategic SKILL.md second** (P-AUTHOR-1 through P-AUTHOR-5 + P-AUTHOR-1/2 from SMS hotfix) — 7 proposals, different sections
3. **docs/CONVENTIONS.md last** (P-AUTHOR-2 from 400_FIX) — standalone doc addition

No dependencies between proposals within each file. No ordering constraint within executor batch.

---

## 6. Verdict

**🟢 SAFE to execute.** All 16 proposals verified as not-yet-applied. No contradictions. The Skill Harvest SPEC can run as a doc-only Light Pipeline with the Foreman as executor (same shape as M4_SMS_RATE_LIMIT P-AUTHOR-1 codified).

---

*Mission 02 complete.*
