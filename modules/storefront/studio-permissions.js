// modules/storefront/studio-permissions.js
// Role-based permissions for Studio (CMS-4)
// Source of truth: tenants.is_super_admin (DB column, populated by Manual Action #2).
// If the value is missing/unknown → defaults to tenant_admin (safe fallback).

const STUDIO_PERMISSIONS = {
  super_admin: {
    pages_view_all_tenants: true,
    pages_create: true,
    pages_create_from_template_only: false,
    pages_delete: true,
    pages_edit_all_blocks: true,
    pages_reorder_blocks: true,
    pages_add_remove_blocks: true,
    pages_edit_settings: true,
    pages_toggle_status: true,
    pages_rollback: true,
    pages_json_editor: true,
    components_create: true,
    components_delete: true,
    components_edit: true,
    components_webhook_config: true,
    leads_view: true,
    leads_export: true,
    leads_resend_webhook: true,
    templates_manage: true,
    advanced_json: true,
    advanced_html_blocks: true,
  },
  tenant_admin: {
    pages_view_all_tenants: false,
    pages_create: true,
    pages_create_from_template_only: true,
    pages_delete: false,
    pages_edit_all_blocks: false,
    pages_edit_allowed_blocks: true,
    allowed_block_types: ['text', 'gallery', 'video', 'banner', 'faq', 'cta'],
    pages_reorder_blocks: false,
    pages_add_remove_blocks: false,
    pages_edit_settings: false,
    pages_toggle_status: false,
    pages_rollback: false,
    pages_json_editor: false,
    components_create: false,
    components_delete: false,
    components_edit: false,
    components_webhook_config: false,
    leads_view: true,
    leads_export: true,
    leads_resend_webhook: false,
    templates_manage: false,
    advanced_json: false,
    advanced_html_blocks: false,
  }
};

/**
 * Get current user's Studio role based on tenant slug
 * @returns {'super_admin' | 'tenant_admin'}
 */
function getStudioRole() {
  // Single source of truth: tenants.is_super_admin (DB column).
  // Missing/null → tenant_admin (safe default — no hidden super_admin escalation).
  return getTenantConfig('is_super_admin') === true ? 'super_admin' : 'tenant_admin';
}

/**
 * Check if current role has a specific permission
 */
function studioHasPermission(permission) {
  const role = getStudioRole();
  return STUDIO_PERMISSIONS[role]?.[permission] === true;
}

/**
 * Check if a block type is editable by current role
 */
function canEditBlockType(blockType) {
  if (studioHasPermission('pages_edit_all_blocks')) return true;
  const role = getStudioRole();
  const allowed = STUDIO_PERMISSIONS[role]?.allowed_block_types || [];
  return allowed.includes(blockType);
}

/**
 * Check if user can see a specific UI element
 */
function canSee(element) {
  switch (element) {
    case 'add_block_button': return studioHasPermission('pages_add_remove_blocks');
    case 'delete_block_button': return studioHasPermission('pages_add_remove_blocks');
    case 'reorder_buttons': return studioHasPermission('pages_reorder_blocks');
    case 'page_settings_button': return studioHasPermission('pages_edit_settings');
    case 'status_toggle': return studioHasPermission('pages_toggle_status');
    case 'rollback_button': return studioHasPermission('pages_rollback');
    case 'json_editor_button': return studioHasPermission('pages_json_editor');
    case 'create_page_button': return studioHasPermission('pages_create');
    case 'delete_page_button': return studioHasPermission('pages_delete');
    case 'components_tab': return studioHasPermission('components_create') || studioHasPermission('components_edit');
    case 'components_create': return studioHasPermission('components_create');
    case 'webhook_config': return studioHasPermission('components_webhook_config');
    case 'leads_export': return studioHasPermission('leads_export');
    case 'leads_resend': return studioHasPermission('leads_resend_webhook');
    case 'templates_tab': return studioHasPermission('templates_manage');
    default: return false;
  }
}

/**
 * Get fields that tenant_admin can edit for a given block type
 * Returns null if full access (super_admin) or array of allowed field keys
 */
function getAllowedFields(blockType) {
  if (studioHasPermission('pages_edit_all_blocks')) return null; // null = all fields

  const fieldMap = {
    text: ['title', 'body', 'alignment'],
    gallery: ['images'],
    video: ['videos', 'section_title'],
    banner: ['title', 'text', 'image', 'cta_text', 'cta_url'],
    faq: ['section_title', 'items'],
    cta: ['text', 'url'],
  };

  return fieldMap[blockType] || [];
}

/**
 * Check if current role is super_admin
 */
function isSuperAdmin() {
  return getStudioRole() === 'super_admin';
}
