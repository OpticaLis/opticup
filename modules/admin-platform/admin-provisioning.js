// === admin-provisioning.js ===
// Tenant provisioning wizard — 3-step form, slug validation, RPC call
// Depends on: admin-auth.js (adminSb, getCurrentAdmin), admin-db.js (AdminDB),
//             admin-audit.js (logAdminAction), modal-wizard.js, modal-builder.js, toast.js

let _slugDebounceTimer = null;
let _slugValid = false;
let _plansCache = null;

// ═══════════════════════════════════════════
// Slugify helper
// ═══════════════════════════════════════════

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[\u0590-\u05FF]/g, '')       // remove Hebrew
    .replace(/[^a-z0-9\s-]/g, '')          // keep only a-z, 0-9, spaces, hyphens
    .replace(/[\s]+/g, '-')                // spaces → hyphens
    .replace(/-{2,}/g, '-')               // collapse multiple hyphens
    .replace(/^-|-$/g, '')                // trim leading/trailing hyphens
    .slice(0, 30);
}

// ═══════════════════════════════════════════
// Slug real-time validation (debounced 500ms)
// ═══════════════════════════════════════════

function validateSlugRealtime(slug) {
  const el = document.getElementById('slug-status');
  if (!el) return;

  if (!slug || slug.length < 3) {
    el.innerHTML = '';
    _slugValid = false;
    return;
  }

  el.innerHTML = '<span style="color:var(--color-gray-400);">⏳ בודק...</span>';
  _slugValid = false;

  clearTimeout(_slugDebounceTimer);
  _slugDebounceTimer = setTimeout(async () => {
    try {
      const { data, error } = await adminSb.rpc('validate_slug', { p_slug: slug });
      if (error) throw error;
      if (data.valid) {
        el.innerHTML = '<span style="color:var(--color-success);">✅ הקוד פנוי</span>';
        _slugValid = true;
      } else {
        el.innerHTML = '<span style="color:var(--color-error);">❌ ' + data.reason + '</span>';
        _slugValid = false;
      }
    } catch (err) {
      el.innerHTML = '<span style="color:var(--color-error);">❌ שגיאה בבדיקה</span>';
      _slugValid = false;
    }
  }, 500);
}

// ═══════════════════════════════════════════
// Plan label formatter
// ═══════════════════════════════════════════

function _formatPlanLabel(plan) {
  const lim = plan.limits || {};
  const emp = lim.max_employees === -1 ? 'ללא הגבלה' : 'עד ' + lim.max_employees + ' עובדים';
  const inv = lim.max_inventory === -1 ? 'ללא הגבלה' : lim.max_inventory.toLocaleString() + ' פריטים';
  if (lim.max_employees === -1 && lim.max_inventory === -1) {
    return plan.display_name + ' — ללא הגבלה';
  }
  return plan.display_name + ' — ' + emp + ', ' + inv;
}

// ═══════════════════════════════════════════
// Step builders
// ═══════════════════════════════════════════

function _buildStep1() {
  return `
    <div style="display:flex;flex-direction:column;gap:1rem;max-width:420px;margin:0 auto;">
      <div class="form-group">
        <label for="tenant-name">שם חנות <span style="color:var(--color-error);">*</span></label>
        <input type="text" id="tenant-name" class="form-input" placeholder="אופטיקה ישראל" required>
      </div>
      <div class="form-group">
        <label for="tenant-slug">קוד חנות (slug) <span style="color:var(--color-error);">*</span></label>
        <input type="text" id="tenant-slug" class="form-input" placeholder="optika-israel"
               style="direction:ltr;text-align:left;" pattern="[a-z0-9-]+" required>
        <div id="slug-status" style="font-size:0.8rem;margin-top:0.25rem;min-height:1.2rem;"></div>
      </div>
      <div class="form-group">
        <label for="owner-name">שם בעלים <span style="color:var(--color-error);">*</span></label>
        <input type="text" id="owner-name" class="form-input" placeholder="ישראל ישראלי" required>
      </div>
      <div class="form-group">
        <label for="owner-email">אימייל בעלים <span style="color:var(--color-error);">*</span></label>
        <input type="email" id="owner-email" class="form-input" placeholder="israel@example.com"
               style="direction:ltr;text-align:left;" required>
      </div>
      <div class="form-group">
        <label for="owner-phone">טלפון בעלים</label>
        <input type="tel" id="owner-phone" class="form-input" placeholder="050-1234567"
               style="direction:ltr;text-align:left;">
      </div>
    </div>`;
}

