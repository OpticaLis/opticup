// shipments-lock.js — Lock lifecycle: timer, manual/auto lock, correction box, edit-window ops, config helpers
window._lockMinutes = 30;
window._lockTimerInterval = null;
window._boxPrefix = 'BOX';
window._requireTracking = false;
window._autoPrint = false;
window._shipmentConfig = null;

// --- LOAD CONFIGURABLE SHIPMENT SETTINGS ---
async function loadLockMinutes() {
  const tid = getTenantId();
  if (!tid) return;
  const { data, error } = await sb.from(T.TENANTS)
    .select('shipment_lock_minutes, box_number_prefix, require_tracking_before_lock, auto_print_on_lock, shipment_config')
    .eq('id', tid)
    .maybeSingle();
  if (!error && data) {
    if (data.shipment_lock_minutes) window._lockMinutes = data.shipment_lock_minutes;
    if (data.box_number_prefix) window._boxPrefix = data.box_number_prefix;
    window._requireTracking = !!data.require_tracking_before_lock;
    window._autoPrint = !!data.auto_print_on_lock;
    if (data.shipment_config && typeof data.shipment_config === 'object') {
      window._shipmentConfig = data.shipment_config;
    }
  }
}

// --- EDITABILITY CHECKS ---
function isBoxEditable(box) {
  if (box.locked_at) return false;
  var ms = window._lockMinutes * 60 * 1000;
  if (Date.now() - new Date(box.packed_at).getTime() > ms) return false;
  return true;
}

function getEditableMinutes(box) {
  if (box.locked_at) return 0;
  var ms = window._lockMinutes * 60 * 1000;
  var elapsed = Date.now() - new Date(box.packed_at).getTime();
  var remaining = ms - elapsed;
  return remaining > 0 ? Math.ceil(remaining / 60000) : 0;
}

