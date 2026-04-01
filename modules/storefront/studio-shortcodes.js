// modules/storefront/studio-shortcodes.js
// Shortcode component library: browse presets, preview, copy, configure, save (Prompt D)

let shortcodePresets = [];
let shortcodeFilter = 'all';

const SC_CATEGORY_META = {
  cta:       { icon: '\u{1F518}', label: '\u05DB\u05E4\u05EA\u05D5\u05E8\u05D9\u05DD' },
  whatsapp:  { icon: '\u{1F4AC}', label: '\u05D5\u05D5\u05D0\u05D8\u05E1\u05D0\u05E4' },
  lead_form: { icon: '\u{1F4CB}', label: '\u05D8\u05E4\u05E1\u05D9\u05DD' },
  reviews:   { icon: '\u2B50',    label: '\u05D1\u05D9\u05E7\u05D5\u05E8\u05D5\u05EA' },
  products:  { icon: '\u{1F6CD}\uFE0F', label: '\u05DE\u05D5\u05E6\u05E8\u05D9\u05DD' }
};

/**
 * Load shortcode presets from Supabase
 */
async function loadShortcodePresets() {
  try {
    const tid = getTenantId();
    const { data, error } = await sb.from('v_admin_component_presets')
      .select('*')
      .or(`tenant_id.is.null,tenant_id.eq.${tid}`);
    if (error) throw error;
    shortcodePresets = data || [];
    renderShortcodeLibrary();
  } catch (err) {
    console.error('Load shortcode presets error:', err);
    const container = document.getElementById('studio-shortcodes-content');
    if (container) container.innerHTML = '<div class="studio-empty">\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05E8\u05DB\u05D9\u05D1\u05D9\u05DD</div>';
  }
}

/**
 * Render the full shortcode library UI
 */
function renderShortcodeLibrary() {
  const container = document.getElementById('studio-shortcodes-content');
  if (!container) return;

  // Filter tabs
  let html = '<div class="component-filter-tabs">';
  html += `<button class="component-filter-tab ${shortcodeFilter === 'all' ? 'active' : ''}" data-category="all" onclick="filterShortcodes('all')">\u05D4\u05DB\u05DC</button>`;
  for (const [cat, meta] of Object.entries(SC_CATEGORY_META)) {
    html += `<button class="component-filter-tab ${shortcodeFilter === cat ? 'active' : ''}" data-category="${cat}" onclick="filterShortcodes('${cat}')">${meta.icon} ${meta.label}</button>`;
  }
  html += '</div>';

  // Cards grid
  const filtered = shortcodeFilter === 'all' ? shortcodePresets : shortcodePresets.filter(p => p.category === shortcodeFilter);

  if (!filtered.length) {
    html += '<div class="studio-empty">\u05D0\u05D9\u05DF \u05E8\u05DB\u05D9\u05D1\u05D9\u05DD \u05DC\u05D4\u05E6\u05D9\u05D2</div>';
    container.innerHTML = html;
    return;
  }

  html += '<div class="components-grid">';
  for (const preset of filtered) {
    const meta = SC_CATEGORY_META[preset.category] || { icon: '\u2753', label: preset.category };
    const config = preset.config || {};
    html += `<div class="component-card" data-category="${escapeAttr(preset.category)}">
      <div class="component-card-header">
        <span class="component-card-icon">${meta.icon}</span>
        <h3 class="component-card-title">${escapeHtml(preset.name)}</h3>
      </div>
      <div class="component-card-preview">${renderShortcodePreview(preset.category, config)}</div>
      <p class="component-card-description">${escapeHtml(preset.description || '')}</p>
      <div class="component-card-code"><code>${escapeHtml(preset.shortcode)}</code></div>
      <div class="component-card-actions">
        <button class="btn-copy-shortcode" onclick="copyShortcodeToClipboard(this)" data-shortcode="${escapeAttr(preset.shortcode)}">\u{1F4CB} \u05D4\u05E2\u05EA\u05E7 \u05E7\u05D5\u05D3</button>
        <button class="btn-customize" onclick="openShortcodeConfigurator('${preset.id}')">\u2699\uFE0F \u05D4\u05EA\u05D0\u05DE\u05D4 \u05D0\u05D9\u05E9\u05D9\u05EA</button>
      </div>
    </div>`;
  }
  html += '</div>';

  container.innerHTML = html;
}

