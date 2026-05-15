// lens-inventory-modals.js — REAL ➕➖ wiring (Phase 1B procurement)
// Per SPEC M1_LENS_PHASE_1B_PROCUREMENT §2 + §8.
// ➕ → deep-link to lens-goods-receipt.html?variant_id=<uuid>&t=<slug>
// ➖ → PIN modal (verifyPinOnly via pin-auth EF) → quantity confirm → record_stock_movement RPC
//      with movement_type='adjustment_lost', PIN-protected per Iron Rule 1.
// Permission: lens.inventory.adjust required for ➖ flow.
// Cell context (sph/cyl) captured via document-level capture listener on .qty-btn so the
// foundation lens-inventory-grid.js stays untouched (out of scope per SPEC §7).

(function () {
  'use strict';

  // Last-clicked qty-btn context, captured during the capture phase before the
  // foundation grid handler fires its bubble-phase listener.
  let _lastCellCtx = { sph: null, cyl: null, action: null };

  function escapeHtmlSafe(s) {
    if (typeof escapeHtml === 'function') return escapeHtml(s);
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  // Capture-phase listener: records dataset of any clicked .qty-btn before the grid's
  // bubble-phase handler dispatches showStockMovementStub(action).
  document.addEventListener('click', function (ev) {
    const t = ev.target;
    if (t && t.classList && t.classList.contains('qty-btn')) {
      _lastCellCtx = {
        sph: t.dataset.sph || '',
        cyl: t.dataset.cyl || '',
        action: t.dataset.action || '',
      };
    }
  }, true);

  // Public API — preserves the exact name/signature the foundation grid expects.
  function showStockMovementStub(action) {
    const ctx = _lastCellCtx;
    if (action === 'add') {
      handleAdd(ctx.sph, ctx.cyl);
    } else if (action === 'reduce') {
      handleReduce(ctx.sph, ctx.cyl);
    } else {
      console.warn('[lens-inv-modals] unknown action', action);
    }
  }

  // ───────── ➕ Add: deep-link to GR ─────────
  function handleAdd(sph, cyl) {
    const variantId = window.LensInv && window.LensInv.variantId;
    if (!variantId) {
      if (window.Toast) Toast.error('יש לבחור וריאציה תחילה');
      return;
    }
    const slug = (typeof TENANT_SLUG !== 'undefined' && TENANT_SLUG) || (sessionStorage.getItem('tenant_slug') || '');
    const params = new URLSearchParams();
    params.set('variant_id', variantId);
    if (slug) params.set('t', slug);
    if (sph !== null && sph !== '') params.set('sph', sph);
    if (cyl !== null && cyl !== '') params.set('cyl', cyl);
    if (typeof writeLog === 'function') writeLog('lens.inventory.add_clicked', null, { variant_id: variantId, sph: sph, cyl: cyl });
    window.location.href = 'lens-goods-receipt.html?' + params.toString();
  }

  // ───────── ➖ Reduce: PIN → qty confirm → record_stock_movement ─────────
  function handleReduce(sph, cyl) {
    if (!hasPermission('lens.inventory.adjust')) {
      if (window.Toast) Toast.error('אין הרשאה להתאמת מלאי (lens.inventory.adjust)');
      return;
    }
    const variantId = window.LensInv && window.LensInv.variantId;
    if (!variantId) {
      if (window.Toast) Toast.error('יש לבחור וריאציה תחילה');
      return;
    }
    // Pick FIFO lot for this sph/cyl from the loaded lots (or load if missing).
    const lots = (window.LensInv && window.LensInv.lots) || [];
    const matchingLots = lots.filter(function (lot) {
      const sphMatch = (sph === '' || sph === null) ? true : (Number(lot.sph || 0) === Number(sph));
      const cylMatch = (cyl === '' || cyl === null) ? true : (Number(lot.cyl || 0) === Number(cyl));
      return sphMatch && cylMatch && (lot.qty_remaining || 0) > 0;
    });
    if (matchingLots.length === 0) {
      if (window.Toast) Toast.error('אין חבילה זמינה לסעיף זה (לחץ על התא קודם להצגת חבילות)');
      return;
    }
    matchingLots.sort(function (a, b) { return new Date(a.received_at || 0) - new Date(b.received_at || 0); });
    const fifoLot = matchingLots[0];

    // PIN modal — uses shared/js/pin-modal.js promptPin() helper which mints a JWT via pin-auth EF.
    if (typeof promptPin !== 'function') {
      if (window.Toast) Toast.error('PIN modal לא נטען (shared/js/pin-modal.js)');
      return;
    }
    promptPin('PIN — אימות התאמת מלאי', async function (pin, emp) {
      // promptPin invokes verifyEmployeePIN internally; if pin invalid, callback receives null emp
      if (!emp) { if (window.Toast) Toast.error('PIN שגוי'); return; }
      openQtyConfirmModal(variantId, sph, cyl, fifoLot, emp);
    });
  }

  function openQtyConfirmModal(variantId, sph, cyl, lot, emp) {
    const max = lot.qty_remaining || 0;
    const sphLabel = sph !== '' && sph !== null ? sph : '—';
    const cylLabel = cyl !== '' && cyl !== null ? cyl : '—';
    const body = '<div style="padding:8px 4px; font-size:13px;">' +
      '<div style="margin-bottom:10px; padding:8px 10px; background:#fef3c7; border-right:4px solid #f59e0b; border-radius:4px;">' +
        '<strong>⚠️ התאמת מלאי דורשת אישור.</strong><br>' +
        'וריאנט ' + escapeHtmlSafe((variantId || '').slice(0, 8)) + ' · SPH ' + escapeHtmlSafe(String(sphLabel)) + ' / CYL ' + escapeHtmlSafe(String(cylLabel)) +
        '<br>חבילה #' + escapeHtmlSafe(lot.lot_number || lot.id.slice(0, 8)) + ' (במלאי: ' + max + ')' +
      '</div>' +
      '<label style="font-size:12px; color:#475569;">כמות להפחתה (מקסימום ' + max + ')</label>' +
      '<input type="number" id="adjust-qty" min="1" max="' + max + '" value="1" style="width:100%; padding:8px 10px; border:1px solid #cbd5e1; border-radius:5px; margin-top:4px; font-size:14px;">' +
      '<label style="font-size:12px; color:#475569; margin-top:10px; display:block;">סיבת ההתאמה (חובה)</label>' +
      '<textarea id="adjust-reason" rows="2" style="width:100%; padding:6px 10px; border:1px solid #cbd5e1; border-radius:5px; margin-top:4px;" placeholder="למשל: שבירה, אובדן, ספירת מלאי..."></textarea>' +
      '<div id="adjust-error" style="color:#dc2626; font-size:12px; display:none; margin-top:6px;"></div>' +
    '</div>';
    const modal = Modal.show({
      size: 'sm',
      title: '➖ התאמת מלאי (אובדן)',
      content: body,
      footer:
        '<button type="button" class="btn" id="adjust-cancel">חזרה</button>' +
        '<button type="button" class="btn" style="background:#dc2626; color:#fff; border-color:#dc2626;" id="adjust-confirm">בצע התאמה</button>',
    });
    const overlay = modal.el;
    overlay.querySelector('#adjust-cancel').addEventListener('click', modal.close);
    overlay.querySelector('#adjust-confirm').addEventListener('click', async function () {
      const qty = parseInt(overlay.querySelector('#adjust-qty').value, 10) || 0;
      const reason = (overlay.querySelector('#adjust-reason').value || '').trim();
      const err = overlay.querySelector('#adjust-error');
      if (qty <= 0 || qty > max) { err.textContent = 'כמות חייבת להיות בין 1 ל-' + max; err.style.display = 'block'; return; }
      if (!reason) { err.textContent = 'סיבת ההתאמה היא שדה חובה'; err.style.display = 'block'; return; }
      // FINDINGS F-3 HIGH (M1B0/M1A gap): record_stock_movement has check constraint
      // stock_movement_exactly_one_source which requires adjustment_id NOT NULL for
      // movement_type='adjustment_lost'. There is NO record_adjustment_lost RPC and NO
      // stock_adjustment table to insert into first. Surfacing as a Phase 2 gate so the
      // user gets a clear message instead of a cryptic 23514 from the DB.
      err.textContent = 'התאמת מלאי שלילית טרם מומשה במלואה (תלוי ב-record_adjustment_lost RPC + stock_adjustment table - Phase 2). Iron Rule 1 + Iron Rule 21 - לא לעקוף ע"י INSERT ישיר. ראה FINDINGS F-3 ב-M1_LENS_PHASE_1B_PROCUREMENT/FINDINGS.md.';
      err.style.display = 'block';
      // Block the call. Audit-log the attempt for visibility.
      if (typeof writeLog === 'function') {
        writeLog('lens.inventory.adjust_blocked_phase2', null, { variant_id: variantId, lot_id: lot.id, qty: qty, reason: reason, blocker: 'F-3' });
      }
      return;
      // The original RPC call is preserved below as commented-out reference for the Phase 2
      // SPEC that builds record_adjustment_lost. DO NOT uncomment without that RPC shipping.
      try {
        const tid = getTenantId();
        const { error } = await sb.rpc('record_stock_movement', {
          p_tenant_id: tid,
          p_source_lot_id: lot.id,
          p_variant_id: variantId,
          p_location_id: lot.location_id || null,
          p_movement_type: 'adjustment_lost',
          p_qty_delta: -qty,
          p_cost_basis: lot.unit_cost || null,
          p_performed_by: emp ? emp.id : null,
          p_notes: reason,
          p_sph: lot.sph,
          p_cyl: lot.cyl,
          p_add_value: lot.add_value,
        });
        if (error) throw error;
        modal.close();
        if (window.Toast) Toast.success('התאמת מלאי בוצעה (-' + qty + ' יח׳)');
        // Iron Rule 2: writeLog
        if (typeof writeLog === 'function') {
          writeLog('lens.inventory.adjustment_lost', null, { variant_id: variantId, lot_id: lot.id, qty: qty, reason: reason, performed_by: emp.id });
        }
        // Refresh the grid so the new qty_on_hand shows up
        if (window.LensInvFilters && typeof window.LensInvFilters.reloadStock === 'function') {
          await window.LensInvFilters.reloadStock();
        } else if (window.LensInvGrid && typeof window.LensInvGrid.renderGrid === 'function') {
          // Foundation lens-inventory-filters does not export reloadStock — fall back to
          // a soft refresh by re-running renderGrid against the cached stockRows.
          window.LensInvGrid.renderGrid();
        }
        // Also refresh lots panel
        if (window.LensInvLots && typeof window.LensInvLots.showLotsFor === 'function') {
          window.LensInvLots.showLotsFor(sph, cyl);
        }
      } catch (e) {
        err.textContent = 'התאמה נכשלה: ' + (e.message || e);
        err.style.display = 'block';
        console.error('[lens-inv-modals] record_stock_movement failed', e);
      }
    });
  }

  // Preserve foundation API name; expose internal handlers for testability.
  window.LensInvModals = { showStockMovementStub, handleAdd, handleReduce };
})();
