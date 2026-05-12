# M8 Payments — Reverse-Sync Capability Research

**Source:** general-purpose subagent, dispatched 2026-05-08 by Architect.
**Question answered:** Does the POS push transaction-split detail back to the ERP via webhook / batch / polling? Or is manual re-entry the only path?
**Verdict:** Manual re-entry / "Optic Up dictates, POS executes" is the only architecturally-safe path across the 6 dominant Israeli POS systems.
**Use:** Drives the Checkout screen design — split is entered in Optic Up FIRST, totals go to the hardware POS.

---

## Per-System Verdict (short)

| System | Reverse-Sync | Notes |
|---|---|---|
| Linet | **NONE** | Forward-only API. No webhook for transaction-completion. Day-1 critical → forces manual flow. |
| Z Credit | UNKNOWN | API exists; webhooks not documented in public docs. Likely totals-only. |
| CardCom | PARTIAL | Webhook infrastructure exists, but payload likely returns total + card-installments only — NOT cash-vs-credit split. |
| Tranzila | PARTIAL | Best-documented API. Transaction tracking exists; multi-tender split in callbacks — no evidence. |
| Pelecard | UNKNOWN | Fragmented public docs. Webhooks referenced but not detailed. |
| Gama Pay | UNKNOWN | No public information found. |

---

## Cross-System Convergence

**Is reverse-sync reliable enough to architect around?** No. Across all six, reverse-sync is absent, undocumented, or limited to totals without tender breakdown. Only CardCom + Tranzila have confirmed webhook infrastructure, and neither public docs guarantee split-tender detail in the payload.

**Worst case:** Linet has zero reverse-sync. Day-1 production system forces manual flow. Even if we later integrate CardCom/Tranzila, processor webhooks will return total + installments — not cash-vs-credit mix.

**Common pattern in Israeli retail:** POS is the point-of-entry; ERP reads summary data or manually mirrors entries.

---

## Recommendation

**Day-1 architecture: "Optic Up Dictates, POS Executes."**

1. Cashier enters split in Optic Up first (₪500 cash + ₪1500 credit 3-installments).
2. Optic Up records the split as authoritative. Generates split breakdown.
3. Cashier opens hardware POS, enters only the credit total (₪1500) + 3 installments.
4. Hardware POS processes; webhook (if available) confirms settlement.
5. Optic Up cross-references webhook ↔ its own record for reconciliation.

**Why:**
- Works with Linet day-1 (no reverse-sync needed).
- Future CardCom/Tranzila webhooks become CONFIRMATION channels, not source-of-truth.
- Optic Up holds full custody of split semantics from second-zero.
- One entry-point for the cashier (split is in Optic Up).

**Avoid "POS Decides, Optic Up Learns"** unless and until a tenant's specific POS guarantees full split-tender push-back — which today, none of the 6 dominant systems do.

---

*Saved 2026-05-08 by Architect. Source: subagent dispatch.*
