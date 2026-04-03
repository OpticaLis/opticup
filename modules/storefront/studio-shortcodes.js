// modules/storefront/studio-shortcodes.js
// Shortcode component library: browse presets, preview, copy, configure, save
// Updated: CTA variants configurator + lead form configurator with dynamic fields

let shortcodePresets = [];
let shortcodeFilter = 'all';

// Dynamic fields state for lead form configurator
let scFormFields = [];
let scFormCheckboxes = [];

const SC_CATEGORY_META = {
  cta:       { icon: '\u{1F518}', label: '\u05DB\u05E4\u05EA\u05D5\u05E8\u05D9\u05DD' },
  whatsapp:  { icon: '\u{1F4AC}', label: '\u05D5\u05D5\u05D0\u05D8\u05E1\u05D0\u05E4' },
  lead_form: { icon: '\u{1F4CB}', label: '\u05D8\u05E4\u05E1\u05D9\u05DD' },
  reviews:   { icon: '\u2B50',    label: '\u05D1\u05D9\u05E7\u05D5\u05E8\u05D5\u05EA' },
  products:  { icon: '\u{1F6CD}\uFE0F', label: '\u05DE\u05D5\u05E6\u05E8\u05D9\u05DD' }
};

// === BUILT-IN CTA PRESETS ===
const BUILTIN_CTA_PRESETS = [
  {
    id: '__cta_primary_large',
    category: 'cta',
    name: '\u05DB\u05E4\u05EA\u05D5\u05E8 \u05E8\u05D0\u05E9\u05D9 (\u05D2\u05D3\u05D5\u05DC)',
    description: '\u05DB\u05E4\u05EA\u05D5\u05E8 \u05D6\u05D4\u05D1 \u05D2\u05D3\u05D5\u05DC, \u05D8\u05E7\u05E1\u05D8 \u05DC\u05D1\u05DF \u2014 \u05DC\u05D0\u05D6\u05D5\u05E8 Hero',
    shortcode: '[cta type="primary" size="large" text="\u05DC\u05D7\u05E6\u05D5 \u05DB\u05D0\u05DF" action="link" href="#"]',
    config: { type: 'primary', size: 'large', text: '\u05DC\u05D7\u05E6\u05D5 \u05DB\u05D0\u05DF', action: 'link', href: '#' }
  },
  {
    id: '__cta_primary',
    category: 'cta',
    name: '\u05DB\u05E4\u05EA\u05D5\u05E8 \u05E8\u05D0\u05E9\u05D9',
    description: '\u05DB\u05E4\u05EA\u05D5\u05E8 \u05D6\u05D4\u05D1 \u05E1\u05D8\u05E0\u05D3\u05E8\u05D8\u05D9, \u05D8\u05E7\u05E1\u05D8 \u05E9\u05D7\u05D5\u05E8 \u2014 \u05E9\u05D9\u05DE\u05D5\u05E9 \u05DB\u05DC\u05DC\u05D9',
    shortcode: '[cta type="primary" text="\u05DC\u05D7\u05E6\u05D5 \u05DB\u05D0\u05DF" action="link" href="#"]',
    config: { type: 'primary', text: '\u05DC\u05D7\u05E6\u05D5 \u05DB\u05D0\u05DF', action: 'link', href: '#' }
  },
  {
    id: '__cta_secondary',
    category: 'cta',
    name: '\u05DB\u05E4\u05EA\u05D5\u05E8 \u05DE\u05E9\u05E0\u05D9',
    description: '\u05DE\u05E1\u05D2\u05E8\u05EA \u05D6\u05D4\u05D1, \u05E8\u05E7\u05E2 \u05E9\u05E7\u05D5\u05E3',
    shortcode: '[cta type="secondary" text="\u05DC\u05D7\u05E6\u05D5 \u05DB\u05D0\u05DF" action="link" href="#"]',
    config: { type: 'secondary', text: '\u05DC\u05D7\u05E6\u05D5 \u05DB\u05D0\u05DF', action: 'link', href: '#' }
  },
  {
    id: '__cta_compact',
    category: 'cta',
    name: '\u05DB\u05E4\u05EA\u05D5\u05E8 \u05E7\u05D5\u05DE\u05E4\u05E7\u05D8\u05D9',
    description: '\u05DB\u05E4\u05EA\u05D5\u05E8 \u05D6\u05D4\u05D1 \u05E7\u05D8\u05DF \u2014 \u05DC\u05D1\u05E8\u05D9\u05DD \u05E7\u05D1\u05D5\u05E2\u05D9\u05DD, \u05DE\u05E8\u05D7\u05D1\u05D9\u05DD \u05E6\u05E4\u05D5\u05E4\u05D9\u05DD',
    shortcode: '[cta type="compact" text="\u05DC\u05D7\u05E6\u05D5 \u05DB\u05D0\u05DF" action="link" href="#"]',
    config: { type: 'compact', text: '\u05DC\u05D7\u05E6\u05D5 \u05DB\u05D0\u05DF', action: 'link', href: '#' }
  },
  {
    id: '__cta_pill',
    category: 'cta',
    name: '\u05DB\u05E4\u05EA\u05D5\u05E8 \u05D2\u05DC\u05D5\u05DC\u05D4',
    description: '\u05EA\u05D2\u05D9\u05EA \u05E7\u05D8\u05E0\u05D4 \u05E2\u05DD \u05DE\u05E1\u05D2\u05E8\u05EA',
    shortcode: '[cta type="pill" text="\u05DC\u05D7\u05E6\u05D5 \u05DB\u05D0\u05DF" action="link" href="#"]',
    config: { type: 'pill', text: '\u05DC\u05D7\u05E6\u05D5 \u05DB\u05D0\u05DF', action: 'link', href: '#' }
  }
];

