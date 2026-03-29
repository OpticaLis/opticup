# Optic Up — מודול ניהול מלאי — ROADMAP

> **Authority:** Phase status only. For rules → CLAUDE.md. For code → MODULE_MAP.md. For current status → SESSION_CONTEXT.md.
> **מיקום:** `modules/Module 1 - Inventory Management/ROADMAP.md`
> **עודכן לאחרונה:** מרץ 2026
> **הצ'אט המשני מעדכן את סימוני ✅/⬜ בסוף כל פאזה**

---

## חזון — SaaS לרשתות אופטיקה

Optic Up הוא **פלטפורמת SaaS** לניהול חנויות אופטיקה. כל חנות שמצטרפת מקבלת:

1. **ERP** — מערכת ניהול פנימית (מלאי, הזמנות, ספקים, עובדים)
2. **Storefront** — אתר חנות ממותג ללקוח הקצה (עתידי)

שני המוצרים חולקים **Supabase אחד** עם בידוד מלא באמצעות `tenant_id` על כל טבלה. Storefront קורא רק מ-Views ו-RPC — לעולם לא נוגע בטבלאות ישירות.

**הלקוח הראשון:** אופטיקה פריזמה. אבל כל פאזה נבנית כאילו מחר מצטרפת חנות שנייה.

---

## מה המודול הזה עושה

דמיין חנות אופטיקה עם קיר מלא משקפיים. יש מאות מסגרות — כל אחת שונה: מותג אחר, צבע אחר, גודל אחר. מישהו צריך לדעת בכל רגע: מה יש בקיר, מה נמכר, מה צריך להזמין, וכמה חייבים לספק.

**היום** — הכל מנוהל בתוכנת Access ישנה + קבצי Excel. אין מעקב אמיתי, אין התראות, אין חיבור בין המערכות. כשמסגרת נמכרת — מישהו צריך לזכור לעדכן. כשסחורה חדשה מגיעה — מקלידים ידנית. כשצריך לספור מלאי — יושבים שעות עם דף ועט.

**מה אנחנו בונים** — מערכת אחת שעושה הכל:

### 🏪 ניהול מלאי
כל מסגרת במערכת עם ברקוד ייחודי. אפשר לחפש, לסנן, לראות תמונות. כל שינוי מתועד — מי הוסיף, מי הוריד, מתי ולמה. אם מסגרת נמחקת בטעות — אפשר לשחזר אותה.

### 📋 הזמנות רכש (PO)
כשמותג מתחיל להיגמר — המערכת מתריעה. יוצרים הזמנה לספק בלחיצה, עם כל הפריטים שחסרים. שולחים PDF לספק. כשהסחורה מגיעה — סורקים ומאשרים, והמלאי מתעדכן לבד.

### 📦 קבלת סחורה
סחורה מגיעה מהספק עם תעודת משלוח. סורקים ברקודים, מזינים כמויות, מאשרים — והמלאי מתעדכן. המערכת בודקת: הזמנתי 10, הגיעו 8? מתריעה.

### 📊 ספירת מלאי
פעם בחודש/רבעון — סופרים את המלאי הפיזי. סורקים ברקוד, מקלידים כמות. המערכת משווה לכמות במחשב ומראה דוח פערים. מאשרים — והכל מתעדכן.

### 🔄 סנכרון עם Access
כל עוד תוכנת Access פעילה — שתי המערכות מדברות דרך קבצי Excel אוטומטיים. מסגרת נמכרה ב-Access? תוך שניות זה מעודכן אצלנו. מסגרת חדשה נכנסה אצלנו? Access מקבל את זה.

### 💰 מעקב חובות ספקים
כמה חייבים לכל ספק? מתי צריך לשלם? איזה חשבוניות פתוחות? דשבורד אחד שמראה הכל.

