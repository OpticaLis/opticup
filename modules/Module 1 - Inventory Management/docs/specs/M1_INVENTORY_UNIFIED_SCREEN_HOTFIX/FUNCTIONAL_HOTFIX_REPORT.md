# FUNCTIONAL_HOTFIX_REPORT — M1_INVENTORY_UNIFIED_SCREEN

> Follow-up to the visual hotfix (`c0e35e1`). Daniel reported two functional regressions the visual hotfix missed because it only checked sidebar overlap, not per-screen behavior. Full 18-surface functional survey + 1 code fix + 1 Daniel escalation in this report.

**Date:** 2026-05-16 afternoon
**Triggered by:** Daniel's post-merge functional report (catalog-admin auth error + goods-receipt tenant_location error)
**Pipeline mode:** efficient hotfix (no full 5-stage chain — survey + fix + verify in one commit)

---

## 1. Per-tab Functional Survey (18 surfaces on demo tenant)

Survey method: Chrome MCP `evaluate_script` programmatically iterates each tab; checks (a) DOM render, (b) console errors, (c) auth-gate visibility, (d) primary section active. PIN auth = Daniel's demo PIN (all `lens.*` permissions, NOT `is_platform_super_admin`).

### Lens tabs (7)

| Tab | Section populated | App visible | Gate visible | Verdict |
|---|---|---|---|---|
| inventory | ✅ | ✅ | — | 🟢 OK |
| active-designs | ✅ | ✅ | — | 🟢 OK |
| pricing | ✅ | ✅ | — | 🟢 OK |
| purchase-order | ✅ | ✅ | — | 🟢 OK |
| pos-list | ✅ | ✅ | — | 🟢 OK |
| goods-receipt | ✅ | ✅ | — | 🟢 OK on demo (2 tenant_location rows). **❌ FAIL on Prizma** — see Bug #2 below. |
| catalog-admin | ✅ | ❌ | ✅ "נדרשת התחברות" | 🔴 Bug #1 — fixed in this commit. |

### Frames tabs (7)

| Tab | Section active | mainNav button active | Verdict |
|---|---|---|---|
| entry | ✅ | ✅ | 🟢 OK |
| reduction | ✅ | ✅ | 🟢 OK |
| purchase-orders | ✅ | ✅ | 🟢 OK |
| inventory | ✅ | ✅ | 🟢 OK |
| brands | ✅ | ✅ | 🟢 OK |
| stock-count | ✅ | ✅ | 🟢 OK |
| returns | ✅ | ✅ | 🟢 OK |

### Cross-category (4)

| Item | Section active | Category set | Verdict |
|---|---|---|---|
| suppliers | ✅ | suppliers | 🟢 OK |
| incoming-invoices | ✅ | incoming-invoices | 🟢 OK |
| unified-log | ✅ | unified-log | 🟢 OK |
| access-sync | ✅ | access-sync | 🟢 OK |

**Tally: 16/18 PASS, 1 FAIL (catalog-admin auth), 1 Prizma-only FAIL (goods-receipt tenant_location).**

**Console errors across the full sweep: 0.**

---

## 2. Bug #1 — catalog-admin auth gate visible to non-platform-admin (FIXED)

### Root cause

The catalog-admin partial uses a **separate** Supabase Auth client (Google OAuth, storageKey `optic_admin_auth`) distinct from the PIN-based tenant auth that the rest of the unified screen uses. When a non-platform-admin user clicks the catalog-admin lens tab, the auth-gate displays the "Connect via Platform Admin first" prompt.

**Regression source:** the original `shared/js/lens-nav-strip.js` (deleted in `64a69e7` C4) ran an `is_platform_super_admin` RPC check at render time and HID the catalog-admin link entirely for non-platform-admin users:

```js
{ href: 'lens-catalog-admin.html', label: 'קטלוג מערכת', icon: '🔧', gate: '__platform_admin__' }
```

The unified screen's `lensNav` was added in `ddb926e` C2 with `data-tab-permission` attributes for the other 6 lens tabs, but catalog-admin's RPC-gate logic was NOT re-implemented. The button remained always-visible → user clicks → auth-gate shows the misleading error.

### Fix

`modules/inventory/inventory-shell-lens.js` gains a new `gatePlatformAdminTabs()` function that runs once at page load. It calls `sb.rpc('is_platform_super_admin')` via the global PIN-auth Supabase client. If the response is not `data === true`:
- Hide the lensNav button `[data-lens-tab="catalog-admin"]`.
- Mark the section `data-platformAdminGated="1"` (for future use; no behavior change today).
- If the current active lens tab was catalog-admin, fall back to `DEFAULT_LENS_TAB = "inventory"`.

The check runs via a `tryGateInit` poll waiting for the global `sb` to be ready (50 × 100ms retries, same pattern as the existing `deferredInit`).

### Verification (Chrome MCP, demo PIN, fresh reload after fix)

```json
{
  "catalogAdminBtnDisplay": "none",
  "catalogAdminBtnVisible": false,
  "catalogAdminSectionGated": true,
  "currentLensTab": "inventory",
  "lensNavBtnCount": 7,
  "visibleLensNavBtns": ["inventory","active-designs","pricing","purchase-order","pos-list","goods-receipt"]
}
```

