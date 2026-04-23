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
    'שולם דמי הזמנה':'booking_fee_paid','הוחזר דמי הזמנה':'booking_fee_refunded',
    'נשלח קופון':'coupon_sent','שעה מתוזמנת':'scheduled_time',
    'דרושה בדיקת ראייה':'eye_exam_needed','הערות לקוח':'client_notes'
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