### 🤖 סוכן AI לניהול ספקים
הסוכן סורק חשבוניות אוטומטית (מצלמים PDF → הוא קורא ומזין), מתריע על תשלומים, ומזהה אי-התאמות. מחליף עובד שלם.

### 🌐 פורטל ספקים
הספק נכנס לקישור ורואה מה יש לו במלאי שלנו. בלי להתקשר, בלי לשאול. הוא יודע מה אוזל ומציע לנו סחורה.

---

## מפת פאזות

| פאזה | סטטוס | שם | מה כולל |
|------|--------|----|---------|
| 0 | ✅ | הכנה | פיצול קבצים, CLAUDE.md, min_stock_qty, סידור מבנה |
| 1 | ✅ | הזמנות רכש | PO, קבלות סחורה משופרות, התראות מלאי נמוך |
| 1.5 | ✅ | שיפורים | Cascading dropdowns, two-step wizard, PDF, באגים |
| 2 | ✅ | ספירת מלאי + גשר Access | מסך ספירה עם סורק, Folder Watcher, סנכרון Dropbox |
| 3 | ✅ | הרשאות ואימות | PIN login, תפקידים (5 רמות), הרשאות לפי מודול, ניהול עובדים |
| 3.5 | ✅ | מסך בית + שינוי שם ריפו | index.html → מסך בית, inventory.html, ריפו opticup, session בין דפים |
| 3.75 | ✅ | Multi-Tenancy Foundation | tenant_id על כל הטבלאות, RLS, contracts, תשתית SaaS |
| 3.8 | ✅ | Sticky Header | שם + לוגו חנות בכל המסכים, header.js מודולרי |
| 4 | ✅ | מעקב חובות ספקים | חשבוניות, תשלומים, דשבורד חובות, מט"ח |
| 5 | ✅ | סוכן AI לניהול ספקים | OCR חשבוניות (Claude Vision), התראות, דוחות אוטומטיים |
| 5.5 | ✅ | יציבות, סקייל ואצוות | atomic RPCs, batch upload/OCR, filtering, historical import |
| 5.75 | ✅ | Communications & Knowledge Infrastructure | DB stubs: conversations, participants, messages, knowledge_base, reactions, notification_preferences |
| 5.9 | ✅ | משלוחים וארגזים | shipments.html, ארגזים ממוספרים, 4 סוגים, staged picker, נעילה, manifest, הגדרות |
| QA | ✅ | בדיקות מקיפות — Module 1 Final Certification | ~190 tests (177 PASS), 9 E2E flows, security audit, XSS fixes, permissions expansion (55), settings page, PIN modal, stock count filters, auto credit note, return timeline, 14 bug fixes |
| 7 | ✅ | שיפורי ספירת מלאי | פיצול session.js, atomic delta RPC, עודפים→מלאי, אישור חלקי, צפייה בספירות סגורות |
| 8 | ✅ | OCR בקבלת סחורה + שיפורי פלואו רכש | OCR button בקבלה, item matching review UI, הפרדת תפעול/פיננסים, דוח PO pre-confirm, למידת פריטים ומחירים, יתרת פתיחה לספקים |
| 8-QA | ✅ | סקירת פלואו + תיקון באגים + תשתית | OCR fixes, 9 flow reviews, 13+ bugs fixed, multi-file support, tenant isolation, Access sync restriction, editable items, full doc management in supplier detail |
| Flow-Review-2 | ✅ | סקירת פלואו + תיקונים + סגירת מעגל | חובת מסמך, atomic rollback, badges ויזואליים, חשבוניות נכנסות, תצוגת פריטים, 6 באגים |
| Flow-Review-3 | ✅ | Tenant + תמונות + remove.bg + barcode refactor + PO improvements + product type | 25 commits: tenant hardening, frame images (camera/WEBP/remove.bg+Canvas), file splits, barcode one-per-product, PO sell prices/brand filter/summary, product type flow (PO->receipt->inventory), editable product type, receipt improvements |
| Flow-Review-4 | ✅ | סקירת פלואו + תיקונים + expense folders + sort + images | 18 fixes: 3 bugs (brand validation, image race, receipt-debt), PO notes, stock count columns, expense folders CRUD, general invoices, combined dropdown, receipt notes/doc numbers/edit details, image navigation, column sorting (shared utility), camera in receipts, bulk edit expansion, resizable columns |
| Debt-Upgrades | ✅ | שדרוג מודול חובות + AI חכם | 11 commits: supplier filters (type/history/debt), month picker, amount filters, payment flow fix (pre-select docs), multi-select payment, prepaid progress display (used/total), doc count expand, full doc editing (supplier change, status, amounts), receipt header redesign (field order, doc count, PO indicator), AI supplier auto-detect + alias learning, AI PO auto-match + discrepancy highlighting, doc type auto-detect + learning |
| 6 | 🚫 נדחה | פורטל ספקים — ייבנה במודול עתידי | גישת ספק חיצונית, view-only מלאי לפי ספק |

