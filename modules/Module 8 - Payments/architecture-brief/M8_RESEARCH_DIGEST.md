# M8 Payments — Strategic Research Digest

**Source:** general-purpose subagent, dispatched 2026-05-08 by Architect per Pattern P23 (research-first).
**Scope:** 8 categories — Israeli POS market, international standards, tax-authority, complex patterns, architecture, vendor specifics, edge-cases, reports.
**Length:** ~2000 words.
**Use:** Foundation for the 5 strategic decisions below; input to M8 Architecture Brief.

---

## 1. Israeli POS / Cash-Register Software Market

The Israeli optical retail market is served by a fragmented POS ecosystem dominated by three camps: full-stack POS providers (Z Credit/Linet), card-processor-centric platforms (CardCom/Tranzila), and cloud-only invoicing systems (Heshev, Yahid). Z Credit and Linet each command ~30-40% of optical retailers; CardCom serves primarily online merchants and franchises; Heshev targets small accounting workflows; newer entrants (Pelecard, ICS) offer hybrid models combining card-processing with minimal inventory. None of the major players publish complete REST APIs—most require hardware integration via USB/Bluetooth/IP for POS terminals, with backend APIs available only under NDA or franchise agreements. Tranzila and Pelecard offer the most open API footprint (REST webhooks, tokenization), while Z Credit and Linet treat their APIs as white-label partnerships (direct B2B only, not public).

**Implication for Optic Up:** Day-1 integration should target Gama Pay (Israeli digital-payments processor with public REST API, no hardware tie-in) as the primary gateway, with a Provider Adapter Pattern that reserves integration slots for Z Credit and Linet. This avoids the vendor-lock of full-stack POS while respecting Prizma's existing relationship with Z/Linet. The architecture should not assume USB/Bluetooth hardware; instead, treat it as an optional *driver layer* that can be added per-tenant without modifying core payment logic.

---

## 2. International Payment Standards & PCI-DSS

Stripe's and Adyen's Provider Adapter Pattern treats payment providers as pluggable *backend handlers* with three invariants: (a) the core system never touches raw card data—all PAN/CVV/magstripe is tokenized server-side by the provider; (b) the provider returns an opaque transaction-ID and status-code; (c) the core system routes refunds/voids/partial-captures through the provider's status-machine, not a local state-machine. PCI-DSS Scope reduces dramatically when the system stores only transaction-IDs and timestamps: Optic Up would be out of scope for most PCI requirements if it never persists card numbers, expiry dates, or raw authorization codes. Tokenization is mandatory—never store "card ending in 4242" unless it came directly from the provider's tokenized response. Expiry handling differs between providers: some require explicit token-refresh before expiry; others silently fail on expired tokens and return a specific error-code that triggers a "re-tokenize" prompt.

**Implication for Optic Up:** Database design must enforce a strict separation: transactional data (who paid how much when) in local tables; provider-specific tokens and metadata in a *provider-state schema* that is treated as ephemeral and regenerable from the provider. Never store PAN, CVV, or full expiry date in Optic Up's DB. Accept provider tokens as-is and refresh only when the provider signals expiry via API error.

**Decision threshold:** Should Optic Up store even "card ending in 4242" for customer convenience (pre-fill on next payment), or rely entirely on provider-hosted tokenization UIs?

---

## 3. Israeli Tax Authority Requirements

Israel's 2024 חשבונית-מס-דיגיטלית reform requires all עוסק-מורשה (VAT-registered) businesses to issue digital invoices with automatic numbering, unique IDs, and 7-year archival. The תקנה 18א "Pre-Issuance Allocation Approval" applies to invoices exceeding ₪50,000 (or other thresholds per sector)—these require pre-approval from the tax authority before issuance. Prizma is currently עוסק-פטור (VAT-exempt), so it issues simplified receipts without pre-approval; Tenant #2 may be עוסק-מורשה and require full compliance. The distinction is critical: receipt (קבלה) is a proof-of-sale document; invoice (חשבונית-מס) is a tax document. VAT-exempt businesses issue receipts only; VAT-registered businesses issue tax invoices. Receipt numbering can be manual or auto; invoice numbering *must* be sequential and immutable. Both must include: date, payee ID, itemized amounts, payment method, and digital signature (for invoices).