function getEditableSeconds(box) {
  if (box.locked_at) return 0;
  var ms = window._lockMinutes * 60 * 1000;
  var elapsed = Date.now() - new Date(box.packed_at).getTime();
  var remaining = ms - elapsed;
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

// --- STATUS INDICATOR (used by list + detail) ---
function renderLockStatus(box) {
  var parts = [];
  if (box.corrects_box_id) parts.push('<span class="ship-correction" title="ארגז תיקון">&#128279; תיקון</span>');
  if (box.locked_at) {
    parts.push('<span class="locked" title="נעול">&#128274; נעול</span>');
  } else if (!isBoxEditable(box)) {
    parts.push('<span class="locked" title="נעול (אוטומטי)">&#128274; נעול (אוטומטי)</span>');
  } else {
    var mins = getEditableMinutes(box);
    parts.push('<span class="editable" title="ניתן לעריכה">&#9999;&#65039; ' + mins + ' דק׳</span>');
  }
  return parts.join(' ');
}

// --- MANUAL LOCK ---
async function lockBox(shipmentId) {
  var box = shipmentsData.find(function(s) { return s.id === shipmentId; });
  if (!box) { toast('ארגז לא נמצא', 'e'); return; }
  if (box.locked_at) { toast('הארגז כבר נעול', 'i'); return; }

  // Check tracking requirement
  if (window._requireTracking && !box.tracking_number) {
    toast('נדרש מספר מעקב לפני נעילה', 'e'); return;
  }

  var pin = prompt('הזן סיסמת עובד לנעילה:');
  if (!pin) return;
  var emp = await verifyPinOnly(pin);
  if (!emp) { toast('סיסמת עובד שגויה', 'e'); return; }

  var tid = getTenantId();
  var { error } = await sb.from(T.SHIPMENTS)
    .update({ locked_at: new Date().toISOString(), locked_by: emp.id })
    .eq('id', shipmentId)
    .eq('tenant_id', tid);
  if (error) { toast('שגיאה בנעילה: ' + error.message, 'e'); return; }

  writeLog('shipment_locked', null, { box_number: box.box_number, locked_by: emp.name });
  toast('ארגז ' + box.box_number + ' ננעל');

  // Auto-print manifest on lock if enabled
  if (window._autoPrint && typeof printManifest === 'function') {
    var { data: items } = await sb.from(T.SHIP_ITEMS).select('*')
      .eq('shipment_id', shipmentId).eq('tenant_id', tid).order('created_at');
    printManifest(box, items || []);
  }

  await loadShipments();
}

// --- AUTO-LOCK EXPIRED BOXES (data cleanup) ---
async function autoLockExpiredBoxes() {
  var tid = getTenantId();
  if (!tid) return;
  var cutoff = new Date(Date.now() - window._lockMinutes * 60 * 1000).toISOString();

  var { data, error } = await sb.from(T.SHIPMENTS)
    .select('id, box_number, packed_at')
    .eq('tenant_id', tid)
    .eq('is_deleted', false)
    .is('locked_at', null)
    .lt('packed_at', cutoff);

  if (error || !data || !data.length) return;

  for (var i = 0; i < data.length; i++) {
    var box = data[i];
    var lockTime = new Date(new Date(box.packed_at).getTime() + window._lockMinutes * 60 * 1000).toISOString();
    var { error: upErr } = await sb.from(T.SHIPMENTS)
      .update({ locked_at: lockTime })
      .eq('id', box.id)
      .eq('tenant_id', tid);
    if (!upErr) {
      writeLog('shipment_auto_locked', null, { box_number: box.box_number });
    }
  }
}

// --- CORRECTION BOX ---
async function createCorrectionBox(originalBox) {
  if (!originalBox) return;
  var ok = await confirmDialog('ארגז תיקון', 'ליצור ארגז תיקון עבור ' + originalBox.box_number + '?');
  if (!ok) return;

  var pin = prompt('הזן סיסמת עובד:');
  if (!pin) return;
  var emp = await verifyPinOnly(pin);
  if (!emp) { toast('סיסמת עובד שגויה', 'e'); return; }

  var tid = getTenantId();
  try {
    var { data: boxNumber, error: rpcErr } = await sb.rpc('next_box_number', { p_tenant_id: tid });
    if (rpcErr || !boxNumber) throw new Error(rpcErr?.message || 'שגיאה ביצירת מספר ארגז');

    var shipment = {
      tenant_id: tid,
      box_number: boxNumber,
      shipment_type: originalBox.shipment_type,
      supplier_id: originalBox.supplier_id || null,
      customer_name: originalBox.customer_name || null,
      customer_phone: originalBox.customer_phone || null,
      customer_address: originalBox.customer_address || null,
      corrects_box_id: originalBox.id,
      packed_by: emp.id,
      items_count: 0,
      total_value: 0,
      notes: 'תיקון עבור ' + originalBox.box_number
    };

    var { error: insErr } = await sb.from(T.SHIPMENTS).insert(shipment);
    if (insErr) throw new Error(insErr.message);

    writeLog('shipment_correction', null, {
      box_number: boxNumber, corrects: originalBox.box_number
    });
    toast('ארגז תיקון ' + boxNumber + ' נוצר — ' + window._lockMinutes + ' דקות לעריכה');
    await loadShipments();
  } catch (err) {
    toast('שגיאה: ' + err.message, 'e');
  }
}

// --- ADD ITEM TO EXISTING BOX (edit window) ---
async function addItemToExistingBox(shipmentId, item) {
  var box = shipmentsData.find(function(s) { return s.id === shipmentId; });
  if (!box || !isBoxEditable(box)) { toast('הארגז נעול — לא ניתן להוסיף פריטים', 'e'); return false; }

  var tid = getTenantId();
  var row = {
    tenant_id: tid, shipment_id: shipmentId,
    item_type: item.item_type || 'order',
    inventory_id: item.inventory_id || null,
    return_id: item.return_id || null,
    order_number: item.order_number || null,
    customer_name: item.customer_name || null,
    customer_number: item.customer_number || null,
    barcode: item.barcode || null,
    brand: item.brand || null, model: item.model || null,
    size: item.size || null, color: item.color || null,
    category: item.category || null,
    unit_cost: item.unit_cost || null,
    notes: item.notes || null
  };

  var { error } = await sb.from(T.SHIP_ITEMS).insert(row);
  if (error) { toast('שגיאה בהוספת פריט: ' + error.message, 'e'); return false; }

  // Update shipment summary (atomic RPC — Phase 3 fix)
  await sb.rpc('increment_shipment_counters', {
    p_shipment_id: shipmentId,
    p_items_delta: 1,
    p_value_delta: Number(item.unit_cost) || 0
  });

  // Handle return items
  if (item.return_id && typeof handleReturnItemsOnCreate === 'function') {
    await handleReturnItemsOnCreate([item], box.box_number);
  }

  writeLog('shipment_item_added', item.inventory_id || null, {
    box_number: box.box_number, barcode: item.barcode || '', item_type: item.item_type || 'order'
  });
  return true;
}

// --- REMOVE ITEM FROM EXISTING BOX (edit window) ---
async function removeItemFromExistingBox(shipmentItemId, shipment) {
  if (!shipment || !isBoxEditable(shipment)) { toast('הארגז נעול — לא ניתן להסיר פריטים', 'e'); return false; }
  var ok2 = await confirmDialog('הסרת פריט', 'להסיר את הפריט מהארגז?');
  if (!ok2) return false;

  var tid = getTenantId();
  // Fetch the item before deleting
  var { data: item, error: fetchErr } = await sb.from(T.SHIP_ITEMS)
    .select('*')
    .eq('id', shipmentItemId)
    .eq('tenant_id', tid)
    .maybeSingle();
  if (fetchErr || !item) { toast('פריט לא נמצא', 'e'); return false; }

  // Revert return status if linked
  if (item.return_id && typeof revertReturnStatus === 'function') {
    await revertReturnStatus(item, shipment.box_number);
  }

  // Delete item
  var { error: delErr } = await sb.from(T.SHIP_ITEMS)
    .delete()
    .eq('id', shipmentItemId)
    .eq('tenant_id', tid);
  if (delErr) { toast('שגיאה בהסרת פריט: ' + delErr.message, 'e'); return false; }

  // Update shipment summary
  await sb.from(T.SHIPMENTS).update({
    items_count: Math.max(0, (shipment.items_count || 1) - 1),
    total_value: Math.max(0, (Number(shipment.total_value) || 0) - (Number(item.unit_cost) || 0))
  }).eq('id', shipment.id).eq('tenant_id', tid);

  writeLog('shipment_item_removed', item.inventory_id || null, {
    box_number: shipment.box_number, barcode: item.barcode || ''
  });
  toast('פריט הוסר מארגז ' + shipment.box_number);
  return true;
}

// --- LOCK TIMER (for detail panel) ---
function startLockTimer(box, containerEl) {
  stopLockTimer();
  if (!box || !containerEl || !isBoxEditable(box)) return;

  function updateTimer() {
    var secs = getEditableSeconds(box);
    if (secs <= 0) {
      containerEl.innerHTML = '<span class="locked">&#128274; נעול (אוטומטי)</span>';
      stopLockTimer();
      if (typeof loadShipments === 'function') loadShipments();
      return;
    }
    var m = Math.floor(secs / 60);
    var s = secs % 60;
    containerEl.innerHTML = '<span class="editable">נותרו ' +
      String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + ' לעריכה</span>';
  }

  updateTimer();
  window._lockTimerInterval = setInterval(updateTimer, 30000);
}

function stopLockTimer() {
  if (window._lockTimerInterval) {
    clearInterval(window._lockTimerInterval);
    window._lockTimerInterval = null;
  }
}

// --- SHIPMENT CONFIG HELPERS ---
function getFieldConfig(type, field) {
  var cfg = window._shipmentConfig;
  if (!cfg || !cfg.fields || !cfg.fields[type]) return 'optional';
  var val = cfg.fields[type][field];
  if (val === null || val === undefined) return 'hidden';
  if (typeof val === 'object') return val.visible ? 'optional' : 'hidden';
  return val; // 'required', 'optional', or 'hidden'
}

function getCustomField(type, index) {
  var cfg = window._shipmentConfig;
  if (!cfg || !cfg.fields || !cfg.fields[type]) return null;
  var custom = cfg.fields[type]['custom_' + index];
  if (!custom || typeof custom !== 'object') return null;
  return custom; // { label: "...", visible: true/false }
}

function getVisibleCategories() {
  var cfg = window._shipmentConfig;
  if (!cfg || !cfg.categories) return Object.keys(ENUM_MAP.shipment_category || {});
  var visible = cfg.categories.visible || [];
  var custom = (cfg.categories.custom || []).map(function(c) { return c.key; });
  return visible.concat(custom);
}

function getCategoryLabel(key) {
  var cfg = window._shipmentConfig;
  var customCats = (cfg && cfg.categories && cfg.categories.custom) ? cfg.categories.custom : [];
  var found = customCats.find(function(c) { return c.key === key; });
  if (found) return found.label_he;
  return (ENUM_REV.shipment_category && ENUM_REV.shipment_category[key]) ? ENUM_REV.shipment_category[key] : key;
}

function getStep3Config(field) {
  var cfg = window._shipmentConfig;
  if (!cfg || !cfg.step3) return 'optional';
  return cfg.step3[field] || 'optional';
}
