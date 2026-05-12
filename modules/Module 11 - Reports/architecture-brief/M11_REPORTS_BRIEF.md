# M11 — Reports — Architecture Brief

**גרסה:** v1
**מעמד:** Brief סגור — מוכן ל-Module Strategist
**נכתב:** 2026-05-09
**מחבר:** Architect (Tier 2)
**מבוסס על:** סשן-תכנון 2026-05-09, 22 החלטות נעולות + 5 חיזוקי-מודולריות + 3 סקיצות

---

## 1. ייעוד (Mission)

M11 הוא **שכבת-התצוגה האחידה לדוחות** של Optic Up. הוא לא בעלים של נתונים — הוא הקריאה-המאוחדת מ-Views של מודולים אחרים, ומגיש לצוות חוויה אחידה: ניווט-לפי-קטגוריה, עריכת-דוח (עמודות/סינונים/פילוח), תצוגה (טבלה + סיכומים + KPIs), ייצוא Excel/PDF.

**הקשר-עסקי:** ב-OpticPlus היו 123 דוחות קבועים-בקוד + 14 macros של Excel — הצוות חי בעולם של גלעין-נתונים-מבודד. ב-M11 אנחנו מחליפים את ה"123 דוחות-קוד" בתשתית-תבניות שטננט בעל-בית-של-עצמו: יש default-set שמועבר עם המערכת, רוב הדוחות ניתנים לעריכה, יש "+ דוח חדש".

**מטרת-LIVE:** ביום-1, פריזמה רואה 5-10 דוחות-default + יכולת לערוך ולהוסיף. השאר deferred ל-post-LIVE.

---

## 2. עיקרי-Architecture

### 2.1 שכבה, לא בעלים

M11 = **שכבת-תצוגה**, אינו מאחסן נתוני-עסק. כל דוח קורא מ-Views של מודולים-אחרים בזמן-פתיחה (חישוב חי). אין caching, אין aggregations מועתקות, אין כפילות-נתונים. אם ביצועים יכשלו בפועל אחרי-LIVE — נחזור ונכניס caching נקודתי.

### 2.2 דוח = תבנית-פתוחה

דוח אינו פריט-קבוע-בקוד. הוא רשומה בטבלה `reports` שמתארת:
- שם, תיאור, קטגוריה, נראות
- בחירת-עמודות (מתוך ה-View של המודול)
- סינונים (filter expressions)
- פילוח (group by) ומיון (sort)
- סיכומים (sum/count/avg per column)
- סוג-תצוגה (`view_type` — ביום-1 רק `table`, ראה §6.1)

טננט יכול לערוך, להעתיק, או ליצור-מאפס.

### 2.3 שלוש כיווניות של בעלות

| מקור | בעל-בית | עריכה | מחיקה |
|---|---|---|---|
| `system` (default) | הפלטפורמה | אסור (יוצר עותק-טננט) | אסור |
| `tenant_modified` (עותק של default) | הטננט | מותר (overrides default) | מותר (חוזר ל-default) |
| `tenant_new` (חדש לגמרי) | הטננט | מותר | מותר |

ב-UI: עותק-של-default **מסתיר** את ה-default ברשימה. כפתור "↺ החזר ל-default" מוחק את העותק וחושף שוב את ה-default.

### 2.4 קטגוריות

קטגוריות הן רשומות בטבלה (configurable per-tenant), לא enum. seed כולל: מכירות-וכספים, לקוחות-ו-LTV, מלאי, מעבדה, CRM-ולידים, בדיקות-ראייה-ו-Recall, מועדון-חברים. טננט יכול להוסיף, לערוך-שם, לסדר-מחדש, להחביא.

### 2.5 נראות (משותף vs פרטי)

ברירת-מחדל = `shared` (משותף-לטננט). אופציה `private` (פרטי-לי) בעת-יצירה. דוח-פרטי גלוי רק ליוצרו.

---

## 3. ישויות (Entities)

> **חוק-הזהב:** Module Strategist יקבע שמות-טבלאות, שמות-עמודות וטיפוסים. כאן יש רק תיאור-עסקי-מובנה.

