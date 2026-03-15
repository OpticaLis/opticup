// shipments-couriers.js — Courier CRUD + Shipment settings modal
let _courierModalTab = 'couriers';
let _allCouriers = [];
let _shipSettings = {};

// =========================================================
// MODAL OPEN / CLOSE
// =========================================================
function openCourierModal() {
  _courierModalTab = 'couriers';
  var modal = $('courier-modal');
  modal.classList.remove('hidden');
  modal.innerHTML = '<div class="modal-overlay" onclick="if(event.target===this)closeCourierModal()">' +
    '<div class="courier-modal-box"><div id="courier-modal-content"></div></div></div>';
  renderCourierModal();
}

function closeCourierModal() {
  var modal = $('courier-modal');
  modal.classList.add('hidden');
  modal.innerHTML = '';
}

function renderCourierModal() {
  var content = $('courier-modal-content');
  if (!content) return;
  var tabC = _courierModalTab === 'couriers' ? ' active' : '';
  var tabS = _courierModalTab === 'settings' ? ' active' : '';

  var html = '<div class="cm-header">' +
    '<h3 class="cm-title">&#9881; ניהול שליחויות</h3>' +
    '<button class="detail-close" onclick="closeCourierModal()" title="סגור">&times;</button></div>' +
    '<div class="cm-tabs">' +
    '<button class="cm-tab' + tabC + '" onclick="switchCourierTab(\'couriers\')">חברות שליחויות</button>' +
    '<button class="cm-tab' + tabS + '" onclick="switchCourierTab(\'settings\')">הגדרות משלוחים</button></div>' +
    '<div id="cm-body"></div>';
  content.innerHTML = html;

  if (_courierModalTab === 'couriers') loadCouriers();
  else loadShipmentSettings();
}

function switchCourierTab(tab) {
  _courierModalTab = tab;
  renderCourierModal();
}

// =========================================================
// COURIER LIST
// =========================================================
async function loadCouriers() {
  var body = $('cm-body');
  if (!body) return;
  body.innerHTML = '<div class="wiz-note">טוען...</div>';
  var tid = getTenantId();
  var { data, error } = await sb.from(T.COURIERS)
    .select('*').eq('tenant_id', tid).order('name');
  if (error) { body.innerHTML = '<div class="wiz-note">שגיאה בטעינה</div>'; return; }
  _allCouriers = data || [];
  renderCourierList(_allCouriers);
}

function renderCourierList(couriers) {
  var body = $('cm-body');
  if (!body) return;

  var html = '<div class="cm-section">' +
    '<button class="btn btn-p btn-sm cm-add-btn" onclick="showCourierForm()">+ הוסף חברה</button>' +
    '<div id="courier-form-area"></div>';

  if (!couriers.length) {
    html += '<div class="wiz-note">אין חברות שליחויות — הוסף את הראשונה</div>';
  } else {
    html += '<table class="cm-table"><thead><tr>' +
      '<th>שם</th><th>טלפון</th><th>איש קשר</th><th>פעיל</th><th>פעולות</th>' +
      '</tr></thead><tbody>';
    for (var c of couriers) {
      var checked = c.is_active ? ' checked' : '';
      html += '<tr>' +
        '<td>' + escapeHtml(c.name) + '</td>' +
        '<td>' + escapeHtml(c.phone || '—') + '</td>' +
        '<td>' + escapeHtml(c.contact_person || '—') + '</td>' +
        '<td><input type="checkbox"' + checked + ' onchange="toggleCourierActive(\'' + c.id + '\', this.checked)"></td>' +
        '<td><button class="btn-sm" onclick="showCourierForm(\'' + c.id + '\')">&#9999;&#65039;</button></td>' +
        '</tr>';
    }
    html += '</tbody></table>';
  }
  html += '</div>';
  body.innerHTML = html;
}

// =========================================================
// COURIER FORM
// =========================================================
function showCourierForm(courierId) {
  var area = $('courier-form-area');
  if (!area) return;
  var c = courierId ? _allCouriers.find(function(x) { return x.id === courierId; }) : null;

  area.innerHTML = '<div class="cm-form">' +
    '<div class="cm-form-title">' + (c ? 'עריכת חברה' : 'חברה חדשה') + '</div>' +
    '<input type="hidden" id="cf-id" value="' + (c ? c.id : '') + '">' +
    '<div class="wiz-field-row"><label class="wiz-field-label">שם *</label>' +
    '<input type="text" id="cf-name" class="wiz-input wiz-field-input" value="' + escapeHtml(c ? c.name : '') + '"></div>' +
    '<div class="wiz-field-row"><label class="wiz-field-label">טלפון</label>' +
    '<input type="text" id="cf-phone" class="wiz-input wiz-field-input" value="' + escapeHtml(c ? c.phone || '' : '') + '"></div>' +
    '<div class="wiz-field-row"><label class="wiz-field-label">איש קשר</label>' +
    '<input type="text" id="cf-contact" class="wiz-input wiz-field-input" value="' + escapeHtml(c ? c.contact_person || '' : '') + '"></div>' +
    '<div class="wiz-btns">' +
    '<button class="btn btn-g btn-sm" onclick="$(\'courier-form-area\').innerHTML=\'\'">ביטול</button>' +
    '<button class="btn btn-p btn-sm" onclick="saveCourier()">שמור</button></div></div>';
  setTimeout(function() { var el = $('cf-name'); if (el) el.focus(); }, 50);
}

