# SPEC — M5_UI_CUSTOMER_LIST — Customer List + Create-Mode (Phase E)

> **Location:** `modules/Module 5 - Customers/docs/specs/M5_UI_CUSTOMER_LIST/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-23 (immediately post-Phase-D closure)
> **Module:** 5 — Customers
> **Phase:** E — UI Customer List + Create-Mode. **Completes M5's screen layer.**
> **Brief:** `modules/Module 5 - Customers/architecture-brief/M5_UI_CUSTOMER_LIST_BRIEF.md`
> **Mockup (chosen):** Sketch 2 — Split Workspace (sidebar + main table). Per `SESSION_CONTEXT.md` pre-pick.
> **Daniel-in-loop:** YES. Closure REQUIRES Iron Rule 34 Chrome MCP evidence.
> **No Prizma writes. No schema change. No merge to main.**

---

## 0. Pre-Authoring Reality Check

Build context loaded from the Phase D + CLOSURE session. localhost:3000 still up; demo PIN authentication still resolvable; `customers.html` entrypoint + 8 page JS files in `modules/customers/` are 🟢 closed.

### Probe results (pinned this seal)

**Probe 1 — `create_customer` body + dedup contract** (`pg_get_functiondef`):

The RPC returns `jsonb` with this shape:
```
{ customer_id: uuid, customer_number: int, created: bool, reason: 'new' | 'id_number_exists' | 'phone_exists' }
```
- **Required payload keys:** `home_branch_id` (uuid) + (`full_name` OR (`first_name`+`last_name`)) — raises 22023 if missing.
- **Optional keys:** `id_number`, `phone`, `email`, `language_code` (default 'he'), `lifecycle_stage` (default 'prospect'), plus address/city/birth_date/gender/consent flags.
- **Dedup order:** id_number FIRST → phone SECOND. Either match returns `created=false` with the existing customer_id + reason. **The UI's contract:** inspect `created` flag; if `false`, surface the existing customer (don't silently treat as success).
- **JWT validation:** standard Block A — service_role bypass + authenticated tenant-match required.

**Probe 2 — list-feeding view choice:**

| View | Cols | Has composite display? | Has health_fund_name? | Has age source? |
|---|---|---|---|---|
| `v_customer_full` | 34 | ❌ (raw `customer_number`) | ❌ (raw `health_fund_id`) | ✅ `birth_date` |
| `v_customer_for_exam` | 15 | ✅ `customer_number_display` | ✅ `health_fund_name` | ✅ `birth_date` |

**Decision:** list uses `v_customer_for_exam` as primary source (richer per-customer display). For the lifecycle pill the list joins to a small `customers` re-fetch on `id` for `lifecycle_stage`, OR (cleaner) we expose lifecycle via a slim list view in a follow-up. **For Phase E: read both views in parallel + zip by id** — same pattern the card uses. Acceptable for demo (19 customers) + Prizma (1,296). With server-side LIMIT this stays bounded.

**Probe 3 — phone storage format + leading-zero gotcha:**

Demo phone `prefix` distribution: 19/19 rows = `+972` (E.164 international). No rows start with `0`. A user searching for `"050-3348349"` or `"0503348349"` will NOT match against `+972503348349` with a naive ILIKE.

**Decision (D-PHONE-SEARCH):** the UI normalizes the search query client-side BEFORE the ILIKE:
1. Strip non-digit characters.
2. If first digit is `0`, strip it.
3. Apply the ILIKE as `%<normalized>%` against `phone`. This matches both `+972503348349` and any future stored format (suffix-friendly).

The deployed views/RPCs do NOT have a normalized phone column. Documented as F-LIST-PHONE-NORMALIZE finding — a future schema follow-up could add a `phone_e164_suffix` generated column. For Phase E we normalize client-side.

**Probe 4 — demo data state:**

| Tenant | Active | Lead | Total |
|---|---:|---:|---:|
| Demo | 19 | 4 (subset) | 19 |
| Prizma | 1,296 | 1,296 | 1,296 |

Phase E runs on demo only. The pagination must defend against the Prizma case (1,296) — server-side LIMIT 50 default.

**Probe 5 — routing on `customers.html`:**

Current behavior: `customers.html?customer_id=<uuid>` renders the card; bare entry shows the empty-state. **D-ROUTING:** bare `customers.html?t=<slug>` (no `customer_id`) = LIST MODE. The existing empty-state branch is replaced by the list shell. Card mode unchanged.

### Lessons applied from Phase D + CLOSURE

| Source | Lesson | How applied |
|---|---|---|
| Phase D FOREMAN_REVIEW P-AUTHOR-2 | "Page-boot auth precondition in §10 Dependencies for any new ERP-page SPEC." | §10 below explicitly lists `loadSession()` precondition. |
| Phase D FOREMAN_REVIEW P-EXEC-2 | "`DB.*` wrapper signature reference doc." | This SPEC's §9 explicitly states `DB.rpc('create_customer', { p_tenant_id, p_payload })` (named-key shape) + `DB.update(table, idScalar, changes)` (scalar 2nd arg). |
| CLOSURE FOREMAN_REVIEW P-AUTHOR-3 | "Screenshot-tool retry/quality fallback in CLOSURE-class SPECs." | §3b mandates JPEG quality=60 with retry-on-timeout for the Chrome MCP closure captures. |
| CLOSURE FOREMAN_REVIEW P-EXEC-3 | "A11y-snapshot-as-evidence equivalence." | §3b accepts a11y snapshots as Iron Rule 34 evidence when screenshots time out. |
| Memory `feedback_no_polish_by_validation` | "Ship only what's wired; aspirational data = finding, not silent pass." | Mockup's aspirational columns (last_exam_date, last_order, club tier) are explicitly OUT of scope §7 — render only what `v_customer_for_exam` + `v_customer_full` provide. |
| Memory `feedback_test_data_phones` | "Demo test phones must be Daniel's two personal numbers — anything else sends real SMS." | Create-mode smoke uses dummy phones in the +972 5XX range NEVER dialed. No SMS triggers in Phase E. |

### Cross-Reference Check (Step 1.5)

New names introduced by this SPEC:
- `renderCustomerList(...)`, `mountCustomerList(...)`, `renderSidebar(...)`, `mountSidebar(...)` — page JS module-level. 0 grep hits ✓
- `renderCreateModal(...)`, `handleCreateSubmit(...)` — 0 hits ✓
- `normalizePhoneQuery(...)` — 0 hits ✓
- `COMING_SOON_REGISTRY` new keys: `customer_list_advanced_search`, `customer_list_export`, `customer_list_barcode_scan`, `loyalty_tier`, `sidebar_kds`, `sidebar_reports`, `sidebar_inventory`, `sidebar_comms`, `sidebar_appointments`, `sidebar_birthday_filter`, `sidebar_loyalty` — all added to the existing registry (additive).
- New page JS files in `modules/customers/` (see §8) — all unique names ✓

No table/column/view/RPC additions. No collisions.

### Runtime semantics rehearsed

For the create-mode RPC call:
- **Anon caller, no JWT** → Block A raises 42501. UI catches + shows "אינך מחובר".
- **Authenticated, wrong tenant** → 42501. Same path.
- **Authenticated, demo tenant, missing home_branch_id** → 22023 with "create_customer requires home_branch_id". UI catches + surfaces "סניף-בית חובה".
- **Authenticated, demo tenant, missing name** → 22023 with "requires full_name OR (first_name+last_name)". UI catches + surfaces "שם חובה".
- **Authenticated, demo tenant, phone matches existing** → returns `{ created: false, reason: 'phone_exists', customer_id: <existing>, customer_number: <existing> }`. UI shows "לקוח קיים — פתח כרטיס?" + button to navigate to existing card.
- **Authenticated, demo tenant, id_number matches existing** → returns `{ created: false, reason: 'id_number_exists', ... }`. Same UX as phone_exists.
- **Authenticated, demo tenant, all fields fresh** → returns `{ created: true, reason: 'new', customer_id: <new>, customer_number: <new> }`. UI redirects to `customers.html?t=demo&customer_id=<new>`.

---

## 1. Goal

Ship Phase E of Module 5 — a working customer list (sidebar nav + search + filter pills + paginated list of demo customers) + create-mode (modal form wired to `create_customer` RPC with dedup-safe UX) on the existing `customers.html` entrypoint — completing M5's screen layer so a staff member can search → open card OR create new → land on card.

---

## 2. Background & Motivation

Phase D shipped the customer card (the view-one-customer surface). Phase E adds the two missing entry surfaces — the list (find a customer) and create-mode (add a new customer). Together with the card these form the complete customer-management loop. Routing reuses `customers.html` (the same entrypoint registered in `root-allowlist.json` + `CLAUDE.md` §0.5 — no new entrypoint). Phase C (OpticPlus 5,028-customer import) is cutover-time work and explicitly OUT of scope per Daniel.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected | Verify |
|---|---|---|---|
| 1 | Branch state | `develop`, scope-clean for M5 paths | `git status --short` |
| 2 | SPEC folder files | `SPEC.md` + `EXECUTION_REPORT.md` + `FINDINGS.md` + `TEST_REPORT.md` + `REVIEW.md` + `FOREMAN_REVIEW.md` | `ls` |
| 3 | Routing on `customers.html` | bare `?t=demo` (no customer_id) → list mode; `?t=demo&customer_id=<uuid>` → card mode (unchanged) | Chrome MCP both routes |
| 4 | List renders against live demo data | All 19 active demo customers (paginated) rendered from `v_customer_for_exam` + `v_customer_full` lifecycle join | Chrome MCP + DB count match |
| 5 | Sidebar nav | Per Sketch 2: "פעולות מהירות" (4 coming-soon) + "לקוחות" (5 filters; 3 wired — הכל / לידים / לקוחות חדשים — 2 blurred coming-soon) + "מודולים מקושרים" (5 all coming-soon) + tenant_location footer (name + branch from DB) | a11y snapshot |
| 6 | Filter pills row | הכל (wired) + פעילים (lifecycle='active') + לידים (lifecycle='lead') + 7 others blurred coming-soon (תור היום / מוכנים-לאיסוף / במעבדה / תיקונים / משימות / חברי-מועדון / קופ"ח: לאומית / חוב פתוח) | a11y |
| 7 | Search bar | Free-text input: searches name (`full_name`/`first_name`/`last_name` via OR ILIKE) + id_number (ILIKE) + phone (normalized via `normalizePhoneQuery` → ILIKE suffix). Submit on Enter or after 400ms debounce. | smoke S3 |
| 8 | Phone-search normalization | Typing `050-3348349` OR `0503348349` OR `503348349` → ILIKE pattern `%503348349%` against `phone`. Matches `+972503348349`. | smoke S4 |
| 9 | Row click | Navigates to `customers.html?t=demo&customer_id=<row.id>` (the existing Phase D card) | smoke S5 |
| 10 | "+ לקוח חדש" button | Opens create modal with form fields per mockup | smoke S6 |
| 11 | Create-mode happy path | Modal submit → `DB.rpc('create_customer', { p_tenant_id, p_payload })` → `created=true` → toast + redirect to new card | smoke S7 |
| 12 | Create-mode dedup-hit (phone) | Modal submit with existing demo phone → `created=false, reason='phone_exists'` → modal shows "לקוח קיים: <full_name> · #<customer_number>" + "פתח כרטיס" button → navigates to existing card. NO duplicate row inserted. | smoke S8 |
| 13 | Create-mode dedup-hit (id_number) | Same flow, `reason='id_number_exists'`. NO duplicate row inserted. | smoke S9 |
| 14 | Pagination | List defaults to 50 rows/page; "טען עוד" or page nav shows pagination state; works at Prizma scale (1,296 rows) without choking. | smoke S10 (demo 19 → 1 page; Prizma path stub-tested via console DB.select with limit=50 offset=0/50/100) |
| 15 | Iron Rule 7 | No direct `sb.from()` in new JS files (storage path unused this SPEC; DB.* wrapper throughout) | `grep -n "sb\.from" modules/customers/customer-list*.js modules/customers/customer-create*.js` → 0 |
| 16 | Iron Rule 8 | escapeHtml on every dynamic interpolation | Reviewer audit |
| 17 | Iron Rule 12 | Every new file ≤300 (target) / ≤350 (cap) | `wc -l` |
| 18 | Iron Rule 21 | ONE shared `showComingSoon` (existing) + new keys added to existing `COMING_SOON_REGISTRY`; no new handler; no scattered placeholder strings | grep |
| 19 | Iron Rule 22 | Defense-in-depth `tenant_id` via DB.* wrapper auto-inject | Reviewer audit |
| 20 | Iron Rule 31 — Integrity gate | exit 0 or 2 at every commit | `npm run verify:integrity` |
| 21 | Iron Rule 32 — Destructive Ops | Declared (additions only + governance file edits) | pre-commit hook |
| 22 | Iron Rule 34 — Chrome MCP closure | (a) 4+ JPEG screenshots: list (default) + list (filter active) + create-modal (open) + create-success-toast/dedup-modal · (b) runtime trace: `create_customer_called → create_customer_resolved` for both `created=true` + `created=false` paths · (c) DB-write evidence: new row exists post-success; NO new row post-dedup-hit · (d) mockup-vs-live fidelity per smoke | TEST_REPORT.md |
| 23 | FIELD_MAP — new fields | If list renders any new field beyond Phase D's set: add to FIELD_MAP. Likely no new fields (city, email, lifecycle, customer_number, customer_number_display, health_fund_name already in Phase D's M5 entries). | grep |
| 24 | GLOBAL_MAP additive merge | New "Module 5 — Customer List + Create-Mode UI" subsection added | grep |
| 25 | FILE_STRUCTURE | New page JS files added to `modules/customers/` (≤4 files) | grep |
| 26 | M5 ROADMAP Phase E | row → ✅ 🟢 | grep |
| 27 | M5 SESSION_CONTEXT | Phase E status updated | grep |
| 28 | M5 CHANGELOG | Phase E entry with commit hashes | grep |
| 29 | MASTER_ROADMAP.md §3 #5 | status refreshed to reflect Phase E close | grep |
| 30 | PATH_TO_LIVE.md | M5 Phase E checkbox ticked | grep |
| 31 | No Prizma writes | `SELECT count(*) FROM customers WHERE tenant_id=prizma AND created_at > <SPEC start>` → 0 | SQL probe at close |
| 32 | No schema change | No `apply_migration` calls during this SPEC | EXECUTION_REPORT |

### 3a. Functional smoke (Chrome MCP — mandatory)

Demo tenant `8d8cfa7e-...`. Demo customer used for navigation tests: `8fcc5610-9cb8-42bc-8773-6122d6e0f962` ("דניאל לוי", customer_number=1). PIN-authenticated session reused from Phase D.

| # | Case | Setup | Action | Assertion |
|---|---|---|---|---|
| S1 | List mode boots | Navigate `customers.html?t=demo` | wait for list rows | a11y snapshot: 19 customer rows + sidebar + filter pills + "+ לקוח חדש" button visible; 0 console errors |
| S2 | Filter pill "לידים" | (S1) | click "לידים" pill | list reduces to 4 rows (the 4 demo lead-customers). Other pills greyed/inactive. |
| S3 | Name search | (S1) | type "דניאל" in search → debounce | list shows only customers with "דניאל" in name. Demo has 1: "דניאל לוי". |
| S4 | Phone search normalization | (S1) | type "0503348349" (with leading zero) | list shows row(s) where phone ENDS WITH `503348349`. `normalizePhoneQuery` trace shows `0503348349 → 503348349`. |
| S5 | Row click → card | (S1) | click "דניאל לוי" row | URL changes to `customers.html?t=demo&customer_id=8fcc5610-...`; Phase D card renders. |
| S6 | Create modal opens | (S1) | click "+ לקוח חדש" | modal appears with required fields: first_name, last_name (or full_name fallback), phone, id_number, email, home_branch_id (default = first active demo branch), language_code (default 'he'). |
| S7 | Create-mode happy path | (S6) | fill: first_name="בדיקה", last_name="פ5-S7-" + timestamp, phone="+972500099" + timestamp suffix unique, home_branch_id=first demo branch. Submit. | Trace: `create_customer_called → create_customer_resolved(created=true, reason=new)`. Toast "לקוח נוצר". URL changes to `customers.html?t=demo&customer_id=<new>`. DB: `SELECT id, full_name FROM customers WHERE customer_number = <returned>` finds it. **Cleanup at smoke close:** service_role DELETE the test row. |
| S8 | Dedup-hit (phone_exists) | (S6) | open create modal again, fill name + the EXISTING phone `+972501111111` (= דניאל לוי's phone), submit | Trace: `create_customer_called → create_customer_resolved(created=false, reason=phone_exists, customer_id=8fcc5610-...)`. Modal displays "לקוח קיים: דניאל לוי · #1" + "פתח כרטיס". DB: customer count unchanged. |
| S9 | Dedup-hit (id_number_exists) | (S6) | open create modal, fill name + an existing id_number (set via setup — pick a demo customer that has id_number; or set one via service_role on דניאל לוי first then revert), submit | Trace: `created=false, reason=id_number_exists`. Modal shows existing-customer surface. No duplicate. |
| S10 | Pagination defense | console: `await DB.select('v_customer_for_exam', { tenant_id: getTenantId() }, { limit: 50, offset: 0 })` (no client filter — simulate Prizma case) | Returns ≤ 50 rows. Works without choking. Sanity: a second call with `offset: 50` works. |
| S11 | Coming-soon blurred surfaces | (S1) | click each blurred pill (תור היום / חברי-מועדון / etc.) + click each blurred sidebar button (KDS / reports / comms / inventory link) | Each invokes `showComingSoon(<feature_id>)` with its registry key. Toast = `COMING_SOON_LABEL`. No duplicate handler code. |
| S12 | Mockup-vs-live fidelity | side-by-side review on the 4 fidelity JPEGs | structural match; material drift flagged as finding |

### 3b. Iron Rule 34 closure evidence (required)

JPEG quality=60 with retry-on-timeout (per CLOSURE P-AUTHOR-3). A11y snapshots accepted as supplementary evidence (per CLOSURE P-EXEC-3).

Required:
1. **Screenshots** (4 minimum, JPEG q=60):
   - `list_default.jpeg` — list with all 19 demo customers + sidebar + filter pills
   - `list_filtered.jpeg` — list after "לידים" pill click (4 rows)
   - `create_modal_open.jpeg` — create modal with form fields
   - `create_success_or_dedup.jpeg` — either success toast OR dedup-existing-customer surface
2. **Runtime trace:** `create_customer_called → create_customer_resolved` for BOTH paths (created=true + created=false) attached to FOREMAN_REVIEW.
3. **DB evidence:** SELECT post-S7 showing the new row + SELECT post-S8 showing the customer count unchanged.
4. **Mockup-vs-live notes** per screenshot.

### 3c. Daniel-in-loop checkpoints

- C1: Mockup-vs-live diff surfaces STRUCTURAL drift (missing section / wrong order / wrong color) → escalate (don't expand scope).
- C2: A novel UX ambiguity that the mockup doesn't settle (the Brief explicitly anticipates this).
- C3: Smoke S7 cleanup fails to delete the test row → escalate before Foreman close.

---

## 4. Autonomy Envelope

### What the executor CAN do

- Read any file; run read-only SQL freely.
- Create new page JS files in `modules/customers/` for the list + create-mode (4 files max, see §8).
- Edit `customers.html` to load the new files + add list/create-modal DOM containers.
- Edit `css/customers.css` additively (new selectors only — `cust-list-*`, `cust-sidebar-*`, `cust-create-*`).
- Edit `modules/customers/customer-card-coming-soon.js` to ADD new registry keys (additive — NO removals, NO behavior change).
- Edit `customer-card.js` ONLY to add the list-mode routing branch (the empty-state currently shown when `customer_id` is missing → replace with list-mode boot). Surgical edit.
- Selective `git add` by filename. Preserve pre-existing dirty files (campaign / audit drafts) — leave alone.
- Run Chrome MCP smokes against `http://localhost:3000/customers.html?t=demo`.
- Update M5 docs (SESSION_CONTEXT, CHANGELOG, MODULE_MAP, ROADMAP, GLOBAL_MAP additive, FILE_STRUCTURE, MASTER_ROADMAP, PATH_TO_LIVE).
- Commit + push to develop per §9 plan.

