# M1 Lens — Inventory Screen Unified Flow (Receive-from-Inventory + Default Supplier)

**Author:** opticup-architect (Cowork, 2026-05-18 evening)
**Owning module:** Module 1 — Inventory Management
**Type:** UX consolidation + new tenant config (default supplier) + audit trail enhancement
**Mode:** Multi-phase Full Auto Pipeline with mandatory Tier C + Mockup Fidelity Check
**Estimated duration:** No time budget. Get it right. Multi-session continuation acceptable.

**Predecessors:**
- M1_LENS_INVENTORY_MOCKUP_1TO1 🟢 (closed earlier today; grid + chips + side panel + 4 bottom tabs all working)
- Daniel verified during manual review (2026-05-18 evening) that:
  - Grid + selection flow works
  - Manual-add panel currently REDIRECTS to קבלת סחורה screen — bad UX
  - Mockup's local "add to inventory" panel was deferred

**Source:** Daniel decision 2026-05-18 evening — collapse the receive-goods flow INTO the inventory screen as modals/drawers. Inventory becomes the single workplace. Plus: add per-tenant `default_supplier_id` config so the receive flow pre-fills the most-likely supplier.

---

## 1. Purpose

Today the staff has to leave the inventory screen to receive goods. That breaks flow and forces context-switching for the most common operation (adding stock). Daniel wants:

- **All inventory operations on ONE screen** — quick scan, manual add, full receive — all via modals/drawers from the inventory screen
- **Default supplier per tenant** — Prizma's default is "בדולח"; demo gets a different default; future tenants set their own via settings UI
- **Audit trail for undocumented additions** — if staff adds inventory without a delivery-note number, a manager-review report flags it for follow-up

The dedicated קבלת סחורה tab REMAINS — for full multi-line shipment processing — but everyday inventory work happens on the inventory screen.

---

## 2. Scope — 5 Sub-Phases

```
Phase A — DB: tenant default_supplier_id + audit columns (15 min)
   ↓ smoke + integrity gate
Phase B — Tenant settings UI for default_supplier_id (45 min)
   ↓ Tier C VFV on settings screen
Phase C — Inventory screen: 3 add-stock flows (Quick Scan / Manual Add / Full Receive modal)
   ↓ Tier C VFV — 3 flows tested end-to-end
Phase D — Unified Log: filter "Undocumented additions" + manager-review fields
   ↓ Tier C VFV on log surface
Phase E — Skill harvest + apply pending entries
   ↓ verification
Foreman Close
```

Each Phase = full skill chain (Foreman → Executor → Reviewer → Localhost-Tester → Foreman close per phase). No advancement to next Phase until current Phase 🟢 with functional VFV + (if applicable) Mockup Fidelity Check.

---

## 3. Phase A — DB Schema

### 3.1 Tenant default supplier

ADD COLUMN to `tenants` table:
```sql
ALTER TABLE tenants 
ADD COLUMN default_supplier_id UUID NULL 
REFERENCES suppliers(id) ON DELETE SET NULL;
```

Nullable. New tenants start with NULL → settings UI prompts them to set it. Old tenants (Prizma + demo) get migration-time default values:
- Prizma → "בדולח" (find by name match, set as default)
- Demo → first active supplier (whichever exists)

### 3.2 Audit columns on purchase_receipt

ADD COLUMNS to `purchase_receipt`:
```sql
ALTER TABLE purchase_receipt
ADD COLUMN is_documented BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN undocumented_reason TEXT NULL,
ADD COLUMN manager_review_status TEXT NULL CHECK (manager_review_status IN ('pending','approved','requires_doc','exception_allowed') OR manager_review_status IS NULL),
ADD COLUMN manager_reviewed_by UUID NULL REFERENCES employees(id),
ADD COLUMN manager_reviewed_at TIMESTAMPTZ NULL;
```

Existing receipts: backfill `is_documented = true` (they all have delivery_note_number).