**Implication for Optic Up:** Design the payment module assuming a future tenant will be עוסק-מורשה. The document-generation layer must support *conditional* invoice-numbering logic: if tenant is VAT-registered, allocate sequential invoice IDs with pre-approval checks; if VAT-exempt, issue receipts with optional auto-numbering. This is a tenant-config decision, not a code branch.

**Decision threshold:** Should Module 8 ship with Tax Authority API integration day-1, or stub it as a post-launch enhancement?

---

## 4. Complex Payment Patterns

Optical retail in Israel handles five overlapping patterns: (a) installments—credit-card splits over 3–24 months, often optimized for "credit utilization buckets" (each bank offers interest-free terms at specific thresholds); (b) post-dated checks (צ'קים דחויים)—customer writes checks dated 30/60/90 days forward, store holds them and deposits on maturity; (c) recurring billing (M13 Loyalty)—monthly club membership charges; (d) split payments—single receipt combining cash (50%) + credit-card (50%); (e) partial payment-plans—customer pays balance over time without a fixed installment structure. Refunds are distinct: full refund (entire transaction reversed), partial refund (adjustment to original amount), chargeback (customer disputes with bank), and void (same-day cancellation before capture). Post-dated checks require separate handling: the system must distinguish "cleared checks" (deposited, matched to bank statement) from "future checks" (held, not yet cleared) to calculate true cash-on-hand. Loyalty refunds interact with club-membership balances—a refund may trigger re-crediting of membership balance if the charge was subsidized.

**Implication for Optic Up:** The payment schema must support multiple *settlement patterns* (immediate capture, scheduled capture, partial-capture, installment-leg capture) without conflating them with a single "transaction status." Each pattern has different reconciliation implications. Post-dated checks are the highest complexity: they are liabilities (future outflows) until cleared, so cash-flow reporting must distinguish them from cash-in-hand. Installment plans tie payment data to customer credit history (risk management), so the system must track per-installment status, including any defaults.

**Decision threshold:** Does Optic Up track post-dated checks as a full settlement pattern (with clearing-date fields and bank-reconciliation workflows), or handle them as a memo-field for manual reconciliation?

---

## 5. Architecture Comparison — Provider Adapter Pattern

Stripe Connect and PayPal Marketplace are end-to-end platforms that handle provider-onboarding, fund-disbursement, and dispute-resolution. They are overkill for Optic Up. The canonical pattern for multi-provider systems is the *Adapter/Gateway Pattern*: (a) define a Provider Interface contract (authorize, capture, refund, void, partial-capture, get-status); (b) implement one concrete Adapter per provider (GamaPayAdapter, ZCreditAdapter, etc.); (c) route all payment logic through a *PaymentOrchestrator* that selects the adapter based on tenant-config and payment-method. The orchestrator owns business logic (installment-splitting, pre-approval checks, reconciliation); adapters own provider-specific concerns (token-refresh, error-mapping, webhook parsing). This separation ensures that refund logic (a business concern) lives once, while refund-API-calls (provider-specific) live once-per-adapter.

**Implication for Optic Up:** Adopt the Adapter Pattern. Define a canonical Provider Interface with ~8 methods. Each provider gets a concrete Adapter that translates between the interface and the provider's API. The PaymentOrchestrator lives in the core domain and never directly calls provider APIs. This makes adding a new provider a ~500-line addition.

**Decision threshold:** None — industry standard. Proceed.

---

## 6. Gama Pay + Z Credit + Linet — Specific Integration Detail

Gama Pay (גמא פיי) is an Israeli payment processor offering REST APIs for credit-card processing, e-wallet transfers, and point-of-sale integration. Public documentation is available; sandbox environment is straightforward. Gama's API is charge-centric (no separate authorize/capture workflow—it's immediate capture). Webhooks support transaction-status updates. Z Credit and Linet do not publish public APIs; both operate as white-label partnerships where interested vendors sign an NDA and gain access to XML/SOAP endpoints (circa 2010s technology). Z Credit's integration model is hardware-first: the POS terminal handles card-reading and encryption; the backend API is for transaction-settlement and reporting. Linet's model is similar but includes a cloud-based terminal UI (less hardware-dependent). Neither provides sandbox environments publicly; testing requires a franchise agreement. Tranzila offers the most open API suite (REST, webhooks, tokenization) and is a viable alternative if Z/Linet prove inaccessible. All three (Gama, Z, Linet) support ILS natively and can handle installment-leg routing.

