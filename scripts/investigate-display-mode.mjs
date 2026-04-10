#!/usr/bin/env node
/**
 * investigate-display-mode.mjs — One-time investigation for storefront TECH_DEBT #3.
 * Queries the live DB to resolve display_mode vs storefront_mode terminology.
 *
 * Exit: 0 = success, 2 = query failure. Never exits 1.
 */
import { createClient } from '@supabase/supabase-js';
import loadEnv from './lib/load-env.mjs';

const creds = loadEnv();
const supabase = createClient(creds.PUBLIC_SUPABASE_URL, creds.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

function fail(msg) { console.error(`[investigate] ERROR: ${msg}`); process.exit(2); }

async function getColumnNames(table) {
  const { data, error } = await supabase.from(table).select('*').limit(1);
  if (error) fail(`Cannot query ${table}: ${error.message}`);
  if (!data || data.length === 0) {
    // Try a head request to at least confirm the table exists
    const { error: e2 } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (e2) fail(`Cannot query ${table}: ${e2.message}`);
    return []; // Table exists but empty — can't discover columns via REST
  }
  return Object.keys(data[0]);
}

function filterColumns(cols, patterns) {
  return cols.filter(c => patterns.some(p => c.toLowerCase().includes(p)));
}

async function runInvestigation() {
  console.log('=== DISPLAY MODE INVESTIGATION ===\n');

  // Q1: inventory columns with mode/display/storefront
  console.log('Q1: inventory table — columns matching "mode", "display", "storefront":');
  const invCols = await getColumnNames('inventory');
  const invMatch = filterColumns(invCols, ['mode', 'display', 'storefront']);
  if (invMatch.length > 0) console.log(`  Found: ${invMatch.join(', ')}`);
  else console.log('  None found.');
  console.log(`  (All columns: ${invCols.join(', ')})\n`);

  // Q2: brands columns with mode/display/storefront
  console.log('Q2: brands table — columns matching "mode", "display", "storefront":');
  const brandCols = await getColumnNames('brands');
  const brandMatch = filterColumns(brandCols, ['mode', 'display', 'storefront']);
  if (brandMatch.length > 0) console.log(`  Found: ${brandMatch.join(', ')}`);
  else console.log('  None found.');
  console.log(`  (All columns: ${brandCols.join(', ')})\n`);

  // Q3: v_storefront_products columns (view definition not queryable via REST, but columns are)
  console.log('Q3: v_storefront_products — columns:');
  const viewCols = await getColumnNames('v_storefront_products');
  const viewMatch = filterColumns(viewCols, ['mode', 'display', 'storefront', 'resolved']);
  console.log(`  Mode-related columns: ${viewMatch.length > 0 ? viewMatch.join(', ') : 'none'}`);
  console.log(`  (All columns: ${viewCols.join(', ')})\n`);

  // Q4: Summary — do both display_mode and storefront_mode exist?
  console.log('Q4: Do both display_mode AND storefront_mode columns exist?');
  const allRelevant = [...invMatch, ...brandMatch, ...viewMatch];
  const hasDisplayMode = allRelevant.some(c => c === 'display_mode');
  const hasStorefrontMode = allRelevant.some(c => c === 'storefront_mode');
  console.log(`  display_mode present: ${hasDisplayMode}`);
  console.log(`  storefront_mode present: ${hasStorefrontMode}`);
  if (hasDisplayMode && hasStorefrontMode) {
    console.log('  ⚠️  BOTH columns exist — architectural decision needed!');
  } else if (hasDisplayMode) {
    console.log('  ✓ Only display_mode exists — this is the canonical column name.');
  } else if (hasStorefrontMode) {
    console.log('  ✓ Only storefront_mode exists — this is the canonical column name.');
  } else {
    console.log('  ⚠️  Neither column found on inventory or brands tables.');
    console.log('  The "mode" may only exist as a computed column on the view.');
  }

  console.log('\n=== END INVESTIGATION ===');
}

runInvestigation();
