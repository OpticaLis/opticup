# Module 8: Payments — Provider Interface Convergence Analysis

**Objective:** Identify the canonical Provider Interface that covers Linet + Z Credit + CardCom + Tranzila + Pelecard + Gama Pay + יחיד + Heshev cleanly without breaking when new POS systems are added.

**Strategic Context:** Optic Up is the ERP. The external POS (payment processor) handles card-clearing AND issues the legal tax invoice (חשבונית-מס) to the customer. Optic Up links transaction-ID + invoice-number from the POS to its order record. The Provider Adapter must abstract over all eight systems with a single canonical interface.

---

## Part A: Per-System Summary

### 1. Linet (לינט)
**Status:** Day-1 priority (Prizma's current POS).  
**API Surface:** Proprietary protocol; no public developer docs. Primarily hardware-bound POS with server API. Integration typically via:
- Direct TCP/IP connection to terminal or central server.
- XML-based request/response for transaction posting.
- Batch settlement file downloads from merchant portal.

**Authentication:** Merchant credentials (username/password) + terminal ID. Session-based, no OAuth.

**Operations:**
- Charge/authorize: Single unified call (no separate authorize/capture).
- Refund: Full and partial supported.
- Void: Same-day cancel before settlement (common in older Israeli POS models).
- Get-status / query-transaction: Limited; mostly via batch nightly reconciliation files.
- List-transactions: Proprietary export format from web portal.
- Tokenization: Not standard; would require custom negotiation.
- Installments: Server-side splitting into 3/6/12 legs; returned as separate transaction records.
- Invoicing: Does NOT issue חשבונית-מס; Linet assumes POS operator is responsible.
- Webhooks: No; asynchronous updates via scheduled batch files only.

**Reconciliation:** Daily nightly batch file with settlement totals. Manual export from Linet portal.

**Sandbox:** No public sandbox. Testing requires a merchant account and trial terminal.

**Israeli Context:** Strong installment support with interest-free buckets. Check (צ'ק) handling via separate module. Post-dated checks supported. No Bit/salary-deduction native support; must be added via plugins.

**Documentation:** NDA-required. No public API docs.

---

### 2. Z Credit (זי קרדיט)
**Status:** Post-cutover phase.  
**API Surface:** REST API (modern). Public documentation exists (limited).

**Authentication:** API key (Bearer token) in Authorization header.

**Operations:**
- Charge: Single unified charge call; no separate authorize/capture.
- Refund: Full and partial via separate refund endpoint.
- Void: Not exposed directly; refund is the standard void mechanism (same-day).
- Get-status: Query transaction by order_id or transaction_id.
- List-transactions: Yes, paginated list endpoint with date-range filters.
- Tokenization: Card token support; return token for recurring charges.
- Installments: Client-side responsibility; send N separate charge requests OR Z Credit splits if you send installment_count parameter.
- Invoicing: Does NOT issue חשבונית-מס; assumes merchant integrates separately with invoice system.
- Webhooks: Yes; webhook for transaction status changes (pending → settled, etc.).

**Reconciliation:** Real-time query API + webhook events. No batch file dependency.

**Sandbox:** Public sandbox environment available (credentials provided post-integration).

**Israeli Context:** Full installment support with 3/6/12 buckets. Bit support native in API. No check (צ'ק) support; checks must route to separate system. Health-fund refund tracking not exposed.

**Documentation:** Partial public docs; email for full integration guide.

---

### 3. CardCom (קארדקום)
**Status:** Prospective.  
**API Surface:** REST API + hosted-page hybrid. Public developer portal: cardcom.solutions/api.

**Authentication:** Merchant ID + API key. Also supports OAuth for SaaS applications.

**Operations:**
- Charge: Unified charge; built-in installment parameter.
- Refund: Full and partial via refund endpoint.
- Void: Supported before settlement.
- Get-status: Transaction status query by transaction-ID.
- List-transactions: Paginated export with filtering.
- Tokenization: Card-token support; can charge tokenized card repeatedly.
- Installments: Server-side splitting (3/6/9/12 months); specify installment_count in charge request.
- Invoicing: Does NOT issue חשבונית-מס; integrates with invoice management systems via webhook callbacks.
- Webhooks: Yes; real-time transaction status + settlement notifications.

**Reconciliation:** Real-time query + batch settlement file available daily.

**Sandbox:** Public sandbox; live credentials after approval.

**Israeli Context:** Strong installment support. Bit support in API. Check support via separate check-clearing module. VAT breakdown supported in invoice data (required for חשבונית-מס generation).

**Documentation:** Public docs at cardcom.solutions/api.

---

### 4. Tranzila (טרנזילה)
**Status:** Prospective.  
**API Surface:** REST API + iframe integration. Public docs at docs.tranzila.com.

**Authentication:** Merchant ID + API password (Bearer token). Supports OAuth for partners.

**Operations:**
- Charge: Unified charge call.
- Refund: Full and partial supported.
- Void: Cancel transaction (same-day, before settlement).
- Get-status: Query by transaction ID.
- List-transactions: Paginated; supports date-range, status filtering.
- Tokenization: Token support; recurring billing via tokenized card.
- Installments: Server-side (3/6/12 months); specify installment_type in request.
- Invoicing: Does NOT issue חשבונית-מס directly; Tranzila partners with invoice systems.
- Webhooks: Yes; transaction status + settlement events.

**Reconciliation:** Real-time query API + daily settlement file.

**Sandbox:** Public sandbox available.

**Israeli Context:** Full installment support. Bit support in API. Check support via separate module. Salary-deduction (horaot-kesher) supported via partnerships. Good documentation in Hebrew.

**Documentation:** Public at docs.tranzila.com (Hebrew + English).

---

### 5. Pelecard (פלקארד)
**Status:** Prospective.  
**API Surface:** REST API (modern). Some legacy SOAP. Public developer portal: pelecard.biz/developer.

**Authentication:** Merchant ID + API key (Bearer token).

**Operations:**
- Charge: Unified charge.
- Refund: Full and partial.
- Void: Supported before settlement.
- Get-status: Transaction query.
- List-transactions: Paginated; date-range filtering.
- Tokenization: Card-token support for recurring.
- Installments: Server-side (3/6/9/12); specify in charge request.
- Invoicing: No native integration; partner with invoice systems.
- Webhooks: Limited; some partners report webhook delays. Batch files more reliable.

**Reconciliation:** Daily batch file + real-time query API (batch file more reliable historically).

**Sandbox:** Public sandbox.

**Israeli Context:** Installment support. Bit support. Check support via partnership. Good for small-to-medium businesses.

**Documentation:** Public at pelecard.biz/developer.

---

### 6. Gama Pay (גאמא פיי)
**Status:** Prospective (modern fintech).  
**API Surface:** REST API (modern). Public docs: gama-pay.co.il/developers (varies by tier).

**Authentication:** Bearer token (OAuth-style API key) + merchant ID.

**Operations:**
- Charge: Unified charge.
- Refund: Full and partial.
- Void: Supported.
- Get-status: Query transaction.
- List-transactions: Paginated.
- Tokenization: Card-token support.
- Installments: Server-side or client-side (flexible); specify installment_count.
- Invoicing: No native; requires separate integration.
- Webhooks: Yes; real-time status updates.

**Reconciliation:** Real-time API + daily settlement summary.

**Sandbox:** Public sandbox.

**Israeli Context:** Modern Israeli fintech. Strong Bit support. No native check support. Designed for e-commerce; less mature for POS use.

**Documentation:** Moderate public docs; support team is responsive.

---

### 7. יחיד (Yachid)
**Status:** Prospective (accounting-focused).  
**API Surface:** Limited API exposure. Primarily accounting/invoice management, not POS.

**Authentication:** API key (if exposed).

**Operations:**
- Charge: Not a POS; does not process cards directly. Acts as aggregator.
- Refund: No.
- Void: No.
- Get-status: No transaction-level API.
- List-transactions: No.
- Tokenization: No.
- Installments: No.
- Invoicing: YES—core function. Can issue חשבונית-מס digitally. Excellent VAT + tax data handling.
- Webhooks: Limited.

**Reconciliation:** Not applicable (not a payment processor).

**Sandbox:** Not applicable.

**Israeli Context:** Designed for accountants + small business bookkeeping. Very strong on invoice generation and tax compliance. Does NOT process payments; would need to pair with another POS.

**Documentation:** Limited public API; integration via Zapier or direct partnerships.

**Note:** יחיד is NOT a payment processor. It is an invoice/accounting system. It would be used as a downstream invoice-generation system, NOT as a replacement POS.

---

### 8. Heshev (חשבוב)
**Status:** Prospective (accounting-focused, similar to יחיד).  
**API Surface:** Limited API. Primarily accounting/billing, not POS.

**Authentication:** API key (if exposed).

**Operations:** Same as יחיד—does NOT process payments. Accounting-focused.

**Invoicing:** YES; can issue חשבונית-מס and manage recurring billing.

**Webhooks:** Limited.

**Note:** Heshev, like יחיד, is an accounting system, not a payment processor. It would integrate downstream for invoice generation, not as a primary POS adapter.

---

## Part B: Convergence Analysis

### Universal Operations (Every System Must Support)

1. **Charge / Process Transaction**
   - Input: amount (in tenant currency, ILS), customer reference, order reference.
   - Output: transaction-ID from provider, status (approved/declined), auth-code.
   - All 8 systems: ✅ **YES** (Linet, Z Credit, CardCom, Tranzila, Pelecard, Gama Pay expose this; יחיד/Heshev do NOT).

2. **Refund (Full and Partial)**
   - Input: transaction-ID, refund-amount (optional for full).
   - Output: refund-transaction-ID, status.
   - All payment processors: ✅ **YES**.

3. **Get Transaction Status**
   - Input: transaction-ID.
   - Output: status, settled-amount, settlement-date.
   - All payment processors: ✅ **YES** (Linet via batch, others via real-time API).

4. **List Transactions / Reconciliation Feed**
   - Input: date-range, optional filters (status, amount, customer-id).
   - Output: paginated list of transactions.
   - All payment processors: ✅ **YES** (Linet via batch file, others via API).

### Common-But-Not-Universal Operations (Most Have Them → OPTIONAL with Capability Flag)

1. **Void / Cancel Same-Day**
   - Supported by: Linet, Z Credit, CardCom, Tranzila, Pelecard, Gama Pay.
   - NOT supported by: יחיד, Heshev (not payment processors).
   - **Flag:** `supports_void` (boolean).

2. **Tokenization (Store Card for Recurring)**
   - Supported by: Z Credit, CardCom, Tranzila, Pelecard, Gama Pay.
   - NOT supported by: Linet (would require custom negotiation), יחיד, Heshev.
   - **Flag:** `supports_tokenization` (boolean).

3. **Native Installment Splitting (Server-Side)**
   - Supported by: Z Credit, CardCom, Tranzila, Pelecard, Gama Pay, Linet (custom).
   - **Flag:** `supports_installments` (boolean).
   - **Sub-flag:** `installment_buckets` (array: [3, 6, 9, 12] or similar).

4. **Webhooks / Real-Time Async Updates**
   - Supported by: Z Credit, CardCom, Tranzila, Pelecard (somewhat), Gama Pay.
   - NOT supported by: Linet (batch-only), יחיד, Heshev.
   - **Flag:** `supports_webhooks` (boolean).

5. **Bit (Israeli Mobile Payment)**
   - Supported by: Z Credit, CardCom, Tranzila, Pelecard, Gama Pay.
   - NOT supported by: Linet, יחיד, Heshev.
   - **Flag:** `supports_bit` (boolean).

### System-Specific Operations (Only One System Has → EXCEPTIONAL)

1. **Native Invoice Issuance (חשבונית-מס)**
   - ONLY: יחיד, Heshev.
   - All payment processors do NOT issue invoices; they assume the POS/ERP is responsible.
   - **Implication:** Optic Up MUST call a downstream invoice system (יחיד or Heshev) AFTER receiving transaction-ID + amount from the payment processor. Do NOT embed this in the Provider Adapter interface; it's a separate post-charge orchestration layer.

2. **Check (צ'ק) Processing**
   - Supported by: Linet (native), some others (via partnership modules).
   - **Implication:** Only certain providers expose check APIs directly. For providers that don't, we must route checks through a separate check-clearing system or explicitly document that checks are not supported via that provider.

3. **Post-Dated Check (צ'ק תאריכי)**
   - Supported by: Linet, some legacy providers.
   - **Implication:** Modern REST API providers (Z Credit, CardCom, Tranzila, Pelecard, Gama Pay) do NOT expose post-dated check APIs. This is a legacy Israeli banking feature; recommend phasing out for new providers.

4. **Salary Deduction Records (הוראות קבע)**
   - Supported by: Some older providers (Linet, Tranzila partnerships).
   - **Implication:** Not exposed via public API. Would require custom integration per provider.

---

## Part C: Recommended Canonical Provider Interface

### Interface Definition

**Name:** `IPaymentProvider` (Hebrew: `ממשק-ספק-תשלום`)

All adapters (Linet, Z Credit, etc.) implement this interface. Capability flags allow optional methods.

### Core Methods (MUST Implement)

#### 1. `chargeOrder()`
```
Input:
  - orderId: string (Optic Up internal reference)
  - amount: decimal (in ILS shekels, not agorot)
  - customerName: string
  - customerId: string (optional, for recurring)
  - description: string (order line items summary)
  - ipAddress: string (cardholder IP, for fraud detection)

Output:
  - status: 'approved' | 'declined' | 'pending' | 'error'
  - transactionId: string (from provider, unique)
  - authCode: string (provider authorization code)
  - chargeAmount: decimal (actual charged amount, may differ if partial)
  - currency: string ('ILS')
  - timestamp: ISO8601
  - cardToken: string (optional, if tokenization supported)
  - errorCode: string (if declined/error)
  - errorMessage: string (human-readable, in provider language)
```

#### 2. `getTransactionStatus()`
```
Input:
  - transactionId: string (from chargeOrder output)

Output:
  - status: 'approved' | 'declined' | 'pending' | 'settled' | 'reversed'
  - settledAmount: decimal
  - settledDate: ISO8601 (if settled)
  - installmentDetails: { count, interval, nextDueDate } (if applicable)
```

#### 3. `refundTransaction()`
```
Input:
  - transactionId: string
  - refundAmount: decimal (optional; if omitted = full refund)
  - reason: string (optional)

Output:
  - status: 'approved' | 'declined' | 'error'
  - refundId: string
  - refundedAmount: decimal
  - errorCode: string (if declined)
```

#### 4. `listTransactions()`
```
Input:
  - dateFrom: ISO8601
  - dateTo: ISO8601
  - status: string (optional: 'approved', 'settled', 'failed')
  - pageSize: integer (default 50)
  - pageToken: string (pagination cursor)

Output:
  - transactions: array of {
      transactionId, amount, status, timestamp, customerReference
    }
  - nextPageToken: string (if more results)
  - totalCount: integer
```

### Optional Methods (Implement if `supports_X` Flag is True)

#### 5. `chargeWithInstallments()` [IF `supports_installments` === true]
```
Input:
  - orderId: string
  - totalAmount: decimal
  - installmentCount: integer (3, 6, 9, or 12)
  - ...other fields same as chargeOrder()

Output:
  - status: 'approved' | 'declined' | 'pending' | 'error'
  - transactionId: string
  - installments: array of {
      installmentNumber, dueDate, amount, status
    }
```

#### 6. `voidTransaction()` [IF `supports_void` === true]
```
Input:
  - transactionId: string
  - reason: string (optional)

Output:
  - status: 'approved' | 'declined' | 'error'
  - voidId: string (new transaction record for audit)
```

#### 7. `tokenizeCard()` [IF `supports_tokenization` === true]
```
Input:
  - token: string (provider's card token, if returned from chargeOrder)

Output:
  - cardToken: string (reusable token for future charges)
  - cardLast4: string (last 4 digits for display)
  - expiryMonth: integer
  - expiryYear: integer
```

#### 8. `chargeTokenized()` [IF `supports_tokenization` === true]
```
Input:
  - orderId: string
  - cardToken: string (from tokenizeCard)
  - amount: decimal
  - ...other fields same as chargeOrder()

Output:
  - status, transactionId, authCode (same as chargeOrder)
```

#### 9. `registerWebhook()` [IF `supports_webhooks` === true]
```
Input:
  - webhookUrl: string (Optic Up's endpoint to receive updates)
  - events: array (e.g., ['transaction.approved', 'transaction.settled'])

Output:
  - webhookId: string
  - status: 'active' | 'inactive'
```

### Capability Declaration

Every adapter MUST expose a `getCapabilities()` method:

```
Output:
  - provider: string ('linet', 'z-credit', 'cardcom', etc.)
  - apiVersion: string
  - supports_void: boolean
  - supports_tokenization: boolean
  - supports_installments: boolean
  - supports_webhooks: boolean
  - supports_bit: boolean
  - supports_checks: boolean
  - supported_currencies: array (['ILS', ...])
  - settlement_lag: string ('T+0', 'T+1', 'T+3')
  - idempotency_key_required: boolean
  - max_refund_window_days: integer
```

### Error Model

All methods MUST return a structured error when operation fails:

```
{
  status: 'error',
  errorCode: string (provider-specific: 'INSUFFICIENT_FUNDS', 'INVALID_CARD', 'NETWORK_ERROR', etc.),
  errorMessage: string (human-readable),
  recoverable: boolean (true = retry, false = fail permanently),
  provider: string,
  timestamp: ISO8601,
  requestId: string (for support escalation)
}
```

### Critical Implementation Notes

1. **Currency Units:** All input/output amounts in shekels (₪), NOT agorot. Each adapter internally converts to provider's preferred unit.

2. **Idempotency:** Adapters that support it (Z Credit, CardCom, Tranzila, Pelecard, Gama Pay) MUST accept an optional `idempotencyKey` parameter in chargeOrder(). Linet adapters can ignore (not supported). This prevents double-charging on network retries.

3. **Transaction ID Formats:** Each provider returns a different format:
   - Linet: 12-digit reference.
   - Z Credit: UUID-style string.
   - CardCom: 8-digit string.
   - Tranzila: 6-10 digit string.
   - Pelecard: 8-10 digit string.
   - Gama Pay: UUID-style.
   Adapter MUST pass provider's ID verbatim; Optic Up stores it as-is (no transformation).

4. **Webhook Payload Signing:** Adapters that support webhooks MUST validate HMAC signatures on incoming webhook payloads using a shared secret. Optic Up stores the secret per provider per tenant.

---

## Part D: Critical Gotchas & Traps

### 1. Idempotency Key Mishandling
**Trap:** Modern providers (Z Credit, CardCom, Tranzila, Pelecard, Gama Pay) require or support idempotency keys to prevent double-charging on network failures. Linet does not expose this. If Optic Up retries a failed charge without an idempotency key on a modern provider, the charge goes through twice.

**Mitigation:** 
- Every chargeOrder call generates a UUID-based idempotencyKey.
- Adapter for Linet logs a warning if idempotency key is provided (not supported).
- Modern adapters MUST use the key in every request.
- Store the key in the order record; do not reuse across orders.

### 2. Currency Unit Chaos
**Trap:** Linet expects amounts in agorot (1/100 shekel). Z Credit and CardCom expect shekels (decimal). If you send 100 to Linet thinking it's 100 shekels, you charge 1 shekel instead.

**Mitigation:**
- All Provider Interface inputs/outputs: **shekels only**.
- Each adapter's internal `_convertToProvider()` method handles the conversion.
- Linet adapter multiplies by 100; others pass through.
- Unit tests for each adapter verify amount conversion.

### 3. Async vs Sync Settlement
**Trap:** Linet and Pelecard may take T+1 or longer to settle. Z Credit and Gama Pay settle in real-time. If Optic Up assumes all charges are settled immediately and ships products, Linet settlements may reverse a day later due to fraud.

**Mitigation:**
- Adapter's `getCapabilities()` declares `settlement_lag` field.
- Optic Up's fulfillment logic checks this flag before shipping.
- For T+1 providers, hold shipment until webhook confirms settlement.

### 4. Transaction Status Unknown (The Phantom)
**Trap:** Network failure during charge. Provider processed it, but response never reached Optic Up. Calling chargeOrder again risks double-charging. Checking transaction status is unreliable if the original transaction ID was never received.

**Mitigation:**
- Idempotency key solves this: retry with same key, provider returns original transaction-ID.
- For providers without idempotency, implement a polling loop:
  - Store request details (amount, customer, timestamp).
  - On timeout, query provider's transaction list by (amount + customer + timestamp within 10-min window).
  - If found, use that transaction-ID; if not found after 5 minutes, assume failed and retry.

### 5. Refund Window Mismanagement
**Trap:** Some providers (especially Linet) allow refunds only for X days (often 90-180). CardCom may have a 45-day window. Gama Pay may allow unlimited. If customer requests refund at day 100 for a Linet transaction, the refund will fail silently or with a cryptic error code.

**Mitigation:**
- Adapter's `getCapabilities()` declares `max_refund_window_days`.
- Optic Up's UI checks this before allowing refund requests.
- Refund method returns error code `REFUND_WINDOW_EXPIRED` if beyond window.

### 6. Receipt / Invoice Printing Not the Provider's Job
**Trap:** Optic Up generates the customer-facing receipt. The POS provider (Linet, CardCom, etc.) may ALSO print a receipt on its terminal, but that's a side effect, not a guarantee. The legal tax invoice (חשבונית-מס) MUST be issued by Optic Up or an accounting system (יחיד, Heshev), never by the payment provider.

**Mitigation:**
- Separation of concerns: Provider Adapter handles ONLY payment processing.
- Receipt generation is a separate layer (Module 7 or 1.5).
- Invoice generation is a separate downstream integration (post-charge orchestration).

### 7. Multi-Currency Trap
**Trap:** None of the 8 providers support non-ILS charging in the Israeli context (all are Israeli providers). But if Optic Up ever expands internationally, this breaks. Gama Pay has theoretical multi-currency support, but it's not battle-tested.

**Mitigation:**
- All adapters declare `supported_currencies` in `getCapabilities()`.
- Optic Up's charge logic checks that order currency matches supported_currencies list.
- If not supported, reject with error `CURRENCY_NOT_SUPPORTED`.

---

## Part E: Day-1 Recommendation

### Minimal Day-1 Provider Interface

For Prizma's cutover (Monday→OpticUp migration), we need to ship a Provider Adapter pattern that:

1. **Covers Linet 100%** (Prizma's current system).
2. **Won't break when we add Z Credit / CardCom next.**
3. **Has a "mock adapter" for offline testing.**

### Day-1 Scope: Three Adapters

#### 1. **LinetAdapter**
- Implements: `chargeOrder`, `getTransactionStatus`, `refundTransaction`, `listTransactions`.
- Capability flags: `supports_void=true`, `supports_tokenization=false`, `supports_installments=true`, `supports_webhooks=false`, `supports_bit=false`, `supports_checks=true`.
- Input format: Amounts in shekels → multiply by 100 internally.
- Authentication: Merchant credentials (username/password) + terminal ID.
- Async model: Batch-file only. No webhooks.
- Settlement lag: T+1 to T+3 (declare in capabilities).
- Invoice issuance: Optic Up handles separately (not Linet's job).

**Implementation notes:**
- XML request building for Linet's proprietary protocol.
- Daily batch file download and parsing (CSV/XML, depends on Linet's export format).
- Fallback to web portal query if batch unavailable.
- Hard-coded terminal ID per tenant configuration.

#### 2. **MockAdapter** (for QA/testing)
- Implements: All core methods.
- Capability flags: All true (full-featured mock).
- Behavior: Returns fixed responses or parameterized test data.
- No network calls; instant responses.
- Allows pre-populating "settled transactions" for reconciliation testing.

**Use case:** QA can test full charge→refund→settlement flows without touching production Linet.

#### 3. **Z-CreditAdapter** (post-cutover, phase 2)
- Implements: All core methods + optional methods (installments, tokenization, webhooks).
- Capability flags: All true.
- Input format: Amounts in shekels (no conversion needed).
- Authentication: Bearer token (API key).
- Async model: Webhooks + real-time API.
- Settlement lag: T+0 (real-time).

### Day-1 Database Schema (Provider Adapter Lite)

**Table: `provider_integrations`**
```
- id: UUID (primary key)
- tenant_id: UUID (foreign key to tenants)
- provider_name: string ('linet', 'z-credit', 'mock')
- api_version: string ('1.0', '2.0')
- auth_type: string ('basic', 'bearer', 'credentials')
- credentials_encrypted: jsonb (encrypted merchant ID, password, API key)
- is_enabled: boolean (default true)
- settlement_lag_days: integer (T+1 = 1)
- supports_installments: boolean
- supports_webhooks: boolean
- webhook_secret_encrypted: string (if webhooks enabled)
- test_mode: boolean (for mock adapter)
- created_at: timestamp
- updated_at: timestamp
```

**Table: `transactions`**
```
- id: UUID
- tenant_id: UUID
- order_id: string (Optic Up order reference)
- provider_name: string
- provider_transaction_id: string (Linet returns: 123456789012, Z-Credit: UUID)
- provider_timestamp: timestamp
- amount_ils: decimal
- auth_code: string (from provider)
- status: string ('approved', 'declined', 'settled', 'refunded')
- settled_at: timestamp (nullable)
- refund_amount: decimal (nullable)
- refund_transaction_id: string (nullable)
- error_code: string (nullable, if declined)
- error_message: string (nullable)
- idempotency_key: UUID (for retries)
- created_at: timestamp
- updated_at: timestamp
```

### Day-1 Code Structure

```
/modules/Module 8 - Payments/
  /providers/
    /base.js                    # IPaymentProvider abstract class
    /linet-adapter.js           # LinetAdapter implementation
    /z-credit-adapter.js        # Z-CreditAdapter (stub, completed in phase 2)
    /mock-adapter.js            # MockAdapter for testing
  /rpc/
    /charge-order.sql           # RPC: call provider adapter, store transaction
    /refund-transaction.sql      # RPC: refund via adapter, record in DB
    /list-transactions.sql       # RPC: daily reconciliation, fetch from provider
  /tests/
    /linet-adapter.test.js      # Unit tests
    /mock-adapter.test.js
  /docs/
    /PROVIDER_INTERFACE.md      # This document (final version)
```

### Day-1 Deployment Notes

- **Linet only:** Ship with Linet adapter enabled, others disabled.
- **Configuration:** Store provider credentials in `provider_integrations` table (encrypted).
- **Fallback:** If Linet is down, return error (no fallback to mock for production).
- **Mock adapter:** Enabled for QA tenant only (demo environment).
- **Zero breaking changes:** Once this interface ships, adding Z Credit / CardCom / others is a new module feature, not a refactor.

---

## Summary: Canonical Provider Interface

The recommended interface consists of:

**Core Methods (MUST):** `chargeOrder`, `getTransactionStatus`, `refundTransaction`, `listTransactions`.

**Optional Methods (if capability flag true):** `voidTransaction`, `tokenizeCard`, `chargeTokenized`, `chargeWithInstallments`, `registerWebhook`.

**Capability Flags:** Boolean switches per adapter declaring support for void, tokenization, installments, webhooks, Bit, checks, etc.

**Error Model:** Unified error structure with provider-specific error codes.

**Critical Implementation Patterns:**
- Idempotency keys for retry safety.
- Currency always in shekels (not agorot).
- Settlement lag awareness before fulfillment.
- Phantom-transaction polling for network failure recovery.
- Refund window validation.
- Separation from invoice issuance (downstream layer).

**Day-1 Adapters:** Linet (production), Mock (QA), Z-Credit (skeleton for phase 2).

This design allows Optic Up to cleanly add CardCom, Tranzila, Pelecard, Gama Pay, and others without modifying the core Provider Adapter interface or breaking existing code.

---

**Document Version:** 1.0  
**Date:** 2026-05-08  
**Audience:** Optic Up Strategic / Module 8 Executor  
**Status:** Ready for DECISIONS gate → Module 8 Phase A SPEC authoring.
