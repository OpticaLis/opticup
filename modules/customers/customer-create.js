/* ============================================================
   M5 Customer Create-Mode — modal form wired to create_customer RPC.
   Dedup-safe: inspect response.created flag. On created=false (reason
   = phone_exists | id_number_exists) → surface the existing customer
   gracefully (no silent duplicate). On created=true → redirect to new card.
   ============================================================ */
(function () {
  'use strict';

  function trace(ev, payload) {
    try { (window.__cardTrace || (window.__cardTrace = [])).push(Object.assign({ event: ev, t: Date.now() }, payload || {})); } catch (_) {}
  }

  function getDefaultBranchId() {
    var s = window.__customerListState;
    if (s && s.branches && s.branches.length) return s.branches[0].id;
    return null;
  }

  function modalShell(innerHtml) {
    return '<div class="cust-create-modal-bg" id="cust-create-modal-bg">' +
             '<div class="cust-create-modal">' + innerHtml + '</div>' +
           '</div>';
  }

  function formHtml(branchId) {
    return '<h3>+ לקוח חדש</h3>' +
           '<p class="cust-create-hint">שדות חובה: שם פרטי + שם משפחה + סניף-בית. טלפון/ת.ז יוצרים דדופ אוטומטי דרך ה-RPC.</p>' +
           '<form id="cust-create-form" class="cust-create-form" autocomplete="off">' +
             '<label>שם פרטי <span class="req">*</span><input name="first_name" required></label>' +
             '<label>שם משפחה <span class="req">*</span><input name="last_name" required></label>' +
             '<label>נייד<input name="phone" placeholder="050-1234567 או 0501234567"></label>' +
             '<label>ת.ז<input name="id_number"></label>' +
             '<label>אימייל<input name="email" type="email"></label>' +
             '<label>עיר<input name="city"></label>' +
             '<label>שפה' +
               '<select name="language_code">' +
                 '<option value="he" selected>עברית</option>' +
                 '<option value="ru">русский</option>' +
                 '<option value="en">English</option>' +
                 '<option value="es">español</option>' +
               '</select>' +
             '</label>' +
             '<input type="hidden" name="home_branch_id" value="' + escapeHtml(branchId || '') + '">' +
             '<div class="cust-create-actions">' +
               '<button type="button" id="cust-create-cancel" class="cust-filter">ביטול</button>' +
               '<button type="submit" id="cust-create-submit" class="cust-list-new">צור לקוח</button>' +
             '</div>' +
             '<div id="cust-create-result"></div>' +
           '</form>';
  }

  function existingCustomerSurface(reason, customerId, customerNumber, fullName) {
    var reasonLabel = reason === 'phone_exists' ? 'טלפון זה כבר קיים במערכת' :
                      reason === 'id_number_exists' ? 'ת.ז זו כבר קיימת במערכת' :
                      'הלקוח כבר קיים';
    return '<div class="cust-create-dedup">' +
             '<div class="cust-create-dedup-hdr">⚠ ' + escapeHtml(reasonLabel) + '</div>' +
             '<div class="cust-create-dedup-body">' +
               '<div>לקוח קיים: <strong>' + escapeHtml(fullName || '(שם חסר)') + '</strong></div>' +
               (customerNumber ? '<div>מספר לקוח: <strong>#' + escapeHtml(String(customerNumber)) + '</strong></div>' : '') +
               '<button class="cust-list-new" id="cust-dedup-open" data-customer-id="' + escapeHtml(customerId) + '">פתח כרטיס</button>' +
             '</div>' +
           '</div>';
  }

  function buildPayload(form) {
    var fd = new FormData(form);
    var p = {};
    for (var i = 0; i < form.elements.length; i++) {
      var el = form.elements[i];
      if (!el.name) continue;
      var v = fd.get(el.name);
      if (v == null) continue;
      v = String(v).trim();
      if (v) p[el.name] = v;
    }
    // Phone normalization: convert local 0XXXXXXXXX → +972XXXXXXXXX so the RPC's
    // phone-exists dedup matches against E.164 storage.
    if (p.phone) {
      var d = p.phone.replace(/[^0-9]/g, '');
      if (d.charAt(0) === '0') d = d.slice(1);
      if (d.length >= 9 && d.indexOf('972') !== 0) d = '972' + d;
      p.phone = '+' + d;
    }
    return p;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    var form = ev.target;
    var payload = buildPayload(form);
    var resultEl = document.getElementById('cust-create-result');
    resultEl.innerHTML = '';

    if (!payload.home_branch_id) {
      resultEl.innerHTML = '<div class="cust-create-err">שגיאה: לא נמצא סניף-בית פעיל. נסה לרענן.</div>';
      return;
    }

    trace('create_customer_called', { has_phone: !!payload.phone, has_id_number: !!payload.id_number });
    var submitBtn = document.getElementById('cust-create-submit');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'יוצר…'; }

    var res = await DB.rpc('create_customer', { p_tenant_id: getTenantId(), p_payload: payload }, { silent: true });
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'צור לקוח'; }
    trace('create_customer_resolved', {
      error: res.error ? String(res.error.message || res.error) : null,
      created: res.data ? res.data.created : null,
      reason: res.data ? res.data.reason : null,
      customer_id: res.data ? res.data.customer_id : null
    });

    if (res.error) {
      resultEl.innerHTML = '<div class="cust-create-err">שגיאה ביצירת לקוח: ' + escapeHtml(res.error.message || 'unknown') + '</div>';
      return;
    }
    var data = res.data || {};
    if (!data.created) {
      // Dedup-hit — surface the existing customer
      var existingName = '';
      try {
        var fetched = await DB.select('v_customer_for_exam', { id: data.customer_id }, { single: true, columns: 'full_name,customer_number_display', silent: true });
        if (fetched && fetched.data) existingName = fetched.data.full_name;
      } catch (_) {}
      resultEl.innerHTML = existingCustomerSurface(data.reason, data.customer_id, data.customer_number, existingName);
      var openBtn = document.getElementById('cust-dedup-open');
      if (openBtn) openBtn.addEventListener('click', function () {
        window.location.href = 'customers.html?t=' + encodeURIComponent(sessionStorage.getItem('tenant_slug') || 'demo') + '&customer_id=' + encodeURIComponent(data.customer_id);
      });
      return;
    }

    // Created — redirect
    Toast.success('לקוח נוצר · #' + (data.customer_number || ''));
    setTimeout(function () {
      window.location.href = 'customers.html?t=' + encodeURIComponent(sessionStorage.getItem('tenant_slug') || 'demo') + '&customer_id=' + encodeURIComponent(data.customer_id);
    }, 600);
  }

  function close() {
    var bg = document.getElementById('cust-create-modal-bg');
    if (bg && bg.parentNode) bg.parentNode.removeChild(bg);
  }

  window.openCustomerCreateModal = function () {
    var branchId = getDefaultBranchId();
    if (!branchId) {
      Toast.error('לא נמצא סניף-בית פעיל. רענן ונסה שוב.');
      return;
    }
    close(); // ensure any prior modal is gone
    var host = document.createElement('div');
    host.innerHTML = modalShell(formHtml(branchId));
    document.body.appendChild(host.firstChild);

    var bg = document.getElementById('cust-create-modal-bg');
    bg.addEventListener('click', function (ev) { if (ev.target === bg) close(); });
    document.getElementById('cust-create-cancel').addEventListener('click', close);
    document.getElementById('cust-create-form').addEventListener('submit', handleSubmit);
  };
})();