/**
 * Filter shortcodes by category
 */
function filterShortcodes(category) {
  shortcodeFilter = category;
  renderShortcodeLibrary();
}

/**
 * Copy shortcode to clipboard
 */
function copyShortcodeToClipboard(btn) {
  const shortcode = btn.dataset.shortcode;
  navigator.clipboard.writeText(shortcode).then(() => {
    const original = btn.textContent;
    btn.textContent = '\u2713 \u05D4\u05D5\u05E2\u05EA\u05E7!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove('copied');
    }, 2000);
  });
}

// === PREVIEW RENDERERS ===

function renderShortcodePreview(category, config) {
  if (category === 'cta') return renderScCtaPreview(config);
  if (category === 'whatsapp') return renderScWhatsappPreview(config);
  if (category === 'lead_form') return renderScFormPreview(config);
  if (category === 'reviews') return renderScReviewsPreview(config);
  if (category === 'products') return renderScProductsPreview(config);
  return '';
}

function renderScCtaPreview(config) {
  const styles = {
    primary: 'display:block;width:100%;padding:0.875rem 1.5rem;background:linear-gradient(135deg,#c9a555,#e8da94);color:#000;font-weight:700;font-size:1rem;border:none;border-radius:8px;text-align:center;cursor:default;',
    secondary: 'display:block;width:100%;padding:0.875rem 1.5rem;background:transparent;color:#c9a555;font-weight:700;font-size:1rem;border:2px solid #c9a555;border-radius:8px;text-align:center;',
    compact: 'display:inline-block;padding:0.5rem 1.25rem;background:linear-gradient(135deg,#c9a555,#e8da94);color:#000;font-weight:700;font-size:0.875rem;border:none;border-radius:6px;',
    pill: 'display:inline-block;padding:0.375rem 1rem;background:transparent;color:#c9a555;font-weight:600;font-size:0.8125rem;border:1.5px solid #c9a555;border-radius:999px;'
  };
  let style = styles[config.type || 'primary'] || styles.primary;
  if (config.rounded === 'true') style += 'border-radius:999px;';
  const icon = config.icon === 'arrow' ? ' \u2190' : '';
  return `<div style="${style}">${escapeHtml(config.text || '\u05DC\u05D7\u05E6\u05D5 \u05DB\u05D0\u05DF')}${icon}</div>`;
}

function renderScWhatsappPreview(config) {
  const sizes = {
    large: 'padding:0.875rem 1.5rem;font-size:1rem;',
    medium: 'padding:0.625rem 1.25rem;font-size:0.9375rem;',
    small: 'padding:0.5rem 1rem;font-size:0.875rem;'
  };
  let style = `display:inline-flex;align-items:center;gap:0.375rem;background:linear-gradient(135deg,#25D366,#60D89A);color:#fff;font-weight:700;border:none;border-radius:6px;direction:rtl;${sizes[config.size || 'large'] || sizes.large}`;
  if (config.rounded === 'true') style += 'border-radius:999px;';
  return `<div style="${style}">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
    <span>${escapeHtml(config.text || '\u05D5\u05D5\u05D0\u05D8\u05E1\u05D0\u05E4')}</span>
  </div>`;
}

