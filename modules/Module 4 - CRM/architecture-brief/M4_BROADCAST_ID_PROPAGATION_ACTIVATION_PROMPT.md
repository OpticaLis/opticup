You are Claude Code working in the Optic Up ERP repo at `C:\Users\User\opticup` (Windows desktop). Read your bootstrap files per CLAUDE.md §1 First Action, then execute the Phase 1 P1.2 Brief at `modules/Module 4 - CRM/architecture-brief/M4_BROADCAST_ID_PROPAGATION_BRIEF.md`.

This is **Phase 1 P1.2 of `roles/site-overseer/FUNNEL_ROADMAP.md`** — THIRD execution-SPEC of Phase 1 (after P1.4 RPC map + RETURN_SHAPE_FIX + P1.1 UTM Triple Layer, all closed 2026-05-14). It wires `broadcast_id` end-to-end through `crm_message_queue` → `crm_message_log` → `short_link_clicks` → `crm_lead_touchpoints` + pg_cron counter update.

**Daniel + Architect decisions baked into the Brief (do not re-litigate):**
- Option X (explicit broadcast_id encoded in short-link URL) chosen — NOT Option Y (time-window heuristic). Rationale: marketing maturity tier requires measurement, not guessing.
- Foreman picks X1 (per-broadcast short-link codes) vs X2 (query-string tag) — Architect's leaning is X1. Foreman validates against current `short_links` table shape and documents rationale.
- pg_cron periodic aggregation chosen for `crm_broadcasts.total_sent` counter — NOT synchronous per-row trigger. Same pattern as STATUS_CHANGE_TRIGGERS_FRAMEWORK consumer.
- Backfill of historical broadcasts (2026-05-12 → 2026-05-14 gap) OUT OF SCOPE — documented as known-unattributed in FINDINGS.md.

Run the Full-Auto Pipeline end-to-end in this chat:
1. Load skill `opticup-strategic` as Foreman → READ FIRST: `STATE_TRANSITIONS.md` + `RPC_BODY.sql` from `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/`. READ `KNOWLEDGE_MAP.md` Layers 5 (Broadcasts) + 7 (Click Tracking). Inspect `short_links` table shape to inform X1/X2 decision. THEN author the SPEC at `modules/Module 4 - CRM/docs/specs/M4_BROADCAST_ID_PROPAGATION/SPEC.md`. Declare `## Destructive Operations` as `None.`
2. Load skill `opticup-executor` → execute. Apply migrations via MCP `apply_migration` in order from Brief §3. Deploy `send-message` + `resolve-link` EFs (MCP-first, auto-CLI-fallback per the newly-encoded SKILL rule). Run the demo integration test from Brief §5 criterion 3 covering the full chain. Update KNOWLEDGE_MAP.md + FUNNEL_ROADMAP.md per criteria 12/13.
3. Load skill `opticup-reviewer` → verify all 14 success criteria.
4. Load skill `opticup-localhost-tester` → smoke 7/7 PASS pre- AND post-migration.
5. Back to `opticup-strategic` → write FOREMAN_REVIEW.md with 2 author + 2 executor skill improvements.

Hard constraints (STOP triggers per CLAUDE.md §9 + Iron Rule 32 + Brief §7):
- The chosen X1/X2 mechanism breaks existing short-link click resolution → STOP.
- pg_cron job UPDATEs the wrong counter or runs against the wrong tenant → STOP.
- Any existing caller of `register_lead_to_event` breaks on the new p_broadcast_id param → STOP. Param MUST be optional with NULL default.
- Touchpoint INSERT chain (P1.1 wiring) regresses → STOP.
- `send-message` EF fails to drain after redeploy → STOP, this is a production breaker.
- Smoke <7/7 PASS pre-migration → STOP.
- Any RLS policy on new FK columns → not needed (inherited from parent table tenant_id) — verify, do NOT add redundant policies.

MANDATORY backup (per CLAUDE.md §9 #9 — this SPEC touches >5 files):
- Path: `modules/Module 4 - CRM/backups/{YYYY-MM-DD}_M4_BROADCAST_ID_PROPAGATION/`
- Files: pre-edit copies of register_lead_to_event RPC body, send-message EF, resolve-link EF, CLAUDE.md, M4 SESSION_CONTEXT/MODULE_SPEC/MODULE_MAP/ROADMAP/CHANGELOG/db-schema.

Do NOT:
- Backfill historical broadcasts (out of scope by design).
- Change broadcast targeting / audience / scheduling logic.
- Add new broadcast types or templates.
- Drop or rename any existing column.
- Commit to main.
- Run `git checkout main`, `git merge`, `git rebase`.
- Author any other Phase 1 SPEC in this chat — P1.2 only.

Demo tenant only (slug=`demo`, UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`, PIN 12345). Never write to Prizma.

Whitelist for any test that needs a phone/email:
- Phones: 0537889878, 0503348349, 0507168471
- Emails: daniel@prizma-optic.co.il, alkimovich94@gmail.com, danylis92@gmail.com

When done, return ONE Hebrew status block summarizing: migrations applied (count), EFs deployed (versions + deploy mechanism MCP/CLI), demo chain test result (PASS/FAIL for each chain link), smoke pre/post, pg_cron job verified (yes/no after 2-min wait), backup created (yes/no), repo clean at close (yes/no), X1/X2 decision + rationale.

End of activation prompt.
