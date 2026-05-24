/* rx-center.js — M6 Prescription Editor center layout + context bar + lifecycle actions */
(function () {
  'use strict';

  var STATUS_MSG = {
    draft: 'המרשם פתוח לעריכה. שמירה אוטומטית פעילה. לחץ "סגור מרשם" כשהאופטומטריסט מאשר.',
    committed: 'מרשם סגור ומאושר. לקריאה בלבד.',
    expired: 'מרשם פג תוקף. לקריאה בלבד.',
    cancelled: 'מרשם בוטל.',
    superseded: 'מרשם ישן — הוחלף בגרסה חדשה.'
  };

  function renderContextBar(rx) {
    var s = rx.status || 'draft';
    var cls = s === 'committed' ? ' committed' : (s === 'expired' || s === 'superseded') ? ' expired' : '';
    var isDraft = s === 'draft';
    var html =
      '<div class="rx-ctx-bar' + cls + '">' +
        '<div class="left">' +
          '<span class="badge badge-' + escapeHtml(s) + '">' + escapeHtml(s.toUpperCase()) + '</span>' +
          '<span class="info">' + escapeHtml(STATUS_MSG[s] || '') + '</span>' +
        '</div>' +
        '<div class="right">';
    if (isDraft) {
      html += '<button id="rx-clone-btn">שכפל מרשם קודם</button>';
      html += '<button class="danger" id="rx-cancel-btn">בטל מרשם</button>';
      html += '<button class="cta" id="rx-commit-btn">סגור מרשם →</button>';
    } else if (s === 'committed') {
      html += '<button id="rx-clone-btn">שכפל</button>';
    }
    html += '</div></div>';
    return html;
  }

  function bindContextActions(rx) {
    var commitBtn = document.getElementById('rx-commit-btn');
    var cancelBtn = document.getElementById('rx-cancel-btn');
    var cloneBtn = document.getElementById('rx-clone-btn');

    if (commitBtn) {
      commitBtn.addEventListener('click', async function () {
        var res = await DB.rpc('commit_prescription', {
          p_tenant_id: getTenantId(),
          p_prescription_id: rx.id,
          p_kind: window.RxEditor.state.kind
        }, { silent: true });
        if (res.error) { Toast.error('סגירה נכשלה: ' + (res.error.message || '')); return; }
        Toast.success('המרשם נסגר בהצלחה.');
        window.RxEditor.trace('commit_prescription', { id: rx.id });
        window.RxEditor.refresh();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', async function () {
        var res = await DB.rpc('cancel_draft_prescription', {
          p_tenant_id: getTenantId(),
          p_prescription_id: rx.id,
          p_kind: window.RxEditor.state.kind
        }, { silent: true });
        if (res.error) { Toast.error('ביטול נכשל: ' + (res.error.message || '')); return; }
        Toast.success('המרשם בוטל.');
        window.RxEditor.trace('cancel_prescription', { id: rx.id });
        window.RxEditor.state.prescriptionId = null;
        window.RxEditor.refresh();
      });
    }

    if (cloneBtn) {
      cloneBtn.addEventListener('click', async function () {
        var res = await DB.rpc('clone_prescription', {
          p_tenant_id: getTenantId(),
          p_source_id: rx.id,
          p_kind: window.RxEditor.state.kind
        }, { silent: true });
        if (res.error) { Toast.error('שכפול נכשל: ' + (res.error.message || '')); return; }
        Toast.success('מרשם שוכפל (טיוטה חדשה).');
        window.RxEditor.trace('clone_prescription', { source_id: rx.id, new_id: res.data });
        await window.RxSidebar.load();
        if (res.data) window.RxEditor.selectPrescription(res.data);
      });
    }
  }

  function render(rx) {
    var container = document.getElementById('rx-center');
    var S = window.RxEditor.state;
    var isDraft = rx.status === 'draft';
    var readOnly = !isDraft;

    var html = renderContextBar(rx);

    if (S.kind === 'glasses') {
      html += window.RxMetaGrid.render(rx, readOnly);
      html += window.RxParamTable.render(rx, readOnly);
      html += window.RxAddBlock.render(rx, readOnly);
      html += window.RxSecondary.render(rx, readOnly);
      html += window.RxNotes.render(rx, readOnly);
    } else {
      html += window.RxMetaGrid.renderContacts(rx, readOnly);
      html += window.RxContactsParams.render(rx, readOnly);
      html += window.RxContactsSecondary.render(rx, readOnly);
      html += window.RxNotes.render(rx, readOnly);
    }

    container.innerHTML = html;
    bindContextActions(rx);

    if (S.kind === 'glasses') {
      window.RxMetaGrid.mount(rx, readOnly);
      window.RxParamTable.mount(rx, readOnly);
      window.RxAddBlock.mount(rx, readOnly);
      window.RxSecondary.mount(rx, readOnly);
    } else {
      window.RxMetaGrid.mountContacts(rx, readOnly);
      window.RxContactsParams.mount(rx, readOnly);
      window.RxContactsSecondary.mount(rx, readOnly);
    }
    window.RxNotes.mount(rx, readOnly);
  }

  function renderEmpty() {
    var container = document.getElementById('rx-center');
    container.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-tertiary);font-size:13px;">' +
        'בחר מרשם מהרשימה או צור חדש.' +
      '</div>';
  }

  window.RxCenter = { render: render, renderEmpty: renderEmpty };
})();