function renderScFormPreview(config) {
  return `<div style="border:1px solid #e5e5e5;border-radius:8px;padding:1rem;background:#f9f9f9;">
    <div style="font-weight:700;margin-bottom:0.5rem;text-align:right;">${escapeHtml(config.title || '\u05D8\u05D5\u05E4\u05E1')}</div>
    <div style="display:flex;flex-direction:column;gap:0.5rem;">
      <div style="background:#fff;border:1px solid #e5e5e5;border-radius:6px;padding:0.5rem;color:#999;font-size:0.8rem;text-align:right;">\u05E9\u05DD</div>
      <div style="background:#fff;border:1px solid #e5e5e5;border-radius:6px;padding:0.5rem;color:#999;font-size:0.8rem;text-align:right;">\u05D8\u05DC\u05E4\u05D5\u05DF</div>
      <div style="background:linear-gradient(135deg,#c9a555,#e8da94);border-radius:6px;padding:0.5rem;text-align:center;font-weight:700;font-size:0.8rem;">${escapeHtml(config.submit_text || '\u05E9\u05DC\u05D9\u05D7\u05D4')}</div>
    </div>
  </div>`;
}

function renderScReviewsPreview(config) {
  if (config.style === 'rating_only') {
    return '<div style="text-align:center;"><div style="font-weight:700;">\u05DE\u05E2\u05D5\u05DC\u05D4</div><div style="color:#c9a555;font-size:1.25rem;">\u2605\u2605\u2605\u2605\u2605</div><div style="color:#666;font-size:0.75rem;">\u05DE\u05D1\u05D5\u05E1\u05E1 \u05E2\u05DC 153 \u05D1\u05D9\u05E7\u05D5\u05E8\u05D5\u05EA</div></div>';
  }
  return '<div style="text-align:center;"><div style="color:#c9a555;font-size:1rem;">\u2605\u2605\u2605\u2605\u2605</div><div style="display:flex;gap:0.5rem;margin-top:0.5rem;"><div style="flex:1;background:#fff;border:1px solid #e5e5e5;border-radius:6px;padding:0.5rem;font-size:0.7rem;text-align:right;">\u05D1\u05D9\u05E7\u05D5\u05E8\u05EA 1...</div><div style="flex:1;background:#fff;border:1px solid #e5e5e5;border-radius:6px;padding:0.5rem;font-size:0.7rem;text-align:right;">\u05D1\u05D9\u05E7\u05D5\u05E8\u05EA 2...</div></div></div>';
}

function renderScProductsPreview(config) {
  const cols = Math.min(parseInt(config.columns) || 4, 3);
  const cards = Array.from({ length: 3 }, () =>
    '<div style="background:#fff;border:1px solid #e5e5e5;border-radius:6px;padding:0.5rem;text-align:center;"><div style="background:#f5f5f5;height:40px;border-radius:4px;margin-bottom:0.25rem;"></div><div style="font-size:0.65rem;color:#c9a555;">Brand</div><div style="font-size:0.7rem;">Model</div></div>'
  ).join('');
  return `<div style="display:grid;grid-template-columns:repeat(${cols}, 1fr);gap:0.5rem;">${cards}</div>`;
}

// === CONFIGURATOR MODAL ===

