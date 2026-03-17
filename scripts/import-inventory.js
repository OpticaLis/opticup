const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://tsxrrxzmdxaenlvocyit.supabase.co';
const SERVICE_KEY = process.env.OPTICUP_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) {
  console.error('ERROR: Set OPTICUP_SERVICE_ROLE_KEY env var');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY);
const TENANT_ID = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
const BATCH_SIZE = 500;

async function main() {
  // ── Read & clean Excel ──
  const filePath = process.argv[2] || 'C:/Users/User/Desktop/כל המסגרות.xls';
  console.log('Reading:', filePath);
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
  console.log('Raw rows:', raw.length);

  const cleaned = raw.filter(r => {
    const bc = String(r['בר-קוד'] || '').trim();
    const qty = Number(r['כמות'] || 0);
    return bc.length > 0 || qty > 0;
  });
  console.log('Cleaned rows:', cleaned.length);

  // ── STEP 1: Create suppliers ──
  console.log('\n=== STEP 1: SUPPLIERS ===');
  const supplierNames = [...new Set(
    cleaned.map(r => String(r['שם ספק'] || '').trim()).filter(Boolean)
  )].sort();
  // Add "לא משויך" for empty supplier rows
  const allSupplierNames = [...supplierNames, 'לא משויך'];
  console.log('Suppliers to create:', allSupplierNames.length);

  const supplierRows = allSupplierNames.map((name, i) => ({
    name,
    tenant_id: TENANT_ID,
    supplier_number: 10 + i,  // supplier_number must be >= 10
    active: true
  }));

  const { data: suppData, error: suppErr } = await sb
    .from('suppliers')
    .insert(supplierRows)
    .select('id, name');

  if (suppErr) {
    console.error('Supplier insert error:', suppErr);
    process.exit(1);
  }
  console.log('Suppliers created:', suppData.length);

  // Build name → id map
  const supplierMap = {};
  suppData.forEach(s => { supplierMap[s.name] = s.id; });
  const unmatchedSupplierId = supplierMap['לא משויך'];
  console.log('Unmatched supplier ID:', unmatchedSupplierId);

  // ── STEP 2: Create brands (normalized) ──
  console.log('\n=== STEP 2: BRANDS ===');
  const rawBrandNames = [...new Set(
    cleaned.map(r => String(r['חברה'] || '').trim()).filter(Boolean)
  )];
  console.log('Raw unique brands:', rawBrandNames.length);

  // Normalize: group by lowercase, pick the best casing
  const brandGroups = {};
  rawBrandNames.forEach(name => {
    const key = name.toLowerCase();
    if (!brandGroups[key]) brandGroups[key] = [];
    brandGroups[key].push(name);
  });

  // For each group, pick the canonical name:
  // Prefer: first letter uppercase, "Kids" over "kids"/"KIDS"
  const normalizedBrands = {};
  Object.entries(brandGroups).forEach(([key, variants]) => {
    // Sort: prefer mixed case over ALL CAPS or all lower
    const sorted = variants.sort((a, b) => {
      // Prefer variant with "Kids" (title case)
      if (a.includes('Kids') && !b.includes('Kids')) return -1;
      if (!a.includes('Kids') && b.includes('Kids')) return 1;
      // Prefer shorter
      return a.length - b.length;
    });
    const canonical = sorted[0];
    normalizedBrands[key] = canonical;
    if (variants.length > 1) {
      console.log(`  Normalized: ${variants.join(' / ')} → "${canonical}"`);
    }
  });

  const uniqueBrandNames = [...new Set(Object.values(normalizedBrands))].sort();
  console.log('Brands after normalization:', uniqueBrandNames.length);

  // Build reverse map: raw name → canonical name
  const brandNormMap = {};
  rawBrandNames.forEach(name => {
    brandNormMap[name] = normalizedBrands[name.toLowerCase()];
  });

  // Insert brands in batches
  const brandRows = uniqueBrandNames.map(name => ({
    name,
    tenant_id: TENANT_ID,
    active: true
  }));

  let allBrands = [];
  for (let i = 0; i < brandRows.length; i += BATCH_SIZE) {
    const batch = brandRows.slice(i, i + BATCH_SIZE);
    const { data, error } = await sb.from('brands').insert(batch).select('id, name');
    if (error) {
      console.error('Brand insert error at batch', i, ':', error);
      process.exit(1);
    }
    allBrands = allBrands.concat(data);
  }
  console.log('Brands created:', allBrands.length);

  // Build name → id map
  const brandMap = {};
  allBrands.forEach(b => { brandMap[b.name] = b.id; });

  // ── STEP 3: Import inventory ──
  console.log('\n=== STEP 3: INVENTORY ===');

  const invRows = cleaned.map((r, idx) => {
    const barcode = String(r['בר-קוד'] || '').trim() || null;
    const supplierName = String(r['שם ספק'] || '').trim();
    const suppId = supplierName ? supplierMap[supplierName] : unmatchedSupplierId;

    const rawBrand = String(r['חברה'] || '').trim();
    const canonicalBrand = rawBrand ? brandNormMap[rawBrand] : null;
    const brandId = canonicalBrand ? brandMap[canonicalBrand] : null;

    const qty = Number(r['כמות'] || 0);
    const sellPrice = Number(r['מחיר מכירה'] || 0);
    const sellDiscount = Number(r['הנחה'] || 0);
    const isSun = r['שמש'] === true || r['שמש'] === 1 || r['שמש'] === '1';

    if (!suppId && supplierName) {
      console.warn(`  Row ${idx}: supplier "${supplierName}" not found in map`);
    }
    if (!brandId && rawBrand) {
      console.warn(`  Row ${idx}: brand "${rawBrand}" → canonical "${canonicalBrand}" not found in map`);
    }

    return {
      barcode,
      supplier_id: suppId || unmatchedSupplierId,
      brand_id: brandId,
      model: String(r['דגם'] || '').trim() || null,
      size: String(r['גודל'] || '').trim() || null,
      color: String(r['צבע'] || '').trim() || null,
      quantity: qty,
      sell_price: sellPrice,
      sell_discount: sellDiscount,
      cost_price: 0,
      cost_discount: 0,
      product_type: isSun ? 'משקפי שמש' : 'משקפי ראייה',
      status: qty > 0 ? 'במלאי' : 'אזל',
      origin: 'excel_import',
      is_deleted: false,
      tenant_id: TENANT_ID
    };
  });

  console.log('Inventory rows to insert:', invRows.length);

  let totalInserted = 0;
  for (let i = 0; i < invRows.length; i += BATCH_SIZE) {
    const batch = invRows.slice(i, i + BATCH_SIZE);
    const { data, error } = await sb.from('inventory').insert(batch).select('id');
    if (error) {
      console.error(`Inventory insert error at batch ${i}-${i + batch.length}:`, error);
      // Show first failing row
      console.error('First row in batch:', JSON.stringify(batch[0]));
      process.exit(1);
    }
    totalInserted += data.length;
    console.log(`  Batch ${Math.floor(i/BATCH_SIZE) + 1}: inserted ${data.length} (total: ${totalInserted})`);
  }

  console.log('\n=== DONE ===');
  console.log('Suppliers:', suppData.length);
  console.log('Brands:', allBrands.length);
  console.log('Inventory:', totalInserted);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
