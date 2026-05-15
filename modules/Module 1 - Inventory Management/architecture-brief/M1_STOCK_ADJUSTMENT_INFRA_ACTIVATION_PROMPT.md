# Activation Prompt — M1_STOCK_ADJUSTMENT_INFRA (Phase 2 #4)

> Paste the block below into a fresh Claude Code chat.
> **DO NOT dispatch until `M1_RECEIPT_VARIANT_LESS_LINES` closes 🟢 + merges.**
> Brief: `modules/Module 1 - Inventory Management/architecture-brief/M1_STOCK_ADJUSTMENT_INFRA_BRIEF.md`

---

```
Full Auto Pipeline — M1_STOCK_ADJUSTMENT_INFRA (Phase 2 #4 — closes Phase 2 quartet).

Brief: modules/Module 1 - Inventory Management/architecture-brief/M1_STOCK_ADJUSTMENT_INFRA_BRIEF.md

Activate `opticup-strategic`. Skill state inherits all harvested patterns.

PROBLEM: lens-inventory.html ➖ button is wired but dead-ends — record_adjustment_lost RPC
doesn't exist + no stock_adjustment audit table. ➖ flow surfaces "Phase 2" placeholder Hebrew
message today.

Read Brief end-to-end. Run §6 probes (6 — movement_type enum, record_adjustment_found body
mirror reference, stock_lot constraints, pin-auth integration pattern, record_stock_movement
chain to tenant_lens_stock, demo stock_lot fixtures).

Author SPEC at:
  modules/Module 1 - Inventory Management/docs/specs/M1_STOCK_ADJUSTMENT_INFRA/SPEC.md

Required SPEC sections: §0 (probes + 2 mandatory audits + Concurrent-Pipeline envelope), §1, §2
(new stock_adjustment table + record_adjustment_lost RPC + ➖ UI wiring + PIN gate), §3 (16
criteria), §4, §5, §6 rollback, §7 Destructive Operations: None, §10 (4-7 commits), §11.

Hand off to `opticup-executor`:
- New stock_adjustment table: canonical 2-policy RLS + indexes + adjustment_type CHECK enum.
- New record_adjustment_lost RPC: SECURITY DEFINER + search_path + JWT guard + PIN verification
  + FOR UPDATE on stock_lot + INSERT stock_movement + INSERT stock_adjustment + REVOKE/GRANT.
- movement_type enum extension if 'adjustment_found' / 'adjustment_lost' missing.
- ➖ button UI wired: PIN modal → qty + adjustment_type dropdown + reason → RPC call → toast +
  refresh.
- **MANDATORY FUNCTIONAL + UI smoke** (Brief §2): qty 10 lot → adjust -3 damaged → qty=7 +
  audit row + stock_movement; over-deplete RAISE; invalid PIN RAISE; anon RAISE; cross-tenant
  RAISE; +2 found case; Chrome MCP UI flow; qty=0 button disabled; no console errors. 10/10
  PASS required for 🟢.

Then `opticup-reviewer` + Foreman seal. Foreman triggers Module 1 Close Ceremony — read all
M1 FOREMAN_REVIEWs (1A_FIX, M1B0, Foundation, Foundation_Perm_Hotfix, Procurement, 4 Phase 2),
extract 1-2 lessons, propose updates to SKILL.md if recurring patterns surface (especially
PIN-gate-via-RPC and stock-audit-table patterns that may apply to future modules).

Pipeline returns ONE Hebrew status line:
  "M1_STOCK_ADJUSTMENT_INFRA [🟢/🟡/🔴]. דו"חות: SPEC/EXECUTION/TEST/REVIEW/FOREMAN.
   Phase 2 סגור. Module 1 סגור."

Iron Rules in sharp focus: 1 (PIN), 2 (writeLog), 11, 14, 15, 18, 19, 22, 23, 31, 32.

Out of scope:
- Bulk adjustments (Phase 3+)
- Approval workflow (Phase 3+; change_approval_log already exists for future)
- Adjustment reversal/undo (Day-1 single-direction)
- Reporting/analytics
- Auto-detect shrinkage
- Modifying ➕ flow (stays as deep-link)
- Prizma writes (demo only)
- Merge to main (Daniel-only)

On escalation: write modules/Module 1 - Inventory Management/escalations/{ISO_TS}_{topic}.md.

Stop on deviation, not on success.
```

---

*End of activation prompt. Last Phase 2 SPEC. Next: MODULE_REPO_SPLIT.*
