// =============================================================================
// activity-logger.js — System-level event log (Module 1.5, Phase 3)
// =============================================================================
// Global: ActivityLog object with write/warning/error/critical
// Dependencies: getTenantId() from shared.js, getCurrentEmployee() from auth-service.js
// Optional: DB (from supabase-client.js) — falls back to sb.from() if unavailable
// Always silent, async, non-blocking. Failed writes never crash the app.
// =============================================================================

const ActivityLog = (function () {

  // ---------------------------------------------------------------------------
  // Internal: resolve session context
  // ---------------------------------------------------------------------------
  function _getContext() {
    var tid = typeof getTenantId === 'function' ? getTenantId() : null;
    var emp = typeof getCurrentEmployee === 'function' ? getCurrentEmployee() : null;
    return {
      tenant_id: tid,
      user_id: emp ? emp.id : null,
      branch_id: emp ? (emp.branch_id || null) : null
    };
  }

  // ---------------------------------------------------------------------------
  // Internal: write a log entry (fire-and-forget)
  // ---------------------------------------------------------------------------
  function _log(level, config) {
    if (!config || !config.action || !config.entity_type) {
      console.warn('[ActivityLog] missing required fields: action, entity_type');
      return;
    }

    var ctx = _getContext();
    if (!ctx.tenant_id) {
      console.warn('[ActivityLog] no tenant_id — skipping log');
      return;
    }

    var row = {
      tenant_id: ctx.tenant_id,
      user_id: ctx.user_id,
      branch_id: ctx.branch_id,
      level: level,
      action: config.action,
      entity_type: config.entity_type,
      entity_id: config.entity_id || null,
      details: config.details || {}
    };

    // Fire and forget — use DB.insert if available, else sb.from() directly
    try {
      if (typeof DB !== 'undefined' && DB.insert) {
        DB.insert('activity_log', row, { silent: true }).catch(function (e) {
          console.warn('[ActivityLog] write failed:', e);
        });
      } else if (typeof sb !== 'undefined') {
        sb.from('activity_log').insert(row).then(function (res) {
          if (res.error) console.warn('[ActivityLog] write failed:', res.error.message);
        }).catch(function (e) {
          console.warn('[ActivityLog] write failed:', e);
        });
      } else {
        console.warn('[ActivityLog] no DB client available');
      }
    } catch (e) {
      console.warn('[ActivityLog] write failed:', e);
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  return {
    write: function (config) {
      var level = (config && config.level) || 'info';
      _log(level, config);
    },
    warning: function (config) {
      _log('warning', config);
    },
    error: function (config) {
      _log('error', config);
    },
    critical: function (config) {
      _log('critical', config);
    }
  };

})();
