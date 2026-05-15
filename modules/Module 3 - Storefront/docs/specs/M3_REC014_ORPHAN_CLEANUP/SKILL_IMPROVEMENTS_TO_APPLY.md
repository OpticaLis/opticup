# Skill Improvements To Apply — batch 2 (post 2026-05-09 sessions)

> **Created:** 2026-05-09 by opticup-strategic (Cowork session)
> **Purpose:** Cowork can't write to `.claude/skills/` (read-only protected). 4 edits accumulated from M3_SITEMAP_BRAND_404_CLEANUP + M3_REC014_ORPHAN_CLEANUP FOREMAN_REVIEWs.
> **Activation:** Hand to opticup-executor with the prompt at the bottom.

---

## Source FOREMAN_REVIEWs

1. `M3_SITEMAP_BRAND_404_CLEANUP/FOREMAN_REVIEW.md` (already partly applied — A1, A2, Executor 1, Executor 2 went in commit `74922cd`). All 4 closed.
2. `M3_REC014_ORPHAN_CLEANUP/FOREMAN_REVIEW.md` (2026-05-09) — 4 new proposals (A1, A2, Executor 1, Executor 2). All 4 OPEN.

---

## Edit 1 — opticup-strategic SPEC_TEMPLATE §2 — add "Already-done discovery contingency" authoring note

**File:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md`

**Find:**
```
## 2. Background & Motivation

2–4 sentences. Why now? What previous work does this depend on? Link to
relevant commits / SPECs / FOREMAN_REVIEWs.

---
```

**Replace with:**
```
## 2. Background & Motivation

2–4 sentences. Why now? What previous work does this depend on? Link to
relevant commits / SPECs / FOREMAN_REVIEWs.

### Already-done discovery contingency

When the SPEC's background table cites items that may have been independently
closed by other commits since the source REC was filed, include a per-item
"if already done, action" column or sentence in the table. Example:

> "Item B: `_deprecated/` folder — possibly already deleted by storefront
> commit `a4723b5`. If already gone (Step 0b confirms), skip this item and
> report. If present, `git rm -rf`."

This pre-authorizes the executor to skip without an AskUserQuestion when
reality has already moved past the SPEC's premise. Without the contingency,
the executor either stops (wasted time) or proceeds anyway (wrong action).

(Source: improvement A1 from M3_REC014_ORPHAN_CLEANUP FOREMAN_REVIEW, 2026-05-09.)

---
```

---

## Edit 2 — opticup-strategic SPEC_TEMPLATE §6 — add "Backup format guidance for DB-DELETE SPECs"

**File:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md`

**Find:**
```
## 6. Rollback Plan

If the SPEC fails partway through and must be reverted:
- `git reset --hard {START_COMMIT}` — where START_COMMIT = `{hash before any change}`
- Restore DB state via: {specific queries or "no DB changes in this SPEC"}
- Notify Foreman; SPEC is marked REOPEN, not CLOSED.

---
```

**Replace with:**
```
## 6. Rollback Plan

If the SPEC fails partway through and must be reverted:
- `git reset --hard {START_COMMIT}` — where START_COMMIT = `{hash before any change}`
- Restore DB state via: {specific queries or "no DB changes in this SPEC"}
- Notify Foreman; SPEC is marked REOPEN, not CLOSED.

### Backup format guidance for DB-DELETE SPECs

When prescribing a pre-DELETE backup JSON, specify in §8 whether the backup
should include heavy payload columns verbatim (e.g. `blocks` JSONB on
`storefront_pages`) or substitute a `_field_omitted_for_brevity` flag.

**Default rule:**
- Include all metadata columns verbatim.
- Substitute heavy payloads (>2KB per row) only when:
  - The data is recoverable from PG point-in-time recovery, AND
  - The SPEC explicitly authorizes the trade-off (state in §8: "Backup may omit `blocks` column; recoverable from PITR").
- Otherwise, include payloads verbatim regardless of size — readability of
  diffs trades against the rare rollback need.

(Source: improvement A2 from M3_REC014_ORPHAN_CLEANUP FOREMAN_REVIEW, 2026-05-09.)

---
```

---

## Edit 3 — opticup-executor SKILL.md — add "Postgres CTE-with-DML rule" to SQL Autonomy Levels

**File:** `.claude/skills/opticup-executor/SKILL.md`

**Locate:** The "SQL Autonomy Levels" section, AFTER the Level 2 description block.

**Add this sub-section:**