**Implication for Optic Up:** Day-1 shipping should integrate Gama Pay via public REST API (achievable immediately). Z Credit and Linet integration should be designed as Adapter slots but deferred until Prizma (or Tenant #2) explicitly needs them and can authorize NDA access. Tranzila is a backup option if Z/Linet integration hits hard technical barriers.

**Decision threshold:** Should Module 8 day-1 ship with *only* Gama Pay, or should effort be spent upfront negotiating Z Credit / Linet NDA access for day-1 parallel integration?

---

## 7. Edge Cases

Network failures mid-transaction are the highest-risk edge case: the client initiates a payment, the network drops, the server received the charge-request but the response was lost. Idempotency keys solve this: the server returns the same response for duplicate requests with the same key, preventing double-charges. Duplicate-charge prevention must be enforced at the adapter level. Currency is today-only-ILS but should be parameterized for future tenants. Partial-capture is relevant if a prescription changes mid-fulfillment. Late void vs. refund depends on settlement-timing. Order-cancellation after partial payment is complex: if a customer paid ₪200 of a ₪500 sale and then cancels, was the ₪200 a deposit, a partial refund, or a failed transaction? The system must track intent (deposit vs. payment).

**Implication for Optic Up:** Idempotency is mandatory. Partial-capture and late-void logic should be embedded in the state-machine. Currency should be a parameterized field (defaulting to ILS). Tip should be a separate line-item.

---

## 8. Reports Optometrists Expect

End-of-day cashier reconciliation (סוף-יום-קופה) is the most frequent report: total in-register, per payment-type, per optometrist, per-health-fund. Health-fund tracking is critical because refunds are processed by fund. Outstanding installment aging is monthly. Post-dated checks pipeline: which checks are due this week, which next month. Per-optometrist takings are required for performance tracking and commission calculations. VAT-registered tenants require fund-flow reporting per invoice (not per payment-method) — a single sale may generate multiple invoices (one per health-fund subsidy tier), complicating aggregation.

**Implication for Optic Up:** The payment schema must support flexible grouping by optometrist, payment-method, health-fund, and date-range. These are *views* over transactional data. Post-dated checks are a separate *line* in reporting (not transactional until cleared). Installment-legs should be reportable separately.

---

## Top 5 Strategic Decision Points for Daniel

**1. Vendor scope day-1: Gama Pay only, or Gama + Z/Linet in parallel.**
Gama Pay has a public API and can integrate immediately. Z Credit / Linet require NDA negotiations and use older XML/SOAP protocols. Day-1 with only Gama means optometrists must change which terminal they swipe on; day-1 with Z/Linet means staying on existing hardware but extending the timeline by 4–8 weeks while we wait on NDAs. This is the highest-impact M8 decision.

**2. Post-dated checks: full settlement pattern or memo-field.**
Post-dated checks are 30/60/90-day-future cash. Tracking them as a real settlement type lets the system show accurate "cash-flow next month" reports and auto-deposit on clearing date. Tracking them as a memo field is faster to ship but means staff manually reconciles. Prizma has 1,160 active installment plans today, plus an unknown number of post-dated checks — the volume matters here.

**3. VAT-registration architecture: build for both or single-path.**
Prizma is עוסק-פטור (no VAT) today. Tenant #2 may well be עוסק-מורשה. Designing receipt-vs-tax-invoice as a tenant-config flag from day-1 costs ~5% extra complexity. Adding it after Tenant #2 onboards costs 5-10x. Litmus says: build for both.

**4. Card metadata: provider token only, or store "ending in 4242" too.**
Pure PCI-DSS minimization stores zero card data. Customer convenience ("pay with the same card as last time") needs at least the last-4. Most Israeli providers (Gama included) DO publish last-4 + brand from the token, so storing them costs nothing in PCI scope and gains a real UX win. Tradeoff seems clear.

**5. Installment optimization rules: hard-coded or table-driven.**
Israeli banks offer interest-free installments at thresholds (3 months free up to ₪5,000; 6 months up to ₪12,000). Rules change monthly. Hard-coded = fast ship, high maintenance. Table-driven = slightly longer ship, low maintenance. Iron Rule 19 (configuration over code) says table-driven. Tenant #2 unblocks faster.

---

*Saved 2026-05-08 by Architect per P14. Source: subagent dispatch, ~58 seconds.*
