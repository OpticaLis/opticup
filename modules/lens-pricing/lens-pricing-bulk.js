// lens-pricing-bulk.js — bulk operations modal + bulk_apply_pricing_overlay RPC call
// Per D-M1-04: bulk required in Phase 1.

(function () {
  'use strict';

  function openBulkModal() {
    const selectedIds = Array.from(window.LensPricing.selectedOfferingIds);
    if (!selectedIds.length) {
      if (window.Toast) Toast.error('בחר תחילה הצעות מסחר לטיפול קבוצתי');
      return;
    }

    // Collect variant IDs from selected offerings
    const variantIds = selectedIds.map(oid => {
      const o = (window.LensPricing.offerings || []).find(x => x.id === oid);
      return o ? o.variant_id : null;
    }).filter(Boolean);

    if (!window.Modal || typeof Modal.show !== 'function') {
      console.warn('[lens-pricing] Modal not loaded; bulk action aborted');
      return;
    }

    const bodyHtml =
      '<div style="padding:16px;">' +
      '<div style="margin-bottom:12px;">נבחרו <strong>' + variantIds.length + '</strong> וריאנטים</div>' +
      '<label style="display:block; font-size:13px; margin-bottom:6px;">הנחה % (0-100):</label>' +
      '<input type="number" id="bulk-discount-pct" min="0" max="100" step="0.5" value="5" style="padding:8px; border:1px solid #d0d4d9; border-radius:5px; font-size:13px; width:120px;">' +
      '<div style="margin-top:12px; font-size:12px; color:#5d6d7e;">פעולה זו תוסיף שורת overlay לכל וריאנט נבחר. סוג הפעולה: negotiated, stacking: additive.</div>' +
      '</div>';

    Modal.show({
      title: 'פעולה קבוצתית על נבחרים',
      size: 'md',
      body: bodyHtml,
      buttons: [
        {
          label: '✓ החל',
          cssClass: 'btn btn-primary',
          onClick: async function () {
            const input = document.getElementById('bulk-discount-pct');
            const pct = parseFloat(input.value);
            if (isNaN(pct) || pct < 0 || pct > 100) {
              if (window.Toast) Toast.error('הנחה חייבת להיות בין 0 ל-100');
              return;
            }
            Modal.close();
            await applyBulk(variantIds, pct);
          },
        },
        { label: 'ביטול', cssClass: 'btn', onClick: function () { Modal.close(); } },
      ],
    });
  }

  async function applyBulk(variantIds, discountPct) {
    const tenantId = getTenantId();
    if (!tenantId) {
      if (window.Toast) Toast.error('שגיאה: tenant_id חסר');
      return;
    }
    try {
      const { data, error } = await sb.rpc('bulk_apply_pricing_overlay', {
        p_tenant_id: tenantId,
        p_overlay_template: {
          overlay_type: 'negotiated',
          discount_pct: discountPct,
          stacking_rule: 'additive',
          application_order: 100,
          status: 'active',
          notes: 'bulk-apply via lens-pricing.html ' + new Date().toISOString().substring(0, 10),
        },
        p_target_variant_ids: variantIds,
      });
      if (error) throw error;
      const rows = typeof data === 'number' ? data : 0;
      if (window.Toast && typeof Toast.success === 'function') {
        Toast.success('נוצרו ' + rows + ' שורות overlay');
      }
      window.LensPricing.selectedOfferingIds.clear();
      await window.LensPricingFilters.refreshPricingList();
      return rows;
    } catch (err) {
      console.error('[lens-pricing] bulk apply failed', err);
      if (window.Toast && typeof Toast.error === 'function') {
        Toast.error('שגיאה: ' + (err.message || err));
      }
    }
  }

  window.LensPricingBulk = { openBulkModal, applyBulk };
})();