// === BUILT-IN FORM PRESETS ===
const BUILTIN_FORM_PRESETS = [
  {
    id: '__form_supersale',
    category: 'lead_form',
    name: '\u05D8\u05D5\u05E4\u05E1 \u05E1\u05D5\u05E4\u05E8\u05E1\u05D9\u05D9\u05DC',
    description: '\u05D8\u05D5\u05E4\u05E1 \u05D4\u05E8\u05E9\u05DE\u05D4 \u05DC\u05D0\u05D9\u05E8\u05D5\u05E2 \u05DE\u05DB\u05D9\u05E8\u05D5\u05EA \u05E2\u05DD \u05DC\u05D5\u05D2\u05D5, \u05E9\u05D3\u05D5\u05EA \u05D1\u05E9\u05E0\u05D9 \u05D8\u05D5\u05E8\u05D9\u05DD, \u05D5\u05DB\u05D5\u05DB\u05D1\u05D9\u05DD',
    shortcode: '[lead_form id="supersale-form" display="popup" logo="true" title="\u05D4\u05E8\u05E9\u05DE\u05D4 + \u05E7\u05D8\u05DC\u05D5\u05D2 \u05D4\u05DE\u05D7\u05D9\u05E8\u05D9\u05DD \u05DC\u05D0\u05D9\u05E8\u05D5\u05E2 \u05D4\u05E7\u05E8\u05D5\u05D1" fields="name,phone,email,select:\u05D1\u05D3\u05D9\u05E7\u05EA \u05E8\u05D0\u05D9\u05D9\u05D4,textarea:\u05D4\u05E2\u05E8\u05D5\u05EA" select_options_\u05D1\u05D3\u05D9\u05E7\u05EA_\u05E8\u05D0\u05D9\u05D9\u05D4="\u05E6\u05E8\u05D9\u05DA \u05D1\u05D3\u05D9\u05E7\u05EA \u05E8\u05D0\u05D9\u05D9\u05D4|\u05DC\u05D0 \u05E6\u05E8\u05D9\u05DA" required_fields="name,phone" checkboxes="\u05D0\u05E0\u05D9 \u05DE\u05D0\u05E9\u05E8/\u05EA \u05E9\u05E7\u05E8\u05D0\u05EA\u05D9 \u05D5\u05D4\u05E1\u05DB\u05DE\u05EA\u05D9 \u05DC\u05EA\u05E7\u05E0\u05D5\u05DF \u05D4\u05D0\u05D9\u05E8\u05D5\u05E2!,\u05D0\u05E0\u05D9 \u05DE\u05D0\u05E9\u05E8/\u05EA \u05E7\u05D1\u05DC\u05EA \u05DE\u05E1\u05E8\u05D9\u05DD \u05E9\u05D9\u05D5\u05D5\u05E7\u05D9\u05D9\u05DD \u05DE\u05D0\u05D5\u05E4\u05D8\u05D9\u05E7\u05D4 \u05E4\u05E8\u05D9\u05D6\u05DE\u05D4" submit_text="\u05E9\u05E8\u05D9\u05D9\u05E0\u05D5 \u05DC\u05D9 \u05DE\u05E7\u05D5\u05DD" bottom_text="*\u05E7\u05D8\u05DC\u05D5\u05D2 \u05D4\u05DE\u05D7\u05D9\u05E8\u05D9\u05DD \u05D4\u05DE\u05DC\u05D0 \u05DE\u05D7\u05DB\u05D4 \u05DC\u05DB\u05DD \u05D1\u05DE\u05E1\u05DA \u05D4\u05D1\u05D0 \u05DC\u05D0\u05D7\u05E8 \u05D4\u05E8\u05E9\u05DE\u05D4 (\u05E9\u05DC\u05D9\u05D7\u05D4 \u05DE\u05D9\u05D9\u05D3\u05D9\u05EA \u05DC\u05D5\u05D5\u05D0\u05D8\u05E1\u05D0\u05E4)" layout="two-column"]',
    config: {
      id: 'supersale-form',
      display: 'popup',
      logo: 'true',
      title: '\u05D4\u05E8\u05E9\u05DE\u05D4 + \u05E7\u05D8\u05DC\u05D5\u05D2 \u05D4\u05DE\u05D7\u05D9\u05E8\u05D9\u05DD \u05DC\u05D0\u05D9\u05E8\u05D5\u05E2 \u05D4\u05E7\u05E8\u05D5\u05D1',
      fields: 'name,phone,email,select:\u05D1\u05D3\u05D9\u05E7\u05EA \u05E8\u05D0\u05D9\u05D9\u05D4,textarea:\u05D4\u05E2\u05E8\u05D5\u05EA',
      select_options_\u05D1\u05D3\u05D9\u05E7\u05EA_\u05E8\u05D0\u05D9\u05D9\u05D4: '\u05E6\u05E8\u05D9\u05DA \u05D1\u05D3\u05D9\u05E7\u05EA \u05E8\u05D0\u05D9\u05D9\u05D4|\u05DC\u05D0 \u05E6\u05E8\u05D9\u05DA',
      required_fields: 'name,phone',
      checkboxes: '\u05D0\u05E0\u05D9 \u05DE\u05D0\u05E9\u05E8/\u05EA \u05E9\u05E7\u05E8\u05D0\u05EA\u05D9 \u05D5\u05D4\u05E1\u05DB\u05DE\u05EA\u05D9 \u05DC\u05EA\u05E7\u05E0\u05D5\u05DF \u05D4\u05D0\u05D9\u05E8\u05D5\u05E2!,\u05D0\u05E0\u05D9 \u05DE\u05D0\u05E9\u05E8/\u05EA \u05E7\u05D1\u05DC\u05EA \u05DE\u05E1\u05E8\u05D9\u05DD \u05E9\u05D9\u05D5\u05D5\u05E7\u05D9\u05D9\u05DD \u05DE\u05D0\u05D5\u05E4\u05D8\u05D9\u05E7\u05D4 \u05E4\u05E8\u05D9\u05D6\u05DE\u05D4',
      submit_text: '\u05E9\u05E8\u05D9\u05D9\u05E0\u05D5 \u05DC\u05D9 \u05DE\u05E7\u05D5\u05DD',
      success_message: '\u05EA\u05D5\u05D3\u05D4! \u05D4\u05E4\u05E8\u05D8\u05D9\u05DD \u05E0\u05E9\u05DC\u05D7\u05D5 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4',
      bottom_text: '*\u05E7\u05D8\u05DC\u05D5\u05D2 \u05D4\u05DE\u05D7\u05D9\u05E8\u05D9\u05DD \u05D4\u05DE\u05DC\u05D0 \u05DE\u05D7\u05DB\u05D4 \u05DC\u05DB\u05DD \u05D1\u05DE\u05E1\u05DA \u05D4\u05D1\u05D0 \u05DC\u05D0\u05D7\u05E8 \u05D4\u05E8\u05E9\u05DE\u05D4 (\u05E9\u05DC\u05D9\u05D7\u05D4 \u05DE\u05D9\u05D9\u05D3\u05D9\u05EA \u05DC\u05D5\u05D5\u05D0\u05D8\u05E1\u05D0\u05E4)',
      layout: 'two-column'
    }
  }
];

