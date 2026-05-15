# Demo Tenant — Behavior Parity Replication from Prizma

**Brief version:** v1
**Date:** 2026-05-11
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single chat)
**Owning module:** Module 4 — CRM (with cross-module impact on all tenant-scoped config)

---

## 1. Purpose

Daniel found that opening a new event on demo auto-attaches all prior registrants to a "waiting list" — a bug that was fixed in Prizma post-cutover but never propagated to demo. There are likely other Prizma-fixed-but-demo-broken behavioral gaps.

Goal: replicate Prizma's **behavioral configuration** (rules, templates, automation logic, lookup tables, status flows) to demo in one Pipeline run — without touching demo's **identity** (name, address, logo, storefront URL, allowlists, WhatsApp number, etc.).

This is a one-shot synchronization. After it runs, demo's behavior is 1:1 with Prizma. Daniel then re-tests on demo.

## 2. Strategy: Behavior In, Identity Out

### Tables to replicate (behavioral)

These tables contain rules/templates/logic that drives "what happens when" — replicate Prizma → demo:
- `automation_rules` (or whatever the post-cutover name is — the table that decides "when X happens, do Y")
- `message_templates` (SMS/Email/WhatsApp templates with placeholders)
- `event_types` (configurable per-tenant event categorization)
- `lead_statuses` (status state machine values)
- `lead_sources` (UTM / acquisition channel taxonomy)
- `permission_groups` / `role_permissions` (if tenant-scoped — verify in pre-flight)
- `tenant_features` (feature flag table per-tenant, if exists)
- Any `*_categories` / `*_types` / `*_thresholds` table that's tenant_id-scoped per Iron Rule 19

Diagnostic phase identifies the actual table list (some may not exist yet, some may have different names).

### Replication semantics

For each behavioral table:
1. SELECT all rows where `tenant_id = prizma_uuid`
2. For each Prizma row: check if equivalent row exists in demo (matched by business key — e.g., template_code + tenant_id, or rule_name + tenant_id; exact match strategy per-table)
3. If equivalent in demo NOT present → INSERT row with demo's tenant_id (other fields copied from Prizma)
4. If equivalent in demo present but different → UPDATE demo's row to match Prizma's content (excluding tenant_id and primary key)
5. If row in demo NOT in Prizma → **LEAVE IT** (no DELETE — see Anti-Patterns §10)

### Tables NOT to touch (identity)

These hold Daniel's identity for demo — leave untouched:
- `tenants` table itself (the demo row): name, slug, custom_domain, ui_config (including storefront_url, test_mode_sms_allowlist, test_mode_email_allowlist), logo_url, primary_color, address fields, phone, owner_email, business_settings
- `tenant_employees` / `users` per-tenant (don't copy Prizma's staff to demo)
- `whatsapp_phone_numbers` / `sms_sender_ids` per-tenant (don't copy Prizma's outbound channels to demo)
- Anything containing real customer / lead / order data (this is data, not config)

### Tables that are content-not-config (also out)

- `crm_leads` — actual leads
- `crm_events` — actual events
- `customers` — actual customers
- `orders` / `sub_orders` / `order_items`
- `inventory` rows
- `pages` / `posts` / `blocks` — storefront CMS content (separate concern — Daniel can decide later)
- `media` / `images`

## 3. Pre-Flight Diagnostic

Before any INSERT/UPDATE, the Pipeline must produce a clear "replication plan" document:

1. List all tables in `public` schema with `tenant_id` column
2. For each, classify into:
   - **Behavioral (replicate):** decides what the system does — rules, templates, lookups, automation
   - **Identity (skip):** unique to tenant — name, logo, channels
   - **Content (skip):** runtime data — leads, orders, customers
   - **Ambiguous → escalate to Architect**

3. For each "behavioral" table: identify the business key (composite or single) that determines "this is the same row across tenants" (e.g., for `message_templates` it might be `template_code`).

4. Write `REPLICATION_PLAN.md` in SPEC folder with the full table classification + replication strategy per table.

5. **If any table classification is ambiguous, STOP and escalate.** Don't guess.

## 4. Execution Phases

After REPLICATION_PLAN.md is approved (Pipeline self-approval if everything is clear-cut; escalate to Architect if ambiguity):

1. **Snapshot phase:** for each behavioral table, capture demo's current rows count + a hash of the relevant column values. Save to TEST_REPORT.md as "pre-replication baseline."
2. **Per-table replication phase:** one transaction per table — INSERT missing rows, UPDATE different rows, NO DELETE. Log each operation with row count + business keys affected.
3. **Post-snapshot phase:** re-count + re-hash. Compare to Prizma's row set. Diff documented in TEST_REPORT.md.
4. **Prizma integrity verification:** SELECT Prizma's rows for each touched table again — assert `updated_at` for Prizma rows is unchanged (they should NOT have been touched). Critical regression check.

## 5. Scope — Out

