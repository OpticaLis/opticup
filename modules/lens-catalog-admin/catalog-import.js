// catalog-import.js — bulk import flow (xlsx → JSON → lens-catalog-import EF)
import { sb } from './catalog-auth.js';
import { showToast, escapeHtml as esc } from './lens-catalog-admin.js';

const SUPABASE_URL = 'https://tsxrrxzmdxaenlvocyit.supabase.co';

export function wireImportFlow(state, onImportComplete) {
  const fileInput = document.getElementById('import-file');
  document.getElementById('btn-import').addEventListener('click', () => {
    if (!state.selectedTenant) {
      showToast('בחר טננט קודם (להצעות מסחר)', 'error');
      return;
    }
    fileInput.click();
  });

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    fileInput.value = '';  // reset for next select
    await processFile(file, state, onImportComplete);
  });
}

async function processFile(file, state, onImportComplete) {
  showToast(`טוען ${file.name}…`, 'info');
  let rows;
  try {
    // eslint-disable-next-line no-undef
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    // eslint-disable-next-line no-undef
    rows = XLSX.utils.sheet_to_json(ws, { defval: null });
  } catch (err) {
    showToast(`שגיאה בקריאת xlsx: ${err.message}`, 'error');
    return;
  }
  if (!rows || rows.length === 0) {
    showToast('הקובץ ריק', 'error');
    return;
  }
  // Coerce numeric columns from xlsx (which sometimes serializes numbers as strings)
  rows = rows.map(r => ({
    ...r,
    refractive_index: r.refractive_index != null ? Number(r.refractive_index) : null,
    diameter_mm:      r.diameter_mm      != null ? Number(r.diameter_mm)      : null,
    sph_min:          r.sph_min          != null ? Number(r.sph_min)          : null,
    sph_max:          r.sph_max          != null ? Number(r.sph_max)          : null,
    sph_step:         r.sph_step         != null ? Number(r.sph_step)         : undefined,
    cyl_min:          r.cyl_min          != null ? Number(r.cyl_min)          : null,
    cyl_max:          r.cyl_max          != null ? Number(r.cyl_max)          : null,
    cyl_step:         r.cyl_step         != null ? Number(r.cyl_step)         : undefined,
    add_min:          r.add_min          != null ? Number(r.add_min)          : null,
    add_max:          r.add_max          != null ? Number(r.add_max)          : null,
    add_step:         r.add_step         != null ? Number(r.add_step)         : undefined,
    price_amount:     r.price_amount     != null ? Number(r.price_amount)     : undefined,
    is_vat_inclusive: r.is_vat_inclusive === true || r.is_vat_inclusive === 'true' || r.is_vat_inclusive === 1,
  }));

  // Confirm before import
  if (!window.confirm(`לבצע ייבוא של ${rows.length} שורות לטננט "${state.selectedTenant.name}"? (נסה dry-run קודם דרך console)`)) {
    return;
  }

  // Get the user's JWT for the EF call
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    showToast('אין סשן פעיל', 'error');
    return;
  }

  showToast(`שולח ${rows.length} שורות ל-EF…`, 'info');
  let resp;
  try {
    resp = await fetch(`${SUPABASE_URL}/functions/v1/lens-catalog-import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': session.access_token,
      },
      body: JSON.stringify({
        tenant_id: state.selectedTenant.id,
        rows,
        publish_immediately: false,
      }),
    });
  } catch (err) {
    showToast(`שגיאת רשת: ${err.message}`, 'error');
    return;
  }

  let result;
  try { result = await resp.json(); }
  catch { showToast(`Status ${resp.status} — תגובה לא JSON`, 'error'); return; }

  // Show result modal
  showImportResultModal(resp.status, result);

  // Refresh brands list if anything was inserted
  if (result.inserted && (result.inserted.brands + result.inserted.designs + result.inserted.variants + result.inserted.offerings) > 0) {
    if (onImportComplete) await onImportComplete();
  }
}

function showImportResultModal(statusCode, result) {
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:10000; display:flex; align-items:center; justify-content:center; padding:20px;';
  const errorRows = (result.errors ?? []).map(e => `<div class="row-error">שורה ${e.row}: ${esc(e.error)}</div>`).join('');
  const summary = result.inserted
    ? `<div class="row-ok">✓ נוצרו: ${result.inserted.brands} מותגים, ${result.inserted.designs} דגמים, ${result.inserted.variants} וריאציות, ${result.inserted.offerings} הצעות</div>
       <div>↻ זוהו קיימים: ${result.reused.brands} / ${result.reused.designs} / ${result.reused.variants} / ${result.reused.offerings}</div>`
    : `<div class="row-error">❌ ${esc(result.error ?? 'שגיאה לא ידועה')}</div>`;
  modal.innerHTML = `
    <div style="background:#1e293b; border-radius:8px; padding:24px; max-width:600px; width:100%; max-height:80vh; overflow-y:auto; color:#e2e8f0;">
      <h2 style="margin-top:0; font-size:18px;">תוצאת ייבוא — HTTP ${statusCode}</h2>
      <div class="import-result">${summary}${errorRows ? '<hr style="margin:10px 0; border-color:#475569;">' + errorRows : ''}</div>
      <div style="margin-top:16px; text-align:left;">
        <button class="btn btn-primary" onclick="this.closest('div[style*=\\'position:fixed\\']').remove()">סגור</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

