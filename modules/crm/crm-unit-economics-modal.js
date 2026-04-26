/* =============================================================================
   crm-unit-economics-modal.js — Settings modal for crm_unit_economics
   Lists all rows for current tenant with editable fields. Supports add/edit/delete.
   Every write includes tenant_id (Rule 22). Calls onSave() callback after save.
   Load order: after shared.js, crm-campaigns.js. Exposes window.CrmUnitEconomicsModal.
   ============================================================================= */
(function () {
  'use strict';

  function tid() { return (typeof getTenantId === 'function') ? getTenantId() : null; }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var _onSave = null;

  async function loadRows() {
    var tenantId = tid();
    if (!tenantId) return [];
    var res = await sb.from('crm_unit_economics')
      .select('id, event_type, gross_margin_pct, kill_multiplier, scaling_multiplier, updated_at')
      .eq('tenant_id', tenantId)
      .order('event_type');
    if (res.error) throw new Error('unit_economics load: ' + res.error.message);
    return res.data || [];
  }

  function rowHTML(r, idx) {
    var rid = r.id || '';
    return '<tr class="border-b border-slate-100" data-row-id="' + rid + '" data-row-idx="' + idx + '">' +
      '<td class="px-3 py-2"><input type="text" class="ue-event-type w-full px-2 py-1 border border-slate-300 rounded text-sm" value="' + escapeHtml(r.event_type || '') + '" placeholder="SuperSale"></td>' +
      '<td class="px-3 py-2"><input type="number" step="0.01" class="ue-gm w-20 px-2 py-1 border border-slate-300 rounded text-sm text-end" value="' + escapeHtml(r.gross_margin_pct ?? '') + '"></td>' +
      '<td class="px-3 py-2"><input type="number" step="0.01" class="ue-kill w-16 px-2 py-1 border border-slate-300 rounded text-sm text-end" value="' + escapeHtml(r.kill_multiplier ?? '') + '"></td>' +
      '<td class="px-3 py-2"><input type="number" step="0.01" class="ue-scale w-16 px-2 py-1 border border-slate-300 rounded text-sm text-end" value="' + escapeHtml(r.scaling_multiplier ?? '') + '"></td>' +
      '<td class="px-3 py-2 text-end">' +
        (rid ? '<button class="ue-delete text-rose-600 hover:bg-rose-50 px-2 py-1 rounded text-xs">מחק</button>' :
               '<span class="text-xs text-emerald-700">חדש</span>') +
      '</td>' +
    '</tr>';
  }

  function buildHTML(rows) {
    return '<div class="bg-indigo-700 text-white px-6 py-4 flex items-start justify-between">' +
        '<div>' +
          '<div class="text-xs uppercase tracking-wider opacity-90">⚙️ Unit Economics</div>' +
          '<h3 class="text-lg font-bold mt-1">הגדרות כלכלה ליחידת אירוע</h3>' +
          '<div class="text-sm opacity-90 mt-1">קובע את ספי STOP/SCALE לפי סוג אירוע</div>' +
        '</div>' +
        '<button id="ue-close" class="text-white hover:bg-white/20 rounded-md p-1 text-xl leading-none w-8 h-8">×</button>' +
      '</div>' +
      '<div class="p-6 max-h-[70vh] overflow-y-auto">' +
        '<table class="w-full text-sm" id="ue-table">' +
          '<thead class="bg-slate-100"><tr>' +
            '<th class="px-3 py-2 text-start font-semibold text-slate-700">סוג אירוע</th>' +
            '<th class="px-3 py-2 text-end font-semibold text-slate-700">Gross Margin %</th>' +
            '<th class="px-3 py-2 text-end font-semibold text-slate-700">Kill Mult.</th>' +
            '<th class="px-3 py-2 text-end font-semibold text-slate-700">Scale Mult.</th>' +
            '<th></th>' +
          '</tr></thead>' +
          '<tbody id="ue-tbody">' +
            rows.map(function (r, i) { return rowHTML(r, i); }).join('') +
          '</tbody>' +
        '</table>' +
        '<button id="ue-add" class="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-sm">+ הוסף סוג אירוע</button>' +
        '<div id="ue-error" class="mt-3 text-sm text-rose-700 hidden"></div>' +
      '</div>' +
      '<div class="px-6 pb-4 flex justify-end gap-2 border-t pt-4">' +
        '<button id="ue-cancel" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded text-sm">ביטול</button>' +
        '<button id="ue-save" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-semibold">שמור</button>' +
      '</div>';
  }

  function readForm() {
    var rows = [];
    document.querySelectorAll('#ue-tbody tr').forEach(function (tr) {
      var rid = tr.getAttribute('data-row-id') || null;
      var et = (tr.querySelector('.ue-event-type') || {}).value;
      var gm = (tr.querySelector('.ue-gm') || {}).value;
      var kill = (tr.querySelector('.ue-kill') || {}).value;
      var scale = (tr.querySelector('.ue-scale') || {}).value;
      if (!et || !et.trim()) return; // skip empty event_type
      rows.push({
        id: rid || null,
        event_type: et.trim(),
        gross_margin_pct: Number(gm),
        kill_multiplier: Number(kill),
        scaling_multiplier: Number(scale)
      });
    });
    return rows;
  }

  async function save() {
    var tenantId = tid();
    if (!tenantId) { showError('tenant_id missing'); return; }
    var rows = readForm();
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var bad = !isFinite(r.gross_margin_pct) || r.gross_margin_pct <= 0 ? 'Gross Margin %' :
                !isFinite(r.kill_multiplier) || r.kill_multiplier <= 0 ? 'Kill Multiplier' :
                !isFinite(r.scaling_multiplier) || r.scaling_multiplier <= 0 ? 'Scaling Multiplier' : null;
      if (bad) { showError(bad + ' חייב להיות מספר חיובי (' + r.event_type + ')'); return; }
    }

    var saveBtn = document.getElementById('ue-save');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'שומר…'; }

    try {
      for (var j = 0; j < rows.length; j++) {
        var r2 = rows[j];
        if (r2.id) {
          var upd = await sb.from('crm_unit_economics').update({
            event_type: r2.event_type,
            gross_margin_pct: r2.gross_margin_pct,
            kill_multiplier: r2.kill_multiplier,
            scaling_multiplier: r2.scaling_multiplier,
            updated_at: new Date().toISOString()
          }).eq('id', r2.id).eq('tenant_id', tenantId);
          if (upd.error) throw new Error('update ' + r2.event_type + ': ' + upd.error.message);
        } else {
          var ins = await sb.from('crm_unit_economics').insert({
            tenant_id: tenantId,
            event_type: r2.event_type,
            gross_margin_pct: r2.gross_margin_pct,
            kill_multiplier: r2.kill_multiplier,
            scaling_multiplier: r2.scaling_multiplier
          });
          if (ins.error) throw new Error('insert ' + r2.event_type + ': ' + ins.error.message);
        }
      }
      close();
      if (typeof _onSave === 'function') _onSave();
    } catch (e) {
      console.error('UE save failed:', e);
      showError(e.message || String(e));
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'שמור'; }
    }
  }

  async function deleteRow(rowId, trEl) {
    if (!rowId) { trEl.remove(); return; }
    if (!confirm('למחוק את הרשומה?')) return;
    var tenantId = tid();
    var res = await sb.from('crm_unit_economics').delete().eq('id', rowId).eq('tenant_id', tenantId);
    if (res.error) { showError('delete: ' + res.error.message); return; }
    trEl.remove();
  }

  function showError(msg) {
    var box = document.getElementById('ue-error');
    if (box) { box.textContent = msg; box.classList.remove('hidden'); }
  }

  async function open(onSaveCallback) {
    _onSave = onSaveCallback || null;
    close();
    var rows = [];
    try { rows = await loadRows(); } catch (e) { console.error(e); }

    var modal = document.createElement('div');
    modal.id = 'ue-modal';
    modal.className = 'fixed inset-0 z-[60] flex items-center justify-center p-4';
    modal.style.background = 'rgba(15,23,42,0.6)';
    modal.style.backdropFilter = 'blur(4px)';
    modal.innerHTML = '<div class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden">' + buildHTML(rows) + '</div>';
    document.body.appendChild(modal);

    document.getElementById('ue-close').addEventListener('click', close);
    document.getElementById('ue-cancel').addEventListener('click', close);
    document.getElementById('ue-save').addEventListener('click', save);
    document.getElementById('ue-add').addEventListener('click', function () {
      var tbody = document.getElementById('ue-tbody');
      var idx = tbody.children.length;
      tbody.insertAdjacentHTML('beforeend', rowHTML({ event_type: '', gross_margin_pct: '', kill_multiplier: '', scaling_multiplier: '' }, idx));
    });
    modal.addEventListener('click', function (e) {
      if (e.target === modal) close();
      var delBtn = e.target.closest('.ue-delete');
      if (delBtn) {
        var tr = delBtn.closest('tr');
        deleteRow(tr.getAttribute('data-row-id'), tr);
      }
    });
    document.addEventListener('keydown', escClose);
  }

  function close() {
    var m = document.getElementById('ue-modal');
    if (m) m.remove();
    document.removeEventListener('keydown', escClose);
  }

  function escClose(e) { if (e.key === 'Escape') close(); }

  window.CrmUnitEconomicsModal = { open: open, close: close };
})();