---

## פירוט כל פאזה

### פאזה 0 ✅ — הכנה
- פיצול index.html לקבצי JS נפרדים (shared, inventory-core, entry, goods-receipt, audit-log, brands-suppliers, purchase-orders, admin)
- יצירת CLAUDE.md (חוקה טכנית)
- הוספת min_stock_qty לטבלת brands
- הסרת contact_lenses מ-product_type
- סידור archive

### פאזה 1 ✅ — הזמנות רכש + קבלות משופרות
- טבלאות DB: purchase_orders, purchase_order_items
- מסך רשימת POs עם כרטיסי סיכום
- טופס יצירת PO (two-step wizard)
- חיבור goods_receipt ל-PO (טעינה אוטומטית של פריטים)
- זיהוי אי-התאמות (הזמנתי X, הגיעו Y)
- התראות מלאי נמוך ברמת מותג
- PO statuses: draft → sent → partial → received / cancelled

### פאזה 1.5 ✅ — שיפורים ותיקונים
- Cascading dropdowns (מותג → דגם → גודל + צבע)
- Excel barcode-first flow בהכנסת מלאי
- היסטוריית הכנסות לפי תאריך
- הורדת מלאי עם PIN + סיבות
- ייצוא PO ל-Excel + PDF
- מספור ספקים ייחודי
- תיקוני באגים בקבלת סחורה

### פאזה 2 ✅ — ספירת מלאי + גשר Access
**ספירת מלאי:**
- טבלאות DB: stock_counts, stock_count_items
- מסך ספירה: סריקת ברקוד → הזנת כמות → דוח פערים
- אישור עם PIN → עדכון כמויות + writeLog
- ייצוא דוח ל-Excel

**גשר Access:**
- Node.js Folder Watcher שצופה על תיקיית Dropbox
- קליטת Excel מכירות → עדכון כמויות אוטומטי
- מסך "ממתינים להורדה" לברקודים לא מזוהים
- ייצוא מלאי חדש ל-Access (כפתור download)
- טאב סנכרון עם לוג ו-fallback ידני
- Windows Service עם auto-restart + הגנות

### פאזה 3 ✅ — הרשאות ואימות
- PIN login (5 ספרות) לכל עובד עם הגנת נעילה
- 5 תפקידים: מנכ"ל, מנהל, ראש צוות, עובד, צופה
- טבלאות: roles, permissions, role_permissions, employee_roles, auth_sessions
- מנוע הרשאות: hasPermission / requirePermission / applyUIPermissions
- מסך התחברות (PIN boxes), session 8 שעות
- מסך ניהול עובדים: הוספה, עריכה, שיוך תפקיד
- מטריצת הרשאות ניתנת לעריכה (CEO/מנהל)
- פירוט מלא: `docs/PHASE_3_SPEC.md`

