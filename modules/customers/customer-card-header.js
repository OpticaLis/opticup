/* ============================================================
   M5 Customer Card — header rendering + edit-mode toggle + actions.
   Source views: v_customer_for_exam (composite display + first/last + age)
                 v_customer_full (phone + city for the meta line).
   Wired badges: Inactive ↔ lifecycle_stage='dormant'; Locked ↔ is_deleted.
   Blurred badges: VIP, חבר-מועדון — bound via bindComingSoon().
   ============================================================ */
(function () {
  'use strict';

  function ageFromBirthDate(bd) {
    if (!bd) return null;
    var d = new Date(bd);
    if (isNaN(d.getTime())) return null;
    var now = new Date();
    var age = now.getFullYear() - d.getFullYear();
    var m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age;
  }

  function initials(fullName, firstName, lastName) {
    var src = (firstName ? firstName.charAt(0) : '') + (lastName ? lastName.charAt(0) : '');
    if (src) return src;
    if (fullName) return String(fullName).trim().split(/\s+/).map(function (w) { return w.charAt(0); }).slice(0, 2).join('');
    return '?';
  }

  window.renderHeader = function (customer) {
    var host = document.getElementById('cust-header');
    if (!host || !customer) return;

    var name = customer.full_name || ((customer.first_name || '') + ' ' + (customer.last_name || '')).trim() || 'ללא שם';
    var age = ageFromBirthDate(customer.birth_date);
    var ageStr = (age != null) ? ' · ' + age : '';
    var phone = customer.phone || '—';
    var city = customer.city || '';
    var ini = initials(customer.full_name, customer.first_name, customer.last_name);
    var editing = !!(window.M5Card && window.M5Card.state.editMode);

    // Wired badges
    var isDormant = customer.lifecycle_stage === 'dormant';
    var isLocked  = customer.is_deleted === true;

    var metaParts = [];
    metaParts.push('📱 ' + escapeHtml(phone));
    if (city) metaParts.push(escapeHtml(city));
    var meta = metaParts.join(' · ');

    host.innerHTML =
      '<div class="left">' +
        '<div class="avatar">' + escapeHtml(ini) + '</div>' +
        '<div>' +
          '<div class="cust-name">' + escapeHtml(name) + escapeHtml(ageStr) + '</div>' +
          '<div class="cust-meta">' + meta + '</div>' +
        '</div>' +
        (isDormant ? ' <span class="cust-pill cust-pill-gray" title="lifecycle_stage=dormant">לא פעיל</span>' : '') +
        (isLocked  ? ' <span class="cust-pill cust-pill-coral" title="is_deleted=true">נעול</span>' : '') +
        ' <span class="cust-pill cust-pill-amber" data-coming-soon="vip">VIP</span>' +
        ' <span class="cust-pill cust-pill-teal"  data-coming-soon="loyalty_member">חבר-מועדון</span>' +
      '</div>' +
      '<div class="actions">' +
        '<button class="edit' + (editing ? ' editing' : '') + '" id="cust-edit-toggle">' +
          (editing ? '✓ סיום עריכה' : '✎ ערוך') +
        '</button>' +
        '<button data-coming-soon="call_action">📞 התקשר</button>' +
        '<button data-coming-soon="whatsapp_action">💬 WhatsApp</button>' +
      '</div>';

    // Wire edit toggle
    var editBtn = document.getElementById('cust-edit-toggle');
    if (editBtn) {
      editBtn.addEventListener('click', function () {
        if (window.M5Card) window.M5Card.setEditMode(!window.M5Card.state.editMode);
      });
    }

    // Wire blurred coming-soon elements (single shared handler)
    host.querySelectorAll('[data-coming-soon]').forEach(function (el) {
      var id = el.getAttribute('data-coming-soon');
      window.bindComingSoon(el, id);
    });
  };
})();
