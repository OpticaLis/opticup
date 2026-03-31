// modules/storefront/studio-components.js
// Reusable component management: CTAs, lead forms, banners, sticky bars (CMS-3)

let studioComponents = [];

const COMP_TYPE_LABELS = {
  cta_button: { icon: '🔘', label: 'כפתור CTA' },
  lead_form: { icon: '📋', label: 'טופס לידים' },
  banner: { icon: '🏷️', label: 'באנר' },
  sticky_bar: { icon: '📌', label: 'בר קבוע' }
};

const COMP_STYLE_OPTIONS = [{ value: 'gold', label: 'זהב' }, { value: 'primary', label: 'ראשי' }, { value: 'secondary', label: 'משני' }, { value: 'outline', label: 'מתאר' }];

const PLACEMENT_OPTIONS = [{ value: 'all_pages', label: 'כל העמודים' }, { value: 'homepage_only', label: 'עמוד הבית בלבד' }, { value: 'products_only', label: 'עמודי מוצרים' }, { value: 'blog_only', label: 'בלוג' }, { value: 'campaign_only', label: 'עמודי קמפיין' }];

/**
 * Load all components for tenant
 */
async function loadComponents() {
  try {
    const { data, error } = await sb.from('v_admin_components')
      .select('*').eq('tenant_id', getTenantId()).order('created_at', { ascending: false });
    if (error) throw error;
    studioComponents = data || [];
    renderComponentList(studioComponents);
  } catch (err) {
    console.error('Load components error:', err);
    Toast.error('שגיאה בטעינת רכיבים');
  }
}

/**
 * Render component list grouped by type
 */
function renderComponentList(components) {
  const container = document.getElementById('studio-components-content');
  if (!container) return;

  if (!components.length) {
    container.innerHTML = `<div class="studio-empty">
      <p>אין רכיבים. צור רכיב ראשון!</p>
      <button class="btn btn-primary" onclick="openComponentEditor()" style="margin-top:12px">+ רכיב חדש</button>
    </div>`;
    return;
  }

  const grouped = {};
  for (const type of Object.keys(COMP_TYPE_LABELS)) grouped[type] = [];
  for (const c of components) {
    if (!grouped[c.type]) grouped[c.type] = [];
    grouped[c.type].push(c);
  }

  let html = `<div class="studio-toolbar" style="margin-bottom:16px">
    <button class="btn btn-primary" onclick="openComponentEditor()">+ רכיב חדש</button>
  </div>`;

  for (const [type, items] of Object.entries(grouped)) {
    if (!items.length) continue;
    const meta = COMP_TYPE_LABELS[type] || { icon: '❓', label: type };
    html += `<div class="comp-group">
      <h3 class="comp-group-title">${meta.icon} ${escapeHtml(meta.label)} (${items.length})</h3>`;
    for (const c of items) {
      const activeClass = c.is_active ? 'badge-published' : 'badge-draft';
      const activeText = c.is_active ? 'פעיל' : 'לא פעיל';
      const placements = (c.placements || []).join(', ') || '—';
      html += `<div class="comp-item">
        <div class="comp-item-info">
          <span class="comp-item-name">${escapeHtml(c.name)}</span>
          <span class="comp-item-placements">${escapeHtml(placements)}</span>
        </div>
        <div class="comp-item-actions">
          <span class="studio-badge ${activeClass}">${activeText}</span>
          <button class="btn btn-sm" onclick="toggleComponentActive('${c.id}',${c.is_active})" title="${c.is_active ? 'השבת' : 'הפעל'}">${c.is_active ? '🔴' : '🟢'}</button>
          <button class="btn btn-sm" onclick="openComponentEditor('${c.id}')" title="ערוך">✎</button>
          <button class="btn btn-sm" onclick="deleteComponent('${c.id}')" title="מחק">🗑</button>
        </div>
      </div>`;
    }
    html += `</div>`;
  }
  container.innerHTML = html;
}

/**
 * Open component editor modal
 */
function openComponentEditor(componentId) {
  const existing = componentId ? studioComponents.find(c => c.id === componentId) : null;
  const isNew = !existing;

  if (isNew) {
    // Type selector first
    const options = Object.entries(COMP_TYPE_LABELS).map(([type, meta]) =>
      `<div class="studio-type-option" onclick="openComponentForm('${type}')">${meta.icon} ${escapeHtml(meta.label)}</div>`
    ).join('');
    Modal.show({
      title: 'רכיב חדש — בחר סוג',
      size: 'sm',
      content: `<div class="studio-type-grid">${options}</div>`,
      footer: `<button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>`
    });
  } else {
    openComponentForm(existing.type, existing);
  }
}

