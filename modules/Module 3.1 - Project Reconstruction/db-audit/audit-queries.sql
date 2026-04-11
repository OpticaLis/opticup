-- =============================================================================
-- Module 3.1 — Phase 3A Live Database Audit Queries
-- =============================================================================
-- Purpose:
--   Read-only SQL to snapshot the live Supabase `public` schema so it can be
--   reconciled against `opticup/docs/GLOBAL_SCHEMA.sql`. Phase 1B and Phase 1C
--   confirmed GLOBAL_SCHEMA.sql has real live-DB drift (not just doc rot) —
--   in particular, missing view declarations, missing storefront tables, and
--   possibly missing policies/RLS state. This file is the input for the
--   reconciliation that happens in Phase 3A Part 2.
--
-- Date created: 2026-04-11
-- Created by:   Module 3.1 Phase 3A Part 1 (PHASE_3A_PART_1_BACKUP_AND_EASY_REWRITES.md)
-- Used by:      Module 3.1 Phase 3A Part 2 (live DB reconciliation)
--
-- How Daniel runs this (Manual Action #2):
--   1. Open Supabase Studio → SQL Editor for the project
--        (https://tsxrrxzmdxaenlvocyit.supabase.co).
--   2. Open this file and run EACH labeled block independently (do NOT run
--      the whole file at once — Supabase SQL Editor truncates long multi-
--      statement results).
--   3. For each block, export the result as JSON (Supabase SQL Editor
--      → "Download JSON") and save to
--      `modules/Module 3.1 - Project Reconstruction/db-audit/results/`
--      with the filename indicated in the block header.
--   4. Commit the results folder on `develop` and ping the next Secondary
--      Chat (Phase 3A Part 2) to proceed with reconciliation.
--
-- Expected output (one JSON file per block):
--   01_tables.json         — ~50 rows (table inventory + RLS state)
--   02_columns.json        — ~700–900 rows (every column of every table)
--   03_views.json          — expected >= 9 rows (storefront views); drift
--                             against GLOBAL_SCHEMA.sql expected (currently 0)
--   04_policies.json       — one row per RLS policy
--   05_functions.json      — one row per function/RPC
--   06_sequences.json      — one row per sequence
--
-- Safety / constraints:
--   - Every query below is `SELECT` only. No DDL, no DML, no function calls
--     with side effects. Safe to run on production (prizma tenant) or demo.
--   - Every query filters to `public` schema where applicable and excludes
--     system schemas (`pg_catalog`, `information_schema`, `pg_toast`,
--     `auth`, `storage`, `graphql`, `graphql_public`, `extensions`,
--     `realtime`, `supabase_functions`, `vault`, `net`).
--   - JSON-friendly column output: no `\x` expanded display, no formatting
--     that requires a TTY. Safe for Supabase Studio "Download JSON".
--
-- Mapping to `opticup/docs/GLOBAL_SCHEMA.sql` sections:
--   Block 1 → tables section (lines ~1–2400 in GLOBAL_SCHEMA.sql)
--   Block 2 → column definitions within each CREATE TABLE
--   Block 3 → views section (EXPECTED but CURRENTLY MISSING per TECH_DEBT #6)
--   Block 4 → CREATE POLICY statements (Rules 14 + 15)
--   Block 5 → CREATE OR REPLACE FUNCTION statements (RPCs, Rule 11)
--   Block 6 → CREATE SEQUENCE statements (if any; most sequences are implicit
--             from identity/serial columns)
-- =============================================================================


-- =============================================================================
-- Block 1 — Tables inventory + RLS enablement state
-- -----------------------------------------------------------------------------
-- Audits: every table in the `public` schema, with owner and whether RLS is
--   currently enabled at the row level (`rowsecurity` from `pg_class`).
-- Maps to: GLOBAL_SCHEMA.sql — every `CREATE TABLE` block + `ALTER TABLE ...
--   ENABLE ROW LEVEL SECURITY`.
-- Rule checks this supports: Rule 14 (tenant_id) + Rule 15 (RLS on every table).
-- Save result as: 01_tables.json
-- =============================================================================
SELECT
  c.relname                                           AS table_name,
  pg_catalog.pg_get_userbyid(c.relowner)              AS owner,
  c.relrowsecurity                                    AS rls_enabled,
  c.relforcerowsecurity                               AS rls_forced,
  obj_description(c.oid, 'pg_class')                  AS table_comment
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'  -- ordinary tables only (not views, not sequences)
ORDER BY c.relname;


-- =============================================================================
-- Block 2 — Columns per table (full definitions)
-- -----------------------------------------------------------------------------
-- Audits: every column in every public table — name, data type, nullability,
--   default expression, ordinal position.
-- Maps to: GLOBAL_SCHEMA.sql — the column list inside each `CREATE TABLE`.
-- Rule checks this supports: Rule 14 (every table must have `tenant_id UUID
--   NOT NULL`), Rule 18 (UNIQUE constraints — tracked separately via
--   pg_constraint below in Block 4's companion query).
-- Save result as: 02_columns.json
-- =============================================================================
SELECT
  c.table_name,
  c.column_name,
  c.ordinal_position,
  c.data_type,
  c.udt_name,
  c.is_nullable,
  c.column_default,
  c.character_maximum_length,
  c.numeric_precision,
  c.numeric_scale
FROM information_schema.columns c
WHERE c.table_schema = 'public'
ORDER BY c.table_name, c.ordinal_position;


-- =============================================================================
-- Block 3 — Views in public schema (including storefront consumer views)
-- -----------------------------------------------------------------------------
-- Audits: every view in `public` — name + full SQL definition.
-- Maps to: GLOBAL_SCHEMA.sql — view section (currently 0 `CREATE VIEW`
--   statements per Phase 1A audit; TECH_DEBT #6 confirms zero declared
--   views; Phase 1C confirmed storefront has 22 views per VIEW_CONTRACTS
--   but opticup-storefront/CLAUDE.md Rule 24 lists only 9). **This block is
--   the primary drift detector.** Expected to return significantly more rows
--   than GLOBAL_SCHEMA.sql declares.
-- Rule checks this supports: Rule 13 (Views-only for external reads) + Rule
--   17 (Views for external access) + Rule 24 (Storefront views-only).
-- Save result as: 03_views.json
-- =============================================================================
SELECT
  table_name                  AS view_name,
  view_definition,
  is_updatable,
  is_insertable_into
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;


-- =============================================================================
-- Block 4 — RLS policies (all policies on public-schema tables)
-- -----------------------------------------------------------------------------
-- Audits: every RLS policy on every public table — table, policy name,
--   command (SELECT/INSERT/UPDATE/DELETE/ALL), allowed roles, USING clause
--   (qual), and WITH CHECK clause.
-- Maps to: GLOBAL_SCHEMA.sql — `CREATE POLICY tenant_isolation ON ... USING
--   (tenant_id = current_setting('app.tenant_id')::uuid)` blocks per Rule 15.
-- Rule checks this supports: Rule 15 (RLS on every table — every public
--   table must have at least one policy) + Rule 22 (defense-in-depth).
-- Save result as: 04_policies.json
-- =============================================================================
SELECT
  schemaname || '.' || tablename  AS qualified_table,
  policyname                      AS policy_name,
  cmd                             AS command,
  roles,
  permissive,
  qual                            AS using_clause,
  with_check                      AS with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;


-- =============================================================================
-- Block 5 — Functions / RPCs in public schema
-- -----------------------------------------------------------------------------
-- Audits: every function/procedure in `public` — name, language, return type,
--   argument types, whether it is SECURITY DEFINER, and volatility. Critical
--   for locating the atomic-sequential RPCs (`next_box_number`,
--   `next_po_number`, `next_return_number`, etc.) required by Rule 11.
-- Maps to: GLOBAL_SCHEMA.sql — `CREATE OR REPLACE FUNCTION` blocks.
-- Rule checks this supports: Rule 11 (sequential number generation via atomic
--   RPC with FOR UPDATE lock).
-- Also surfaces: `pin-auth`-adjacent RPCs and any Edge-Function-backing SQL
--   RPCs that should be audited by Module 3.1 Phase 3 (Edge Function
--   inventory — see SESSION_CONTEXT.md Issue #10 "7 of 8 Edge Functions have
--   no documented source location").
-- Save result as: 05_functions.json
-- =============================================================================
SELECT
  p.proname                                                AS function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid)     AS argument_types,
  pg_catalog.pg_get_function_result(p.oid)                 AS return_type,
  l.lanname                                                AS language,
  p.prosecdef                                              AS security_definer,
  CASE p.provolatile
    WHEN 'i' THEN 'IMMUTABLE'
    WHEN 's' THEN 'STABLE'
    WHEN 'v' THEN 'VOLATILE'
  END                                                      AS volatility,
  p.proretset                                              AS returns_set,
  obj_description(p.oid, 'pg_proc')                        AS function_comment
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
JOIN pg_catalog.pg_language  l ON l.oid = p.prolang
WHERE n.nspname = 'public'
ORDER BY p.proname;


-- =============================================================================
-- Block 6 — Sequences in public schema
-- -----------------------------------------------------------------------------
-- Audits: every sequence in `public` — name, last value, increment, min/max.
--   Most sequences will be implicit (from identity/serial columns), but any
--   explicit `CREATE SEQUENCE` for the atomic RPCs in Rule 11 should appear
--   here.
-- Maps to: GLOBAL_SCHEMA.sql — `CREATE SEQUENCE` blocks (if declared) + the
--   serial-column sequences that Postgres creates implicitly.
-- Rule checks this supports: Rule 11 (sequential number generation).
-- Save result as: 06_sequences.json
-- =============================================================================
SELECT
  c.relname                                           AS sequence_name,
  s.start_value,
  s.minimum_value                                     AS min_value,
  s.maximum_value                                     AS max_value,
  s.increment,
  s.cycle_option,
  pg_catalog.pg_sequence_last_value(c.oid)            AS last_value,
  pg_catalog.pg_get_userbyid(c.relowner)              AS owner
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN information_schema.sequences s
       ON s.sequence_schema = n.nspname
      AND s.sequence_name   = c.relname
WHERE n.nspname = 'public'
  AND c.relkind = 'S'  -- sequences only
ORDER BY c.relname;


-- =============================================================================
-- End of audit queries. All six blocks above are `SELECT` only. Run each
-- independently, export each result as JSON, commit to db-audit/results/,
-- then trigger Phase 3A Part 2 reconciliation.
-- =============================================================================
