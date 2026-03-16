/**
 * settings-page.js — Settings page logic
 * Loads, renders, and saves tenant settings (business, financial, display)
 * Permission: settings.view / settings.edit (CEO/Manager only)
 */

// Field map: element id → DB column
const SETTINGS_FIELDS = [
  { id: 'set-business-name',    col: 'business_name',           type: 'text' },
  { id: 'set-business-id',      col: 'business_id',             type: 'text' },
  { id: 'set-business-phone',   col: 'business_phone',          type: 'text' },
  { id: 'set-business-email',   col: 'business_email',          type: 'text' },
  { id: 'set-business-address', col: 'business_address',        type: 'textarea' },
  { id: 'set-logo-url',         col: 'logo_url',                type: 'text' },
  { id: 'set-vat-rate',         col: 'vat_rate',                type: 'number' },
  { id: 'set-withholding-tax',  col: 'withholding_tax_default', type: 'number' },
  { id: 'set-payment-terms',    col: 'payment_terms_days',      type: 'number' },
  { id: 'set-currency',         col: 'default_currency',        type: 'select' },
  { id: 'set-rows-per-page',    col: 'rows_per_page',           type: 'select' },
  { id: 'set-date-format',      col: 'date_format',             type: 'select' },
  { id: 'set-theme',            col: 'theme',                   type: 'select' }
];

// =========================================================
// Load settings from tenants table
// =========================================================
async function loadSettings() {
  showLoading('טוען הגדרות...');
  try {
    const tenantId = getTenantId();
    if (!tenantId) { toast('שגיאה: לא נמצא דייר פעיל', 'error'); return; }

    const { data, error } = await sb.from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (error) throw error;
    if (!data) { toast('שגיאה: דייר לא נמצא', 'error'); return; }

    renderSettings(data);
  } catch (err) {
    console.error('loadSettings error:', err);
    toast('שגיאה בטעינת הגדרות: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}

// =========================================================
// Render settings into form fields
// =========================================================
function renderSettings(data) {
  SETTINGS_FIELDS.forEach(f => {
    const el = document.getElementById(f.id);
    if (!el) return;
    const val = data[f.col];
    if (val != null) el.value = val;
  });

  // Logo preview + upload binding
  renderLogoPreview(data.logo_url);
  const fileInput = document.getElementById('logo-file-input');
  if (fileInput) fileInput.addEventListener('change', function() {
    if (this.files[0]) handleLogoUpload(this.files[0]);
    this.value = '';
  });
}

// =========================================================
// Logo preview
// =========================================================
function renderLogoPreview(url) {
  const wrap = document.getElementById('logo-preview-wrap');
  const delBtn = document.getElementById('logo-delete');
  if (!wrap) return;
  if (url) {
    wrap.innerHTML = '<img src="' + escapeHtml(url) + '" style="max-width:150px;max-height:80px;border-radius:6px;border:1px solid var(--g200)" alt="logo" onerror="this.style.display=\'none\'">';
    if (delBtn) delBtn.style.display = '';
  } else {
    wrap.innerHTML = '<div style="width:150px;height:80px;background:var(--g100);border-radius:6px;display:flex;align-items:center;justify-content:center;color:var(--g400);font-size:2rem;margin:0 auto">🏪</div>';
    if (delBtn) delBtn.style.display = 'none';
  }
}

// =========================================================
// Logo upload
// =========================================================
async function handleLogoUpload(file) {
  if (!file.type.match(/^image\/(jpeg|png)$/)) {
    toast('יש להעלות קובץ JPG או PNG בלבד', 'e'); return;
  }
  if (file.size > 2 * 1024 * 1024) {
    toast('הקובץ גדול מדי — מקסימום 2MB', 'e'); return;
  }
  showLoading('מעלה לוגו...');
  try {
    const tenantId = getTenantId();
    const ext = file.name.split('.').pop().toLowerCase();
    const path = tenantId + '/logo.' + ext;
    const { error: upErr } = await sb.storage.from('tenant-logos').upload(path, file, { upsert: true });
    if (upErr) {
      if (upErr.message && upErr.message.includes('not found')) {
        toast('יש ליצור bucket בשם tenant-logos בפאנל Supabase', 'e');
      } else {
        throw upErr;
      }
      return;
    }
    const { data: urlData } = sb.storage.from('tenant-logos').getPublicUrl(path);
    const publicUrl = urlData.publicUrl + '?t=' + Date.now();
    await sb.from('tenants').update({ logo_url: publicUrl }).eq('id', tenantId);
    document.getElementById('set-logo-url').value = publicUrl;
    renderLogoPreview(publicUrl);
    storeTenantConfig({ logo_url: publicUrl });
    toast('לוגו הועלה בהצלחה');
  } catch (e) {
    console.error('handleLogoUpload error:', e);
    toast('שגיאה בהעלאת לוגו: ' + (e.message || ''), 'e');
  } finally {
    hideLoading();
  }
}

// =========================================================
// Logo delete
// =========================================================
async function handleLogoDelete() {
  const ok = await confirmDialog('מחיקת לוגו', 'האם למחוק את הלוגו?');
  if (!ok) return;
  showLoading('מוחק לוגו...');
  try {
    const tenantId = getTenantId();
    // Try to remove both extensions
    await sb.storage.from('tenant-logos').remove([tenantId + '/logo.png', tenantId + '/logo.jpg', tenantId + '/logo.jpeg']);
    await sb.from('tenants').update({ logo_url: null }).eq('id', tenantId);
    document.getElementById('set-logo-url').value = '';
    renderLogoPreview(null);
    storeTenantConfig({ logo_url: null });
    toast('לוגו נמחק');
  } catch (e) {
    console.error('handleLogoDelete error:', e);
    toast('שגיאה במחיקת לוגו: ' + (e.message || ''), 'e');
  } finally {
    hideLoading();
  }
}

// =========================================================
// Save settings
// =========================================================
async function saveSettings() {
  // Permission check
  if (!hasPermission('settings.edit')) {
    toast('אין לך הרשאה לערוך הגדרות', 'error');
    return;
  }

  // Validate required fields
  const nameEl = document.getElementById('set-business-name');
  if (!nameEl || !nameEl.value.trim()) {
    toast('שם העסק הוא שדה חובה', 'error');
    nameEl && nameEl.focus();
    return;
  }

  showLoading('שומר הגדרות...');
  try {
    const tenantId = getTenantId();
    const updates = { updated_at: new Date().toISOString() };

    SETTINGS_FIELDS.forEach(f => {
      const el = document.getElementById(f.id);
      if (!el) return;
      if (f.type === 'number') {
        updates[f.col] = el.value !== '' ? Number(el.value) : null;
      } else {
        updates[f.col] = el.value || null;
      }
    });

    // Also update 'name' column to match business_name
    updates.name = updates.business_name;

    const { error } = await sb.from('tenants')
      .update(updates)
      .eq('id', tenantId);

    if (error) throw error;

    // Update tenant_config in sessionStorage for VAT and other settings
    storeTenantConfig(updates);

    toast('ההגדרות נשמרו בהצלחה', 'success');
  } catch (err) {
    console.error('saveSettings error:', err);
    toast('שגיאה בשמירת הגדרות: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}

// =========================================================
// Store tenant config in sessionStorage (for VAT etc.)
// =========================================================
function storeTenantConfig(data) {
  const existing = JSON.parse(sessionStorage.getItem('tenant_config') || '{}');
  const merged = Object.assign(existing, data);
  sessionStorage.setItem('tenant_config', JSON.stringify(merged));
}
