# SPEC — M5_UI_CUSTOMER_CARD — Customer Card UI (5 tabs)

> **Location:** `modules/Module 5 - Customers/docs/specs/M5_UI_CUSTOMER_CARD/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-23
> **Module:** 5 — Customers
> **Phase:** D — UI Customer Card. First UI screen built on the M5-M9 schema spine.
> **Brief:** `modules/Module 5 - Customers/architecture-brief/M5_UI_CUSTOMER_CARD_BRIEF.md`
> **Mockup (pixel target):** `modules/Module 5 - Customers/architecture-brief/M5_CUSTOMER_CARD_MOCKUP.html` (766 lines, Hybrid+Navy tokens).
> **Daniel-in-loop:** YES. Closure REQUIRES Iron Rule 34 Chrome MCP evidence — non-negotiable.
> **No Prizma writes. No merge to main.**

---

## 0. Pre-Authoring Reality Check

Live probes against project `tsxrrxzmdxaenlvocyit` (prizma-optic), 2026-05-23. Demo tenant `8d8cfa7e-ef58-49af-9702-a862d459cccb`. Probes are READ-only via Supabase MCP `execute_sql`. The SPEC body and §3 criteria reconcile against these probe results — NOT against the mockup's aspirational schema notes.

### Brief read in full

`M5_UI_CUSTOMER_CARD_BRIEF.md` (82 lines) + `M5_CUSTOMER_CARD_MOCKUP.html` (766 lines, 5 tabs, Hybrid+Navy + RTL) + M5 SESSION_CONTEXT + M5_SCHEMA SPEC + M5 db-schema. Daniel pre-seal Q&A captured below in §0.D.

### Probe 1 — view inventory (which surfaces the card consumes)

```sql
SELECT viewname, (SELECT count(*) FROM information_schema.columns
                  WHERE table_schema='public' AND table_name=v.viewname) AS cols
FROM pg_views v WHERE schemaname='public'
  AND (viewname LIKE 'v_customer_%' OR viewname LIKE '%prescription%'
       OR viewname LIKE '%vision%' OR viewname LIKE '%exam%')
ORDER BY viewname;
```

| Surface | Deployed? | Cols | Used in this SPEC |
|---|---|---:|---|
| `v_customer_full` | 🟢 | 34 | Tab 1 body (demographics, address, consents, UTM, lifecycle) |
| `v_customer_for_exam` | 🟢 | 15 | Tab 1 **header** — includes `customer_number_display` composite (`tenant_code`+`branch_code`+lpad(customer_number,5)), `health_fund_code`+`health_fund_name`, `first_name`/`last_name`, `gender`, `birth_date`, `language_code`, `dominant_eye` |
| `v_customer_for_messaging` | 🟢 | 12 | (NOT consumed this SPEC — Tab 1 reads consents from `v_customer_full` directly) |
| `v_customer_prescriptions_summary` (M6-owned) | 🟢 | 14 | Tab 3 list (`kind`, `prescription_number`, `status`, `optometrist_id`, `type_code`, `type_name_he`, `committed_at`, `expires_at`, `r_summary`, `l_summary`, `notes_count`) |
| `v_customer_vision_function_history` | 🔴 NOT DEPLOYED | — | Tab 2 source. **Decision D-T2 below — Tab 2 stub.** |
| `v_exam_for_doctor` | 🟢 | 15 | Considered as Tab 2 fallback; rejected (see D-T2). |
| `v_prescription_history_for_customer` | 🟢 | 9 | Reference only (lighter prescriptions summary; not consumed — `v_customer_prescriptions_summary` has richer cols for the mockup). |

### Probe 2 — RPC signatures (every action the card wires)

```sql
SELECT proname, pg_get_function_identity_arguments(oid) AS args,
       pg_get_function_result(oid) AS returns, prosecdef
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND proname IN (
  'create_prescription_draft','update_customer_display_preferences',
  'assign_to_household','merge_customers','delete_last_unused_customer',
  'allocate_tenant_number','create_customer');
