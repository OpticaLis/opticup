# SPEC — M4_HARDCODED_DEMO_PHONE_CLEANUP

**Module:** Module 4 — CRM
**Author:** opticup-strategic (Site Overseer)
**Created:** 2026-05-06
**Type:** Cleanup + LEARNINGS / Anti-regression
**Severity of bug being closed:** MEDIUM (production-visible incorrect contact info on storefront, already corrected in DB; this SPEC closes the regression vector)

---

## 1. Why this SPEC exists

On 2026-05-06 the public storefront (`https://prizma-optic.co.il`) displayed phone number **`050-717-5675`** in the top-bar phone CTA. Daniel did not recognize the number and asked the Site Overseer to investigate.

Trace (forensics, full evidence in §11 below):

1. **Origin (commit `3fb06b7`, 2026-04-20):** `modules/crm/crm-helpers.js:16` introduced a decorative comment showing a phone-format conversion example: `// --- Phone format: +972507175675 -> 050-717-5675 ---`. The number was **invented out of thin air** as an illustrative example for the `formatPhone()` helper. It was never a real Prizma number.
2. **Spread (commit `dfea397`, 2026-04-21):** `modules/crm/crm-messaging-templates.js:338` (Messaging Hub preview pane) borrowed the same number as a sample value for the `{{phone}}` template variable in the WhatsApp/SMS/Email preview frames.
3. **Promoted to "real" (commit `54b835e`, 2026-05-06):** SPEC `M4_HARDCODED_PRIZMA_REMOVAL` scanned the codebase for "hardcoded prizma values" and found `'050-717-5675'` in `crm-messaging-templates.js:338`. It assumed the value was real and wrote it to `tenants.business_phone` for slug `prizma` in migration `2026_05_06_tenant_config_seed_up.sql`.
4. **Public exposure:** The storefront (`v_public_tenant.phone` ← `tenants.business_phone`) read the value and rendered it in `Header.astro` as the top-bar tel-CTA.