### 3.1 `reports`
דוח. שדות-מינימום: id, tenant_id, source (`system` / `tenant_modified` / `tenant_new`), category_id, name, description, visibility (`shared` / `private`), owner_user_id, view_type (default `table`), is_default, base_default_report_id (FK עצמי לעותקים, NULL ל-default ולחדש), created_at, updated_at, is_deleted.

### 3.2 `report_categories`
קטגוריה. שדות: id, tenant_id (NULL = system), code, name, sort_order, icon, is_system, is_active, is_deleted. Pattern 13 — שורות-system + שורות-טננט באותה טבלה.

### 3.3 `report_columns`
עמודות נבחרות לכל דוח. שדות: report_id, source_module (M5/M6/M7/M8/M9/M1/M4), source_field, display_name, sort_order, is_visible, summary_function (NULL / `sum` / `count` / `count_distinct` / `avg` / `min` / `max`).

### 3.4 `report_filters`
סינוני-דוח. שדות: report_id, source_module, source_field, operator (`equals` / `between` / `in` / `gt` / `lt` / `like` / `is_null`), value_jsonb, is_active.

### 3.5 `report_grouping`
פילוח ומיון. שדות: report_id, group_by_field, sort_by_field, sort_direction.

### 3.6 `report_actions` (מודולרי, ראה §6.3)
פעולות-עדכון מותרות מתוך הדוח. שדות: report_id, action_type (`mark_field`), source_module, target_rpc, target_field, button_label, allowed_in_bulk. ביום-1 רק "✓ נוכה" של M8 — RPC=mark_payment_deducted.

### 3.7 `report_role_access`
שכבת-1 של הרשאות. שדות: tenant_id, role_id, category_id, can_view, can_edit, can_export. ננעל במטריצת M2.

### 3.8 `report_role_overrides`
שכבת-2 של הרשאות (חריגי-דוח-בודד). שדות: tenant_id, role_id, report_id, can_view (override).

### 3.9 `report_export_log`
לוג-ייצוא. **לא ייעודי** — נכנס ל-`activity_log` הקיים של M1.5 (Iron Rule 21). פעולה: `report.exported`. כולל: report_id, format (`excel` / `pdf` / `print`), row_count, user_id, timestamp.

---

## 4. חוזים מול מודולים אחרים

### 4.1 כל-מודול-חוצה חייב לחשוף View ל-M11

חוק-יסוד: View אחת רחבה לכל מודול, בעלות-המודול, שמירת-תאימות-לאחור. שם-מוסכם: `v_<module>_for_reports`.

| מודול | View | סטטוס |
|---|---|---|
| M5 (Customers) | `v_customers_for_reports` | יוסף ב-SPEC של M5 |
| M6 (Prescriptions) | `v_prescriptions_for_reports` | יוסף ב-SPEC של M6 |
| M7 (Orders) | `v_orders_for_reports` | ✅ ננעל ב-M7 Brief |
| M8 (Payments) | `v_payments_for_reports` | ✅ ננעל ב-M8 Brief |
| M1 (Inventory) | `v_inventory_for_reports` | יוסף לרוודמאפ של M1 |
| M4 (CRM) | `v_crm_for_reports` | יוסף לרוודמאפ של M4 |
| M9 (Lab) | `v_lab_for_reports` | יוסף ל-SPEC של M9 |
| M13 (Loyalty) | `v_loyalty_for_reports` | יוסף ל-SPEC של M13 |

**דרישות-מינימום מכל View:**
- כוללת `tenant_id`, `created_at`, `updated_at`, `is_deleted` (basis לסינון של כל דוח-עתידי)
- בידוד-טננט מובטח באותו מנגנון של שאר המערכת
- שינוי = הוספת-עמודות בלבד; עמודה קיימת לא נמחקת ולא משנה-טיפוס בלי תיאום ל-M11

### 4.2 חוזה-עדכון: RPC-בלבד, לא write ישיר

M11 לעולם לא כותב לטבלאות של מודול-אחר. עדכון-דרך-דוח (כמו "✓ נוכה") עובר דרך RPC ייעודי שהמודול חושף. דפוס-RPC: `update_<entity>_<action>(record_id, ...payload, user_id)` — בעלי-הנתונים אחראים על audit, validation, RLS.

