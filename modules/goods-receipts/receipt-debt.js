/**
 * receipt-debt.js — Auto-create supplier_documents on receipt confirmation
 * Phase 4b: Enhanced Goods Receipt | Phase A-prep: doc type pass-through + multi-doc
 *
 * Exports: createDocumentFromReceipt(receiptId, supplierId, receiptItems, documentNumber, documentType, allDocNumbers, docAmounts)
 * Uses: fetchAll(), batchCreate() from shared.js / supabase-ops.js
 * Guards: client-side debounce + server-side goods_receipt_id duplicate check
 */

let _creatingDocForReceipt = false; // client-side debounce flag

async function createDocumentFromReceipt(receiptId, supplierId, receiptItems, documentNumber, documentType, allDocNumbers, docAmounts) {
  // Guard A: client-side debounce (prevents double-click in same session)
  if (_creatingDocForReceipt) {
    console.warn('createDocumentFromReceipt: already in progress, skipping duplicate call');
    return null;
  }
  _creatingDocForReceipt = true;

  try {
    return await _createDocumentFromReceiptInner(receiptId, supplierId, receiptItems, documentNumber, documentType, allDocNumbers, docAmounts);
  } finally {
    _creatingDocForReceipt = false;
  }
}

async function _createDocumentFromReceiptInner(receiptId, supplierId, receiptItems, documentNumber, documentType, allDocNumbers, docAmounts) {
  // Guard B: server-side duplicate check (prevents duplicate across sessions/refreshes)
  const existing = await sb.from(T.SUP_DOCS)
    .select('id, internal_number')
    .eq('goods_receipt_id', receiptId)
    .eq('tenant_id', getTenantId())
    .eq('is_deleted', false)
    .limit(1);
  if (existing.data && existing.data.length > 0) {
    console.warn('createDocumentFromReceipt: document already exists for receipt', receiptId, '→', existing.data[0].internal_number);
    writeLog('debt_duplicate_prevented', null, {
      receipt_id: receiptId,
      existing_doc_id: existing.data[0].id,
      existing_internal_number: existing.data[0].internal_number
    }).catch(err => console.error('writeLog failed in createDocumentFromReceipt:', err));
    return existing.data[0]; // return existing doc gracefully
  }

  // 1. Calculate amounts from receiptItems (exclude returned + not_received)
  var activeFilter = function(i) { return i.po_match_status !== 'returned' && i.po_match_status !== 'not_received'; };
  const subtotal = receiptItems
    .filter(activeFilter)
    .reduce((sum, item) => {
      return sum + ((item.unit_cost || 0) * (item.quantity || 0));
    }, 0);

  // Flag if any items are missing cost prices
  const hasMissingPrice = subtotal <= 0 || receiptItems
    .filter(activeFilter)
    .some(i => !i.unit_cost || i.unit_cost <= 0);

  // 2. Fetch supplier's payment_terms_days and currency
  const supplierRows = await fetchAll(T.SUPPLIERS, [['id', 'eq', supplierId]]);
  const supplier = supplierRows[0];
  if (!supplier) {
    console.error('createDocumentFromReceipt: supplier not found for receipt', receiptId, 'supplierId:', supplierId);
    return null;
  }

  // Document type: receipt form selection → supplier default → 'delivery_note'
  const docTypeCode = documentType || supplier.default_document_type || 'delivery_note';
  const paymentTermsDays = supplier.payment_terms_days || 30;
  const currency = supplier.default_currency || 'ILS';

  // 3. Look up document_type_id from document_types table
  const docTypes = await fetchAll(T.DOC_TYPES, [['code', 'eq', docTypeCode]]);
  const docType = docTypes[0];
  if (!docType) {
    console.error('createDocumentFromReceipt: document_type not found for code', docTypeCode, 'tenant:', getTenantId());
    return null;
  }

  // 4. Calculate VAT (from tenant config, fallback 17%)
  const vatRate = Number(getTenantConfig('vat_rate')) || 17;
  const vatAmount = Math.round(subtotal * vatRate) / 100;
  const totalAmount = subtotal + vatAmount;

  // 5. Generate internal_number via atomic RPC (FOR UPDATE lock on tenant)
  const { data: internalNumber, error: numError } = await sb.rpc('next_internal_doc_number', {
    p_tenant_id: getTenantId(),
    p_prefix: 'DOC'
  });
  if (numError) throw new Error('שגיאה ביצירת מספר פנימי: ' + numError.message);

  // 6. Calculate dates
  const today = new Date().toISOString().slice(0, 10);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + paymentTermsDays);
  const dueDateStr = dueDate.toISOString().slice(0, 10);

  // 7. Get current employee ID
  const emp = JSON.parse(sessionStorage.getItem('prizma_employee') || '{}');

  // 8. Build document record
  var primaryDocNum = documentNumber || ('GR-' + receiptId.substring(0, 8));
  var docNumbersArr = (allDocNumbers && allDocNumbers.length > 0) ? allDocNumbers : [primaryDocNum];
  const docRow = {
    tenant_id: getTenantId(),
    supplier_id: supplierId,
    document_type_id: docType.id,
    internal_number: internalNumber,
    document_number: primaryDocNum,
    document_numbers: docNumbersArr,
    document_amounts: (docAmounts && docAmounts.length > 0) ? docAmounts : [],
    document_date: today,
    due_date: dueDateStr,
    received_date: today,
    currency: currency,
    subtotal: subtotal,
    vat_rate: vatRate,
    vat_amount: vatAmount,
    total_amount: totalAmount,
    goods_receipt_id: receiptId,
    missing_price: hasMissingPrice,
    status: 'open',
    created_by: emp.id || null
  };

  // 9. Insert using batchCreate helper
  const created = await batchCreate(T.SUP_DOCS, [docRow]);
  const createdDoc = created[0] || null;
  if (!createdDoc) {
    console.error('createDocumentFromReceipt: batchCreate returned empty for receipt', receiptId);
    Toast.error('יצירת מסמך ספק נכשלה — יש ליצור מסמך ידנית');
    return null;
  }

  // 9b. Upload attached files if exist (multi-file support)
  var filesToUpload = (typeof _pendingReceiptFiles !== 'undefined' && _pendingReceiptFiles && _pendingReceiptFiles.length > 0)
    ? _pendingReceiptFiles
    : (typeof _pendingReceiptFile !== 'undefined' && _pendingReceiptFile) ? [_pendingReceiptFile] : [];
  if (createdDoc && filesToUpload.length > 0) {
    for (var fi = 0; fi < filesToUpload.length; fi++) {
      try {
        var uploadResult = await uploadSupplierFile(filesToUpload[fi], supplierId);
        if (uploadResult) {
          // Set first file as main file_url on document
          if (fi === 0) {
            await batchUpdate(T.SUP_DOCS, [{
              id: createdDoc.id,
              file_url: uploadResult.url,
              file_name: uploadResult.fileName
            }]);
            createdDoc.file_url = uploadResult.url;
            createdDoc.file_name = uploadResult.fileName;
          }
          // Save all files to supplier_document_files table
          if (typeof saveDocFile === 'function') {
            await saveDocFile(createdDoc.id, uploadResult.url, uploadResult.fileName, fi);
          }
        }
      } catch (uploadErr) {
        console.warn('File upload for receipt document failed (non-blocking):', uploadErr);
      }
    }
    if (typeof _pendingReceiptFiles !== 'undefined') _pendingReceiptFiles = [];
  }

  // 10. Warn if document created with missing prices
  if (hasMissingPrice && createdDoc) {
    toast('\u26A0\uFE0F \u05D4\u05DE\u05E1\u05DE\u05DA \u05E0\u05D5\u05E6\u05E8 \u05DC\u05DC\u05D0 \u05DE\u05D7\u05D9\u05E8\u05D9\u05DD \u2014 \u05D9\u05E9 \u05DC\u05E2\u05D3\u05DB\u05DF \u05DB\u05E9\u05D4\u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA \u05DE\u05D2\u05D9\u05E2\u05D4', 'w');
  }

  // 11. Auto-deduct from prepaid deal if supplier has one
  if (createdDoc) {
    try {
      var deducted = await autoDeductPrepaid(supplierId, createdDoc.id, Number(docRow.total_amount) || 0, getTenantId());
      if (!deducted) {
        // Couldn't auto-deduct — alert finance manager
        var deals = await fetchAll(T.PREPAID_DEALS, [['supplier_id', 'eq', supplierId], ['status', 'eq', 'active'], ['is_deleted', 'eq', false]]);
        if (deals.length > 0) await alertPrepaidNewDocument(supplierId, createdDoc.id, getTenantId(), supplier.name, docRow.document_number);
      }
    } catch (e) { console.warn('Prepaid auto-deduct failed (non-blocking):', e); }
  }

  return createdDoc;
}