**Hot fix already applied (out-of-SPEC, by Site Overseer at Daniel's directive 2026-05-06):**
```sql
UPDATE public.tenants SET business_phone = '053-3645404' WHERE slug = 'prizma';
```
Verified live: prizma now shows `053-3645404` in the storefront top bar.

**This SPEC does not fix the storefront** — that is already done. **This SPEC closes the regression vector** so it cannot recur. Three things must change:

1. The decorative example in `crm-helpers.js:16` must be replaced with a placeholder that cannot be mistaken for a real value.
2. The migration `2026_05_06_tenant_config_seed_up.sql` must be amended (or a new override migration added) so re-running the seed will not re-introduce `050-717-5675`.
3. A LEARNINGS entry must be added to the project so any future `opticup-strategic` / `opticup-executor` / Overseer skill is constrained from making the same class of mistake.

---

## 2. Scope

**In scope:**
- `modules/crm/crm-helpers.js` (1 comment line, no logic change)
- `modules/Module 4 - CRM/migrations/2026_05_06_tenant_config_seed_up.sql` (correct the hardcoded `050-717-5675` to the verified value `053-3645404`, idempotent re-application safe)
- `modules/Module 4 - CRM/migrations/2026_05_06_tenant_config_seed_down.sql` (parallel fix — verify the down migration also references the correct value)
- New: `docs/LEARNINGS.md` — create file if missing, append new entry "L-PROJECT-001: No realistic-looking demo values in source code"
- `modules/Module 4 - CRM/docs/MODULE_MAP.md` — update the `business_phone` reference (one line)

**Out of scope:**
- Re-running the migration in production. The DB is already correct (`053-3645404`); the migration fix is for **future tenants** and **disaster-recovery re-application** only.
- Auditing other potentially-similar values in the codebase (e.g., `'הרצל 32, אשקלון'` for `business_address` — Daniel-confirmed real, no action). A separate sweep SPEC may follow if other suspicious values surface.
- The 6 historical SPEC/doc files that mention `050-717-5675` as part of trace narrative — they are correct as historical record and must NOT be edited.

**Not allowed (whitelist enforcement):**
- No edits to any file outside the explicit "in scope" list.
- No DB writes from this SPEC's executor (the DB hot fix was already applied; further DB writes are not authorized here).
- No Edge Function changes.
- No git operations beyond `add` of the explicit files + `commit` + `push` to `develop`.

---

## 3. Success Criteria

| # | Criterion | Verification command | Expected output |
|---|---|---|---|
| 1 | `crm-helpers.js:16` no longer contains a realistic-looking phone number | `grep -n "717-5675\|07175675" modules/crm/crm-helpers.js` | (no match) |
| 2 | `crm-helpers.js:16` contains a placeholder-style example | `sed -n '16p' modules/crm/crm-helpers.js` | Comment with `0XX-XXX-XXXX` (no real digits in 717-5675 range) |
| 3 | `formatPhone()` function logic UNCHANGED — only the comment changed | `git diff modules/crm/crm-helpers.js` | exactly 1 line removed, 1 line added, both within the `// --- Phone format` comment |
| 4 | Migration up-file references `053-3645404` (real value), not `050-717-5675` | `grep -n "717-5675" "modules/Module 4 - CRM/migrations/2026_05_06_tenant_config_seed_up.sql"` | (no match) |
| 5 | Migration up-file business_phone for prizma equals the live DB value | `grep "business_phone" "modules/Module 4 - CRM/migrations/2026_05_06_tenant_config_seed_up.sql"` | shows `'053-3645404'` for prizma row |
| 6 | DB still shows the correct value (idempotency check — read-only) | Supabase MCP: `SELECT business_phone FROM tenants WHERE slug='prizma'` | `'053-3645404'` |
| 7 | `docs/LEARNINGS.md` exists and contains entry `L-PROJECT-001` | `grep -c "L-PROJECT-001" docs/LEARNINGS.md` | `1` or higher |
| 8 | `modules/Module 4 - CRM/docs/MODULE_MAP.md` no longer cites `050-717-5675` as the prizma business_phone | `grep -n "717-5675" "modules/Module 4 - CRM/docs/MODULE_MAP.md"` | (no match) OR matches only inside a clearly-marked historical-trace section |
| 9 | Integrity gate clean | `npm run verify:integrity` | exit 0 |
| 10 | Repo clean post-commit | `git status` after commit | `nothing to commit, working tree clean` |
| 11 | Single atomic commit | `git log --oneline develop -1` | One commit with message starting `chore(crm): replace decorative demo phone with placeholder + LEARNINGS L-PROJECT-001` |

---

## 4. Authority and execution model

- **Bounded Autonomy applies.** Execute end-to-end. Stop only on deviation from a success criterion.
- **No DB writes authorized.** This SPEC does not modify production data.
- **No `--no-verify`. No `git add -A` / `git add .`** — explicit file names only.
- **Single commit at the end.** Do not commit partway.

---

## 5. Step-by-step execution

### Step 1 — Edit `modules/crm/crm-helpers.js`

Open the file. Locate line 16 (the decorative comment introduced in commit `3fb06b7`).

**Current (verified by Site Overseer 2026-05-06):**
```javascript
  // --- Phone format: +972507175675 -> 050-717-5675 ---
```

**Replace with:**
```javascript
  // --- Phone format: +9725XXXXXXXX -> 0XX-XXX-XXXX (E.164 → local) ---
```

**Why this exact replacement:**
- Preserves the documentation intent (the comment still explains what `formatPhone()` does).
- The placeholder digits (`5XXXXXXXX` after country code, `0XX-XXX-XXXX` for local) are visibly templated — no future SPEC author or Claude session can mistake them for a real Prizma value.
- The `5` prefix in the country-code example is correct for Israeli mobile (kept for accuracy of the format example).

**Do not modify** the `PRIZMA_PHONE_RE` regex on the next line (line 18) — that is functional code; only the comment changes.

### Step 2 — Edit `modules/Module 4 - CRM/migrations/2026_05_06_tenant_config_seed_up.sql`

Locate the `UPDATE public.tenants ... WHERE slug = 'prizma'` block (around line 15 per Site Overseer's read 2026-05-06).

**Current:**
```sql
UPDATE public.tenants
   SET business_phone   = '050-717-5675',
       ...
 WHERE slug = 'prizma';
```

**Replace `'050-717-5675'` with `'053-3645404'`** in the prizma update only. Do NOT touch the demo update (its `'050-000-0000'` is intentionally a placeholder for the demo tenant — that is correct).

Add an inline comment above the prizma block explaining the change:
```sql
-- 2026-05-06 correction: original SPEC M4_HARDCODED_PRIZMA_REMOVAL pulled
-- '050-717-5675' from a decorative comment in crm-helpers.js. That value was
-- never a real Prizma number. Verified-real value is 053-3645404 (the support
-- line, also stored in ui_config.support_phone_display). See SPEC
-- M4_HARDCODED_DEMO_PHONE_CLEANUP for full forensics.
```

### Step 3 — Edit `modules/Module 4 - CRM/migrations/2026_05_06_tenant_config_seed_down.sql`

Read the down-file. If it references `050-717-5675` anywhere (e.g., in a "restore previous value" comment), update it to reflect that the previous value is `NULL` (per the down-migration intent). If it does not reference `050-717-5675`, leave it untouched — note in the EXECUTION_REPORT that no change was needed.

### Step 4 — Create or update `docs/LEARNINGS.md`

If the file does not exist, create it with this header:
```markdown
# Project LEARNINGS — Optic Up

This file accumulates project-wide LOCKED rules harvested from post-mortem
reviews. Every `opticup-strategic`, `opticup-executor`, Site Overseer, and
Campaign Overseer skill MUST read this file at session start. Rules below are
binding constraints on future code, SPECs, and audits — they cannot be
overridden without an explicit RFC SPEC that supersedes them.
```

Append (or insert in the appropriate location) this entry:

```markdown
## L-PROJECT-001 — No realistic-looking demo values in source code

**Status:** LOCKED (2026-05-06)
**Source incident:** SPEC `M4_HARDCODED_DEMO_PHONE_CLEANUP`. A decorative
comment in `crm-helpers.js` containing the invented phone number
`050-717-5675` was promoted by a later SPEC to a real DB value
(`tenants.business_phone` for prizma) and rendered on the public storefront
as Prizma's official contact number, despite never being a real value.

**Rule:**
1. **Decorative examples in code** (comments, sample/preview data, JSDoc
   examples, mock fixtures, README snippets) MUST use placeholder forms
   that cannot pass for production values:
   - Phone: `0XX-XXX-XXXX`, `+9725XXXXXXXX`, or explicitly fake like
     `555-0100..555-0199` (US "fake number" reservation block).
   - Email: `user@example.com`, `placeholder@example.test`, never a
     `@prizma-optic.co.il` or other real-looking domain.
   - Address: `[רחוב] [מספר], [עיר]` or `1 Example Street, Sample City`.
   - Names: `John Doe` / `דנה כהן` are acceptable as obviously-generic
     names; real-sounding combinations are not.
   - Coupon/IDs: `SAMPLE-XXXX`, `PLACEHOLDER`, never a string that looks
     like it might be a live promo code.

2. **SPEC authors and audit/cleanup SPECs** MUST verify the provenance
   of any value they intend to promote from code to DB / config /
   external system. If the value's origin cannot be traced to a
   user-supplied or operationally-confirmed source within the repo,
   **STOP and ask the user** before promoting it. The forensic check is:
   `git log -p -S "<value>" -- <file>` to find the introducing commit
   and read its message + diff for provenance.

3. **Cleanup / "remove hardcoded values" SPECs** that move literals from
   code to a config table MUST treat each literal as untrusted by default
   and require explicit user confirmation per literal, OR include a
   verification step that confirms the value against a live system
   (production DB, customer record, business owner direct statement).

**Forbidden patterns** (will fail review on sight):
- `// example: 050-XXX-YYYY` where XXX/YYYY are concrete digits.
- Sample data files containing what look like real customer names + real
  phones + real emails together. Use clearly-fake combinations.
- "Just use 0509999999" — looks more real than placeholder, treat as
  forbidden.

**How a reviewer enforces this:** `grep -rn "050-\|052-\|053-\|054-\|058-" --include='*.js' --include='*.ts' --include='*.astro' --include='*.md'` on any cleanup SPEC's diff. Every hit must be either (a) inside a verified-real config row (per criterion #2 above), or (b) a placeholder pattern per criterion #1.
```

### Step 5 — Update `modules/Module 4 - CRM/docs/MODULE_MAP.md`

Read the file, locate any line that cites `'050-717-5675'` as the example/expected value for `business_phone` or `%phone%`. Replace it with `'053-3645404'` and add an inline footnote like `(corrected 2026-05-06 per SPEC M4_HARDCODED_DEMO_PHONE_CLEANUP)`.

**Do NOT edit historical SPEC files** in `docs/specs/M4_HARDCODED_PRIZMA_REMOVAL/` or `docs/specs/M4_OVERNIGHT_AUDIT/` — those are historical records of past sessions and must remain accurate to what happened then.

### Step 6 — Verification round

Run all 11 success criteria from §3 in order. If any fails, STOP and report.

```bash
# Quick sanity check
grep -n "717-5675\|07175675" modules/crm/crm-helpers.js
grep -n "717-5675" "modules/Module 4 - CRM/migrations/2026_05_06_tenant_config_seed_up.sql"
grep -n "L-PROJECT-001" docs/LEARNINGS.md
npm run verify:integrity
git status
```

### Step 7 — Commit and push

```bash
git add modules/crm/crm-helpers.js
git add "modules/Module 4 - CRM/migrations/2026_05_06_tenant_config_seed_up.sql"
git add "modules/Module 4 - CRM/migrations/2026_05_06_tenant_config_seed_down.sql"
git add docs/LEARNINGS.md
git add "modules/Module 4 - CRM/docs/MODULE_MAP.md"
git commit -m "chore(crm): replace decorative demo phone with placeholder + LEARNINGS L-PROJECT-001

Closes the regression vector behind the 050-717-5675 incident
(2026-05-06): a decorative comment in crm-helpers.js was promoted by
M4_HARDCODED_PRIZMA_REMOVAL to tenants.business_phone for prizma and
rendered as the official phone on the storefront. DB hot-fixed by the
Site Overseer to 053-3645404. This commit prevents recurrence:

1. crm-helpers.js:16 — decorative phone example replaced with
   0XX-XXX-XXXX placeholder.
2. Migration 2026_05_06_tenant_config_seed_up.sql — corrected
   prizma business_phone to verified-real 053-3645404.
3. docs/LEARNINGS.md — new entry L-PROJECT-001 'No realistic-looking
   demo values in source code', LOCKED.
4. MODULE_MAP.md — corrected the cited example value.

SPEC: modules/Module 4 - CRM/docs/specs/M4_HARDCODED_DEMO_PHONE_CLEANUP/SPEC.md
No DB writes (DB already correct). No EF changes. Storefront unaffected.
"
git push origin develop
```

### Step 8 — Write `EXECUTION_REPORT.md` and `FINDINGS.md`

In the SPEC folder (`modules/Module 4 - CRM/docs/specs/M4_HARDCODED_DEMO_PHONE_CLEANUP/`):

- `EXECUTION_REPORT.md` — per the standard executor template. Include: criteria pass/fail table, deviations (if any), commit hash, final `git status`.
- `FINDINGS.md` — anything noticed during execution that wasn't in the SPEC. Note any other suspicious-looking literals encountered while editing the in-scope files (do NOT fix them — log only).

---

## 6. Stop triggers

Stop and report immediately if:

- Any other file under `modules/crm/` or `modules/Module 4 - CRM/migrations/` shows up as modified beyond the explicit list.
- The integrity gate (`npm run verify:integrity`) fails at any point.
- `crm-helpers.js` contains the substring `717-5675` or `07175675` AFTER the edit (means the replacement didn't take).
- The migration file's demo (slug='demo') row is altered — the demo `'050-000-0000'` is intentional placeholder, untouched.
- `git status` shows untracked files that are NOT from this SPEC's outputs (per Cowork-VM survey-first protocol).

---

## 7. Risks and rollback

**Risk profile:** LOW.

- No production data writes.
- No EF deploys.
- No schema changes.
- All edits are documentation/comment/seed-data corrections.

**Rollback:** `git revert <commit-hash>` is safe and complete. The DB value (`053-3645404`) was set independently of this SPEC and remains correct regardless of revert.

---

## 8. Definition of done

All 11 success criteria pass. Single commit on `develop`. Repo clean. EXECUTION_REPORT.md + FINDINGS.md written. Site Overseer notified (via FOREMAN_REVIEW.md to be authored by opticup-strategic on next strategic session).

---

## 9. Post-execution actions for the Foreman

The next opticup-strategic session, upon reading EXECUTION_REPORT.md + FINDINGS.md, MUST:

1. Author `FOREMAN_REVIEW.md` per the standard 5-section template.
2. Propose 2 self-improvements for `opticup-strategic` skill (per the self-improvement mandate). Suggested seed proposals to consider:
   - **Proposal A:** Add a "value provenance check" gate to Step 1.5 of opticup-strategic SPEC authoring, mandating `git log -p -S "<literal>"` for every phone/email/address/coupon/ID literal that the SPEC plans to promote from code to DB/config.
   - **Proposal B:** Add `docs/LEARNINGS.md` to the mandatory read-list in `opticup-executor` and `opticup-strategic` SKILL.md `<bootstrap>` sections — alongside CLAUDE.md and SESSION_CONTEXT.md.
3. Apply the 3-occurrence rule: if this is the 3rd consecutive review surfacing "phantom value cited from memory without provenance check", elevate Proposal A from "proposal" to "binding skill change" effective immediately.

---

## 10. Citations and provenance (pre-verified by Site Overseer 2026-05-06)

| Claim | Verification command | Verified |
|---|---|---|
| Comment at `crm-helpers.js:16` introduced in commit `3fb06b7` | `git log -p -S "050-717-5675" -- modules/crm/crm-helpers.js \| head -1` | ✓ |
| Comment text exactly matches `// --- Phone format: +972507175675 -> 050-717-5675 ---` | `sed -n '16p' modules/crm/crm-helpers.js` | ✓ |
| Migration up-file at `modules/Module 4 - CRM/migrations/2026_05_06_tenant_config_seed_up.sql` line 16 contains `'050-717-5675'` for prizma | direct read | ✓ |
| Live DB `tenants.business_phone` for prizma = `'053-3645404'` (post hot fix) | Supabase MCP `execute_sql` 2026-05-06 17:xx | ✓ |
| `crm-messaging-templates.js:338` no longer contains the literal (already cleaned by `M4_HARDCODED_PRIZMA_REMOVAL`) | grep file | ✓ |
| Storefront top bar now displays `053-3645404` | Daniel visual verification 2026-05-06 | ✓ |

---

## 11. Forensics — full incident timeline

| Date | Commit | Actor | Action | Effect |
|---|---|---|---|---|
| 2026-04-20 | `3fb06b7` | Claude (CRM scaffold session) | Wrote `crm-helpers.js:16` decorative comment with invented phone `050-717-5675` | Number now exists in repo, no production effect |
| 2026-04-21 | `dfea397` | Claude (Messaging Hub B7 session) | Copied number to `crm-messaging-templates.js:338` as preview default for `{{phone}}` template variable | Number now exists in 2 places |
| 2026-05-06 (early) | `54b835e` | Claude (M4_HARDCODED_PRIZMA_REMOVAL executor) | Promoted `'050-717-5675'` from `crm-messaging-templates.js:338` to `tenants.business_phone` via migration | Number now in production DB; storefront started rendering it as the prizma top-bar tel-CTA |
| 2026-05-06 (later) | `73dd0e3` | Claude (same SPEC, second commit) | Refactored `crm-messaging-templates.js` to read tenant config; the number was *removed* from that file but remained in `crm-helpers.js:16` | Number now in 2 places: code comment + DB |
| 2026-05-06 (Daniel report) | n/a | Daniel | Spotted unfamiliar phone on production storefront, asked Site Overseer for forensics | Investigation triggered |
| 2026-05-06 (hot fix) | n/a (DB only) | Site Overseer (Daniel-authorized) | `UPDATE tenants SET business_phone='053-3645404' WHERE slug='prizma'` | Storefront now correct; this SPEC closes the regression vector |

---

*End of SPEC.*
