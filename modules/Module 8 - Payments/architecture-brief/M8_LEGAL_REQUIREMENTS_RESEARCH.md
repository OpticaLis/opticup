# M8 Payments — Legal Requirements Research (Israel)

**Source:** general-purpose subagent, dispatched 2026-05-08 by Main Strategic.
**Question answered:** Are ALL payment methods (including cash and checks) legally required to pass through a certified POS in Israel?
**Verdict:** **YES.** Every payment — cash, checks, transfers, cards — must be recorded in a certified קופה-רושמת that issues the legal receipt. The ERP records the receipt-number; it does NOT issue the receipt itself.

---

## Key Findings

### The Law

חוק-מע"מ requires every עוסק-מורשה in Israel to record all transactions in an authorized cash-register system that issues legally-valid receipts (קבלה) or tax invoices (חשבונית-מס). Records retained 7 years. Every payment method — cash, check, transfer, card, Bit — must pass through this system.

Above NIS 100K annual revenue → fiscal POS required (real-time transmission to רשות-המסים). Prizma is well above this threshold.

2024 reform (חשבונית-מס-דיגיטלית, תקנה 18א) adds: invoices over NIS 20K (dropping to 10K in Jan 2026, 5K in June 2026) require "allocation number" from the tax authority before issue.

Cash transactions capped (חוק-צמצום-השימוש-במזומן 2018/2022): NIS 6K B2B, NIS 15K B2C.

### De-Facto Practice in Israeli Optical Retail

The standard flow across Optical Halevi, אופטיקנה, מצוקי, פוקוס, אופטיקה-יוקרה:
1. Customer pays (any method).
2. **Optometrist enters into POS** (Linet/Z-Credit/Tranzila).
3. POS prints receipt + transmits to tax authority.
4. POS data syncs to ERP for inventory/sales/reports.
5. ERP records receipt-number — does NOT independently print.

Cash + check: POS is single source of truth. ERP cannot print its own receipt for cash/check.

### ERP vs. POS — Hard Boundary

- **POS (קופה-רושמת):** issues legal receipts, tamper-proof log, fiscal transmission. Linet/Z-Credit/Tranzila/CardCom are certified.
- **ERP (Optic Up):** records receipt-number + method + customer + items. Never issues the receipt.
- **Integration direction:** ERP ← POS (ERP downstream).

### Implications for M8 — Concrete

1. **Cash payments** → must enter the POS. POS issues receipt. M8 logs receipt-number.
2. **Check payments (any date)** → must enter the POS. POS issues receipt + records check details. M8 logs receipt-number.
3. **Bank transfers** → can be recorded in ERP IF a tax invoice is issued separately (yet still through certified system). Cleanest: also through POS.
4. **Card payments** → POS or processor (Linet/Tranzila) issues receipt. M8 logs receipt-number.

**Bottom line:** every payment-row in M8 MUST be paired with a receipt-number from the certified POS. M8 doesn't print legal documents, period.

### Penalty for non-compliance

Recording cash payments only in ERP without certified POS = violation of חוק-מע"מ. Fines + criminal exposure for tax evasion.

---

## Recommended M8 Checkout Flow (Revised)

The cashier doesn't have a "method-form-by-method" choice in Optic Up first, then reconcile with POS. Instead:

1. **Optic Up:** Order is finalized in M7. Cashier sees "₪2,547 לתשלום".
2. **Optic Up:** Cashier enters payment-mix in Optic Up — for example: ₪500 מזומן + ₪1,500 אשראי 3-תשלומים + ₪547 שיק לפרעון 1.7. This is the *plan* — Optic Up records what's about to happen, not what already happened.
3. **POS:** Cashier moves to certified POS (Linet) and enters EACH payment in turn — cash, then card, then check. POS issues receipt(s).
4. **Optic Up:** Cashier returns and clicks "תשלום הושלם" → enters/scans the receipt-number(s) returned by POS. Each row in M8 stores the receipt-number it's linked to.
5. **Optic Up:** Order moves to active. "תודה" sent (M12).

Or — if POS supports forward-API (Linet does): Optic Up dispatches the payment-plan to the POS in one shot, the POS executes each leg, returns receipt-numbers via batch/webhook, Optic Up matches and closes. The user-flow is the same; just less manual entry of receipt-numbers.

---

*Saved 2026-05-08 by Main Strategic. Source: subagent dispatch.*
