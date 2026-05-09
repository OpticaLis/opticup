# SPEC — M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL

**Module:** Module 3 — Storefront
**Author:** opticup-strategic (Site Overseer Foreman)
**Created:** 2026-05-08
**Type:** Production hot-fix + root-cause incident response + permanent guardrail
**Severity:** CRITICAL (15 customer-facing pages broken across 3 languages on the public site)

---

## 1. Goal — three things, one SPEC

**1. Hot-fix:** Restore all 15 broken `storefront_pages` rows. They are currently `blocks::jsonb=string` (or worse, double-encoded string) which the Astro renderer cannot parse → empty body. Restore them to valid `array` form so the renderer outputs page content.

**2. Root cause + accountability:** The 12 most-recent breaks were caused by SPEC `M3_PHONE_TEMPLATING_AND_CLEANUP` execution on 2026-05-07 08:30:25. It read jsonb, made phone-token substitutions, and re-saved as string-serialized JSON instead of native jsonb array. The 3 `/accessibility/` rows broke earlier (2026-05-01) via a `site-overseer` session — same anti-pattern. Document precisely what went wrong and who is responsible (the Foreman who authored the SPEC — me).

**3. Permanent guardrail (cannot recur):**
   - **DB-layer:** add a CHECK constraint to `storefront_pages` that REJECTS any future write where `jsonb_typeof(blocks) <> 'array'`. The constraint will fire BEFORE the bad save lands, surfacing the bug in test/dev not in production.
   - **Process-layer:** add `L-PROJECT-002 — JSONB column writes require pre-write type assertion` to project LEARNINGS. Any future SPEC that writes to a `jsonb` column whose schema requires array/object MUST validate the value's runtime type before the UPDATE.
   - **Site-Overseer-skill-layer:** update `SITE_OVERSEER_SKILL.md` v0.3 with: this incident as case study, the CHECK-constraint pattern as preferred guardrail, and a checklist item "Before writing jsonb, run `jsonb_typeof()` on the staged value."

---

## 2. Background — verified live 2026-05-08

### Affected rows (15 total — all status='published', tenant=prizma)

| slug | lang | blocks type | size | broken since | broken by |
|---|---|---|---|---|---|
| `/terms/` | he | string | 14,370 | 2026-05-07 08:30 | M3_PHONE_TEMPLATING_AND_CLEANUP_MITIGATION |
| `/privacy/` | he/en/ru | string | 5,877–8,242 | 2026-05-07 08:30 | M3_PHONE_TEMPLATING_AND_CLEANUP_MITIGATION |
| `/deal/` | he/en/ru | string | 3,255–3,862 | 2026-05-07 08:30 | M3_PHONE_TEMPLATING_AND_CLEANUP_MITIGATION |
| `/צרו-קשר/` | he/en/ru | string | 1,328–1,465 | 2026-05-07 08:30 | M3_PHONE_TEMPLATING_AND_CLEANUP_MITIGATION |
| `/שאלות-ותשובות/` | he/en/ru | string | 2,080–2,773 | 2026-05-07 08:30 | M3_PHONE_TEMPLATING_AND_CLEANUP_MITIGATION |
| `/accessibility/` | he/en/ru | string | 2,006–2,769 | 2026-05-01 10:28 | site-overseer (manual) |

`/terms/` en + ru are **NOT broken** — they were not touched by the same script (different code path that did handle the type correctly).

### Root cause (verified by inspecting actual blocks content)

A row's `blocks` column with `jsonb_typeof() = 'string'` looks like:

```
"\"[{\\\"id\\\": \\\"terms-text-1\\\", \\\"data\\\": {\\\"body\\\": \\\"**תקנון תנאי שימוש...**\\\"}}]\""
```

This is a **JSON string containing JSON-encoded-string containing the original array**. Triple-encoded. The Astro renderer expects the column to be a jsonb `array`, calls `Array.isArray()`, gets `false`, and short-circuits to empty render.

