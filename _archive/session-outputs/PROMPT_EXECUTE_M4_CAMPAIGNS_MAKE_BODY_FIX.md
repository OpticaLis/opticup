# Claude Code — Execute SPEC: M4_CAMPAIGNS_MAKE_BODY_FIX

> **Purpose:** Execute the SPEC at `outputs/SPEC_M4_CAMPAIGNS_MAKE_BODY_FIX.md`. Move it to its canonical location, perform all the steps under Bounded Autonomy, write retrospective.
> **Author:** opticup-strategic (Cowork session 2026-04-26 evening)

---

## First Action — Session Start (CLAUDE.md §1)

This is likely a continuation. Skip redundant steps. Confirm:
- `git remote -v` is `opticalis/opticup`, branch is `develop`. ✅
- `git log -1` shows `7416854 feat(crm): facebook-campaigns-sync v3 — env-based MAKE_SECRET (rotated)`. If different — STOP.
- `git status`: 3 guardian files modified, untracked outputs/strays — same as session start. No staged files.

If the state diverges from the above — STOP and report.

---

## Step 0 — Move the SPEC into place (folder-per-SPEC protocol)

The SPEC currently lives at `outputs/SPEC_M4_CAMPAIGNS_MAKE_BODY_FIX.md`. Per CLAUDE.md §7 Authority Matrix, SPECs must live at `modules/Module X - [Name]/docs/specs/{SPEC_SLUG}/SPEC.md`.

```bash
mkdir -p "modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_MAKE_BODY_FIX"
mv "outputs/SPEC_M4_CAMPAIGNS_MAKE_BODY_FIX.md" "modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_MAKE_BODY_FIX/SPEC.md"
```

Verify with `ls modules/Module\ 4\ -\ CRM/docs/specs/M4_CAMPAIGNS_MAKE_BODY_FIX/`. Should show `SPEC.md`.

---

## Step 1 — Read the SPEC

Read `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_MAKE_BODY_FIX/SPEC.md` in full. The SPEC drives this entire task. Everything below is just the dispatcher's note.

---

## Step 2 — Load opticup-executor skill

This is a SPEC execution task. Load the `opticup-executor` skill if not already loaded. Follow its SPEC Execution Protocol.

---

## Step 3 — Execute the SPEC

Follow the SPEC §10 (Pre-flight Checks) → §12 (QA Protocol) Paths 0–6.

Key reminders, all already in the SPEC but worth re-flagging here:

- **Scenario `9126542` stays DEACTIVATED** except for the brief activate-watch-deactivate window (≤90 seconds) if `scenarios_run` doesn't support this trigger type.
- **Do NOT modify the EF.** It's correct as-is.
- **Do NOT modify modules id=1, id=2, or id=3 in `9126542`.** Only insert the new CreateJSON module + update the HTTP body.
- **Mask all secret values** in any output. The new MAKE_SECRET prefix `fbsync_f7acdea0...` should be the most you ever expose.
- **Stop on deviation.** Per the SPEC §5 — most importantly, stop if smoke test produces HTTP 400 again, or if any module other than the targeted ones gets modified.

---

## Step 4 — At SPEC close

Per the SPEC §9 commit plan: 1 doc commit (the README + Data Structure JSON export). Then per the folder-per-SPEC retrospective protocol: write `EXECUTION_REPORT.md` and (if any) `FINDINGS.md` in the SPEC folder, commit them.

After the retrospective commit, hand back to the strategic chat with:
- Final commit hashes.
- Final `git status`.
- DB verification query results (row counts).
- Confirmation that scenario `9126542` is `isActive: false`.
- Any FINDINGS that warrant FOREMAN_REVIEW attention.

---

## Stop-on-Deviation

Per SPEC §5 + CLAUDE.md §9 globals. Most likely stops:

- MCP doesn't expose `data-structures_create` → fall back to manual instructions for Daniel.
- `scenarios_update` rejects the new blueprint → revert and report.
- Smoke test returns HTTP 400 → fix didn't take. Roll back per §6, investigate.
- DB shows 0 rows after HTTP 200 → flag as finding, not a fix failure.

---

## Time Estimate

20–40 minutes. Roughly: 5 min Data Structure + scenario update, 5 min smoke test, 10 min DB verification + retrospective writing, 5 min commits.

---

## Iron Rule Compliance

All covered in SPEC §11 + §3 criteria 19, 20, 21, 22. Triple-check Rule 23 — no secrets in any committed file.

---

*End of dispatcher prompt. Read the SPEC at `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_MAKE_BODY_FIX/SPEC.md` and execute it.*
