-- ═══════════════════════════════════════════════════════════════
-- Optic Up — Cleanup Test Tenant Script
-- מודול 1.5 — QA Phase — מחיקת דייר הבדיקה "אופטיקה דמו"
-- ═══════════════════════════════════════════════════════════════
-- מטרה: מחיקת כל הנתונים של דייר הבדיקה בסדר FK הפוך
-- (ילדים קודם, הורים אחרון)
--
-- ⚠️ בטיחות: מוחק רק את דייר demo — לא נוגע בפריזמה!
-- ⚠️ חשוב: הריצו עם service_role (צריך bypass ל-RLS)
-- ═══════════════════════════════════════════════════════════════

BEGIN;

DO $cleanup$
DECLARE
  v_demo_tenant UUID;
  v_count       INTEGER;
BEGIN

-- ============================================================
-- 0. אתר את דייר הבדיקה
-- ============================================================
SELECT id INTO v_demo_tenant
  FROM tenants
  WHERE slug = 'demo';

IF v_demo_tenant IS NULL THEN
  RAISE EXCEPTION 'דייר בדיקה (demo) לא נמצא — אין מה לנקות!';
END IF;

RAISE NOTICE '=== מתחיל ניקוי דייר demo: % ===', v_demo_tenant;

-- ============================================================
-- שכבה 5 — עלים (אין שום FK שמצביע עליהם)
-- ============================================================

-- notification_preferences
DELETE FROM notification_preferences WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'notification_preferences: % שורות נמחקו', v_count;

-- message_reactions
DELETE FROM message_reactions WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'message_reactions: % שורות נמחקו', v_count;

-- payment_allocations
DELETE FROM payment_allocations WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'payment_allocations: % שורות נמחקו', v_count;

-- document_links
DELETE FROM document_links WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'document_links: % שורות נמחקו', v_count;

-- supplier_return_items
DELETE FROM supplier_return_items WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'supplier_return_items: % שורות נמחקו', v_count;

-- shipment_items
DELETE FROM shipment_items WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'shipment_items: % שורות נמחקו', v_count;

-- goods_receipt_items
DELETE FROM goods_receipt_items WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'goods_receipt_items: % שורות נמחקו', v_count;

-- purchase_order_items
DELETE FROM purchase_order_items WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'purchase_order_items: % שורות נמחקו', v_count;

-- stock_count_items
DELETE FROM stock_count_items WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'stock_count_items: % שורות נמחקו', v_count;

-- prepaid_checks
DELETE FROM prepaid_checks WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'prepaid_checks: % שורות נמחקו', v_count;

-- ocr_extractions
DELETE FROM ocr_extractions WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'ocr_extractions: % שורות נמחקו', v_count;

-- inventory_images
DELETE FROM inventory_images WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'inventory_images: % שורות נמחקו', v_count;

-- inventory_logs
DELETE FROM inventory_logs WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'inventory_logs: % שורות נמחקו', v_count;

-- pending_sales
DELETE FROM pending_sales WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'pending_sales: % שורות נמחקו', v_count;

-- conversation_participants
DELETE FROM conversation_participants WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'conversation_participants: % שורות נמחקו', v_count;

-- ============================================================
-- שכבה 4 — תלויים בשכבה 5 (שכבר נמחקה)
-- ============================================================

-- knowledge_base (self-ref: previous_version_id → NULL first)
UPDATE knowledge_base SET previous_version_id = NULL WHERE tenant_id = v_demo_tenant;
DELETE FROM knowledge_base WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'knowledge_base: % שורות נמחקו', v_count;

-- messages (self-ref: reply_to_id → NULL first)
UPDATE messages SET reply_to_id = NULL WHERE tenant_id = v_demo_tenant;
DELETE FROM messages WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'messages: % שורות נמחקו', v_count;

-- supplier_payments (תלוי ב-payment_allocations שכבר נמחק)
DELETE FROM supplier_payments WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'supplier_payments: % שורות נמחקו', v_count;

-- supplier_documents (self-ref: parent_invoice_id → NULL first)
UPDATE supplier_documents SET parent_invoice_id = NULL WHERE tenant_id = v_demo_tenant;
-- Also null credit_document_id in supplier_returns
UPDATE supplier_returns SET credit_document_id = NULL WHERE tenant_id = v_demo_tenant;
DELETE FROM supplier_documents WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'supplier_documents: % שורות נמחקו', v_count;

-- supplier_returns (תלוי ב-return_items שכבר נמחק)
DELETE FROM supplier_returns WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'supplier_returns: % שורות נמחקו', v_count;

