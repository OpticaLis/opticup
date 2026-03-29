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
    if (!tenantId) { toast('שגיאה: לא נמצא דייר פעיל', 'e'); return; }

    const { data, error } = await sb.from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (error) throw error;
    if (!data) { toast('שגיאה: דייר לא נמצא', 'e'); return; }

    renderSettings(data);
    // Load AI learning config from separate table
    await loadAIConfig();
  } catch (err) {
    console.error('loadSettings error:', err);
    toast('שגיאה בטעינת הגדרות: ' + err.message, 'e');
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
    const { data: logoData, error: logoErr } = await sb.from('tenants')
      .update({ logo_url: publicUrl })
      .eq('id', tenantId)
      .select('logo_url');
    if (logoErr) throw logoErr;
    if (!logoData || logoData.length === 0) {
      toast('הלוגו הועלה לאחסון אך לא נשמר בהגדרות — בדוק הרשאות RLS', 'e');
      return;
    }
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
    const { error: delErr } = await sb.from('tenants')
      .update({ logo_url: null })
      .eq('id', tenantId)
      .select('logo_url');
    if (delErr) throw delErr;
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
    toast('אין לך הרשאה לערוך הגדרות', 'e');
    return;
  }

  // Validate required fields
  const nameEl = document.getElementById('set-business-name');
  if (!nameEl || !nameEl.value.trim()) {
    toast('שם העסק הוא שדה חובה', 'e');
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

    const { data, error } = await sb.from('tenants')
      .update(updates)
      .eq('id', tenantId)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      toast('שגיאה: לא ניתן לשמור — בדוק הרשאות RLS בטבלת tenants', 'e');
      return;
    }

    // Update tenant_config in sessionStorage for VAT and other settings
    storeTenantConfig(updates);

    // Save AI learning config (separate table)
    var aiOk = await saveAIConfig();

    toast('ההגדרות נשמרו בהצלחה', 's');
  } catch (err) {
    console.error('saveSettings error:', err);
    toast('שגיאה בשמירת הגדרות: ' + err.message, 'e');
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

// =========================================================
// AI Learning Config — separate table: ai_agent_config
// =========================================================
const AI_SETTINGS_FIELDS = [
  { id: 'set-ai-suggest-after', col: 'suggest_after_invoices', type: 'number', min: 1, max: 20 },
  { id: 'set-ai-auto-after',    col: 'auto_after_invoices',    type: 'number', min: 3, max: 50 },
  { id: 'set-ai-min-accuracy',  col: 'auto_min_accuracy',      type: 'number', min: 50, max: 100 }
];

async function loadAIConfig() {
  try {
    var tid = getTenantId();
    var { data, error } = await sb.from('ai_agent_config').select('suggest_after_invoices, auto_after_invoices, auto_min_accuracy').eq('tenant_id', tid).maybeSingle();
    if (error) { console.warn('loadAIConfig:', error.message); return; }
    if (!data) return; // no config row yet — defaults from HTML
    AI_SETTINGS_FIELDS.forEach(function(f) {
      var el = document.getElementById(f.id);
      if (el && data[f.col] != null) el.value = data[f.col];
    });
  } catch (e) { console.warn('loadAIConfig error:', e); }
}

function validateAIConfig() {
  var suggest = Number(document.getElementById('set-ai-suggest-after').value) || 3;
  var auto = Number(document.getElementById('set-ai-auto-after').value) || 7;
  var accuracy = Number(document.getElementById('set-ai-min-accuracy').value) || 85;
  if (suggest >= auto) {
    toast('\u05E1\u05E8\u05D9\u05E7\u05D5\u05EA \u05E2\u05D3 \u05D4\u05E6\u05E2\u05D4 \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05D9\u05D5\u05EA \u05E7\u05D8\u05DF \u05DE\u05E1\u05E8\u05D9\u05E7\u05D5\u05EA \u05E2\u05D3 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9', 'e');
    return false;
  }
  if (accuracy < 50 || accuracy > 100) {
    toast('\u05E1\u05E3 \u05D3\u05D9\u05D5\u05E7 \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05D9\u05D5\u05EA \u05D1\u05D9\u05DF 50 \u05DC-100', 'e');
    return false;
  }
  return true;
}

async function saveAIConfig() {
  if (!validateAIConfig()) return false;
  try {
    var tid = getTenantId();
    var updates = {};
    AI_SETTINGS_FIELDS.forEach(function(f) {
      var el = document.getElementById(f.id);
      if (el) updates[f.col] = Number(el.value) || null;
    });
    // Upsert: update if exists, insert if not
    var { data: existing } = await sb.from('ai_agent_config').select('id').eq('tenant_id', tid).maybeSingle();
    if (existing) {
      var { error } = await sb.from('ai_agent_config').update(updates).eq('tenant_id', tid);
      if (error) throw error;
    } else {
      updates.tenant_id = tid;
      var { error: insErr } = await sb.from('ai_agent_config').insert(updates);
      if (insErr) throw insErr;
    }
    return true;
  } catch (e) {
    console.error('saveAIConfig error:', e);
    toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DE\u05D9\u05E8\u05EA \u05D4\u05D2\u05D3\u05E8\u05D5\u05EA AI: ' + (e.message || ''), 'e');
    return false;
  }
}
