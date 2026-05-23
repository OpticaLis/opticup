# SPEC — M5_LEADS_MIGRATION — crm_leads → customers (additive seam)

> **Location:** `modules/Module 5 - Customers/docs/specs/M5_LEADS_MIGRATION/SPEC.md`
> **Authored by:** opticup-strategic — 2026-05-23 NIGHT_RUN chain Track 2
> **Brief:** `NIGHT_RUN_2026_05_23_BRIEF.md` §3.

---

## 0. Pre-Authoring Reality Check

| Premise | Probe | Action |
|---|---|---|
| crm_leads row counts | 1354 prizma + 28 demo ✅ | demo-first migrate, then gated Prizma |
| customer_lifecycle_stage enum | {prospect, active, dormant} — **'lead' NOT a value** | ALTER TYPE ADD VALUE 'lead' (first migration) |
| customers count | 10 demo + 0 prizma | room for both migrations |
| crm_leads incoming FKs | 9 tables (capi_dispatch_queue, event_attendees, lead_notes, lead_tags, lead_touchpoints, message_log, message_queue, suppressions, unsubscribes) | LEAVE ALONE — additive only, M4 cutover handles FK re-point later |
| crm_leads → customers seam | none currently | ADD COLUMN `customers.source_crm_lead_id uuid REFERENCES crm_leads(id)` + tenant-scoped partial UNIQUE |
| Phone-dedup field on customers | `phone text` with partial UNIQUE (phone, tenant_id) WHERE phone IS NOT NULL AND is_deleted=false | use existing index for dedup lookup |