/**
 * Auto-deduct document amount from supplier's active prepaid deal.
 * Returns true if deduction was made, false otherwise.
 */
async function autoDeductPrepaid(supplierId, docId, amount, tenantId) {
  if (!supplierId || !docId || !amount || amount <= 0) return false;
  var { data: deals } = await sb.from(T.PREPAID_DEALS).select('id, total_prepaid, total_used, total_remaining')
    .eq('tenant_id', tenantId).eq('supplier_id', supplierId).eq('status', 'active').eq('is_deleted', false).limit(1);
  if (!deals || !deals.length) return false;
  var deal = deals[0];
  var remaining = (Number(deal.total_remaining) || 0) > 0 ? Number(deal.total_remaining) : (Number(deal.total_prepaid) || 0) - (Number(deal.total_used) || 0);
  if (remaining < amount) return false; // insufficient — don't partial-deduct, alert instead
  var { error: rpcErr } = await sb.rpc('increment_prepaid_used', { p_deal_id: deal.id, p_delta: amount });
  if (rpcErr) { console.error('autoDeductPrepaid RPC error:', rpcErr); return false; }
  await batchUpdate(T.SUP_DOCS, [{ id: docId, paid_amount: amount, status: 'paid' }]);
  writeLog('prepaid_auto_deduct', null, { supplier_id: supplierId, document_id: docId, deal_id: deal.id, amount: amount });
  return true;
}
