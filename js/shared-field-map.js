// — SUPABASE COMPATIBILITY LAYER —
const FIELD_MAP = {
  inventory: {
    'ברקוד':'barcode','ספק':'supplier_id','חברה / מותג':'brand_id','דגם':'model',
    'גודל':'size','גשר':'bridge','צבע':'color','אורך מוט':'temple_length',
    'סוג מוצר':'product_type','מחיר מכירה':'sell_price','הנחה מכירה %':'sell_discount',
    'מחיר עלות':'cost_price','הנחה עלות %':'cost_discount','כמות':'quantity',
    'סנכרון אתר':'website_sync','סטטוס':'status','סוג מותג':'brand_type',
    'מקור':'origin','הערות':'notes','תמונות':'_images'
  },
  purchase_orders: {
    'מספר הזמנה':'po_number','ספק':'supplier_id','תאריך הזמנה':'order_date',
    'תאריך צפוי הגעה':'expected_date','סטטוס הזמנה':'status','הערות':'notes'
  },
  purchase_order_items: {
    'מספר הזמנה':'po_number','ספק':'supplier_name','חברה / מותג':'brand_name',
    'דגם':'model','גודל':'size','גשר':'bridge','צבע':'color','אורך מוט':'temple_length',
    'סוג מוצר':'product_type','מחיר עלות':'cost_price','הנחה עלות %':'cost_discount',
    'מחיר מכירה':'sell_price','הנחה מכירה %':'sell_discount',
    'סנכרון אתר':'website_sync','סטטוס הזמנה':'item_status'
  },
  sales: {
    'ברקוד':'barcode','כמות':'quantity_sold','מחיר מכירה':'sale_price',
    'תאריך מכירה':'sale_date','הערות':'notes'
  },
  brands: {
    'שם חברה':'name','סוג מותג':'brand_type','סנכרון ברירת מחדל':'default_sync','פעיל':'active','מוחרג מאתר':'exclude_website','מלאי מינימום':'min_stock_qty'
  },
  goods_receipt_items: {
    'החלטת מחיר':'price_decision','סטטוס התאמה ל-PO':'po_match_status','הערה':'note'
  },
  goods_receipts: {
    'מספרי מסמכים':'document_numbers'
  },
  expense_folders: {
    'שם':'name','אייקון':'icon','סדר מיון':'sort_order','פעיל':'is_active'
  },
  supplier_balance_adjustments: {
    'סכום':'amount','סיבה':'reason','בוצע ע"י':'adjusted_by_name'
  },
  suppliers: { 'שם':'name', 'יתרת פתיחה':'opening_balance', 'תאריך יתרת פתיחה':'opening_balance_date', 'הערות יתרת פתיחה':'opening_balance_notes', 'הוגדר ע"י':'opening_balance_set_by', 'דפוס הזמנות רכש':'ai_has_po_pattern' },
  ai_agent_config: {
    'סריקה פעילה':'ocr_enabled','התאמת ספק אוטומטית':'auto_match_supplier',
    'התאמת הזמנה אוטומטית':'auto_match_po','סף ביטחון':'confidence_threshold',
    'התראות פעילות':'alerts_enabled','ימי תזכורת תשלום':'payment_reminder_days',
    'התראת איחור':'overdue_alert','התראת מקדמה':'prepaid_threshold_alert',
    'התראת חריגה':'anomaly_alert','דוח שבועי פעיל':'weekly_report_enabled',
    'יום דוח שבועי':'weekly_report_day','מקור מפתח':'api_key_source',
    'סריקות עד הצעה':'suggest_after_invoices','סריקות עד אוטומטי':'auto_after_invoices',
    'סף דיוק מינימלי':'auto_min_accuracy'
  },
  supplier_ocr_templates: {
    'שם תבנית':'template_name','סוג מסמך':'document_type_code',
    'רמזי חילוץ':'extraction_hints','פעמים בשימוש':'times_used',
    'פעמים תוקן':'times_corrected','אחוז דיוק':'accuracy_rate','פעיל':'is_active',
    'שמות ספק חלופיים':'supplier_name_aliases','שלב למידה':'learning_stage',
    'שדות שהוצעו':'fields_suggested','שדות שאושרו':'fields_accepted'
  },
  ocr_extractions: {
    'קובץ':'file_url','שם קובץ':'file_name','תגובה גולמית':'raw_response',
    'מודל':'model_used','נתונים שחולצו':'extracted_data','ציון ביטחון':'confidence_score',
    'סטטוס':'status','תיקונים':'corrections','זמן עיבוד':'processing_time_ms'
  },
  alerts: {
    'סוג התראה':'alert_type','חומרה':'severity','כותרת':'title',
    'הודעה':'message','סטטוס':'status','סוג ישות':'entity_type',
    'תפוגה':'expires_at','פעולה שננקטה':'action_taken'
  },
  weekly_reports: {
    'תחילת שבוע':'week_start','סוף שבוע':'week_end',
    'נתוני דוח':'report_data','קובץ PDF':'pdf_url'
  },
  supplier_documents: {
    'חתימת קובץ':'file_hash',
    'מזהה אצווה':'batch_id',
    'היסטורי':'is_historical',
    'מספרי מסמכים':'document_numbers',
    'פירוט סכומים':'document_amounts'
  },
  supplier_document_files: {
    'קובץ':'file_url','שם קובץ':'file_name','חתימת קובץ':'file_hash',
    'סדר':'sort_order','מסמך':'document_id'
  },
  pending_sales: {
    'מותג':'brand','דגם':'model','גודל':'size','צבע':'color'
  },
  courier_companies: {
    'איש קשר':'contact_person'
  },
  shipments: {
    'מספר ארגז':'box_number','סוג משלוח':'shipment_type',
    'שם לקוח':'customer_name','טלפון לקוח':'customer_phone','כתובת לקוח':'customer_address',
    'חברת שליחויות':'courier_id','מספר מעקב':'tracking_number',
    'נארז ע"י':'packed_by','תאריך אריזה':'packed_at',
    'תאריך נעילה':'locked_at','ננעל ע"י':'locked_by',
    'מתקן ארגז':'corrects_box_id','מספר פריטים':'items_count','סכום כולל':'total_value'
  },
  shipment_items: {
    'סוג פריט':'item_type','פריט מלאי':'inventory_id','החזרה':'return_id',
    'מספר הזמנה':'order_number','מספר לקוח':'customer_number',
    'קטגוריה':'category','עלות יחידה':'unit_cost'
  },
  crm_leads: {
    'שם מלא':'full_name','טלפון':'phone','אימייל':'email','עיר':'city',
    'שפה':'language','סטטוס':'status','מקור':'source',
    'מקור UTM':'utm_source','אמצעי UTM':'utm_medium','קמפיין UTM':'utm_campaign',
    'תוכן UTM':'utm_content','מונח UTM':'utm_term',
    'הערות לקוח':'client_notes','תנאים מאושרים':'terms_approved',
    'תאריך אישור תנאים':'terms_approved_at','הסכמה שיווקית':'marketing_consent',
    'תאריך הסרה':'unsubscribed_at','טלפון מאומת':'verified_phone'
  },
  crm_events: {
    'מספר אירוע':'event_number','שם אירוע':'name','תאריך אירוע':'event_date',
    'שעת התחלה':'start_time','שעת סיום':'end_time','כתובת':'location_address',
    'קישור Waze':'location_waze_url','סטטוס':'status','תפוסה מקסימלית':'max_capacity',
    'דמי הזמנה':'booking_fee','קופון':'coupon_code',
    'כמות קופונים':'max_coupons','קופונים נוספים':'extra_coupons',
    'קישור טופס הרשמה':'registration_form_url','הערות':'notes'
  },
  crm_lead_notes: {
    'תוכן':'content','אירוע':'event_id','עובד':'employee_id'
  },
  crm_event_attendees: {
    'סטטוס':'status','אופן רישום':'registration_method',
    'תאריך רישום':'registered_at','תאריך אישור':'confirmed_at',
    'שעת כניסה':'checked_in_at','תאריך רכישה':'purchased_at',
    'תאריך ביטול':'cancelled_at','סכום רכישה':'purchase_amount',
    'סטטוס תשלום':'payment_status','תאריך תשלום':'paid_at',
    'נשלח קופון':'coupon_sent','שעה מתוזמנת':'scheduled_time',
    'דרושה בדיקת ראייה':'eye_exam_needed','הערות לקוח':'client_notes'
  },
  // ─── M1 Lens Inventory Phase 1A (2026-05-14) ─────────────────
  lens_brand: {
    'שם':'name','מפורסם':'is_published','סטטוס מחזור חיים':'lifecycle_status'
  },
  lens_design: {
    'מותג':'brand_id','שם':'name','סוג עדשה':'lens_type','חומר':'material',
    'מפורסם':'is_published','סטטוס מחזור חיים':'lifecycle_status'
  },
  lens_variant: {
    'דגם':'design_id','מק"ט':'display_id','אינדקס שבירה':'refractive_index',
    'קוטר (מ"מ)':'diameter_mm','ציפוי':'coating','גוון':'tint',
    'SPH מינ׳':'sph_min','SPH מקס׳':'sph_max','צעד SPH':'sph_step',
    'CYL מינ׳':'cyl_min','CYL מקס׳':'cyl_max','צעד CYL':'cyl_step',
    'ADD מינ׳':'add_min','ADD מקס׳':'add_max','צעד ADD':'add_step',
    'מפורסם':'is_published','גרסה':'version'
  },
  supplier_brand_distribution: {
    'מותג':'brand_id','ספק':'supplier_id','סטטוס':'status',
    'תוקף מ-':'effective_from','תוקף עד':'effective_until','הערות':'notes'
  },
  supplier_catalog_offering: {
    'ספק':'supplier_id','וריאציה':'variant_id','סוג ייצור':'production_type',
    'מחיר':'price_amount','מטבע':'currency_code','כולל מע"מ':'is_vat_inclusive',
    'שיעור מע"מ':'vat_rate_id','קוד SKU של הספק':'supplier_sku_code',
    'רכיבי מחיר':'price_components','סטטוס':'status',
    'תוקף מ-':'effective_from','תוקף עד':'effective_until','הערות':'notes'
  },
  pricing_overlay: {
    'הצעת מסחר':'offering_id','וריאציה':'scope_variant_id',
    'דגם (ברירת מחדל)':'scope_design_id','ספק (ברירת מחדל)':'scope_supplier_id',
    'סוג שכבה':'overlay_type','אחוז הנחה':'discount_pct','סכום קבוע':'fixed_amount',
    'מטבע סכום קבוע':'fixed_amount_currency','כלל ערימה':'stacking_rule',
    'סדר החלה':'application_order','סטטוס':'status',
    'תוקף מ-':'effective_from','תוקף עד':'effective_until',
    'הוצע ע"י':'proposed_by','אושר ע"י':'approved_by','אושר בתאריך':'approved_at','הערות':'notes'
  },
  vat_rates: {
    'קוד מדינה':'country_code','שיעור (%)':'rate_pct',
    'תוקף מ-':'effective_from','תוקף עד':'effective_until',
    'מחליף את':'supersedes_id','הערות':'notes'
  },
  currencies: {
    'קוד מטבע':'code','שם':'name','סמל':'symbol',
    'ספרות עשרוניות':'decimal_digits','פעיל':'is_active','נוצר':'created_at'
  },
  tenant_location: {
    'שם':'name','קוד קצר':'short_code','כתובת':'address',
    'ברירת מחדל':'is_default','פעיל':'is_active','הערות':'notes'
  },
  tenant_active_offerings: {
    'הצעת מסחר':'offering_id','מיקום':'location_id','פעיל':'is_active',
    'הופעל ע"י':'activated_by','הופעל בתאריך':'activated_at','הערות':'notes'
  },
  tenant_lens_stock: {
    'וריאציה':'variant_id','מיקום':'location_id',
    'SPH':'sph','CYL':'cyl','ADD':'add_value',
    'יתרה במלאי':'qty_on_hand','סף הזמנה':'reorder_threshold','כמות הזמנה':'reorder_qty','הערות':'notes'
  },
  stock_lot: {
    'וריאציה':'variant_id','מיקום':'location_id','סוג מקור':'origin_type',
    'הצעת מסחר':'supplier_offering_id','הזמנת רכש':'purchase_order_id',
    'קבלת סחורה':'purchase_receipt_id','אצווה מקורית':'original_lot_id',
    'כמות התקבלה':'qty_received','כמות נותרה':'qty_remaining',
    'מחיר עלות':'unit_cost','מטבע עלות':'unit_cost_currency',
    'שער מט"ח':'fx_rate_snapshot','תאריך שער':'fx_rate_date',
    'מספר אצווה':'lot_number','התקבל בתאריך':'received_at',
    'תאריך תפוגה':'expiry_at','הערות':'notes'
  },
  stock_movement: {
    'אצווה מקור':'source_lot_id','וריאציה':'variant_id','מיקום':'location_id',
    'סוג תנועה':'movement_type','שינוי כמות':'qty_delta',
    'בסיס עלות בתנועה':'cost_basis_at_movement','מע"מ בתנועה':'vat_amount_at_movement',
    'שער מט"ח':'fx_rate_snapshot','הזמנת מכירה':'sale_order_id',
    'החזרת לקוח':'customer_return_id','קבלת סחורה':'purchase_receipt_id',
    'העברה':'transfer_id','התאמה':'adjustment_id','בוצע ע"י':'performed_by','הערות':'notes'
  },
  stock_transfer: {
    'מיקום מקור':'from_location_id','מיקום יעד':'to_location_id',
    'מספר העברה':'transfer_number','סטטוס':'status',
    'וריאציה':'variant_id','כמות שנשלחה':'qty_sent','כמות שהתקבלה בפועל':'actual_received_qty',
    'יזם':'initiated_by','קלט':'received_by',
    'יוזם בתאריך':'initiated_at','התקבל בתאריך':'received_at','הערות':'notes'
  },
  purchase_receipt: {
    'ספק':'supplier_id','מספר קבלה':'receipt_number','הזמנת רכש':'purchase_order_id',
    'מספר תעודת משלוח':'delivery_note_number',
    'תעודת משלוח התקבלה בתאריך':'delivery_note_received_at',
    'סחורה התקבלה בתאריך':'goods_received_at','קישור מסמך סרוק':'scanned_doc_url',
    'קופסת משלוח (M9)':'shipping_box_id','ברקוד ספק על הקופסה':'shipping_box_supplier_barcode',
    'אין תעודה':'has_no_invoice',
    'סטטוס':'status','אישר ע"י':'confirmed_by','אושר בתאריך':'confirmed_at','הערות':'notes'
  },
  purchase_receipt_line: {
    'קבלה':'receipt_id','וריאציה':'variant_id','מיקום':'location_id',
    'SPH':'sph','CYL':'cyl','ADD':'add_value',
    'כמות התקבלה':'qty_received','מחיר עלות':'unit_cost','מטבע עלות':'unit_cost_currency',
    'כמות הוזמנה':'ordered_qty','פער כמות':'discrepancy_qty',
    'סיבת פער':'discrepancy_reason','סטטוס פער':'discrepancy_status',
    'הזמנת מכירה':'sale_order_id','אצווה שנוצרה':'stock_lot_id',
    'תוספת ידנית':'is_manual_addition','הערות':'notes'
  },
  // M1B0 — lens-era purchase_order (singular). Coexists with legacy purchase_orders (plural, frames-era).
  purchase_order: {
    'מספר הזמנה':'po_number','ספק':'supplier_id','סטטוס':'status',
    'תאריך הזמנה':'ordered_at','נשלח לספק בתאריך':'sent_to_supplier_at',
    'תאריך אספקה צפוי':'expected_delivery_at',
    'בוטל בתאריך':'cancelled_at','סיבת ביטול':'cancelled_reason',
    'נוצר ע"י':'created_by','הערות':'notes'
  },
  purchase_order_line: {
    'הזמנת רכש':'purchase_order_id','מספר שורה':'line_number','מקור':'source',
    'וריאציה':'variant_id','הזמנת מכירה':'sale_order_id',
    'SPH':'sph','CYL':'cyl','ADD':'add_value','תיאור ידני':'manual_description',
    'כמות הוזמנה':'qty_ordered','כמות התקבלה':'qty_received',
    'מחיר עלות':'unit_cost','מטבע':'currency_code','שיעור מע"מ':'vat_rate_id'
  },
  supplier_debt: {
    'ספק':'supplier_id','קבלה':'purchase_receipt_id',
    'מספר תעודת משלוח':'delivery_note_number',
    'סכום כולל':'total_amount','סכום מע"מ':'vat_amount','מטבע':'currency_code',
    'סכום ששולם':'paid_amount','סטטוס':'status',
    'נסגר בתאריך':'closed_at','הערות':'notes'
  },
  supplier_permissions: {
    'ספק':'supplier_id','פעולה':'action','רמת הרשאה':'permission_level',
    'תוקף מ-':'effective_from','תוקף עד':'effective_until',
    'הוקצה ע"י':'granted_by','הערות':'notes'
  },
  change_approval_log: {
    'סוג ישות':'entity_type','מזהה ישות':'entity_id','סוג שינוי':'change_type',
    'מצב לפני':'before_state','מצב אחרי':'after_state',
    'הוצע ע"י':'proposed_by','אושר ע"י':'approved_by','אושר בתאריך':'approved_at',
    'סיבת דחייה':'rejection_reason','הערות':'notes'
  },
  // ─── M1 Lens — SPEC M1_LENS_DB_SCHEMA_RECEIPTS_NOTES (2026-05-17) ─────
  lens_variant_notes: {
    'וריאציה':'variant_id','תוכן':'body','מחבר':'author_id'
  }
};