function openShortcodeConfigurator(presetId) {
  const preset = shortcodePresets.find(p => p.id === presetId);
  if (!preset) return;

  const config = { ...(preset.config || {}) };
  let formHtml = buildShortcodeConfigForm(preset.category, config);

  // Live preview + generated shortcode
  const previewHtml = renderShortcodePreview(preset.category, config);
  const shortcodeText = preset.shortcode;

  const content = `<div style="direction:rtl;">
    <div id="sc-configurator-preview" class="component-card-preview" style="margin-bottom:16px;border:1px solid #e5e5e5;border-radius:8px;">${previewHtml}</div>
    <form id="sc-configurator-form" class="preset-save-form" onchange="updateShortcodePreview('${escapeAttr(preset.category)}')" oninput="updateShortcodePreview('${escapeAttr(preset.category)}')">${formHtml}</form>
    <div style="margin-top:16px;padding:12px;background:#f5f5f5;border-radius:8px;direction:ltr;">
      <code id="sc-generated-shortcode" style="font-size:.82rem;word-break:break-all;">${escapeHtml(shortcodeText)}</code>
    </div>
  </div>`;

  Modal.show({
    title: `\u2699\uFE0F ${escapeHtml(preset.name)} \u2014 \u05D4\u05EA\u05D0\u05DE\u05D4`,
    size: 'lg',
    content,
    footer: `<button class="btn btn-primary" onclick="copyConfiguredShortcode()">\u{1F4CB} \u05D4\u05E2\u05EA\u05E7 \u05E7\u05D5\u05D3</button>
      <button class="btn" style="background:#c9a555;color:#000" onclick="openSavePresetDialog('${escapeAttr(preset.category)}')">\u{1F4BE} \u05E9\u05DE\u05D5\u05E8 \u05DB\u05E8\u05DB\u05D9\u05D1 \u05D7\u05D3\u05E9</button>
      <button class="btn btn-ghost" onclick="Modal.close()">\u05E1\u05D2\u05D5\u05E8</button>`
  });
}

