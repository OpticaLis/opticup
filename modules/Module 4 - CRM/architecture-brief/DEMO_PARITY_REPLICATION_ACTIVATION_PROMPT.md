# Activation: Demo Tenant — Behavior Parity Replication from Prizma

טען `opticup-strategic` ב-Full-Auto Pipeline mode.

**Brief:** `modules/Module 4 - CRM/architecture-brief/DEMO_PARITY_REPLICATION_BRIEF.md`

**Mission:** Replicate Prizma's behavioral configuration (rules / templates / lookups / automation) to demo tenant in ONE Pipeline run, scoped per-table, with NO DELETE, NO schema changes, and Prizma stays read-only throughout. Demo's identity (name, address, logo, channels, allowlists, storefront_url) untouched. After this completes, demo's behavior is 1:1 with Prizma — Daniel re-tests on demo.

**Target tenants:**
- Source (read-only): Prizma — query `tenants WHERE slug = 'prizma'` for UUID
- Destination (writes scoped here only): Demo — `8d8cfa7e-ef58-49af-9702-a862d459cccb`

**Deliverables:**
- `REPLICATION_PLAN.md` — classification of every `tenant_id`-bearing table into Behavioral / Identity / Content / Ambiguous
- `TEST_REPORT.md` — pre/post snapshots per table (counts + hashes)
- INSERT + UPDATE rows in demo for all "Behavioral" tables to match Prizma
- ZERO writes to Prizma rows
- ZERO writes to demo's "Identity" tables
- ZERO DELETE statements anywhere
- EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md
- DECISIONS_LOG entry
- OPEN_TASKS.md update

**Continuous-Run Mandate (planned escalation if ambiguities):**
- Run in ONE Claude Code chat.
- One planned escalation point: if any table classification is ambiguous after diagnostic, write escalation to Architect with proposed classification.
- Status lines (one Hebrew line per major phase + per table replicated) only.

**Destructive Operations Envelope:**
- INSERT in behavioral tables, demo tenant_id only
- UPDATE in behavioral tables, demo tenant_id only
- ZERO DELETE
- ZERO schema changes
- ZERO writes to Prizma anywhere
- ZERO writes to demo's `tenants` row, `tenant_employees`, channels, identity tables
- ZERO code changes
- NO force-push, NO merge to main, NO outbound messages
- Anything outside envelope → STOP + escalate

**Phase 1 — Discovery (read-only):**
1. `SELECT table_name FROM information_schema.columns WHERE column_name = 'tenant_id' AND table_schema = 'public' ORDER BY table_name` — list all tenant-scoped tables.
2. For each table, classify:
   - **Behavioral** — rules, templates, lookups, automation, configuration that drives "what the system does." Examples: `automation_rules`, `message_templates`, `event_types`, `lead_statuses`, `lead_sources`, `*_categories`, `*_types`.
   - **Identity** — tenant-unique branding/channels/staff. Examples: `tenants` (the row itself), `tenant_employees`, `whatsapp_phone_numbers`, `sms_sender_ids`.
   - **Content** — runtime customer/lead/order data. Examples: `crm_leads`, `crm_events`, `customers`, `orders`, `sub_orders`, `inventory`, `pages`, `posts`, `media`.
   - **Ambiguous** — escalate.
3. For each Behavioral table, identify the business key (unique combination minus `tenant_id` and `id`) used to match Prizma's rows to demo's rows.
4. Save full classification to `REPLICATION_PLAN.md`.

If any table is Ambiguous → STOP + escalate with proposed classification. Wait for Architect decision.

**Phase 2 — Pre-Snapshot:**
For each Behavioral table, capture:
- Demo row count
- Prizma row count
- Demo content hash (md5 or similar of stringified rows minus id and tenant_id)
- Prizma content hash
Save to TEST_REPORT.md.

**Phase 3 — Per-Table Replication (one transaction per table):**
For each Behavioral table T, in alphabetical order:

```sql
BEGIN;
-- For each Prizma row in T:
--   If equivalent row in demo (matched by business key) does NOT exist → INSERT with demo tenant_id, all other columns copied
--   If equivalent row in demo exists but content differs → UPDATE demo's row to match Prizma's content (excluding id, tenant_id)
--   If row in demo NOT in Prizma → LEAVE IT (no DELETE)
COMMIT;
```

Log: number of INSERTs, number of UPDATEs, demo orphans flagged (rows in demo but not in Prizma).

**Phase 4 — Post-Snapshot + Verification:**
For each Behavioral table:
- Re-count demo rows (must equal or exceed Prizma's count)
- Re-hash demo content for rows matching Prizma's business keys (must equal Prizma's hash for those keys)
- Re-count + re-hash Prizma's rows (must be IDENTICAL to pre-snapshot — proof Prizma wasn't touched)
Save to TEST_REPORT.md.

For each Identity table:
- Verify demo row's `updated_at` is unchanged (proof identity wasn't touched)

Critical: if Prizma row count or hash changed for any table → STOP IMMEDIATELY + escalate (catastrophic regression signal).

**Phase 5 — Closure:**
Standard Pipeline closure phases.

**Success Criteria (self-verifies):**
1. REPLICATION_PLAN.md exists with full table classification
2. No ambiguous tables remaining in plan (resolved or escalated)
3. Pre + post snapshots for every Behavioral table in TEST_REPORT.md
4. Demo's behavioral row count ≥ Prizma's for every replicated table
5. Demo's behavioral content hash for matching business keys = Prizma's
6. Prizma's row count + hash unchanged across all tables (read-only proof)
7. Demo's `tenants` row + identity tables unchanged (updated_at proof)
8. Zero DELETE statements in commit history
9. Zero schema changes (information_schema diff)
10. `npm run verify:integrity` exit 0
11. `npm run smoke` 7/7 PASS
12. Working tree clean
13. Pushed to `origin/develop` (NOT main)
14. DECISIONS_LOG entry with per-table row counts replicated

**Forbidden:**
- DELETE on any row
- UPDATE on Prizma's rows
- UPDATE on demo's `tenants` row
- UPDATE on demo's identity tables (employees / channels)
- Schema changes
- Replicating `crm_leads`, `crm_events`, `customers`, `orders`, `inventory`, content tables
- Replicating Prizma's employees / phone numbers / WhatsApp channels to demo
- Sending any outbound message
- Code changes
- Merge to main

**Closure:** Pipeline writes FOREMAN_REVIEW.md + 2 lessons each. End with ONE Hebrew summary:

> ✅ Demo Parity Replication CLOSED 🟢 — דמו עכשיו 1:1 לפריזמה ברמת התנהגות (rules, templates, lookups). Identity נשמרה. Prizma ללא רגרסיה. דמו מוכן לסבב טסטים מלא.

Begin with discovery phase.
