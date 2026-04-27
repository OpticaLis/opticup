// =========================================================
// permission-matrix.js — Permission Matrix UI
// Extracted from employee-list.js for file-size compliance
// (PERMISSIONS_PHASE2_FIX_2026_04_27).
// Depends on: shared.js, auth-service.js, employee-list.js (loadRolesFromDB)
// =========================================================

const MODULE_LABELS = {
  inventory: { icon: '📦', he: 'מלאי' },
  debt: { icon: '💰', he: 'חובות ספקים' },
  shipments: { icon: '🚚', he: 'משלוחים' },
  ai: { icon: '🤖', he: 'AI/OCR' },
  returns: { icon: '🔄', he: 'זיכויים' },
  stock_count: { icon: '📊', he: 'ספירת מלאי' },
  reports: { icon: '📈', he: 'דוחות' },
  settings: { icon: '⚙️', he: 'הגדרות' },
  employees: { icon: '👥', he: 'ניהול הרשאות' },
  purchasing: { icon: '🛒', he: 'הזמנות רכש' },
  goods_receipts: { icon: '📥', he: 'קבלת סחורה' },
  brands: { icon: '🏷️', he: 'מותגים' },
  suppliers: { icon: '🏭', he: 'ספקים' },
  audit: { icon: '📝', he: 'לוג פעולות' },
  sync: { icon: '🔄', he: 'סנכרון' }
};

const MODULE_ORDER = ['inventory', 'debt', 'shipments', 'returns', 'purchasing', 'goods_receipts', 'stock_count', 'ai', 'reports', 'brands', 'suppliers', 'settings', 'employees', 'audit', 'sync'];

async function renderPermissionMatrix(targetDivId) {
  const wrap = $(targetDivId);
  if (!wrap) return;

  const [{ data: roles }, { data: perms }, { data: rolePerms }] = await Promise.all([
    sb.from(AT.ROLES).select('id, name_he').eq('tenant_id', getTenantId()).order('id'),
    sb.from(AT.PERMISSIONS).select('id, module, name_he').eq('tenant_id', getTenantId()).order('module, id'),
    sb.from(AT.ROLE_PERMS).select('role_id, permission_id, granted').eq('tenant_id', getTenantId())
  ]);
  if (!roles || !perms) { wrap.textContent = 'שגיאה בטעינת הרשאות'; return; }

  const rpMap = {};
  (rolePerms || []).forEach(rp => { rpMap[rp.role_id + '|' + rp.permission_id] = rp.granted; });

  const canEdit = hasPermission('settings.edit');
  const moduleSet = [...new Set(perms.map(p => p.module))];
  const sortedModules = MODULE_ORDER.filter(m => moduleSet.includes(m));
  moduleSet.forEach(m => { if (!sortedModules.includes(m)) sortedModules.push(m); });

  let t = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.8rem">';
  t += '<thead><tr style="background:#f1f5f9;position:sticky;top:0;z-index:5"><th style="padding:8px;text-align:right">הרשאה</th>';
  roles.forEach(r => { t += '<th style="padding:8px;text-align:center">' + escapeHtml(r.name_he) + '</th>'; });
  if (canEdit) t += '<th style="padding:8px;text-align:center;font-size:.7rem;color:#666">פעולות</th>';
  t += '</tr></thead><tbody>';

  const colspanCount = roles.length + 1 + (canEdit ? 1 : 0);

  sortedModules.forEach(mod => {
    const ml = MODULE_LABELS[mod] || { icon: '📋', he: mod };
    const modPerms = perms.filter(p => p.module === mod);
    t += '<tr class="perm-module-header" data-module="' + mod + '" onclick="togglePermModule(this)" style="cursor:pointer;user-select:none">';
    t += '<td colspan="' + colspanCount + '" style="padding:10px 12px;font-weight:700;background:var(--primary);color:white;font-size:.88rem">';
    t += '<span class="perm-arrow" style="display:inline-block;transition:transform .2s;margin-left:6px">▼</span> ';
    t += ml.icon + ' ' + escapeHtml(ml.he) + ' <span style="font-weight:400;font-size:.75rem;opacity:.7">(' + modPerms.length + ')</span>';
    t += '</td></tr>';
    modPerms.forEach(p => {
      t += '<tr class="perm-row perm-mod-' + mod + '" data-perm-id="' + escapeHtml(p.id) + '" style="border-bottom:1px solid #f0f0f0">';
      t += '<td style="padding:6px 10px;padding-right:24px">' + escapeHtml(p.name_he) + '</td>';
      roles.forEach(r => {
        const key = r.id + '|' + p.id;
        const checked = rpMap[key] ? ' checked' : '';
        const disabled = canEdit ? '' : ' disabled';
        t += '<td style="text-align:center"><input type="checkbox"' + checked + disabled + ' data-role-id="' + escapeHtml(r.id) + '" onchange="updateRolePermission(\'' + escapeHtml(r.id) + '\',\'' + escapeHtml(p.id) + '\',this.checked)" style="accent-color:var(--success);width:18px;height:18px"></td>';
      });
      if (canEdit) {
        t += '<td style="text-align:center;padding:4px;white-space:nowrap">';
        t += '<button type="button" data-row-toggle="all" onclick="bulkToggleRow(this,true)" title="הענק לכל התפקידים" style="font-size:.7rem;padding:2px 8px;margin-inline-end:4px;background:#22c55e;color:#fff;border:none;border-radius:4px;cursor:pointer">הכל</button>';
        t += '<button type="button" data-row-toggle="none" onclick="bulkToggleRow(this,false)" title="בטל מכל התפקידים" style="font-size:.7rem;padding:2px 8px;background:#ef4444;color:#fff;border:none;border-radius:4px;cursor:pointer">כלום</button>';
        t += '</td>';
      }
      t += '</tr>';
    });
  });

  t += '</tbody></table></div>';
  wrap.innerHTML = t;
}

