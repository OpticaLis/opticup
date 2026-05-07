# Project LEARNINGS — Optic Up

This file accumulates project-wide LOCKED rules harvested from post-mortem
reviews. Every `opticup-strategic`, `opticup-executor`, Site Overseer, and
Campaign Overseer skill MUST read this file at session start. Rules below are
binding constraints on future code, SPECs, and audits — they cannot be
overridden without an explicit RFC SPEC that supersedes them.

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