function buildShortcodeConfigForm(category, config) {
  let h = '';
  if (category === 'cta') {
    h += scField('\u05D8\u05E7\u05E1\u05D8 \u05D4\u05DB\u05E4\u05EA\u05D5\u05E8', 'text', 'sc-text', config.text || '');
    h += scSelect('\u05E1\u05D5\u05D2 \u05DB\u05E4\u05EA\u05D5\u05E8', 'sc-type', [
      { v: 'primary', l: '\u05E8\u05D0\u05E9\u05D9 (\u05D2\u05D3\u05D5\u05DC)' }, { v: 'secondary', l: '\u05DE\u05E9\u05E0\u05D9 (outlined)' },
      { v: 'compact', l: '\u05E7\u05D5\u05DE\u05E4\u05E7\u05D8\u05D9 (\u05E7\u05D8\u05DF)' }, { v: 'pill', l: 'Pill (\u05EA\u05D2\u05D9\u05EA)' }
    ], config.type || 'primary');
    h += scSelect('\u05E4\u05E2\u05D5\u05DC\u05D4', 'sc-action', [
      { v: 'link', l: '\u05E7\u05D9\u05E9\u05D5\u05E8' }, { v: 'popup', l: '\u05E4\u05D5\u05E4\u05D0\u05E4 \u05D8\u05D5\u05E4\u05E1' },
      { v: 'whatsapp', l: '\u05D5\u05D5\u05D0\u05D8\u05E1\u05D0\u05E4' }, { v: 'scroll', l: '\u05D2\u05DC\u05D9\u05DC\u05D4 \u05DC\u05D0\u05DC\u05DE\u05E0\u05D8' }
    ], config.action || 'link');
    h += scField('\u05DB\u05EA\u05D5\u05D1\u05EA (href)', 'text', 'sc-href', config.href || '');
    h += scField('\u05D4\u05D5\u05D3\u05E2\u05EA \u05D5\u05D5\u05D0\u05D8\u05E1\u05D0\u05E4', 'text', 'sc-message', config.message || '');
    h += scCheck('\u05E4\u05D9\u05E0\u05D5\u05EA \u05E2\u05D2\u05D5\u05DC\u05D5\u05EA', 'sc-rounded', config.rounded === 'true');
    h += scSelect('\u05D0\u05D9\u05D9\u05E7\u05D5\u05DF', 'sc-icon', [
      { v: '', l: '\u05DC\u05DC\u05D0' }, { v: 'arrow', l: '\u05D7\u05E5 \u2190' }, { v: 'whatsapp', l: '\u05D5\u05D5\u05D0\u05D8\u05E1\u05D0\u05E4' }
    ], config.icon || '');
    // Popup form config
    h += `<div id="sc-popup-config" style="display:${config.action === 'popup' ? 'block' : 'none'}; border-top:1px solid #e5e5e5; margin-top:1rem; padding-top:1rem;">
      <h4 style="font-weight:600; margin-bottom:0.5rem;">\u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05D8\u05D5\u05E4\u05E1 \u05D1\u05E4\u05D5\u05E4\u05D0\u05E4</h4>
      ${scField('\u05DB\u05D5\u05EA\u05E8\u05EA \u05D8\u05D5\u05E4\u05E1', 'text', 'sc-form_title', config.form_title || '')}
      ${scField('\u05E9\u05D3\u05D5\u05EA (name,phone,email,...)', 'text', 'sc-form_fields', config.form_fields || 'name,phone')}
      ${scField('\u05D8\u05E7\u05E1\u05D8 \u05DB\u05E4\u05EA\u05D5\u05E8 \u05E9\u05DC\u05D9\u05D7\u05D4', 'text', 'sc-form_submit_text', config.form_submit_text || '\u05E9\u05DC\u05D9\u05D7\u05D4')}
      ${scField('Webhook URL', 'text', 'sc-form_webhook_url', config.form_webhook_url || '')}
      ${scField('\u05D4\u05E4\u05E0\u05D9\u05D4 \u05D0\u05D7\u05E8\u05D9 \u05E9\u05DC\u05D9\u05D7\u05D4', 'text', 'sc-form_redirect_url', config.form_redirect_url || '')}
    </div>`;
  }

  if (category === 'whatsapp') {
    h += scField('\u05D8\u05E7\u05E1\u05D8 \u05DB\u05E4\u05EA\u05D5\u05E8', 'text', 'sc-text', config.text || '');
    h += scField('\u05D4\u05D5\u05D3\u05E2\u05D4', 'text', 'sc-message', config.message || '');
    h += scSelect('\u05D2\u05D5\u05D3\u05DC', 'sc-size', [
      { v: 'large', l: '\u05D2\u05D3\u05D5\u05DC' }, { v: 'medium', l: '\u05D1\u05D9\u05E0\u05D5\u05E0\u05D9' }, { v: 'small', l: '\u05E7\u05D8\u05DF' }
    ], config.size || 'large');
    h += scCheck('\u05DE\u05E2\u05D5\u05D2\u05DC (Pill)', 'sc-rounded', config.rounded === 'true');
  }

  if (category === 'lead_form') {
    h += scField('\u05DB\u05D5\u05EA\u05E8\u05EA \u05D8\u05D5\u05E4\u05E1', 'text', 'sc-title', config.title || '');
    h += scField('\u05E9\u05D3\u05D5\u05EA', 'text', 'sc-fields', config.fields || 'name,phone');
    h += scField('\u05E9\u05D3\u05D5\u05EA \u05D7\u05D5\u05D1\u05D4', 'text', 'sc-required_fields', config.required_fields || 'name,phone');
    h += scField('Checkboxes (\u05E4\u05E1\u05D9\u05E7 \u05DE\u05E4\u05E8\u05D9\u05D3, ! = \u05D7\u05D5\u05D1\u05D4)', 'text', 'sc-checkboxes', config.checkboxes || '');
    h += scSelect('\u05EA\u05E6\u05D5\u05D2\u05D4', 'sc-display', [
      { v: 'inline', l: 'Inline (\u05D1\u05E2\u05DE\u05D5\u05D3)' }, { v: 'popup', l: 'Popup' }, { v: 'inline_row', l: '\u05E9\u05D5\u05E8\u05D4 \u05D0\u05D7\u05EA' }
    ], config.display || 'inline');
    h += scField('\u05D8\u05E7\u05E1\u05D8 \u05DB\u05E4\u05EA\u05D5\u05E8', 'text', 'sc-submit_text', config.submit_text || '\u05E9\u05DC\u05D9\u05D7\u05D4');
    h += scField('Webhook URL', 'text', 'sc-webhook_url', config.webhook_url || '');
    h += scField('\u05D4\u05E4\u05E0\u05D9\u05D4 \u05D0\u05D7\u05E8\u05D9 \u05E9\u05DC\u05D9\u05D7\u05D4', 'text', 'sc-redirect_url', config.redirect_url || '');
  }

  if (category === 'reviews') {
    h += scSelect('\u05E1\u05D2\u05E0\u05D5\u05DF', 'sc-style', [
      { v: 'rating_only', l: '\u05E6\u05D9\u05D5\u05DF \u05D1\u05DC\u05D1\u05D3' }, { v: 'carousel', l: '\u05E7\u05E8\u05D5\u05E1\u05DC\u05D4' }, { v: 'grid', l: '\u05D2\u05E8\u05D9\u05D3' }
    ], config.style || 'carousel');
    h += scField('\u05DE\u05E1\u05E4\u05E8 \u05D1\u05D9\u05E7\u05D5\u05E8\u05D5\u05EA', 'number', 'sc-limit', config.limit || '5');
  }

  if (category === 'products') {
    h += scField('\u05DE\u05E1\u05E4\u05E8 \u05DE\u05D5\u05E6\u05E8\u05D9\u05DD', 'number', 'sc-limit', config.limit || '4');
    h += scField('\u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D4', 'text', 'sc-category', config.category || '');
    h += scField('\u05DE\u05D5\u05EA\u05D2', 'text', 'sc-brand', config.brand || '');
    h += scField('\u05E2\u05DE\u05D5\u05D3\u05D5\u05EA', 'number', 'sc-columns', config.columns || '4');
  }

  return h;
}