```

| RPC | Args | Returns | Security Definer | Used in this SPEC |
|---|---|---|---|---|
| `create_prescription_draft` | `p_tenant_id uuid, p_customer_id uuid, p_kind text` | `uuid` | ✅ | Tab 3 "+ מרשם חדש" button |
| `update_customer_display_preferences` | `p_tenant_id uuid, p_prefs jsonb` | `void` | ✅ | Tab 5 docs filter persistence (per-tenant settings) |
| `assign_to_household` | `p_tenant_id, p_customer_id, p_household_id` | `void` | ✅ | Tab 1 household action |
| `merge_customers` | `p_tenant_id, p_primary_id, p_secondary_id` | `uuid` | ✅ | Tab 1 merge action |
| `delete_last_unused_customer` | `p_tenant_id, p_customer_id` | `boolean` | ✅ | Tab 1 Iron-Rule-32 delete (double-PIN gated). **Daniel-in-loop on first invocation on demo.** |
| `allocate_tenant_number` | `p_tenant_id, p_entity_kind` | `bigint` | ✅ | NOT directly called by UI — used by `create_customer` (Phase E). |
| `create_customer` | `p_tenant_id, p_payload jsonb` | `jsonb` | ✅ | NOT in this SPEC — create-mode is Phase E. |

All RPCs are SECURITY DEFINER with `authenticated` + `service_role` EXECUTE grants. Block A JWT validation header confirmed at M5_SCHEMA close.

### Probe 3 — demo data state (what the card will render against)

| Surface | Demo rows | Notes |
|---|---:|---|
| `customers` (active) | 19 | 4 migrated leads (lifecycle='lead') + 11 prior + 4 from M5 smoke. The card needs at least 1 customer to render — has plenty. |
| `customer_notes` | 3 | Will render in Tab 1 business/medical sub-tabs. |
| `customer_documents` | 0 | Tab 5 starts empty — the upload smoke creates the first row. |
| `households` | 1 | Tab 1 household action target. |
| `health_funds` | 5 | Lookup table for Tab 1 "קופ"ח" row. |
| `tenant_languages` | 4 | Lookup table for Tab 1 "שפה" row. |
| `tenant_location` (active) | 2 | branch_code source (M1A smoke branches STA, STB). |
| `orders` (M7) | 11 | Tab 4 summary table source. **M7 schema deployed in 2026-05-23 NIGHT_RUN Track 4** — Tab 4 reads from `orders` direct via shared.js helper. |
| `eye_exams` (M6) | 1 | NOT consumed this SPEC (Tab 2 = stub). |
| `prescriptions_glasses` (M6) | 6 | Indirectly via `v_customer_prescriptions_summary`. |

### Probe 4 — `customer_number_display` composite presence

```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='v_customer_for_exam' ORDER BY ordinal_position;
```

`v_customer_for_exam` returns `customer_number_display text` (computed). **The card header reads from `v_customer_for_exam` for the composite display** — no client-side assembly, no patch of width / short_code. If `customer_number_display` looks wrong on demo (Brief F-F-1 caveat), the card renders the value as-is and flags it in FINDINGS — does NOT attempt to fix.

### Probe 5 — storage buckets (Tab 5 storage decision input)

```sql
SELECT name, public FROM storage.buckets ORDER BY name;
```

Existing buckets: `failed-sync-files`, `frame-images`, `media-library`, `supplier-docs`, `tenant-logos`. **No `customer-docs` bucket.** Per Daniel decision D-T5 below, this SPEC creates it.

### Probe 6 — ERP shell + helpers

| Helper / file | Status | Used by the card for |
|---|---|---|
| `js/shared.js` — `getTenantId()`, `escapeHtml()`, `resolveTenant()`, `formatMoney()`, `T` constants (CUSTOMERS, CUSTOMER_NOTES, CUSTOMER_DOCUMENTS, HOUSEHOLDS, HEALTH_FUNDS, TENANT_LANGUAGES, ORDERS, etc.) | 🟢 deployed | Tenant resolution + sanitization + money format |
| `js/shared-ui.js` — `Toast.{success,error,warning,info}`, `Modal.confirm()` | 🟢 deployed | All toast + confirm dialogs |
| `js/pin-modal.js` — PIN auth flow | 🟢 deployed | Iron-Rule-32 double-PIN on `delete_last_unused_customer` + PIN-gated consent/marketing field edits |
| `js/search-select.js` | 🟢 deployed | Search-select widgets (household picker, optometrist picker) |
| `js/shared-field-map.js` — `FIELD_MAP` object | 🟢 deployed; **0 M5 entries** — added by this SPEC per Iron Rule 5 |
| `shared/css/*` (variables, components, layout, forms, modal, toast, table) | 🟢 deployed | Base styling. Hybrid+Navy tokens already canonical in `variables.css`. |
| Existing entrypoints at root | crm.html / inventory.html / settings.html / etc. — 24 HTML entrypoints in `scripts/checks/root-allowlist.json` | New `customers.html` root entrypoint added (D-EP). |

### 0.D — Daniel-in-loop pre-seal decisions (2026-05-23 chat)

Four mockup elements had no deployed source. Resolved via AskUserQuestion round before SPEC seal:

| # | Decision | Implementation |
|---|---|---|
| **D-T2** | **Tab 2 (Vision Function) = stub placeholder.** | Tab 2 renders the mockup's tab nav + a single centered "בקרוב — ייבנה במודול-בדיקות-עיניים" panel via the shared `showComingSoon('vision_function')` handler. No DB calls in Tab 2 code path. Unblocked by a follow-up M6 SPEC that ships `v_customer_vision_function_history`. |
| **D-T5** | **Tab 5 (Docs) = create `customer-docs` storage bucket + wire upload + list + open. NO delete. NO scan.** | This SPEC's scope includes (a) `customer-docs` private bucket creation, (b) storage RLS policies for the bucket using `auth.jwt() ->> 'tenant_id'` matching `(storage.foldername(name))[1]`, (c) Upload action wires `customer_documents` INSERT after Storage `upload()`. Delete + scan deferred to follow-up SPECs. |
| **D-BADGES** | **Wire what we can, blur the rest with ONE shared coming-soon handler + ONE label constant.** | **Live-wired:** Inactive badge ↔ `lifecycle_stage='dormant'`; Locked badge ↔ `is_deleted=true`. **Blurred + click→toast:** VIP, חבר-מועדון (loyalty), Subscription, Queue position. Implementation: ONE `showComingSoon(feature_id)` function + ONE `COMING_SOON_LABEL = 'בקרוב — ייבנה במודול הרלוונטי'` constant. Each blurred badge is documented in §8 with the future module that will light it up. NO scattered placeholder strings. |
| **D-EDIT** | **Edit-mode UX = Header `✎ ערוך` toggle + per-field debounced auto-save on blur (500ms).** | Click `✎ ערוך` → all editable rows become inputs → each field auto-saves on blur with 500ms debounce → footer "✓ נשמר אוטומטית · HH:MM:SS" indicator updates after each save. Marketing/consent fields PIN-gated (re-prompt before write). |
| **D-EP** | **New root entrypoint `customers.html`** added to `scripts/checks/root-allowlist.json` + CLAUDE.md §0.5. | URL pattern: `customers.html?customer_id=<uuid>`. Phase E will reuse this same entrypoint for the list (no `?customer_id` → list mode; with → card mode). |

### Runtime semantics rehearsed (P-AUTHOR-2 from SECURITY_HOTFIX_2)

This SPEC adds no new SECURITY DEFINER functions — all RPCs were sealed by M5_SCHEMA + M6_SCHEMA. The new storage RLS policies for the `customer-docs` bucket use the `auth.jwt() ->> 'tenant_id'` pattern (per Supabase storage convention). Three caller scenarios mentally rehearsed:

| Storage op | Anon caller | Authenticated, wrong tenant | service_role |
|---|---|---|---|
| `customer-docs/{tenant_id}/{customer_id}/{file}` upload | RLS rejects: `auth.jwt() ->> 'tenant_id'` is NULL → policy fails closed. ✅ | RLS rejects: jwt tenant_id ≠ folder prefix tenant_id. ✅ | service_role bypasses storage RLS — but no client uses this path. UI uses authenticated only. ✅ |
| SELECT (open file) | Same — anon has no JWT tenant_id. ✅ | Same. ✅ | Same. ✅ |

### Status-column semantics probe (P-AUTHOR-1 from SECURITY_HOTFIX_3)

The card filters on `customer_documents.category` (enum `customer_document_category`) and `customer_notes.note_type` (enum `customer_note_type`). Both are enums (not strings), so no value-distribution probe is needed at SPEC time. Probed enum values via `pg_enum`:

```sql
SELECT t.typname, e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid
WHERE t.typname IN ('customer_document_category','customer_note_type');
```

`customer_document_category` = `doctor_prescription`, `external_exam`, `health_fund`, `other`. `customer_note_type` = `business`, `medical_q`, `diagnostics`. The mockup filter labels map directly: "מרשם-רופא"=`doctor_prescription`, "בדיקה-חיצונית"=`external_exam`, "קופ"ח"=`health_fund`, "אחר"=`other`. Tab 1 medical sub-tabs: "Medical Q."=`medical_q`, "Diagnostics"=`diagnostics`. Business notes section = `business`.

### CSS layout hypothesis (P-AUTHOR-1 from M1_5_CAT_SIDEBAR_OVERLAP_HOTFIX_2)

The card uses CSS Grid 3-col + 2-col layouts from the mockup. The layout hypothesis is straightforward (the mockup IS the rendered layout). No DOM-state numeric rehearsal needed beyond following the mockup's `grid-template-columns: repeat(3,1fr)` and `1fr 1fr` exactly. RTL handled via `dir="rtl"` on `<html>` + logical CSS properties throughout — no `left`/`right` magic, no fixed positioning on layout children.

### Cross-Reference Check (Step 1.5 — Rule 21 enforcement)

All new names introduced by this SPEC, grep-verified against `docs/GLOBAL_MAP.md` + `docs/FILE_STRUCTURE.md` + `js/shared.js` + `js/shared-field-map.js` + `scripts/checks/root-allowlist.json`:

| New name | Type | Grep result | Resolution |
|---|---|---|---|
| `customers.html` | Root entrypoint | 0 hits in root-allowlist | NEW — add to root-allowlist.json + CLAUDE.md §0.5 |
| `css/customers.css` | Stylesheet | 0 hits | NEW — proceed |
| `js/customer-card-*.js` (file pattern, see §8) | Page JS | 0 hits | NEW — proceed |
| `customer-docs` (storage bucket) | Storage | confirmed absent in Probe 5 | NEW — proceed |
| `showComingSoon()`, `COMING_SOON_LABEL` | JS symbols | 0 hits | NEW — single source in `js/customer-card-coming-soon.js` |
| FIELD_MAP entries for `customers`, `customer_notes`, `customer_documents`, `households` | shared-field-map.js | 0 hits — confirmed missing | NEW per Iron Rule 5 |
| `__cardTrace` (runtime trace window global) | Window global | 0 hits | NEW per Iron Rule 34 (runtime trace surface for Chrome MCP) |

**Cross-Reference Check completed 2026-05-23 against repo + live Supabase: 0 hard collisions / all 7 new names confirmed absent.**

### Lessons applied from prior FOREMAN_REVIEWs

| Source | Lesson | How applied |
|---|---|---|
| `M5_LEADS_MIGRATION/FOREMAN_REVIEW.md` (just-closed) — defaults must match RPC scope | Brief projected total counts (1354) but RPC scoped `is_deleted=false` (1296). | This SPEC's §0 probes capture **demo data state** so success criteria can't drift on a similar premise. |
| `SECURITY_HOTFIX_2/FOREMAN_REVIEW.md` P-AUTHOR-1 | Reference JWT validation header — don't inline. | This SPEC adds no DEFINER functions; storage RLS uses Supabase canonical `auth.jwt()` pattern. |
| `SECURITY_HOTFIX_2/FOREMAN_REVIEW.md` P-AUTHOR-2 | Runtime semantics rehearsal. | §0 Runtime sub-section above. |
| `M1_5_CAT_SIDEBAR_OVERLAP_HOTFIX_2/FOREMAN_REVIEW.md` P-AUTHOR-1 | CSS layout DOM-state rehearsal. | §0 CSS sub-section — mockup IS the layout, RTL logical properties enforced. |
| `M5_SCHEMA/FOREMAN_REVIEW.md` Author Proposal #2 | Baselines as symbols. | Not applicable — no measure-then-bound criteria in this SPEC. |
| Memory `feedback_no_polish_by_validation` | "Looks like criteria" without real wiring = escalation, not pass. | Closure REQUIRES Chrome MCP screenshot + runtime trace + DB-write evidence (Iron Rule 34) — SQL-only is not enough. **D-BADGES** chose blurred+toast rather than fake-static badges precisely to honor this. |
| Memory `feedback_dont_add_unrequested_features` | Don't add unrequested features. | §7 Out-of-Scope is long and explicit. Tab 5 delete, scan, OCR all out. Tab 2 fully out. |
| Memory `feedback_vfv_must_use_not_just_inspect` | Tester must USE the surface, not just inspect. | §3b Chrome MCP closure mandates click+observe DB+screenshot the SUCCESSFUL action result, not just "tab appears". |
| Memory `feedback_probe_biggest_production_tenant` | Probe prod tenant. | This SPEC is demo-only by Brief. Probes ran tenant-agnostic against schema (proj-wide). No Prizma writes. |

---

## 1. Goal

Ship Phase D of Module 5 — a working customer card on demo at `customers.html?customer_id=<uuid>`, 5 tabs rendered from the deployed M5/M6/M7 views + RPCs at mockup-fidelity, with Iron Rule 34 Chrome MCP closure evidence attached — so that the render+action wiring pattern is established for every later M5-M9 screen to copy.

---

## 2. Background & Motivation

The M5 schema spine + M6 prescriptions schema + M7 orders schema + M9 lab schema all closed 🟢 in the 2026-05-22→23 NIGHT_RUN sequence. The Brief's call: "This is the keystone screen. Building it first means the ERP-shell integration pattern for the new spine is proven once." Every later M5-M9 screen (customer list, order screen, checkout, lab KDS) either links to or embeds the customer card. The mockup was sealed (`M5_CUSTOMER_CARD_MOCKUP.html`, 766 lines, Hybrid+Navy + RTL). The 4 mockup-doesn't-settle judgment points were resolved with Daniel before this SPEC seal (see §0.D). No Prizma writes. No merge to main.

---

## 3. Success Criteria (Measurable)

Each criterion has an exact expected value. Executor captures actuals in `EXECUTION_REPORT.md §2`.

| # | Criterion | Expected value | Verify command |
|---|---|---|---|
| 1 | Branch state | On `develop`, only M5/D-EP/global doc paths modified | `git status --short` shows only files listed in §8 |
| 2 | SPEC folder files | 6 files: `SPEC.md` + `EXECUTION_REPORT.md` + `FINDINGS.md` + `TEST_REPORT.md` + `REVIEW.md` + `FOREMAN_REVIEW.md` | `ls modules/Module\ 5\ -\ Customers/docs/specs/M5_UI_CUSTOMER_CARD/` |
| 3 | New entrypoint registered | `customers.html` listed in `scripts/checks/root-allowlist.json` `category_3_html_entrypoints` AND in `CLAUDE.md` §0.5 Category 3 list | both files contain `customers.html` |
| 4 | Storage bucket created | `customer-docs` bucket exists, `public=false`, with 4 RLS policies (anon/authenticated SELECT/INSERT/UPDATE/DELETE all gated by `auth.jwt() ->> 'tenant_id' = (storage.foldername(name))[1]`) | `SELECT name,public FROM storage.buckets WHERE name='customer-docs'` returns 1 row; `SELECT count(*) FROM storage.objects` proves writes succeed for the smoke upload |
| 5 | Page loads on demo | `customers.html?t=demo&customer_id=<a real demo customer uuid>` returns 200 with 0 console errors | Chrome MCP screenshot + `list_console_messages` shows 0 errors |
| 6 | All 5 tabs render | Tab 1/2/3/4/5 all clickable; active-state styling matches mockup | Chrome MCP screenshots × 5 |
| 7 | Tab 1 header | Renders `customer_number_display` composite from `v_customer_for_exam`; renders first_name+last_name; renders age from birth_date; renders phone | Chrome MCP screenshot of header on a real demo customer |
| 8 | Tab 1 body — wired badges | Inactive badge active ↔ `lifecycle_stage='dormant'`; Locked badge active ↔ `is_deleted=true` | Toggle test: create a `dormant` test customer via service_role, refresh card → Inactive lights up; soft-delete test → Locked lights up; revert |
| 9 | Tab 1 body — blurred badges | VIP, חבר-מועדון, Subscription, Queue badges visually muted (opacity ≤ 0.5 + grayscale); clicking ANY of them invokes `showComingSoon(feature_id)` and renders the SAME toast text `COMING_SOON_LABEL` | Chrome MCP runtime trace shows `showComingSoon` fires; screenshot shows toast |
| 10 | Tab 2 stub | Tab 2 panel shows the `COMING_SOON_LABEL` message via `showComingSoon('vision_function')` on first render; no DB calls fired from Tab 2 code path | Chrome MCP network panel shows 0 Supabase requests when Tab 2 is the only-active tab |
| 11 | Tab 3 prescriptions | Renders list from `v_customer_prescriptions_summary` filtered by `customer_id`; filters (הכל/משקפיים/עדשות-מגע/פעילים) work client-side on the fetched array; "+ מרשם חדש" button calls `create_prescription_draft(p_tenant_id, p_customer_id, 'glasses' OR 'contacts')` via shared.js helper, returns new uuid, refreshes the list | Smoke T7 (§3a) PASS — Chrome MCP runtime trace + DB query showing new `prescriptions_glasses` row |
| 12 | Tab 4 orders | Renders order summary table from `orders` joined to `sub_orders` (count + total + status pill); "+ הזמנה חדשה" + "→ פתח מסך-M7" buttons invoke `showComingSoon('orders_m7_ui')` (M7 UI not built yet) | Chrome MCP screenshot of Tab 4 against demo's 11 orders |
| 13 | Tab 5 docs | Renders list from `customer_documents` filtered by `customer_id`; filters by `category` work client-side; upload button accepts PDF/JPG/PNG ≤10MB, uploads to `customer-docs/{tenant_id}/{customer_id}/{document_id}.{ext}`, inserts `customer_documents` row, refreshes list | Smoke T9 (§3a) PASS — Chrome MCP screenshot of uploaded doc in list + DB query showing row |
| 14 | Edit-mode UX | `✎ ערוך` toggles all editable rows to inputs; field blur after change → 500ms debounce → DB `UPDATE` via shared.js helper → footer `✓ נשמר אוטומטית · HH:MM:SS` updates; PIN-gated for `crm_marketing_consent` / `crm_operational_consent` / `customer_marketing_consent` / `customer_operational_consent` | Smoke T3 PASS — Chrome MCP runtime trace shows debounce→save→toast in order |
| 15 | Iron Rule 7 (API abstraction) | No `sb.from(...)` calls inside the new card JS files; all DB access via shared.js helpers (`fetchAll` etc.) | `grep -n "sb\.from" js/customer-card-*.js modules/customers/**/*.js` → 0 hits |
| 16 | Iron Rule 8 (sanitization) | No `innerHTML` with user data; only `escapeHtml()` or `textContent` | `grep -n "innerHTML" js/customer-card-*.js` → only with static template strings or `escapeHtml(...)` interpolation; reviewer audits |
| 17 | Iron Rule 12 (file size) | Every new JS file ≤300 lines (target) / ≤350 lines (hard cap) | `wc -l js/customer-card-*.js modules/customers/**/*.js` → all ≤350 |
| 18 | Iron Rule 22 (defense-in-depth) | Every `.select()` includes `.eq('tenant_id', getTenantId())` even though RLS enforces; every `.insert()`/`.upsert()` includes `tenant_id: getTenantId()` | Reviewer audits all 5 tab files |
| 19 | Iron Rule 5 (FIELD_MAP) | `js/shared-field-map.js` gets entries for `customers`, `customer_notes`, `customer_documents`, `households`, `health_funds`, `tenant_languages` (Hebrew labels for every field the card edits) | `grep -E "^\s+(customers|customer_notes|customer_documents|households|health_funds|tenant_languages):" js/shared-field-map.js` → 6 keys |
| 20 | Iron Rule 21 (no duplicates) | Card reuses `Toast.*`, `Modal.confirm`, PIN flow from `pin-modal.js`, `search-select.js` widgets — does not reinvent | Reviewer confirms via grep |
| 21 | Iron Rule 34 — Chrome MCP closure | (a) 5 screenshots (one per tab) against live demo, (b) runtime trace via `window.__cardTrace` showing ≥1 wired action's events in correct order, (c) DB-query evidence the action produced the expected demo write, (d) mockup-vs-live side-by-side fidelity check (material drift = finding, not pass) | All 4 artifacts attached in `FOREMAN_REVIEW.md` §"Chrome MCP closure evidence" |
| 22 | Iron Rule 31 — Integrity gate | exit 0 or 2 | `npm run verify:integrity; echo $?` → 0 or 2 |
| 23 | Iron Rule 32 — Destructive Ops | `## Destructive Operations` declares ONLY the bucket-creation + storage-policy additions + the M5 SESSION_CONTEXT replace (governance file). No DROP/TRUNCATE/DELETE-without-tenant-scope | gate (`scripts/checks/destructive-ops-declared.mjs`) passes |
| 24 | Backups discipline (Working Rule 9.9) | Backup folder `modules/Module 5 - Customers/backups/M5D_2026-05-23/` exists with CLAUDE.md + M5 SESSION_CONTEXT/MODULE_SPEC/MODULE_MAP/ROADMAP/CHANGELOG/db-schema.sql + js/shared.js + js/shared-field-map.js (8 files) BEFORE any modification | `ls modules/Module\ 5\ -\ Customers/backups/M5D_2026-05-23/` → 8 files. Note: `**/backups/` is gitignored; verify with `ls`, not `git log`. |
| 25 | No Prizma writes | `customer_documents` rows on Prizma after the run = 0 (smoke runs on demo only); `customer-docs/{prizma_tenant_id}/...` storage object count = 0 | `SELECT count(*) FROM customer_documents WHERE tenant_id='6ad0781b-...'` → 0; storage probe → 0 |
| 26 | No merge to main | `main` branch HEAD unchanged from session start | `git rev-parse main` returns the same hash before + after |
| 27 | M5 docs updated | M5 ROADMAP (Phase D ⬜→✅), SESSION_CONTEXT, CHANGELOG, MODULE_MAP all updated | Reviewer audits |
| 28 | GLOBAL_MAP additive merge | `docs/GLOBAL_MAP.md` gets a new M5-UI section listing the card's entrypoint + 6 page JS files + the `showComingSoon` + `__cardTrace` symbols; ADDITIVE only (no removals) | `git diff develop -- docs/GLOBAL_MAP.md` shows only `+` lines |
| 29 | Advisors clean | No NEW HIGH/ERROR advisor lints introduced by the storage policies + bucket | `node scripts/audit/advisors-for-objects.mjs --buckets customer-docs` returns 0 new HIGH/ERROR |
| 30 | URL-only entry | Card opens via `customers.html?t=demo&customer_id=<uuid>`; if `customer_id` is missing → renders an empty-state with link to "Phase E — list view בקרוב" (no list scaffolding) | Chrome MCP test of bare `customers.html?t=demo` shows empty-state |