| מודול | RPC חשוף | מטרה |
|---|---|---|
| M8 | `mark_payment_deducted(payment_id, user_id)` | "✓ נוכה" — סימון תשלום-ירד-ממשכורת | ✅ נעול ב-M8 |

עתידיים (לא ביום-1): סימון-recall-טופל ב-M6, סימון-נשלח ב-M9, וכו'. כל RPC-חדש מתווסף לטבלת `report_actions` של M11 — קוד-M11 לא משתנה.

### 4.3 חוזה-LTV (cross-module)

LTV מאחד M5 + M7 + M8. ביום-1 = JOIN חי של 3 ה-Views, חישוב-בכל-פתיחה. אם ביצועים יחייבו — נשקול aggregation-table ב-M11 בעתיד, **לא** דרישה ממודולים-אחרים.

### 4.4 חוזה-קיצור-דרך מתוך מודולים-אחרים

כל מודול-מקורי מקבל כפתור "📊 דוחות" בכותרת-המסך שלו. הכפתור פותח את M11 עם הקטגוריה הרלוונטית מסומנת. דפוס-URL: `/reports?category=<cat_code>`. מומש בצד-המודול-המקורי, ה-URL הוא החוזה.

---

## 5. דפוסי-עיצוב

### 5.1 Pattern 13 — system rows + tenant rows
חוזר ב-`report_categories` ובכל הקונפיגורציה: `is_system boolean` מסמן שורות-מערכת (ננעלות, ניתנות לעריכת-שם/צבע בלבד) לעומת שורות-טננט (חופשיות).

### 5.2 Pattern 19 — configuration-driven
קטגוריות, פעולות-דוח, תפקידים — הכל בטבלאות, לא enum. `view_type`, `summary_function`, `operator` הם enum כי הם state-machine פנימי של ה-engine.

### 5.3 Pattern 20 — Iron Rule 21 (no orphans)
לוג-ייצוא נכנס ל-`activity_log` הקיים, לא לוג חדש. דוחות-מלאי תחת קטגוריית-מלאי במקום מסך-נפרד.

### 5.4 דפוס-קיצור-דרך (Pattern חדש)
**שני-נתיבים-לאותו-מסך:** מסך-נווט-ראשי + כפתור-קיצור-דרך מהקשר-עבודה. דפוס שמופיע גם במודולים-אחרים (M5 customer card → M7 פתיחת-הזמנה). ל-M11 הוא בסיסי כי דוחות חוצים-מודולים.

### 5.5 דפוס-תבנית-PDF data-driven (חיזוק-מודולריות #4)
ה-PDF generator מקבל JSON-שורת-דוח: `{ tenant_branding, report_meta, columns, rows, summaries, filters_applied }` ומרכיב PDF. תבנית-יחידה ביום-1, אבל המבנה data-driven מאפשר בעתיד `tenant_pdf_template_id` בלי לשנות את ה-engine.

### 5.6 דפוס-view_type הרחבה (חיזוק-מודולריות #1)
שדה `view_type` ב-`reports` תומך ב-`table` / `chart` / `pivot` / `dashboard`. ביום-1 רק `table` פעיל; השאר חסומים ב-UI עם 🔒. הרחבה עתידית = הסרת חסימה + תוסף-renderer ב-front-end. אין שינוי-מבנה ב-DB.

### 5.7 דפוס-action פלטפורמה (חיזוק-מודולריות #3)
פעולת-עדכון-מתוך-דוח אינה hard-coded ל-"✓ נוכה". טבלת `report_actions` מקבלת `action_type` + `target_rpc`, ו-M11 generic-handler קורא ל-RPC. כל פעולה-חדשה = שורה חדשה + RPC חדש בצד-המודול-המקורי. ה-engine של M11 לא משתנה.

---

## 6. סיכוני-Modularity וחיזוקים