/**
 * Open component form for create/edit
 */
function openComponentForm(type, existing) {
  Modal.close();
  const meta = COMP_TYPE_LABELS[type] || { icon: '❓', label: type };
  const config = existing?.config || {};
  const name = existing?.name || '';
  const placements = existing?.placements || [];

  let formHtml = `<div class="studio-field-group"><label>שם הרכיב *</label>
    <input type="text" id="comp-name" value="${escapeAttr(name)}" class="studio-field" placeholder="למשל: כפתור תיאום תור"></div>`;

  formHtml += buildConfigForm(type, config);
  formHtml += renderPlacementSelector(placements);

  if (type === 'lead_form' && (config.webhook_url || existing)) {
    formHtml += `<div class="studio-field-group" style="margin-top:16px">
      <button type="button" class="btn btn-sm" onclick="testWebhookFromForm()" style="background:#f59e0b;color:#fff">🧪 שלח טסט Webhook</button>
      <span id="webhook-test-status" style="margin-right:8px;font-size:.85rem"></span>
    </div>`;
  }

  // AI prompt for component editing (CMS-5)
  let aiPromptHtml = '';
  if (existing && typeof handleComponentAiPrompt === 'function') {
    aiPromptHtml = `<div class="ai-prompt-bar" style="margin-top:16px">
      <div class="ai-prompt-header"><span class="ai-prompt-label">AI עריכה עם</span></div>
      <div class="ai-prompt-input-row">
        <textarea placeholder="כתוב הוראה... למשל: שנה את הטקסט לקבעו פגישה" rows="2" id="ai-component-prompt-input"></textarea>
        <button class="btn btn-gold ai-send-btn" onclick="handleComponentAiPrompt(collectConfig('${type}'),'${existing.id}')">שלח</button>
      </div>
      <div id="ai-component-status" class="ai-status hidden"></div>
    </div>`;
  }

  const saveLabel = existing ? 'שמור' : 'צור';
  Modal.show({
    title: `${meta.icon} ${existing ? 'עריכת' : 'יצירת'} ${meta.label}`,
    size: 'lg',
    content: `<div id="comp-edit-form">${formHtml}${aiPromptHtml}</div>`,
    footer: `<button class="btn btn-primary" onclick="submitComponentSave('${type}','${existing?.id || ''}')">${saveLabel}</button>
      <button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>`
  });
}

/**
 * Build config fields based on component type
 */
