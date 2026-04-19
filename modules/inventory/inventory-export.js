// =========================================================
// BARCODE GENERATION
// =========================================================
async function generateBarcodes(source) {
  let rows;
  if (source === 'entry') {
    rows = getEntryRows();
  }
  if (!rows?.length) { toast('אין שורות ליצירת ברקודים', 'w'); return; }

  // Validate required fields first
  const incomplete = rows.filter(r => !r.brand || !r.model || !r.size || !r.color);
  if (incomplete.length) {
    toast(`${incomplete.length} שורות חסרות שדות חובה (חברה, דגם, גודל, צבע)`, 'e');
    return;
  }

  const noPrice = rows.filter(r => !r.sprice || parseFloat(r.sprice) <= 0);
  if (noPrice.length) {
    toast(`${noPrice.length} שורות חסרות מחיר מכירה — חובה לפני יצירת ברקוד`, 'e');
    return;
  }

  showLoading('מייצר ברקודים...');
  try {
    await loadMaxBarcode();
    const prefix = branchCode.padStart(2, '0');
    let nextSeq = maxBarcode;

    for (const row of rows) {
      // Search existing in inventory (same brand+model+size+color with qty>0)
      const brandId = brandCache[row.brand] || null;
      let barcode = '';

      if (brandId) {
        const existing = await fetchAll(T.INV, [
          ['brand_id','eq',brandId],['model','eq',row.model],
          ['size','eq',row.size],['color','eq',row.color],
          ['is_deleted','eq',false]
        ]);
        const withQty = existing.find(r => (r.quantity || 0) > 0);
        if (withQty && withQty.barcode) {
          barcode = withQty.barcode;
        }
      }

      if (!barcode) {
        nextSeq++;
        if (nextSeq > 99999) throw new Error('חריגה — מקסימום 99,999 ברקודים לסניף ' + prefix);
        barcode = prefix + String(nextSeq).padStart(5, '0');
      }

      const cell = row.tr.querySelector('.barcode-cell');
      if (cell) cell.textContent = barcode;
    }
    maxBarcode = nextSeq;
    toast('ברקודים נוצרו בהצלחה!', 's');
  } catch(e) {
    toast('שגיאה ביצירת ברקודים: ' + (e.message||''), 'e');
  }
  hideLoading();
}

// =========================================================
// BARCODE EXCEL EXPORT
// =========================================================
function exportBarcodesExcel(source) {
  let data = [];
  if (source === 'entry') {
    getEntryRows().forEach(r => {
      if (r.barcode) data.push({
        'ברקוד': r.barcode, 'ספק': r.supplier, 'חברה': r.brand, 'דגם': r.model,
        'גודל': r.size, 'גשר': r.bridge, 'צבע': r.color, 'אורך מוט': r.temple,
        'סוג מוצר': r.ptype, 'מחיר מכירה': r.sprice, 'הנחה %': r.sdisc
      });
    });
  }
  if (!data.length) { toast('אין ברקודים לייצוא', 'w'); return; }
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ברקודים');
  XLSX.writeFile(wb, `barcodes_${Date.now()}.xlsx`);
  toast('קובץ Excel יורד...', 's');
}