| # | סיכון | חיזוק |
|---|---|---|
| 1 | "טבלה" בלבד — נכלא בעתיד | `view_type` enum רחב, חסימה ב-UI ביום-1 (§5.6) |
| 2 | View-לכל-מודול תיקרס בשינוי | metadata חובה (tenant_id, timestamps, is_deleted) + שינוי-בעקרון-additive (§4.1) |
| 3 | "✓ נוכה" יצריך re-design לכל פעולה-עתידית | טבלת actions גנרית (§5.7) |
| 4 | תבנית-PDF אחידה תקריסה לטננט-2 | Data-driven JSON-template (§5.5) |
| 5 | הרשאות לא-מספיקות לטננט-עתידי | מטריצה דו-שכבתית (קטגוריה + override-דוח-בודד) (§3.7-3.8) |

---

## 7. הרשאות

### 7.1 שכבת-1: לפי-קטגוריה (ברירת-מחדל)
טבלת `report_role_access`. תפקיד × קטגוריה × {can_view, can_edit, can_export}. מנהל-טננט מנהל את המטריצה ב-M2.

### 7.2 שכבת-2: חריגי-דוח-בודד
טבלת `report_role_overrides`. תפקיד × דוח × can_view (override). שימוש: דוחות-רגישים (LTV, ירד-ממשכורת) שצריך להחביא מתפקידים-מסוימים בלי להוציא אותם מהקטגוריה.

### 7.3 הרשאת-מטא
"מנהל-דוחות" = הרשאה ייעודית במטריצת M2: יכול ליצור/לערוך/למחוק דוחות-משותפים, לנהל קטגוריות, לנהל את שתי שכבות-ההרשאות.

---

## 8. בידוד-טננט

מהווה עיקרון-מחייב, אינו דורש פתרון חדש. כל View מסננת tenant_id דרך ה-JWT-של-המשתמש (אותו מנגנון שעובד בכל מודול), כל JOIN שדוח חוצה-מודול עושה נשאר תחת אותו filter. Defense-in-depth: שכבת-RPC לעדכונים גם היא תחת RLS.

---

## 9. ייצוא ו-PDF

### 9.1 Excel — פורמט עשיר
ייצוא ל-`.xlsx` עם:
- כותרת-tenant + לוגו (מ-tenant config)
- header-row מעוצב (bold, רקע)
- עמודות מספריות עם פורמט-מספרי
- שורת-סיכום-תחתונה מודגשת
- pivot-headers אם יש grouping (Excel native grouping)

### 9.2 PDF — תבנית אחידה ממותגת
תבנית-יחידה ביום-1, RTL, עברית מלאה, data-driven (§5.5). מבנה: header (לוגו-tenant + שם-דוח + תאריך), filters-applied strip, table, summary row, footer (מס-עמוד + הופק-על-ידי + תאריך-הפקה).

### 9.3 חד-פעמי, לא נשמר
הקובץ יורד למחשב-המשתמש. **לא נשמר ב-ERP**. שמירה דורשת אחסון ועלייה הדרגתית — deferred. הלוג נשמר ב-`activity_log` (פעולה: `report.exported`), כולל metadata (איזה דוח, פורמט, מספר-שורות, מי, מתי).

### 9.4 הדפסה
דרך כפתור "🖨 הדפס" — מייצר את אותו PDF ושולח ל-print-dialog של הדפדפן.

---

## 10. תזמון (Scheduling) — Deferred

תזמון-דוחות (אימייל-יומי, אימייל-חודשי) **אינו** ב-day-1. דורש:
- Edge Function + cron
- מנגנון-אימייל-יוצא (אינטגרציה למודול-תקשורת M12 או SendGrid/AWS-SES)
- טיפול-בכשלי-שליחה
- ניהול-מנויים פר-משתמש

ב-OpticPlus אין דבר-כזה, אז לא רגרסיה. מתוכנן ל-post-LIVE כמודול-משלים (יכול להיות חלק מ-M12 או extension של M11).

---

## 11. UX — שלוש סקיצות

### 11.1 Reports List (`M11_REPORTS_LIST_MOCKUP.html`)
מסך-הכניסה. sidebar שמאלי = קטגוריות + תצוגות-מהירות (מועדפים, שימוש-לאחרונה, פרטי שלי, יצרתי). אזור-מרכזי = רשימת-דוחות עם badges מקור, חיפוש, סינון לפי-מקור, "+ דוח חדש". כפתור גלובלי "🔐 הרשאות דוחות" ל-מנהל.