### פאזה 3.5 ✅ — מסך בית + שינוי שם ריפו
- index.html הופך למסך בית: PIN login + כרטיסי מודולים
- האפליקציה הנוכחית עוברת ל-inventory.html
- ריפו משנה שם: prizma-inventory → opticup
- URL חדש: app.opticalis.co.il
- Session עובר בין דפים דרך sessionStorage
- פירוט מלא: `docs/PHASE_3.5_SPEC.md`

### פאזה 3.75 ✅ — Multi-Tenancy Foundation
- טבלת tenants + seed של אופטיקה פריזמה כ-tenant ראשון
- הוספת tenant_id UUID NOT NULL לכל הטבלאות הקיימות (~22 טבלאות)
- Backfill כל השורות הקיימות עם tenant_id של פריזמה
- RLS tenant isolation policy על כל הטבלאות
- עדכון כל ה-JS: tenant_id בכל insert/select
- יצירת RPC functions כחוזים בין מודולים
- אינדקסים: tenant_id + composite indexes על שדות שכיחים
- פאזת אפס-פיצ'רים: אין UI חדש, רק תשתית
- פירוט מלא: `docs/PHASE_3.75_SPEC.md`

### פאזה 3.8 ✅ — Sticky Header
- קובץ js/header.js חדש — טוען שם + לוגו מטבלת tenants
- קובץ css/header.css חדש — עיצוב header (sticky, RTL, responsive)
- Header אחיד בכל המסכים (index.html, inventory.html, employees.html)
- שם "Optic Up" קבוע — לוגו + שם חנות ניתנים לשינוי ע"י בעל המנוי
- מודולרי — דף חדש בעתיד = שורת script + link אחד

### פאזה 4 ✅ — מעקב חובות ספקים
- 11 טבלאות DB חדשות: document_types, payment_methods, currencies, supplier_documents, document_links, supplier_payments, payment_allocations, prepaid_deals, prepaid_checks, supplier_returns, supplier_return_items
- 7 עמודות חדשות על suppliers (payment_terms_days, withholding_tax_rate, ועוד)
- דף suppliers-debt.html חדש עם 4 טאבים: ספקים, מסמכים, תשלומים, עסקאות מקדמה
- דשבורד חובות: סיכום חוב כולל, מגיע השבוע, באיחור, שולם החודש
- ניהול מסמכים: CRUD, מספור פנימי אוטומטי, קישור תעודות משלוח לחשבוניות
- אשף תשלומים 4 שלבים: בחירת ספק, פרטי תשלום (כולל ניכוי מס), הקצאה למסמכים (FIFO), אישור עם PIN
- עסקאות מקדמה: ניהול שיקים, ניכוי אוטומטי מקבלת סחורה
- צפייה בפרטי ספק: טיימליין, מסמכים, תשלומים, זיכויים — slide-in panel
- החזרות לספק: יצירה מתוך מלאי (invSelected), ניהול סטטוסים
- קבלת סחורה משופרת: יצירת מסמך ספק אוטומטית באישור, ברקוד חובה, מדריך לעובד
- 9 קבצי JS חדשים ב-modules/suppliers-debt/
- inventory-return.js חדש ב-modules/inventory/
- receipt-confirm.js + receipt-debt.js חדשים ב-modules/goods-receipts/

### פאזה 5 ✅ — סוכן AI לניהול ספקים
- OCR חשבוניות: העלאת PDF/תמונה → Claude Vision API → JSON
- מילוי אוטומטי של supplier_invoices
- מנגנון למידה מתיקוני משתמש (per tenant)
- התראות תשלום אוטומטיות
- זיהוי אי-התאמות (חשבונית ≠ PO ≠ קבלה)
- דוח שבועי אוטומטי
- ai_agent_config per tenant

