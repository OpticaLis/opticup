#!/usr/bin/env node
/**
 * schema-diff.mjs — Compare docs/GLOBAL_SCHEMA.sql to live Supabase DB.
 *
 * Usage:
 *   node scripts/schema-diff.mjs [--verbose] [--only=tables|views|policies] [--json]
 *
 * Exit codes: 0 = no drift, 1 = drift found, 2 = connection/query failure.
 * Credentials come from $HOME/.optic-up/credentials.env via load-env.mjs.
 */
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import loadEnv from './lib/load-env.mjs';
import parseSqlSchema from './lib/parse-sql-schema.mjs';

// --- CLI flags ---
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const jsonOut = args.includes('--json');
const onlyFlag = args.find(a => a.startsWith('--only='));
const only = onlyFlag ? onlyFlag.split('=')[1] : null;

function log(msg) { if (!jsonOut) console.log(msg); }

// --- Load credentials & parse schema file ---
const creds = loadEnv();
const supabaseUrl = creds.PUBLIC_SUPABASE_URL;
const serviceKey = creds.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error('[schema-diff] ERROR: PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
  process.exit(2);
}

const schemaPath = resolve(import.meta.dirname, '..', 'docs', 'GLOBAL_SCHEMA.sql');
const declared = parseSqlSchema(schemaPath);
log(`[schema-diff] Parsed schema file: ${Object.keys(declared.tables).length} tables, ${declared.views.length} views, ${declared.policies.length} policies`);

// --- Connect to Supabase ---
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const driftItems = [];
function drift(category, name, message) {
  driftItems.push({ category, name, message });
  log(`[schema-diff] DRIFT ${category} ${name} — ${message}`);
}

// --- Helper: query live tables via information_schema ---
async function getLiveTables() {
  // Try querying information_schema.tables through RPC or direct access
  const { data, error } = await supabase
    .from('information_schema.tables' )
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_type', 'BASE TABLE');
  if (!error && data) return data.map(r => r.table_name);

  // Fallback: probe each declared table
  log('[schema-diff] info_schema.tables not accessible via REST, falling back to probing');
  const found = [];
  for (const name of Object.keys(declared.tables)) {
    const { error: e } = await supabase.from(name).select('*', { count: 'exact', head: true });
    if (!e) found.push(name);
    else if (verbose) log(`[schema-diff]   probe ${name}: ${e.message}`);
  }
  return found;
}

async function getLiveColumns(tableName) {
  // Try information_schema.columns
  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable')
    .eq('table_schema', 'public')
    .eq('table_name', tableName);
  if (!error && data && data.length > 0) {
    return data.map(r => ({
      name: r.column_name,
      type: r.data_type,
      nullable: r.is_nullable === 'YES'
    }));
  }

  // Fallback: select one row and inspect keys
  const { data: rows, error: e2 } = await supabase.from(tableName).select('*').limit(1);
  if (e2) return null;
  if (rows && rows.length > 0) {
    return Object.keys(rows[0]).map(k => ({ name: k, type: 'UNKNOWN', nullable: true }));
  }
  // Empty table — we know it exists but can't get column names without data
  return [];
}

async function getLiveViews() {
  const { data, error } = await supabase
    .from('information_schema.views')
    .select('table_name')
    .eq('table_schema', 'public');
  if (!error && data) return data.map(r => r.table_name);

  // Fallback: probe declared views
  log('[schema-diff] info_schema.views not accessible, probing declared views');
  const found = [];
  for (const name of declared.views) {
    const { error: e } = await supabase.from(name).select('*', { count: 'exact', head: true });
    if (!e) found.push(name);
  }
  return found;
}