### 11.2 Report Editor (`M11_REPORT_EDITOR_MOCKUP.html`)
4 בלוקים ממוספרים:
1. פרטי-דוח (שם, תיאור, קטגוריה, נראות, view_type)
2. בחירת-עמודות (drag-and-drop משמאל-לימין; עמודות-זמינות מצוינות במקור-המודול)
3. סינונים (שדה × אופרטור × ערך — חזרה דינמית)
4. פילוח וסיכומים (group by + sort + summary functions per column)

צד-ימין = תצוגה-מקדימה-חיה (5 שורות) + meta + כפתור "↺ החזר ל-default" עם warning.

### 11.3 Report View (`M11_REPORT_VIEW_MOCKUP.html`)
תצוגת-דוח חיה. KPIs בראש (4 כרטיסים), filter-strip של סינונים-פעילים, toolbar (group-by/sort/חיפוש), טבלה עם group-headers קולפסביליים, סיכומי-קבוצה + סיכום-סוף, bulk-action-bar (כשנבחרות שורות) — לדוגמה "✓ סמן כ-נוכה". צד-ימין = ייצוא Excel/PDF + פרטי-דוח + הסבר-RPC.

---

## 12. Day-1 vs Deferred (Pattern P17)

### 12.1 Day-1 (חובה ל-LIVE)

**תשתית:**
- 9 הטבלאות מ-§3 + RLS + ה-RPC `mark_payment_deducted`
- View-יסוד מ-M5/M7/M8 (M6/M1/M4/M9/M13 מתווספים בזמן בנייתם)
- engine ה-renderer של table/filters/grouping/summary
- Excel exporter פורמט-עשיר
- PDF generator data-driven תבנית-יחידה
- 3 מסכים: רשימה, עריכה, תצוגה
- 2 שכבות הרשאה (קטגוריה + חריגי-דוח)
- כפתורי קיצור-דרך מתוך מודולים-אחרים (חוזה-URL, מומש בצד-המודול)

**Default reports (5-10):**
1. סוף-יום-קופה (מ-M8)
2. מכירות חודשי (מ-M7+M8)
3. מכירות שנתי (מ-M7+M8)
4. ירד-ממשכורת חודשי (מ-M8) — כולל "✓ נוכה" RPC
5. פילוח אופטומטריסט (מ-M7+M2)
6. פילוח קופ"ח להחזרים (מ-M7+M5)
7. LTV per-customer (מ-M5+M7+M8)
8. חוסרי-מלאי (מ-M1)
9. recall — מי לא חזר (מ-M6)
10. דוח-ספקים (מ-M9) — אם M9 יספיק לפני LIVE

### 12.2 Deferred (post-LIVE)

- view_type נוסף: chart, pivot, dashboard
- caching/aggregation tables לדוחות-כבדים
- תבניות-PDF מרובות פר-tenant
- תזמון אימייל
- שמירת-ייצוא-בהיסטוריה (אם רגולטור ידרוש)
- הפרדת דוחות-רפואיים מ-עסקיים
- 100+ דוחות-default נוספים שיתווספו לפי בקשה
- LTV-multifocal segment, LTV-בני-משפחה
- pivots דינמיים (cross-tab)
- API ל-PowerBI/Tableau
- per-user permissions (לא רק per-role)

---

## 13. הנחיות ל-Module Strategist

1. **קרא את 3 הסקיצות + DECISIONS_LOG entries של 2026-05-09 לפני כתיבת ROADMAP.**
2. **מבנה-טבלאות:** 9 הטבלאות מ-§3 הם החזון. שמות-עמודות-מדויקים, FK rules, indexes — קביעה שלך.
3. **חוזי-Views:** לפני-תכנון-SPEC, ודא ש-Module Strategists של M5/M6/M7/M8 הוסיפו את ה-Views הנדרשות (§4.1). אם לא — פנה אליהם דרך ה-Architect.
4. **חלוקה לפאזות מומלצת:**
   - Phase 1: תשתית — 9 טבלאות + RLS + 3 מסכים בסיסיים + 2 דוחות-default (סוף-יום-קופה + מכירות חודשי).
   - Phase 2: engine מלא — grouping, summaries, bulk actions + RPC "✓ נוכה" + 5 דוחות-default נוספים.
   - Phase 3: ייצוא + הדפסה — Excel עשיר + PDF data-driven + activity_log integration.
   - Phase 4: הרשאות — 2-שכבות + ניהול-קטגוריות.
   - Phase 5: 5 דוחות-default נוספים + smoke-tests עם פריזמה-demo data.
