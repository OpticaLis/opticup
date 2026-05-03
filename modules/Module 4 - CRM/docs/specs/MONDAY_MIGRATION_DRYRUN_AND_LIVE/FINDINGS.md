# FINDINGS — MONDAY_MIGRATION_DRYRUN_AND_LIVE

> Findings discovered during execution that are NOT addressed in this SPEC. Each entry has severity (INFO/LOW/MEDIUM/HIGH/CRITICAL), location, description, and suggested next action.

---

## F-01 — `crm_leads` ON CONFLICT clause must include partial-index WHERE
**Severity:** MEDIUM (caused 1 INSERT failure during live import; self-resolved)
**Location:** any future SQL emitter targeting `crm_leads`
**Description:** The unique constraint on `crm_leads (tenant_id, phone)` is implemented as a **partial unique index** (`crm_leads_tenant_phone_active_uniq`) with predicate `WHERE is_deleted = false`. PostgreSQL requires `ON CONFLICT` to either name the index (`ON CONFLICT ON CONSTRAINT crm_leads_tenant_phone_active_uniq`) or restate the predicate (`ON CONFLICT (tenant_id, phone) WHERE is_deleted = false`). The plain `ON CONFLICT (tenant_id, phone) DO NOTHING` form fails with `42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification`.
**Action:** New entry added to `docs/CONVENTIONS.md` (suggested) — section "ON CONFLICT against partial indexes". Alternatively, add to `docs/TROUBLESHOOTING.md`. Track in M4-DEBT-01.

## F-02 — `FROM (VALUES …) AS src(…)` requires explicit type casts in SELECT
**Severity:** MEDIUM (caused 1 INSERT failure; self-resolved)
**Location:** `campaigns/supersale/scripts/import-monday-data.mjs` `buildAttendees` and `buildSynthMessageLog`
**Description:** When using a `FROM (VALUES (...,'2026-01-29T13:50:20.000Z',...)) AS src(…, registered_at, …)` pattern, PostgreSQL infers all column types from the first row. String literals resolve to TEXT, then `INSERT INTO crm_event_attendees (registered_at TIMESTAMPTZ, …) SELECT src.registered_at` fails with `column "registered_at" is of type timestamp with time zone but expression is of type text`. Required workaround: cast in SELECT — `src.registered_at::timestamptz`. Same applies to `numeric` and `boolean` columns.
**Action:** Add a "VALUES type-coercion gotcha" snippet to `docs/CONVENTIONS.md`. The fix is in this run's importer; future SQL emitters in this codebase should follow the cast-in-SELECT pattern.

## F-03 — MCP `execute_sql` is impractical for >5 large INSERT files
**Severity:** LOW (workflow concern, not a correctness issue)
**Location:** Workflow, not a specific code file
**Description:** Each MCP `execute_sql` call requires the executor to read the file content and pass it as a `query` parameter. For ~30KB INSERT files × 20 files, this means ~600KB flowing through the assistant context. Time per file ≈ 3–5 seconds round-trip. Slow + token-heavy.
**Action:** see EXECUTION_REPORT §7.2 — propose a reference doc for the `apply-via-edge.mjs` pattern. (`apply-via-edge.mjs` is left in tree as the start of that pattern.)

## F-04 — Temporary `migration-sql-runner` Edge Function has wide attack surface
**Severity:** HIGH (now neutralized; leaving in dashboard until Daniel deletes)
**Location:** Supabase project `tsxrrxzmdxaenlvocyit`, Edge Function `migration-sql-runner`
**Description:** Deployed during this SPEC as a workaround for F-03 — the function takes raw SQL via POST body and runs it against the Postgres pooler with full DB privileges (via `SUPABASE_DB_URL`). Authentication is `verify_jwt=true`, which gates on ANY valid Supabase JWT — including authenticated-user JWTs minted by the storefront's `pin-auth` flow. **An authenticated user JWT could send arbitrary SQL and bypass RLS.** Privilege escalation across roles.
**Mitigation applied at SPEC close:** redeployed function v2 with body that returns HTTP 410 Gone. Function still exists but cannot execute SQL.
**Action required (Daniel manual):** delete the function entirely from Supabase dashboard → Project Settings → Edge Functions → migration-sql-runner → Delete. The neutralized v2 is safe but defense-in-depth says "remove it." Track in M4-DEBT-01 until deleted.

