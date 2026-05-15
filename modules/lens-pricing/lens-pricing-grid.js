// lens-pricing-grid.js — 3-column display + inline edit hook + row selection
// Per D-M1-04: catalog price, discount %, final price.

(function () {
  'use strict';

  function _designById(id) {
    return (window.LensPricing.designs || []).find(d => d.id === id);
  }

  function _variantById(id) {
    return (window.LensPricing.variants || []).find(v => v.id === id);
  }

  function _activeOverlayForOffering(offering) {
    // Variant first, then design, then supplier — same precedence as effective_price.
    const variant = _variantById(offering.variant_id);
    const variantOverlay = window.LensPricing.overlays.find(o =>
      o.scope_variant_id === offering.variant_id &&
      o.status === 'active' &&
      o.is_deleted === false &&
      o.overlay_type !== 'promo'
    );
    if (variantOverlay) return variantOverlay;
    if (variant) {
      const designOverlay = window.LensPricing.overlays.find(o =>
        o.scope_design_id === variant.design_id &&
        o.status === 'active' &&
        o.is_deleted === false &&
        o.overlay_type !== 'promo'
      );
      if (designOverlay) return designOverlay;
    }
    const supplierOverlay = window.LensPricing.overlays.find(o =>
      o.scope_supplier_id === offering.supplier_id &&
      o.status === 'active' &&
      o.is_deleted === false &&
      o.overlay_type !== 'promo'
    );
    return supplierOverlay || null;
  }

  function renderGrid() {
    const cont = document.getElementById('pricing-container');
    let offerings = window.LensPricing.offerings || [];

    // Brand filter (post-load filter on resolved design.brand_id)
    if (window.LensPricing.brandId) {
      const okDesignIds = new Set((window.LensPricing.designs || [])
        .filter(d => d.brand_id === window.LensPricing.brandId).map(d => d.id));
      offerings = offerings.filter(o => {
        const v = _variantById(o.variant_id);
        return v && okDesignIds.has(v.design_id);
      });
    }

    document.getElementById('pricing-summary').textContent =
      offerings.length + ' הצעות מסחר פעילות לפילטר הנוכחי.';

    if (!offerings.length) {
      cont.innerHTML = '<div class="empty-state">אין הצעות לסינון</div>';
      return;
    }

    let html = '<table class="pricing"><thead><tr>' +
               '<th><input type="checkbox" id="select-all"></th>' +
               '<th>וריאנט / דגם</th>' +
               '<th>מחיר קטלוג</th>' +
               '<th>הנחה %</th>' +
               '<th>מחיר סופי (כולל מע"מ)</th>' +
               '<th></th>' +
               '</tr></thead><tbody>';

    offerings.forEach(o => {
      const v = _variantById(o.variant_id);
      const d = v ? _designById(v.design_id) : null;
      const overlay = _activeOverlayForOffering(o);
      const discountPct = overlay && overlay.discount_pct != null ? Number(overlay.discount_pct) : 0;
      const catalog = Number(o.price_amount).toFixed(2);
      const cur = o.currency_code || 'ILS';
      const final = window.LensPricing.effectivePrices[o.id];
      const finalStr = final != null ? Number(final).toFixed(2) : '—';
      const selected = window.LensPricing.selectedOfferingIds.has(o.id);

      html += '<tr data-offering-id="' + escapeHtml(o.id) + '">' +
              '<td><input type="checkbox" class="select-row" data-offering-id="' + escapeHtml(o.id) + '"' + (selected ? ' checked' : '') + '></td>' +
              '<td>' + escapeHtml((v ? v.display_id : '?') + ' / ' + (d ? d.name : '?')) + '</td>' +
              '<td class="col-catalog">' + escapeHtml(catalog) + ' ' + escapeHtml(cur) + '</td>' +
              '<td><input type="number" class="discount-input" data-offering-id="' + escapeHtml(o.id) + '" data-variant-id="' + escapeHtml(o.variant_id) + '" value="' + escapeHtml(String(discountPct)) + '" min="0" max="100" step="0.5"></td>' +
              '<td class="col-final">' + escapeHtml(finalStr) + ' ' + escapeHtml(cur) + '</td>' +
              '<td><button class="btn" data-action="save-discount" data-offering-id="' + escapeHtml(o.id) + '" data-variant-id="' + escapeHtml(o.variant_id) + '">💾 שמור</button></td>' +
              '</tr>';
    });
    html += '</tbody></table>';
    cont.innerHTML = html;

    // Bind handlers
    document.getElementById('select-all').addEventListener('change', (e) => {
      const checked = e.target.checked;
      cont.querySelectorAll('input.select-row').forEach(cb => {
        cb.checked = checked;
        const id = cb.dataset.offeringId;
        if (checked) window.LensPricing.selectedOfferingIds.add(id);
        else window.LensPricing.selectedOfferingIds.delete(id);
      });
    });

    cont.querySelectorAll('input.select-row').forEach(cb => {
      cb.addEventListener('change', () => {
        const id = cb.dataset.offeringId;
        if (cb.checked) window.LensPricing.selectedOfferingIds.add(id);
        else window.LensPricing.selectedOfferingIds.delete(id);
      });
    });

    cont.querySelectorAll('[data-action="save-discount"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const offeringId = btn.dataset.offeringId;
        const variantId = btn.dataset.variantId;
        const input = cont.querySelector('input.discount-input[data-offering-id="' + offeringId + '"]');
        if (!input) return;
        const value = parseFloat(input.value);
        if (isNaN(value) || value < 0 || value > 100) {
          if (window.Toast) Toast.error('הנחה חייבת להיות בין 0 ל-100');
          return;
        }
        window.LensPricingInline.saveInlineDiscount(offeringId, variantId, value);
      });
    });
  }

  window.LensPricingGrid = { renderGrid };
})();
