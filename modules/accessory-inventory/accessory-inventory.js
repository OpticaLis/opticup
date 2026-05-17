// accessory-inventory.js — entry + permission gate + render for #ac-app
// Per M1_CONTACT_LENSES_ACCESSORIES SPEC §2 Part C (2026-05-16). MV.

(function () {
  'use strict';

  window.AccessoryInv = window.AccessoryInv || {};

  async function gateOrRedirect() {
    var tries = 0;
    while (typeof hasPermission !== 'function' && tries < 50) {
      await new Promise(function (r) { setTimeout(r, 100); });
      tries++;
    }
    if (typeof hasPermission !== 'function') return true;
    if (!hasPermission('accessory.inventory.view')) {
      var g = document.getElementById('ac-access-gate');
      var a = document.getElementById('ac-app');
      if (g) g.style.display = 'block';
      if (a) a.style.display = 'none';
      return false;
    }
    var g2 = document.getElementById('ac-access-gate');
    var a2 = document.getElementById('ac-app');
    if (g2) g2.style.display = 'none';
    if (a2) a2.style.display = 'block';
    return true;
  }

  async function loadVariants() {
    if (typeof sb === 'undefined') return [];
    try {
      var resp = await sb
        .from('accessory_variant')
        .select('id, display_id, sku, upc_barcode, material, color, size, design_id, lens_design(name, lens_brand:brand_id(name))')
        .order('display_id', { ascending: true })
        .limit(500);
      return (resp && resp.data) || [];
    } catch (e) {
      console.error('[AccessoryInv] loadVariants failed', e);
      return [];
    }
  }

  async function loadStock() {
    if (typeof sb === 'undefined' || typeof getTenantId !== 'function') return [];
    try {
      var resp = await sb
        .from('tenant_accessory_stock')
        .select('variant_id, qty_on_hand, location_id')
        .eq('tenant_id', getTenantId());
      return (resp && resp.data) || [];
    } catch (e) { console.warn('[AccessoryInv] loadStock failed', e); return []; }
  }

  function row(v, stockByVariant) {
    var s = stockByVariant[v.id] || { qty: 0 };
    var brand = (v.lens_design && v.lens_design.lens_brand && v.lens_design.lens_brand.name) || '—';
    var design = (v.lens_design && v.lens_design.name) || '—';
    var esc = (typeof escapeHtml === 'function') ? escapeHtml : function (s) { return String(s == null ? '' : s); };
    return '<tr>' +
      '<td>' + esc(v.display_id) + '</td>' +
      '<td>' + esc(v.sku) + '</td>' +
      '<td>' + esc(brand) + '</td>' +
      '<td>' + esc(design) + '</td>' +
      '<td>' + esc(v.material || '—') + '</td>' +
      '<td>' + esc(v.color || '—') + '</td>' +
      '<td>' + esc(v.size || '—') + '</td>' +
      '<td style="font-weight:600">' + esc(s.qty) + '</td>' +
    '</tr>';
  }

  async function render() {
    var container = document.getElementById('ac-inv-container');
    if (!container) return;
    container.innerHTML = '<div class="empty-state">טוען...</div>';
    var results = await Promise.all([loadVariants(), loadStock()]);
    var variants = results[0]; var stock = results[1];
    var stockByVariant = {};
    stock.forEach(function (s) {
      var prev = stockByVariant[s.variant_id] || { qty: 0 };
      stockByVariant[s.variant_id] = { qty: prev.qty + (s.qty_on_hand || 0) };
    });
    if (!variants.length) {
      container.innerHTML = '<div class="empty-state">אין וריאציות זמינות עדיין — לאחר Stage D יופיעו וריאציות לדמו.</div>';
      return;
    }
    var html = '<table class="data-table" style="width:100%"><thead><tr>' +
      '<th>מק"ט</th><th>SKU</th><th>מותג</th><th>דגם</th><th>חומר</th><th>צבע</th><th>גודל</th><th>במלאי</th>' +
      '</tr></thead><tbody>' +
      variants.map(function (v) { return row(v, stockByVariant); }).join('') +
      '</tbody></table>';
    container.innerHTML = html;
  }

  async function bootstrap() {
    var ok = await gateOrRedirect();
    if (!ok) return;
    await render();
  }

  window.AccessoryInv.bootstrap = bootstrap;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