- **Schema changes** — out. If a table exists in Prizma but not in demo via schema (impossible since they share the same DB, but verify) — escalate.
- **DELETE on demo** — out, ever. Demo may have orphan rows that aren't in Prizma; flag them in FINDINGS but don't remove.
- **Code changes** — out. This is data replication only.
- **Storefront content** (pages, blocks, posts) — out for this SPEC. Daniel can request a follow-up if he wants Prizma's pages too.
- **Customer data** — out. We replicate behavior, not customers.
- **Prizma row modifications** — out. Read-only inspection only.
- **`tenants` row modifications for demo** — out (already configured in earlier SPECs; this SPEC only touches behavioral tables).

## 6. Locked Decisions

| # | Decision | Source |
|---|---|---|
| 1 | Replicate behavior, not identity | Architect 2026-05-11 |
| 2 | No DELETE on demo — only INSERT + UPDATE | Architect 2026-05-11 (safety) |
| 3 | No schema changes | Architect 2026-05-11 |
| 4 | Prizma is read-only throughout | Daniel 2026-05-11 |
| 5 | Pre-flight diagnostic + REPLICATION_PLAN.md before any write | Architect 2026-05-11 |
| 6 | Ambiguous table classification → escalate, don't guess | Architect 2026-05-11 |
| 7 | Continuous-Run Mandate with planned escalation if ambiguities | Daniel 2026-05-11 |

## 7. Quality Bar — Acceptance Criteria

1. REPLICATION_PLAN.md exists, classifies all `tenant_id`-bearing tables into behavioral/identity/content/ambiguous.
2. No table marked ambiguous in final plan (either resolved or escalated).
3. Per-table snapshot pre + post counts/hashes documented.
4. Demo's behavioral table row counts ≥ Prizma's (every Prizma row has an equivalent in demo).
5. Demo's identity tables unchanged (verified via `updated_at` comparison for the demo `tenants` row + others).
6. Prizma's rows untouched everywhere (every Prizma row's `updated_at` unchanged).
7. No DELETE statements were executed (verified via Pipeline's own audit log).
8. No schema changes (verified via `information_schema.columns` snapshot pre/post).
9. `npm run verify:integrity` exit 0.
10. `npm run smoke` 7/7 PASS.
11. Working tree clean. Pushed to `origin/develop` (NOT main).
12. DECISIONS_LOG entry with table classification + row counts replicated.
13. FOREMAN_REVIEW notes any rows in demo NOT in Prizma (orphan flags, no action taken, for Daniel's awareness).

## 8. Destructive Operations

Declared:
- **INSERT** rows in behavioral tables (demo tenant_id only) — many rows across many tables
- **UPDATE** existing rows in behavioral tables (demo tenant_id only) where content differs from Prizma equivalent
- All operations scoped via `WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'` for demo + `WHERE tenant_id = <prizma-uuid>` for read

Forbidden:
- DELETE on any table
- UPDATE on Prizma's rows (read-only)
- UPDATE on demo's `tenants` row (identity protection)
- UPDATE on demo's identity tables (employees, channels, etc.)
- Schema changes (ALTER TABLE, ADD COLUMN, DROP COLUMN)
- Code changes
- Force-push
- Merge to main
- Any outbound message

## 9. Continuous-Run Mandate (with planned escalation)

Run in ONE Claude Code chat. Stop on:
- Iron Rule 31/32 violation
- Any table classification is ambiguous after pre-flight investigation — escalate with proposed classification
- Discovery of a row in Prizma that has a `tenant_id` column but the row contains Prizma-identity data accidentally (data leakage signal — escalate immediately)
- Any need to DELETE — STOP, escalate
- Prizma row count for any table differs from snapshot pre/post — possible accidental Prizma write, immediate STOP + rollback

## 10. Anti-Patterns

- DO NOT DELETE rows in demo even if they aren't in Prizma. Flag in FINDINGS instead.
- DO NOT touch demo's `tenants` row — identity stays intact.
- DO NOT modify Prizma's rows under any circumstance.
- DO NOT replicate `crm_leads`, `crm_events`, `customers`, `orders` — these are data, not config.
- DO NOT replicate Prizma's employees, phone numbers, or WhatsApp channels.
- DO NOT add new schema for "missing" tables — escalate.
- DO NOT skip the diagnostic phase. Replicating without classification = data corruption risk.
- DO NOT batch all replications into one mega-transaction. Per-table transactions allow per-table rollback if something goes wrong.

## 11. Recovery Plan

If something goes wrong mid-replication:
1. Pipeline stops on first error
2. Last successful table is documented
3. Daniel can rollback subsequent tables manually if needed
4. The pre-replication snapshot in TEST_REPORT.md provides the rollback target

Critical safety: Prizma's data is read-only throughout. Worst case, demo has partially-replicated behavior; never affects Prizma.

## 12. References

- Demo tenant UUID: `8d8cfa7e-ef58-49af-9702-a862d459cccb`
- Predecessor SPECs in this session: storefront provisioning + SMS allowlist + email allowlist
- Auto-memory `project_cutover_complete_2026_05_03.md` — context on Prizma's post-cutover bug fixes
- Auto-memory `project_crm_open_issues.md` — historical CRM issues (closed but informative on what types of rules exist)
- Auto-memory `feedback_test_phone_numbers.md` — allowlist context

---

*End of brief.*
