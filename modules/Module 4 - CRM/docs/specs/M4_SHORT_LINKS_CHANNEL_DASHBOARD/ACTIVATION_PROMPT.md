# ACTIVATION PROMPT — M4_SHORT_LINKS_CHANNEL_DASHBOARD

**Copy-paste this prompt to start the Executor pipeline.**

---

You are the Optic Up Executor (opticup-executor skill). Execute the SPEC at:
`modules/Module 4 - CRM/docs/specs/M4_SHORT_LINKS_CHANNEL_DASHBOARD/SPEC.md`

Read the full SPEC first. It is the single source of truth for this task.

## Context

This SPEC adds two features to the short-links screen in the CRM admin:
(A) Channel-grouped default view — groups rows by logical link (label prefix), shows total clicks with a channel filter (הכל/SMS/מייל).
(B) Channel-aware create flow — the create dialog lets the operator choose SMS-only, email-only, or both, auto-generating convention-compliant codes.

All existing short_links data follows the channel convention (first char E/S, label suffix _email/_sms) per the already-landed M4_SHORT_LINKS_CHANNEL_SPLIT. This SPEC builds the display + create UI on top.

## Execution order

1. **Phase A:** Write + apply new RPC migration (`crm_create_channeled_short_link`) on demo. Test it.
2. **Phase B:** Modify `template-static-card.js` — add grouping, channel filter chips, create dialog channel radio. If file > 350 lines, extract `channel-group.js`.
3. **Phase C:** Apply migration to Prizma.
4. **Phase D:** Chrome MCP verification (screenshots, runtime trace, DB-query evidence, Visual-Fidelity Gate).

## Iron Rules in force

- **33:** Demo-first. Migration + UI verified on demo before Prizma.
- **34:** Browser-consumed change — Chrome MCP evidence REQUIRED: screenshots of default view, SMS-filtered view, create dialog, + DB-query evidence that displayed totals = SUM(click_count). Fill the Visual-Fidelity Gate region table in TEST_REPORT.md.
- **22:** tenant_id on every query (new RPC includes JWT tenant check).
- File size gate: 350 lines max for `.js` files in `modules/`. Extract if needed.
- Branch: `develop` only. No main. No send. No broadcast.

## Deliverables

Write to the SPEC folder (`modules/Module 4 - CRM/docs/specs/M4_SHORT_LINKS_CHANNEL_DASHBOARD/`):
- `EXECUTION_REPORT.md` — step-by-step log with SQL, curl outputs, screenshots.
- `FINDINGS.md` — observations.
- `TEST_REPORT.md` — Visual-Fidelity Gate region table.

## Stop-on-deviation triggers

- Any file exceeding 350 lines without extraction.
- RPC collision-check failing (code already exists after generation).
- Grouping logic hides or drops any existing link (the "אחר" bucket must catch all).
- Chrome MCP unavailable — cannot close without visual evidence.
- Any need to modify `resolve-link` EF.
