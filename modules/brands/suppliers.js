// =========================================================
// TAB 5: SUPPLIERS
// =========================================================
let supplierEditMode = false;

function loadSuppliersTab() {
  const tb = $('suppliers-body');
  const editBtn = $('supplier-edit-btn');
  const saveBar = $('supplier-save-bar');

  // Toggle button/bar visibility
  if (editBtn) editBtn.style.display = supplierEditMode ? 'none' : '';
  if (saveBar) saveBar.style.display = supplierEditMode ? 'flex' : 'none';

  tb.innerHTML = suppliers.map((s, i) => {
    const sid = supplierCache[s];
    const num = supplierNumCache[sid] || '';
    if (supplierEditMode) {
      return `<tr>
        <td><input type="number" min="10" value="${num}" class="sup-num-input" data-sid="${sid}" style="width:70px;text-align:center"></td>
        <td><strong>${escapeHtml(s)}</strong></td>
        <td></td>
      </tr>`;
    }
    return `<tr>
      <td>${num || '—'}</td>
      <td><strong>${escapeHtml(s)}</strong></td>
      <td><button class="btn btn-d btn-sm" onclick="toast('לא ניתן למחוק ספק מהממשק','w')">&#10006;</button></td>
    </tr>`;
  }).join('');
}

function toggleSupplierNumberEdit() {
  supplierEditMode = true;
  loadSuppliersTab();
}

function cancelSupplierNumberEdit() {
  supplierEditMode = false;
  loadSuppliersTab();
}

async function saveSupplierNumbers() {
  const inputs = document.querySelectorAll('.sup-num-input');
  const changes = []; // { sid, oldNum, newNum }

  // 1. Collect & validate inputs
  for (const inp of inputs) {
    const sid = inp.dataset.sid;
    const newNum = parseInt(inp.value, 10);
    if (isNaN(newNum) || newNum < 10) {
      toast('מספר ספק חייב להיות 10 ומעלה', 'e');
      inp.focus();
      return;
    }
    changes.push({ sid, oldNum: supplierNumCache[sid], newNum });
  }

  // 2. Check for duplicate numbers in the form
  const nums = changes.map(c => c.newNum);
  const dupes = nums.filter((n, i) => nums.indexOf(n) !== i);
  if (dupes.length) {
    toast(`מספר ספק ${dupes[0]} מופיע יותר מפעם אחת`, 'e');
    return;
  }

  // 3. Filter to only changed rows
  const changed = changes.filter(c => c.oldNum !== c.newNum);
  if (!changed.length) {
    supplierEditMode = false;
    loadSuppliersTab();
    toast('לא בוצעו שינויים', 'w');
    return;
  }

  // 4. PO lock — block change if supplier has existing POs
  showLoading('בודק הזמנות רכש...');
  try {
    for (const c of changed) {
      const { data: pos } = await sb.from(T.PO)
        .select('id')
        .eq('supplier_id', c.sid)
        .limit(1);
      if (pos && pos.length > 0) {
        const supName = supplierCacheRev[c.sid] || c.sid;
        toast(`לא ניתן לשנות מספר לספק "${supName}" — יש לו הזמנות רכש`, 'e');
        hideLoading();
        return;
      }
    }
  } catch (e) {
    toast('שגיאה בבדיקת הזמנות: ' + (e.message || ''), 'e');
    hideLoading();
    return;
  }

  // 5. Save using temp negative numbers to avoid unique constraint collision
  showLoading('שומר מספרי ספקים...');
  try {
    // Step A: set changed rows to temp negative values
    for (let i = 0; i < changed.length; i++) {
      const tempNum = -(i + 1);
      const { error } = await sb.from('suppliers')
        .update({ supplier_number: tempNum })
        .eq('id', changed[i].sid);
      if (error) throw new Error(error.message);
    }
    // Step B: set final values
    for (const c of changed) {
      const { error } = await sb.from('suppliers')
        .update({ supplier_number: c.newNum })
        .eq('id', c.sid);
      if (error) throw new Error(error.message);
    }

    await loadLookupCaches();
    supplierEditMode = false;
    loadSuppliersTab();
    toast('מספרי ספקים נשמרו בהצלחה ✓', 's');
  } catch (e) {
    toast('שגיאה בשמירה: ' + (e.message || ''), 'e');
    // Attempt rollback — restore original numbers
    try {
      for (const c of changed) {
        await sb.from('suppliers')
          .update({ supplier_number: c.oldNum })
          .eq('id', c.sid);
      }
      await loadLookupCaches();
      loadSuppliersTab();
    } catch (_) { /* best effort */ }
  }
  hideLoading();
}

async function getNextSupplierNumber() {
  const { data: rows } = await sb.from('suppliers')
    .select('supplier_number')
    .order('supplier_number', { ascending: true });
  const used = new Set((rows || []).map(r => r.supplier_number).filter(n => n != null));
  let n = 10;
  while (used.has(n)) n++;
  return n;
}

async function addSupplier() {
  const name = $('new-supplier-name').value.trim();
  if (!name) { toast('יש להזין שם ספק', 'w'); return; }
  if (suppliers.includes(name)) { toast('ספק כבר קיים', 'w'); return; }

  showLoading('מוסיף ספק...');
  try {
    const nextNum = await getNextSupplierNumber();
    const { error } = await sb.from('suppliers').insert({ name, active: true, supplier_number: nextNum, tenant_id: getTenantId() });
    if (error) throw new Error(error.message);
    await loadLookupCaches();
    suppliers = Object.keys(supplierCache).sort();
    populateDropdowns();
    loadSuppliersTab();
    $('new-supplier-name').value = '';
    toast(`ספק "${name}" נוסף בהצלחה (מספר ${nextNum})`, 's');
  } catch(e) {
    toast('שגיאה: '+(e.message||''), 'e');
  }
  hideLoading();
}
