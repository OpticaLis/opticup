# Activation Prompt — STUDIO_BRANDS_VISIBILITY_REWORK_2026_04_27

> **For:** Claude Code on Daniel's Windows desktop / laptop / Mac
> **Repo:** `opticalis/opticup` (ERP only — storefront NOT touched)
> **Branch:** `develop`
> **Authored:** 2026-04-27 by Cowork-strategic (Foreman)
> **Severity:** HIGH — UX confusion + accidental data loss surface

---

## Paste this entire block into Claude Code

```
You are opticup-executor. Load your skill: opticup-skills:opticup-executor.

Execute SPEC at:
modules/Module 1 - Inventory/docs/specs/STUDIO_BRANDS_VISIBILITY_REWORK_2026_04_27/SPEC.md

Context (read in this order before touching anything):
1. CLAUDE.md — Iron Rules 1–31
2. The SPEC.md above, in full
3. modules/storefront/studio-brands.js — current 875-line file you'll modify
4. storefront-studio.html — line 85 will be removed
5. The 3 most recent FOREMAN_REVIEW.md files under
   modules/Module 1 - Inventory/docs/specs/

Bounded Autonomy:
- The SPEC defines 16 success criteria with exact expected values. Match each
  step to its expected. Match → continue. Mismatch → STOP and report.
- Pre-flight is MANDATORY: capture BEFORE_STATE.json into the SPEC folder
  BEFORE the first edit. Without it, rollback for the McQueen UPDATE is
  unsafe and the SPEC is non-compliant.
- §7 Out-of-Scope is exhaustive. The SPEC only changes 2 files
  (`storefront-studio.html`, `modules/storefront/studio-brands.js`) and
  performs ONE targeted DB UPDATE on the McQueen brand row.

Hard rules:
- DO NOT modify is_deleted on any row, ever.
- DO NOT touch LOOL or Tom Ford (other exclude_website=true brands — legitimate).
- DO NOT modify inventory.website_sync EXCEPT through the bulk-mode user action
  (which lives behind a confirm modal — verify the gate works before committing).
- DO NOT modify any view definition.
- DO NOT touch the storefront repo. Zero commits there.
- The bulk-mode UPDATE in inventory MUST: (a) be tenant-scoped via tenant_id
  filter, (b) be brand-scoped via brand_id filter, (c) be confirmation-gated,
  (d) ONLY modify website_sync — no other column.
- Iron Rule 7 (DB via helpers): use sb.from(T.INVENTORY).update(...), not
  sb.from('inventory').

QA after writing code (per SPEC §12), in order:
1. Studio nav has no "Brands" link.
2. Brand editor modal shows the new radio group + bulk-mode select.
3. AI button shows visible spinner during AI call.
4. Bulk-mode confirmation prompt shows correct product count + brand name.
5. After deploy, McQueen appears in supersale-stock store_all section.
6. Pick a TEST brand (not McQueen, not LOOL, not Tom Ford), test "hide-all"
   roundtrip — verify it disappears from /brands then reset to "full".
7. McQueen products count unchanged (9 active rows in inventory).

Attach §12 outputs verbatim to EXECUTION_REPORT.md §QA.

Both repos must be CLEAN at end:
- ERP (opticup): on develop, "nothing to commit, working tree clean"
- Storefront: untouched (verify with git status — only pre-existing untracked
  files allowed).
- Push ERP to origin/develop. Storefront — no push (no commits).

Mandatory deliverables in SPEC folder:
1. EXECUTION_REPORT.md
2. FINDINGS.md
3. BEFORE_STATE.json (pre-flight)

Hebrew status to Daniel (one sentence) when done:
"לשונית מותגים בסטודיו עם 4 מצבי תצוגה ברורים, כפתור 'החל על כל הדגמים' עם
אישור, אינדיקציית AI גלויה, ואלכסנדר מקווין חזר לאתר."
Then list the 4 commit hashes.

If anything diverges from §3 expected values — STOP, run §6 rollback, report
to Daniel for instructions. Do NOT improvise a recovery.
```

---

## Notes for Daniel

- Expected runtime: 25–40 minutes (mostly UI work in `studio-brands.js`).
- Only ERP repo. Storefront stays untouched.
- One DB row changes: Alexander McQueen restored. LOOL and Tom Ford stay
  exactly as they are (their `exclude_website=true` is legitimate from prior
  decisions).
- After Claude Code finishes, paste-back the EXECUTION_REPORT block to me in
  Cowork and I'll write the FOREMAN_REVIEW.
- Test the bulk-mode action once on a small low-stakes brand during QA, not
  on McQueen.