### 3a. Functional smoke (Chrome MCP — mandatory closure)

Each test runs on demo tenant via the deployed Chrome MCP harness. Each test captures: (i) screenshot of post-action UI, (ii) runtime-trace excerpt from `window.__cardTrace`, (iii) the DB query result confirming the write/state-change, (iv) browser console message dump (must show 0 errors).

| # | Case | Setup | Action | Assertion |
|---|---|---|---|---|
| T1 | Card boot | Open `customers.html?t=demo&customer_id=<demo customer with lifecycle='active'>` | Wait for spinner to clear | 5 tab buttons render; Tab 1 active; header has composite customer_number_display; 0 console errors |
| T2 | Header composite | (T1 setup) | Inspect header DOM | `customer_number_display` matches `v_customer_for_exam` SELECT for that customer_id (string match) |
| T3 | Edit-mode auto-save | (T1) | Click `✎ ערוך` → click `נייד` row → input appears → change phone to new test value → blur | (a) `window.__cardTrace` records `edit_start`,`field_blur`,`debounce_fired`,`update_sent`,`update_resolved`,`autosave_indicator_updated` in that order; (b) `SELECT phone FROM customers WHERE id=<id>` returns the new value; (c) revert phone before T4 |
| T4 | Wired badge — Inactive | Via service_role SQL: `UPDATE customers SET lifecycle_stage='dormant' WHERE id=<test_id>`. Refresh card. | Tab 1 badge "Inactive" is active state (checked/lit). Revert: `UPDATE ... SET lifecycle_stage='active' WHERE id=<test_id>` |
| T5 | Wired badge — Locked | Via service_role: `UPDATE customers SET is_deleted=true WHERE id=<test_id>`. Refresh. | Tab 1 badge "Locked" lights up. Revert. |
| T6 | Blurred badge — coming-soon toast | Click VIP badge → click חבר-מועדון → click Subscription → click Queue | All 4 invoke `showComingSoon(*)` with their feature_id; toast shows the SAME `COMING_SOON_LABEL` text; runtime trace records each `showComingSoon` call |
| T7 | Tab 3 + RPC | Switch to Tab 3 | List renders from `v_customer_prescriptions_summary`. Click "+ מרשם חדש" → choose `glasses` → RPC fires → list refreshes → new row visible with status='draft' (M6 default) | (a) trace records `create_prescription_draft_called`,`create_prescription_draft_resolved` in order; (b) `SELECT id FROM prescriptions_glasses WHERE customer_id=<id> ORDER BY created_at DESC LIMIT 1` returns a row created within the last 30s |
| T8 | Tab 4 orders | Switch to Tab 4 | Order summary table renders demo's 11 orders. Click "+ הזמנה חדשה" → toast = `COMING_SOON_LABEL` (M7 UI not built); no DB write |
| T9 | Tab 5 docs upload | Switch to Tab 5 | Drag a small test PDF (≤ 100 KB) onto the upload zone → category=`other`, description="smoke T9" | (a) trace records `storage_upload_called`,`storage_upload_resolved`,`customer_documents_insert_called`,`refresh_list`; (b) `SELECT count(*) FROM customer_documents WHERE customer_id=<id>` = 1; (c) storage probe shows `customer-docs/{demo_tenant_id}/{customer_id}/<uuid>.pdf` exists; (d) the row appears in the rendered list. Cleanup: delete the storage object + DELETE the customer_documents row via service_role at smoke close. |
| T10 | Cross-tenant guard | Open `customers.html?t=demo&customer_id=<a real PRIZMA customer uuid>` | RLS returns empty / not-found state; no Prizma data leaks into the rendered card; console shows the 0-row response, no error toast spam |
| T11 | Mockup-vs-live fidelity | Side-by-side compare 5 tabs against mockup screenshot | Material drift (color, layout, missing element) → list as finding in REVIEW; pixel-perfect not required, structural fidelity required |

