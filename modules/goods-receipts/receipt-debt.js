/**
 * receipt-debt.js — Auto-create supplier_documents on receipt confirmation
 * Phase 4b: Enhanced Goods Receipt
 *
 * Exports: createDocumentFromReceipt(receiptId, supplierId, receiptItems)
 * Uses: fetchAll(), batchCreate() from shared.js / supabase-ops.js
 */

async function createDocumentFromReceipt(receiptId, supplierId, receiptItems) {
  // 1. Calculate amounts from receiptItems
  const subtotal = receiptItems.reduce((sum, item) => {
    return sum + ((item.unit_cost || 0) * (item.quantity || 0));
  }, 0);

  // Skip if no pricing data (some receipts have no cost info)
  if (!subtotal || subtotal <= 0) {
    return null;
  }

  // 2. Fetch supplier's default_document_type and payment_terms_days
  const supplierRows = await fetchAll(T.SUPPLIERS, [['id', 'eq', supplierId]]);
  const supplier = supplierRows[0];
  if (!supplier) {
    console.warn('createDocumentFromReceipt: supplier not found', supplierId);
    return null;
  }

  const docTypeCode = supplier.default_document_type || 'delivery_note';
  const paymentTermsDays = supplier.payment_terms_days || 30;
  const currency = supplier.default_currency || 'ILS';

  // 3. Look up document_type_id from document_types table
  const docTypes = await fetchAll(T.DOC_TYPES, [['code', 'eq', docTypeCode]]);
  const docType = docTypes[0];
  if (!docType) {
    console.warn('createDocumentFromReceipt: document_type not found for code', docTypeCode);
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
  const docRow = {
    tenant_id: getTenantId(),
    supplier_id: supplierId,
    document_type_id: docType.id,
    internal_number: internalNumber,
    document_number: 'GR-' + receiptId.substring(0, 8),
    document_date: today,
    due_date: dueDateStr,
    received_date: today,
    currency: currency,
    subtotal: subtotal,
    vat_rate: vatRate,
    vat_amount: vatAmount,
    total_amount: totalAmount,
    goods_receipt_id: receiptId,
    status: 'open',
    created_by: emp.id || null
  };

  // 9. Insert using batchCreate helper
  const created = await batchCreate(T.SUP_DOCS, [docRow]);
  const createdDoc = created[0] || null;

  // 9b. Upload attached file if exists
  if (createdDoc && typeof _pendingReceiptFile !== 'undefined' && _pendingReceiptFile) {
    try {
      const uploadResult = await uploadSupplierFile(_pendingReceiptFile, supplierId);
      if (uploadResult) {
        await batchUpdate(T.SUP_DOCS, [{
          id: createdDoc.id,
          file_url: uploadResult.url,
          file_name: uploadResult.fileName
        }]);
        createdDoc.file_url = uploadResult.url;
        createdDoc.file_name = uploadResult.fileName;
      }
    } catch (uploadErr) {
      console.warn('File upload for receipt document failed (non-blocking):', uploadErr);
    }
    _pendingReceiptFile = null;
  }

  // 10. Phase 8: prepaid deduction moved to suppliers-debt. Alert finance manager instead.
  try {
    const deals = await fetchAll(T.PREPAID_DEALS, [
      ['supplier_id', 'eq', supplierId],
      ['status', 'eq', 'active'],
      ['is_deleted', 'eq', false]
    ]);
    if (deals.length > 0 && createdDoc) {
      await alertPrepaidNewDocument(supplierId, createdDoc.id, getTenantId(), supplier.name, docRow.document_number);
    }
  } catch (e) {
    console.warn('Prepaid alert failed (non-blocking):', e);
  }

  return createdDoc;
}
