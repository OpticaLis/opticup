/* =============================================================================
   crm-lead-modals.js — CRM lead UI flows (modals + dropdowns) (P3a split)
   Load order: AFTER crm-lead-actions.js (relies on window.CrmLeadActions writes).
   Uses Modal, Toast, CrmHelpers, TIER1_STATUSES/TIER2_STATUSES, CRM_STATUSES.
   Extends window.CrmLeadActions with:
     openStatusDropdown, closeStatusDropdown, openBulkStatusPicker,
     openCreateLeadModal.
   No DB writes live here — they all call through window.CrmLeadActions.*.
   ============================================================================= */
(function () {
  'use strict';

  // ---- Individual status dropdown (anchored to a DOM element) ----

  function closeStatusDropdown() {
    var existing = document.getElementById('crm-status-dropdown');
    if (existing) existing.remove();
  }

  function openStatusDropdown(anchorEl, tier, currentStatus, onPick) {
    closeStatusDropdown();
    var tierStatuses = (tier === 2) ? (window.TIER2_STATUSES || []) : (window.TIER1_STATUSES || []);
    var labels = (window.CRM_STATUSES && window.CRM_STATUSES.lead) || {};
    var menu = document.createElement('div');
    menu.id = 'crm-status-dropdown';
    menu.className = 'bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[220px]';
    menu.style.position = 'fixed';
    menu.style.zIndex = '9999';

    var rows = 0;
    tierStatuses.forEach(function (slug) {
      if (slug === currentStatus) return;
      var info = labels[slug];
      if (!info) return;
      rows++;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'w-full text-start px-3 py-2 text-sm hover:bg-indigo-50 flex items-center gap-2 text-slate-700';
      btn.innerHTML =
        '<span class="w-2 h-2 rounded-full shrink-0" style="background:' +
          escapeHtml(info.color || '#9ca3af') + '"></span>' +
        '<span>' + escapeHtml(info.name_he || slug) + '</span>';
      btn.addEventListener('click', function () {
        closeStatusDropdown();
        if (typeof onPick === 'function') onPick(slug);
      });
      menu.appendChild(btn);
    });
    if (!rows) {
      var empty = document.createElement('div');
      empty.className = 'px-3 py-2 text-sm text-slate-500';
      empty.textContent = 'אין סטטוסים זמינים';
      menu.appendChild(empty);
    }

    var r = anchorEl.getBoundingClientRect();
    menu.style.top = (r.bottom + 4) + 'px';
    menu.style.insetInlineStart = r.left + 'px';
    document.body.appendChild(menu);

    setTimeout(function () {
      document.addEventListener('click', function onDoc(e) {
        if (!menu.contains(e.target)) {
          closeStatusDropdown();
          document.removeEventListener('click', onDoc);
        }
      });
    }, 50);
  }

  // ---- Bulk status picker (modal) ----

  function openBulkStatusPicker(leadIds, tier, onDone) {
    if (!leadIds || !leadIds.length) return;
    if (typeof Modal === 'undefined') return;

    var tierStatuses = (tier === 2) ? (window.TIER2_STATUSES || []) : (window.TIER1_STATUSES || []);
    var labels = (window.CRM_STATUSES && window.CRM_STATUSES.lead) || {};

    var btnsHtml = tierStatuses.map(function (slug) {
      var info = labels[slug];
      if (!info) return '';
      return '<button type="button" class="px-3 py-2 border border-slate-200 rounded-lg text-sm hover:bg-indigo-50 hover:border-indigo-300 flex items-center gap-2 text-slate-700" data-pick-status="' + escapeHtml(slug) + '">' +
        '<span class="w-2 h-2 rounded-full shrink-0" style="background:' + escapeHtml(info.color || '#9ca3af') + '"></span>' +
        '<span>' + escapeHtml(info.name_he || slug) + '</span>' +
      '</button>';
    }).filter(Boolean).join('');

    var body =
      '<div class="space-y-3">' +
        '<p class="text-sm text-slate-700">בחר סטטוס חדש עבור <strong>' + leadIds.length + '</strong> לידים:</p>' +
        '<div class="grid grid-cols-2 gap-2">' + btnsHtml + '</div>' +
      '</div>';

    var modal = Modal.show({
      title: 'שינוי סטטוס',
      size: 'sm',
      content: body
    });

    modal.el.querySelectorAll('[data-pick-status]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var slug = btn.getAttribute('data-pick-status');
        modal.el.querySelectorAll('[data-pick-status]').forEach(function (b) { b.disabled = true; });
        btn.textContent = 'מעדכן...';
        try {
          var res = await window.CrmLeadActions.bulkChangeStatus(leadIds, slug);
          if (typeof modal.close === 'function') modal.close();
          if (window.Toast) {
            var msg = 'עודכנו ' + res.ok + ' מתוך ' + leadIds.length + ' לידים';
            if (res.fail.length) msg += ' · ' + res.fail.length + ' נכשלו';
            (res.fail.length ? Toast.warning : Toast.success)(msg);
          }
          if (typeof onDone === 'function') onDone(res);
        } catch (e) {
          if (window.Toast) Toast.error('שגיאה: ' + (e.message || String(e)));
          modal.el.querySelectorAll('[data-pick-status]').forEach(function (b) { b.disabled = false; });
          btn.textContent = labels[slug] && labels[slug].name_he || slug;
        }
      });
    });
  }

  // ---- Create-lead modal (manual entry) ----

  function openCreateLeadModal(onCreated) {
    if (typeof Modal === 'undefined') return;

    var body =
      '<div class="space-y-3">' +
        '<div>' +
          '<label class="block text-sm font-medium text-slate-700 mb-1">שם מלא <span class="text-rose-500">*</span></label>' +
          '<input type="text" id="crm-new-lead-name" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required>' +
        '</div>' +
        '<div>' +
          '<label class="block text-sm font-medium text-slate-700 mb-1">טלפון <span class="text-rose-500">*</span></label>' +
          '<input type="tel" id="crm-new-lead-phone" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required>' +
        '</div>' +
        '<div>' +
          '<label class="block text-sm font-medium text-slate-700 mb-1">אימייל <span class="text-rose-500">*</span></label>' +
          '<input type="email" id="crm-new-lead-email" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required>' +
        '</div>' +
        '<div>' +
          '<label class="block text-sm font-medium text-slate-700 mb-1">עיר</label>' +
          '<input type="text" id="crm-new-lead-city" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">' +
        '</div>' +
        '<div>' +
          '<label class="block text-sm font-medium text-slate-700 mb-1">שפה</label>' +
          '<select id="crm-new-lead-language" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">' +
            '<option value="he" selected>עברית</option>' +
            '<option value="en">English</option>' +
            '<option value="ru">Русский</option>' +
          '</select>' +
        '</div>' +
        '<div>' +
          '<label class="block text-sm font-medium text-slate-700 mb-1">הערות</label>' +
          '<textarea id="crm-new-lead-notes" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" rows="2"></textarea>' +
        '</div>' +
      '</div>';

    var footerHtml =
      '<button type="button" id="crm-new-lead-cancel" class="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50 transition">ביטול</button>' +
      '<button type="button" id="crm-new-lead-submit" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition shadow-sm">הוסף ליד</button>';

    var modal = Modal.show({
      title: 'הוספת ליד חדש',
      size: 'sm',
      content: body,
      footer: footerHtml
    });

    setTimeout(function () {
      var nameInput = modal.el.querySelector('#crm-new-lead-name');
      if (nameInput) nameInput.focus();
    }, 50);

    var cancelBtn = modal.el.querySelector('#crm-new-lead-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function () {
        if (typeof modal.close === 'function') modal.close();
      });
    }

    var submitBtn = modal.el.querySelector('#crm-new-lead-submit');
    submitBtn.addEventListener('click', async function () {
      var nameVal = (modal.el.querySelector('#crm-new-lead-name').value || '').trim();
      var phoneVal = (modal.el.querySelector('#crm-new-lead-phone').value || '').trim();
      var emailVal = (modal.el.querySelector('#crm-new-lead-email').value || '').trim();
      if (!nameVal || !phoneVal || !emailVal) {
        if (window.Toast) Toast.warning('שם, טלפון ואימייל חובה');
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = 'מוסיף...';
      try {
        var res = await window.CrmLeadActions.createManualLead({
          full_name: nameVal,
          phone: phoneVal,
          email: emailVal,
          city: modal.el.querySelector('#crm-new-lead-city').value,
          language: modal.el.querySelector('#crm-new-lead-language').value,
          notes: modal.el.querySelector('#crm-new-lead-notes').value
        });
        if (res && res.invalidPhone) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'הוסף ליד';
          if (window.Toast) Toast.warning('מספר טלפון לא תקין — נא להזין בפורמט 05X-XXXXXXX או +972...');
          return;
        }
        if (res && res.duplicate) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'הוסף ליד';
          if (window.Toast) {
            Toast.warning('ליד עם מספר טלפון זה כבר קיים: ' + (res.existingLead.full_name || ''));
          }
          return;
        }
        if (typeof modal.close === 'function') modal.close();
        if (window.Toast) Toast.success('ליד נוסף — ממתין לאישור תקנון');
        if (typeof onCreated === 'function') onCreated(res);
      } catch (e) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'הוסף ליד';
        if (window.Toast) Toast.error('שגיאה: ' + (e.message || String(e)));
      }
    });
  }

  // ---- Edit-lead modal ----

  function openEditLeadModal(lead, onSaved) {
    if (!lead || typeof Modal === 'undefined') return;

    function langOpt(code, labelHe) {
      var sel = (lead.language || 'he') === code ? ' selected' : '';
      return '<option value="' + code + '"' + sel + '>' + labelHe + '</option>';
    }

    var body =
      '<div class="space-y-3">' +
        '<div>' +
          '<label class="block text-sm font-medium text-slate-700 mb-1">שם מלא <span class="text-rose-500">*</span></label>' +
          '<input type="text" id="crm-edit-lead-name" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required value="' + escapeHtml(lead.full_name || '') + '">' +
        '</div>' +
        '<div>' +
          '<label class="block text-sm font-medium text-slate-700 mb-1">טלפון <span class="text-rose-500">*</span></label>' +
          '<input type="tel" id="crm-edit-lead-phone" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required value="' + escapeHtml(lead.phone || '') + '">' +
        '</div>' +
        '<div>' +
          '<label class="block text-sm font-medium text-slate-700 mb-1">אימייל <span class="text-rose-500">*</span></label>' +
          '<input type="email" id="crm-edit-lead-email" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required value="' + escapeHtml(lead.email || '') + '">' +
        '</div>' +
        '<div>' +
          '<label class="block text-sm font-medium text-slate-700 mb-1">עיר</label>' +
          '<input type="text" id="crm-edit-lead-city" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value="' + escapeHtml(lead.city || '') + '">' +
        '</div>' +
        '<div>' +
          '<label class="block text-sm font-medium text-slate-700 mb-1">שפה</label>' +
          '<select id="crm-edit-lead-language" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">' +
            langOpt('he', 'עברית') + langOpt('en', 'English') + langOpt('ru', 'Русский') +
          '</select>' +
        '</div>' +
        '<div>' +
          '<label class="block text-sm font-medium text-slate-700 mb-1">הערות</label>' +
          '<textarea id="crm-edit-lead-notes" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" rows="2">' + escapeHtml(lead.client_notes || '') + '</textarea>' +
        '</div>' +
      '</div>';

    var footerHtml =
      '<button type="button" id="crm-edit-lead-cancel" class="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50 transition">ביטול</button>' +
      '<button type="button" id="crm-edit-lead-submit" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition shadow-sm">שמור</button>';

    var modal = Modal.show({
      title: 'עריכת ליד',
      size: 'sm',
      content: body,
      footer: footerHtml
    });

    var cancelBtn = modal.el.querySelector('#crm-edit-lead-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', function () {
      if (typeof modal.close === 'function') modal.close();
    });

    var submitBtn = modal.el.querySelector('#crm-edit-lead-submit');
    submitBtn.addEventListener('click', async function () {
      var nameVal = (modal.el.querySelector('#crm-edit-lead-name').value || '').trim();
      var phoneVal = (modal.el.querySelector('#crm-edit-lead-phone').value || '').trim();
      var emailVal = (modal.el.querySelector('#crm-edit-lead-email').value || '').trim();
      if (!nameVal || !phoneVal || !emailVal) {
        if (window.Toast) Toast.warning('שם, טלפון ואימייל חובה');
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = 'שומר...';
      try {
        var updated = await window.CrmLeadActions.updateLead(lead.id, {
          full_name: nameVal,
          phone: phoneVal,
          email: emailVal,
          city: modal.el.querySelector('#crm-edit-lead-city').value,
          language: modal.el.querySelector('#crm-edit-lead-language').value,
          client_notes: modal.el.querySelector('#crm-edit-lead-notes').value
        });
        if (updated && updated.invalidPhone) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'שמור';
          if (window.Toast) Toast.warning('מספר טלפון לא תקין — נא להזין בפורמט 05X-XXXXXXX או +972...');
          return;
        }
        if (updated && updated.duplicate) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'שמור';
          if (window.Toast) {
            Toast.warning('ליד אחר כבר רשום עם מספר טלפון זה: ' + (updated.existingLead.full_name || ''));
          }
          return;
        }
        if (typeof modal.close === 'function') modal.close();
        if (window.Toast) Toast.success('הליד עודכן');
        if (typeof onSaved === 'function') onSaved(updated);
      } catch (e) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'שמור';
        if (window.Toast) Toast.error('שגיאה: ' + (e.message || String(e)));
      }
    });
  }

  window.CrmLeadActions = window.CrmLeadActions || {};
  window.CrmLeadActions.openStatusDropdown = openStatusDropdown;
  window.CrmLeadActions.closeStatusDropdown = closeStatusDropdown;
  window.CrmLeadActions.openBulkStatusPicker = openBulkStatusPicker;
  window.CrmLeadActions.openCreateLeadModal = openCreateLeadModal;
  window.CrmLeadActions.openEditLeadModal = openEditLeadModal;
})();