function scField(label, type, id, value) {
  return `<label>${escapeHtml(label)}<input type="${type}" id="${id}" value="${escapeAttr(value)}" ${type === 'number' ? 'min="1" max="12"' : ''}></label>`;
}

function scSelect(label, id, options, current) {
  const opts = options.map(o => `<option value="${o.v}" ${o.v === current ? 'selected' : ''}>${escapeHtml(o.l)}</option>`).join('');
  return `<label>${escapeHtml(label)}<select id="${id}">${opts}</select></label>`;
}

function scCheck(label, id, checked) {
  return `<label style="flex-direction:row;align-items:center;gap:8px;"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''} style="width:auto;"> ${escapeHtml(label)}</label>`;
}

/**
 * Collect form data from configurator and build shortcode
 */
function collectShortcodeConfig(category) {
  const val = id => document.getElementById(id)?.value?.trim() || '';
  const chk = id => document.getElementById(id)?.checked || false;
  const config = {};

  if (category === 'cta') {
    if (val('sc-text')) config.text = val('sc-text');
    if (val('sc-type')) config.type = val('sc-type');
    if (val('sc-action')) config.action = val('sc-action');
    if (val('sc-href')) config.href = val('sc-href');
    if (val('sc-message')) config.message = val('sc-message');
    if (chk('sc-rounded')) config.rounded = 'true';
    if (val('sc-icon')) config.icon = val('sc-icon');
    if (config.action === 'popup') {
      if (val('sc-form_title')) config.form_title = val('sc-form_title');
      if (val('sc-form_fields')) config.form_fields = val('sc-form_fields');
      if (val('sc-form_submit_text')) config.form_submit_text = val('sc-form_submit_text');
      if (val('sc-form_webhook_url')) config.form_webhook_url = val('sc-form_webhook_url');
      if (val('sc-form_redirect_url')) config.form_redirect_url = val('sc-form_redirect_url');
    }
  }

  if (category === 'whatsapp') {
    if (val('sc-text')) config.text = val('sc-text');
    if (val('sc-message')) config.message = val('sc-message');
    if (val('sc-size')) config.size = val('sc-size');
    if (chk('sc-rounded')) config.rounded = 'true';
  }

  if (category === 'lead_form') {
    if (val('sc-title')) config.title = val('sc-title');
    if (val('sc-fields')) config.fields = val('sc-fields');
    if (val('sc-required_fields')) config.required_fields = val('sc-required_fields');
    if (val('sc-checkboxes')) config.checkboxes = val('sc-checkboxes');
    if (val('sc-display')) config.display = val('sc-display');
    if (val('sc-submit_text')) config.submit_text = val('sc-submit_text');
    if (val('sc-webhook_url')) config.webhook_url = val('sc-webhook_url');
    if (val('sc-redirect_url')) config.redirect_url = val('sc-redirect_url');
  }

  if (category === 'reviews') {
    if (val('sc-style')) config.style = val('sc-style');
    if (val('sc-limit')) config.limit = val('sc-limit');
  }

  if (category === 'products') {
    if (val('sc-limit')) config.limit = val('sc-limit');
    if (val('sc-category')) config.category = val('sc-category');
    if (val('sc-brand')) config.brand = val('sc-brand');
    if (val('sc-columns')) config.columns = val('sc-columns');
  }

  return config;
}

