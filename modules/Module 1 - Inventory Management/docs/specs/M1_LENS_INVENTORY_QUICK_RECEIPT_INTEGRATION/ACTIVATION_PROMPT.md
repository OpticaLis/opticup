# ACTIVATION_PROMPT — SPEC 4a: M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION

**Paste into a NEW Claude Code session on Daniel's Windows desktop.** Run **ONLY AFTER** SPEC 2 + SPEC 3 are both 🟢 CLOSED + pushed to origin/develop.

---

## Pre-execution gate

Before bootstrap, verify both prerequisites landed:

```powershell
cd C:\Users\User\opticup
git fetch origin
git log origin/develop --oneline | findstr "M1_5_SHARED_COMPONENTS_PHASE_0"
git log origin/develop --oneline | findstr "M1_LENS_DB_SCHEMA_RECEIPTS_NOTES"
```

Both queries must return at least one close commit. If either is missing → STOP, do not execute SPEC 4a. Wait for prerequisites.

---

You are **opticup-executor**. Execute the SPEC authored at:

```
modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION/SPEC.md
```

Parent Brief: `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_MOCKUP_FIDELITY_FULL_REBUILD_BRIEF.md`.

## Why this SPEC exists

The inventory screen was rebuilt 1:1 to mockup in Pipeline `M1_LENS_INVENTORY_MOCKUP_1TO1` (merged 2026-05-18). Subsequently:
- Round 1 mockup updates (commit `ae1a5de`) added Quick Receipt drawer, price columns in lots-table + movements-table, scanner rewiring
- Round 2 mockup updates (commit `b2d1a4b`) made the drawer the SOLE inventory-entry path + added entry-helper strip

The inventory screen's HTML/JS must now catch up to the updated mockup. SPEC 4a applies the Round 1+2 updates by consuming the shared components built in SPEC 2 + the DB schema applied in SPEC 3.

## Bootstrap

1. Load skill `opticup-executor`. First Action protocol.
2. Pre-Action Collision Check:
   ```powershell
   node scripts/pipeline-coordination.mjs claim --pipeline M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION --files-owned "modules/Module 1 - Inventory Management/**,inventory.html,css/lens-inventory.css" --branch develop
   ```

## Execute SPEC

Read `SPEC.md` in full. Scope (~3-4h):

- Wire Quick Receipt drawer into the existing inventory screen (consume the shared component from SPEC 2)
- Add price columns (`מחיר מכירה` always, `מחיר עלות` gated by `inventory.view_cost_price` permission key from SPEC 3) to lots-table + movements-table
- Add Lens Details drawer entry point (already extracted in SPEC 2)
- Add helper strip below scanner
- Rewire scanner + manual-add + bulk-add → all funnel through Quick Receipt drawer
- Tier C VFV per parent Brief — Chrome MCP side-by-side comparison live screen vs LENS_INVENTORY_MOCKUP.html

## No time budget

Quality over time.

## Critical — preserve the existing 1:1 inventory rebuild

The inventory screen is already at mockup fidelity for the base structure. **Do NOT rewrite from scratch.** Apply MINIMAL additions to integrate the Round 1+2 updates. Reuse the shared components, don't reimplement.

If Tier C VFV reveals that integration BROKE existing 1:1 work → STOP, revert, report.

## Stop-on-deviation triggers

- Existing 1:1 inventory rebuild gets degraded by integration → STOP
- Shared component API from SPEC 2 doesn't fit the integration needs → STOP, propose API change in FINDINGS
- Permission key gating doesn't behave correctly with current `permissions.js` infrastructure → STOP, escalate

## Closeout

1. EXECUTION_REPORT.md + FINDINGS.md
2. Update Module 1 SESSION_CONTEXT + CHANGELOG + MODULE_MAP
3. Commit + push to `origin/develop`
4. Release lock
5. Notify Daniel in chat: integration result, what's now visible in the inventory screen, blockers

After SPEC 4a closes 🟢:
- Cowork-Architect writes FOREMAN_REVIEW.md
- **Daniel reviews the foundation phase** (SPECs 1+2+3+4a) before authorizing parallel Groups A/B/C
- Next dispatch will be 3 worktrees for the 6 remaining screen rebuilds

**Foundation Phase 4 of 4 — this closes it.** Make it clean.
