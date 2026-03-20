# Optic Up — Troubleshooting & Known Issues

> **Check here FIRST before debugging any issue.**
> Every resolved bug is documented with root cause and fix.

---

## CSS / Layout

### Right margin gap on mobile Safari (RTL)

**Symptom:** All pages show a visible gap/margin on the right side in mobile Safari.

**Root cause (found after 3 attempts):**
1. `overflow-x:hidden` on `body` alone does NOT work on iOS Safari — must also be on `html`
2. `100vw` in CSS includes scrollbar width on mobile Safari — any element using `width:100vw` or `calc(100vw - X)` will exceed the viewport

**Fix:**
- Add `html, body { overflow-x: hidden; }` to ALL page CSS files
- Replace ALL `100vw` usages with `100%` or `auto` with `left:0;right:0`
- Files fixed: css/styles.css, css/inventory.css, css/employees.css, css/shipments.css, css/settings.css, css/header.css, shared/css/modal.css

**Prevention:** Never use `100vw` in CSS. Use `100%` instead. Add to code review checklist.

**Commits:** Phase 7 hotfix cycle (2026-03-19)

---

## Database / Constraints

### stock_counts_count_number_key — duplicate key on count creation

**Symptom:** Error "duplicate key value violates unique constraint stock_counts_count_number_key" when creating a new stock count in demo tenant.

**Root cause:** The UNIQUE constraint on `count_number` was global, not per-tenant. Demo and Prizma could collide.

**Fix:**
```sql
ALTER TABLE stock_counts DROP CONSTRAINT IF EXISTS stock_counts_count_number_key;
ALTER TABLE stock_counts ADD CONSTRAINT stock_counts_count_number_tenant_key UNIQUE (count_number, tenant_id);
```

**Prevention:** Every UNIQUE constraint must include `tenant_id`. Add to SaaS Rules in CLAUDE.md.

**Commits:** Manual SQL fix (2026-03-19)

---

## Barcode Scanning

### ZXing barcode scan issues

**Symptom:** Most barcodes don't scan, or error toast keeps repeating.

**Root causes:**
1. `decodeFromVideoDevice(null, ...)` opens default camera instead of rear — changed to `decodeFromStream(stream, videoEl, ...)`
2. Garbage filter regex `/^\d{5,}$/` was too strict — changed to `/^[A-Za-z0-9\-]{4,}$/`
3. Error debounce wasn't working — same barcode within 2s was re-triggering. Added camera-level debounce in ZXing callback.

**Fix:** All three fixed in stock-count-camera.js hotfix.

**Prevention:** Test barcode scanning on physical device after any camera code change.

**Commits:** Phase 7 hotfix (2026-03-19)

---

## Multi-Tenant

### Demo tenant missing data / broken UI

**Symptom:** Demo tenant shows "אין מותגים", empty screens, broken functionality.

**Root cause:** clone-tenant.sql creates data snapshots that become stale over time. New tables, columns, or data added after the clone are missing.

**Fix:** Re-run clone-tenant.sql after any schema or major data changes.

**Prevention:** After adding new tables, update clone-tenant.sql to include them (noted in CLAUDE.md QA Rules).

### Demo barcodes prefixed with "D" — physical scanning fails

**Symptom:** Scanning real Prizma barcodes in demo tenant returns "not found" because demo inventory has barcodes like D0003762 while physical labels say 0003762.

**Root cause:** clone-tenant.sql prefixes all barcodes with "D" to avoid UNIQUE constraint violations (barcode was globally unique, not per-tenant).

**Fix applied:**
```sql
DROP INDEX IF EXISTS idx_inventory_barcode_unique;
ALTER TABLE inventory ADD CONSTRAINT inventory_barcode_tenant_key UNIQUE (barcode, tenant_id);
```
Updated clone-tenant.sql to copy barcodes as-is (no "D" prefix).

**Status:** RESOLVED

**Commits:** 035_barcode_unique_per_tenant.sql migration (2026-03-20)

### Stale session after tenant re-clone — mobile shows empty data

**Symptom:** After deleting and re-creating demo tenant, mobile browser shows
"אין מותגים", 0 items, empty screens — despite data existing in DB.
Desktop works fine after refresh.

**Root cause:** sessionStorage retains the OLD tenant UUID. The new tenant
gets a new UUID. All queries run with the stale UUID → 0 results.

**Fix:** Log out, close the browser tab completely, reopen and log in fresh.
Clearing Safari cache also works.

**Prevention:** When re-cloning a tenant, all connected devices must log out
and back in. Consider adding a session validation check: if tenant_id in
sessionStorage doesn't exist in the tenants table, force logout.

**Status:** Documented. Session validation enhancement deferred.

---

## Template for new entries

### [Title]

**Symptom:**

**Root cause:**

**Fix:**

**Prevention:**

**Commits:**
