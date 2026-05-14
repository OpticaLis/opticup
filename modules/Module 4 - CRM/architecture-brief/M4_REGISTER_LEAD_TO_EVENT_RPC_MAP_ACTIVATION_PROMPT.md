You are Claude Code working in the Optic Up ERP repo at `C:\Users\User\opticup` (Windows desktop). Read your bootstrap files per CLAUDE.md §1 First Action, then execute the read-only diagnostic Brief at `modules/Module 4 - CRM/architecture-brief/M4_REGISTER_LEAD_TO_EVENT_RPC_MAP_BRIEF.md`.

This is **Phase 1 P1.4 of `roles/site-overseer/FUNNEL_ROADMAP.md`** — the first SPEC of Phase 1, foundation for the next 3 SPECs (P1.1 UTM persistence + P1.2 broadcast_id propagation + P1.3 short.gy migration). It is read-only diagnostic — zero DB writes, zero file deletions, zero code changes outside the SPEC folder.

Run the Full-Auto Pipeline end-to-end in this chat:
1. Load skill `opticup-strategic` as Foreman → author the SPEC at `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/SPEC.md` from the Brief. Probe `pg_proc` for the RPC's existence before sealing the SPEC. Declare `## Destructive Operations` as `None.`
2. Load skill `opticup-executor` → execute the SPEC. Produce the 3 artifacts: `RPC_BODY.sql`, `STATE_TRANSITIONS.md`, `FINDINGS.md`. Plus the standard `EXECUTION_REPORT.md`.
3. Load skill `opticup-reviewer` → verify all 9 success criteria in Brief §5. Run smoke `npm run smoke` on demo tenant as control (must be 7/7 PASS).
4. Load skill `opticup-localhost-tester` → start servers + run smoke + verify no regression (smoke 7/7 PASS, integrity exit 0). This is a control check; no UI changed.
5. Back to `opticup-strategic` as Foreman → write `FOREMAN_REVIEW.md`. Include 2 author-skill improvements + 2 executor-skill improvements harvested from this run (if any), per the self-improving skill protocol.

Hard constraints (STOP triggers per CLAUDE.md §9 Bounded Autonomy + Iron Rule 32):
- The RPC body returned by `pg_proc` does not match any expected shape OR the RPC is missing → STOP, write escalation at `modules/Module 4 - CRM/escalations/{ISO_TS}_RPC_MISSING.md`, emit ONE Hebrew line to Daniel.
- Any caller's expectation diverges so significantly from RPC behavior that it constitutes a live production bug (not just a Finding) → STOP, write escalation, do NOT silently document.
- Any step would require a DB write → STOP. This SPEC is read-only.
- Smoke <7/7 PASS → STOP, this means something else regressed during the run.
- The mandatory backup step does NOT apply — this SPEC modifies zero existing files (only creates new SPEC-folder artifacts).

Do NOT:
- Modify the RPC itself.
- Modify any caller of the RPC.
- Touch `SITE_OVERSEER_SKILL.md` or `KNOWLEDGE_MAP.md` in this SPEC (skill update is a deferred follow-up step per Brief §6).
- Commit anything to `main`.
- Run `git checkout main` or `git merge` or `git rebase`.
- Author any other Phase 1 SPEC in this chat — P1.4 only. P1.1/P1.2/P1.3 are separate dispatches.

Demo tenant only for any test queries (slug=`demo`, UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`, PIN 12345). Never write to Prizma.

Whitelist for any test that needs a phone/email (none expected, but for reference):
- Phones: 0537889878, 0503348349, 0507168471
- Emails: daniel@prizma-optic.co.il, alkimovich94@gmail.com, danylis92@gmail.com

When done, return ONE Hebrew status block summarizing: RPC body lines counted, callers found, findings logged (with severity counts), smoke result, forward-compat verdict for each of E1-E7 (block / support / N/A).

End of activation prompt.