function buildShortcodeFromConfig(category, config) {
  const tag = category === 'lead_form' ? 'lead_form' : category;
  let parts = [`[${tag}`];
  for (const [key, value] of Object.entries(config)) {
    if (value && value !== '' && value !== 'false') {
      parts.push(`${key}="${value}"`);
    }
  }
  parts.push(']');
  return parts.join(' ');
}

/**
 * Update live preview + shortcode when form changes
 */
function updateShortcodePreview(category) {
  const config = collectShortcodeConfig(category);
  const shortcode = buildShortcodeFromConfig(category, config);

  // Update preview
  const previewEl = document.getElementById('sc-configurator-preview');
  if (previewEl) previewEl.innerHTML = renderShortcodePreview(category, config);

  // Update generated shortcode
  const codeEl = document.getElementById('sc-generated-shortcode');
  if (codeEl) codeEl.textContent = shortcode;

  // Toggle popup form config visibility for CTA
  if (category === 'cta') {
    const popupDiv = document.getElementById('sc-popup-config');
    const actionVal = document.getElementById('sc-action')?.value;
    if (popupDiv) popupDiv.style.display = actionVal === 'popup' ? 'block' : 'none';
  }
}

/**
 * Copy the currently configured shortcode
 */
function copyConfiguredShortcode() {
  const codeEl = document.getElementById('sc-generated-shortcode');
  if (!codeEl) return;
  navigator.clipboard.writeText(codeEl.textContent).then(() => {
    Toast.success('\u05D4\u05E7\u05D5\u05D3 \u05D4\u05D5\u05E2\u05EA\u05E7!');
  });
}

/**
 * Open save-as-preset dialog
 */
function openSavePresetDialog(category) {
  const config = collectShortcodeConfig(category);
  const shortcode = buildShortcodeFromConfig(category, config);

  // Create a secondary modal (use prompt-style)
  const nameInput = prompt('\u05E9\u05DD \u05DC\u05E8\u05DB\u05D9\u05D1:');
  if (!nameInput) return;
  const descInput = prompt('\u05EA\u05D9\u05D0\u05D5\u05E8 (\u05D0\u05D5\u05E4\u05E6\u05D9\u05D5\u05E0\u05DC\u05D9, \u05DC\u05E9\u05D9\u05DE\u05D5\u05E9 AI):');

  saveShortcodePreset(category, nameInput, descInput || '', shortcode, config);
}

/**
 * Save a new preset to Supabase
 */
async function saveShortcodePreset(category, name, description, shortcode, config) {
  try {
    const { error } = await sb.from('storefront_component_presets')
      .insert({
        tenant_id: getTenantId(),
        category,
        name,
        description,
        shortcode,
        config
      });
    if (error) throw error;
    Toast.success('\u05D4\u05E8\u05DB\u05D9\u05D1 \u05E0\u05E9\u05DE\u05E8 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4');
    await loadShortcodePresets();
  } catch (err) {
    console.error('Save preset error:', err);
    Toast.error('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DE\u05D9\u05E8\u05D4');
  }
}