### Strategic decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | **Additive only** — INSERT/UPDATE on customers + add 1 column. NO DROP of crm_leads, NO ALTER of crm_leads' FKs | M4 production keeps writing to crm_leads; this is a SEAM not a cutover. Cutover = separate far-future SPEC. |
| D2 | New enum value **'lead'** added to `customer_lifecycle_stage` | Brief §3 explicit. Existing prospect/active/dormant unchanged. |
| D3 | New column `customers.source_crm_lead_id uuid REFERENCES crm_leads(id)` with partial UNIQUE | Idempotent re-runs; future M4-cutover SPEC uses this map to re-point the 9 FK tables. |
| D4 | **Phone-based dedup** (per M5 §4.7) — if customers WHERE phone=lead.phone AND tenant_id=lead.tenant_id exists + is_deleted=false → LINK (UPDATE source_crm_lead_id only). Otherwise INSERT new customer. | Avoids double-personing leads who already became customers. |
| D5 | Consent mapping for migrated leads | `crm_marketing_consent = lead.marketing_consent`; other 3 consent booleans = false (per M5 §5.2 v2 lead defaults — opted_out). |
| D6 | Atomic batch RPC `migrate_crm_leads_to_customers(p_tenant_id uuid)` — Block A + service_role-only EXECUTE for safety | Single RPC orchestrates ALTER TYPE prerequisite + INSERTs + returns row counts. |
| D7 | Demo first → smoke 5/5 → backup before Prizma → Prizma write → verify-after | Brief §3 explicit gate. |
| D8 | customer_number allocation for migrated leads | Allocated via existing `allocate_tenant_number(_, 'customer')` — leads get fresh customer_numbers (sequential per-tenant, after existing #10 on demo + 0 on prizma). |
| D9 | `home_branch_id` for migrated leads | `crm_leads` has no branch column → use the tenant's first active `tenant_location` (default branch). Demo = STA. Prizma = first active branch. |

### Cross-Reference Check (Step 1.5)

- `migrate_crm_leads_to_customers` — 0 grep hits → safe new RPC
- `customers.source_crm_lead_id` — 0 hits → safe new column
- enum value `'lead'` — only existed in this Brief; no other consumers grep'd
- Index name `customers_source_crm_lead_id_uidx` — 0 hits → safe

### Runtime semantics rehearsed

- **ALTER TYPE ADD VALUE** must be in its own migration (PostgreSQL constraint: not within an explicit transaction that uses the new value). Migration 1 = ADD VALUE alone.
- Migration RPC is service_role-only (no authenticated EXECUTE grant — admin-only operation). Block A only needs the service_role bypass branch + tenant_id parameter check.
- Phone dedup uses partial UNIQUE on (phone, tenant_id) WHERE phone IS NOT NULL AND is_deleted=false. INSERT-or-LINK done via SELECT-then-INSERT (no race because batch runs serially under service_role with tenant_id locked).
- crm_leads with NULL phone (if any) → cannot dedup → always INSERT new customer. Probe shows demo crm_leads.phone is NOT NULL (per crm_leads schema: phone TEXT NOT NULL); confirmed.

### Lessons applied

- M5_SCHEMA P-AUTHOR-1 — per-table column-count manifest in §3
- Strategic Review F-C-1 / R4 — additive seam, no cutover
- Memory `feedback_probe_biggest_production_tenant.md` — pre-flight probes ran against both demo + prizma counts. Smoke runs demo only; Prizma write gated by backup + verify.

---

## 1. Goal

Establish the `crm_leads → customers` seam by inserting 28 demo + 1,354 Prizma leads as `lifecycle_stage='lead'` customers, with phone-based dedup against existing customers and a back-reference column for future FK re-point. No DROP of crm_leads. M4 production continues writing to crm_leads through cutover; this SPEC creates the customer-side mirror so M5 RPCs see lead-only people.

---

## 2. Background

The M5 §1.1 decision absorbed leads into the single customers entity, but the migration was deferred. Until this seam exists, two parallel person-stores coexist (Strategic Review F-C-1 / R4). UI work on M5's "single person entity" misrenders any lead-only person. This SPEC closes the seam additively — additive INSERT + 1 new column + 1 new RPC + new enum value, NO DROP, NO ALTER on existing FK targets.

---

## 3. Success Criteria

| # | Criterion | Expected | Verify |
|---|---|---|---|
| 1 | Branch state | develop, M5 paths clean | git status |
| 2 | SPEC folder | 7 files (SPEC + MIGRATION + EXECUTION_REPORT + FINDINGS + TEST_REPORT + REVIEW + FOREMAN_REVIEW) | ls |
| 3 | Enum value 'lead' present | pg_enum has 4 values | SELECT enumlabel FROM pg_enum WHERE enumtypid='customer_lifecycle_stage'::regtype |
| 4 | `customers.source_crm_lead_id` column exists | uuid, nullable | information_schema |
| 5 | Partial unique index `customers_source_crm_lead_id_uidx (source_crm_lead_id, tenant_id) WHERE source_crm_lead_id IS NOT NULL` | 1 index | pg_indexes |
| 6 | RPC `migrate_crm_leads_to_customers(p_tenant_id uuid)` deployed | SECURITY DEFINER + search_path + service_role-only | pg_proc |
| 7 | Demo smoke 5/5 PASS | TEST_REPORT.md | all ✅ |
| 8 | Demo: 28 demo leads migrated (or linked to existing customers via phone) | demo customers WHERE source_crm_lead_id IS NOT NULL count = 28 OR (inserted + linked = 28) | SELECT |
| 9 | Demo: customers lifecycle='lead' count + linked count sum to 28 (post-migration on demo) | exact match | SELECT |
| 10 | Backup of customers + crm_leads pre-Prizma | _archive backup folder created with SELECT snapshot | git add |
| 11 | Prizma: 1354 leads migrated (after Prizma gate) | prizma customers WHERE source_crm_lead_id IS NOT NULL = 1354 OR linked count + inserted = 1354 | SELECT |
| 12 | crm_leads row counts UNCHANGED | demo=28 + prizma=1354 (no DROP, no DELETE) | SELECT |
| 13 | 9 crm_leads FK tables untouched | foreign_keys + row counts unchanged | SELECT |
| 14 | M4 demo write test passes | a new crm_leads INSERT still succeeds | smoke S4 |
| 15 | Integrity Gate exit 0/2 | confirmed | npm run verify:integrity |
| 16 | Destructive Ops declared (INSERT-into-customers + UPDATE-link + new column + new enum value + new RPC; NO DROP) | gate passes | scripts/checks |
| 17 | MIGRATION.md | ≥4 entries | cat |

### 3a. Demo functional smoke (5 cases)

| # | Case | Expected | Status |
|---|---|---|---|
| T2-S1 | All 28 demo leads present in customers post-migration (inserted or linked) | count(crm_leads WHERE tenant_id=demo) = count of demo customers linked via source_crm_lead_id (OR linked existing) | — |
| T2-S2 | Phone-dedup works: if a demo lead's phone matches an existing demo customer (none today since 10 demo customers all from M5 smoke), an UPDATE-link should occur not a new INSERT | dedup logic exercised + verified — set up a test case where customer phone matches lead phone | — |
| T2-S3 | 9 crm_leads FK tables resolve correctly post-migration (e.g. crm_event_attendees.lead_id still resolves to a real crm_leads row) | demo crm_event_attendees rows unaffected | — |
| T2-S4 | M4 demo write still succeeds: a new INSERT into crm_leads via direct SQL (service_role) succeeds (no schema break) | INSERT 1 fake crm_lead row + DELETE it | — |
| T2-S5 | Cross-tenant isolation: demo migration does NOT touch any prizma customers / source_crm_lead_id values | prizma customers untouched | — |

---

## 4. Autonomy Envelope

### What the executor CAN do
- Apply 4 migrations via MCP
- Run the demo migration RPC against demo tenant
- After demo smoke 5/5 PASS: take backup (SELECT-snapshot dump into _archive)
- Run Prizma migration ONLY after backup + smoke 5/5 confirmed
- Selective git add for M5 paths + GLOBAL docs

### What REQUIRES stopping
- Demo smoke S1-S5 failure → STOP, do NOT touch Prizma
- Any `crm_leads.id` DROP attempt → STOP (Destructive Ops envelope)
- Touching M4 modules outside the seam → STOP
- Touching M9 (Track 3 territory) → STOP

---

## 5. Stop-on-Deviation

- If `crm_leads_demo` count drops below 28 mid-migration → STOP (M4 writing concurrently?)
- If `customers.lifecycle_stage` enum already has 'lead' → SKIP M1 migration, note in §0
- If demo migration produces fewer rows than expected → STOP, investigate phone-dedup logic
- Any new HIGH/ERROR advisor → STOP

---

## 6. Rollback Plan

- Migrations 1-3 (schema) all additive + idempotent → safe to re-run
- Migration 4 (the RPC) is CREATE OR REPLACE → safe
- Data writes via RPC: re-running on demo is idempotent (partial UNIQUE on source_crm_lead_id blocks re-INSERT for same lead)
- If Prizma write needs revert: `DELETE FROM customers WHERE tenant_id=prizma AND source_crm_lead_id IS NOT NULL` — recorded as the rollback statement in MIGRATION.md but NOT auto-issued

---

## Destructive Operations

This SPEC declares the following non-DROP destructive-class operations per Iron Rule 32:

1. **INSERT** into `customers` (demo: ≤28 new rows; Prizma: ≤1354 new rows) — reversible via DELETE-by-source_crm_lead_id.
2. **UPDATE** on `customers` to set `source_crm_lead_id` for phone-matched existing rows.
3. **ALTER TYPE** `customer_lifecycle_stage` ADD VALUE 'lead' — irreversible (PostgreSQL does not support DROP VALUE on enum), but additive.
4. **ALTER TABLE** `customers` ADD COLUMN source_crm_lead_id uuid + partial UNIQUE index.

**NO DROP** of any table, column, or constraint. **NO TRUNCATE.** **NO DELETE** without tenant scope.

Prizma write is gated by demo smoke 5/5 + backup taken.

---

## 7. Out of Scope

- DROP / decommission of `crm_leads` — separate far-future SPEC
- Re-pointing the 9 crm_leads FK tables (capi_dispatch_queue, event_attendees, lead_notes, lead_tags, lead_touchpoints, message_log, message_queue, suppressions, unsubscribes) — separate M4-cutover SPEC
- M4 RPC changes (M4 keeps writing crm_leads as-is)
- OpticPlus 5,028-customer historical import — separate SPEC
- UI
- Touching M9
- crm_leads schema changes

---

## 8. Expected Final State

### DB state (demo, after Track 2 Step 1)
- 28 demo leads migrated to customers (some via INSERT with new customer_numbers, some via UPDATE-link if phone matched)
- `customers.lifecycle_stage` enum has 'lead' value
- `customers.source_crm_lead_id` column populated for the 28 demo lead-derived customers

### DB state (after Prizma write, Track 2 Step 2)
- 1354 prizma leads migrated to customers
- All 28 demo + 1354 prizma source_crm_lead_id values traceable back to crm_leads.id

### Files
- This SPEC folder × 7 files + a `backup/` subfolder for the pre-Prizma snapshot

---

## 9. DDL — Build Order

### M5_T2_01_lifecycle_lead_enum

```sql
ALTER TYPE public.customer_lifecycle_stage ADD VALUE IF NOT EXISTS 'lead';
```

### M5_T2_02_source_crm_lead_id_col

```sql
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS source_crm_lead_id uuid REFERENCES public.crm_leads(id);

COMMENT ON COLUMN public.customers.source_crm_lead_id IS
  'M5_LEADS_MIGRATION seam: traces a customer row back to its originating crm_lead. NULL for customers created via M5 create_customer (no lead origin). Future M4-cutover SPEC uses this to re-point crm_leads FK tables (crm_event_attendees, crm_message_log, etc.).';

CREATE UNIQUE INDEX IF NOT EXISTS customers_source_crm_lead_id_uidx
  ON public.customers (source_crm_lead_id, tenant_id) WHERE source_crm_lead_id IS NOT NULL;
```

### M5_T2_03_migrate_crm_leads_rpc

```sql
CREATE OR REPLACE FUNCTION public.migrate_crm_leads_to_customers(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_default_branch_id uuid;
  v_total_leads int;
  v_inserted int := 0;
  v_linked int := 0;
  v_skipped int := 0;
  v_rec record;
  v_existing_customer_id uuid;
  v_new_customer_id uuid;
  v_customer_number bigint;
BEGIN
  -- Service-role only operation (migration); authenticated callers also OK if tenant matches
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Default branch (first active tenant_location for this tenant)
  SELECT id INTO v_default_branch_id FROM public.tenant_location
    WHERE tenant_id = p_tenant_id AND is_active = true AND is_deleted = false
    ORDER BY short_code NULLS LAST LIMIT 1;
  IF v_default_branch_id IS NULL THEN
    RAISE EXCEPTION 'No active tenant_location for tenant %', p_tenant_id USING ERRCODE = '22023';
  END IF;

  SELECT count(*) INTO v_total_leads FROM public.crm_leads WHERE tenant_id = p_tenant_id AND is_deleted = false;

  -- Iterate leads; INSERT or LINK based on phone dedup + already-migrated check
  FOR v_rec IN
    SELECT * FROM public.crm_leads
    WHERE tenant_id = p_tenant_id AND is_deleted = false
    ORDER BY created_at  -- preserve chronological order
  LOOP
    -- Skip if already migrated (idempotent re-run)
    IF EXISTS (SELECT 1 FROM public.customers
               WHERE source_crm_lead_id = v_rec.id AND tenant_id = p_tenant_id) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Phone-dedup: if a non-deleted customer already exists with this phone, LINK
    SELECT id INTO v_existing_customer_id FROM public.customers
      WHERE tenant_id = p_tenant_id
        AND phone = v_rec.phone
        AND is_deleted = false
      LIMIT 1;

    IF v_existing_customer_id IS NOT NULL THEN
      UPDATE public.customers
        SET source_crm_lead_id = v_rec.id,
            updated_at = now()
        WHERE id = v_existing_customer_id;
      v_linked := v_linked + 1;
      CONTINUE;
    END IF;

    -- INSERT new lead-derived customer
    v_customer_number := public.allocate_tenant_number(p_tenant_id, 'customer');

    INSERT INTO public.customers (
      tenant_id, full_name, phone, email, city,
      language_code, home_branch_id, customer_number,
      lifecycle_stage,
      source, utm_source, utm_medium, utm_campaign, utm_content, utm_term, utm_campaign_id,
      first_interaction_at, consent_form_signed_at,
      crm_marketing_consent, customer_marketing_consent,
      customer_operational_consent, crm_operational_consent,
      source_crm_lead_id, created_at
    ) VALUES (
      v_rec.tenant_id,
      v_rec.full_name,
      v_rec.phone,
      v_rec.email,
      v_rec.city,
      coalesce(v_rec.language, 'he'),
      v_default_branch_id,
      v_customer_number::integer,
      'lead'::public.customer_lifecycle_stage,
      v_rec.source, v_rec.utm_source, v_rec.utm_medium, v_rec.utm_campaign,
      v_rec.utm_content, v_rec.utm_term, v_rec.utm_campaign_id,
      v_rec.created_at,                              -- treat lead created_at as first_interaction_at
      v_rec.terms_approved_at,                       -- consent_form_signed_at
      v_rec.marketing_consent,                       -- crm_marketing_consent inherits lead.marketing_consent
      false, false, false,                           -- other consents default opted_out (M5 §5.2 v2)
      v_rec.id,
      v_rec.created_at
    );
    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'tenant_id', p_tenant_id,
    'total_leads_scanned', v_total_leads,
    'inserted_as_new_customer', v_inserted,
    'linked_to_existing_customer', v_linked,
    'skipped_already_migrated', v_skipped
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.migrate_crm_leads_to_customers(uuid) FROM anon, PUBLIC, authenticated;
GRANT  EXECUTE ON FUNCTION public.migrate_crm_leads_to_customers(uuid) TO service_role;

COMMENT ON FUNCTION public.migrate_crm_leads_to_customers(uuid) IS
  'M5_LEADS_MIGRATION track 2 RPC. Idempotent — skips leads already migrated (source_crm_lead_id matched). Phone-dedups against existing customers. Service_role-only (admin operation, not exposed to authenticated UI).';
```

---

## 10. Dependencies

- M5_M8_CROSS_CONTRACT_FIXES (Track 1) closed 🟢 — verified.
- `allocate_tenant_number(uuid, text)` available — verified.
- `customers.phone` partial UNIQUE on (phone, tenant_id) WHERE phone IS NOT NULL — verified live.
- `crm_leads` table available with NOT NULL phone column — verified.

---

## 11. Lessons Already Incorporated

- M5_SCHEMA F-M5-F2 — demo branches STA/STB exist; use STA as default home_branch (RPC body picks first active by short_code).
- Strategic Review R4 — additive seam not cutover.
- Code Review F-C2 — CHECK constraint payments.amount > 0 already in place from Track 1; not relevant to this SPEC (no payment writes).

---

## 12. Pre-Merge Checklist

- [ ] All 17 §3 criteria pass
- [ ] Integrity Gate exit 0/2
- [ ] M5 paths clean
- [ ] 7 SPEC folder files written
- [ ] Backup snapshot taken before Prizma write
- [ ] Demo 5/5 smoke PASS confirmed before Prizma RPC call
- [ ] Prizma row count = 1354 migrated post-run
- [ ] crm_leads row counts UNCHANGED (28 demo + 1354 prizma)

---

*End of M5_LEADS_MIGRATION SPEC. After 🟢 + Prizma migration confirmed, chain continues to Track 3.*