function buildConfigForm(type, config) {
  let h = '';
  const v = (key, def) => escapeAttr(config[key] ?? def ?? '');

  if (type === 'cta_button') {
    h += field('טקסט הכפתור', 'text', 'comp-text', v('text', ''));
    h += field('כתובת URL', 'url', 'comp-url', v('url', ''));
    h += selectField('סגנון', 'comp-style', COMP_STYLE_OPTIONS, config.style || 'gold');
    h += selectField('פתיחה', 'comp-target', [{ value: '_self', label: 'באותו חלון' }, { value: '_blank', label: 'חלון חדש' }], config.target || '_self');
    h += field('תיאור (אופציונלי)', 'text', 'comp-description', v('description', ''));
  } else if (type === 'lead_form') {
    h += field('כותרת הטופס', 'text', 'comp-title', v('title', 'השאירו פרטים'));
    h += field('טקסט כפתור שליחה', 'text', 'comp-submit', v('submit_text', 'שליחה'));
    h += field('הודעת הצלחה', 'text', 'comp-success', v('success_message', 'ההודעה נשלחה בהצלחה!'));
    h += field('Webhook URL (Make.com)', 'url', 'comp-webhook', v('webhook_url', ''));
    h += field('Facebook Event (אופציונלי)', 'text', 'comp-fb-event', v('facebook_event', ''));
    h += field('Redirect URL (אופציונלי)', 'url', 'comp-redirect', v('redirect_url', ''));
    h += `<div class="studio-field-group"><label>שדות הטופס</label>
      <p style="font-size:.8rem;color:var(--g400);margin-bottom:8px">ברירת מחדל: שם, טלפון, אימייל. עריכה מתקדמת דרך JSON.</p>
      <textarea id="comp-fields" rows="5" class="studio-field" dir="ltr" style="font-family:monospace;font-size:.82rem">${escapeAttr(JSON.stringify(config.fields || [
        { name: 'name', label: 'שם מלא', type: 'text', required: true },
        { name: 'phone', label: 'טלפון', type: 'tel', required: true },
        { name: 'email', label: 'אימייל', type: 'email', required: false }
      ], null, 2))}</textarea></div>`;
  } else if (type === 'banner') {
    h += field('כותרת', 'text', 'comp-title', v('title', ''));
    h += field('טקסט', 'text', 'comp-text', v('text', ''));
    h += field('תמונה URL', 'url', 'comp-image', v('image', ''));
    h += field('טקסט CTA', 'text', 'comp-cta-text', v('cta_text', ''));
    h += field('CTA URL', 'url', 'comp-cta-url', v('cta_url', ''));
    h += selectField('סגנון', 'comp-style', [{ value: 'full', label: 'מלא' }, { value: 'card', label: 'כרטיס' }, { value: 'slim', label: 'צר' }], config.style || 'full');
    h += field('ספירה לאחור (ISO date)', 'text', 'comp-countdown', v('countdown_to', ''));
  } else if (type === 'sticky_bar') {
    h += field('טקסט', 'text', 'comp-text', v('text', ''));
    h += field('טקסט CTA', 'text', 'comp-cta-text', v('cta_text', ''));
    h += field('CTA URL', 'url', 'comp-cta-url', v('cta_url', ''));
    h += selectField('מיקום', 'comp-position', [{ value: 'bottom', label: 'למטה' }, { value: 'top', label: 'למעלה' }], config.position || 'bottom');
    h += selectField('צבע רקע', 'comp-bgcolor', [{ value: 'gold', label: 'זהב' }, { value: 'black', label: 'שחור' }, { value: 'white', label: 'לבן' }], config.bg_color || 'gold');
    h += `<div class="studio-field-group"><label><input type="checkbox" id="comp-dismissible" ${config.dismissible !== false ? 'checked' : ''}> ניתן לסגירה</label></div>`;
  }
  return h;
}

function field(label, type, id, value) {
  return `<div class="studio-field-group"><label>${label}</label>
    <input type="${type}" id="${id}" value="${value}" class="studio-field"></div>`;
}

function selectField(label, id, options, current) {
  const opts = options.map(o => `<option value="${o.value}" ${o.value === current ? 'selected' : ''}>${escapeHtml(o.label)}</option>`).join('');
  return `<div class="studio-field-group"><label>${label}</label>
    <select id="${id}" class="studio-field">${opts}</select></div>`;
}

/**
 * Render placement selector checkboxes
 */
function renderPlacementSelector(currentPlacements) {
  const checks = PLACEMENT_OPTIONS.map(o => {
    const checked = currentPlacements.includes(o.value) ? 'checked' : '';
    return `<label class="comp-placement-label"><input type="checkbox" name="comp-placement" value="${o.value}" ${checked}> ${escapeHtml(o.label)}</label>`;
  }).join('');
  const custom = currentPlacements.filter(p => !PLACEMENT_OPTIONS.some(o => o.value === p)).join(', ');
  return `<div class="studio-field-group"><label>מיקומים</label>
    <div class="comp-placement-grid">${checks}</div>
    <input type="text" id="comp-placement-custom" value="${escapeAttr(custom)}" class="studio-field" placeholder="slugs מותאמים (מופרדים בפסיק)" style="margin-top:6px"></div>`;
}

/**
 * Collect placements from form
 */
function collectPlacements() {
  const checked = [...document.querySelectorAll('input[name="comp-placement"]:checked')].map(el => el.value);
  const custom = (document.getElementById('comp-placement-custom')?.value || '').split(',').map(s => s.trim()).filter(Boolean);
  return [...checked, ...custom];
}

/**
 * Collect config from form based on type
 */