function togglePermModule(headerRow) {
  const mod = headerRow.getAttribute('data-module');
  const rows = document.querySelectorAll('.perm-mod-' + mod);
  const arrow = headerRow.querySelector('.perm-arrow');
  const hidden = rows.length && rows[0].style.display === 'none';
  rows.forEach(r => { r.style.display = hidden ? '' : 'none'; });
  if (arrow) arrow.style.transform = hidden ? '' : 'rotate(-90deg)';
}

async function updateRolePermission(roleId, permissionId, granted) {
  requirePermission('settings.edit');
  const { error } = await sb.from(AT.ROLE_PERMS)
    .upsert({ role_id: roleId, permission_id: permissionId, granted, tenant_id: getTenantId() }, { onConflict: 'role_id,permission_id,tenant_id' });
  if (error) { console.error('updateRolePermission error:', error); toast('שגיאה בעדכון הרשאה', 'e'); return; }
  toast('הרשאות עודכנו', 's');
}

// Row-level "all"/"none" — single batch upsert per row click.
async function bulkToggleRow(btn, granted) {
  requirePermission('settings.edit');
  const tr = btn.closest('tr');
  if (!tr) return;
  const permId = tr.getAttribute('data-perm-id');
  if (!permId) return;
  const tid = getTenantId();
  const checkboxes = tr.querySelectorAll('input[type="checkbox"][data-role-id]');
  const rows = Array.from(checkboxes).map(cb => ({
    role_id: cb.getAttribute('data-role-id'),
    permission_id: permId,
    granted: granted,
    tenant_id: tid,
  }));
  if (!rows.length) return;
  const { error } = await sb.from(AT.ROLE_PERMS)
    .upsert(rows, { onConflict: 'role_id,permission_id,tenant_id' });
  if (error) { console.error('bulkToggleRow error:', error); toast('שגיאה בעדכון הרשאות', 'e'); return; }
  checkboxes.forEach(cb => { cb.checked = granted; });
  toast('עודכנו ' + rows.length + ' הרשאות', 's');
}
