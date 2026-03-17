const XLSX = require('xlsx');
const path = require('path');

const filePath = process.argv[2] || '/mnt/user-data/uploads/כל_המסגרות.xls';
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

console.log('Sheet name:', wb.SheetNames[0]);
console.log('Total rows:', data.length);
console.log('Columns:', Object.keys(data[0]).join(' | '));

// Breakdown
let emptyBcZeroQty = 0, emptyBcHasQty = 0, hasBcZeroQty = 0, hasBcHasQty = 0;
data.forEach(r => {
  const bc = String(r['בר-קוד'] || '').trim();
  const qty = Number(r['כמות'] || 0);
  const hasBarcode = bc.length > 0;
  const hasQty = qty > 0;
  if (hasBarcode && hasQty) hasBcHasQty++;
  else if (hasBarcode && !hasQty) hasBcZeroQty++;
  else if (!hasBarcode && hasQty) emptyBcHasQty++;
  else emptyBcZeroQty++;
});

console.log('\n=== ROW BREAKDOWN ===');
console.log('Has barcode + qty>0:', hasBcHasQty);
console.log('Has barcode + qty=0:', hasBcZeroQty);
console.log('Empty barcode + qty>0:', emptyBcHasQty);
console.log('Empty barcode + qty=0:', emptyBcZeroQty, '(REMOVE)');
console.log('Rows to remove:', emptyBcZeroQty);
console.log('Rows remaining:', data.length - emptyBcZeroQty);

// Clean: remove rows where barcode is empty AND qty is 0
const cleaned = data.filter(r => {
  const bc = String(r['בר-קוד'] || '').trim();
  const qty = Number(r['כמות'] || 0);
  return bc.length > 0 || qty > 0;
});

console.log('\n=== CLEANED DATA ===');
console.log('Cleaned rows:', cleaned.length);

// Unique values
const suppliers = [...new Set(cleaned.map(r => String(r['שם ספק'] || '').trim()).filter(Boolean))].sort();
const brands = [...new Set(cleaned.map(r => String(r['חברה'] || '').trim()).filter(Boolean))].sort();
const models = [...new Set(cleaned.map(r => String(r['דגם'] || '').trim()).filter(Boolean))];
const sizes = [...new Set(cleaned.map(r => String(r['גודל'] || '').trim()).filter(Boolean))];
const colors = [...new Set(cleaned.map(r => String(r['צבע'] || '').trim()).filter(Boolean))];

console.log('\n=== UNIQUE VALUES ===');
console.log('Suppliers (' + suppliers.length + '):', suppliers.join(', '));
console.log('Brands (' + brands.length + '):', brands.join(', '));
console.log('Models:', models.length, 'unique');
console.log('Sizes:', sizes.length, 'unique');
console.log('Colors:', colors.length, 'unique');

// Sun flag analysis
const sunValues = [...new Set(cleaned.map(r => r['שמש']))];
console.log('\nSun flag values:', JSON.stringify(sunValues));

// Discount analysis
const discounts = cleaned.map(r => r['הנחה']).filter(d => d !== '' && d !== undefined);
const uniqueDiscounts = [...new Set(discounts)].sort((a,b) => a-b);
console.log('Discount values (unique):', uniqueDiscounts.slice(0, 20).join(', '), uniqueDiscounts.length > 20 ? '...' : '');

// Sample 5 rows
console.log('\n=== SAMPLE 5 ROWS ===');
cleaned.slice(0, 5).forEach((r, i) => {
  console.log(`Row ${i+1}:`, JSON.stringify(r));
});

// Check for duplicate barcodes
const barcodes = cleaned.map(r => String(r['בר-קוד'] || '').trim()).filter(Boolean);
const bcCounts = {};
barcodes.forEach(bc => { bcCounts[bc] = (bcCounts[bc] || 0) + 1; });
const dupes = Object.entries(bcCounts).filter(([k,v]) => v > 1);
console.log('\n=== BARCODE ANALYSIS ===');
console.log('Total barcodes:', barcodes.length);
console.log('Unique barcodes:', Object.keys(bcCounts).length);
console.log('Duplicate barcodes:', dupes.length);
if (dupes.length > 0) {
  console.log('First 10 duplicates:');
  dupes.slice(0, 10).forEach(([bc, cnt]) => console.log('  ', bc, '×', cnt));
}

// Rows without barcode but with qty
if (emptyBcHasQty > 0) {
  console.log('\n=== ROWS WITHOUT BARCODE BUT WITH QTY ===');
  const noBc = cleaned.filter(r => String(r['בר-קוד'] || '').trim().length === 0);
  noBc.slice(0, 5).forEach((r, i) => console.log(`  ${i+1}:`, JSON.stringify(r)));
}
