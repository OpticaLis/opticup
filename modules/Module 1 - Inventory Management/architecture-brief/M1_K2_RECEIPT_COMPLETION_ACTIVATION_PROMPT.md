# Activation Prompt — M1_K2_RECEIPT_COMPLETION (Phase 2 #2)

> Paste the block below into a fresh Claude Code chat.
> **DO NOT dispatch until `M1_HOTFIX_PERMISSIONS_HOT_RELOAD` closes 🟢 + merges to main.**
> Brief: `modules/Module 1 - Inventory Management/architecture-brief/M1_K2_RECEIPT_COMPLETION_BRIEF.md`

---

```
Full Auto Pipeline — M1_K2_RECEIPT_COMPLETION (Phase 2 #2).

Brief: modules/Module 1 - Inventory Management/architecture-brief/M1_K2_RECEIPT_COMPLETION_BRIEF.md

Activate `opticup-strategic`. Skill state inherits all harvested patterns.

PROBLEM: K2 (m1_create_receipt_from_box) creates receipt/lot/movement/debt but doesn't update
PO state. purchase_order_line.qty_received stays 0; purchase_order.status never advances from
'sent' to 'partial'/'fully_received'. Even after a PO is fully received, POs List shows it as
still open.

Read Brief end-to-end. Run §6 probes (6 SQL queries — current K2 body, PO column shape,
constraint shape, receipt-line columns, K2 caller signature, demo fixtures).

Author SPEC at:
  modules/Module 1 - Inventory Management/docs/specs/M1_K2_RECEIPT_COMPLETION/SPEC.md

Required SPEC sections: §0 (probes + 2 mandatory audits + Concurrent-Pipeline envelope), §1,
§2 (3 fixes — qty_received UPDATE, PO status UPDATE, discrepancy_qty populate), §3 (20+ criteria
from Brief §5), §4, §5, §6 rollback, §7 Destructive Operations: None, §10 commit plan (3-5),
§11 lessons.

Hand off to `opticup-executor`:
- CREATE OR REPLACE FUNCTION m1_create_receipt_from_box (extend, don't replace).
- Add purchase_order.fully_received_at column if missing.
- Apply M1A discipline preserved.
- **MANDATORY FUNCTIONAL + UI smoke** (Brief §2): create PO 3 lines → partial receipt → status='partial'
  → another receipt closing remaining → status='fully_received' + fully_received_at populated
  + discrepancy_qty populated when received<ordered + over-receipt RAISES + cancelled PO RAISES
  + Chrome MCP UI verification on POs List + no regression on M1B0/K2-baseline smoke. 9/9 PASS
  required for 🟢.

Then `opticup-reviewer` re-runs criteria + advisors-for-objects.mjs + spot-checks K2 idempotency.
Writes REVIEW.md.
Then `opticup-strategic` Foreman-reviews. Writes FOREMAN_REVIEW.md.

Pipeline returns ONE Hebrew status line:
  "M1_K2_RECEIPT_COMPLETION [🟢/🟡/🔴]. דו"חות: SPEC/EXECUTION/TEST/REVIEW/FOREMAN."

Iron Rules in sharp focus: 1, 11, 14, 15, 18, 22, 31, 32.

Out of scope:
- Other RPCs (only K2 touched)
- UI changes beyond automatic status reflection
- Discrepancy resolution workflow (Phase 3+)
- Reconciliation Agent (M9)
- force_mark_po_received (deferred)
- Modifying Phase 1A / M1B0 / 1B foundation beyond K2
- Prizma writes (demo only)
- Merge to main (Daniel-only)

On escalation: write modules/Module 1 - Inventory Management/escalations/{ISO_TS}_{topic}.md.

Stop on deviation, not on success.
```

---

*End of activation prompt.*