### 3b. Iron Rule 34 closure evidence — REQUIRED in FOREMAN_REVIEW.md

The SPEC does NOT close 🟢 without ALL of:

1. **5 Chrome MCP screenshots** (one per tab) against live demo data, embedded or path-referenced in `FOREMAN_REVIEW.md` §"Chrome MCP closure evidence".
2. **Runtime trace** — at minimum one full action's `window.__cardTrace` array dump in the FOREMAN_REVIEW (e.g., the T3 edit-mode auto-save trace OR the T7 create_prescription_draft trace).
3. **DB-query evidence** — the SELECT result demonstrating the action produced the expected DB write (e.g., `SELECT phone FROM customers WHERE id=<id>` after T3; `SELECT id FROM prescriptions_glasses ... LIMIT 1` after T7).
4. **Mockup-vs-live fidelity check** — explicit pass/fail per tab, with any drift documented.

Per memory `feedback_no_polish_by_validation` and `feedback_vfv_must_use_not_just_inspect`: SQL-only verification is necessary but NOT sufficient. "Already meets criteria" without shipping real wiring code = escalation, not silent 🟢.

### 3c. Daniel-in-loop checkpoints (pauses)

The executor MAY proceed autonomously through everything except these explicit Daniel-pause points:

| # | Pause trigger | What the executor does | What Daniel decides |
|---|---|---|---|
| C1 | First-ever `delete_last_unused_customer` invocation on demo (Iron Rule 32 path). | Writes `modules/Module 5 - Customers/escalations/{ISO_TS}_delete_unused_demo.md` describing the customer_id + the dependency check result + the double-PIN flow ready to fire. Emits ONE Hebrew line. HALT. | Whether to proceed with the delete on demo (one-shot operation). |
| C2 | A novel UI/UX ambiguity surfaces mid-build that the mockup + the 4 D-* decisions don't settle. | Same — escalation file + Hebrew line + HALT. | The new judgment call. |
| C3 | Smoke T10 (cross-tenant guard) returns Prizma data into the demo session. | Same. CRITICAL severity. | Investigate / halt the whole SPEC. |

