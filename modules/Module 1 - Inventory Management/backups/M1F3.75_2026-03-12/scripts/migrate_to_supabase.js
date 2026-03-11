const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://tsxrrxzmdxaenlvocyit.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzeHJyeHptZHhhZW5sdm9jeWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIxNzIsImV4cCI6MjA4ODUzODE3Mn0.7Z_lrqHctUqm1offIvZxA17wCI4kRopFWgL1jCDJ9ZU';

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'test_data.json'), 'utf8'));

// Enum mappings: Hebrew → English
const PRODUCT_TYPE_MAP = { 'משקפי ראייה': 'eyeglasses', 'משקפי שמש': 'sunglasses', 'עדשות מגע': 'contact_lenses' };
const STATUS_MAP = { 'פעיל': 'in_stock', 'במלאי': 'in_stock', 'נמכר': 'sold', 'הוזמן': 'ordered', 'ממתין לברקוד': 'pending_barcode', 'ממתין לתמונות': 'pending_images' };
const SYNC_MAP = { 'מלא': 'full', 'תדמית': 'display', 'לא': 'none' };
const BRAND_TYPE_MAP = { 'יוקרה': 'luxury', 'מותג': 'brand', 'רגיל': 'regular' };

// Supplier name normalization (same as upload_to_airtable.js)
const SUPPLIER_NORM = { 'SHARON': 'Sharon', 'SITON': 'Siton', 'Sol optic': 'Sol Optic', 'סי די אופטיק': 'סי די אופטיקה' };

async function sbFetch(endpoint, method, body) {
  const opts = {
    method,
    headers: {
      'apikey': ANON_KEY,
      'Authorization': 'Bearer ' + ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, opts);
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${endpoint} failed (${r.status}): ${text}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  console.log('=== Prizma Optics: Airtable → Supabase Migration ===\n');

  // ---- Step 1: Suppliers ----
  const supplierNames = [...new Set(data.inventory.map(i => {
    let s = i.fields['ספק'] || '';
    return SUPPLIER_NORM[s] || s;
  }).filter(Boolean))];
  console.log(`1. Inserting ${supplierNames.length} suppliers...`);
  const supplierRows = supplierNames.map(name => ({ name, active: true }));
  const insertedSuppliers = await sbFetch('suppliers', 'POST', supplierRows);
  const supplierMap = {};
  insertedSuppliers.forEach(s => { supplierMap[s.name] = s.id; });
  console.log(`   ✓ ${insertedSuppliers.length} suppliers created`);

  // ---- Step 2: Brands ----
  console.log(`2. Inserting ${data.brands.length} brands...`);
  const brandRows = data.brands.map(b => ({
    name: b.name,
    brand_type: BRAND_TYPE_MAP[b.type] || null,
    default_sync: SYNC_MAP[b.defaultSync] || 'none',
    active: b.active !== false
  }));
  // Insert in batches of 50 (some may have duplicate names)
  const insertedBrands = [];
  for (let i = 0; i < brandRows.length; i += 50) {
    const batch = brandRows.slice(i, i + 50);
    try {
      const result = await sbFetch('brands', 'POST', batch);
      insertedBrands.push(...result);
    } catch (e) {
      // Handle duplicates: insert one by one
      for (const row of batch) {
        try {
          const result = await sbFetch('brands', 'POST', [row]);
          insertedBrands.push(...result);
        } catch (e2) {
          if (e2.message.includes('duplicate') || e2.message.includes('23505')) {
            // Already exists, fetch it
            const existing = await sbFetch(`brands?name=eq.${encodeURIComponent(row.name)}&select=id,name`, 'GET');
            if (existing?.length) insertedBrands.push(existing[0]);
          } else {
            console.warn(`   Warning: brand "${row.name}" failed: ${e2.message}`);
          }
        }
      }
    }
  }
  const brandMap = {};
  insertedBrands.forEach(b => { brandMap[b.name] = b.id; });
  console.log(`   ✓ ${Object.keys(brandMap).length} brands mapped`);

  // ---- Step 3: Inventory ----
  console.log(`3. Inserting ${data.inventory.length} inventory items...`);
  const invRows = data.inventory.map(item => {
    const f = item.fields;
    const supplierName = SUPPLIER_NORM[f['ספק']] || f['ספק'] || '';
    const brandName = f['חברה / מותג'] || '';
    return {
      barcode: f['ברקוד'] || null,
      supplier_id: supplierMap[supplierName] || null,
      brand_id: brandMap[brandName] || null,
      model: f['דגם'] || null,
      size: f['גודל'] || null,
      bridge: f['גשר'] || null,
      color: f['צבע'] || null,
      temple_length: f['אורך מוט'] || null,
      product_type: PRODUCT_TYPE_MAP[f['סוג מוצר']] || null,
      sell_price: f['מחיר מכירה'] || 0,
      sell_discount: f['הנחה מכירה %'] || 0,
      cost_price: f['מחיר עלות'] || 0,
      cost_discount: f['הנחה עלות %'] || 0,
      quantity: f['כמות'] || 0,
      website_sync: SYNC_MAP[f['סנכרון אתר']] || 'none',
      status: STATUS_MAP[f['סטטוס']] || 'in_stock',
      brand_type: BRAND_TYPE_MAP[f['סוג מותג']] || null,
      origin: f['מקור'] || null,
      notes: f['הערות'] || null
    };
  });

  let totalInserted = 0;
  const BATCH = 100;
  const totalBatches = Math.ceil(invRows.length / BATCH);
  for (let i = 0; i < invRows.length; i += BATCH) {
    const batch = invRows.slice(i, i + BATCH);
    const batchNum = Math.floor(i / BATCH) + 1;
    const result = await sbFetch('inventory', 'POST', batch);
    totalInserted += result.length;
    console.log(`   Batch ${batchNum}/${totalBatches} — ${result.length} items`);
  }
  console.log(`   ✓ ${totalInserted} inventory items created`);

  // ---- Step 4: Verify ----
  console.log('\n4. Verifying...');
  const supCount = await sbFetch('suppliers?select=id&limit=1000', 'GET');
  const brandCount = await sbFetch('brands?select=id&limit=1000', 'GET');
  const invCount = await sbFetch('inventory?select=id&limit=1', 'GET');
  // Get total inventory count with HEAD request
  const invHead = await fetch(`${SUPABASE_URL}/rest/v1/inventory?select=id`, {
    method: 'HEAD',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': 'Bearer ' + ANON_KEY,
      'Prefer': 'count=exact'
    }
  });
  const invTotal = invHead.headers.get('content-range')?.split('/')[1] || '?';
  console.log(`   Suppliers: ${supCount.length}`);
  console.log(`   Brands: ${brandCount.length}`);
  console.log(`   Inventory: ${invTotal}`);

  console.log('\n=== Migration Complete ===');
}

main().catch(e => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
