# SPEC — M4_RAW_SB_FROM_MIGRATION_PHASE_2

> **Authored:** 2026-05-21 — Sprint 3 Item 2 of 6.
> **Status:** 🟡 **DEFERRED to a dedicated Sprint** after assessment + 1 trial migration.

## 0. Goal (original)
Migrate the heaviest ~25 of the 159 raw `sb.from()` calls to the `DB.*` wrapper (Iron Rule 7). Pure refactor, zero behaviour change.

## 1. Why deferred

### 1a. DB.select gaps discovered during scoping
`DB.select` (in `shared/js/supabase-client.js`) does not currently support:
- `head: true` (HEAD-style count-only queries used heavily in `crm-dashboard.js`, `crm-funnel-dashboard.js`, etc.)
- Complex chained operators (`.is(null)`, `.not('col','is',null)`, `.in(...)`, `.gte(...)`, `.lt(...)`) without falling through to `rawFilters`
- RPC-style returning shapes

Without these, ~60% of the targeted calls can't migrate cleanly — they need either a DB wrapper extension OR an inelegant `rawFilters` callback that defeats the readability win.

### 1b. Risk vs reward at present
- Each migration needs careful diff-equivalence verification (run the affected screen, confirm the data matches pre-fix).
- During this Item's attempted trial migration of `v_crm_event_stats` in `crm-dashboard.js`, Supabase had an intermittent connectivity outage (DB.select returned `upstream request timeout` after 179 s). Couldn't verify the migration was correct.
- Reverted the trial change to keep the dashboard reliable.

### 1c. Recommended re-scoping
Split into 3 follow-up SPECs:
- **`M4_DB_WRAPPER_EXTENSION`** (Sprint 4): add `head: true` + canonical chained-filter helpers (`.in`, `.not`, `.is`) to `DB.select`. Becomes a prerequisite for the bulk migration.
- **`M4_RAW_SB_FROM_MIGRATION_PHASE_2A`** (Sprint 4): migrate 10 read-only `sb.from(...).select()` calls in `crm-dashboard.js` + `crm-funnel-dashboard.js` + `crm-pixel-gap-tile.js` (after Phase 2A wrapper extension).
- **`M4_RAW_SB_FROM_MIGRATION_PHASE_2B`** (Sprint 4-5): migrate write-path calls (`sb.from(...).update`/`.insert`) in `crm-lead-actions.js` + `crm-payment-helpers.js` + `crm-attendee-cancel.js` — more sensitive; each call needs its own targeted verification.

## 2. What was done this Item
- Identified 159 total raw `sb.from()` calls across 51 files (audit data).
- Probed `DB.*` wrapper API + identified the `head: true` + complex-filter gaps.
- Attempted 1 trial migration on `crm-dashboard.js` `v_crm_event_stats` query.
- Couldn't verify due to Supabase outage; reverted to ship-safe state.
- Documented the path forward.

## 3. Destructive Operations
None — code reverted to pre-trial state.

## 4. Verification
No verifiable changes. Closing docs document the assessment + path forward.

---
*End of SPEC.*