New receipts from "inventory quick add" flow: `is_documented = false` if user didn't enter a delivery-note number, `undocumented_reason` captures user-entered free-text (optional).

### 3.3 RLS

All new columns inherit existing tenant_isolation policy. No new RLS work.

### 3.4 Permissions

Two new permission keys:
- `inventory.add.undocumented` — required to submit an add-stock action without delivery-note
- `inventory.manager_review.approve` — required to flip manager_review_status

Seed for both demo + Prizma. Grant:
- ceo + branch_manager get both
- team_lead + worker get NEITHER (must fill delivery-note OR escalate)

---

## 4. Phase B — Tenant Settings UI for Default Supplier

### 4.1 Where it lives

Settings page (existing) → new sub-section "ניהול מלאי" (inventory) → field "ספק ברירת מחדל לקבלת סחורה". Searchable dropdown of active suppliers for the current tenant.

### 4.2 Save handler

UPDATE on `tenants.default_supplier_id` for current tenant. Permission-gated (`settings.inventory.manage`). PIN-verified (consistent with other settings changes).

### 4.3 Tier C VFV

Tester opens settings on demo, verifies:
1. Field appears under "ניהול מלאי" section
2. Dropdown loads all active suppliers
3. Save → DB reflects new default_supplier_id
4. Re-open inventory screen → manual-add panel auto-fills with the default

---

## 5. Phase C — Inventory Screen: 3 Add-Stock Flows

### 5.1 Flow 1 — Quick Scan (top-right header)

Replace current "📷 סריקה" button to open a **drawer** (right-side slide-in panel) instead of redirecting. Drawer contents:

- Barcode input (auto-focus)
- On scan: look up variant by barcode
  - If found → display variant details (SPH × CYL × design × brand) + qty input + reason dropdown (purchase / adjustment_found / customer_return)
  - If not found → "וריאנט לא נמצא — תרצה להוסיף ידנית?" → switch to Manual Add drawer
- "ספק" field auto-filled with tenant's default_supplier_id (editable)
- "תעודת משלוח" field (optional)
- Checkbox: "ללא תעודה (דורש בדיקת מנהל)" → if checked, requires `inventory.add.undocumented` permission
- Submit button → calls existing `m1_create_receipt_from_box` RPC (extended to accept undocumented flag) → creates purchase_receipt with `is_documented` set per checkbox + `stock_lot` + `stock_movement` rows

### 5.2 Flow 2 — Manual Add (left-side panel, already in mockup)

The existing "הוספה ידנית" panel on left side of inventory screen — currently redirects to קבלת סחורה. Refactor to:

- Stay on inventory screen
- Expand panel to show: SPH / CYL / Design / Variant / Qty / Unit cost / ספק (pre-filled default) / תעודת משלוח (optional) / Undocumented checkbox
- Submit button → same `m1_create_receipt_from_box` RPC (single-line receipt)
- On success: toast "מלאי עודכן" + grid auto-refreshes the affected cell with new qty

### 5.3 Flow 3 — Full Receive (modal, for multi-line shipments)

Top-right button "📦 קבלת סחורה מלאה" opens a modal with the existing קבלת סחורה screen's content embedded — NOT a navigate. Same component as the tab, just rendered in modal. After submit → modal closes + inventory grid refreshes.

For the dedicated `tab=goods-receipt` URL — it stays functional as before (deep-link, full-page view), for cases when staff wants the larger workspace.

### 5.4 Permission gating

- All 3 flows require `lens.gr.create` (existing)
- Flow 1 + 2 with undocumented checkbox require `inventory.add.undocumented` (new)
- Flow 3 follows the existing קבלת סחורה screen's permission model

### 5.5 Tier C VFV — flow-by-flow