// --- Main ---
async function runSchemaDiff() {
  try {
    // Quick connectivity check
    const { error: pingErr } = await supabase.from('tenants').select('id', { count: 'exact', head: true });
    if (pingErr) {
      console.error(`[schema-diff] ERROR: Cannot connect to Supabase: ${pingErr.message}`);
      process.exit(2);
    }
    log('[schema-diff] Connected to Supabase');

    // === TABLES ===
    if (!only || only === 'tables') {
      log('\n=== TABLES ===');
      const liveTables = await getLiveTables();
      const declaredNames = Object.keys(declared.tables);
      const liveSet = new Set(liveTables);
      const declaredSet = new Set(declaredNames);

      for (const t of declaredNames) {
        if (!liveSet.has(t)) drift('TABLE', t, 'declared in schema file but NOT in live DB');
        else if (verbose) log(`[schema-diff]   ✓ ${t} exists in both`);
      }
      for (const t of liveTables) {
        if (!declaredSet.has(t)) drift('TABLE', t, 'in live DB but NOT declared in schema file');
      }

      // Column-level diff for tables in both
      for (const t of declaredNames) {
        if (!liveSet.has(t)) continue;
        const liveCols = await getLiveColumns(t);
        if (!liveCols) { drift('TABLE', t, 'exists but columns could not be queried'); continue; }
        const declaredCols = declared.tables[t].columns;
        const liveColNames = new Set(liveCols.map(c => c.name));
        const declaredColNames = new Set(declaredCols.map(c => c.name));

        for (const c of declaredCols) {
          if (!liveColNames.has(c.name)) drift('COLUMN', `${t}.${c.name}`, 'declared but missing in live DB');
        }
        for (const c of liveCols) {
          if (!declaredColNames.has(c.name)) drift('COLUMN', `${t}.${c.name}`, 'in live DB but not declared in schema file');
        }
        if (verbose) log(`[schema-diff]   ${t}: ${declaredCols.length} declared cols, ${liveCols.length} live cols`);
      }
    }

    // === VIEWS ===
    if (!only || only === 'views') {
      log('\n=== VIEWS ===');
      const liveViews = await getLiveViews();
      const liveViewSet = new Set(liveViews);
      const declaredViewSet = new Set(declared.views);

      for (const v of declared.views) {
        if (!liveViewSet.has(v)) drift('VIEW', v, 'declared in schema file but NOT in live DB');
        else if (verbose) log(`[schema-diff]   ✓ ${v}`);
      }
      for (const v of liveViews) {
        if (!declaredViewSet.has(v)) drift('VIEW', v, 'in live DB but NOT declared in schema file');
      }
    }

    // === POLICIES ===
    if (!only || only === 'policies') {
      log('\n=== POLICIES ===');
      // Policies require pg_policies which may not be queryable via REST
      const { data: polData, error: polErr } = await supabase
        .from('pg_policies')
        .select('tablename, policyname');

      if (polErr) {
        log(`[schema-diff] WARNING: pg_policies not queryable (${polErr.message}). Skipping policy diff.`);
      } else if (polData) {
        const livePolicies = new Set(polData.map(p => `${p.tablename}::${p.policyname}`));
        for (const p of declared.policies) {
          const key = `${p.table}::${p.name}`;
          if (!livePolicies.has(key)) drift('POLICY', key, 'declared but not in live DB');
          else if (verbose) log(`[schema-diff]   ✓ ${key}`);
        }
        for (const p of polData) {
          const key = `${p.tablename}::${p.policyname}`;
          const declared_key = declared.policies.find(dp => dp.table === p.tablename && dp.name === p.policyname);
          if (!declared_key) drift('POLICY', key, 'in live DB but not in schema file');
        }
      }
    }

    // === Summary ===
    log(`\n[schema-diff] Total drift items: ${driftItems.length}`);
    if (jsonOut) console.log(JSON.stringify({ drift: driftItems, count: driftItems.length }, null, 2));
    process.exit(driftItems.length > 0 ? 1 : 0);

  } catch (err) {
    console.error(`[schema-diff] FATAL: ${err.message}`);
    process.exit(2);
  }
}

runSchemaDiff();
