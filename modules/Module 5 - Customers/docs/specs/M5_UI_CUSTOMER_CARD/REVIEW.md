# M5_UI_CUSTOMER_CARD — Code Review

> **Reviewer:** opticup-reviewer · **Date:** 2026-05-23
> **Subject:** 5 commits on `develop` (14d5d75 → e246c52) + EXECUTION_REPORT + FINDINGS + TEST_REPORT
> **Scope:** 8 new page JS files + 1 new HTML entrypoint + 1 new CSS file + storage bucket + 4 RLS policies + 5 docs files modified additively.

## Review Report — Module 5 Phase D — Customer Card UI

### Iron Rule Compliance

✅ **All hard rules satisfied** (no violations). One soft-cap warning surfaced — already documented by the Executor as F-8.

| Rule | Verdict | Spot-check evidence |
|---|---|---|
| 5 — FIELD_MAP for new fields | ✅ | 6 new FIELD_MAP entries committed in `a83516b` covering customers (28 fields), customer_notes (4), customer_documents (6), households (2), health_funds (4), tenant_languages (4). Verified by `grep -nE "^\s+(customers\|customer_notes\|customer_documents\|households\|health_funds\|tenant_languages):" js/shared-field-map.js`. |
| 7 — DB via helpers, never direct sb.from() | ✅ | `grep -n "sb\.from\|sb\.rpc" modules/customers/*.js` → 0 hits. The card reads via `DB.select()` and writes via `DB.update()` / `DB.insert()` / `DB.rpc()`. Storage uses `sb.storage.from('customer-docs')` — different namespace, not the DB-rule surface. |
| 8 — No innerHTML with raw user input | ✅ | 16 `innerHTML =` uses across the 7 files; every dynamic interpolation runs through `escapeHtml()` (manual spot-check on customer-card-header.js, customer-card-tab-details.js, customer-card-tab-prescriptions.js, customer-card-tab-docs.js, customer-card-tab-orders.js). The static template strings around `escapeHtml()` calls are safe. No suspicious `${...}` interpolation or `+ rawVar` patterns slipped through. |
| 9 — No hardcoded business values | ✅ | Tenant name + tenant_code + branch_code all read from views (`v_customer_for_exam`); `formatMoney()` reads currency/locale from `tenant_config`. PIN value hardcoded only in the smoke harness (test code), never in production paths. |
| 10 — No global name collisions | ✅ | New symbols (`showComingSoon`, `bindComingSoon`, `COMING_SOON_LABEL`, `COMING_SOON_REGISTRY`, `renderHeader`, `renderTabDetails`, `mountTabDetails`, etc., `M5Card`, `__cardTrace`) are unique. Verified by SPEC §0 Step 1.5 + spot-grep against existing module JS. |
| 12 — File size ≤ 350 (target 300) | ⚠ Warning | All new page JS files comfortably ≤ 247 lines (largest: `customer-card-tab-details.js` 247). `js/shared-field-map.js` was 317 pre-SPEC; 6 M5 entries pushed it to exactly 350 — at the hard cap. Pre-commit hook produced 1 warning, 0 violations. Already documented as F-8 with a proposed per-module split. Accept as warning-not-block. |
| 21 — No orphans, no duplicates | ✅ | The single-source-of-truth discipline is the FEATURE of this SPEC: ONE `showComingSoon` + ONE label + ONE registry. Every deferred badge / CTA on the card routes through `bindComingSoon(el, featureId)`. Reuses existing `Toast.*`, `Modal.confirm`, `pin-modal.js`, `search-select.js`, `escapeHtml()`, `formatMoney()`. No new utility functions duplicate existing ones. |
| 22 — Defense in depth (tenant_id on writes + selects) | ✅ | The `DB.*` wrapper (Module 1.5) auto-injects `tenant_id` on every `select/insert/update`. The card never bypasses the wrapper. Storage paths encode `tenant_id` in the folder prefix → enforced again by the RLS policy on `storage.objects`. The `create_prescription_draft` RPC call explicitly passes `p_tenant_id: getTenantId()`. Belt + suspenders. |
| 23 — No secrets in code | ✅ | No PIN / API key / token committed. The smoke harness uses PIN `12345` only at runtime via `verifyEmployeePIN()` — never landed in code. |
| 31 — Integrity gate | ✅ | Every commit (5/5) passed `npm run verify:integrity` with exit 0. Final tally: "All clear — 45 files scanned" on the close commit. |
| 32 — Destructive ops declared | ✅ | SPEC §Destructive Operations declared: storage bucket CREATE + 4 storage policies CREATE + CLAUDE.md §0.5 / root-allowlist.json / shared-field-map.js / GLOBAL_MAP / FILE_STRUCTURE additive edits + M5 state-files replaces. Pre-commit hook (`scripts/checks/destructive-ops-declared.mjs`) accepted every commit. No DROP / TRUNCATE / DELETE-without-tenant-scope anywhere outside the smoke T9 teardown (single-row, customer_documents, by id). |
| 34 — Chrome MCP closure | ✅ partial | Runtime traces captured for T3 (edit-mode autosave, 170ms), T7 (create_prescription_draft, 408ms), T9 (storage upload + customer_documents INSERT). DB-write evidence captured for each. 4 viewport JPEG / PNG screenshots successfully saved; 2 full-page PNG attempts hit a Chrome MCP `Page.captureScreenshot timed out` limit. A11y snapshots in TEST_REPORT.md provide equivalent structural-fidelity proof. |