function _buildStep2() {
  const opts = (_plansCache || []).map(p =>
    '<option value="' + p.id + '">' + _formatPlanLabel(p) + '</option>'
  ).join('');

  return `
    <div style="display:flex;flex-direction:column;gap:1rem;max-width:420px;margin:0 auto;">
      <div class="form-group">
        <label for="plan-select">תוכנית מנוי <span style="color:var(--color-error);">*</span></label>
        <select id="plan-select" class="form-input" required>
          <option value="">— בחר תוכנית —</option>
          ${opts}
        </select>
      </div>
      <div class="form-group">
        <label for="admin-employee-name">שם עובד ראשון <span style="color:var(--color-error);">*</span></label>
        <input type="text" id="admin-employee-name" class="form-input" value="מנהל" required>
      </div>
      <div class="form-group">
        <label for="admin-pin">PIN עובד ראשון <span style="color:var(--color-error);">*</span></label>
        <input type="text" id="admin-pin" class="form-input" value="12345"
               style="direction:ltr;text-align:left;" pattern="[0-9]{5,6}" maxlength="6" required>
        <small style="color:var(--color-gray-400);">5-6 ספרות. העובד יידרש להחליף בכניסה הראשונה.</small>
      </div>
    </div>`;
}

function _buildSummary() {
  const name = (document.getElementById('tenant-name') || {}).value || '';
  const slug = (document.getElementById('tenant-slug') || {}).value || '';
  const owner = (document.getElementById('owner-name') || {}).value || '';
  const email = (document.getElementById('owner-email') || {}).value || '';
  const phone = (document.getElementById('owner-phone') || {}).value || '—';
  const planEl = document.getElementById('plan-select');
  const planText = planEl ? planEl.options[planEl.selectedIndex].textContent : '';
  const empName = (document.getElementById('admin-employee-name') || {}).value || '';
  const pin = (document.getElementById('admin-pin') || {}).value || '';

  return `
    <div style="max-width:420px;margin:0 auto;background:var(--color-gray-50);border-radius:8px;padding:1.5rem;">
      <h3 style="margin:0 0 1rem;font-size:1.1rem;color:var(--color-primary);">סיכום יצירת חנות</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:0.4rem 0;color:var(--color-gray-500);width:100px;">שם</td><td style="font-weight:600;">${_esc(name)}</td></tr>
        <tr><td style="padding:0.4rem 0;color:var(--color-gray-500);">קוד</td><td style="direction:ltr;text-align:right;font-family:monospace;">${_esc(slug)}</td></tr>
        <tr><td style="padding:0.4rem 0;color:var(--color-gray-500);">בעלים</td><td>${_esc(owner)}</td></tr>
        <tr><td style="padding:0.4rem 0;color:var(--color-gray-500);">אימייל</td><td style="direction:ltr;text-align:right;">${_esc(email)}</td></tr>
        <tr><td style="padding:0.4rem 0;color:var(--color-gray-500);">טלפון</td><td style="direction:ltr;text-align:right;">${_esc(phone)}</td></tr>
        <tr><td style="padding:0.4rem 0;color:var(--color-gray-500);">תוכנית</td><td>${_esc(planText)}</td></tr>
        <tr><td style="padding:0.4rem 0;color:var(--color-gray-500);">עובד ראשון</td><td>${_esc(empName)}</td></tr>
        <tr><td style="padding:0.4rem 0;color:var(--color-gray-500);">PIN</td><td style="font-family:monospace;">${_esc(pin)}</td></tr>
      </table>
    </div>`;
}

function _esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ═══════════════════════════════════════════
// Wizard init
// ═══════════════════════════════════════════

