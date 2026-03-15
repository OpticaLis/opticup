# Optic Up — Phase QA: Module 1 Final Certification (v2)

> **Phase QA — Zero features. Testing only.**
> **Dependencies:** All Module 1 phases complete (0 → 5.9 + post-5.9)
> **Current state:** 82 JS files, ~19,500 lines, 45 DB tables, 5 HTML pages,
> 5 RPC functions, 2 Edge Functions, 1 pg_cron job, 1 Storage bucket

---

## What Changed from v1

v1 was written before Phase 5.9. This v2 adds:
- **Shipments testing:** 40+ tests for shipments.html (wizard, lock, config, manifest, return integration)
- **Returns flow:** Full lifecycle testing (staged → shipped → credit_received → done)
- **Mobile section expanded:** From 6 lines to 60+ dedicated tests across all devices
- **UX/UI methodology upgraded:** Professional audit with scoring (1-10), 3 positives + 3 improvements per page
- **New flows:** Flow H (framing shipment), Flow I (return box with auto-status)
- **New edge cases:** 10 additional (box timing, config, manifest, mobile-specific)
- **Updated numbers:** 82 files, 45 tables, 5 pages, 9 flows, 16 execution steps

---

## Test Categories (15)

```
QA-1   Functional Testing        — every feature on every page
QA-2   Flow Testing              — 9 end-to-end business flows
QA-3   Edge Cases & Boundaries   — 35 boundary tests
QA-4   Security Testing          — JWT, XSS, RLS, brute force
QA-5   Performance Testing       — 20 benchmarks
QA-6   Visual & UX Audit         — professional review with scoring
QA-7   Cross-Browser Testing     — Chrome, Firefox, Safari, Edge
QA-8   Mobile & Responsive       — iOS, Android, tablet — every screen
QA-9   RTL & Hebrew Testing      — layout, text, dates, exports
QA-10  Data Integrity            — 17 consistency checks
QA-11  Error Handling            — 12 failure scenarios
QA-12  Permissions Testing       — 5 roles × 17 actions
QA-13  Multi-Tenancy Testing     — 11 isolation tests
QA-14  Accessibility             — 10 checks
QA-15  Documentation Audit       — 10 files verified
```

---

## QA-1: Functional Testing

### 3.1 Home Screen (index.html) — 12 tests
PIN login, lockout, session restore, logout, all module cards (inventory, debt, shipments), inactive cards, header, back navigation.

### 3.2 Inventory (inventory.html) — 27 tests
Main table (13): load, search, sort, filters, inline edit, selection, bulk ops, image, history.
Add inventory (7): manual, cascading, barcode gen, duplicate, validation, Excel/CSV, history.
Remove (5): decrease, increase, zero, negative, Excel reduction.
Soft delete (4): delete, recycle, restore, permanent.
Returns tab (7): initiate, types, qty removed, return number, staged status, bulk sendToBox, help banner.

### 3.3 Purchase Orders — 10 tests
List, create wizard, PO number, items, edit draft, send, cancel, PDF, Excel, low stock.

### 3.4 Goods Receipts — 13 tests
New receipt, PO link, existing/new items, mandatory barcode, confirm, cost_price, PO price comparison, file attachment, no-file warning, prepaid deduction, info button, discrepancy.

### 3.5 Stock Counting — 5 tests
New count, scan, discrepancy report, confirm, Excel export.

### 3.6 Brands & Suppliers — 8 tests
Brands table/filters/toggle, supplier list/add/number/settings.

### 3.7 Access Sync — 10 tests
Heartbeat, CSV import, XLSX import, pending panel, detail modal, inline resolve, handled status, reverse sync, export log, manual import.

### 3.8 Supplier Debt (suppliers-debt.html) — 24 tests
Dashboard (3): cards, aging, currency conversion.
Documents (8): list, create, view, attach, link notes, validation, cancel, advanced filters.
Payments (7): wizard steps, FIFO, manual, partial, full, overpayment, withholding, rollback.
Prepaid (4): create, checks, auto-deduction, threshold alert.
Supplier detail (3): panel, timeline, sub-tabs.
Returns in debt (4): list, filter, credit flow, partial credit.

### 3.9 AI Agent — 23 tests
OCR (12): scan, process, review, confidence, edit, learning, template, matching, errors.
Batch (5): upload, dedup, OCR, pipeline, historical.
Alerts (9): bell, dropdown, due/overdue/prepaid/anomaly/duplicate, actions, auto-dismiss, return credit alert.
Weekly report (4): screen, navigation, PDF, stats.

### 3.10 Shipments (shipments.html) — 44 tests
Box list (7): load, filters (type/supplier/courier/date), sort, status indicators.
Wizard (12): 4 types × step 1/2/3, add items per type, staged picker, accordion, courier, confirm.
JSONB config (10): defaults, required/optional/hidden, custom fields, categories, per-type config, config UI, version.
Return integration (5): staged picker, auto status, remove reverts, non-staged blocked, bulk from inventory.
Edit window & lock (9): timer, add/remove/edit in window, manual lock, auto-lock, immutable, visual change, configurable time.
Correction box (3): create, link, edit window.
Manifest & export (5): print, RTL, header, signature line, Excel.
Couriers (4): view, add, edit, deactivate.