Routine work (writing JS, wiring RPCs, rendering tabs, running smokes that match expected) is autonomous. Per Bounded Autonomy: stop on deviation, not on success.

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read any file in the repo; run read-only SQL freely (Level 1).
- Apply storage DDL via Supabase MCP `apply_migration` (the bucket + 4 storage policies — see §9 Step 1).
- Create `customers.html` at repo root + new CSS/JS files per §8.
- Selective `git add` by filename (NEVER `git add -A` / `git add .` / `git commit -am`). The repo has pre-existing untracked files from other sessions — leave them alone.
- Update `js/shared-field-map.js` (add 6 M5 keys to FIELD_MAP per Iron Rule 5).
- Update `js/shared.js` ONLY if absolutely required (T constants are already there from M5_SCHEMA). The card SHOULD NOT need new T constants — verify the existing ones cover all tables consumed.
- Update `scripts/checks/root-allowlist.json` (add `customers.html`).
- Update `CLAUDE.md` §0.5 Category 3 list (add `customers.html`). This is a governance-file edit — declare in Destructive Operations.
- Update `docs/GLOBAL_MAP.md` additively (new M5-UI section).
- Update `docs/FILE_STRUCTURE.md` with new file paths.
- Update module-level docs: SESSION_CONTEXT, CHANGELOG, MODULE_MAP, ROADMAP.
- Run `npm run verify:integrity` and `node scripts/verify.mjs --staged` before every commit.
- Run Chrome MCP commands (navigate, screenshot, list_console_messages, evaluate_script, take_snapshot, fill, click) on `http://localhost:3000/customers.html?t=demo&customer_id=<uuid>` — the local ERP stack must be up (see §10 Dependencies).
- Capture pre-flight `git status --porcelain | grep '^??'` count before doing anything; refer back at every commit to confirm no untracked work was lost.
- Commit and push to `develop` per §9 Commit Plan.

### What REQUIRES stopping and reporting

- Daniel-in-loop checkpoint fires (§3c C1, C2, or C3).
- Smoke T1-T11 fails — escalate, do not retry blindly.
- Iron Rule 32 destructive-ops gate flags an op not declared below.
- A novel name collision (Step 1.5 sweep missed something).
- `npm run verify:integrity` returns exit 1.
- Local ERP stack on `http://localhost:3000` fails to start or returns 5xx on the new entrypoint.
- Any `sb.from(...)` invocation slips into a new card JS file (Iron Rule 7 violation) — even if "it works".
- Any field that should be PIN-gated saves without a PIN prompt (Iron Rule 8 violation).
- Material mockup-vs-live drift (a tab is missing, an entire section is absent, color tokens wrong) — escalate, fix, then re-screenshot.

---

## 5. Stop-on-Deviation Triggers (beyond CLAUDE.md §9 globals)

