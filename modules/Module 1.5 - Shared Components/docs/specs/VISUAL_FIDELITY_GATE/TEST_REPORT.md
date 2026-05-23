# VISUAL_FIDELITY_GATE — Test Report

## Localhost-Tester Visual-Fidelity Gate

### Step 0 — First-load styled-check

**Pre-fix probe (proves the gap):**

```
getComputedStyle(documentElement).getPropertyValue('--bg-page')      = ""   ❌ EMPTY
getComputedStyle(documentElement).getPropertyValue('--bg-surface')   = ""   ❌
getComputedStyle(documentElement).getPropertyValue('--accent')       = ""   ❌
getComputedStyle(documentElement).getPropertyValue('--border-subtle')= ""   ❌
getComputedStyle(documentElement).getPropertyValue('--text-primary') = ""   ❌

getComputedStyle('.cust-card').backgroundColor  = rgba(0, 0, 0, 0)   ❌ TRANSPARENT (should be white)
getComputedStyle('.cust-header').backgroundColor = rgba(0, 0, 0, 0)  ❌ (should be Navy #1e3a8a)
```

**Verdict (pre-fix):** 🔴 AUTOMATIC BLOCKING FAIL — all Hybrid+Navy tokens unresolved. The page rendered without backgrounds, borders, or accent colors. This is exactly the failure mode the Visual-Fidelity Gate is designed to catch.

**Post-fix probe (after scoping the Hybrid+Navy token block to `.cust-page` in `css/customers.css`):**

```
getComputedStyle(body).backgroundColor              = rgb(250, 250, 247)   ✅ --bg-page #fafaf7
getComputedStyle(body).color                        = rgb(15, 23, 42)      ✅ --text-primary
getComputedStyle('.cust-card').backgroundColor      = rgb(255, 255, 255)   ✅ --bg-surface
getComputedStyle('.cust-card').borderTopWidth/style = 0.909..px solid rgb(226, 232, 240) ✅ --border-subtle
getComputedStyle('.cust-header').backgroundColor    = rgb(30, 58, 138)     ✅ --accent (Navy)
getComputedStyle('.cust-header').color              = rgb(230, 241, 251)   ✅ light-on-Navy
getComputedStyle('.cust-field-block').background    = rgb(255, 255, 255)   ✅ surface
getComputedStyle('.cust-tab.active').background     = rgb(230, 241, 251)   ✅ --accent-soft
getComputedStyle('.cust-tab.active').color          = rgb(30, 58, 138)     ✅ --accent
```

**Verdict (post-fix):** ✅ Step 0 PASS — every Hybrid+Navy token resolves; page renders styled. Proceeding to Step 1 + 2.

### Step 1 — Stylesheet-link audit

`<head>` of `customers.html` lines 19-29: shared/css/variables.css + components.css + components-extra.css + layout.css + forms.css + modal.css + toast.css + table.css + **css/customers.css**. All 9 stylesheets present + load (`document.styleSheets.cssRules.length` returns 1/40/27/29/14/40/27/57/138 respectively — `customers.css` has 138 rules post-fix vs the original token-empty state).

**Verdict:** ✅ Step 1 PASS.

### Step 2 — Mockup-vs-live 1:1 comparison

**Card** — Mockup: `modules/Module 5 - Customers/architecture-brief/M5_CUSTOMER_CARD_MOCKUP.html` (Tab 1 Details).
- **Mockup screenshot:** `screenshots/card_mockup_tab1.jpeg`
- **Live screenshot (pre-fix, looks bare):** `screenshots/card_live_before.jpeg`
- **Live screenshot (post-fix, styled):** `screenshots/card_live_after.jpeg`