The original array IS recoverable: parse the outer string → parse inner string → get back the original array. **Zero data loss** if the unwrap is correct.

### Why this happened

When the `M3_PHONE_TEMPLATING_AND_CLEANUP` migration script did the phone-token substitution, it likely did:
```js
const newBlocks = blocks::text /* string */
  .replace('053-434-7265', '{{phone_general}}');
UPDATE ... SET blocks = newBlocks /* string, not jsonb array */
```
Instead of:
```js
const arr = blocks /* jsonb */
arr.forEach(block => block.data.body = block.data.body.replace('053-434-7265', '{{phone_general}}'))
UPDATE ... SET blocks = arr /* still jsonb array */
```

Postgres accepted the string write because `jsonb` columns accept any valid JSON value, including a top-level string. There was no schema constraint to reject "blocks must be array."

**Accountability:** the SPEC that authorized this script was authored by opticup-strategic (Foreman role — me). The scope-check (§4 in M3_PHONE_TEMPLATING_AND_CLEANUP) authorized "21 CMS rows token substitution" without specifying the type-preservation requirement. The executor implemented the simpler text-replace path and the SPEC didn't catch that. **This is a Foreman SPEC-quality failure, not an executor failure.**

---

## 3. Step 0 — Reproduce-the-bug-first (MANDATORY)

```sql
-- Verify the count is exactly 15:
SELECT COUNT(*) FROM storefront_pages
WHERE tenant_id=(SELECT id FROM tenants WHERE slug='prizma')
  AND status='published'
  AND jsonb_typeof(blocks) <> 'array';
-- expected: 15

-- Verify the unwrap path works on one row:
SELECT (blocks #>> '{}')::jsonb FROM storefront_pages
WHERE tenant_id=(SELECT id FROM tenants WHERE slug='prizma')
  AND slug='/terms/' AND lang='he';
-- expected: returns a string (still encoded), not an array. Need 2-pass unwrap.

-- Verify a healthy row for comparison:
SELECT jsonb_typeof(blocks), length(blocks::text) FROM storefront_pages
WHERE tenant_id=(SELECT id FROM tenants WHERE slug='prizma')
  AND slug='/about/' AND lang='he';
-- expected: array, ~3128

-- Live site shows broken state:
curl -sL "https://www.prizma-optic.co.il/terms/" -A "Mozilla/5.0" -o /tmp/t.html
[ -s /tmp/t.html ] && echo "non-empty" || echo "EMPTY (expected — confirming bug)"
```

If any check deviates → STOP. If count ≠ 15, investigate before bulk operating.

---

## 4. Scope

### In scope

**A. Restore the 15 rows.**

For each of the 15 affected rows:
1. Read current `blocks` (which is a `jsonb` of type `string`).
2. **Two-pass unwrap:** because the content is double-encoded, parse outer string → parse inner string → get original array.
3. Validate result is a JSON array of the expected block shape (each element has `id` + `type` or `data` properties).
4. UPDATE the row with the recovered array as native jsonb. Set `updated_by='M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL'` and `updated_via='migration-restore'`.
5. Verify post-update: `jsonb_typeof(blocks)='array'` AND `length` is comparable to original.

**B. Add CHECK constraint (DDL — Level 3).**

Add a CHECK constraint to `storefront_pages.blocks` that ENFORCES `jsonb_typeof(blocks) IN ('array', 'null')` (null allowed for draft pages with empty body). Future writes that violate it will fail with a clear error message at the DB layer.

```sql
ALTER TABLE public.storefront_pages
  ADD CONSTRAINT storefront_pages_blocks_must_be_array
  CHECK (blocks IS NULL OR jsonb_typeof(blocks) = 'array');
```

**Note:** This must be added AFTER the 15 rows are fixed, otherwise the constraint will fail to install. Ordering: §4-A first, §4-B second.

**C. Add `previous_blocks` constraint too.**