5. **בדיקות-בוונה:** Module Strategist יוסיף stage של מבחני-עומס ב-Phase 5 — דוח-מכירות-שנתי על 9,805 הזמנות + דוח-LTV על 5,028 לקוחות. אם זמן-תגובה > 3 שניות — הוסף indexes או caching.
6. **חיזוקי-מודולריות נעולים** (§6) — אסור לוותר עליהם. כל סטייה דורשת השלמה ל-Architect.

---

## 14. החלטות נעולות (סיכום)

| # | תחום | החלטה |
|---|---|---|
| 1 | ארכיטקטורה | M11 = שכבת-תצוגה, לא בעלים-של-נתונים |
| 2 | מודל-דוח | תבנית-פתוחה, לא פריט-קבוע-בקוד |
| 3 | קטגוריות | configurable per-tenant + seed default |
| 4 | בעלות | system / tenant_modified / tenant_new |
| 5 | עריכה | יוצרת עותק-טננט, default נשאר |
| 6 | UI | עותק מסתיר default; "↺ החזר" משחזר |
| 7 | יצירה-עצמאית | "+ דוח חדש" עצמאי (לא רק עותק) |
| 8 | נראות | shared default + private optional |
| 9 | הרשאות | 2 שכבות (קטגוריה + override-דוח) במטריצת M2 |
| 10 | סוג-תצוגה | טבלה ביום-1; chart/pivot/dashboard עם view_type ננעל-ב-UI |
| 11 | View-של-מודול | אחת רחבה לכל מודול, בעלות-המודול |
| 12 | חוזה-מודולים | M5/M6/M7/M8/M1/M4/M9/M13 חייבים `v_<x>_for_reports` |
| 13 | עדכון-מתוך-דוח | רק דרך RPC של מודול-המקור (Pattern action plat) |
| 14 | LTV | חישוב חי, JOIN של views, ללא cache ביום-1 |
| 15 | ייצוא Excel | פורמט עשיר |
| 16 | ייצוא PDF | תבנית-יחידה אחידה ממותגת tenant, data-driven |
| 17 | שמירת-ייצוא | חד-פעמי, לא נשמר |
| 18 | לוג-ייצוא | activity_log הקיים (M1.5), לא לוג ייעודי |
| 19 | תזמון | deferred |
| 20 | בידוד-טננט | עיקרון-מחייב, מנגנון-קיים |
| 21 | הפרדת-נתוני-בריאות | אין הפרדה ביום-1 |
| 22 | קיצור-דרך | M11 ב-sidebar + כפתור "📊 דוחות" בכל מודול |

**חיזוקים נוספים (5):** view_type הרחבה · View metadata חובה · RPC-action פלטפורמה · PDF data-driven · 2-שכבות הרשאה.

**הסיג:** ייבוא דוח מטננט-אחר (הוסג; טננטים נשארים מבודדים לחלוטין).

---

## 15. קישורים

- סקיצה 1: [רשימת דוחות](M11_REPORTS_LIST_MOCKUP.html)
- סקיצה 2: [עריכת דוח](M11_REPORT_EDITOR_MOCKUP.html)
- סקיצה 3: [תצוגת דוח](M11_REPORT_VIEW_MOCKUP.html)
- Master Plan: `_archive/launch-plan-versions/MASTER_LIVE_PLAN_v1.md` §4 (M11 requirements)
- Decisions Log: `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` — 2026-05-09 M11 entry
- חוזי-views קודמים: M7 Brief §4 + M8 Brief §4.3-4.4
- M11 handoff (this session's source): `M11_HANDOFF.md`

---

*Brief סגור 2026-05-09 בסשן Architect. מועבר ל-Module Strategist להמשך עבודת ROADMAP + SPECs.*