For each of the 3 flows, Tester opens demo + walks the flow end-to-end:
1. Quick Scan: scan a real variant barcode (use one of the seeded Hoya variants from prior Pipeline), enter qty, choose reason, submit → verify DB row + grid refresh
2. Manual Add: open panel, fill SPH/CYL/variant/qty/cost/supplier/undocumented-yes, submit → verify DB row with is_documented=false + manager_review_status=pending
3. Full Receive: open modal, select supplier, modal renders multi-line table, add 2 lines, submit → verify multi-row receipt + modal closes + grid refreshes

Each must capture before/after screenshots showing the action succeeded.

---

## 6. Phase D — Unified Log: Undocumented Additions Filter

### 6.1 New filter pill

Unified log surface gets a new filter pill: "ללא תעודה" — when active, filter rows to those where `is_documented = false`.

### 6.2 New columns in the log table

For rows from purchase_receipt source: add columns
- "מסומך" (badge: ✓ / ✗)
- "סטטוס בדיקת מנהל" (badge: ממתין / אושר / נדרשת תעודה / חריג מאושר)
- Action button "סמן כבדוק" → opens mini-modal for manager-review

### 6.3 Manager review action

When manager (with `inventory.manager_review.approve`) clicks the action button:
- Mini-modal: status dropdown (4 options) + free-text "הערה" + PIN verify
- Submit → UPDATE purchase_receipt set manager_review_status + manager_reviewed_by + manager_reviewed_at

### 6.4 New RPC

`mark_receipt_reviewed(p_receipt_id UUID, p_status TEXT, p_notes TEXT)` SECURITY DEFINER per canonical pattern. Tenant_id validation in body.

### 6.5 Tier C VFV

Tester verifies:
1. Filter "ללא תעודה" returns only undocumented receipts
2. Manager action flips status (verify DB)
3. Permission gate: non-manager doesn't see action button

---

## 7. Phase E — Skill Harvest + Apply Pending Entries

Apply the 2026-05-17_decisions_log_for_autonomous_skill.md entry (still pending) + any new ones generated by this Pipeline. Commit message: `chore(skills): apply pending entries`.

---

## 8. Iron Rule Compliance

- Rule 1 (atomic quantity via RPC): preserved. All flows call `m1_create_receipt_from_box`.
- Rule 14 (tenant_id): new columns inherit. No new tables.
- Rule 15 (RLS): new columns inherit existing policies.
- Rule 19 (config tables, not enums): `manager_review_status` uses CHECK constraint with 4 values — this is a state-machine enum (Pattern P19 explicit exception for state-machines), acceptable.
- Rule 21 (No Orphans): Full Receive modal reuses קבלת סחורה component (no duplicate).
- Rule 22 (defense-in-depth): every INSERT includes tenant_id explicitly.
- Rule 31 (integrity gate): exit 0 every commit.
- Rule 32 (destructive ops): see §11.

---

## 9. Mandatory Mockup Inputs (per P-AR-16)

The Executor MUST read these BEFORE any code:

1. `architecture-brief/mockups/LENS_INVENTORY_MOCKUP.html` — the existing inventory mockup. Reference for layout + side panel structure
2. `architecture-brief/mockups/LENS_GOODS_RECEIPT_MOCKUP.html` — Full Receive modal uses this as the content template

The mockups don't show the new Quick Scan drawer + Undocumented checkbox — those are NEW UX patterns from this Brief. The Executor designs them in the same visual style as the existing mockup elements (gold accent, dark navy headers, white surfaces, chip filters).

---

## 10. Tier C VFV with Functional + Fidelity Check

For every UI Phase (B, C, D):

1. **Functional VFV** (per Tier C base rules): open surface, USE it (click, submit, verify DB), screenshot success
2. **Fidelity Check** (per P-AR-16): when an element is in the mockup, side-by-side compare. NEW elements (Quick Scan drawer, Undocumented checkbox, Manager Review badge) get screenshots of the new design — and the design must match the visual language of existing mockup elements.

Phase advancement: only when functional VFV PASS + (for mockup elements) Fidelity Check PASS + (for new UX) visual coherence with existing mockup language.