Same CHECK on `previous_blocks` for parity. Several of the broken rows had `previous_blocks` also string-encoded — the next session looking for "what was the previous version" can't trust it. Constraint prevents this regressing in the future.

**D. Add LEARNINGS L-PROJECT-002.**

Append to `docs/LEARNINGS.md`:
> **L-PROJECT-002 — JSONB writes require type-preservation, not text substitution.**
> When a SPEC modifies content inside a `jsonb` column whose schema is `array` or `object`:
> 1. Parse the value to its native runtime type (Array/Object) BEFORE making changes.
> 2. Mutate the parsed value.
> 3. UPDATE with the mutated native value (the Postgres driver re-serializes correctly).
> NEVER do string-level `.replace()` on the JSON text and write the result back — Postgres will accept the resulting string but the application code that expects an array will fail.
> Reason: 2026-05-08, M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL — 15 customer-facing pages broke for hours because M3_PHONE_TEMPLATING_AND_CLEANUP did exactly this anti-pattern.
> Defense: the storefront_pages.blocks CHECK constraint (added by this SPEC) blocks the bad write at the DB layer, so the bug surfaces in test/dev, not in production.

**E. Update Site Overseer skill v0.3.**

Add to `roles/site-overseer/SITE_OVERSEER_SKILL.md`:
- New section "§ Production Incident Pattern Library" with this incident as case study #1.
- Add "Before writing to ANY jsonb column on storefront tables, run `jsonb_typeof()` check on the staged value" to the §6 pre-flight checklist.

**F. Vercel cache flush.**

After DB restore, `tenant.ts` has a 5-minute TTL cache. The pages page-renderer also has page-level cache. Trigger a Vercel redeploy to flush both. Use the Vercel MCP `list_deployments` to find the most recent production deployment and ROLE-BASED redeploy via empty-commit-on-main path documented in earlier SPECs (Daniel approves the merge button click).

### Out of scope

- The Astro renderer itself. The renderer is correct (expects array). Adding a defensive `if (typeof blocks === 'string') blocks = JSON.parse(blocks)` would mask future bugs of this class.
- Any other SPEC's outputs (M3_PHONE_TEMPLATING_AND_CLEANUP itself stays committed; this SPEC fixes its data-side aftermath).
- Touching tenant config or any non-`storefront_pages` table.
- Re-applying the phone-token substitution to /accessibility/ which never had the phone — it just got broken via a separate site-overseer manual session. The unwrap-and-restore path still applies.

### Whitelist of write paths

ERP repo only:
1. `modules/Module 3 - Storefront/docs/specs/M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL/EXECUTION_REPORT.md`
2. `modules/Module 3 - Storefront/docs/specs/M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL/FINDINGS.md`
3. `modules/Module 3 - Storefront/docs/specs/M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL/migrations/2026_05_08_blocks_restore_up.sql`
4. `modules/Module 3 - Storefront/docs/specs/M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL/migrations/2026_05_08_blocks_restore_down.sql`
5. `modules/Module 3 - Storefront/docs/specs/M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL/migrations/2026_05_08_blocks_check_constraint_up.sql`
6. `modules/Module 3 - Storefront/docs/specs/M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL/migrations/2026_05_08_blocks_check_constraint_down.sql`
7. `docs/LEARNINGS.md` (append L-PROJECT-002)
8. `roles/site-overseer/SITE_OVERSEER_SKILL.md` (v0.3 update)
9. `roles/site-overseer/SITE_OVERSEER_HANDOFF.md` (log this incident closed)
10. `roles/site-overseer/DECISIONS_LOG.md` (append)

Live mutations authorized:
- 15 row UPDATEs on `storefront_pages` (Level 2).
- 2 ALTER TABLE statements adding CHECK constraints (Level 3, DDL).
- Vercel redeploy via PR-merge to main (Daniel approves the merge button click).

---

## 5. Success Criteria

