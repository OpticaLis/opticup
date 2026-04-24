# FINDINGS — SHORT_LINKS

> **Location:** `modules/Module 4 - CRM/final/SHORT_LINKS/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — short_links UNIQUE constraint excludes tenant_id (Rule 18 exception)

- **Code:** `M4-R18-02`
- **Severity:** MEDIUM
- **Discovered during:** §6 Iron-Rule Self-Audit (RLS + constraint review)
- **Location:** `public.short_links`, constraint `short_links_code_unique UNIQUE (code)`
- **Description:** Rule 18 says "UNIQUE constraints must include tenant_id." `short_links_code_unique` is on `(code)` only, not `(code, tenant_id)`. The exception is intentional: the `resolve-link` EF is a public, unauthenticated redirect — it has no tenant context when it receives a `GET /r/<code>` request, so it must look up the row by `code` alone. Making the constraint `(code, tenant_id)` would allow the same code across tenants and break single-column lookup; the EF would need to carry tenant in the URL path (e.g. `/r/<tenant_slug>/<code>`), changing the public URL format and the messaging budget calculation that motivated the SPEC. Cryptographic safety: 62^8 ≈ 218 trillion codes; random-collision across tenants is astronomically unlikely. RLS still enforces tenant isolation for non-service-role reads via the JWT claim. The service_role lookup in `resolve-link` bypasses RLS by design (it's a trusted internal EF) and treats the `code` itself as the access token.
- **Reproduction:**
  ```sql
  SELECT conname, pg_get_constraintdef(oid)
  FROM pg_constraint
  WHERE conrelid = 'public.short_links'::regclass
    AND contype = 'u';
  -- Returns: short_links_code_unique UNIQUE (code)
  ```
- **Expected vs Actual:**
  - Expected (strict Rule 18): `UNIQUE (code, tenant_id)`.
  - Actual: `UNIQUE (code)` — cross-tenant-global to support anonymous lookup.
- **Suggested next action:** `DISMISS` (document exception in CLAUDE.md §5 Rule 18) OR `NEW_SPEC` (refactor URL to `/r/<tenant>/<code>`, add tenant_id to constraint).
- **Rationale for action:** The business value of short URLs depends on them being short. Adding a tenant slug to the path (+4–10 chars) partially erodes the gain that motivated the SPEC. Recommend DISMISS with a one-sentence addition to CLAUDE.md Rule 18 listing "anonymous public lookup tables" as a named exception, same way Rule 9 has named exceptions for hardcoded business values during stubs.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — short_links columns not added to ERP `FIELD_MAP` (Rule 5 scoping question)

- **Code:** `M4-R05-01`
- **Severity:** LOW
- **Discovered during:** §6 Iron-Rule Self-Audit
- **Location:** `js/shared.js` FIELD_MAP (not modified), `public.short_links` (new table)
- **Description:** Rule 5 says "Every new DB field must be added to `FIELD_MAP` in `shared.js`." `short_links` is a new table with 10 new columns. None were added to `FIELD_MAP`. Rationale for skipping: `FIELD_MAP` exists to map Hebrew UI labels to English column names for ERP-side tables displayed in CRUD forms and the English/Hebrew audit log. `short_links` is populated and read exclusively by service-role EFs; no ERP JavaScript or HTML will ever render or write its rows. Adding ten entries to FIELD_MAP for columns that never surface in the ERP UI would be dead weight and could confuse future readers who assume any FIELD_MAP entry is user-facing.
- **Reproduction:**
  ```
  grep -n "short_links\|target_url\|click_count" js/shared.js
  # returns no matches
  ```
- **Expected vs Actual:**
  - Expected (strict Rule 5): 10 new FIELD_MAP entries for short_links columns.
  - Actual: 0 entries. Table is EF-only.
- **Suggested next action:** `DISMISS` with a Rule 5 clarification in CLAUDE.md: "Tables that are never accessed from ERP JS/HTML (EF-only internal tables) are exempt from FIELD_MAP. Document the exemption in the table's own db-schema.sql header."
- **Rationale for action:** Mechanically applying Rule 5 to EF-only tables bloats FIELD_MAP and muddies its purpose. The alternative — a `FIELD_MAP_EF` section or a convention — is overkill for what is currently a single table. A named exception in the rule text is the cheapest fix.
- **Foreman override (filled by Foreman in review):** { }

---

## Notes

Both findings are Iron-Rule edge cases, not bugs. Both resulted from the
SPEC shipping a design that works correctly but doesn't fit the rule's
literal text. They are surfaced here so the Foreman can decide whether
the rule text should be refined or the design reworked. Neither was
fixed inside this SPEC (per "one concern per task").
