// === admin-audit.js ===
// Audit log helper — every admin action MUST be logged
// Depends on: AdminDB from admin-db.js, getCurrentAdmin from admin-auth.js

async function logAdminAction(action, targetTenantId = null, details = {}) {
  const admin = getCurrentAdmin();
  if (!admin) return;

  try {
    await AdminDB.insert('platform_audit_log', {
      admin_id: admin.id,
      action: action,
      target_tenant_id: targetTenantId,
      details: details,
      ip_address: null
    });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}
