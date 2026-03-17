const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://tsxrrxzmdxaenlvocyit.supabase.co';
const SERVICE_KEY = process.env.OPTICUP_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SERVICE_KEY);
const TENANT_ID = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
const BATCH_SIZE = 500;

async function main() {
  // Read & clean Excel
  const filePath = 'C:/Users/User/Desktop/כל המסגרות.xls';
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
  const cleaned = raw.filter(r => {
    const bc = String(r['בר-קוד'] || '').trim();
    const qty = Number(r['כמות'] || 0);
    return bc.length > 0 || qty > 0;
  });
  console.log('Cleaned rows:', cleaned.length);

  // Load existing suppliers
  const { data: suppliers } = await sb.from('suppliers').select('id, name').eq('tenant_id', TENANT_ID);
  const supplierMap = {};
  suppliers.forEach(s => { supplierMap[s.name] = s.id; });
  const unmatchedId = supplierMap['לא משויך'];
  console.log('Suppliers loaded:', suppliers.length, '| Unmatched ID:', unmatchedId);

  // Load existing brands
  const { data: brands } = await sb.from('brands').select('id, name').eq('tenant_id', TENANT_ID);
  const brandMap = {};
  brands.forEach(b => { brandMap[b.name] = b.id; });
  // Build case-insensitive lookup for brand normalization
  const brandLowerMap = {};
  brands.forEach(b => { brandLowerMap[b.name.toLowerCase()] = b.id; });
  console.log('Brands loaded:', brands.length);

  // Check constraints from DB:
  // product_type: 'eyeglasses', 'sunglasses', 'contact_lenses'
  // status: 'in_stock', 'sold', 'ordered', 'pending_barcode', 'pending_images'

  const invRows = cleaned.map((r, idx) => {
    const barcode = String(r['בר-קוד'] || '').trim() || null;
    const supplierName = String(r['שם ספק'] || '').trim();
    const suppId = supplierName ? supplierMap[supplierName] : unmatchedId;

    const rawBrand = String(r['חברה'] || '').trim();
    // Try exact match first, then case-insensitive
    let brandId = rawBrand ? brandMap[rawBrand] : null;
    if (!brandId && rawBrand) {
      brandId = brandLowerMap[rawBrand.toLowerCase()] || null;
    }

    const qty = Number(r['כמות'] || 0);
    const sellPrice = Number(r['מחיר מכירה'] || 0);
    const sellDiscount = Number(r['הנחה'] || 0);
    const isSun = r['שמש'] === true || r['שמש'] === 1 || r['שמש'] === '1';

    return {
      barcode,
      supplier_id: suppId || unmatchedId,
      brand_id: brandId,
      model: String(r['דגם'] || '').trim() || null,
      size: String(r['גודל'] || '').trim() || null,
      color: String(r['צבע'] || '').trim() || null,
      quantity: qty,
      sell_price: sellPrice,
      sell_discount: sellDiscount,
      cost_price: 0,
      cost_discount: 0,
      product_type: isSun ? 'sunglasses' : 'eyeglasses',
      status: qty > 0 ? 'in_stock' : 'sold',
      origin: 'excel_import',
      is_deleted: false,
      tenant_id: TENANT_ID
    };
  });

  // Check for any unresolved brands
  const missingBrands = invRows.filter(r => r.brand_id === null).length;
  console.log('Rows with null brand_id:', missingBrands);

  console.log('Inserting', invRows.length, 'inventory rows...');
  let totalInserted = 0;
  for (let i = 0; i < invRows.length; i += BATCH_SIZE) {
    const batch = invRows.slice(i, i + BATCH_SIZE);
    const { data, error } = await sb.from('inventory').insert(batch).select('id');
    if (error) {
      console.error(`Error at batch ${i}-${i + batch.length}:`, error);
      console.error('First row:', JSON.stringify(batch[0]));
      process.exit(1);
    }
    totalInserted += data.length;
    console.log(`  Batch ${Math.floor(i/BATCH_SIZE) + 1}: +${data.length} (total: ${totalInserted})`);
  }
  console.log('\nDONE! Inserted:', totalInserted);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
