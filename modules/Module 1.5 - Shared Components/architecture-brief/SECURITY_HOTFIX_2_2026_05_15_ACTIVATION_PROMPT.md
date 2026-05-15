You are Claude Code working in the Optic Up ERP repo at `C:\Users\User\opticup` (Windows desktop). Read your bootstrap files per CLAUDE.md §1 First Action, then execute the production security hotfix Brief at `modules/Module 1.5 - Shared Components/architecture-brief/SECURITY_HOTFIX_2_2026_05_15_BRIEF.md`.

This is **SECURITY_HOTFIX_2** — direct sequel to SECURITY_HOTFIX_2026_05_13 (now on main). Closes 3 CRITICAL findings re-confirmed in this morning's pre-merge validation:
- F-CRIT-1: `sync_lead_status_from_attendee` lost its `search_path='public'` hardening — restore it.
- F-CRIT-2: 17 views missing `security_invoker=on` (including `v_storefront_*`) — add it.
- F-CRIT-3: 24 SECURITY DEFINER RPCs accept `p_tenant_id` without JWT validation, 7 are anon-callable — add JWT-claim header to all 24, decide Option A (anon-safe with slug validation) vs Option B (REVOKE FROM anon) per anon-callable RPC.

Run the Full-Auto Pipeline end-to-end in this chat:
1. Load skill `opticup-strategic` as Foreman → **PRE-FLIGHT QUERIES MANDATORY** (per Brief §3 step 1) before sealing the SPEC: exact 17 view names, exact 24 RPC names + bodies + anon-callable subset, identify storefront-facing views. If counts deviate >5% from Brief expectations (17/24/7) → STOP, escalate. THEN author SPEC at `modules/Module 1.5 - Shared Components/docs/specs/SECURITY_HOTFIX_2_2026_05_15/SPEC.md`. Declare `## Destructive Operations` per Brief §4.
2. Load skill `opticup-executor` → execute. Apply migrations in order: §1.1 → §1.2 → §1.3. After §1.2, run storefront-facing view live probes BEFORE moving to §1.3.
3. Load skill `opticup-reviewer` → verify all 17 success criteria.
4. Load skill `opticup-localhost-tester` → smoke 7/7 PASS pre- AND post-migration + manual probe of 2 storefront pages that use migrated views.
5. Back to `opticup-strategic` → FOREMAN_REVIEW.md. Update Bundle 2 T5+T6 audit reports to mark F-CRIT-1/2/3 RESOLVED with commit SHAs. 2 author + 2 executor skill improvements.

Hard constraints (STOP triggers per CLAUDE.md §9 + Iron Rule 32 + Brief §7):
- Pre-flight counts deviate >5% from Brief expectations → STOP, escalate.
- §1.2: a storefront-facing view fails the pre-migration anon-read test → STOP, escalate (DO NOT silently break the storefront).
- §1.3: an anon-callable RPC cannot be cleanly assigned Option A or B → STOP, escalate.
- Demo integration test fails for any §1.x → STOP, rollback that work area, do NOT proceed.
- Smoke <7/7 PASS pre-migration → STOP, regression detected.
- Advisor returns NEW security findings beyond the 3 known CRITICAL → STOP, list them.
- ANY Prizma row data UPDATE (not function/view/RPC structural) → STOP, this SPEC is structural only.

MANDATORY backup (per CLAUDE.md §9 #9 — >5 files modified):
- Path: `modules/Module 1.5 - Shared Components/backups/{YYYY-MM-DD}_SECURITY_HOTFIX_2_2026_05_15/`
- Files: pre-edit snapshots of all 25 function bodies (1 in §1.1 + 24 in §1.3) via `pg_get_functiondef` + all 17 view definitions via `pg_get_viewdef` + CLAUDE.md + relevant docs.

Do NOT:
- Refactor RPC bodies beyond adding the JWT validation header.
- Change RLS policies on any table (separate findings if any).
- Change storefront source code (escalate if §1.2 requires it).
- Touch other Bundle 2 findings (HIGH/MEDIUM/LOW — separate future hotfix).
- Backfill historical audit data.
- Commit to main.
- Run `git checkout main`, `git merge`, `git rebase`, `git push --force`.

Demo tenant only for integration tests (slug=`demo`, UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`, PIN 12345). Prizma: function/view/RPC STRUCTURAL changes only (the migrations themselves), zero data row writes.

Whitelist for any test:
- Phones: 0537889878, 0503348349, 0507168471
- Emails: daniel@prizma-optic.co.il, alkimovich94@gmail.com, danylis92@gmail.com

When done, return ONE Hebrew status block summarizing: pre-flight counts (exact 17/24/7 or deviations), §1.1 fix applied (yes/no), §1.2 views fixed (count) + storefront-facing views verified (count tested PASS), §1.3 RPCs hardened (count) + Option A/B breakdown for the 7 anon-callable, demo integration tests result per work area, smoke pre/post, advisor delta (3 CRITICAL gone? new findings?), backup created (yes/no), repo clean at close (yes/no).

End of activation prompt.
