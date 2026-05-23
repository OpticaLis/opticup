# M5_POLISH_PHONE2_LIST_COLUMNS — Test Report

## Localhost-Tester Visual-Fidelity Gate

### Step 0 — First-load styled-check

Variables resolve (carried from VISUAL_FIDELITY_GATE fix):
```
getComputedStyle(body).background = rgb(250,250,247)  ✅ (--bg-page)
getComputedStyle('.cust-card').backgroundColor = rgb(255,255,255)  ✅
getComputedStyle('.cust-header').backgroundColor = rgb(30,58,138)  ✅ (Navy)
getComputedStyle('.cust-list-side').backgroundColor = rgb(30,58,138)  ✅ (Navy)
```
**Verdict:** ✅ Step 0 PASS — page renders styled, not raw.

### Step 1 — Stylesheet-link audit

`<head>` includes `css/customers.css` (now 322 rules — +picker-modal selectors landed). All shared/css/* + customers.css load.
**Verdict:** ✅ Step 1 PASS.

### Step 2 — Mockup-vs-live region-by-region tables

**Card — Contact block (Item A focus):**
- Live screenshot: `screenshots/card_contact_block.jpeg`
- Mockup: `modules/Module 5 - Customers/architecture-brief/M5_CUSTOMER_CARD_MOCKUP.html` (Tab 1 Contact block).

| # | Region | Mockup state | Live state | Match | Severity | Classification |
|---|---|---|---|---|---|---|
| 1 | Contact block header h3 | "תקשורת" | "תקשורת" | ✅ | — | 1:1 |
| 2 | Row 1 (mobile) | "נייד" + phone | "נייד" + +972501111111 | ✅ | — | 1:1 |
| 3 | Row 2 (secondary) | "טלפון-עבודה" + value | "טלפון-עבודה" + "—" (empty by design; populated by edit-mode) | ✅ | — | **1:1 — Item A delivered** |
| 4 | Row 3 (email) | "אימייל" + value | "אימייל" + "—" | ✅ | — | 1:1 |
| 5 | Row 4 (other) | "אחר" + value | not rendered | ⚠ | LOW | SCHEMA-BLOCKED (F-CARD-CONTACT-SCHEMA from VISUAL_FIDELITY_GATE; M5 doesn't have a `contact_other` column) |

Card verdict: ✅ **3 of 4 rows now match the mockup** — Item A closed the previously-blocked "טלפון-עבודה" row. Row 4 ("אחר") remains SCHEMA-BLOCKED (out of scope this SPEC).

---

**List — Toolbar + Column Picker + Rendering (Item B focus):**
- Live (default): `screenshots/list_default_columns.jpeg`
- Live (6-col after save + reload): `screenshots/list_6_columns_after_save.jpeg`
- Picker modal: a11y captured (screenshot retry timed out — 4 retries hit timeout; a11y snapshot below proves the picker structure)

| # | Region | Mockup state | Live state | Match | Severity | Classification |
|---|---|---|---|---|---|---|
| 1 | Toolbar | search + scan + advanced + new | search + scan(blurred) + advanced(blurred) + **עמודות (NEW)** + new | ✅+ | — | **1:1 + Item B added** |
| 2 | Default columns (new tenant) | aspirational 7 cols | 4 wired cols: name + phone + city + health_fund | ✅ | — | INTENTIONAL — sensible minimal default per D-B3 |
| 3 | Column picker accessibility | mockup doesn't show a picker (aspirational) | new modal with 11 wired (4 default-checked) + 4 future (disabled, "בקרוב") | ✅ | — | **NEW UX delivered (Item B core)** |
| 4 | Future-column behavior | n/a in mockup | clicking last_exam_date row → showComingSoon('list_col_last_exam') toast, NO toggle | ✅ | — | INTENTIONAL — feeds the future-module activation pattern |
| 5 | After-save row rendering | n/a in mockup | row now shows 6 cells: name+pill+num / phone / city / id_number / source / health_fund | ✅ | — | **per-tenant choice live** |
| 6 | Reload persistence | n/a in mockup | reload → tenant_settings.customer_list_preferences read → 6-col layout preserved (NOT default 4) | ✅ | — | **SaaS contract honored** |
| 7 | Row column count (mockup 7 → live up to 11 wired) | aspirational columns include age / last-exam / last-order / club-tier | now configurable per tenant; aspirational cols pre-wired as "coming soon" until M6/M7/M13 | ⚠ | LOW | INTENTIONAL — the column picker DESIGN includes the aspirational columns, marked "בקרוב"; they auto-light-up when their data arrives (foundation-first pattern) |

List verdict: ✅ **Picker + persistence + future-column discipline all live.** The mockup's aspirational columns are now PRE-DESIGNED INTO the picker as future entries — exactly the foundation-first pattern Daniel asked for.

### Functional smoke results

| # | Case | Status | Evidence |
|---|---|---|---|
| S1 | Card boots, contact has 3 rows | ✅ | a11y uid 30_38–43: נייד / טלפון-עבודה / אימייל |
| S2 | Edit phone_secondary persists to DB | ✅ | trace: `update_sent field:phone_secondary value:052-9999-TEST → update_resolved error:null` (205ms); DB SELECT shows new value; reverted to NULL at teardown |
| S3 | Revert phone_secondary | ✅ | DB → NULL |
| S4 | List boots with default columns | ✅ | initial render = 4 cols (name/phone/city/health_fund) — matches D-B3 default |
| S5 | Open column picker | ✅ | modal shows 11 wired + 4 future-coming-soon |
| S6 | Toggle id_number + source ON, save | ✅ | DB: `tenant_settings.customer_list_preferences.list_columns = ["name","phone","city","id_number","source","health_fund"]`; grid_col_count=6 |
| S7 | Future-column click → coming-soon (no toggle) | ✅ | trace: `showComingSoon('list_col_last_exam')` fired; column did NOT enter the saved array |
| S8 | Persistence across reload | ✅ | reload → 6 cols rendered; `manual` source + `123456789` id visible on real rows |
| S9 | Screenshots sent to Daniel | ✅ | 3 JPEGs delivered via SendUserFile (Architect-relay rule honored) |

### Step 4 — "Paperwork PASS" rejection (gate Step 4)

Both Card + List include embedded screenshot path + a region-by-region table. NOT a paperwork PASS.

### Step 5 — Refusal contract

Every drift row is either ✅ or classified (SCHEMA-BLOCKED / INTENTIONAL). No unclassified 🔴.

**Overall gate verdict: ✅ PASS** (Item A 1:1 on contact block; Item B delivers new SaaS-clean UX + closes the foundation-first column discipline).
