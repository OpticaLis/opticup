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

  // Logo preview
  updateLogoPreview();

  // Bind logo URL change
  const logoInput = document.getElementById('set-logo-url');
  if (logoInput) logoInput.addEventListener('input', updateLogoPreview);
}

// =========================================================
// Logo preview
// =========================================================
function updateLogoPreview() {
  const url = (document.getElementById('set-logo-url') || {}).value;
  const preview = document.getElementById('logo-preview');
  if (!preview) return;
  if (url && url.startsWith('http')) {
    preview.src = url;
    preview.classList.remove('hidden');
    preview.onerror = function() { preview.classList.add('hidden'); };
  } else {
    preview.classList.add('hidden');
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