7 buttons in DOM, 6 visible. catalog-admin hidden cleanly. Active lens tab defaults to inventory. ✅

Screenshot: `after-catalog-admin-hidden.png` (this folder).

### File touched

`modules/inventory/inventory-shell-lens.js` (261 → 310 lines, still under Rule 12 350 cap).

---

## 3. Bug #2 — `tenant_location` 0 rows on Prizma (ESCALATED to Daniel)

### Investigation

Direct DB probe via Supabase MCP:

```sql
SELECT t.slug, COUNT(tl.*) AS location_count
  FROM tenants t
  LEFT JOIN tenant_location tl ON tl.tenant_id = t.id
 WHERE t.slug IN ('demo', 'prizma')
 GROUP BY t.slug;
```

| Tenant | location_count | Status |
|---|---|---|
| demo | 2 | OK (Smoke Loc A + Smoke Loc B from M1A seed) |
| prizma | **0** | **EMPTY** |

`modules/lens-goods-receipt/lens-goods-receipt-main.js:95` calls `fetchAll('tenant_location', [])` which returns rows scoped to the current tenant. On Prizma → empty array → `defaultLocationId` stays null → the bootstrap toast fires `"אין מיקום מלאי מוגדר לטננט - לא ניתן לסגור קבלה. צור tenant_location לפני המשך."`

The RPC `m1_create_receipt_from_box` (verified via `pg_get_functiondef`) does NOT itself raise this error — the error comes from the client-side bootstrap, exactly as the code path suggests. Client-side toast is correct behavior given the empty table; the underlying issue is a **missing seed on Prizma**.

### Why this is NOT auto-fixed

Per task instructions:
> Prizma tenant_location seed: NOT your call — escalate.

CLAUDE.md §9 #7 ("Never push to main, never auto-write to Prizma") binds. The seed is a **production data INSERT** to the live tenant — Daniel-only authorization.

### Required action by Daniel

**Manual SQL** (≤ 1 minute, run from Supabase SQL editor or the project's secure CLI):

```sql
-- M1 Lens Phase 1A: seed Prizma's default inventory location.
-- 1 row, is_default=true (the goods-receipt picker uses this).
-- Run as the platform_super_admin role (service_role) so RLS allows the insert.
INSERT INTO public.tenant_location (tenant_id, name, is_default, created_at)
VALUES (
  (SELECT id FROM public.tenants WHERE slug = 'prizma'),
  'מרכזי',
  true,
  now()
);

-- Verify:
SELECT id, name, is_default
  FROM public.tenant_location
 WHERE tenant_id = (SELECT id FROM public.tenants WHERE slug = 'prizma');
```

After this seed lands on Prizma, the goods-receipt tab will work end-to-end without further code changes.

### Future work (deferred)

Two related improvements out of scope here:

- **Demo cleanup:** demo currently has 2 locations from M1A smoke tests, neither marked `is_default=true`. The goods-receipt picker uses `rows[0]` so it works, but a clean-up SPEC could mark one as default + delete the duplicate. ~5 min, low priority.
- **Tenant-onboarding seed:** when a new tenant arrives (SaaS axis), tenant_location should be seeded automatically as part of `create_tenant` RPC. Currently it's NOT. Tracked as new TECH_DEBT entry: `#TENANT_LOCATION_AUTO_SEED_ON_TENANT_CREATE`.

---

## 4. Smoke + Iron Rules

- `npm run smoke` → 7/7 PASS post-fix.
- `npm run verify:integrity` → exit 0.
- Iron Rule 32 destructive ops: declared = **None** (single JS additive function in inventory-shell-lens.js; no deletes, no DROP, no rebase).
- Console errors after fix: 0.
- 0 Prizma writes from this Pipeline.

---

## 5. Hebrew status line

```
2 באגים שדווחו על-ידי דניאל לאחר ה-hotfix הוויזואלי:
🟢 קטלוג מערכת — הכפתור הוסתר אוטומטית למשתמשים שאינם platform-admin (RPC runtime gate שוחזר מ-lens-nav-strip הישן).
🔴 קבלת סחורה (פריזמה בלבד) — חסר seed ב-tenant_location לפריזמה. SQL מוכן ב-FUNCTIONAL_HOTFIX_REPORT.md, דרוש אישור דניאל להרצה ב-Prizma. דמו תקין (2 שורות מ-M1A).
סקירת 18 משטחים: 16 OK + 1 תוקן + 1 ממתין לאישור.
smoke 7/7 PASS.
```

---

## 6. Commit plan

**Single commit:** `fix(m1): hide catalog-admin lens tab for non-platform-admin users (restore RPC gate)`.

Files:
- `modules/inventory/inventory-shell-lens.js` — `+49/-2` lines for new `gatePlatformAdminTabs()` + `tryGateInit()` + window.InvShellLens export.
- This `FUNCTIONAL_HOTFIX_REPORT.md`.
- `after-catalog-admin-hidden.png` screenshot.

Bug #2 NOT in this commit — escalation only.
