You are Claude Code working in the Optic Up ERP repo at `C:\Users\User\opticup` (Windows desktop). Read your bootstrap files per CLAUDE.md §1 First Action, then execute the cross-cut Phase 1 P1.1 Brief at `modules/Module 4 - CRM/architecture-brief/M3_UTM_TRIPLE_LAYER_PERSISTENCE_BRIEF.md`.

This is **Phase 1 P1.1 of `roles/site-overseer/FUNNEL_ROADMAP.md`** — the SECOND SPEC of Phase 1 (after P1.4 RPC map + RETURN_SHAPE_FIX both closed today). It is a cross-cut SPEC: new DB table `crm_lead_touchpoints` + RLS + view + RPC + 2 EF modifications + 1 RPC modification.

**Daniel + Architect decisions baked into the Brief (do not re-litigate):**
- Option A (separate touchpoints table, NOT new columns on `crm_event_attendees` or `crm_leads`) — for MTA forward-compat.
- A2 scope (system-event touchpoints only: short-link click, lead submit, event register — NOT page-views). Page-view upgrade path remains open as future enum value.
- `crm_leads.utm_*` columns KEEP, NOT DROP — backward compat. New first-touch view layered on top.

Run the Full-Auto Pipeline end-to-end in this chat:
1. Load skill `opticup-strategic` as Foreman → READ FIRST: `STATE_TRANSITIONS.md` + `RPC_BODY.sql` + `FINDINGS.md` from `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/`. Then read `KNOWLEDGE_MAP.md` Layer 2 + Layer 4. THEN author the SPEC at `modules/Module 4 - CRM/docs/specs/M3_UTM_TRIPLE_LAYER_PERSISTENCE/SPEC.md`. Declare `## Destructive Operations` as `None.` Decide dedupe-key approach (composite UNIQUE vs separate `dedupe_key` text column) — document rationale in SPEC.
2. Load skill `opticup-executor` → execute the SPEC. Apply migrations via `apply_migration` MCP in the order specified in Brief §3. Deploy both EFs via Supabase MCP `deploy_edge_function`. Run the 5 demo integration scenarios from Brief §5 criterion 7. Update KNOWLEDGE_MAP.md + FUNNEL_ROADMAP.md per criteria 11/12/13.
3. Load skill `opticup-reviewer` → verify all 13 success criteria.
4. Load skill `opticup-localhost-tester` → smoke 7/7 PASS pre- AND post-migration.
5. Back to `opticup-strategic` → write FOREMAN_REVIEW.md with 2 author + 2 executor skill improvements.

Hard constraints (STOP triggers per CLAUDE.md §9 + Iron Rule 32 + Brief §7):
- The RPC body in `pg_proc` for `register_lead_to_event` differs from the post-FIND-1-fix state → STOP, write escalation.
- Any caller of `register_lead_to_event` would break on the new signature (param shape or return-value contract) → STOP. The new UTM params MUST be optional with NULL defaults.
- The new RPC `resolve_touchpoints_to_lead` delays user-facing response by >100ms → architectural issue, STOP.
- Smoke <7/7 PASS pre-migration → STOP, something regressed since RETURN_SHAPE_FIX closure.
- Any RLS policy on `crm_lead_touchpoints` deviates from the canonical JWT-claim pattern (Rule 15 from CLAUDE.md §5) → STOP, rewrite per canon.
- The view `v_crm_lead_first_touch` missing `security_invoker=true` → STOP (per SECURITY_HOTFIX_2026_05_13 hardening pattern).
- Touchpoint INSERT failing inside an existing transaction → STOP, this means same-transaction wiring is wrong.

MANDATORY backup (per CLAUDE.md §9 #9 — this SPEC touches >5 files):
- Path: `modules/Module 4 - CRM/backups/{YYYY-MM-DD}_M3_UTM_TRIPLE_LAYER_PERSISTENCE/`
- Files: pre-edit copies of register_lead_to_event RPC body, lead-intake EF, resolve-link EF, CLAUDE.md, M4 SESSION_CONTEXT/MODULE_SPEC/MODULE_MAP/ROADMAP/CHANGELOG/db-schema.

Do NOT:
- Add any page-view tracking (A1 scope — deferred to Phase 4).
- Drop or rename `crm_leads.utm_*` columns.
- Touch `crm_event_attendees` schema.
- Commit anything to `main`.
- Run `git checkout main` or `git merge` or `git rebase`.
- Author any other Phase 1 SPEC in this chat — P1.1 only.

Demo tenant only (slug=`demo`, UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`, PIN 12345). Never write to Prizma.

Whitelist for any test that needs a phone/email:
- Phones: 0537889878, 0503348349, 0507168471
- Emails: daniel@prizma-optic.co.il, alkimovich94@gmail.com, danylis92@gmail.com

When done, return ONE Hebrew status block summarizing: migrations applied (count), EFs deployed (versions), demo scenarios PASS/FAIL count out of 5, smoke pre/post, forward-compat E1-E7 verdict deltas (any moved BLOCK→SUPPORT?), backup created (yes/no), repo clean at close (yes/no).

End of activation prompt.