### Security & SaaS Integrity

✅ **No new security issues.** All concerns audited:

| Check | Verdict | Evidence |
|---|---|---|
| RLS on the new storage bucket | ✅ | 4 policies on `storage.objects` for `bucket_id='customer-docs'`, each with the canonical Supabase tenant-folder pattern: `auth.jwt() ->> 'tenant_id' = (storage.foldername(name))[1]`. The bucket is private (`public=false`). |
| Cross-tenant isolation | ✅ | T10 smoke proved a Prizma uuid on a demo-authenticated session returns PostgREST 406 (RLS denial), no data leakage. The card renders "Cannot coerce" error rather than leaking. The error UX could be improved (see Code Quality below) but the security behavior is correct. |
| Authentication flow | ✅ | The card invokes `loadSession()` from `auth-service.js` — the canonical PIN-auth pattern. Does NOT introduce a new auth flow or bypass the `pin-auth` Edge Function. F-6 caught the page-boot omission; commit `7287852` added it. |
| INSERT/UPSERT tenant_id | ✅ | All writes use `DB.insert` / `DB.update` (auto-inject `tenant_id`). The Storage upload's path encodes tenant_id in the folder prefix and the RLS policy double-checks it. Defense-in-depth maintained. |
| SECURITY DEFINER drift | ✅ | No new SECURITY DEFINER functions were created by this SPEC. The card consumes existing RPCs (`create_prescription_draft`, `update_customer_display_preferences`, `assign_to_household`, `merge_customers`, `delete_last_unused_customer`) that were sealed by M5_SCHEMA + M6_SCHEMA. No re-touching of their Block A headers. |
| auth.uid() bug | ✅ | Not used. The card relies on JWT-claim-based RLS throughout (custom PIN-issued JWT with `tenant_id` claim). |
| UNIQUE constraints | N/A | No new tables this SPEC. |

### Code Quality

Findings (none block-class):

1. **F-T5-DESIGN (already in FINDINGS.md):** the Locked badge wired to `is_deleted` is unreachable through the normal load path because the views filter `is_deleted=false`. Either remove the badge or add an include-deleted card mode. Foreman should decide which way to land it.

2. **F-7 (already in FINDINGS.md):** R/L summary double-prefix on Tab 3. Cosmetic; one render-line fix. Recommend doing this immediately as the close-out polish — it's a 30-second fix and prevents the visual drift staying in production.

3. **Cross-tenant error UX:** when an unauthorized customer_id is loaded, the user sees "שגיאה בטעינת הלקוח: Cannot coerce the result to a single JSON object" — technically a PostgREST internal message bubbling up. Friendlier text would be "הלקוח לא נמצא או אינו שייך לטננט הנוכחי". The customer-card.js boot already has the not-found branch with that exact text but the error branch above it shows the raw message. Recommend a small refinement: catch the `"Cannot coerce"` / 406 / `"not_found"` error class and route to the same not-found UX. Quick fix; not a blocker.

4. **T9 smoke double-fire:** F-10 documents the test-only synthetic-event behavior. The production input handler is single-fire (verified by inspection of the `input.addEventListener('change', ...)` registration — registered once). No production bug. The smoke harness should use a single dispatch path next time.