### What REQUIRES stopping and reporting

- Any change to a Phase D file beyond `customer-card.js` (the list-mode routing branch is the ONE allowed touch — anything else in the card is OUT of scope).
- Any change to `customer-card-coming-soon.js` beyond ADDING registry keys (NO label edits, NO handler signature changes).
- Smoke S7 happy-path doesn't actually create a DB row (something silently swallowed) → STOP.
- Smoke S8/S9 dedup paths create a duplicate row → STOP. Critical — defeats the whole dedup contract.
- Any Prizma row write or schema change attempt → STOP.
- Mockup material drift → escalate (don't expand scope).
- File-size hook hard-fails on any new page JS → STOP and split.

---

## 5. Stop-on-Deviation Triggers

- `v_customer_for_exam` returns 0 rows when the list should render 19 → STOP (probably an RLS/session injection issue — Phase D path).
- `create_customer` ever returns `created=false` for a payload with NO `phone` AND NO `id_number` → STOP (RPC body shouldn't have a dedup path here).
- Phone search returns ALL rows for non-empty query → STOP (normalization broken).
- A blurred surface fires `showComingSoon` with a featureId NOT in the registry → STOP (Iron Rule 21 discipline broken).

---

## 6. Rollback Plan

Purely additive code change. Rollback = `git revert` the build commits. The smoke creates 1 test customer (S7) that is deleted at smoke close; if smoke fails partway, manual service_role DELETE the test row by customer_number.

---

## Destructive Operations

This SPEC declares the following non-DROP destructive-class operations per Iron Rule 32:

1. **In-place edit** of `customer-card.js` — replace the empty-state branch with a list-mode boot dispatch.
2. **In-place edit** of `customer-card-coming-soon.js` — ADD ~11 new registry keys (additive only).
3. **In-place edit** of `customers.html` — add list-mode DOM containers + new `<script>` loads (additive).
4. **In-place additive edit** of `css/customers.css` — new selectors only.
5. **In-place additive edit** of `js/shared-field-map.js` — only if a new rendered field surfaces (likely zero edits).
6. **In-place replace** of M5 state files (SESSION_CONTEXT, MODULE_5_ROADMAP, CHANGELOG, MODULE_MAP, MASTER_ROADMAP, PATH_TO_LIVE, GLOBAL_MAP, FILE_STRUCTURE).
7. **DML smoke**: 1 INSERT into demo `customers` (S7) + 1 DELETE of the same row at smoke teardown. Single-row, demo-scoped, by-id.

**NO DROP** of any table / column / view / RPC / file. **NO TRUNCATE.** **NO DELETE** outside the single S7 teardown. **NO Prizma writes. NO schema change. NO merge to main.**

---

## 7. Out of Scope (explicit)

- **OpticPlus 5,028-customer historical import** — Phase C, cutover-time. The list renders existing demo rows only.
- **Any change to the Phase D card** beyond the list-mode routing branch in `customer-card.js`. If the list reveals a card bug → flag as FINDING; don't fix.
- **Merge / household / delete actions on rows** — those live on the card. The list does NOT bulk-edit.
- **Customer LOCK feature / see-deleted mode** — documented TECH_DEBT (post-Phase D closure).
- **Mockup's aspirational columns** — `last_exam_date`, `last_order_number`, club tier, age-from-birth (when birth_date is NULL on demo), "תור היום / מוכנים-לאיסוף / במעבדה" filter actually filtering (M7/M9 needed) — render only what `v_customer_for_exam` + `v_customer_full` provide. Aspirational columns flagged as findings, not rendered.
- **Sidebar "מודולים מקושרים" links** — all coming-soon. KDS / reports / inventory / comms / appointments do not navigate anywhere.
- **Loyalty / club / subscription** features — coming-soon registry entries only.
- **Barcode scanner button** — coming-soon.
- **Excel export button** — coming-soon.
- **Advanced search modal** — coming-soon (the basic search bar is wired).
- **Phone-search server-side index** — F-LIST-PHONE-NORMALIZE finding; future schema follow-up could add a generated column.
- **PIN-gating create-mode** — staff role can already authenticate. No PIN re-prompt on create (the session JWT already has the tenant_id claim).
- **Merge to main. Prizma writes.**

---

## 8. Expected Final State

### New files (page JS — split per Iron Rule 12)

- `modules/customers/customer-list.js` (~240 lines target) — list-mode boot, state, fetch from `v_customer_for_exam` + lifecycle join, render rows, search debounce, pagination state, dispatch row clicks.
- `modules/customers/customer-list-sidebar.js` (~140 lines target) — sidebar nav render + filter-button click handlers (filter the rendered list client-side after the initial fetch — server-side filter would require a richer view; demo at 19 rows is fine; pagination handles Prizma).
- `modules/customers/customer-list-filters.js` (~120 lines target) — top filter-pills row + the `normalizePhoneQuery` helper (exported for testability).
- `modules/customers/customer-create.js` (~270 lines target) — create-modal HTML + form handlers + `DB.rpc('create_customer', ...)` + dedup-hit UX surface + post-success redirect.

### Modified files (additive only)

- `customers.html` — add `<script>` tags for the 4 new files (end of `<body>`, after the existing card scripts). Add list/create DOM containers (`<div id="cust-list-root">`, `<div id="cust-create-modal-root">`).
- `css/customers.css` — append list/sidebar/create selectors (`.cust-list-*`, `.cust-sidebar-*`, `.cust-create-modal`, `.cust-filter-pills`, etc.).
- `modules/customers/customer-card.js` — small surgical change: when `customer_id` is missing AND tenant resolved, instead of showing the empty-state, call `mountCustomerList()` (defined in customer-list.js). The existing card-mode branch is unchanged.
- `modules/customers/customer-card-coming-soon.js` — ADD ~11 new registry entries (`customer_list_advanced_search`, `customer_list_export`, `customer_list_barcode_scan`, `loyalty_tier`, `sidebar_kds`, `sidebar_reports`, `sidebar_inventory`, `sidebar_comms`, `sidebar_appointments`, `sidebar_birthday_filter`, `sidebar_loyalty`). NO label change. NO handler change.

### Module + global docs

- M5 ROADMAP — Phase E row → ✅ 🟢.
- M5 SESSION_CONTEXT — Phase E status; "what's next" lists M6 UI.
- M5 CHANGELOG — Phase E entry with commit hashes.
- M5 MODULE_MAP — add a UI Surfaces section listing list + create.
- `docs/GLOBAL_MAP.md` — new "Module 5 — Customer List + Create-Mode UI" subsection.
- `docs/FILE_STRUCTURE.md` — add 4 new page JS files.
- `MASTER_ROADMAP.md` §3 #5 — refresh to include Phase E closure.
- `PATH_TO_LIVE.md` — M5 Phase E checkbox ticked.

### Storage / DB state

- Unchanged. No bucket changes. No DDL. 1 INSERT + 1 DELETE on demo customers (S7), self-cleaned at smoke close.

### Commits (plan)

1. `feat(m5e): add customer list view + sidebar + filter pills (Sketch 2)` — customer-list.js + customer-list-sidebar.js + customer-list-filters.js + customers.html script loads + css/customers.css selectors + customer-card.js routing branch + customer-card-coming-soon.js registry additions.
2. `feat(m5e): add create-mode modal + create_customer RPC wiring (dedup-safe)` — customer-create.js.
3. `chore(m5e): GLOBAL_MAP + FILE_STRUCTURE additive merges`.
4. `docs(m5e): close Phase E — ROADMAP/SESSION_CONTEXT/CHANGELOG/MODULE_MAP + MASTER_ROADMAP + PATH_TO_LIVE + retros`.

---

## 9. Dependencies / Preconditions

- M5 Phase D + CLOSURE 🟢 — verified (commit chain ends at `9957c43`).
- localhost:3000 still up; demo PIN session reusable.
- Chrome MCP harness available (JPEG q=60 + a11y snapshots).
- `loadSession()` page-boot pattern (Phase D P-AUTHOR-2) — already wired in `customer-card.js`. List mode reuses it.
- `DB.rpc(name, { p_tenant_id, p_payload }, opts)` named-key signature — Phase D used `DB.rpc('create_prescription_draft', { p_tenant_id, p_customer_id, p_kind }, opts)` and confirmed it works.

---

## 10. Pre-Merge Checklist

- [ ] All 32 §3 success criteria pass.
- [ ] All 12 §3a smokes (S1-S12) PASS.
- [ ] Iron Rule 34 §3b closure evidence attached to FOREMAN_REVIEW.
- [ ] Integrity Gate exit 0 or 2 on every commit.
- [ ] Selective `git add` throughout.
- [ ] HEAD pushed to `develop`.
- [ ] No Prizma writes / no schema change / no merge to main.
- [ ] PATH_TO_LIVE M5 Phase E box ticked.
- [ ] M5 SESSION_CONTEXT "what's next" lists M6 (prescriptions UI) as the next module.
- [ ] FOREMAN_REVIEW carries 2 author + 2 executor improvement proposals.

---

*End of M5_UI_CUSTOMER_LIST SPEC. Completes M5's screen layer. Demo only. Chrome MCP closure. No Prizma writes. No merge to main.*