async function saveCourier() {
  var id = ($('cf-id') || {}).value || null;
  var name = ($('cf-name') || {}).value.trim();
  var phone = ($('cf-phone') || {}).value.trim() || null;
  var contact = ($('cf-contact') || {}).value.trim() || null;

  if (!name) { toast('שם חברה חובה', 'e'); return; }

  var tid = getTenantId();
  var row = { name: name, phone: phone, contact_person: contact };

  if (id) {
    var { error } = await sb.from(T.COURIERS).update(row).eq('id', id).eq('tenant_id', tid);
    if (error) { toast('שגיאה: ' + error.message, 'e'); return; }
  } else {
    row.tenant_id = tid;
    row.is_active = true;
    var { error } = await sb.from(T.COURIERS).insert(row);
    if (error) {
      if (error.message && error.message.includes('unique')) { toast('חברה בשם זה כבר קיימת', 'e'); return; }
      toast('שגיאה: ' + error.message, 'e'); return;
    }
  }
  toast('חברת שליחויות נשמרה');
  await loadCouriers();
}

async function toggleCourierActive(courierId, isActive) {
  var tid = getTenantId();
  var { error } = await sb.from(T.COURIERS).update({ is_active: isActive }).eq('id', courierId).eq('tenant_id', tid);
  if (error) { toast('שגיאה: ' + error.message, 'e'); return; }
  toast(isActive ? 'חברה הופעלה' : 'חברה הושבתה');
  // Update cached couriersList used by filters/wizard
  if (typeof populateCourierFilter === 'function') {
    var sel = $('filter-courier');
    if (sel) { sel.innerHTML = '<option value="">שליחויות — הכל</option>'; populateCourierFilter(); }
  }
}

// =========================================================
// SHIPMENT SETTINGS
// =========================================================
async function loadShipmentSettings() {
  var body = $('cm-body');
  if (!body) return;
  body.innerHTML = '<div class="wiz-note">טוען...</div>';
  var tid = getTenantId();
  var { data, error } = await sb.from(T.TENANTS)
    .select('shipment_lock_minutes, box_number_prefix, require_tracking_before_lock, auto_print_on_lock')
    .eq('id', tid).maybeSingle();
  if (error || !data) { body.innerHTML = '<div class="wiz-note">שגיאה בטעינת הגדרות</div>'; return; }
  _shipSettings = data;
  renderSettingsTab();
}

function renderSettingsTab() {
  var body = $('cm-body');
  if (!body) return;
  var s = _shipSettings;

  var html = '<div class="cm-section cm-settings">' +
    '<div class="cm-setting-row">' +
    '<label class="cm-setting-label">זמן עריכה (דקות)</label>' +
    '<div class="cm-setting-desc">כמה זמן לאחר יצירת ארגז אפשר לערוך אותו?</div>' +
    '<input type="number" id="ss-lock-min" class="wiz-input cm-setting-input" min="5" max="1440" value="' + (s.shipment_lock_minutes || 30) + '"></div>' +

    '<div class="cm-setting-row">' +
    '<label class="cm-setting-label">קידומת מספור</label>' +
    '<div class="cm-setting-desc">3-5 אותיות שיופיעו לפני מספר הארגז (לדוגמה: BOX-0001)</div>' +
    '<input type="text" id="ss-prefix" class="wiz-input cm-setting-input" maxlength="5" value="' + escapeHtml(s.box_number_prefix || 'BOX') + '" oninput="this.value=this.value.toUpperCase().replace(/[^A-Z]/g,\'\')"></div>' +

    '<div class="cm-setting-row">' +
    '<label class="cm-setting-check"><input type="checkbox" id="ss-req-tracking"' + (s.require_tracking_before_lock ? ' checked' : '') + '>' +
    ' חובה מספר מעקב לפני נעילה</label>' +
    '<div class="cm-setting-desc">לא ניתן לנעול ארגז בלי מספר מעקב של השליחויות</div></div>' +

    '<div class="cm-setting-row">' +
    '<label class="cm-setting-check"><input type="checkbox" id="ss-auto-print"' + (s.auto_print_on_lock ? ' checked' : '') + '>' +
    ' הדפסה אוטומטית בנעילה</label>' +
    '<div class="cm-setting-desc">הדפס manifest אוטומטית כשארגז ננעל</div></div>' +

    '<div class="wiz-btns"><button class="btn btn-p" onclick="saveShipmentSettings()">&#128190; שמור הגדרות</button></div>' +
    '<div id="field-settings-container"></div></div>';
  body.innerHTML = html;
  if (typeof initFieldSettings === 'function') initFieldSettings();
}

async function saveShipmentSettings() {
  var lockMin = parseInt(($('ss-lock-min') || {}).value, 10);
  var prefix = ($('ss-prefix') || {}).value.trim().toUpperCase();
  var reqTracking = ($('ss-req-tracking') || {}).checked || false;
  var autoPrint = ($('ss-auto-print') || {}).checked || false;

  if (!lockMin || lockMin < 5 || lockMin > 1440) { toast('זמן עריכה: 5-1440 דקות', 'e'); return; }
  if (!prefix || prefix.length < 1 || prefix.length > 5 || !/^[A-Z]+$/.test(prefix)) {
    toast('קידומת: 1-5 אותיות באנגלית גדולות בלבד', 'e'); return;
  }

  var tid = getTenantId();
  var { error } = await sb.from(T.TENANTS).update({
    shipment_lock_minutes: lockMin,
    box_number_prefix: prefix,
    require_tracking_before_lock: reqTracking,
    auto_print_on_lock: autoPrint
  }).eq('id', tid);

  if (error) { toast('שגיאה בשמירה: ' + error.message, 'e'); return; }

  // Update cached globals
  window._lockMinutes = lockMin;
  window._boxPrefix = prefix;
  window._requireTracking = reqTracking;
  window._autoPrint = autoPrint;

  toast('הגדרות משלוחים נשמרו');
}
