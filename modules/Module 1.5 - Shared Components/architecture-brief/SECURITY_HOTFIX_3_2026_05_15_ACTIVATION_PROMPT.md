You are Claude Code working in the Optic Up ERP repo at `C:\Users\User\opticup` (Windows desktop). Read your bootstrap files per CLAUDE.md §1 First Action, then execute the production security hotfix Brief at `modules/Module 1.5 - Shared Components/architecture-brief/SECURITY_HOTFIX_3_2026_05_15_BRIEF.md`.

This is **SECURITY_HOTFIX_3** — sequel to SECURITY_HOTFIX_2 (closed and on main as of midday). Closes the deferred F-CRIT-2 (15 views) + HOTFIX_2 FOREMAN_REVIEW §10 follow-ups (3 base-table RLS expansions + 4 admin lockdowns + save_translation_memory_batch 2nd overload + 15 carry RPCs).

**Daniel + Architect decisions baked into the Brief (do not re-litigate):**
- 3 base tables (`blog_posts`, `storefront_pages`, `ai_content`) get NEW `<table>_public_read_published` RLS policy + GRANT SELECT TO anon — this is what enables the 15 deferred views' security_invoker=on to work without storefront outage.
- Per-view rollback tagging mandatory for §1.2 (15 views).
- §1.5 A/B/C decision per RPC — Foreman picks based on tenant-derivation path; when in doubt, choose B (add JWT + REVOKE FROM anon — safer over-restrict).
- Zero data writes on any tenant. Structural only.

**Pre-flight is mandatory per work area** (per Brief §3 step 1). If §1.1 published-column convention inconsistent OR §1.5 surfaces UNTRUSTED RPC → STOP, escalate.

Run the Full-Auto Pipeline end-to-end in this chat:
1. Load skill `opticup-strategic` as Foreman → pre-flight queries per work area + Foreman A/B/C decisions for §1.5. THEN author SPEC at `modules/Module 1.5 - Shared Components/docs/specs/SECURITY_HOTFIX_3_2026_05_15/SPEC.md`. Declare `## Destructive Operations` per Brief §4.
2. Load skill `opticup-executor` → execute. Apply migrations in order from Brief §3 step 3 (smallest blast radius first: §1.3 → §1.4 → §1.5 → §1.1 → §1.2). After §1.1, BEFORE §1.2, verify base-table RLS visibility per table. After EACH §1.2 view flip, run per-view anon probe + rollback that view if probe fails.
3. Load skill `opticup-reviewer` → verify all 17 success criteria.
4. Load skill `opticup-localhost-tester` → smoke 7/7 PASS pre- AND post-migration + curl-probe ALL 7 storefront pages that consume migrated views (homepage, blog list, CMS page, product list, category list, brand page, ai-content-bearing page).
5. Back to `opticup-strategic` → write FOREMAN_REVIEW.md. Mark F-CRIT-2 RESOLVED (17/17 — was 2/17 after HOTFIX_2). Update audit reports: OVERNIGHT_BUNDLE_2 + SENTINEL_DEEP_DIVE + HOTFIX_2 FOREMAN_REVIEW §10 follow-ups all marked RESOLVED with SHA. 2 author + 2 executor skill improvements.

Hard constraints (STOP triggers per CLAUDE.md §9 + Iron Rule 32 + Brief §7):
- §1.1 published-column inconsistent across 3 tables → STOP, escalate.
- §1.2 per-view anon probe returns 0 rows when pre-migration returned >0 → STOP, rollback THAT view, escalate.
- §1.2 storefront page returns non-200 → STOP, rollback, escalate (silent storefront break).
- §1.5 untrusted tenant-derivation surfaced → STOP, escalate.
- Demo wrong-tenant test fails for any §1.5 hardened RPC → STOP.
- Smoke <7/7 PASS pre-migration → STOP.
- ANY data row UPDATE/INSERT on any tenant → STOP, this SPEC is structural only.
- Advisor returns NEW findings beyond closing F-CRIT-2/3 → STOP.

MANDATORY backup (per CLAUDE.md §9 #9 — many files modified):
- Path: `modules/Module 1.5 - Shared Components/backups/{YYYY-MM-DD}_SECURITY_HOTFIX_3_2026_05_15/`
- Files: pre-edit copies of 3 base tables' RLS policies + 15 view defs + 4 admin view defs + 16 function bodies (15 carry RPCs + save_translation_memory_batch 2nd overload) + CLAUDE.md + relevant docs.
- Per-view rollback tags: git tag `pre-hotfix3-view-<name>` before each §1.2 flip.

Do NOT:
- Refactor view bodies beyond `security_invoker=on`.
- Refactor base-table schema (only ADD RLS policy + GRANT).
- Change storefront source code (the storefront should be transparent to these changes).
- Backfill historical data.
- Touch HIGH/MEDIUM/LOW findings from Bundle 2 (separate future hotfix).
- Commit to main.
- Run `git checkout main`, `git merge`, `git rebase`, `git push --force`.

Demo tenant only for integration tests. Prizma: structural changes to base tables (RLS + grant only) + view metadata + function bodies. Zero data row writes.

Whitelist for any test:
- Phones: 0537889878, 0503348349, 0507168471
- Emails: daniel@prizma-optic.co.il, alkimovich94@gmail.com, danylis92@gmail.com

When done, return ONE Hebrew status block summarizing: pre-flight counts (3 base tables published-column convention, 15 deferred views, 4 admin views, 16 functions), §1.1 base-table RLS applied (count + anon-visible row counts per table), §1.2 views flipped (count) + per-view probe PASS/FAIL/rollback (count each), §1.3 admin lockdowns applied (count), §1.4 second overload hardened (yes/no), §1.5 A/B/C breakdown (counts), demo wrong-tenant tests, storefront probe (7/7 HTTP 200?), smoke pre/post, advisor delta (F-CRIT-2 17→0? F-CRIT-3 17→0?), backup created (yes/no), repo clean at close (yes/no).

End of activation prompt.
