# Activation Prompt — M1_RECEIPT_VARIANT_LESS_LINES (Phase 2 #3)

> Paste the block below into a fresh Claude Code chat.
> **DO NOT dispatch until `M1_K2_RECEIPT_COMPLETION` closes 🟢 + merges.**
> Brief: `modules/Module 1 - Inventory Management/architecture-brief/M1_RECEIPT_VARIANT_LESS_LINES_BRIEF.md`

---

```
Full Auto Pipeline — M1_RECEIPT_VARIANT_LESS_LINES (Phase 2 #3).

Brief: modules/Module 1 - Inventory Management/architecture-brief/M1_RECEIPT_VARIANT_LESS_LINES_BRIEF.md

Activate `opticup-strategic`. Skill state inherits all harvested patterns.

PROBLEM: Goods Receipt UI allows manual lines (bonus items, samples) without variant_id, but
stock_lot.variant_id NOT NULL blocks K2. Currently the manual-line button surfaces a 23514
CHECK violation. Path A: nullable variant_id. Path B: skip stock_lot for manual lines.
Architect recommendation: B.

Read Brief end-to-end. Run §6 probes (4 — current constraint, K2 body, receipt_line shape,
downstream consumer dependency check).

Author SPEC at:
  modules/Module 1 - Inventory Management/docs/specs/M1_RECEIPT_VARIANT_LESS_LINES/SPEC.md

Required SPEC sections: §0 (probes + 2 mandatory audits + Concurrent-Pipeline envelope), §1, §2
(Path A or B + K2 conditional branching for source='manual'), §3 (16 criteria), §4, §5, §6
rollback, §7 Destructive Operations: None, §10 (2-4 commits), §11.

Hand off to `opticup-executor`:
- Path B: K2 detects source='manual' → INSERT purchase_receipt_line only, skip stock_lot +
  stock_movement, INCLUDE in supplier_debt.total_amount.
- Path A (if Module Strategist picks): ALTER stock_lot.variant_id NULL + CHECK constraint.
- **MANDATORY FUNCTIONAL + UI smoke** (Brief §2): PO 2 lines + 1 manual line → close GR → confirm
  2 stock_lots + 1 receipt_line variant-less + supplier_debt includes manual cost + PO status
  unaffected by manual + manual line cannot reference a PO line + Chrome MCP GR screen smoke.
  6/6 PASS required for 🟢.

Then `opticup-reviewer` + Foreman seal.

Pipeline returns ONE Hebrew status line:
  "M1_RECEIPT_VARIANT_LESS_LINES [🟢/🟡/🔴]. דו"חות: SPEC/EXECUTION/TEST/REVIEW/FOREMAN."

Iron Rules in sharp focus: 1, 14, 15, 18, 19, 22, 31, 32.

Out of scope:
- Other source types (e.g., promotional, warranty)
- UI changes to manual-line form beyond what already works
- Customer linkage on manual lines
- M7 sale_order on manual
- K3 trigger changes
- Modifying CLAUDE.md / MASTER_ROADMAP / TECH_DEBT beyond standard
- Prizma writes (demo only)
- Merge to main (Daniel-only)

On escalation: write modules/Module 1 - Inventory Management/escalations/{ISO_TS}_{topic}.md.

Stop on deviation, not on success.
```

---

*End of activation prompt.*