// =========================================================
// INVENTORY EXCEL EXPORT
// =========================================================
async function exportInventoryExcel() {
  toast('טוען נתונים לייצוא...', 'w');

  // Full fetch with current filters (no pagination limit)
  try {
    const f = invCurrentFilters || {};
    let query = sb.from('inventory')
      .select('*, inventory_images(*)', { count: 'exact' })
      .eq('is_deleted', false);
    if (f.supplier) {
      const suppId = supplierCache[f.supplier];
      if (suppId) query = query.eq('supplier_id', suppId);
    }
    if (f.ptype) query = query.eq('product_type', heToEn('product_type', f.ptype));
    if (f.qtyFilter === '1') query = query.gt('quantity', 0);
    else if (f.qtyFilter === '0') query = query.lte('quantity', 0);
    if (f.search) {
      const safe = f.search.replace(/[,().\\]/g, '');
      if (safe) {
        const orParts = [
          `barcode.ilike.%${safe}%`, `model.ilike.%${safe}%`,
          `size.ilike.%${safe}%`, `color.ilike.%${safe}%`, `notes.ilike.%${safe}%`
        ];
        const bIds = Object.entries(brandCache).filter(([n]) => n.toLowerCase().includes(safe)).map(([,id]) => id);
        if (bIds.length) orParts.push(`brand_id.in.(${bIds.join(',')})`);
        const sIds = Object.entries(supplierCache).filter(([n]) => n.toLowerCase().includes(safe)).map(([,id]) => id);
        if (sIds.length) orParts.push(`supplier_id.in.(${sIds.join(',')})`);
        query = query.or(orParts.join(','));
      }
    }
    query = query.order('created_at', { ascending: false });
    // Paginate in 1000-row batches (no single-page limit)
    let allRows = [], from = 0;
    while (true) {
      const { data, error } = await query.range(from, from + 999);
      if (error) throw new Error(error.message);
      if (!data?.length) break;
      allRows.push(...data);
      if (data.length < 1000) break;
      from += 1000;
    }
    var exportData = allRows.map(enrichRow);
  } catch (e) {
    toast('שגיאה בטעינת נתונים לייצוא: ' + (e.message || ''), 'e');
    return;
  }

  // If items are selected, export only those
  if (invSelected && invSelected.size > 0) {
    exportData = exportData.filter(function(r) { return invSelected.has(r.id); });
  }

  if (!exportData.length) { toast('אין פריטים לייצוא', 'w'); return; }

  const headers = ['ברקוד','חברה/מותג','דגם','גודל','גשר','צבע','סוג מוצר','מחיר מכירה','הנחה%','מ.סופי','כמות','סנכרון'];
  const rows = exportData.map(r => {
    var sp = parseFloat(r.sell_price) || 0;
    var sd = r.sell_discount != null ? Math.round((parseFloat(r.sell_discount) || 0) * 100) : 0;
    var finalPrice = sd > 0 ? Math.round(sp * (1 - sd / 100)) : sp;
    return [
      r.barcode || '',
      r.brand_name || '',
      r.model || '',
      r.size || '',
      r.bridge || '',
      r.color || '',
      r.product_type ? enToHe('product_type', r.product_type) : '',
      sp,
      sd,
      finalPrice,
      parseInt(r.quantity) || 0,
      r.website_sync ? enToHe('website_sync', r.website_sync) : ''
    ];
  });

  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths — auto-fit based on content
  const colWidths = headers.map((h, ci) => {
    let mx = h.length;
    rows.forEach(r => { const len = String(r[ci]).length; if (len > mx) mx = len; });
    return { wch: Math.min(mx + 3, 30) };
  });
  ws['!cols'] = colWidths;

  // Header styling — bold, dark blue bg, white text
  const headerStyle = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1A237E' } }, alignment: { horizontal: 'center' } };
  headers.forEach((_, ci) => {
    const ref = XLSX.utils.encode_cell({ r: 0, c: ci });
    if (!ws[ref]) return;
    ws[ref].s = headerStyle;
  });

  // Number format for price (7), discount (8), final price (9), quantity (10)
  for (let ri = 1; ri <= rows.length; ri++) {
    const priceRef = XLSX.utils.encode_cell({ r: ri, c: 7 });
    if (ws[priceRef]) ws[priceRef].t = 'n';
    const discRef = XLSX.utils.encode_cell({ r: ri, c: 8 });
    if (ws[discRef]) ws[discRef].t = 'n';
    const finalRef = XLSX.utils.encode_cell({ r: ri, c: 9 });
    if (ws[finalRef]) ws[finalRef].t = 'n';
    const qtyRef = XLSX.utils.encode_cell({ r: ri, c: 10 });
    if (ws[qtyRef]) ws[qtyRef].t = 'n';
  }

  // RTL
  ws['!views'] = [{ RTL: true }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'מלאי');
  const today = new Date().toISOString().slice(0, 10);
  var tenantSlug = getTenantConfig('slug') || getTenantConfig('name') || 'export';
  XLSX.writeFile(wb, `מלאי-${tenantSlug}-${today}.xlsx`);
  toast('\u{1F4E5} הקובץ הורד בהצלחה', 's');
}

// =========================================================
// EXCEL FORMAT POPUP
// =========================================================
function openExcelFormatPopup() {
  const m = document.getElementById('excel-format-modal');
  if (m) m.style.display = 'flex';
}
function closeExcelFormatPopup() {
  const m = document.getElementById('excel-format-modal');
  if (m) m.style.display = 'none';
}
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('excel-format-modal')
    ?.addEventListener('click', function(e) {
      if (e.target === this) closeExcelFormatPopup();
    });
});