### פאזה 5.5 ✅ — יציבות, סקייל ואצוות
- Atomic RPCs: next_internal_doc_number, update_ocr_template_stats
- batchWriteLog לכתיבת לוגים מרובים
- validateOCRData — 7 כללי ולידציה עסקית
- pg_cron job יומי להתראות (05:00 UTC)
- סינון מסמכים מתקדם (8 קריטריונים, מועדפים שמורים)
- העלאת מסמכים מרובים (drag-drop, dedup בזמן אמת)
- סריקת OCR מרובה עם pipelining ו-resume
- ייבוא היסטורי — מסמכים ישנים ללמידת AI
- 3 עמודות חדשות: file_hash, batch_id, is_historical
- 3 אינדקסים חדשים, 2 RPC functions חדשות

### פאזה 5.75 ✅ — Communications & Knowledge Infrastructure
- Zero-UI phase — database stubs only (like Phase 3.75)
- 6 new tables: conversations, conversation_participants, messages, knowledge_base, message_reactions, notification_preferences
- Foundation for future internal messaging, AI assistant, supplier/customer communications
- All tables with tenant_id, RLS, service_bypass
- 20 custom indexes including GIN on knowledge_base.tags
- No JS, no UI, no Edge Functions — tables start empty

### פאזה 5.9 ✅ — משלוחים וארגזים
- 3 טבלאות DB חדשות: courier_companies, shipments, shipment_items
- RPC: next_box_number (SECURITY DEFINER, atomic box number generation)
- 5 עמודות חדשות על tenants: shipment_lock_minutes, box_number_prefix, require_tracking_before_lock, auto_print_on_lock, shipment_config (JSONB)
- דף shipments.html חדש עם רשימת ארגזים, פילטרים, חיפוש
- אשף יצירת ארגז 3 שלבים: סוג ארגז → פריטים → שלב סיום (שליחות + הערות)
- 4 סוגי ארגזים: מסגור, זיכוי, תיקון, משלוח
- Staged return picker — בחירת פריטי זיכוי ממתינים אוטומטית
- מערכת נעילה: טיימר קונפיגורבילי, נעילה אוטומטית, ארגז תיקון
- פאנל פרטי ארגז (slide-in) + הדפסת manifest
- ניהול חברות שליחויות (CRUD) + הגדרות משלוח (4 שדות)
- JSONB config: field visibility per box type, categories, custom fields, step 3 validation
- הגדרות שדות ארגז UI — 3 תתי-סעיפים מתקפלים
- כרטיס מסך בית + 5 הרשאות: shipments.view/create/edit/lock/settings
- 9 קבצי JS ב-modules/shipments/ (~2,258 שורות)

### פאזה 7 ✅ — שיפורי ספירת מלאי
- פיצול stock-count-session.js (871→2 קבצים)
- Atomic Delta RPC — counted_qty + FOR UPDATE lock, מונע race conditions
- עודפים: unknown items → modal עריכה → הוספה למלאי (2 מסלולי ברקוד)
- Reason per discrepancy + אישור חלקי (approve/skip per item)
- צפייה בספירות סגורות — read-only panel + Excel export
- פירוט מלא: `docs/PHASE_7_SPEC_UPDATED.md`

### פאזה 8 ✅ — OCR בקבלת סחורה + שיפורי פלואו רכש
- כפתור "סרוק עם AI" בקבלת סחורה + auto-fill שדות (ספק, מספר מסמך, תאריך, סוג)
- Per-field confidence indicators (ירוק/צהוב/אדום) על כל שדה שמולא ע"י AI
- Item matching review UI: parsed description → match inventory → modal סקירה (matched/new/unknown)
- PO auto-suggestion מתוך OCR + חיבור אוטומטי להזמנה פתוחה
- הפרדת תפעול/פיננסים: קיזוז מקדמה עבר ל-suppliers-debt עם alert למנהל כספים
- Badge "מקדמה" + כפתור "קזז מעסקה" על מסמכי ספק (PIN verified)
- דוח השוואה מול PO לפני אישור: matched/shortage/price gap/not-in-PO/missing
- החלטות מחיר per-item (PO vs חשבונית) + החזרה אוטומטית לספק
- Item matching learning: brand corrections + item aliases נשמרים ב-OCR templates
- Price pattern learning: זיהוי אוטומטי של ספקים שמציינים מחירים כולל מע"מ
- יתרת פתיחה לספקים: סכום + תאריך cutoff + שילוב בדשבורד חובות
- 2 קבצים חדשים: receipt-ocr-review.js, receipt-po-compare.js
- 2 מיגרציות: 036 (price_decision, po_match_status), 037 (opening balance)
- פירוט מלא: `docs/PHASE_8_SPEC.md`