async function initProvisioningWizard() {
  // Load plans once
  if (!_plansCache) {
    try {
      _plansCache = await AdminDB.query('plans', '*', {
        is_active: true,
        _order: { column: 'sort_order', ascending: true }
      });
    } catch (err) {
      Toast.error('שגיאה בטעינת תוכניות: ' + err.message);
      return;
    }
  }

  _slugValid = false;

  Modal.wizard({
    title: 'יצירת חנות חדשה',
    size: 'lg',
    finishText: 'צור חנות ➕',
    steps: [
      {
        label: 'פרטי חנות',
        content: _buildStep1,
        onEnter: function (panel) {
          const nameInput = panel.querySelector('#tenant-name');
          const slugInput = panel.querySelector('#tenant-slug');
          if (nameInput && slugInput) {
            nameInput.addEventListener('input', function () {
              // Only auto-suggest if user hasn't manually edited slug
              if (!slugInput.dataset.manualEdit) {
                slugInput.value = slugify(nameInput.value);
                validateSlugRealtime(slugInput.value);
              }
            });
            slugInput.addEventListener('input', function () {
              slugInput.dataset.manualEdit = 'true';
              // Force lowercase and valid chars
              slugInput.value = slugInput.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
              validateSlugRealtime(slugInput.value);
            });
            // Re-validate if slug already has value (going back and forth)
            if (slugInput.value) validateSlugRealtime(slugInput.value);
          }
        },
        validate: function () {
          const name = (document.getElementById('tenant-name') || {}).value.trim();
          const slug = (document.getElementById('tenant-slug') || {}).value.trim();
          const owner = (document.getElementById('owner-name') || {}).value.trim();
          const email = (document.getElementById('owner-email') || {}).value.trim();
          if (!name || name.length < 2) { Toast.warning('שם חנות חייב להכיל לפחות 2 תווים'); return false; }
          if (!slug) { Toast.warning('יש להזין קוד חנות'); return false; }
          if (!_slugValid) { Toast.warning('קוד החנות לא תקין — יש לחכות לאישור'); return false; }
          if (!owner) { Toast.warning('יש להזין שם בעלים'); return false; }
          if (!email || !email.includes('@')) { Toast.warning('יש להזין אימייל תקין'); return false; }
          return true;
        }
      },
      {
        label: 'תוכנית ו-PIN',
        content: _buildStep2,
        validate: function () {
          const plan = (document.getElementById('plan-select') || {}).value;
          const pin = (document.getElementById('admin-pin') || {}).value.trim();
          const empName = (document.getElementById('admin-employee-name') || {}).value.trim();
          if (!plan) { Toast.warning('יש לבחור תוכנית מנוי'); return false; }
          if (!empName) { Toast.warning('יש להזין שם עובד'); return false; }
          if (!/^\d{5,6}$/.test(pin)) { Toast.warning('PIN חייב להכיל 5-6 ספרות'); return false; }
          return true;
        }
      },
      {
        label: 'סיכום',
        content: _buildSummary
      }
    ],
    onFinish: function () {
      // Capture params NOW — modal DOM will be removed after this callback
      const params = {
        p_name: document.getElementById('tenant-name').value.trim(),
        p_slug: document.getElementById('tenant-slug').value.trim(),
        p_owner_name: document.getElementById('owner-name').value.trim(),
        p_owner_email: document.getElementById('owner-email').value.trim(),
        p_owner_phone: document.getElementById('owner-phone').value.trim() || null,
        p_plan_id: document.getElementById('plan-select').value,
        p_admin_pin: document.getElementById('admin-pin').value.trim(),
        p_admin_name: document.getElementById('admin-employee-name').value.trim()
      };
      provisionTenant(params);
    }
  });
}

// ═══════════════════════════════════════════
// Provision tenant — call RPC + log
// ═══════════════════════════════════════════

async function provisionTenant(params) {
  const admin = getCurrentAdmin();
  if (admin) params.p_created_by = admin.id;

  try {
    const { data: tenantId, error } = await adminSb.rpc('create_tenant', params);
    if (error) throw error;

    // Log success to provisioning_log
    try {
      await AdminDB.insert('tenant_provisioning_log', {
        tenant_id: tenantId,
        step: 'full_provisioning',
        status: 'completed',
        details: { params_used: { ...params, p_admin_pin: '***' } }
      });
    } catch (_) { /* non-critical */ }

    // Audit log
    await logAdminAction('tenant.create', tenantId, {
      name: params.p_name,
      slug: params.p_slug,
      plan_id: params.p_plan_id
    });

    Toast.success('החנות \'' + params.p_name + '\' נוצרה בהצלחה!');

    // Show credentials modal (use Modal.show — Modal.alert escapes HTML)
    const credBody = '<div style="text-align:right;line-height:2;padding:0.5rem 0;">' +
      '<strong>קוד חנות:</strong> ' + _esc(params.p_slug) + '<br>' +
      '<strong>כתובת:</strong> <span style="direction:ltr;display:inline-block;">app.opticalis.co.il/?t=' + _esc(params.p_slug) + '</span><br>' +
      '<strong>PIN מנהל:</strong> ' + _esc(params.p_admin_pin) + '<br>' +
      '<span style="color:var(--color-warning);">⚠️ PIN ישתנה בכניסה הראשונה</span>' +
      '</div>';
    const credModal = Modal.show({ title: 'פרטי כניסה לחנות חדשה', content: credBody, size: 'sm', closeOnEscape: true, closeOnBackdrop: true });

  } catch (err) {
    // Log failure
    try {
      await AdminDB.insert('tenant_provisioning_log', {
        tenant_id: null,
        step: 'full_provisioning',
        status: 'failed',
        error_message: err.message,
        details: { params_used: { ...params, p_admin_pin: '***' } }
      });
    } catch (_) { /* non-critical */ }

    Toast.error('שגיאה ביצירת החנות: ' + err.message);
  }
}