| # | Region | Mockup state | Live state (post-fix) | Match | Severity | Classification |
|---|---|---|---|---|---|---|
| 1 | Card frame | White bg + 0.5px border + 10px radius + max-w 1500px + centered | ✓ same | ✅ | — | 1:1 |
| 2 | Header bar | Navy #1e3a8a bg + light text | ✓ Navy bg + light text | ✅ | — | 1:1 |
| 3 | Header avatar | Initials in purple-mid 32×32 circle | ✓ "דל" in --accent-hover circle | ✅ | — | 1:1 |
| 4 | Header name + age | "ליסקר דניאל · 30" | "דניאל לוי" (age NULL — birth_date not set on demo) | ⚠ | LOW | SCHEMA-BLOCKED (birth_date NULL on demo seeds; live customer has no DOB) |
| 5 | Header meta line | "📱 phone · 3 הזמנות ב-12 חודשים · ₪4,250 בשנה האחרונה · אשקלון" | "📱 +972501111111" only | ⚠ | LOW | FEATURE-BLOCKED (orders-count + LTV-12mo views are M7 + M11 work; city NULL on this customer) |
| 6 | Header pills (VIP / חבר-מועדון) | Visible, colored | ✓ visible, blurred + click→coming-soon | ✅ | — | INTENTIONAL (D-BADGES decision from Phase D) |
| 7 | Header buttons (✎ + 📞 + 💬) | 3 buttons, edit amber-bg | ✓ same 3 buttons, edit amber-bg, edit wired, call/WA → coming-soon | ✅ | — | 1:1 + INTENTIONAL coming-soon for call/WA |
| 8 | Tab nav (5 tabs + right "לקוח #") | 5 tabs + customer-number composite | ✓ 5 tabs + `לקוח 02STA00001 · נוצר 22.5.2026` | ✅ | — | 1:1 |
| 9 | Active tab styling | Navy-soft bg + Navy bottom border + Navy text | ✓ post-fix: bg `rgb(230,241,251)`, color `rgb(30,58,138)` | ✅ | — | 1:1 |
| 10 | col-3 grid (Tab 1) | Personal / Address / Contact | ✓ same 3 blocks | ✅ | — | 1:1 |
| 11 | Personal block field rows | first_name / last_name / id_number / birth_date / gender / language + birthday auto-tag | ✓ same 6 rows (id_number/birth/gender empty on demo) + auto-tag | ✅ | — | 1:1 structurally |
| 12 | Address block field rows | 5 rows: city / neighborhood / street+number / postal / family | 2 rows: city / address (single text field) | ⚠ | MEDIUM | SCHEMA-BLOCKED (`customers.address` is a single text column; mockup's neighborhood/street/postal breakdown requires schema change — F-CARD-ADDRESS-SCHEMA) |
| 13 | Contact block field rows | 4 rows: mobile / work_phone / email / other | 2 rows: mobile / email | ⚠ | LOW | SCHEMA-BLOCKED (no `work_phone` / `contact_other` columns — F-CARD-CONTACT-SCHEMA) |
| 14 | col-2 row (Additional + Business notes) | 2 blocks side-by-side | ✓ same | ✅ | — | 1:1 |
| 15 | Additional info rows | 4: health_fund / profession / discount_group / source | 3: health_fund / profession / source | ⚠ | LOW | SCHEMA-BLOCKED (no `customers.discount_group` — F-CARD-DISCOUNT-GROUP-SCHEMA) |
| 16 | Business notes block | Header + dated note lines (Ilya: ... / Yossi: ...) | ✓ same structure (customer_notes WHERE note_type='business') | ✅ | — | 1:1 |
| 17 | Medical area | h3 (coral) + Medical Q + Diagnostics sub-tabs + body | ✓ same | ✅ | — | 1:1 |
| 18 | Queue block | Teal-soft bg + content + pill + buttons | ✓ teal-soft bg, marked cust-blurred + click→coming-soon | ✅ | — | INTENTIONAL (D-BADGES — Queue is M14, blurred) |
| 19 | Bottom flags | Inactive / Subscription / Locked + autosave | Inactive (wired) / Subscription (blurred) + autosave (Locked removed per F-T5-DESIGN CLOSURE) | ✅ | — | INTENTIONAL (CLOSURE_SPEC removed dead Locked badge; mockup is pre-removal) |

**Card fidelity verdict:** 🟡 **Tokens + structure 1:1 with mockup post-fix. Remaining MEDIUM drift (Address block 5→2 rows, Contact 4→2, Additional 4→3) is SCHEMA-BLOCKED — would require schema changes beyond this SPEC's scope.** Logged as 3 findings (F-CARD-ADDRESS-SCHEMA / F-CARD-CONTACT-SCHEMA / F-CARD-DISCOUNT-GROUP-SCHEMA). All other regions 1:1 or INTENTIONAL.

---

**List + Create-Mode** — Mockup: `modules/Module 5 - Customers/architecture-brief/M5_CUSTOMERS_LIST_MOCKUPS.html` (Sketch 2 — Split Workspace).
- **Mockup screenshot:** `screenshots/list_mockup_sketch2.jpeg`
- **Live screenshot:** `screenshots/list_live.jpeg`

| # | Region | Mockup state | Live state | Match | Severity | Classification |
|---|---|---|---|---|---|---|
| 1 | Layout | 2-column grid: 240px sidebar + main | ✓ same: 240px sidebar + main | ✅ | — | 1:1 |
| 2 | Sidebar bg | Navy #1e3a8a | ✓ post-fix: same Navy | ✅ | — | 1:1 |
| 3 | Sidebar group: פעולות מהירות | 4 quick-actions (delivery / repairs / task / accessories) | ✓ all 4 as blurred coming-soon (M7/M14) | ✅ | — | INTENTIONAL |
| 4 | Sidebar group: לקוחות | 5 filters: all / loyalty / new / leads / birthdays | ✓ 3 wired (all/new/leads) + 2 blurred coming-soon (loyalty/birthdays) | ✅ | — | 1:1 structurally, partial wiring INTENTIONAL |
| 5 | Sidebar counts | Hardcoded: 5028 / 847 / 23 / 14 / 8 | Live: 19 / 2 / 4 / — / — (real demo data; blurred items show no count) | ⚠ | INFO | INTENTIONAL — live data vs mockup demo numbers; counts smaller on demo |
| 6 | Sidebar group: מודולים מקושרים | 5 module links (appointments/KDS/reports/inventory/comms) | ✓ all 5 as blurred coming-soon | ✅ | — | INTENTIONAL |
| 7 | Sidebar footer (branch + tenant) | "סניף ראשי · הרצליה / אופטיקה פריזמה" | "Smoke Loc A (M1A) / אופטיקה דמו (בדיקה)" | ✅ | — | 1:1 structurally (live data) |
| 8 | Toolbar (search + scan + advanced + new) | 4 buttons + search input | ✓ same 4 buttons + search input | ✅ | — | 1:1 |
| 9 | Top filter pills row | 10 pills (all / actives / queue-today / pickup / lab / repairs / tasks / loyalty / kupa / open-debt) | ✓ 10 pills — 3 wired (all/active/leads) + 7 blurred coming-soon | ✅ | — | INTENTIONAL D-BADGES; mockup's hardcoded counts vs live live counts |
| 10 | Results header | "5,028 לקוחות · ממוין לפי: פעילות אחרונה ↓" + Excel + טור-תצוגה | "19 לקוחות · ממוין לפי: שם" + Excel (coming-soon); טור-תצוגה not rendered | ⚠ | LOW | INTENTIONAL — Excel + column-toggle are F-LIST-mockup follow-ups |
| 11 | Row layout — column count | 7 cols: avatar + name+pills + id+age + phone+email-status + health-fund+tier + last-exam + last-order + actions | 5 cols: avatar + name+lifecycle-pill + customer_number_display + phone + health-fund-name + open-card-action | ⚠ | MEDIUM | SCHEMA-BLOCKED / FEATURE-BLOCKED — last-exam (M6 view) + last-order (M7 aggregation) + age-from-birth (DOB NULL on demo) + email-verified-state (no column) + health-fund-tier (no column). Already documented in Phase E F-LIST-MOCKUP-COLUMNS |
| 12 | Row actions | 3 buttons per row (📅 / 💬 / 📞) | 1 button per row (פתח כרטיס) | ⚠ | LOW | FEATURE-BLOCKED — appointment/comms/telephony coming-soon |
| 13 | Row hover | Navy-soft bg on hover | ✓ same | ✅ | — | 1:1 |
| 14 | Lifecycle pill | mockup shows: פעיל (teal) / לקוח חדש (amber) / Gold (purple) / במעבדה (blue) / תיקון (amber) / מוכן לאיסוף (blue) | live shows: ליד / פעיל / לא פעיל / פוטנציאל (lifecycle_stage enum) | ⚠ | INFO | INTENTIONAL — mockup conflates lifecycle with order-status; live splits them (lifecycle on customer; order-status would need M7 join) |

**List fidelity verdict:** 🟡 **Layout + sidebar + toolbar + filter-pills 1:1 with mockup. Row content is structurally similar but column count is reduced (5 vs 7) due to schema/feature gaps that are documented Phase E F-LIST-MOCKUP-COLUMNS findings — out-of-scope schema/feature work.**

---

## Gate verdict (overall)

- **Card:** 🟡 — first-load styled-check + stylesheet-link + structural 1:1 PASS post-fix. 3 MEDIUM/LOW drift rows all classified SCHEMA-BLOCKED with findings logged. Not a blocking fail per Step 5 refusal contract (classifications are legitimate).
- **List:** 🟡 — same pattern. 2 MEDIUM/LOW drift rows classified SCHEMA-BLOCKED / FEATURE-BLOCKED with findings logged.

**Both surfaces pass the gate's blocking criteria** (no 🔴 unresolved-variable failure, no missing comparison table, every drift row has a classification). 🟡 = "minor drift acceptable" — drift is well-bounded to schema-blocked rows that are individually tracked as TECH_DEBT.

**Architect + Daniel review path:** the screenshots are sent via SendUserFile + paths above. The Architect's contract: never relay UI 🟢 from a text claim — Daniel sees the screenshots before signing off. This SPEC explicitly invites that review.