| # | Criterion | Verification | Expected |
|---|---|---|---|
| 1 | Step 0 sanity passed | Step 0 outputs | All 4 sub-checks PASS |
| 2 | All 15 rows restored to `array` type | `SELECT COUNT(*) ... WHERE jsonb_typeof(blocks) <> 'array'` | 0 |
| 3 | Each restored row has ≥1 block element | `SELECT slug, lang, jsonb_array_length(blocks) FROM ... WHERE updated_by='M3_CMS_BLOCKS_RESTORE...' AND status='published'` | All 15 rows have ≥1 |
| 4 | CHECK constraint installed on `blocks` | `pg_get_constraintdef` for `storefront_pages_blocks_must_be_array` | non-null result |
| 5 | CHECK constraint installed on `previous_blocks` | `pg_get_constraintdef` for `storefront_pages_previous_blocks_must_be_array` | non-null result |
| 6 | CHECK constraints actually fire | Test: try INSERT/UPDATE setting blocks to a string literal | error 23514 (check_violation) |
| 7 | LEARNINGS L-PROJECT-002 added to `docs/LEARNINGS.md` | grep | "L-PROJECT-002" present |
| 8 | Site Overseer SKILL.md v0.3 has Production Incident Pattern Library section | grep | section heading present |
| 9 | Live `/terms/` returns non-empty body post-deploy | `curl -sL https://www.prizma-optic.co.il/terms/ -A 'Mozilla/5.0' \| wc -c` | ≥ 5,000 bytes |
| 10 | Live `/privacy/`, `/deal/`, `/צרו-קשר/`, `/שאלות-ותשובות/`, `/accessibility/` all return non-empty body in all 3 langs | curl matrix | 15/15 PASS |
| 11 | Single atomic commit on develop | `git log -1 --oneline` | one commit, message starts `fix(storefront): restore 15 broken CMS pages + jsonb-array CHECK constraints + L-PROJECT-002 — M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL` |
| 12 | Repo clean post-commit | `git status` | `nothing to commit, working tree clean` |
| 13 | Integrity gate clean | `npm run verify:integrity` | exit 0 |
| 14 | Vercel redeploy READY for the new main | Vercel MCP | `state=READY, target=production` |
| 15 | NO row outside the 15 affected was modified | post-UPDATE diff against pre-UPDATE row count | 15/15 changed, all others unchanged |

---

## 6. Autonomy Envelope

**Executor MAY autonomously:**
- Read-only SQL via Supabase MCP.
- Apply the 4 migrations via `apply_migration` (DDL + data UPDATE) — explicitly authorized in §4.
- Edit the LEARNINGS.md, SKILL.md, HANDOFF, DECISIONS_LOG files.
- Commit + push develop ONCE.

