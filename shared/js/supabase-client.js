// supabase-client.js — Unified Supabase wrapper (Module 1.5, Phase 3)

const DB = (function () {

  // --- Spinner ---
  let _spinnerEl = null;
  let _spinnerTimer = null;
  let _activeCount = 0;
  const SPINNER_DEBOUNCE = 200;

  function _injectSpinnerCSS() {
    if (document.getElementById('db-spinner-style')) return;
    const style = document.createElement('style');
    style.id = 'db-spinner-style';
    style.textContent =
      '#db-spinner-overlay{position:fixed;inset:0;background:rgba(0,0,0,.25);' +
      'display:flex;align-items:center;justify-content:center;z-index:99999;opacity:0;' +
      'transition:opacity .15s}' +
      '#db-spinner-overlay.visible{opacity:1}' +
      '#db-spinner-ring{width:40px;height:40px;border:4px solid rgba(255,255,255,.3);' +
      'border-top-color:#fff;border-radius:50%;animation:db-spin .7s linear infinite}' +
      '@keyframes db-spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(style);
  }

  function _showSpinner() {
    _injectSpinnerCSS();
    if (!_spinnerEl) {
      _spinnerEl = document.createElement('div');
      _spinnerEl.id = 'db-spinner-overlay';
      _spinnerEl.innerHTML = '<div id="db-spinner-ring"></div>';
      document.body.appendChild(_spinnerEl);
    }
    _spinnerEl.style.display = 'flex';
    requestAnimationFrame(function () {
      if (_spinnerEl) _spinnerEl.classList.add('visible');
    });
  }

  function _hideSpinner() {
    if (_spinnerEl) {
      _spinnerEl.classList.remove('visible');
      setTimeout(function () {
        if (_spinnerEl && !_spinnerEl.classList.contains('visible')) {
          _spinnerEl.style.display = 'none';
        }
      }, 150);
    }
  }

  function _spinnerStart(silent) {
    if (silent) return;
    _activeCount++;
    if (_activeCount === 1) {
      _spinnerTimer = setTimeout(_showSpinner, SPINNER_DEBOUNCE);
    }
  }

  function _spinnerEnd(silent) {
    if (silent) return;
    _activeCount = Math.max(0, _activeCount - 1);
    if (_activeCount === 0) {
      clearTimeout(_spinnerTimer);
      _spinnerTimer = null;
      _hideSpinner();
    }
  }

  // --- Error handling ---
  function _reportError(message, originalError, silent) {
    if (silent) return;
    if (typeof Toast !== 'undefined' && Toast.error) {
      Toast.error(message);
    } else {
      console.error('[DB]', message, originalError);
    }
  }

  function _classifyError(error) {
    if (!error) return null;
    var code = error.code || '';
    var msg = error.message || '';
    if (code === '42501' || msg.indexOf('row-level security') !== -1) {
      return 'אין גישה לנתונים אלו';
    }
    if (msg.indexOf('Failed to fetch') !== -1 || msg.indexOf('NetworkError') !== -1 ||
        msg.indexOf('ERR_NETWORK') !== -1) {
      return 'בעיית תקשורת — נסה שוב';
    }
    if (code === '23505') {
      return 'רשומה כזו כבר קיימת';
    }
    return 'שגיאה: ' + msg;
  }

  // --- Tenant helper ---
  function _tid() {
    return typeof getTenantId === 'function' ? getTenantId() : null;
  }

  // --- DB.select ---
  async function select(table, filters, options) {
    var opts = options || {};
    var silent = opts.silent === true;
    _spinnerStart(silent);
    try {
      var cols = opts.columns || '*';
      var query = sb.from(table).select(cols, opts.count ? { count: opts.count } : undefined);

      // Auto tenant filter
      var tid = _tid();
      if (tid) query = query.eq('tenant_id', tid);

      // Simple key-value filters
      if (filters) {
        for (var key in filters) {
          if (Object.prototype.hasOwnProperty.call(filters, key)) {
            query = query.eq(key, filters[key]);
          }
        }
      }

      // Complex filters escape hatch
      if (typeof opts.rawFilters === 'function') {
        query = opts.rawFilters(query);
      }

      // Ordering
      if (opts.order) {
        var parts = opts.order.split('.');
        var col = parts[0];
        var asc = parts[1] !== 'desc';
        query = query.order(col, { ascending: asc });
      }

      // Pagination
      if (typeof opts.limit === 'number') {
        var offset = opts.offset || 0;
        query = query.range(offset, offset + opts.limit - 1);
      }

      // Single row
      if (opts.single) query = query.single();

      var result = await query;
      if (result.error) {
        _reportError(_classifyError(result.error), result.error, silent);
        return { data: null, error: result.error, count: null };
      }

      // Not-found for single row queries
      if (opts.single && result.data === null) {
        _reportError('הרשומה לא נמצאה', null, silent);
        return { data: null, error: { message: 'not_found' }, count: null };
      }

      return { data: result.data, error: null, count: result.count ?? null };
    } catch (e) {
      _reportError(_classifyError(e), e, silent);
      return { data: null, error: e, count: null };
    } finally {
      _spinnerEnd(silent);
    }
  }

  // --- DB.insert ---
  async function insert(table, data, options) {
    var opts = options || {};
    var silent = opts.silent === true;
    _spinnerStart(silent);
    try {
      var tid = _tid();
      var isArray = Array.isArray(data);
      var rows = isArray ? data : [data];

      // Auto-inject tenant_id
      if (tid) {
        rows = rows.map(function (r) { return Object.assign({}, r, { tenant_id: tid }); });
      }

      var returning = opts.returning || '*';
      var allData = [];
      var CHUNK = 100;

      for (var i = 0; i < rows.length; i += CHUNK) {
        var batch = rows.slice(i, i + CHUNK);
        var query = sb.from(table).insert(batch).select(returning);
        if (opts.onConflict) {
          query = sb.from(table).upsert(batch, { onConflict: opts.onConflict }).select(returning);
        }
        var result = await query;
        if (result.error) {
          _reportError(_classifyError(result.error), result.error, silent);
          return { data: null, error: result.error };
        }
        if (result.data) allData.push.apply(allData, result.data);
      }

      return { data: isArray ? allData : (allData[0] || null), error: null };
    } catch (e) {
      _reportError(_classifyError(e), e, silent);
      return { data: null, error: e };
    } finally {
      _spinnerEnd(silent);
    }
  }

  // --- DB.update ---
  async function update(table, id, changes, options) {
    var opts = options || {};
    var silent = opts.silent === true;
    var idColumn = opts.idColumn || 'id';
    var returning = opts.returning || '*';
    _spinnerStart(silent);
    try {
      var result = await sb.from(table)
        .update(changes)
        .eq(idColumn, id)
        .select(returning);

      if (result.error) {
        _reportError(_classifyError(result.error), result.error, silent);
        return { data: null, error: result.error };
      }
      return { data: result.data?.[0] || null, error: null };
    } catch (e) {
      _reportError(_classifyError(e), e, silent);
      return { data: null, error: e };
    } finally {
      _spinnerEnd(silent);
    }
  }

  // --- DB.batchUpdate ---
  async function batchUpdate(table, records, options) {
    var opts = options || {};
    var silent = opts.silent === true;
    if (!records || !records.length) return { data: [], error: null };
    _spinnerStart(silent);
    try {
      var idColumn = opts.idColumn || 'id';
      var returning = opts.returning || '*';
      var allData = [];

      for (var i = 0; i < records.length; i++) {
        var rec = records[i];
        var id = rec[idColumn];
        if (!id) {
          var err = { message: 'batchUpdate: record at index ' + i + ' missing ' + idColumn };
          _reportError(_classifyError(err), err, silent);
          return { data: allData, error: err };
        }
        var changes = Object.assign({}, rec);
        delete changes[idColumn];
        var result = await sb.from(table)
          .update(changes)
          .eq(idColumn, id)
          .select(returning);
        if (result.error) {
          _reportError(_classifyError(result.error), result.error, silent);
          return { data: allData, error: result.error };
        }
        if (result.data?.[0]) allData.push(result.data[0]);
      }

      return { data: allData, error: null };
    } catch (e) {
      _reportError(_classifyError(e), e, silent);
      return { data: [], error: e };
    } finally {
      _spinnerEnd(silent);
    }
  }

  // --- DB.softDelete ---
  async function softDelete(table, id, options) {
    return update(table, id, { is_deleted: true }, options);
  }

  // --- DB.hardDelete ---
  async function hardDelete(table, id, options) {
    var opts = options || {};
    var silent = opts.silent === true;
    var idColumn = opts.idColumn || 'id';
    _spinnerStart(silent);
    try {
      var result = await sb.from(table)
        .delete()
        .eq(idColumn, id)
        .select('*');
      if (result.error) {
        _reportError(_classifyError(result.error), result.error, silent);
        return { data: null, error: result.error };
      }
      return { data: result.data?.[0] || null, error: null };
    } catch (e) {
      _reportError(_classifyError(e), e, silent);
      return { data: null, error: e };
    } finally {
      _spinnerEnd(silent);
    }
  }

  // --- DB.rpc ---
  async function rpc(functionName, params, options) {
    var opts = options || {};
    var silent = opts.silent === true;
    _spinnerStart(silent);
    try {
      var result = await sb.rpc(functionName, params || {});
      if (result.error) {
        _reportError(_classifyError(result.error), result.error, silent);
        return { data: null, error: result.error };
      }
      return { data: result.data, error: null };
    } catch (e) {
      _reportError(_classifyError(e), e, silent);
      return { data: null, error: e };
    } finally {
      _spinnerEnd(silent);
    }
  }

  // --- Public API ---
  return {
    select: select,
    insert: insert,
    update: update,
    batchUpdate: batchUpdate,
    softDelete: softDelete,
    hardDelete: hardDelete,
    rpc: rpc
  };

})();