// Build reverse maps (English→Hebrew)
const FIELD_MAP_REV = {};
for (const [tbl, map] of Object.entries(FIELD_MAP)) {
  FIELD_MAP_REV[tbl] = {};
  for (const [he, en] of Object.entries(map)) FIELD_MAP_REV[tbl][en] = he;
}

// --- Enum maps: Hebrew ↔ English ---
const ENUM_MAP = {
  product_type: {'משקפי ראייה':'eyeglasses','משקפי שמש':'sunglasses'},
  status: {'פעיל':'in_stock','במלאי':'in_stock','נמכר':'sold','הוזמן':'ordered','ממתין לברקוד':'pending_barcode','ממתין לתמונות':'pending_images'},
  website_sync: {'מלא':'full','תדמית':'display','לא':'none'},
  brand_type: {'יוקרה':'luxury','מותג':'brand','רגיל':'regular'},
  po_status: {'טיוטה':'draft','הוזמן':'ordered','הגיע חלקית':'partial','הגיע במלואו':'complete'},
  item_status: {'ממתין':'pending','הועבר למלאי':'transferred','לא סופק':'not_supplied'},
  shipment_type: {'מסגור':'framing','זיכוי':'return','תיקון':'repair','משלוח':'delivery'},
  shipment_item_type: {'מלאי':'inventory','הזמנה':'order','תיקון':'repair'},
  shipment_category: {'מסגרת מהמלאי':'stock','הזמנה':'order','ייצור':'production','מולטיפוקל':'multifocal','אופיס':'office','ביפוקל':'bifocal','שמש':'sun','עדשות מגע':'contact','תיקון':'repair'}
};
const ENUM_REV = {};
for (const [cat, map] of Object.entries(ENUM_MAP)) {
  ENUM_REV[cat] = {};
  for (const [he, en] of Object.entries(map)) ENUM_REV[cat][en] = he;
}

function heToEn(cat, val) { return ENUM_MAP[cat]?.[val] ?? val; }
function enToHe(cat, val) { return ENUM_REV[cat]?.[val] ?? val; }

// Determine which enum category a column belongs to
function enumCatForCol(tableName, enCol) {
  if (enCol === 'product_type') return 'product_type';
  if (enCol === 'website_sync') return 'website_sync';
  if (enCol === 'brand_type') return 'brand_type';
  if (tableName === 'inventory' && enCol === 'status') return 'status';
  if (tableName === 'purchase_orders' && enCol === 'status') return 'po_status';
  if (tableName === 'purchase_order_items' && enCol === 'item_status') return 'item_status';
  return null;
}

// --- Supplier & Brand lookup caches ---
let supplierCache = {};   // name → uuid
let supplierCacheRev = {}; // uuid → name
let supplierNumCache = {}; // uuid → supplier_number
let brandCache = {};       // name → uuid
let brandCacheRev = {};    // uuid → name
let brandTypeCache = {};   // uuid → brand_type (populated by loadLookupCaches; powers Inventory B3 filter via brand_id JOIN)