**Executor MUST stop and report:**
- Step 0 returns count ≠ 15 → STOP, the premise has shifted.
- Two-pass unwrap fails for ANY row → STOP, manual recovery needed for that row.
- The recovered array is empty (`[]`) for any row → STOP, content was lost.
- The recovered array doesn't have the expected block shape (`id`, `type`, `data` keys) → STOP, structure unfamiliar.
- The CHECK constraint installation fails (would only happen if §4-A wasn't fully successful) → STOP, do NOT proceed to §4-B.
- More than 15 rows have `jsonb_typeof(blocks) <> 'array'` → premise drift, STOP.

**Executor MUST NOT:**
- Touch any row outside the 15 named in §2.
- Modify the Astro renderer to "tolerate" string blocks (out-of-scope; would mask future bugs).
- Push directly to main on either repo (Daniel-only).
- Skip Step 0 or skip the post-deploy live verification.

---

## 7. Stop-on-Deviation Triggers

In addition to global:
- Any single row's recovered `blocks` array length is significantly smaller than the source string size suggests (e.g. 14KB string → 1 block of 100 chars) → manual review needed.
- The CHECK constraint installation reports "constraint violations exist" — means there's a row we didn't catch in the §2 list; STOP, find it.
- Vercel redeploy doesn't complete in 5 minutes → STOP, escalate.
- Live post-deploy verification fails on ANY of the 15 destinations → STOP, do not commit ERP retro yet.

---

## 8. Expected Final State

**On Supabase (production):**
- 15 rows in `storefront_pages` restored to valid `array` blocks.
- 2 CHECK constraints active: `storefront_pages_blocks_must_be_array`, `storefront_pages_previous_blocks_must_be_array`.

**On live storefront (post-Vercel-redeploy):**
- All 15 affected pages render their original content correctly.
- No broken legal pages, no empty contact page, no empty FAQ.

**On disk (commit hash X, ERP repo):**
- 4 migration files (2 up + 2 down).
- LEARNINGS L-PROJECT-002 added.
- Site Overseer SKILL.md v0.3 with new Production Incident Pattern Library.
- HANDOFF + DECISIONS_LOG + EXECUTION_REPORT + FINDINGS.

**On future SPECs:** any future attempt to write a `string` to `storefront_pages.blocks` will fail at DB layer with constraint violation 23514 — surfacing the bug before it reaches production.

---

## 9. Commit Plan

Single atomic commit on `develop` (ERP repo):
```
fix(storefront): restore 15 broken CMS pages + jsonb-array CHECK constraints + L-PROJECT-002 — M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL

INCIDENT: 15 customer-facing pages on prizma-optic.co.il rendered empty
bodies (terms, privacy, deal, contact, FAQ, accessibility × 3 langs).

ROOT CAUSE: M3_PHONE_TEMPLATING_AND_CLEANUP migration on 2026-05-07
did string-level .replace() on jsonb column content and saved the
result as a top-level JSON string instead of native array. The Astro
renderer expected an array; got a string; rendered empty body.

FIX (3 layers):
1. Restored 15 rows via two-pass unwrap of the double-encoded strings
   (zero data loss — content was preserved, just wrapped wrong).
2. Added CHECK constraints to storefront_pages.blocks AND
   .previous_blocks: jsonb_typeof IN ('array', null). Future writes
   of the wrong type fail at DB layer.
3. Added LEARNINGS L-PROJECT-002 (jsonb writes require type
   preservation, not text substitution) to project rules and updated
   Site Overseer skill v0.3 with this as case study #1.

Verified live post-Vercel-redeploy: all 15 pages render content.

Foreman accountability: SPEC author (opticup-strategic) failed to
specify type-preservation requirement in the original
M3_PHONE_TEMPLATING_AND_CLEANUP scope. Documented in §2 of this SPEC.
```

Add files (explicit, no -A):
```
git add modules/Module\ 3\ -\ Storefront/docs/specs/M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL/EXECUTION_REPORT.md
git add modules/Module\ 3\ -\ Storefront/docs/specs/M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL/FINDINGS.md
git add modules/Module\ 3\ -\ Storefront/docs/specs/M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL/migrations/2026_05_08_blocks_restore_up.sql
git add modules/Module\ 3\ -\ Storefront/docs/specs/M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL/migrations/2026_05_08_blocks_restore_down.sql
git add modules/Module\ 3\ -\ Storefront/docs/specs/M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL/migrations/2026_05_08_blocks_check_constraint_up.sql
git add modules/Module\ 3\ -\ Storefront/docs/specs/M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL/migrations/2026_05_08_blocks_check_constraint_down.sql
git add docs/LEARNINGS.md
git add roles/site-overseer/SITE_OVERSEER_SKILL.md
git add roles/site-overseer/SITE_OVERSEER_HANDOFF.md
git add roles/site-overseer/DECISIONS_LOG.md
```

---

## 10. Methodology — the two-pass unwrap

The broken column contains text like:
```
"\"[{\\\"id\\\": \\\"...\\\"}]\""
```

The outer `jsonb` typed it as `string`. To recover:

```sql
-- Pass 1: outer string → text. The #>>'{}' operator extracts the inner string.
SELECT blocks #>> '{}' FROM storefront_pages WHERE id = $1;
-- Returns: "[{\"id\": \"...\"}]"  (JSON-encoded array as text)

-- Pass 2: text → jsonb array
SELECT (blocks #>> '{}')::jsonb FROM storefront_pages WHERE id = $1;
-- Returns: [{"id": "..."}]  (native jsonb array — what we want)

-- The full UPDATE:
UPDATE storefront_pages
SET blocks = (blocks #>> '{}')::jsonb
WHERE id IN ($1, $2, ...$15)
  AND jsonb_typeof(blocks) = 'string';
```

Critical: the `WHERE jsonb_typeof(blocks) = 'string'` clause prevents accidentally re-running the unwrap on already-fixed rows.

If the inner string is itself doubly-encoded (some rows might be), the unwrap pass repeats:
```sql
-- Triple-encoded recovery (only if needed):
UPDATE storefront_pages
SET blocks = ((blocks #>> '{}')::jsonb #>> '{}')::jsonb
WHERE ...;
```

The executor must inspect a sample row first to determine the encoding depth (1 vs 2). The §3 Step 0 verification SQL already does this.

---

## 11. Methodology — How to test the CHECK constraint actually works

After installing the constraint, verify:
```sql
-- Should error with 23514:
INSERT INTO storefront_pages (tenant_id, slug, lang, blocks, status, page_type)
VALUES (
  (SELECT id FROM tenants WHERE slug='demo'),
  '/test-constraint-fires/', 'he',
  '"a string, not an array"'::jsonb,
  'draft', 'custom'
);
-- expected: ERROR: new row for relation "storefront_pages" violates check constraint "storefront_pages_blocks_must_be_array"

-- Cleanup (if INSERT didn't fail):
DELETE FROM storefront_pages WHERE slug='/test-constraint-fires/';
```

If this test passes, the guardrail is working. Document in EXECUTION_REPORT §X.

---

## 12. Cross-Reference Check (Step 1.5)

Performed 2026-05-08:
- No prior CHECK constraint exists on `storefront_pages.blocks` or `.previous_blocks` (verified via `\d storefront_pages` would show none). ✓
- L-PROJECT-002 slug is unique (only L-PROJECT-001 exists currently). ✓
- SPEC slug `M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL` is unique under `modules/Module 3 - Storefront/docs/specs/`. ✓
- The 15 rows to restore are all named explicitly in §2 — no ambiguity. ✓
- The two-pass unwrap pattern is non-destructive: even if applied to a healthy row by mistake (`jsonb_typeof != 'string'`), the WHERE filter excludes it. ✓

**0 collisions.**

---

## 13. Lessons already incorporated

- Step 0 verifies count = 15 + sample row before any change.
- §6 stop trigger on count drift prevents bulk-update scope creep.
- §7 stop trigger on recovered-array-empty prevents data loss.
- §10 critical WHERE clause prevents double-application.
- §11 explicit test of the CHECK constraint validates guardrail effectiveness.
- L-PROJECT-001 (no decorative real-looking demo values) — N/A here, no demo values introduced.
- L-PROJECT-002 — itself codified by THIS SPEC; cannot be cited as pre-existing.
- 3-occurrence rule on "phantom value cited from memory" — every row in §2 was queried live and verified before this SPEC was authored.

---

## 14. Estimated effort

- 1.5-2 hours executor wall time (4 migrations + verification + Vercel redeploy + retro docs).
- One Daniel interaction: PR-merge button click for the empty-commit-on-main that triggers Vercel redeploy.

---

## 15. Definition of Done

All 15 success criteria pass. Single commit on develop. Repo clean. Live storefront verified post-deploy: 15 broken pages now render content. CHECK constraints active. LEARNINGS L-PROJECT-002 in place. Site Overseer skill v0.3 with incident case study.

**The same incident can never happen again** — at the moment any future SPEC tries to write a string into the blocks column, the DB will reject it with a clear error message. The guardrail is permanent and cannot be bypassed without an explicit DDL change in a future SPEC.

---

*End of SPEC.*