-- ============================================================
-- שכבה 3
-- ============================================================

-- shipments (self-ref: corrects_box_id → NULL first)
UPDATE shipments SET corrects_box_id = NULL WHERE tenant_id = v_demo_tenant;
DELETE FROM shipments WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'shipments: % שורות נמחקו', v_count;

-- goods_receipts
DELETE FROM goods_receipts WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'goods_receipts: % שורות נמחקו', v_count;

-- purchase_orders
DELETE FROM purchase_orders WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'purchase_orders: % שורות נמחקו', v_count;

-- stock_counts
DELETE FROM stock_counts WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'stock_counts: % שורות נמחקו', v_count;

-- sync_log
DELETE FROM sync_log WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'sync_log: % שורות נמחקו', v_count;

-- prepaid_deals
DELETE FROM prepaid_deals WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'prepaid_deals: % שורות נמחקו', v_count;

-- supplier_ocr_templates
DELETE FROM supplier_ocr_templates WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'supplier_ocr_templates: % שורות נמחקו', v_count;

-- conversations
DELETE FROM conversations WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'conversations: % שורות נמחקו', v_count;

-- ============================================================
-- שכבה 2 — inventory, courier_companies
-- ============================================================

-- inventory
DELETE FROM inventory WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'inventory: % שורות נמחקו', v_count;

-- courier_companies
DELETE FROM courier_companies WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'courier_companies: % שורות נמחקו', v_count;

-- ============================================================
-- שכבה 1 — brands, suppliers, employees, config tables
-- ============================================================

-- employee_roles
DELETE FROM employee_roles WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'employee_roles: % שורות נמחקו', v_count;

-- auth_sessions
DELETE FROM auth_sessions WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'auth_sessions: % שורות נמחקו', v_count;

-- ai_agent_config
DELETE FROM ai_agent_config WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'ai_agent_config: % שורות נמחקו', v_count;

-- brands
DELETE FROM brands WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'brands: % שורות נמחקו', v_count;

-- suppliers
DELETE FROM suppliers WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'suppliers: % שורות נמחקו', v_count;

-- employees
DELETE FROM employees WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'employees: % שורות נמחקו', v_count;

-- document_types
DELETE FROM document_types WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'document_types: % שורות נמחקו', v_count;

-- payment_methods
DELETE FROM payment_methods WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'payment_methods: % שורות נמחקו', v_count;

-- currencies
DELETE FROM currencies WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'currencies: % שורות נמחקו', v_count;

-- role_permissions (with tenant_id)
DELETE FROM role_permissions WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'role_permissions: % שורות נמחקו', v_count;

-- permissions (with tenant_id)
-- הערה: permissions.id הוא TEXT PK גלובלי — מוחקים רק אם יש tenant_id
DELETE FROM permissions WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'permissions: % שורות נמחקו', v_count;

-- roles (with tenant_id)
DELETE FROM roles WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'roles: % שורות נמחקו', v_count;

-- watcher_heartbeat
DELETE FROM watcher_heartbeat WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'watcher_heartbeat: % שורות נמחקו', v_count;

-- activity_log (מודול 1.5)
DELETE FROM activity_log WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'activity_log: % שורות נמחקו', v_count;

-- alerts
DELETE FROM alerts WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'alerts: % שורות נמחקו', v_count;

-- weekly_reports
DELETE FROM weekly_reports WHERE tenant_id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'weekly_reports: % שורות נמחקו', v_count;

-- ============================================================
-- שכבה 0 — הדייר עצמו (אחרון!)
-- ============================================================
DELETE FROM tenants WHERE id = v_demo_tenant;
GET DIAGNOSTICS v_count = ROW_COUNT;
RAISE NOTICE 'tenants: % שורות נמחקו', v_count;

-- ============================================================
-- ✅ אימות — ודא שאפס שורות נשארו
-- ============================================================
RAISE NOTICE '';
RAISE NOTICE '═══════════════════════════════════════════════════════════════';
RAISE NOTICE '✅ ניקוי הושלם — מאמת שאפס שורות נשארו...';

PERFORM 1 FROM tenants WHERE slug = 'demo';
IF FOUND THEN
  RAISE EXCEPTION '❌ דייר demo עדיין קיים!';
END IF;

RAISE NOTICE '✅ דייר demo נמחק לחלוטין — אפס שאריות.';
RAISE NOTICE '═══════════════════════════════════════════════════════════════';

END;
$cleanup$;

COMMIT;