- If `v_customer_for_exam.customer_number_display` returns NULL or a malformed string for the demo customer being tested → STOP, file a FINDING under F-F-1 (Brief's open caveat), do NOT patch the view here.
- If clicking ANY of the 4 blurred badges fires a different code path than `showComingSoon` (e.g., a per-badge handler) → STOP. The discipline is ONE handler. The Reviewer rejects scattered placeholder code.
- If a new edit-mode save lands a Prizma-customer UPDATE → STOP (Brief: no Prizma writes; defense-in-depth `tenant_id` filter must catch this).
- If Chrome MCP screenshots show a tab fully empty when demo has data for it → STOP (Tab 3/4 must render demo rows; an empty tab = bug, not pass).
- If the runtime trace `window.__cardTrace` doesn't expose the expected events for an action → STOP. The trace IS the closure evidence per Iron Rule 34.
- If `customer-docs` bucket creation succeeds but storage RLS policies are missing → STOP. A public-by-default bucket on a tenant-data table is a Sentinel Mission-6 trigger.

---

## 6. Rollback Plan

This SPEC's writes are:

1. **Code:** all additive (new files + ADD entries to existing files like shared-field-map.js, root-allowlist.json, CLAUDE.md §0.5, GLOBAL_MAP.md). Rollback = `git reset --hard <START_COMMIT>` from the pre-SPEC commit hash captured in EXECUTION_REPORT.md §1.
2. **Storage:** `customer-docs` bucket creation + 4 RLS policies. Idempotent at re-run (CREATE BUCKET ... IF NOT EXISTS pattern). If a follow-up SPEC needs the bucket gone: declare DROP in that SPEC's §Destructive Operations + delete objects first.
3. **DB:** ONLY the smoke INSERT into `customer_documents` (T9) which is cleaned up at smoke close. No other DML.

If smoke fails partway → the executor leaves the partial code + storage bucket + cleans up the smoke `customer_documents` row + writes FINDINGS + escalates. The bucket itself can stay (idempotent) for the re-run.

---

## Destructive Operations

This SPEC declares the following non-DROP destructive-class operations per Iron Rule 32:

1. **Storage bucket CREATE** for `public.storage.buckets` row `customer-docs` (private). Additive — no DROP.
2. **Storage policies CREATE** — 4 policies on `storage.objects` for the `customer-docs` bucket (SELECT/INSERT/UPDATE/DELETE all tenant-gated via `auth.jwt() ->> 'tenant_id'`). Additive.
3. **In-place edit of CLAUDE.md §0.5** Category 3 entrypoints list to add `customers.html`. Additive line insertion; no removal.
4. **In-place edit of `scripts/checks/root-allowlist.json`** to add `customers.html`. Additive line insertion.
5. **In-place edit of `js/shared-field-map.js`** (FIELD_MAP) to add 6 new M5 keys. Additive.
6. **In-place edit of `docs/GLOBAL_MAP.md`** — additive only.
7. **In-place edit of `docs/FILE_STRUCTURE.md`** — additive only.
8. **Replace of `modules/Module 5 - Customers/docs/SESSION_CONTEXT.md`** + `CHANGELOG.md` + `MODULE_MAP.md` + `MODULE_5_ROADMAP.md` (Phase D ⬜→✅) — these are state files; replace-with-newer is the convention.

**NO DROP** of any table, column, constraint, view, function, file, or storage bucket. **NO TRUNCATE.** **NO DELETE** from any table outside the smoke T9 cleanup (single-row, customer_documents, by id, demo-tenant-scoped). **NO `git reset --hard`** / **NO force push** / **NO main branch operations.**

If the executor encounters a need for any operation not in this list → STOP, write escalation file, halt the chain.

---

## 7. Out of Scope (explicit)

- **Customer LIST view + create-mode UI.** Phase E. This SPEC builds the CARD only. The URL pattern `customers.html?customer_id=<uuid>` is the only valid entry. A bare `customers.html?t=demo` (no `customer_id`) renders an empty-state pointing to "Phase E — list בקרוב" but builds no list scaffolding.
- **Tab 2 (Vision Function) body.** D-T2 = stub. The 24-row vision-function test grid is deferred to a follow-up M6 SPEC that ships `v_customer_vision_function_history`.
- **Tab 5 (Docs) — delete + scan actions.** Per D-T5 — only upload + list + open. Delete is deferred. Scan (OCR pipeline) is deferred.
- **Tab 1 — VIP / חבר-מועדון / Subscription badges + Queue (M14) block.** Per D-BADGES — visually blurred + `showComingSoon` toast only. Real wiring deferred to: tag system (future M5 follow-up or shared tag module), loyalty (M13), subscription (M-future), Queue (M14).
- **Tab 4 — full M7 orders screen.** Per Brief — Tab 4 shows summary banner + summary table only. "+ הזמנה חדשה" + "→ פתח מסך-M7" buttons → coming-soon toast (M7 UI not built yet).
- **Tab 3 "פתח ב-M6" button → full M6 prescription editor screen.** Out of scope — this button → coming-soon toast (M6 UI not built yet either).
- **`customer_number_display` width fix / `short_code` backfill (Brief F-F-1).** The card renders `v_customer_for_exam.customer_number_display` AS-IS. If wrong, flag as finding, do NOT patch.
- **OpticPlus migration UI changes.** Separate Phase C SPEC.
- **Any M6 / M7 / M8 / M9 UI surface** beyond what the card directly consumes (tab-3 reads `v_customer_prescriptions_summary`, tab-4 reads `orders`).
- **`shared.js` T-constants additions** — all needed constants exist from M5_SCHEMA + M6_SCHEMA + M7_SCHEMA closes. Verify; do NOT add.
- **CLAUDE.md changes beyond §0.5 Category 3 entrypoints list.** No new Iron Rules, no protocol changes.
- **Merge to main** — Daniel-only.
- **Prizma writes** of any kind.

---

## 8. Expected Final State

### New files

#### Root entrypoint (1)
- `customers.html` — full page shell. ≤ 250 lines. Loads shared/css/* + new `css/customers.css` + Supabase SDK + shared.js + shared-ui.js + pin-modal.js + search-select.js + shared-field-map.js + new page JS files. RTL `dir="rtl"`. Sidebar nav reused from existing ERP shell (mirror the pattern in `crm.html` / `inventory.html` — DO NOT reinvent).

#### Stylesheet (1)
- `css/customers.css` — page-specific styles. ≤ 300 lines. Uses Hybrid+Navy tokens from `shared/css/variables.css` (already canonical) — no new tokens defined. Logical CSS properties (padding-inline, margin-inline, etc.) for RTL. Mockup `<style>` block is the reference; map verbatim but with semantic class names (`.cust-card-header`, `.cust-card-tabs`, `.cust-tab-pane`, etc.).

#### Page JS files (8 — split per Iron Rule 12, ≤300/350 each)

Final file location decided by executor in Step 1.5 — either flat under `js/` (matching `js/shared.js`, `js/pin-modal.js` convention) or under `modules/customers/` (matching the `modules/` folder convention). Executor documents the choice in EXECUTION_REPORT.md and adds the paths to `docs/FILE_STRUCTURE.md`. **The set:**

- `customer-card.js` (~250 lines) — page boot, URL param parse (`customer_id`), tenant resolution, tab state machine, mount/unmount per tab, `window.__cardTrace` setup (Iron Rule 34 runtime trace surface).
- `customer-card-header.js` (~200 lines) — header (avatar, name+age, phone, pills, action buttons), wired badges (Inactive / Locked), blurred badges click handlers (delegating to `showComingSoon`).
- `customer-card-tab-details.js` (~330 lines) — Tab 1 body: 3-col + 2-col blocks, edit-mode toggle, per-field debounced save, business notes + medical notes (sub-tabs Q+Diagnostics), bottom flags, queue block (blurred). PIN-gated saves for the 4 consent flags.
- `customer-card-tab-vision.js` (~80 lines) — Tab 2 STUB. Renders the tab nav + a centered panel via `showComingSoon('vision_function')`. ZERO DB calls — verifiable via Chrome MCP network panel.
- `customer-card-tab-prescriptions.js` (~280 lines) — Tab 3: fetch `v_customer_prescriptions_summary` + client-side filters + "+ מרשם חדש" button → `create_prescription_draft` RPC + per-row "פתח ב-M6" → coming-soon + "📦 הזמנה" → coming-soon (M7 not built).
- `customer-card-tab-orders.js` (~200 lines) — Tab 4: fetch `orders` + `sub_orders` for the customer, render the banner + summary table; all CTAs → `showComingSoon('orders_m7_ui')`.
- `customer-card-tab-docs.js` (~330 lines) — Tab 5: fetch `customer_documents` + filters + upload widget (drag/drop or click) → Storage `upload()` to `customer-docs/{tenant_id}/{customer_id}/{document_id}.{ext}` + `customer_documents` INSERT + refresh list.
- `customer-card-coming-soon.js` (~60 lines) — ONE shared `showComingSoon(feature_id)` function + ONE `COMING_SOON_LABEL` constant + ONE optional `COMING_SOON_REGISTRY` (id → future-module map) used for the FINDINGS doc + (optionally) per-id debug log. Reused everywhere the card touches deferred functionality.

**Sum check:** 8 JS files × ~200 average ≈ 1,600 lines of new page JS. None should exceed 350. If any does, split further.

### Modified files (additive only)

- `scripts/checks/root-allowlist.json` — append `"customers.html"` to `files.category_3_html_entrypoints`. Bump `_last_updated` to `2026-05-23`.
- `CLAUDE.md` §0.5 — add `customers.html` to Category 3 list.
- `js/shared-field-map.js` — add 6 new FIELD_MAP entries (per Iron Rule 5): `customers`, `customer_notes`, `customer_documents`, `households`, `health_funds`, `tenant_languages`. Hebrew labels per the mockup column captions.
- `docs/GLOBAL_MAP.md` — additive new section "M5 — Customer Card UI": entrypoint + JS file list + `showComingSoon` + `__cardTrace` + the 8 wired actions.
- `docs/FILE_STRUCTURE.md` — add new file paths in the appropriate sections.
- `modules/Module 5 - Customers/MODULE_5_ROADMAP.md` — Phase D ⬜ → ✅.
- `modules/Module 5 - Customers/docs/SESSION_CONTEXT.md` — Phase D close status, smoke results summary, Tab 2 follow-up TECH_DEBT pointer.
- `modules/Module 5 - Customers/docs/CHANGELOG.md` — Phase D entry with commit hashes.
- `modules/Module 5 - Customers/docs/MODULE_MAP.md` — add the new card UI surface.

### Storage state

- New private bucket `customer-docs` (`public=false`).
- 4 storage policies on `storage.objects` filtered by `bucket_id='customer-docs'`:
  - `customer_docs_select_tenant` — `bucket_id='customer-docs' AND auth.jwt() ->> 'tenant_id' = (storage.foldername(name))[1]`
  - `customer_docs_insert_tenant` — same condition
  - `customer_docs_update_tenant` — same
  - `customer_docs_delete_tenant` — same (UI doesn't expose delete this SPEC; the policy exists for symmetry and a future delete SPEC; service_role bypasses policies anyway)

### DB state

- `customer_documents` Prizma rows: 0 (unchanged).
- `customer_documents` demo rows: 0 → 0 (smoke T9 INSERTs 1 row, cleaned up at smoke close).
- `customers` Prizma rows: unchanged.
- `customers` demo rows: unchanged (no INSERTs; only smoke UPDATEs reverted within T3/T4/T5).
- All other M5/M6/M7 tables: unchanged.

### Docs updated (MUST include)

- M5 ROADMAP — Phase D ⬜→✅.
- M5 SESSION_CONTEXT — Phase D closed; Tab 2 follow-up listed.
- M5 CHANGELOG — Phase D entry.
- M5 MODULE_MAP — card surface added.
- `docs/GLOBAL_MAP.md` — additive M5-UI section.
- `docs/FILE_STRUCTURE.md` — new files added.
- `CLAUDE.md` §0.5 — `customers.html` listed.
- `scripts/checks/root-allowlist.json` — updated.
- This SPEC folder — 6 files (SPEC.md + EXECUTION_REPORT.md + FINDINGS.md + TEST_REPORT.md + REVIEW.md + FOREMAN_REVIEW.md).

---

## 9. Build Order

The executor follows this order. Each step is one logical unit; commit grouping in §9.1.

### Step 1 — Storage bucket + policies (Supabase MCP `apply_migration`)

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('customer-docs','customer-docs',false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY customer_docs_select_tenant ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id='customer-docs' AND
    auth.jwt() ->> 'tenant_id' = (storage.foldername(name))[1]
  );

CREATE POLICY customer_docs_insert_tenant ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id='customer-docs' AND
    auth.jwt() ->> 'tenant_id' = (storage.foldername(name))[1]
  );

CREATE POLICY customer_docs_update_tenant ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id='customer-docs' AND
    auth.jwt() ->> 'tenant_id' = (storage.foldername(name))[1]
  );

CREATE POLICY customer_docs_delete_tenant ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id='customer-docs' AND
    auth.jwt() ->> 'tenant_id' = (storage.foldername(name))[1]
  );
```

Migration name: `M5D_01_customer_docs_bucket`. Capture name + apply timestamp in `MIGRATION.md` (optional file; if used, list it in §8 too).

### Step 2 — Backup snapshot (Working Rule 9.9)

Before any code change, copy these 8 files into `modules/Module 5 - Customers/backups/M5D_2026-05-23/`:
`CLAUDE.md`, M5 `SESSION_CONTEXT.md` + `MODULE_SPEC.md` + `MODULE_MAP.md` + `MODULE_5_ROADMAP.md` + `CHANGELOG.md` + `db-schema.sql`, `js/shared.js`, `js/shared-field-map.js`. Note: `**/backups/` is gitignored; verify with `ls`, not `git log`.

### Step 3 — Root entrypoint registration

Update `scripts/checks/root-allowlist.json` (add `customers.html` to `category_3_html_entrypoints`, bump `_last_updated`) AND `CLAUDE.md` §0.5 Category 3 list. These two MUST stay in sync per CLAUDE.md §0.5 "Maintaining the rule".

### Step 4 — Stylesheet

Create `css/customers.css`. Hybrid+Navy tokens from `shared/css/variables.css` only — no new tokens.

### Step 5 — coming-soon utility (the discipline anchor)

Create `js/customer-card-coming-soon.js` FIRST — every other tab/handler depends on it. Defines `COMING_SOON_LABEL` constant + `showComingSoon(feature_id)` function + `COMING_SOON_REGISTRY` map. Single source of truth; no scattered placeholder strings.

### Step 6 — Page shell + Tab 1 (Details)

Create `customers.html` + `customer-card.js` + `customer-card-header.js` + `customer-card-tab-details.js`. At this checkpoint, the page should LOAD against demo and render Tab 1 (header + body + notes + flags) on `?customer_id=<uuid>`. Run Chrome MCP smoke T1+T2+T3+T4+T5+T6.

### Step 7 — Tabs 2 + 4

Create `customer-card-tab-vision.js` (stub) + `customer-card-tab-orders.js`. Smoke T8.

### Step 8 — Tab 3 (Prescriptions)

Create `customer-card-tab-prescriptions.js` with `+ מרשם חדש` action → `create_prescription_draft` RPC. Smoke T7.

### Step 9 — Tab 5 (Docs)

Create `customer-card-tab-docs.js` with upload-list-open. Smoke T9.

### Step 10 — FIELD_MAP + GLOBAL_MAP + FILE_STRUCTURE

Update `js/shared-field-map.js` (6 new keys). Update `docs/GLOBAL_MAP.md` + `docs/FILE_STRUCTURE.md` additively.

### Step 11 — Cross-tenant + console-error sweep

Run Chrome MCP smoke T10 + T11.

### Step 12 — Module docs

Update M5 ROADMAP + SESSION_CONTEXT + CHANGELOG + MODULE_MAP.

### Step 13 — Reviewer dispatch

When all 30 §3 criteria + 11 smokes pass, hand off to `opticup-reviewer` which writes `REVIEW.md`. Reviewer audits Iron Rule 7 (no `sb.from()`), Iron Rule 8 (no `innerHTML`), Iron Rule 12 (file sizes), Iron Rule 22 (defense-in-depth `tenant_id`), Iron Rule 34 (Chrome MCP evidence presence).

### Step 14 — Foreman review

After REVIEW.md, opticup-strategic (Foreman) reads EXECUTION_REPORT + FINDINGS + REVIEW + spot-checks Chrome MCP evidence, writes FOREMAN_REVIEW.md with the closure verdict + 2 author-skill + 2 executor-skill improvement proposals + Integration Ceremony checklist.

### 9.1 Commit Plan

Selective `git add` by filename throughout. Pre-existing untracked files (campaign / M4 audit drafts) are NOT touched.

- Commit 1: `feat(m5d): add customer-docs storage bucket + RLS policies` — Step 1 outputs (MIGRATION.md if created).
- Commit 2: `feat(m5d): register customers.html entrypoint + root-allowlist` — `customers.html` stub, `scripts/checks/root-allowlist.json`, `CLAUDE.md`.
- Commit 3: `feat(m5d): add customer-card page shell + Tab 1 (Details)` — `css/customers.css`, `customer-card-coming-soon.js`, `customer-card.js`, `customer-card-header.js`, `customer-card-tab-details.js`.
- Commit 4: `feat(m5d): add Tabs 2 + 4 (Vision stub + Orders)` — `customer-card-tab-vision.js`, `customer-card-tab-orders.js`.
- Commit 5: `feat(m5d): add Tab 3 (Prescriptions) + create_prescription_draft wiring` — `customer-card-tab-prescriptions.js`.
- Commit 6: `feat(m5d): add Tab 5 (Docs) upload + list` — `customer-card-tab-docs.js`.
- Commit 7: `chore(m5d): FIELD_MAP entries + GLOBAL_MAP/FILE_STRUCTURE additive` — `js/shared-field-map.js`, `docs/GLOBAL_MAP.md`, `docs/FILE_STRUCTURE.md`.
- Commit 8: `docs(m5d): close Phase D — ROADMAP + SESSION_CONTEXT + CHANGELOG + MODULE_MAP` — M5 module docs.
- Commit 9: `chore(spec): close M5_UI_CUSTOMER_CARD with retrospective` — EXECUTION_REPORT.md + FINDINGS.md + TEST_REPORT.md (executor) + REVIEW.md (reviewer) + FOREMAN_REVIEW.md (foreman).

---

## 10. Dependencies / Preconditions

- M5_SCHEMA closed 🟢 — verified.
- M6_SCHEMA closed 🟢 — `v_customer_prescriptions_summary` + `create_prescription_draft` deployed — verified Probe 1+2.
- M7 orders schema deployed (Track 4 of 2026-05-23 NIGHT_RUN) — `orders` + `sub_orders` tables verified Probe 3 (11 demo rows). If M7 schema is somehow rolled back between SPEC seal and execution → STOP, escalate.
- Local ERP stack on `http://localhost:3000` (per `docs/AUTONOMOUS_MODE.md` + `scripts/start-local.ps1`) must be up before any Chrome MCP smoke runs. The page is served via the existing static-file route — no build step.
- Demo tenant resolution working — `?t=demo` is the canonical handoff per `js/shared.js` `resolveTenant()`.
- Chrome MCP harness available (the toolset prefixed `mcp__chrome-devtools__*`).
- A real demo customer's `id` (uuid) must be captured by the executor before smoke runs — pick the first non-deleted, non-lead-lifecycle row from `SELECT id FROM customers WHERE tenant_id='8d8cfa7e-...' AND is_deleted=false ORDER BY created_at LIMIT 1`.

---

## 11. Lessons Already Incorporated

Reproduced from §0 with the explicit "APPLIED / NOT APPLICABLE" verdict:

- FROM `M5_LEADS_MIGRATION/FOREMAN_REVIEW.md` (2026-05-23) → "scope drift on `is_deleted=false`-vs-total" → APPLIED in §0 Probe 3 (demo data state pinned with exact row counts).
- FROM `SECURITY_HOTFIX_2/FOREMAN_REVIEW.md` P-AUTHOR-1 → "reference JWT validation header" → NOT APPLICABLE (no new SECURITY DEFINER functions; storage RLS uses Supabase canonical pattern, documented in §0 Runtime sub-section).
- FROM `SECURITY_HOTFIX_2/FOREMAN_REVIEW.md` P-AUTHOR-2 → "Runtime semantics rehearsal" → APPLIED in §0 Runtime sub-section (storage RLS three-caller rehearsed).
- FROM `M1_5_CAT_SIDEBAR_OVERLAP_HOTFIX_2/FOREMAN_REVIEW.md` P-AUTHOR-1 → "CSS layout DOM-state rehearsal" → APPLIED in §0 CSS sub-section.
- FROM `M5_SCHEMA/FOREMAN_REVIEW.md` Author Proposal #2 → "Baselines as symbols" → NOT APPLICABLE (no measure-then-bound criteria).
- FROM `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` Author Proposal #1 → "Shared Edit Block for multi-file identical edits" → NOT APPLICABLE (no identical multi-file edits; each JS file has its own scope).
- FROM `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #1 → "## N. heading convention (no §)" → APPLIED throughout this SPEC.
- FROM Memory `feedback_no_polish_by_validation` → "looks like criteria without wiring = escalation" → APPLIED in D-BADGES (blurred+toast not fake-static) AND §3b (Chrome MCP evidence mandatory).
- FROM Memory `feedback_vfv_must_use_not_just_inspect` → "Tester USES the surface, not just inspects" → APPLIED in §3a smoke T1-T9 (every action click + DB-write verification, not just "tab appears").
- FROM Memory `feedback_dont_add_unrequested_features` → "don't add unrequested features" → APPLIED in §7 (extensive Out-of-Scope list).
- FROM Memory `feedback_probe_biggest_production_tenant` → "probe biggest production tenant" → NOT APPLICABLE this SPEC (demo-only by Brief).

---

## 12. Pre-Merge Checklist

- [ ] All 30 §3 success criteria pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] All 11 §3a functional smokes PASS (TEST_REPORT.md ✅ × 11).
- [ ] **Iron Rule 34 closure evidence (§3b):** 5 screenshots + 1+ runtime trace + 1+ DB write proof + mockup-vs-live fidelity pass — all 4 attached/referenced in FOREMAN_REVIEW.md.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` exit 0 or 2.
- [ ] **Destructive Operations gate:** `scripts/checks/destructive-ops-declared.mjs` passes.
- [ ] `git status --short` clean.
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + FINDINGS.md + TEST_REPORT.md + REVIEW.md + FOREMAN_REVIEW.md present in SPEC folder.
- [ ] M5 ROADMAP Phase D = ✅; SESSION_CONTEXT / CHANGELOG / MODULE_MAP updated.
- [ ] GLOBAL_MAP + FILE_STRUCTURE additive merges complete.
- [ ] `customers.html` reachable on `http://localhost:3000/customers.html?t=demo&customer_id=<uuid>` with 0 console errors.
- [ ] No Prizma row writes anywhere in the run.
- [ ] No merge to main.
- [ ] FOREMAN_REVIEW includes 2 author-skill + 2 executor-skill improvement proposals harvested from this SPEC.

---

*End of M5_UI_CUSTOMER_CARD SPEC. First UI on the M5-M9 spine. Demo only. Chrome MCP closure mandatory (Iron Rule 34). No merge to main.*