### 3.11 Employees (employees.html) — 6 tests
List, add, edit, assign role, permission matrix, PIN uniqueness.

**Total functional tests: ~182**

---

## QA-2: End-to-End Flows (9 flows)

**A:** Complete purchase cycle (PO → receipt → debt → payment)
**B:** Delivery notes → monthly invoice (Pattern B)
**C:** Prepaid deal lifecycle (checks → deductions → alert → top-up)
**D:** Full return lifecycle (staged → box → shipped → credit → done)
**E:** OCR invoice processing (scan → review → correct → learn)
**F:** Access sync round-trip (CSV import → pending → resolve → reverse export)
**G:** New employee onboarding (create → login → permissions verified)
**H:** Shipment box — framing (create → items → lock → manifest → correction)
**I:** Shipment box — return with auto-status (staged → box → shipped, remove reverts)

---

## QA-3: Edge Cases (35 tests)

Original 25 + 10 new:
E.26: Box at exactly 30 minutes — locks correctly
E.27: Box with 0 items — blocked
E.28: Box with 50 items — UI handles
E.29: Remove last item from box — behavior defined
E.30: Correction box of correction box — chain handled
E.31: Staged return item in two boxes — blocked
E.32: Config with all fields hidden — at least 1 must show
E.33: OCR on 10-page PDF — no timeout
E.34: Alert count > 99 — badge shows 99+
E.35: Manifest print with 50 items — paginated

---

## QA-6: Visual & UX Professional Audit

**Methodology per page:**
1. Screenshot analysis — describe what is seen
2. Score (1-10) — visual quality, clarity, professionalism
3. 3 positives — what works well
4. 3 improvements — specific, actionable, prioritized (must-fix / nice-to-have / future)

**20 global checks:** color palette, fonts, buttons, spacing, cards, tables, modals, toasts, loading states, empty states, error states, hover, focus, scrollbars, badges, icons, transitions, dropdowns, PIN modal consistency.

**Per-page audit:** home (5 checks), inventory (5), debt (6), shipments (5), employees (2).

**Active improvement suggestions required:** minimum 3 per page, with examples like skeleton screens, pulse timer, monospace box numbers, better error messages in Hebrew.

---

## QA-8: Mobile & Responsive (dedicated section)

**Devices:** iPhone 14/15, iPhone SE, Galaxy S23, iPad, iPad Mini, Android tablet.

**13 general mobile checks:** viewport, no horizontal scroll, header responsive, navigation stacking, touch targets ≥44px, font size ≥14px, keyboard types, dropdowns, modals, tables, PIN modal, toasts, landscape.

**Page-specific mobile tests:**
- Home: 3 tests (cards stack, login button, blur)
- Inventory: 8 tests (table scroll, search, filters, entry form, dropdowns, scanner, buttons, returns)
- Debt: 7 tests (cards stack, aging, tabs, document list, wizard, detail panel, file preview)
- Shipments: 7 tests (box list, wizard, staged picker, timer, detail, manifest, accordion)
- Employees: 2 tests (list, permission matrix)

**Mobile-specific issues checklist:** keyboard covering inputs, iOS bottom bar, Android address bar resize, touch targets too close, pinch-zoom, overflow hidden, fixed position with keyboard.

---

## Execution Order (16 steps)

```
QA-a  Setup: test plan, test data, browsers + devices
QA-b  Functional testing (182 tests across 11 sections)
QA-c  Flow testing (9 end-to-end flows)
QA-d  Edge cases (35 boundary tests)
QA-e  Security + Multi-tenancy
QA-f  Performance + Error handling
QA-g  Visual & UX audit (professional, all 5 pages, with scores)
QA-h  Mobile & responsive (all devices, all pages)
QA-i  Cross-browser + RTL
QA-j  Permissions + Data integrity + Accessibility
QA-k  Documentation audit
──── BUG REPORT COMPILED ────
QA-l  Fix 🔴 Critical
QA-m  Fix 🟡 Medium
QA-n  Fix 🟢 Low + 💅 Visual + 📱 Mobile
QA-o  Regression (re-run QA-b through QA-k)
QA-p  Final sign-off
```

---

## Exit Criteria

- [ ] Zero 🔴 Critical bugs
- [ ] Zero 🟡 Medium bugs
- [ ] All 🟢/💅/📱 bugs documented (fix or accepted)
- [ ] All 9 flows pass
- [ ] 5 roles × 17 actions verified
- [ ] Multi-tenancy isolation verified
- [ ] All 5 pages tested on mobile (iOS + Android)
- [ ] All 5 pages tested on Chrome + Firefox
- [ ] Zero console errors on all 5 pages
- [ ] UX audit score ≥ 7/10 on all pages
- [ ] All documentation current
- [ ] dev_bypass removed
- [ ] JWT secret rotated
- [ ] Performance benchmarks met