5. **`customer-card-tab-prescriptions.js` + `customer-card-tab-docs.js` both reimplement an in-DOM modal overlay** (chooseKindModal / chooseCategoryModal). This is a tiny duplication of a UI concept. Future SPEC could extract a shared `chooseOption(options)` helper. Not Iron Rule 21 violation (genuinely different option sets); just a refactoring opportunity.

6. **Page-boot auth helper opportunity:** F-6 + P-EXEC-1 (Executor's proposal) point at a missing utility. The 4-line auth boot is now in customer-card.js; future pages will copy-paste. Should be extracted to `auth-service.js` as `await authReady()` or similar.

7. **`customer-card-tab-orders.js` rowHtml has the FK-hint embedded in the `columns` string** — fragile if the FK is renamed. The FK hint should be co-located with the schema docs (and grepable from there). Today only one consumer; not a problem until a 2nd consumer is added.

### Recommendations

#### Priority fixes (must do before close)
None. All findings are LOW/INFO/MEDIUM-design — none block Phase D closure.

#### Nice-to-have improvements (defer to follow-up SPECs)
1. **F-7 cosmetic R/L double-prefix fix** — one-line fix, recommend doing immediately at Foreman close.
2. **F-T5-DESIGN resolution** — either remove the Locked badge or add an include-deleted mode (Foreman decision).
3. **F-2/F-3 — schema column expansions** — `customer_documents.{size_bytes, mime_type, description}` + `orders.total_amount` (or aggregation view). Materially improves the displayed information.
4. **F-6 follow-up — extract `authReady()` helper in `auth-service.js`** so each new ERP page doesn't reinvent the `loadSession()` boot.
5. **F-8 — split `js/shared-field-map.js` per-module**. At the 350-line cap; only going to grow.
6. **F-9 — Sentinel/SPEC to reconcile CLAUDE.md §0.5 prose count vs. root-allowlist.json** (pre-existing drift).

### Closure Audit (CLOSURE_SPEC, 2026-05-23)

Spot-checks against the closure commit `da62c91`:

- **Item B deletion completeness:** `grep -n "Locked|נעול|isLocked" modules/customers/*.js` → 0 hits (exit code 1). Both surfaces cleared. ✅
- **COMING_SOON_REGISTRY untouched:** `grep -n "locked" modules/customers/customer-card-coming-soon.js` → 0 hits (was 0 before, still 0). ✅
- **Other badges intact:** a11y snapshot after reload shows VIP + חבר-מועדון in header, Inactive + Subscription in bottom flags. All 4 blurred targets (vip, loyalty_member, subscription, queue_position) still in the registry + still bound on render. ✅
- **5 fidelity JPEGs:** all 5 present in `screenshots/closure/`. Per-tab mockup-vs-live notes in TEST_REPORT.md §"T11 closure capture". No material drift. ✅
- **Console clean:** the only message on reload is the pre-existing Supabase GoTrueClient multi-instance WARN (visible before this SPEC too — caused by `loadSession()` recreating the sb client). No new errors. ✅
- **Iron Rule 31 / 32:** integrity gate exit 0; destructive ops declared (UI deletion + governance file edits) and accepted by pre-commit hook. ✅
- **No Prizma writes / no schema change / no merge to main:** verified. ✅

**Closure verdict:** 🟢 **PASS.** Both Phase D follow-ups cleared cleanly. The card is the spotless template every later M5-M9 UI screen will copy.

---

### Verdict (Phase D pre-closure, retained for history)

🟡 **PASS WITH NOTES — proceed to Foreman closure.**

All 30 SPEC success criteria are hit or have documented findings. All Iron Rules satisfied at the hard-cap level (only soft-cap warning from shared-field-map.js, already tracked). Iron Rule 34 closure evidence is real (not stubbed) and proves the 3 wired actions (autosave / create_prescription_draft / storage upload) work end-to-end on live demo. The Executor caught its own 3 bugs through the smoke loop — that's the discipline working as designed.

The Foreman should: (a) accept the closure pending the recommended F-7 one-line cosmetic fix in this same close commit, (b) attach the screenshots + a11y snapshot evidence to FOREMAN_REVIEW.md, (c) decide F-T5-DESIGN direction, and (d) feed F-6 proposal back into auth-service.js skill improvements.

The render+action wiring pattern is now established. Phase E (list + create-mode) can reuse the entrypoint, the page JS architecture, the coming-soon discipline, and the smoke-loop pattern intact.
