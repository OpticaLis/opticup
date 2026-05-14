You are Claude Code working in the Optic Up ERP repo at `C:\Users\User\opticup` (Windows desktop). Read your bootstrap files per CLAUDE.md §1 First Action, then execute the small bug-fix Brief at `modules/Module 4 - CRM/architecture-brief/M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX_BRIEF.md`.

This is a **15-25 minute targeted fix** following the FIND-1 finding from `M4_REGISTER_LEAD_TO_EVENT_RPC_MAP` (closed earlier today). It is the prerequisite to Phase 1 P1.1 (UTM persistence) — fixing the return-shape now keeps P1.1 clean.

Run the Full-Auto Pipeline end-to-end in this chat:
1. Load skill `opticup-strategic` as Foreman → author the SPEC at `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX/SPEC.md` from the Brief. READ `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/STATE_TRANSITIONS.md` first to confirm the canonical sentinel value (the Brief says `'event_closed'` but the contract document is the truth). Declare `## Destructive Operations` as `None.` (CREATE OR REPLACE FUNCTION is not destructive per Iron Rule 32).
2. Load skill `opticup-executor` → execute the SPEC. Create the migration via `apply_migration` MCP. Run integration test on demo tenant. Update FINDINGS.md + KNOWLEDGE_MAP.md per Brief §3.
3. Load skill `opticup-reviewer` → verify all 8 success criteria in Brief §5.
4. Load skill `opticup-localhost-tester` → smoke 7/7 PASS pre- AND post-migration on demo.
5. Back to `opticup-strategic` as Foreman → write `FOREMAN_REVIEW.md`. Harvest at most 1 author improvement + 1 executor improvement (small SPEC, minimal learning expected).

Hard constraints (STOP triggers):
- The RPC body in `pg_proc` differs from the body captured in `M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/RPC_BODY.sql` from earlier today → STOP, write escalation, do NOT proceed. Something changed the RPC between SPECs.
- The canonical sentinel per `STATE_TRANSITIONS.md` is NOT `'event_closed'` → use the documented value; do NOT invent one.
- Any caller of the RPC would BREAK on the new return value (different from documented expectation) → STOP, write escalation.
- Smoke <7/7 PASS pre-migration → STOP, this means something else regressed since P1.4 closure.
- Any non-canonical migration pattern (no `SECURITY DEFINER`, no `SET search_path`, wrong RLS) → STOP, the migration must mirror the existing RPC's security pattern exactly.

Do NOT:
- Touch any other Finding from P1.4 (FIND-2/3/4/5/6/7 are separate SPECs).
- Touch any caller of the RPC (return-value contract is what they read; the value changes, they receive the right one — no caller code change).
- Add touchpoint logging (P1.1 will do that).
- Commit anything to `main`.
- Run `git checkout main` or `git merge` or `git rebase`.

Demo tenant only (slug=`demo`, UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`, PIN 12345). Never write to Prizma.

Whitelist for any test that needs a phone/email (none expected, but for reference):
- Phones: 0537889878, 0503348349, 0507168471
- Emails: daniel@prizma-optic.co.il, alkimovich94@gmail.com, danylis92@gmail.com

When done, return ONE Hebrew status block summarizing: migration applied (yes/no), demo integration test result, smoke pre/post, P1.4 FINDINGS.md updated (yes/no), KNOWLEDGE_MAP.md updated (yes/no).

End of activation prompt.