```
### SQL footgun — CTE-with-DML snapshot semantics

When verifying a `DELETE … RETURNING` (or `UPDATE … RETURNING`, or
`INSERT … RETURNING`) result, ALWAYS run a SEPARATE `SELECT COUNT(*)`
statement after the data-modifying statement. NEVER rely on inline
`(SELECT COUNT(*) FROM same_table WHERE same_predicate)` subqueries
embedded inside a `WITH (DELETE …)` CTE.

**Why:** Postgres data-modifying-WITH semantics — the sub-statement and
the main query execute concurrently, and inline non-CTE-references see
the snapshot BEFORE the modification. The inline post-count returns
the pre-DELETE count, which looks like the DELETE didn't run.

**Correct pattern (2 statements):**
```sql
-- Statement 1: do the work + count what got modified
WITH d AS (
  DELETE FROM storefront_pages
  WHERE tenant_id = $1 AND slug = '/test-shortcodes/'
  RETURNING id
)
SELECT (SELECT COUNT(*) FROM d) AS rows_deleted;

-- Statement 2: verify SC by querying the live table state
SELECT COUNT(*) AS rows_remaining
FROM storefront_pages
WHERE tenant_id = $1 AND slug = '/test-shortcodes/';
-- Expected: 0
```

Total: 2 statements, never 1.

(Source: improvement #1 from M3_REC014_ORPHAN_CLEANUP FOREMAN_REVIEW, 2026-05-09.
Cost: 30 seconds of "did the DELETE run?" anxiety in that SPEC; this rule
shortcuts every future cleanup-with-verification SPEC.)
```

---

## Edit 4 — opticup-executor EXECUTION_REPORT_TEMPLATE — add "SPEC_TEMPLATE Version Footprint" section

**File:** `.claude/skills/opticup-executor/references/EXECUTION_REPORT_TEMPLATE.md`

**Locate:** Find the section called "Iron-Rule Self-Audit" (or "§6 Iron-Rule Self-Audit"). Insert a new section AFTER it and BEFORE the "Self-Assessment" section. If the template uses different numbering, slot the new section between Iron-Rule Self-Audit and Self-Assessment regardless of number.

**Add this section:**

```
## §7 SPEC_TEMPLATE Version Footprint

If this SPEC was authored against an updated SPEC_TEMPLATE that introduced
new sub-sections / authoring conventions, enumerate which improvements were
exercised by THIS SPEC and how they performed:

| Improvement (commit ref) | Used by SPEC | Worked as designed? |
|---|---|---|
| §X new convention | Yes/No — describe how | ✅ worked / ⚠️ partial / ❌ didn't help |
| ... | ... | ... |

If no SPEC_TEMPLATE updates have been adopted since the prior SPEC, write
"No new template improvements to footprint this run" and skip the table.

This section helps the Foreman trace which improvements are paying off vs
gathering dust over a portfolio of SPECs. Without the table, the signal is
lost — over time, useless improvements accumulate and useful ones get
re-discovered.

(Source: improvement #2 from M3_REC014_ORPHAN_CLEANUP FOREMAN_REVIEW, 2026-05-09.)
```

---

## Activation Prompt for Claude Code

Paste into Claude Code on Windows desktop:

```
טען את skill opticup-executor.

המשימה: החל 4 עדכוני סקיל מצטברים מ-FOREMAN_REVIEW של M3_REC014_ORPHAN_CLEANUP. הקובץ:
modules/Module 3 - Storefront/docs/specs/M3_REC014_ORPHAN_CLEANUP/SKILL_IMPROVEMENTS_TO_APPLY.md

מכיל 4 edits:
- 2 לקובץ .claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md (already-done contingency, DB-row backup format)
- 1 לקובץ .claude/skills/opticup-executor/SKILL.md (Postgres CTE-with-DML rule)
- 1 לקובץ .claude/skills/opticup-executor/references/EXECUTION_REPORT_TEMPLATE.md (SPEC_TEMPLATE Version Footprint section)

לכל edit יש Find/Replace מדויק (או Locate + Add). החל את כל ה-4, אמת שהקבצים שמורים, ואז commit אחד:
chore(skills): apply 4 improvements from M3_REC014_ORPHAN_CLEANUP FOREMAN_REVIEW

push לdevelop. אין צורך לפתוח PR ל-main (סקילים אינם משפיעים על production).

בסוף תאר אילו 4 השינויים בוצעו בפועל + שורת hash של ה-commit.
```