/**
 * Load shortcode presets from Supabase + merge built-in presets
 */
async function loadShortcodePresets() {
  try {
    const tid = getTenantId();
    const { data, error } = await sb.from('v_admin_component_presets')
      .select('*')
      .or(`tenant_id.is.null,tenant_id.eq.${tid}`);
    if (error) throw error;
    // Merge built-ins first, then DB presets
    shortcodePresets = [...BUILTIN_CTA_PRESETS, ...BUILTIN_FORM_PRESETS, ...(data || [])];
    renderShortcodeLibrary();
  } catch (err) {
    console.error('Load shortcode presets error:', err);
    // Still show built-in presets even if DB fails
    shortcodePresets = [...BUILTIN_CTA_PRESETS, ...BUILTIN_FORM_PRESETS];
    renderShortcodeLibrary();
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
        <button class="btn-customize" onclick="openShortcodeConfigurator('${escapeAttr(preset.id)}')">\u2699\uFE0F \u05D4\u05EA\u05D0\u05DE\u05D4 \u05D0\u05D9\u05E9\u05D9\u05EA</button>
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
  const type = config.type || 'primary';
  const size = config.size || '';
  const styles = {
    'primary-large': 'display:block;width:100%;padding:1.125rem 2rem;background:linear-gradient(135deg,#c5a059,#946a00);color:#fff;font-weight:800;font-size:1.125rem;border:none;border-radius:50px;text-align:center;cursor:default;box-shadow:0 10px 30px rgba(0,0,0,0.4);text-shadow:0 1px 2px rgba(0,0,0,0.3);',
    primary: 'display:block;width:100%;padding:0.875rem 1.5rem;background:linear-gradient(135deg,#d4af37,#aa8c2c);color:#111;font-weight:900;font-size:1rem;border:none;border-radius:999px;text-align:center;cursor:default;box-shadow:0 12px 28px rgba(0,0,0,0.22);',
    secondary: 'display:block;width:100%;padding:0.875rem 1.5rem;background:transparent;color:#c9a555;font-weight:700;font-size:1rem;border:2px solid #c9a555;border-radius:8px;text-align:center;',
    compact: 'display:inline-block;padding:0.5rem 1.25rem;background:linear-gradient(135deg,#c9a555,#e8da94);color:#000;font-weight:700;font-size:0.875rem;border:none;border-radius:6px;',
    pill: 'display:inline-block;padding:0.375rem 1rem;background:transparent;color:#c9a555;font-weight:600;font-size:0.8125rem;border:1.5px solid #c9a555;border-radius:999px;'
  };
  const key = (type === 'primary' && size === 'large') ? 'primary-large' : type;
  let style = styles[key] || styles.primary;
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
  const display = config.display || 'inline';
  const title = config.title || '\u05D8\u05D5\u05E4\u05E1';
  const submitText = config.submit_text || '\u05E9\u05DC\u05D9\u05D7\u05D4';
  if (display === 'popup') {
    return `<div style="border:1px solid #e5e5e5;border-radius:12px;padding:1.25rem;background:#fff;box-shadow:0 8px 24px rgba(0,0,0,0.12);max-width:280px;margin:0 auto;">
      ${config.logo === 'true' ? '<div style="text-align:center;margin-bottom:0.5rem;font-size:1.5rem;">\u{1F441}\uFE0F</div>' : ''}
      <div style="font-weight:700;margin-bottom:0.75rem;text-align:center;font-size:0.85rem;line-height:1.4;">${escapeHtml(title)}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.4rem;">
        <div style="background:#f9f9f9;border:1px solid #e5e5e5;border-radius:6px;padding:0.4rem;color:#999;font-size:0.7rem;text-align:right;">\u05E9\u05DD</div>
        <div style="background:#f9f9f9;border:1px solid #e5e5e5;border-radius:6px;padding:0.4rem;color:#999;font-size:0.7rem;text-align:right;">\u05D8\u05DC\u05E4\u05D5\u05DF</div>
      </div>
      <div style="background:#1a1a1a;border-radius:50px;padding:0.5rem;text-align:center;font-weight:700;font-size:0.75rem;color:#fff;margin-top:0.5rem;">${escapeHtml(submitText)}</div>
      ${config.bottom_text ? '<div style="font-size:0.6rem;color:#888;text-align:center;margin-top:0.4rem;font-style:italic;">' + escapeHtml(config.bottom_text).substring(0, 40) + '...</div>' : ''}
      <div style="text-align:center;color:#c9a555;font-size:0.9rem;letter-spacing:3px;margin-top:0.3rem;">\u2605\u2605\u2605\u2605\u2605</div>
    </div>`;
  }
  return `<div style="border:1px solid #e5e5e5;border-radius:8px;padding:1rem;background:#f9f9f9;">
    <div style="font-weight:700;margin-bottom:0.5rem;text-align:right;">${escapeHtml(title)}</div>
    <div style="display:flex;flex-direction:column;gap:0.5rem;">
      <div style="background:#fff;border:1px solid #e5e5e5;border-radius:6px;padding:0.5rem;color:#999;font-size:0.8rem;text-align:right;">\u05E9\u05DD</div>
      <div style="background:#fff;border:1px solid #e5e5e5;border-radius:6px;padding:0.5rem;color:#999;font-size:0.8rem;text-align:right;">\u05D8\u05DC\u05E4\u05D5\u05DF</div>
      <div style="background:linear-gradient(135deg,#c9a555,#e8da94);border-radius:6px;padding:0.5rem;text-align:center;font-weight:700;font-size:0.8rem;">${escapeHtml(submitText)}</div>
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
  const category = preset.category;

  // For lead_form category, initialize dynamic fields state
  if (category === 'lead_form') {
    initFormFieldsFromConfig(config);
  }

  let formHtml = buildShortcodeConfigForm(category, config);
  const previewHtml = renderShortcodePreview(category, config);

  const content = `<div style="direction:rtl;">
    <div id="sc-configurator-preview" class="component-card-preview" style="margin-bottom:16px;border:1px solid #e5e5e5;border-radius:8px;">${previewHtml}</div>
    <form id="sc-configurator-form" class="preset-save-form" onchange="updateShortcodePreview('${escapeAttr(category)}')" oninput="updateShortcodePreview('${escapeAttr(category)}')">${formHtml}</form>
    <div style="margin-top:16px;padding:12px;background:#f5f5f5;border-radius:8px;direction:ltr;">
      <code id="sc-generated-shortcode" style="font-size:.82rem;word-break:break-all;">${escapeHtml(buildShortcodeFromConfig(category, collectShortcodeConfigFromObj(category, config)))}</code>
    </div>
  </div>`;

  Modal.show({
    title: `\u2699\uFE0F ${escapeHtml(preset.name)} \u2014 \u05D4\u05EA\u05D0\u05DE\u05D4`,
    size: 'lg',
    content,
    footer: `<button class="btn btn-primary" onclick="copyConfiguredShortcode()">\u{1F4CB} \u05D4\u05E2\u05EA\u05E7 \u05E7\u05D5\u05D3</button>
      <button class="btn" style="background:#c9a555;color:#000" onclick="openSavePresetDialog('${escapeAttr(category)}')">\u{1F4BE} \u05E9\u05DE\u05D5\u05E8 \u05DB\u05E8\u05DB\u05D9\u05D1 \u05D7\u05D3\u05E9</button>
      <button class="btn btn-ghost" onclick="Modal.close()">\u05E1\u05D2\u05D5\u05E8</button>`
  });
}

// Helper: build config object from preset config (without DOM)
function collectShortcodeConfigFromObj(category, config) {
  // Just return the config as-is for initial shortcode display
  const result = {};
  for (const [k, v] of Object.entries(config)) {
    if (v && v !== '' && v !== 'false') result[k] = v;
  }
  return result;
}

// === CTA CONFIGURATOR ===

function buildCtaConfigForm(config) {
  let h = '';

  // Button type dropdown (all 5 variants)
  h += scSelect('\u05E1\u05D5\u05D2 \u05DB\u05E4\u05EA\u05D5\u05E8', 'sc-cta-type', [
    { v: 'primary-large', l: '\u05E8\u05D0\u05E9\u05D9 (\u05D2\u05D3\u05D5\u05DC)' },
    { v: 'primary', l: '\u05E8\u05D0\u05E9\u05D9' },
    { v: 'secondary', l: '\u05DE\u05E9\u05E0\u05D9' },
    { v: 'compact', l: '\u05E7\u05D5\u05DE\u05E4\u05E7\u05D8\u05D9' },
    { v: 'pill', l: '\u05D2\u05DC\u05D5\u05DC\u05D4' }
  ], (config.type === 'primary' && config.size === 'large') ? 'primary-large' : (config.type || 'primary'));

  // Text
  h += scField('\u05D8\u05E7\u05E1\u05D8', 'text', 'sc-text', config.text || '');

  // Action
  h += scSelect('\u05E4\u05E2\u05D5\u05DC\u05D4', 'sc-action', [
    { v: 'link', l: '\u05E7\u05D9\u05E9\u05D5\u05E8' },
    { v: 'popup', l: '\u05E4\u05D5\u05E4\u05D0\u05E4 \u05D8\u05D5\u05E4\u05E1' },
    { v: 'whatsapp', l: '\u05D5\u05D5\u05D0\u05D8\u05E1\u05D0\u05E4' },
    { v: 'scroll', l: '\u05D2\u05DC\u05D9\u05DC\u05D4 \u05DC\u05D0\u05DC\u05DE\u05E0\u05D8' }
  ], config.action || 'link');

  const action = config.action || 'link';

  // Conditional fields based on action
  // Link
  h += `<div id="sc-action-link" style="display:${action === 'link' ? 'block' : 'none'}">`;
  h += scField('\u05DB\u05EA\u05D5\u05D1\u05EA URL', 'text', 'sc-href', config.href || '');
  h += '</div>';

  // Popup form — textarea for pasting [lead_form] shortcode
  h += `<div id="sc-action-popup" style="display:${action === 'popup' ? 'block' : 'none'};border-top:1px solid #e5e5e5;margin-top:1rem;padding-top:1rem;">`;
  h += `<label style="display:block;margin-bottom:0.25rem;font-weight:600;">\u05E9\u05D5\u05E8\u05D8\u05E7\u05D5\u05D3 \u05D8\u05D5\u05E4\u05E1</label>`;
  h += `<textarea id="sc-popup-form-shortcode" rows="4" style="width:100%;font-family:monospace;font-size:0.8rem;padding:0.5rem;border:1px solid #ddd;border-radius:6px;direction:ltr;resize:vertical;" placeholder='\u05D4\u05D3\u05D1\u05D9\u05E7\u05D5 \u05DB\u05D0\u05DF \u05D0\u05EA \u05E9\u05D5\u05E8\u05D8\u05E7\u05D5\u05D3 \u05D4\u05D8\u05D5\u05E4\u05E1 \u05DE\u05DC\u05E9\u05D5\u05E0\u05D9\u05EA "\u05D8\u05E4\u05E1\u05D9\u05DD"'></textarea>`;
  h += `<p id="sc-popup-form-hint" style="font-size:0.75rem;color:#888;margin-top:0.25rem;">\u05E2\u05D1\u05E8\u05D5 \u05DC\u05DC\u05E9\u05D5\u05E0\u05D9\u05EA \u05D8\u05E4\u05E1\u05D9\u05DD, \u05E6\u05E8\u05D5 \u05D8\u05D5\u05E4\u05E1, \u05D5\u05D4\u05D3\u05D1\u05D9\u05E7\u05D5 \u05D0\u05EA \u05D4\u05E9\u05D5\u05E8\u05D8\u05E7\u05D5\u05D3 \u05DB\u05D0\u05DF</p>`;
  h += '</div>';

  // WhatsApp
  h += `<div id="sc-action-whatsapp" style="display:${action === 'whatsapp' ? 'block' : 'none'}">`;
  h += scField('\u05D4\u05D5\u05D3\u05E2\u05D4', 'text', 'sc-message', config.message || '');
  h += '</div>';

  // Scroll
  h += `<div id="sc-action-scroll" style="display:${action === 'scroll' ? 'block' : 'none'}">`;
  h += scField('\u05DE\u05D6\u05D4\u05D4 \u05D0\u05DC\u05DE\u05E0\u05D8 (CSS selector)', 'text', 'sc-target', config.target || '');
  h += '</div>';

  // General options
  h += '<div style="border-top:1px solid #e5e5e5;margin-top:1rem;padding-top:1rem;">';
  h += scCheck('\u05E2\u05D9\u05D2\u05D5\u05DC \u05E4\u05D9\u05E0\u05D5\u05EA', 'sc-rounded', config.rounded === 'true');
  h += scSelect('\u05D0\u05D9\u05D9\u05E7\u05D5\u05DF', 'sc-icon', [
    { v: '', l: '\u05DC\u05DC\u05D0' },
    { v: 'arrow', l: '\u05D7\u05E5 \u2190' },
    { v: 'whatsapp', l: '\u05D5\u05D5\u05D0\u05D8\u05E1\u05D0\u05E4' }
  ], config.icon || '');
  h += '</div>';

  return h;
}

// === LEAD FORM CONFIGURATOR ===

// Field type definitions for the dynamic field builder
const FORM_FIELD_TYPES = [
  { v: 'name', l: '\u05E9\u05DD', builtin: true },
  { v: 'phone', l: '\u05D8\u05DC\u05E4\u05D5\u05DF', builtin: true },
  { v: 'email', l: '\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC', builtin: true },
  { v: 'text', l: '\u05D8\u05E7\u05E1\u05D8 \u05D7\u05D5\u05E4\u05E9\u05D9' },
  { v: 'select', l: '\u05D1\u05D7\u05D9\u05E8\u05D4 (select)' },
  { v: 'textarea', l: '\u05EA\u05D9\u05D1\u05EA \u05D8\u05E7\u05E1\u05D8 (textarea)' },
  { v: 'date', l: '\u05EA\u05D0\u05E8\u05D9\u05DA' }
];

function initFormFieldsFromConfig(config) {
  // Parse fields string into array
  scFormFields = [];
  const fieldsStr = config.fields || 'name,phone';
  const requiredSet = new Set((config.required_fields || 'name,phone').split(',').map(s => s.trim()));

  for (const f of fieldsStr.split(',')) {
    const trimmed = f.trim();
    if (!trimmed) continue;
    if (trimmed === 'name' || trimmed === 'phone' || trimmed === 'email') {
      scFormFields.push({ type: trimmed, label: '', required: requiredSet.has(trimmed), selectOptions: '' });
    } else {
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx === -1) {
        scFormFields.push({ type: 'text', label: trimmed, required: requiredSet.has(trimmed), selectOptions: '' });
      } else {
        const type = trimmed.slice(0, colonIdx);
        const label = trimmed.slice(colonIdx + 1);
        const optKey = label.replace(/ /g, '_');
        const selectOpts = config['select_options_' + optKey] || '';
        scFormFields.push({ type, label, required: requiredSet.has(label), selectOptions: selectOpts });
      }
    }
  }

  // Parse checkboxes
  scFormCheckboxes = [];
  if (config.checkboxes) {
    for (const c of config.checkboxes.split(',')) {
      const trimmed = c.trim();
      if (!trimmed) continue;
      const req = trimmed.endsWith('!');
      scFormCheckboxes.push({ text: req ? trimmed.slice(0, -1) : trimmed, required: req });
    }
  }
}

function buildFormConfigForm(config) {
  let h = '';

  // Form ID
  h += scField('\u05DE\u05D6\u05D4\u05D4 \u05D8\u05D5\u05E4\u05E1', 'text', 'sc-form-id', config.id || 'supersale-form');

  // Title
  h += scField('\u05DB\u05D5\u05EA\u05E8\u05EA', 'text', 'sc-form-title', config.title || '');

  // Display
  h += scSelect('\u05EA\u05E6\u05D5\u05D2\u05D4', 'sc-form-display', [
    { v: 'popup', l: '\u05E4\u05D5\u05E4\u05D0\u05E4' },
    { v: 'inline', l: '\u05D1\u05EA\u05D5\u05DA \u05D4\u05E2\u05DE\u05D5\u05D3' },
    { v: 'inline_row', l: '\u05E9\u05D5\u05E8\u05D4 \u05D0\u05D7\u05EA' }
  ], config.display || 'popup');

  // Logo
  h += scCheck('\u05DC\u05D5\u05D2\u05D5', 'sc-form-logo', config.logo === 'true');

  // Layout
  h += scSelect('\u05E4\u05E8\u05D9\u05E1\u05D4', 'sc-form-layout', [
    { v: 'two-column', l: '\u05E9\u05E0\u05D9 \u05D8\u05D5\u05E8\u05D9\u05DD' },
    { v: 'single', l: '\u05D8\u05D5\u05E8 \u05D0\u05D7\u05D3' }
  ], config.layout || 'two-column');

  // Dynamic fields section
  h += `<div style="border-top:1px solid #e5e5e5;margin-top:1rem;padding-top:1rem;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
      <strong>\u05E9\u05D3\u05D5\u05EA</strong>
      <button type="button" class="btn btn-sm btn-primary" onclick="scAddFormField()">+ \u05E9\u05D3\u05D4</button>
    </div>
    <div id="sc-form-fields-list">${renderFormFieldsList()}</div>
  </div>`;

  // Checkboxes section
  h += `<div style="border-top:1px solid #e5e5e5;margin-top:1rem;padding-top:1rem;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
      <strong>Checkboxes</strong>
      <button type="button" class="btn btn-sm btn-primary" onclick="scAddCheckbox()">+ Checkbox</button>
    </div>
    <div id="sc-form-checkboxes-list">${renderFormCheckboxesList()}</div>
  </div>`;

  // Submit text
  h += scField('\u05D8\u05E7\u05E1\u05D8 \u05DB\u05E4\u05EA\u05D5\u05E8 \u05E9\u05DC\u05D9\u05D7\u05D4', 'text', 'sc-form-submit', config.submit_text || '\u05E9\u05DC\u05D9\u05D7\u05D4');

  // Success message
  h += scField('\u05D4\u05D5\u05D3\u05E2\u05EA \u05D4\u05E6\u05DC\u05D7\u05D4', 'text', 'sc-form-success', config.success_message || '\u05EA\u05D5\u05D3\u05D4! \u05D4\u05E4\u05E8\u05D8\u05D9\u05DD \u05E0\u05E9\u05DC\u05D7\u05D5 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4');

  // Webhook URL
  h += scField('Webhook URL', 'text', 'sc-form-webhook', config.webhook_url || '');

  // Redirect URL
  h += scField('URL \u05D4\u05E4\u05E0\u05D9\u05D4', 'text', 'sc-form-redirect', config.redirect_url || '');

  // Bottom text
  h += scField('\u05D8\u05E7\u05E1\u05D8 \u05EA\u05D7\u05EA\u05D5\u05DF', 'text', 'sc-form-bottom', config.bottom_text || '');

  return h;
}

function renderFormFieldsList() {
  let h = '';
  for (let i = 0; i < scFormFields.length; i++) {
    const f = scFormFields[i];
    const isBuiltin = f.type === 'name' || f.type === 'phone' || f.type === 'email';
    const typeOpts = FORM_FIELD_TYPES.map(t =>
      `<option value="${t.v}" ${t.v === f.type ? 'selected' : ''}>${escapeHtml(t.l)}</option>`
    ).join('');

    h += `<div class="sc-field-row" style="display:flex;gap:6px;align-items:center;margin-bottom:6px;padding:6px;background:#f9f9f9;border-radius:6px;" data-idx="${i}">
      <span style="cursor:grab;color:#aaa;padding:0 4px;" title="\u05D2\u05E8\u05D5\u05E8">\u2630</span>
      <select onchange="scUpdateField(${i},'type',this.value)" style="flex:0 0 120px;padding:4px;border:1px solid #ddd;border-radius:4px;">${typeOpts}</select>`;

    if (!isBuiltin) {
      h += `<input type="text" value="${escapeAttr(f.label)}" onchange="scUpdateField(${i},'label',this.value)" placeholder="\u05EA\u05D5\u05D5\u05D9\u05EA \u05E9\u05D3\u05D4" style="flex:1;padding:4px;border:1px solid #ddd;border-radius:4px;">`;
    } else {
      h += `<span style="flex:1;padding:4px;color:#666;font-size:0.85rem;">${escapeHtml(FORM_FIELD_TYPES.find(t => t.v === f.type)?.l || f.type)}</span>`;
    }

    // Required checkbox
    h += `<label style="display:flex;align-items:center;gap:3px;font-size:0.75rem;white-space:nowrap;cursor:pointer;">
      <input type="checkbox" ${f.required ? 'checked' : ''} onchange="scUpdateField(${i},'required',this.checked)" style="width:auto;">
      \u05D7\u05D5\u05D1\u05D4
    </label>`;

    // Delete button
    h += `<button type="button" onclick="scRemoveField(${i})" style="background:none;border:none;color:#e53e3e;cursor:pointer;font-size:1.1rem;padding:2px 4px;" title="\u05DE\u05D7\u05E7">\u2715</button>`;
    h += '</div>';

    // Select options (shown only for select type)
    if (f.type === 'select') {
      h += `<div style="margin:0 0 6px 30px;padding:4px;">
        <input type="text" value="${escapeAttr(f.selectOptions)}" onchange="scUpdateField(${i},'selectOptions',this.value)" placeholder="\u05D0\u05E4\u05E9\u05E8\u05D5\u05EA \u05DE\u05D5\u05E4\u05E8\u05D3\u05D5\u05EA \u05D1-|  (\u05DC\u05DE\u05E9\u05DC: \u05D0\u05E4\u05E9\u05E8\u05D5\u05EA1|\u05D0\u05E4\u05E9\u05E8\u05D5\u05EA2)" style="width:100%;padding:4px;border:1px solid #ddd;border-radius:4px;font-size:0.8rem;direction:rtl;">
      </div>`;
    }
  }
  return h;
}

function renderFormCheckboxesList() {
  let h = '';
  for (let i = 0; i < scFormCheckboxes.length; i++) {
    const cb = scFormCheckboxes[i];
    h += `<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;padding:6px;background:#f9f9f9;border-radius:6px;">
      <input type="text" value="${escapeAttr(cb.text)}" onchange="scUpdateCheckbox(${i},'text',this.value)" placeholder="\u05D8\u05E7\u05E1\u05D8 Checkbox" style="flex:1;padding:4px;border:1px solid #ddd;border-radius:4px;">
      <label style="display:flex;align-items:center;gap:3px;font-size:0.75rem;white-space:nowrap;cursor:pointer;">
        <input type="checkbox" ${cb.required ? 'checked' : ''} onchange="scUpdateCheckbox(${i},'required',this.checked)" style="width:auto;">
        \u05D7\u05D5\u05D1\u05D4
      </label>
      <button type="button" onclick="scRemoveCheckbox(${i})" style="background:none;border:none;color:#e53e3e;cursor:pointer;font-size:1.1rem;padding:2px 4px;" title="\u05DE\u05D7\u05E7">\u2715</button>
    </div>`;
  }
  return h;
}

// Dynamic field CRUD
function scAddFormField() {
  scFormFields.push({ type: 'text', label: '', required: false, selectOptions: '' });
  document.getElementById('sc-form-fields-list').innerHTML = renderFormFieldsList();
  updateShortcodePreview('lead_form');
}

function scRemoveField(idx) {
  scFormFields.splice(idx, 1);
  document.getElementById('sc-form-fields-list').innerHTML = renderFormFieldsList();
  updateShortcodePreview('lead_form');
}

function scUpdateField(idx, prop, value) {
  if (!scFormFields[idx]) return;
  scFormFields[idx][prop] = value;
  // If changing to a builtin type, clear label
  if (prop === 'type' && (value === 'name' || value === 'phone' || value === 'email')) {
    scFormFields[idx].label = '';
  }
  // Re-render if type changed (to show/hide select options)
  if (prop === 'type') {
    document.getElementById('sc-form-fields-list').innerHTML = renderFormFieldsList();
  }
  updateShortcodePreview('lead_form');
}

// Checkbox CRUD
function scAddCheckbox() {
  scFormCheckboxes.push({ text: '', required: false });
  document.getElementById('sc-form-checkboxes-list').innerHTML = renderFormCheckboxesList();
  updateShortcodePreview('lead_form');
}

function scRemoveCheckbox(idx) {
  scFormCheckboxes.splice(idx, 1);
  document.getElementById('sc-form-checkboxes-list').innerHTML = renderFormCheckboxesList();
  updateShortcodePreview('lead_form');
}

function scUpdateCheckbox(idx, prop, value) {
  if (!scFormCheckboxes[idx]) return;
  scFormCheckboxes[idx][prop] = value;
  updateShortcodePreview('lead_form');
}


// === GENERIC CONFIG FORM BUILDER ===

function buildShortcodeConfigForm(category, config) {
  if (category === 'cta') return buildCtaConfigForm(config);
  if (category === 'lead_form') return buildFormConfigForm(config);

  // Other categories: whatsapp, reviews, products (keep existing)
  let h = '';

  if (category === 'whatsapp') {
    h += scField('\u05D8\u05E7\u05E1\u05D8 \u05DB\u05E4\u05EA\u05D5\u05E8', 'text', 'sc-text', config.text || '');
    h += scField('\u05D4\u05D5\u05D3\u05E2\u05D4', 'text', 'sc-message', config.message || '');
    h += scSelect('\u05D2\u05D5\u05D3\u05DC', 'sc-size', [
      { v: 'large', l: '\u05D2\u05D3\u05D5\u05DC' }, { v: 'medium', l: '\u05D1\u05D9\u05E0\u05D5\u05E0\u05D9' }, { v: 'small', l: '\u05E7\u05D8\u05DF' }
    ], config.size || 'large');
    h += scCheck('\u05DE\u05E2\u05D5\u05D2\u05DC (Pill)', 'sc-rounded', config.rounded === 'true');
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
 * Collect form data from configurator and build config object
 */
function collectShortcodeConfig(category) {
  const val = id => document.getElementById(id)?.value?.trim() || '';
  const chk = id => document.getElementById(id)?.checked || false;
  const config = {};

  if (category === 'cta') {
    const ctaType = val('sc-cta-type');
    if (ctaType === 'primary-large') {
      config.type = 'primary';
      config.size = 'large';
    } else if (ctaType) {
      config.type = ctaType;
    }
    if (val('sc-text')) config.text = val('sc-text');
    if (val('sc-action')) config.action = val('sc-action');

    // Conditional fields based on action
    if (config.action === 'link') {
      if (val('sc-href')) config.href = val('sc-href');
    } else if (config.action === 'popup') {
      // Extract form_id from pasted lead_form shortcode
      const formShortcode = val('sc-popup-form-shortcode');
      if (formShortcode) {
        const idMatch = formShortcode.match(/id="([^"]+)"/);
        if (idMatch) config.form_id = idMatch[1];
      }
    } else if (config.action === 'whatsapp') {
      if (val('sc-message')) config.message = val('sc-message');
    } else if (config.action === 'scroll') {
      if (val('sc-target')) config.target = val('sc-target');
    }

    if (chk('sc-rounded')) config.rounded = 'true';
    if (val('sc-icon')) config.icon = val('sc-icon');
  }

  if (category === 'whatsapp') {
    if (val('sc-text')) config.text = val('sc-text');
    if (val('sc-message')) config.message = val('sc-message');
    if (val('sc-size')) config.size = val('sc-size');
    if (chk('sc-rounded')) config.rounded = 'true';
  }

  if (category === 'lead_form') {
    if (val('sc-form-id')) config.id = val('sc-form-id');
    if (val('sc-form-display')) config.display = val('sc-form-display');
    if (chk('sc-form-logo')) config.logo = 'true';
    if (val('sc-form-title')) config.title = val('sc-form-title');
    if (val('sc-form-layout')) config.layout = val('sc-form-layout');

    // Build fields string from dynamic fields
    const fieldParts = [];
    const requiredParts = [];
    for (const f of scFormFields) {
      const isBuiltin = f.type === 'name' || f.type === 'phone' || f.type === 'email';
      if (isBuiltin) {
        fieldParts.push(f.type);
        if (f.required) requiredParts.push(f.type);
      } else {
        const fieldStr = f.label ? `${f.type}:${f.label}` : f.type;
        fieldParts.push(fieldStr);
        if (f.required && f.label) requiredParts.push(f.label);
      }
      // Add select options
      if (f.type === 'select' && f.label && f.selectOptions) {
        const optKey = f.label.replace(/ /g, '_');
        config['select_options_' + optKey] = f.selectOptions;
      }
    }
    if (fieldParts.length) config.fields = fieldParts.join(',');
    if (requiredParts.length) config.required_fields = requiredParts.join(',');

    // Build checkboxes string
    const cbParts = [];
    for (const cb of scFormCheckboxes) {
      if (cb.text) cbParts.push(cb.text + (cb.required ? '!' : ''));
    }
    if (cbParts.length) config.checkboxes = cbParts.join(',');

    if (val('sc-form-submit')) config.submit_text = val('sc-form-submit');
    if (val('sc-form-success')) config.success_message = val('sc-form-success');
    if (val('sc-form-webhook')) config.webhook_url = val('sc-form-webhook');
    if (val('sc-form-redirect')) config.redirect_url = val('sc-form-redirect');
    if (val('sc-form-bottom')) config.bottom_text = val('sc-form-bottom');
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
 * Build the full output for CTA + popup form (both shortcodes)
 */
function buildCtaOutputShortcode(config) {
  // Build CTA shortcode
  const ctaConfig = { ...config };
  const ctaShortcode = buildShortcodeFromConfig('cta', ctaConfig);

  // If popup action with pasted form shortcode, prepend it
  if (config.action === 'popup') {
    const formTextarea = document.getElementById('sc-popup-form-shortcode');
    const formShortcode = formTextarea?.value?.trim();
    if (formShortcode) {
      return formShortcode + '\n' + ctaShortcode;
    }
  }

  return ctaShortcode;
}

/**
 * Update live preview + shortcode when form changes
 */
function updateShortcodePreview(category) {
  const config = collectShortcodeConfig(category);

  // Build preview config for visual display
  const previewConfig = { ...config };
  if (category === 'cta') {
    // Map back for preview
    const ctaTypeEl = document.getElementById('sc-cta-type');
    if (ctaTypeEl && ctaTypeEl.value === 'primary-large') {
      previewConfig.type = 'primary';
      previewConfig.size = 'large';
    }
  }

  // Update preview
  const previewEl = document.getElementById('sc-configurator-preview');
  if (previewEl) previewEl.innerHTML = renderShortcodePreview(category, previewConfig);

  // Update generated shortcode
  const codeEl = document.getElementById('sc-generated-shortcode');
  if (codeEl) {
    if (category === 'cta') {
      codeEl.textContent = buildCtaOutputShortcode(config);
    } else {
      codeEl.textContent = buildShortcodeFromConfig(category, config);
    }
  }

  // Toggle action-specific fields for CTA
  if (category === 'cta') {
    const actionVal = document.getElementById('sc-action')?.value || 'link';
    ['link', 'popup', 'whatsapp', 'scroll'].forEach(a => {
      const el = document.getElementById('sc-action-' + a);
      if (el) el.style.display = actionVal === a ? 'block' : 'none';
    });
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
  const shortcode = category === 'cta' ? buildCtaOutputShortcode(config) : buildShortcodeFromConfig(category, config);

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
