# SPEC — M4_SHORT_LINKS_400_FIX

> **Class:** Bug fix — Option 1 from investigation report.
> **Authored by:** opticup-strategic (Foreman, M4)
> **Authored on:** 2026-05-20
> **Branch:** develop
> **Pipeline:** LIGHT (Foreman + Foreman-as-Executor inline; no Reviewer / no LH-Tester per Daniel's instruction; single-file ≤ 4-line fix).
> **Risk class:** LOW. Pure JS edit, semantic preservation, no DB / EF / schema change.

---

## 1. Background + Root Cause

Per `modules/Module 4 - CRM/architecture-brief/SHORT_LINKS_400_INVESTIGATION_REPORT.md`:

`crm-short-links-stats.js` line 71-76 sends every live link's UUID list in a PostgREST `&short_link_id=in.(...)` URL → ~30KB on demo (805 links), ~260KB on Prizma (7,009 links). PostgREST rejects with 400 Bad Request once URL exceeds ~16KB. Bug surfaces every time the "קישורים קצרים" tab opens.

Daniel approved Option 1 (invert query): fetch all clicks for the tenant in one query, JS-map to live links. Click cardinality is tiny (15 demo / 47 Prizma) vs link cardinality (805 / 7,009) — 150× fewer rows fetched. Existing index `idx_short_link_clicks_tenant_id_clicked_at` covers it.

---

## 2. Goal

Replace the broken 2-step pattern (fetch link IDs → IN filter on clicks) with a single tenant-scoped click fetch. The downstream JS aggregator (`byLink[c.short_link_id]`) preserves the existing UI semantic: only live links appear in the rendered table; clicks on expired links are silently dropped client-side.

---

## 3. Success Criteria

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 1 | File changed | Only `modules/crm/crm-short-links-stats.js` | `git diff --name-only` |
| 2 | `var linkIds = ...` line removed | 0 hits for `linkIds` in the file | grep |
| 3 | `.in('short_link_id', ...)` removed | 0 hits | grep |
| 4 | Single tenant-scoped click query present | `await sb.from('short_link_clicks').select(...).eq('tenant_id', tid)` (no `.in()`) | grep |
| 5 | Comment block above the query updated to reflect inverted query semantics | yes | read |
| 6 | Iron Rule 22 (defense-in-depth tenant_id) preserved | `.eq('tenant_id', tid)` chained | grep |
| 7 | Iron Rule 31 integrity gate | exit 0 | pre-commit hook |
| 8 | Iron Rule 32 destructive ops | 0 declared, 0 detected | pre-commit hook |
| 9 | Smoke 8/8 PASS | all passing | `node tests/smoke/baseline.test.mjs` |
| 10 | Working tree scope-clean post-commit | only pre-existing-unrelated paths | `git status --short` |

---

## 4. Autonomy Envelope

### CAN
- Edit `modules/crm/crm-short-links-stats.js` (single-file scoped fix).
- Run smoke.
- Commit on develop. Push.
- Open develop → main PR per Daniel's instructions (separate from commit).

### MUST STOP
- Need to modify ANY file outside the 1 declared.
- Need to change behavior beyond the inverted query.
- Iron Rule 31 / 32 gate fails.
- Smoke regresses.

---

## 5. Stop-Triggers (extended)

1. Removing `.in('short_link_id', ...)` accidentally breaks the tenant filter.
2. The new single query causes the table to display expired links (semantic regression).
3. Smoke regression (any test fails).

---

## 6. Pipeline

LIGHT — 2 hats (Foreman authors + Foreman-as-Executor inline):
1. **Foreman (Opus)** authors this SPEC (DONE).
2. **Foreman-as-Executor (inline)** applies edit + smoke + commit + push.
3. **Foreman closes** with FOREMAN_REVIEW.md.

---

## 7. Out of Scope

- Adding `expires_at` filter to the click query (47 Prizma clicks → negligible noise; defer).
- DB view `v_crm_short_link_stats` (Option 3 from investigation; defer).
- Chunking pattern (Option 2 from investigation; not needed since Option 1 supersedes).
- Other files / other tables / other EFs.

---

## 8. Expected Final State

- `modules/crm/crm-short-links-stats.js`: ~3 lines deleted (the `var linkIds = ...` line + `.in('short_link_id', linkIds)` line + adjacent comment refresh), comment block updated to reflect inverted query intent.
- Net file size: ~190 lines (was 193). Within Iron Rule 12 budget.
- "קישורים קצרים" tab renders the table with click stats; no 400 Bad Request.

---

## 9. Rollback Plan

`git revert <fix-commit>` restores the IN clause. Browser tab returns to its broken-400 state (no worse than pre-fix).

---

## 10. Commit Plan

- C1 (this SPEC + EF edit + closure docs in one commit for Light Pipeline efficiency): `fix(crm): M4_SHORT_LINKS_400_FIX — invert clicks query to avoid PostgREST 16KB IN-clause URL limit`.

---

## 11. Destructive Operations

**Count: 0.** Pure JS edit, no DB writes, no schema changes.

---

## 12. Cross-References

- Investigation report: `modules/Module 4 - CRM/architecture-brief/SHORT_LINKS_400_INVESTIGATION_REPORT.md` (Option 1 recommendation).
- Related project pattern: `crm-messaging-broadcast-queue.js` (chunked-IN pattern, Option 2 — NOT used here).
- Existing index supporting the new query: `idx_short_link_clicks_tenant_id_clicked_at`.

---

*End of SPEC.*
