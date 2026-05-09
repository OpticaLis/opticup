# ACTIVATION PROMPT — MAKE_8464122_MODULE_36_CLEANUP

> **Make-UI surgery, no code commits beyond docs. Overseer-driven, Daniel applies UI clicks.**
> **Estimated time: 5-10 minutes including verification.**

---

## How this SPEC is run

This SPEC is NOT a Claude Code SPEC. It runs in a Cowork session with the Campaign Overseer at the helm:

1. Campaign Overseer probes scenario 8464122 via Make MCP `scenarios_get` to confirm Module 36's exact connections.
2. Overseer dictates to Daniel the precise UI clicks: "right-click Module 36 → Delete; reconnect filter output to HTTP module 213 input; Save."
3. Daniel applies in Make UI.
4. Overseer re-probes via `scenarios_get` to verify the change landed.
5. Daniel runs Run-once with `רישום מהיר אירוע 14` → confirms QR receipt + scannability.
6. Overseer commits documentation to `roles/campaign-overseer/MAKE_SCENARIO_NOTES.md` and writes `EXECUTION_REPORT.md` + `FINDINGS.md`.

**No Claude Code dispatch needed.** The whole SPEC executes in the Cowork chat with Overseer + Daniel directly.

---

## When Daniel triggers this SPEC

Open a Cowork session with the Campaign Overseer loaded. Tell the Overseer:

```
Run SPEC MAKE_8464122_MODULE_36_CLEANUP. SPEC at:
modules/Module 4 - CRM/docs/specs/MAKE_8464122_MODULE_36_CLEANUP/SPEC.md
```

The Overseer will:
1. Read SPEC.md
2. Call `scenarios_get` to inspect the current state
3. Walk you through the 2-3 UI clicks needed
4. Verify post-edit
5. Coordinate Run-once
6. Document + retro commit

If Run-once fails or Module 36's output is unexpectedly referenced, Overseer stops and escalates per SPEC §5 stop triggers.

---

## Constraints

- Demo + prizma scenario uses the same blueprint (single-tenant deploy). The Module 36 removal affects production too — but pre-Rung-3, this branch was already broken (Monday board decommissioned), so the removal is strictly additive cleanup.
- Do NOT touch other branches of scenario 8464122.
- Do NOT touch other scenarios.
- Document the change in `MAKE_SCENARIO_NOTES.md` so future Foreman reviews can audit.