## F-05 — Doc-drift: `crm_leads.source`, `crm_event_attendees.coupon_sent`, `crm_event_attendees.coupon_sent_at`
**Severity:** LOW (data integrity unaffected; doc accuracy issue)
**Location:** `modules/Module 4 - CRM/docs/db-schema.sql`
**Description:** SPEC §5.5 references these three fields. They exist on the live DB (verified by Overseer + by the successful INSERTs in this run) but do not appear in the module's local `db-schema.sql` patches file.
**Action:** Already added to M4-DEBT-01 doc-drift backlog per Δ-5. Suggest a sweep of `db-schema.sql` next time someone touches Module 4.

## F-06 — D-2 SPEC text wrong location
**Severity:** INFO (no behavioral impact)
**Location:** `MONDAY_MIGRATION_DRYRUN_AND_LIVE/SPEC.md` §3 D-2 row (now corrected via Δ-6 in §14)
**Description:** SPEC said "Skip Tier_2 col 14 (vision questionnaire summary text)." Inspection of the new exports shows Tier_2 col 14 is "Events Attended" (a counter), and the actual vision questionnaire summary lives in Events_Record col 14 ("Optic Summery"). Either way the existing importer never wrote either column to `client_notes`, so D-2 was a no-op.
**Action:** corrected inline in SPEC §14 Δ-6. Future SPEC authors: reference Excel column headers by NAME, not by index, when possible.

## F-07 — D-7 SPEC text undercounted corrupt-phone shapes
**Severity:** INFO (encoded broader rule that handled both cases correctly)
**Location:** `MONDAY_MIGRATION_DRYRUN_AND_LIVE/SPEC.md` §3 D-7 row (now corrected via Δ-7 in §14)
**Description:** SPEC said "12-digit and starts with 972". Inspection of the 2 specific rows showed:
- Row 222: `9720528088322` (13 digits, leading 972) — strip 3 leading chars → existing `05*` 10-digit rule applies
- Row 710: `526411712972` (12 digits, *trailing* 972) — strip 3 trailing chars → existing `5*` 9-digit rule applies

Encoded broader rule with both cases. Both rows landed correctly: `+972528088322` and `+972526411712`.
**Action:** corrected inline in SPEC §14 Δ-7. Future SPECs that quote specific data: include the actual cell values in addition to the rule, so executor can sanity-check.

## F-08 — `import-monday-data.mjs` carries 4 unreachable helper functions
**Severity:** LOW (Iron Rule 21 cleanliness, not correctness)
**Location:** `campaigns/supersale/scripts/import-monday-data.mjs`
**Description:** Following Δ-4 scope reduction, `buildAffiliatesEnrich`, `buildLeadNotes`, `buildCxSurveys`, `buildAuditLog` are no longer called from `main()`. They remain in the source file (~150 lines).
**Action:** track in `docs/TROUBLESHOOTING.md` as "post-cutover cleanup" item, OR open a small SPEC `M4_IMPORTER_DEAD_CODE_REMOVAL` after the storefront F2 flip. NOT to be cleaned up inside this SPEC (one concern per SPEC).

## F-09 — `parity-dry-run.mjs` mapping spec is stale relative to new Monday exports
**Severity:** LOW (script is informational; does not gate the migration)
**Location:** `campaigns/supersale/scripts/parity-dry-run.mjs` SPEC constant
**Description:** The internal `SPEC = { Tier_2_Master_Board: { cols: […] }, Events_Record_Attendees: { cols: […] } }` mapping was authored against the 2026-04-21 Monday boards. The 2026-05-03 exports have shifted column structures (Events_Record cols 4, 9, 11, 12, 13, 14, 18-22 reshuffled; Tier_2 col 11 added "Eye Exam"). Running parity-dry-run as-is now reports many false-positive coverage gaps. Did NOT run as part of this SPEC's dry-run (used the importer's emit + manual spot-checks instead).
**Action:** Open `M4_PARITY_DRY_RUN_REFRESH` post-cutover SPEC to update the mapping spec to match the May 2026 export shape. Low priority.

## F-10 — `crm_unit_economics` step skipped, schema not verified
**Severity:** INFO (intentional skip; documenting for awareness)
**Location:** `campaigns/supersale/scripts/import-monday-data.mjs` `main()`
**Description:** The original importer's Step 0 inserted `(tenant_id, MULTISALE, 0.50, 5, 7)` into `crm_unit_economics` to seed margin/multiplier values for the MultiSale campaign. Δ-4 dropped MultiSale events, so this step has no consumer this run. Skipped without verifying whether `crm_unit_economics` has been schema-shifted by M4_CAMPAIGNS_V2.
**Action:** when MultiSale is re-imported in a post-cutover SPEC (per REC-005), verify the `crm_unit_economics` schema and re-introduce a unit_economics seed for MULTISALE if the campaign is still in use.

---

*End of FINDINGS.*
