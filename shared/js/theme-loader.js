/**
 * theme-loader.js — Per-Tenant CSS Variable Override
 *
 * Reads tenantRow.ui_config (JSONB) and injects CSS variable overrides to :root.
 * Standalone — no dependencies on any other shared/ file.
 *
 * @param {Object} tenantRow — tenant row from DB (already fetched by header.js)
 * @returns {void}
 *
 * Example ui_config in DB:
 * {
 *   "--color-primary": "#1a56db",
 *   "--color-primary-hover": "#1e429f",
 *   "--font-family": "Heebo, sans-serif"
 * }
 *
 * Rules:
 * - Only keys starting with "--" are injected (security — prevents injection)
 * - If ui_config is null/undefined/empty — does nothing (defaults from variables.css apply)
 * - Receives tenant row that is ALREADY fetched — ZERO additional DB calls
 * - Does NOT use innerHTML — only document.documentElement.style.setProperty()
 */
function loadTenantTheme(tenantRow) {
  if (!tenantRow) return;

  const config = tenantRow.ui_config;
  if (!config || typeof config !== 'object') return;

  const root = document.documentElement;
  const keys = Object.keys(config);

  // Map --color-* (new system) → --* (legacy system) for backward compat
  // header.css and styles.css use --primary, --primary-light, etc.
  // shared/css/variables.css uses --color-primary, --color-primary-hover, etc.
  const legacyMap = {
    '--color-primary': '--primary',
    '--color-primary-hover': '--primary-light',
    '--color-primary-dark': '--primary-dark',
  };

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    // Security: only inject CSS custom properties (must start with --)
    if (typeof key === 'string' && key.startsWith('--')) {
      root.style.setProperty(key, config[key]);
      // Also set legacy variable name if applicable
      if (legacyMap[key]) {
        root.style.setProperty(legacyMap[key], config[key]);
      }
    }
  }
}

// Make globally accessible
window.loadTenantTheme = loadTenantTheme;
