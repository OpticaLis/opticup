/* crm-broadcast-cancel.js — Queue-side broadcast cancellation.
   M4_DRY_RUN_PREVIEW_AND_DISPATCH Phase 6 (2026-05-14).
   Public API:
     CrmBroadcastCancel.showCancelToast({ runId, queuedCount })
     CrmBroadcastCancel.cancelByRunId(runId)  → { cancelled, alreadyProcessed }
   Iron Rule 22 defense-in-depth: every query carries getTenantId(). */
(function () {
  'use strict';

  var _activeToast = null;

  function _getTid() {
    return (typeof getTenantId === 'function') ? getTenantId() : null;
  }

  // UPDATE crm_message_queue SET status='cancelled' WHERE tenant_id=$tid
  // AND run_id=$rid AND processed_at IS NULL. Brief §3.7 — reuse run_id as
  // broadcast_id (no DDL). Rows already delivered are untouched (predicate
  // filters them out); a second call is a no-op.
  async function cancelByRunId(runId) {
    if (!runId) return { ok: false, error: 'no_run_id' };
    var tid = _getTid();
    if (!window.sb || !tid) return { ok: false, error: 'no_tenant' };
    try {
      var updRes = await sb.from('crm_message_queue')
        .update({ status: 'cancelled', error_message: 'operator_cancelled' })
        .eq('tenant_id', tid)
        .eq('run_id', runId)
        .is('processed_at', null)
        .select('id');
      if (updRes.error) return { ok: false, error: updRes.error.message };
      var cancelledCount = (updRes.data || []).length;
      var totalRes = await sb.from('crm_message_queue')
        .select('status, processed_at', { count: 'exact', head: false })
        .eq('tenant_id', tid)
        .eq('run_id', runId);
      if (totalRes.error) return { ok: true, cancelled: cancelledCount, alreadyProcessed: 0, total: cancelledCount };
      var rows = totalRes.data || [];
      var alreadyProcessed = rows.filter(function (r) { return r.processed_at != null && r.status !== 'cancelled'; }).length;
      return { ok: true, cancelled: cancelledCount, alreadyProcessed: alreadyProcessed, total: rows.length };
    } catch (e) {
      console.error('CrmBroadcastCancel.cancelByRunId threw:', e);
      return { ok: false, error: String(e && e.message || e) };
    }
  }

  // Self-rendered toast (Toast.success escapes HTML so we can't embed a
  // button via the standard API). Lives in a fixed-position container.
  function _ensureContainer() {
    var c = document.getElementById('crm-broadcast-cancel-container');
    if (c) return c;
    c = document.createElement('div');
    c.id = 'crm-broadcast-cancel-container';
    c.style.cssText = 'position:fixed;top:1rem;left:50%;transform:translateX(-50%);z-index:99999;display:flex;flex-direction:column;gap:0.5rem;';
    document.body.appendChild(c);
    return c;
  }

  function _dismissActive() {
    if (_activeToast && _activeToast.parentNode) _activeToast.parentNode.removeChild(_activeToast);
    _activeToast = null;
  }

  function _renderToast(opts) {
    _dismissActive();
    var container = _ensureContainer();
    var el = document.createElement('div');
    el.style.cssText = 'background:#fff;border:1px solid #cbd5e1;border-radius:0.75rem;padding:0.75rem 1rem;box-shadow:0 10px 25px -5px rgb(0 0 0 / 0.1);min-width:380px;max-width:560px;font-family:inherit;display:flex;align-items:center;gap:0.75rem;';
    el.innerHTML =
      '<div style="flex:1" data-cbc-body="1">' + opts.html + '</div>' +
      (opts.actionLabel
        ? '<button type="button" data-cbc-action="1" style="padding:0.4rem 0.85rem;border:1px solid #f87171;color:#b91c1c;background:#fff;border-radius:0.5rem;font-size:0.875rem;font-weight:600;cursor:pointer;">' + opts.actionLabel + '</button>'
        : '') +
      '<button type="button" data-cbc-close="1" style="background:transparent;border:0;color:#94a3b8;font-size:1.25rem;cursor:pointer;line-height:1;padding:0 0.25rem;">&times;</button>';
    container.appendChild(el);
    _activeToast = el;
    el.querySelector('[data-cbc-close="1"]').addEventListener('click', _dismissActive);
    if (opts.actionLabel && typeof opts.onAction === 'function') {
      el.querySelector('[data-cbc-action="1"]').addEventListener('click', function () {
        opts.onAction(el);
      });
    }
    if (opts.autoDismissMs) {
      setTimeout(function () { if (_activeToast === el) _dismissActive(); }, opts.autoDismissMs);
    }
    return el;
  }

  // Brief §3.7 — "🟢 X messages queued — delivering over ~Y minutes."
  // Y = ceil(X / 60) at the dispatch-queue cron's 1-msg/sec drain rate.
  function showCancelToast(opts) {
    var runId = opts && opts.runId;
    var n = (opts && opts.queuedCount) || 0;
    if (!runId || n <= 0) return;
    var minutes = Math.max(1, Math.ceil(n / 60));
    var html = '🟢 <strong>' + n + '</strong> הודעות בתור — מסירה תוך ~<strong>' + minutes + '</strong> דקות.';
    _renderToast({
      html: html,
      actionLabel: 'ביטול שליחה',
      onAction: async function (el) {
        if (typeof confirm === 'function' && !confirm('לבטל את שליחת ' + n + ' ההודעות שעדיין לא נשלחו?')) return;
        var bodyEl = el.querySelector('[data-cbc-body="1"]');
        var actionBtn = el.querySelector('[data-cbc-action="1"]');
        if (actionBtn) { actionBtn.disabled = true; actionBtn.textContent = 'מבטל...'; }
        if (bodyEl) bodyEl.innerHTML = '🔄 מבטל...';
        var r = await cancelByRunId(runId);
        if (!r.ok) {
          if (bodyEl) bodyEl.innerHTML = '⚠️ ביטול נכשל: ' + (r.error || 'unknown');
          if (window.Toast) Toast.error('ביטול נכשל: ' + (r.error || 'unknown'));
          return;
        }
        if (bodyEl) {
          bodyEl.innerHTML = '🟡 בוטלו <strong>' + r.cancelled + '</strong> מתוך <strong>' + r.total + '</strong>. <strong>' + r.alreadyProcessed + '</strong> כבר נשלחו (לא ניתן להחזיר).';
        }
        if (actionBtn && actionBtn.parentNode) actionBtn.parentNode.removeChild(actionBtn);
        setTimeout(_dismissActive, 6000);
      },
      autoDismissMs: 90000,
    });
  }

  window.CrmBroadcastCancel = { showCancelToast: showCancelToast, cancelByRunId: cancelByRunId };
})();