function collectConfig(type) {
  const val = id => document.getElementById(id)?.value?.trim() || '';
  if (type === 'cta_button') {
    return { text: val('comp-text'), url: val('comp-url'), style: val('comp-style'), target: val('comp-target'), description: val('comp-description') };
  } else if (type === 'lead_form') {
    let fields;
    try { fields = JSON.parse(document.getElementById('comp-fields')?.value || '[]'); } catch { fields = []; }
    return { title: val('comp-title'), submit_text: val('comp-submit'), success_message: val('comp-success'), webhook_url: val('comp-webhook'), facebook_event: val('comp-fb-event'), redirect_url: val('comp-redirect'), fields };
  } else if (type === 'banner') {
    return { title: val('comp-title'), text: val('comp-text'), image: val('comp-image'), cta_text: val('comp-cta-text'), cta_url: val('comp-cta-url'), style: val('comp-style'), countdown_to: val('comp-countdown') };
  } else if (type === 'sticky_bar') {
    return { text: val('comp-text'), cta_text: val('comp-cta-text'), cta_url: val('comp-cta-url'), position: val('comp-position'), bg_color: val('comp-bgcolor'), dismissible: document.getElementById('comp-dismissible')?.checked ?? true };
  }
  return {};
}

/**
 * Save component (create or update)
 */
async function submitComponentSave(type, existingId) {
  const name = document.getElementById('comp-name')?.value.trim();
  if (!name) { Toast.warning('יש להזין שם לרכיב'); return; }

  const config = collectConfig(type);
  const placements = collectPlacements();

  try {
    if (existingId) {
      const { error } = await sb.from('storefront_components')
        .update({ name, config, placements }).eq('id', existingId).eq('tenant_id', getTenantId());
      if (error) throw error;
    } else {
      const { error } = await sb.from('storefront_components')
        .insert({ tenant_id: getTenantId(), type, name, config, placements, is_active: true });
      if (error) throw error;
    }
    Modal.close();
    Toast.success('הרכיב נשמר');
    await loadComponents();
  } catch (err) {
    console.error('Save component error:', err);
    Toast.error('שגיאה בשמירת רכיב: ' + (err.message || ''));
  }
}

/**
 * Delete component (set inactive)
 */
async function deleteComponent(id) {
  const comp = studioComponents.find(c => c.id === id);
  const ok = await Modal.confirm({
    title: 'מחיקת רכיב',
    message: `למחוק את "${escapeHtml(comp?.name || '')}"?`,
    confirmText: 'מחק', cancelText: 'ביטול'
  });
  if (!ok) return;
  try {
    const { error } = await sb.from('storefront_components')
      .update({ is_active: false }).eq('id', id).eq('tenant_id', getTenantId());
    if (error) throw error;
    Toast.success('הרכיב נמחק');
    await loadComponents();
  } catch (err) {
    Toast.error('שגיאה במחיקת רכיב');
  }
}

/**
 * Toggle component active state
 */
async function toggleComponentActive(id, currentState) {
  try {
    const { error } = await sb.from('storefront_components')
      .update({ is_active: !currentState }).eq('id', id).eq('tenant_id', getTenantId());
    if (error) throw error;
    Toast.success(currentState ? 'הרכיב הושבת' : 'הרכיב הופעל');
    await loadComponents();
  } catch (err) {
    Toast.error('שגיאה בשינוי סטטוס');
  }
}

/**
 * Test webhook — sends a fake lead payload
 */
async function testWebhookFromForm() {
  const url = document.getElementById('comp-webhook')?.value?.trim();
  if (!url) { Toast.warning('יש להזין Webhook URL קודם'); return; }
  await testWebhook(url);
}

async function testWebhook(webhookUrl) {
  const statusEl = document.getElementById('webhook-test-status');
  if (statusEl) statusEl.textContent = '⏳ שולח...';

  const testPayload = {
    event: 'test_lead',
    lead: { name: 'טסט — בדיקת חיבור', phone: '0501234567', email: 'test@opticup.co.il', message: 'זהו ליד טסט לבדיקת החיבור' },
    source: { page: '/test/', component: 'Test from Studio', form_id: 'test' },
    utm: { source: 'studio_test', medium: 'test', campaign: 'webhook_test' },
    meta: { tenant: 'prizma', timestamp: new Date().toISOString(), is_test: true }
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });
    if (res.ok) {
      Toast.success(`Webhook עובד! סטטוס: ${res.status}`);
      if (statusEl) statusEl.innerHTML = `<span style="color:green">✅ ${res.status}</span>`;
    } else {
      Toast.error(`Webhook נכשל — סטטוס: ${res.status}`);
      if (statusEl) statusEl.innerHTML = `<span style="color:red">❌ ${res.status}</span>`;
    }
  } catch (err) {
    Toast.error('Webhook נכשל — ' + (err.message || 'שגיאת רשת'));
    if (statusEl) statusEl.innerHTML = `<span style="color:red">❌ ${err.message || 'שגיאה'}</span>`;
  }
}