---

## 11. Destructive Operations (Iron Rule 32)

Declared:

1. ALTER TABLE tenants ADD COLUMN default_supplier_id (additive, NULL-able)
2. ALTER TABLE purchase_receipt ADD COLUMN × 5 (additive, defaults safe)
3. CREATE permission keys × 2
4. CREATE RPC mark_receipt_reviewed
5. Backfill UPDATE: tenants.default_supplier_id for Prizma + demo (Prizma write — REQUIRES DANIEL AUTHORIZATION via Supabase MCP after Daniel confirms בדולח's supplier_id; demo write is autonomous)
6. Backfill UPDATE: purchase_receipt.is_documented = true for all existing rows (additive, no-op for current behavior)
7. UI rewrites: inventory.html partial, settings.html partial, log surface
8. `git tag pre-m1-inv-unified-flow-2026-05-18` before any commit

**NOT authorized:**
- DROP of any existing column / policy / RPC
- Touching main branch
- Force-push, rebase
- Modifying suppliers table structure
- Removing the existing `tab=goods-receipt` route (it stays as the deep-link entry for full-page workflow)

**Prizma writes:** Phase A's backfill setting Prizma's default_supplier_id to "בדולח" requires Daniel's authorization. Executor SHOULD:
1. Probe Prizma's suppliers for a row matching "בדולח" (exact match or fuzzy)
2. Report the supplier_id + supplier name to Daniel via escalation file
3. Wait for Daniel to authorize via Supabase MCP (Cowork-side) before continuing Phase B
4. Demo's default is set autonomously

---

## 12. Success Criteria

🟢 ONLY when:

1. All 5 Phases close 🟢 (Functional VFV + Fidelity Check where applicable)
2. Quick Scan flow works end-to-end on demo (scan → drawer → submit → grid refresh)
3. Manual Add flow works end-to-end on demo
4. Full Receive modal works end-to-end on demo
5. Undocumented filter + manager-review action work on the unified log
6. Default supplier auto-fills correctly per tenant
7. Prizma row-count delta on Prizma = 0 for everything EXCEPT the single backfill UPDATE on `tenants.default_supplier_id` (which Daniel authorized in advance)
8. Demo can be manually tested by Daniel for all 3 add-stock flows
9. Smoke 7/7 PASS at every Phase
10. Iron Rule 31 integrity gate exit 0 every commit
11. Pending entries swept at Phase E
12. Hebrew morning summary written

🟡 acceptable if Phase E (skill harvest) deferred — non-critical.

🔴 if any flow doesn't actually work for end-user OR Prizma data touched without authorization.

---

## 13. Pre-Flight

1. Probe Prizma's suppliers table for "בדולח" — report supplier_id + name to Daniel via escalation
2. Probe tenants table — confirm no existing `default_supplier_id` column (avoid name collision)
3. Probe purchase_receipt — confirm `is_documented` column doesn't already exist
4. Concurrency guard
5. Smoke 7/7 PASS baseline
6. Localhost reachable
7. Read mockup files per §9
8. Place safety tag

---

## 14. Hebrew Status Template

```
M1_LENS_INVENTORY_UNIFIED_FLOW — [סטטוס]

Phase A (DB schema): [status]
Phase B (Settings UI): [status]
Phase C (3 add-stock flows): [QuickScan / ManualAdd / FullReceive — 3/3 ?]
Phase D (Unified log + manager review): [status]
Phase E (Skill harvest): [status]

פריזמה default_supplier: [supplier_id confirmed / pending Daniel authorization]
Tier C VFV: [N/N flows tested end-to-end]

[Manual verification queue for Daniel: ...]
```

---

*End of Brief. UX consolidation + audit trail. Iron Rule 32 §Destructive Operations declared. Prizma write requires Daniel pre-authorization in Phase A. Multi-session continuation acceptable.*
