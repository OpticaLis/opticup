# FINDINGS — C001_SEND_MESSAGE_PHONE_ALLOWLIST_REMOVAL

> **Location:** `modules/Module 4 - CRM/docs/specs/C001_SEND_MESSAGE_PHONE_ALLOWLIST_REMOVAL/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — Migrations not tracked in git since March 2026

- **Code:** `M4-DEBT-01`
- **Severity:** MEDIUM
- **Discovered during:** Step 9 commit prep — discovered MCP `apply_migration` does not write a local file and that `supabase/migrations/` has not been touched since March 2026.
- **Location:** `supabase/migrations/` (4 files dated 2026-03-13) vs. `mcp__claude_ai_Supabase__list_migrations` (36 entries through 2026-05-03).
- **Description:** The MCP `apply_migration` tool registers migrations on the remote DB only — it does not write a local file under `supabase/migrations/`. As a result, the local repo has 4 migrations from March while Supabase has 36 — a 32-migration drift. Replaying the schema from a fresh Supabase via `supabase db push` would skip every migration applied via MCP since March, including the canonical RLS retrofit (`20260412182508`), CRM schema (`20260420135659`), payment lifecycle (4 files, late April), and now C-001. C-001's migration was added by hand (this commit) but the other 31 are still un-tracked.
- **Reproduction:**
  ```
  ls supabase/migrations/ | wc -l                   # → 4
  mcp list_migrations | jq '.migrations | length'   # → 36
  diff <(ls supabase/migrations/ | sed 's/_.*//') <(mcp list_migrations | jq -r '.migrations[].version')
  # → 32 entries present remotely, missing locally
  ```
- **Expected vs Actual:**
  - Expected: every migration applied to the live DB has a matching `supabase/migrations/<version>_<name>.sql` file in git, so a fresh tenant onboarding can replay schema deterministically.
  - Actual: 32 migrations exist only on the remote.
- **Suggested next action:** **TECH_DEBT** — open a backlog SPEC `M4_BACKFILL_MISSING_MIGRATIONS` (post-cutover). The work: for each version in `list_migrations` not present locally, fetch the migration body via Supabase admin API (or pg_dump if needed) and write the file under `supabase/migrations/`. Then a single `chore(db): backfill 31 missing migration files` commit.
- **Rationale for action:** Not a cutover blocker (the live DB is the operational source of truth, not git). But it IS a SaaS-readiness blocker — a second-tenant deploy on a fresh Supabase project will fail without these. Should be done before any new-tenant onboarding work.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — `crm_message_log` rejection insert fails silently when `lead_id` doesn't exist

- **Code:** `M4-BUG-01`
- **Severity:** LOW
- **Discovered during:** Step 8 Test B (foreign phone curl) — the response returned `ok:false, phone_not_allowed` correctly, but no `crm_message_log` row was actually written.
- **Location:** `supabase/functions/send-message/index.ts:298-302` (the layer-1 rejection insert).
- **Description:** When `phoneAllowed` returns false, the EF inserts a `crm_message_log` row with `status='rejected'` then returns `ok:false, error='phone_not_allowed'`. The insert is fired without `.select().single()` so its error is not surfaced. If the `lead_id` violates the FK to `crm_leads` (e.g., a test using a placeholder UUID), the insert silently fails and only the response code surfaces. Operationally this means a real customer dispatch with an `unbinding-lead-deletion` race (lead deleted between dispatch start and rejection-row insert) would lose its rejection audit trail. Low severity because (a) the response still tells the caller, (b) leads are soft-deleted not hard-deleted in normal flow.
- **Reproduction:**
  ```
  # Query crm_message_log with a known-bad lead_id payload — see no row written, despite ok:false response.
  POST send-message with lead_id='00000000-0000-0000-0000-000000000000' and a non-allowlisted phone
  → HTTP 200, body { ok:false, error:phone_not_allowed }
  → SELECT * FROM crm_message_log WHERE created_at > now()-INTERVAL '1 minute' → empty
  ```
- **Expected vs Actual:**
  - Expected: rejection insert either succeeds (audit row present) OR the EF returns 500 so the caller knows.
  - Actual: silent insert failure, EF returns ok:false.
- **Suggested next action:** **TECH_DEBT** — small follow-up SPEC, post-cutover. The fix is a `.select("id").single()` on the reject insert plus a console.warn on FK-violation classes; no behavior change for the happy path.
- **Rationale for action:** Real-world impact is negligible (unbinding-lead-deletion races are rare in this app's flow), but the silent-fail is a Rule 22 (defense-in-depth) gap on the audit path — worth closing.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — `send-message/index.ts` now 318 lines (Rule 12 soft cap = 300, hard = 350)

- **Code:** `M4-DEBT-02`
- **Severity:** LOW
- **Discovered during:** Pre-commit hook on Commit A.
- **Location:** `supabase/functions/send-message/index.ts` — file size 318 lines after C-001.
- **Description:** Pre-C001, send-message/index.ts was 303 lines (already above the 300 soft target). C-001's async `phoneAllowed` rewrite added ~15 lines (the DB lookup + fail-closed branches). The hard cap is 350 lines per Rule 12; we have 32 lines of headroom. Two future Rungs that touch this file (e.g., the email allowlist post-cutover SPEC mentioned in C-001 §10) could push it over 350 — at which point a structural split is forced.
- **Reproduction:** `wc -l supabase/functions/send-message/index.ts` → 318.
- **Expected vs Actual:**
  - Expected: file under 300 lines (soft target).
  - Actual: 318.
- **Suggested next action:** **TECH_DEBT** — track for next post-cutover EF cleanup pass. Candidate extraction targets: the validation block (lines ~136–150), the template-resolution block (lines ~168–250), or the final-stage allowlist+recipient check block (lines ~286–304). All three are cohesive units. Most natural extraction is template-resolution into a `template-resolver.ts` peer module (mirroring how `dispatch.ts` was extracted in P31).
- **Rationale for action:** Not a cutover blocker. Rule 12 soft-target violations are explicitly tolerated below the hard cap. But each future SPEC touching this file should weigh "extract first, then add" instead of "add and re-warn".
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 4 — `tenants` JSONB column sprawl (informational; mirrors FOREMAN_REVIEW TD-2)

- **Code:** `M4-INFO-01`
- **Severity:** INFO
- **Discovered during:** Step 1 pre-flight DB check.
- **Location:** `tenants` table — JSONB columns: `payment_links`, `shipment_config`, `ui_config`, and now (post-C001) `test_mode_sms_allowlist`.
- **Description:** `tenants` already had 3 JSONB columns; C-001 added a 4th. FOREMAN_REVIEW §6 explicitly noted this as TD-2 ("the schema is sprawling … a future SaaS-readiness SPEC could consolidate the JSONB columns into a single `config jsonb` with namespaced keys"). This is a recap of that finding to keep it visible alongside the executor-side artifacts.
- **Reproduction:**
  ```sql
  SELECT column_name FROM information_schema.columns
  WHERE table_schema='public' AND table_name='tenants' AND data_type='jsonb' ORDER BY column_name;
  -- → payment_links, shipment_config, test_mode_sms_allowlist, ui_config
  ```
- **Expected vs Actual:** N/A — this is an architectural observation.
- **Suggested next action:** **NEW_SPEC** post-cutover (per FOREMAN_REVIEW TD-2). A consolidation SPEC would (a) add a single `config jsonb`, (b) backfill from the 4 existing columns under namespaced keys (`config.payments.links`, `config.shipment`, `config.ui`, `config.test_mode.sms_allowlist`), (c) update every reader site, (d) drop the 4 individual columns in a separate "cleanup" Rung once readers are stable.
- **Rationale for action:** Not a cutover blocker. SaaS-readiness consideration for second-tenant onboarding clarity.
- **Foreman override (filled by Foreman in review):** { }

---

*End of FINDINGS.*
