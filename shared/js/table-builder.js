/* table-builder.js — Shared Table Builder for Optic Up
   Renders managed tables with sort, empty state, loading skeleton, row updates.
   Deps: table.css (required). Soft dep on escapeHtml() from shared.js (has fallback).
   Zero deps on DB.*, Modal, Toast, ActivityLog, PermissionUI. */

(function () {
  'use strict';

  // Escape helper (fallback if shared.js not loaded)
  function _esc(str) {
    if (typeof escapeHtml === 'function') return escapeHtml(str);
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function _safe(v) { return v == null ? '' : v; }

  // Built-in type renderers — return PLAIN TEXT (assigned via textContent, not innerHTML)
  const _renderers = {
    text(v) { return _safe(v); },
    number(v) {
      if (v == null || v === '') return '';
      return Number(v).toLocaleString('he-IL');
    },
    currency(v) {
      if (v == null || v === '') return '';
      return Number(v).toLocaleString('he-IL', { style: 'currency', currency: 'ILS' });
    },
    date(v) {
      if (!v) return '';
      const d = new Date(v);
      if (isNaN(d)) return String(v);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return `${dd}/${mm}/${d.getFullYear()}`;
    }
  };

  const _endTypes = { number: true, currency: true };

  // TableBuilder.create(config) → TableInstance
  function create(config) {
    if (!config || !config.containerId || !config.columns) {
      throw new Error('TableBuilder: containerId and columns are required');
    }

    const container = document.getElementById(config.containerId);
    if (!container) throw new Error('TableBuilder: container #' + config.containerId + ' not found');

    const cols = config.columns;
    const rowIdField = config.rowId || 'id';
    const skeletonCount = config.skeletonRows || 5;
    const emptyConf = config.emptyState || null;
    const onSort = config.onSort || null;
    const onRowClick = config.onRowClick || null;
    const sticky = config.stickyHeader || false;

    let _data = [];          // current row data
    let _loading = false;
    let _sortKey = null;
    let _sortDir = null;     // 'asc' | 'desc' | null
    let _destroyed = false;

    // --- Build wrapper + table shell ---
    const wrapper = document.createElement('div');
    wrapper.className = 'tb-wrapper' + (sticky ? ' tb-wrapper-sticky' : '');

    const table = document.createElement('table');
    table.className = 'tb-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.className = 'tb-header';

    // --- Build header cells ---
    const thEls = {};  // key → th element
    cols.forEach(col => {
      const th = document.createElement('th');
      th.className = 'tb-th';
      th.textContent = col.label || '';
      if (col.width) th.style.width = col.width;

      if (col.sortable && col.type !== 'actions') {
        th.classList.add('tb-th-sortable');
        th.addEventListener('click', () => _handleSort(col.key));
      }

      thEls[col.key] = th;
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    wrapper.appendChild(table);

    // Content area for empty/loading states (outside <table>)
    const stateArea = document.createElement('div');
    stateArea.style.display = 'none';
    wrapper.appendChild(stateArea);

    container.innerHTML = '';
    container.appendChild(wrapper);

    // ===================== Sort =====================
    function _handleSort(key) {
      if (!onSort) return;
      if (_sortKey === key) {
        _sortDir = _sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        _sortKey = key;
        _sortDir = 'asc';
      }
      _updateSortUI();
      onSort(key, _sortDir);
    }

    function _updateSortUI() {
      Object.keys(thEls).forEach(k => {
        const th = thEls[k];
        th.classList.remove('tb-th-sort-active');
        th.removeAttribute('data-sort-dir');
      });
      if (_sortKey && thEls[_sortKey]) {
        thEls[_sortKey].classList.add('tb-th-sort-active');
        thEls[_sortKey].setAttribute('data-sort-dir', _sortDir);
      }
    }

    // ===================== Render row =====================
    function _renderRow(row) {
      const tr = document.createElement('tr');
      tr.className = 'tb-row';
      const rid = row[rowIdField];
      if (rid != null) tr.setAttribute('data-row-id', rid);

      if (onRowClick) {
        tr.classList.add('tb-row-clickable');
        tr.addEventListener('click', (e) => {
          // Don't fire row click if user clicked a button/link inside actions
          if (e.target.closest('.tb-td-actions')) return;
          onRowClick(row, tr);
        });
      }

      cols.forEach(col => {
        const td = document.createElement('td');
        td.className = 'tb-td';
        if (col.cssClass) td.classList.add(col.cssClass);

        const val = row[col.key];
        const type = col.type || 'text';

        if (type === 'actions') {
          td.classList.add('tb-td-actions');
          td.innerHTML = col.render ? col.render(val, row) : '';
        } else if (col.render) {
          // Custom render overrides built-in type
          td.innerHTML = col.render(val, row);
        } else if (_renderers[type]) {
          if (_endTypes[type]) td.classList.add('tb-td-end');
          td.textContent = _renderers[type](val);
        } else {
          // badge, custom without render — textContent is auto-safe
          td.textContent = _safe(val);
        }

        if (col.width) td.style.width = col.width;
        tr.appendChild(td);
      });

      return tr;
    }

    // ===================== Render body =====================
    function _renderBody() {
      tbody.innerHTML = '';
      stateArea.style.display = 'none';
      table.style.display = '';

      if (_loading) {
        _showLoading();
        return;
      }

      if (_data.length === 0) {
        _showEmpty();
        return;
      }

      const frag = document.createDocumentFragment();
      _data.forEach(row => frag.appendChild(_renderRow(row)));
      tbody.appendChild(frag);
    }

    // ===================== Empty state =====================
    function _showEmpty() {
      tbody.innerHTML = '';
      if (!emptyConf) return;
      table.style.display = 'none';
      stateArea.style.display = '';
      let html = '<div class="tb-empty">';
      if (emptyConf.icon) html += '<div class="tb-empty-icon">' + _esc(emptyConf.icon) + '</div>';
      if (emptyConf.text) html += '<div class="tb-empty-text">' + _esc(emptyConf.text) + '</div>';
      if (emptyConf.cta) html += '<button class="tb-empty-cta" type="button">' + _esc(emptyConf.cta.label) + '</button>';
      html += '</div>';
      stateArea.innerHTML = html;
      if (emptyConf.cta && emptyConf.cta.onClick) {
        const btn = stateArea.querySelector('.tb-empty-cta');
        if (btn) btn.addEventListener('click', emptyConf.cta.onClick);
      }
    }

    // ===================== Loading state =====================
    function _showLoading() {
      tbody.innerHTML = '';
      table.style.display = 'none';
      stateArea.style.display = '';
      let html = '<div class="tb-loading">';
      for (let i = 0; i < skeletonCount; i++) {
        html += '<div class="tb-loading-row"></div>';
      }
      html += '</div>';
      stateArea.innerHTML = html;
    }

    // ===================== Find row index by id =====================
    function _findIdx(id) {
      return _data.findIndex(r => String(r[rowIdField]) === String(id));
    }

    // ===================== Public API =====================
    const instance = {
      setData(rows) {
        if (_destroyed) return;
        _data = Array.isArray(rows) ? rows.slice() : [];
        _loading = false;
        _renderBody();
      },

      setLoading(isLoading) {
        if (_destroyed) return;
        _loading = !!isLoading;
        _renderBody();
      },

      updateRow(rowId, newData) {
        if (_destroyed) return;
        const idx = _findIdx(rowId);
        if (idx === -1) return;
        _data[idx] = Object.assign({}, _data[idx], newData);
        // Re-render just that row
        const rows = tbody.querySelectorAll('tr.tb-row');
        if (rows[idx]) {
          const newTr = _renderRow(_data[idx]);
          rows[idx].replaceWith(newTr);
        }
      },

      removeRow(rowId) {
        if (_destroyed) return;
        const idx = _findIdx(rowId);
        if (idx === -1) return;
        _data.splice(idx, 1);
        if (_data.length === 0) {
          _renderBody(); // triggers emptyState
        } else {
          const rows = tbody.querySelectorAll('tr.tb-row');
          if (rows[idx]) rows[idx].remove();
        }
      },

      getData() {
        return _data.slice();
      },

      destroy() {
        if (_destroyed) return;
        _destroyed = true;
        _data = [];
        container.innerHTML = '';
      }
    };

    // Initial render — empty state (no data yet)
    _renderBody();
    return instance;
  }

  // ==========================================================================
  // Global export
  // ==========================================================================
  window.TableBuilder = { create };
})();
