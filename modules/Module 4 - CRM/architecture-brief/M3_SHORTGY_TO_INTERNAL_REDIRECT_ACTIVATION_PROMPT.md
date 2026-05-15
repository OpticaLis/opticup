You are Claude Code working in the Optic Up ERP repo at `C:\Users\User\opticup` (Windows desktop). Read your bootstrap files per CLAUDE.md §1 First Action, then execute the Phase 1 P1.3 Brief at `modules/Module 4 - CRM/architecture-brief/M3_SHORTGY_TO_INTERNAL_REDIRECT_BRIEF.md`.

This is **Phase 1 P1.3 of `roles/site-overseer/FUNNEL_ROADMAP.md`** — the **LAST execution-SPEC of Phase 1** (after P1.4 + RETURN_SHAPE_FIX + P1.1 + P1.2, all closed 2026-05-14). Migrates customer-facing short-link usage from external `prizmaoptic.short.gy` to internal `/r/<code>` so EVERY click flows through `resolve-link` EF and produces a `short_link_clicks` + `crm_lead_touchpoints` row (P1.1+P1.2 wiring).

**Daniel + Architect decisions baked into the Brief (do not re-litigate):**
- Migration to internal `/r/<code>` chosen — short.gy bypasses measurement.
- ONLY statically-embedded short.gy links in scope (templates, CMS blocks, source files). Broadcast-runtime-generated short-links are already handled by P1.2.
- Backfilling historical click data from short.gy → internal: OUT OF SCOPE. From cutover day forward, all new clicks are internal.
- short.gy account/DNS deactivation: OUT OF SCOPE. Daniel does that manually after 30 days of zero traffic.
- Foreman decides whether to include the minimal MVP ERP stats page in THIS SPEC or split as follow-up. Architect's leaning: include MVP (closes the loop on Daniel's "see click stats in our system" request).

Run the Full-Auto Pipeline end-to-end in this chat:
1. Load skill `opticup-strategic` as Foreman → author SPEC at `modules/Module 4 - CRM/docs/specs/M3_SHORTGY_TO_INTERNAL_REDIRECT/SPEC.md`. **Step 0 INVENTORY is mandatory** — grep both repos + query templates+CMS+short_links table before sealing. Declare `## Destructive Operations` per Brief §4 (4 UPDATE/Edit operations against documented row sets).
2. Load skill `opticup-executor` → execute. Run Step 0 INVENTORY first; STOP for review if surprises surface. Create `short_links` rows. Apply replacements in order (DB rows first, then storefront source, then ERP source). Build ERP stats page if Foreman included it. Update KNOWLEDGE_MAP.md + FUNNEL_ROADMAP.md.
3. Load skill `opticup-reviewer` → verify all 16 success criteria, with special attention to grep criteria 3-6 (zero remaining short.gy in scope).
4. Load skill `opticup-localhost-tester` → smoke 7/7 PASS pre- AND post-migration + manual click test on 3 random new short-links.
5. Back to `opticup-strategic` → write FOREMAN_REVIEW.md with 2 author + 2 executor skill improvements. **Confirm Phase 1 COMPLETE in FUNNEL_ROADMAP.md.**

Hard constraints (STOP triggers per CLAUDE.md §9 + Iron Rule 32 + Brief §7):
- INVENTORY surfaces a short.gy URL OUTSIDE prizma's known domains → STOP, escalate.
- Any short.gy URL returns dead (HTTP 404/410) → STOP, ask Daniel.
- `crm_message_templates` UPDATE touches non-prizma tenant rows → STOP, rollback.
- Storefront source replacement breaks build → STOP, rollback.
- `resolve-link` EF returns non-301/302 for any new code → STOP, fix.
- Smoke <7/7 PASS pre-migration → STOP, regression detected.

MANDATORY backup (per CLAUDE.md §9 #9 + Iron Rule 32):
- Path: `modules/Module 4 - CRM/backups/{YYYY-MM-DD}_M3_SHORTGY_TO_INTERNAL_REDIRECT/`
- Files: pre-edit JSON dumps of every UPDATED DB row + pre-edit copies of every modified source file + CLAUDE.md + M4 SESSION_CONTEXT/MODULE_SPEC/MODULE_MAP/ROADMAP/CHANGELOG/db-schema.

Cross-repo handling:
- Storefront changes commit to `opticalis/opticup-storefront@develop`. Storefront main-merge is Daniel-only via PR per `feedback_storefront_branch_model`.
- ERP changes commit to `opticalis/opticup@develop`.

Do NOT:
- Deactivate the short.gy account or DNS for `prizmaoptic.short.gy`.
- Backfill historical click data from short.gy.
- Migrate broadcast-runtime-generated short-links (P1.2 already handles).
- Build dashboard features beyond minimal MVP (charts, filters, exports → defer to Phase 2.5.1).
- Drop/rename any column or table.
- Commit to main on either repo.
- Run `git checkout main`, `git merge`, `git rebase`.
- Author any other SPEC in this chat — P1.3 only.

Demo tenant only for tests (slug=`demo`, UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`, PIN 12345). Prizma rows are UPDATED in scope per Brief §5 criteria 3+4 — that's the SPEC's deliberate scope, but every UPDATE must be backed up first, and zero writes against unrelated Prizma tables.

Whitelist for any test that needs a phone/email:
- Phones: 0537889878, 0503348349, 0507168471
- Emails: daniel@prizma-optic.co.il, alkimovich94@gmail.com, danylis92@gmail.com

When done, return ONE Hebrew status block summarizing: INVENTORY count (short.gy refs found by surface), short_links rows created, DB UPDATEs applied (templates + CMS), source files edited (storefront count + ERP count), MVP stats page included (yes/no), demo end-to-end chain test result, smoke pre/post, Phase 1 status (COMPLETE / partial), backup created (yes/no), repo clean at close (yes/no).

End of activation prompt.