### פאזה 8-QA ✅ — סקירת פלואו + תיקון באגים + תשתית
- סקירת 9 תהליכים עסקיים (כל הפלואווים מקצה לקצה)
- 13+ תיקוני באגים (תשלומים, מע"מ, PO dropdown, OCR)
- בידוד tenant קשיח: slug change → sessionStorage.clear() + re-login
- הגבלת Access sync לפריזמה בלבד (UI + watcher)
- תמיכת מולטי-קבצים: טבלת supplier_document_files, גלריה, "צרף עוד"
- סריקת OCR בצירוף קבצים נוספים (שמור בלבד / שמור וסרוק)
- ניהול מסמכים מלא בכרטיס ספק (כל הכפתורים)
- פריטים ניתנים לעריכה במודל צפייה (כמות, מחיר, הנחה, סה"כ)
- תיקון OCR duplicate key (UPDATE רק שדות פיננסיים, לא identity)
- PO dropdown — חזרה ל-native select (createSearchSelect broke)
- פיצול: debt-documents.js → debt-doc-new.js, debt-doc-items.js חדש
- מיגרציה: 040 (supplier_document_files)
- פירוט מלא: SESSION_CONTEXT.md

### פאזה Flow-Review-2 ✅ — סקירת פלואו + תיקונים + סגירת מעגל תיעוד
- **DB:** migration 046 — pending_invoice status, missing_price column, goods_receipt_id UNIQUE index
- **קבלת סחורה:** חסימת confirm בלי קובץ (hard block), מסמך ספק גם עם subtotal=0 (missing_price flag), atomic confirm עם compensating rollback
- **מעקב חובות:** badges ויזואליים (📦 קבלה / ✏️ ידני / ⚠️ חסר מחיר), OCR רק על מסמכים עצמאיים, סכומים readonly על מסמך מקבלה, cascade settlement notification
- **סגירת מעגל:** לשונית "חשבוניות נכנסות" ב-inventory (pending_invoice status), banner "לטיפול" ב-debt dashboard, תצוגת פריטי קבלה על מסמך, לינק "מסמך כניסה" בכרטיס פריט
- **באגים:** C1 supplier docs filter fix, C2 file gallery delete, C3 OCR icon refresh, PO searchable dropdown, PO comparison back button, prepaid deduction validation, OCR stub cleanup
- **1 קובץ חדש:** modules/inventory/incoming-invoices.js (255 שורות)
- **7 commits**

### פאזה 6 🚫 נדחה — פורטל ספקים (ייבנה במודול עתידי)
- קישור ייחודי לכל ספק (token-based auth, לא PIN)
- צפייה read-only: רק הפריטים של הספק הספציפי
- בלי מחירים (רק מה קיים + כמויות)
- קורא מ-Views בלבד — לא מטבלאות ישירות
- הרשאות per-tenant per-supplier (JSONB permissions)
- בעתיד: ספק יכול להציע מלאי / לאשר הזמנות

---

## כללי ברזל

כללי הפיתוח וה-SaaS מוגדרים ב-CLAUDE.md בלבד.

---

## קבצי תיעוד של המודול

ניהול התיעוד מוגדר ב-CLAUDE.md (סעיף Documentation Files — Paths & Rules).
