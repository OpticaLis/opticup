# תוכנית מעבר ל-LIVE — Master Plan

**גרסה:** v1 (טיוטה, 2026-05-06)
**סטטוס:** Draft — מבוסס על שני audits (back-end + front-end) + Launch Decisions Apr 27/28 + cutover memory.
**ייעודכן אחרי:** ה-audit השלישי (`optic_dt_all.accdb` — קובץ המעבדה).

> **מטרה:** להתאים את תוכנית בניית המודולים ל-cutover אחד גדול מ-OpticPlus ל-OpticUp.
> זו לא תוכנית מיגרציית-נתונים מיידית — זה הבסיס לבנייה מודולרית שמסתיימת ב-LIVE day.

---

## 1. הסיפור האסטרטגי

פריזמה רצה היום על **OpticPlus** — מוצר Access מסחרי, VBA נעול בסיסמה, רישוי שנתי לספק חיצוני. הליבה: 20,900 לקוחות, 9,805 הזמנות, 6,248 בדיקות עיניים, 7.1M₪ הכנסות 5 שנים. המוצר חי ב-3 קבצים מקושרים: `optic.accdr` (front-end), `optic_dt.accdb` (back-end ראשי), `optic_dt_all.accdb` (back-end שני — מעבדה/ספקים/קטלוג).

ה-Cowork-side ביצענו audit על שני הראשונים. הדו"חות מספקים את **כל הלוגיקה העסקית הגלויה** ב-1,035 queries מלאים. ה-VBA נעול אבל לא קריטי — הליבה (תמחור, recall, draft/commit, תקשורת) חיה ב-queries ובmodule names.

**המטרה הסופית:** ביום ה-LIVE — פריזמה פותחת בוקר את OpticUp (ולא את OpticPlus), לקוחות מקבלים WhatsApp רגיל, הצוות מבצע הזמנות ובדיקות בלי לחוש רגרסיה. OpticPlus עובר ל-archive עד שהרישיון פג ונסגר.

---

## 2. מודולים שחייבים להיות מוכנים לפני LIVE

על בסיס מה שראינו בשני ה-audits, אלה המודולים שחייבים להיבנות בין היום ל-LIVE day. ההמרה למספור הוסכם ב-Launch Decisions Apr 27/28.

| # | מודול | סטטוס היום | למה חייב לפני LIVE |
|---|---|---|---|
| **M4** | CRM — לקוחות + לידים + recall | קיים ב-OpticUp, חי על demo | בסיס לכל השאר. צריך להרחיב עם recall engine + מיגרציית לקוחות. |
| **M5** | Customers — ניהול לקוחות מלא | חדש | המרכז של הביזנס. כל מודול אחר תלוי בו. |
| **M6** | Prescriptions / Eye Exams | חדש | 6,248 רשומות בדיקה + 251 עדשות-מגע. בלעדיו אין הכנסה — בדיקה מעבירה למכירה. |
| **M7** | Orders | חדש | 9,805 הזמנות, 25 וריאנטים של דוחות. הליבה התפעולית. |
| **M8** | Payments | חדש | 9,828 קבלות + 1,160 תכניות-תשלומים. בלעדיו הקופה לא עובדת. |
| **M9** | Lab / KDS | חדש (בסיס ב-M1) | מעקב מעבדה + ספקים. תלוי ב-audit השלישי. |
| **M11** | Reports | חדש | LTV, מכירות, מלאי. הצוות חי בעולם של 123 דוחות. |
| **M12** | Communications (WhatsApp + SMS + Email) | חצי קיים ב-M4 | WhatsApp **חייב** להיות פעיל ביום-1. 30 טפסים מתוך 149 ב-OpticPlus = 20% מהמערכת. |
| **M13** | Loyalty Club | חדש (החלטה Apr 28) | מועדון חברים, צבירת זיכויים, קופונים. |
| **M14** | Appointments | חדש | אצל פריזמה זה היום מנוהל מחוץ ל-Access (יומן נייר/Google?). בלעדיו אין ניהול תורים. |

**מודולים שלא דרושים ל-LIVE (אבל קיימים או יבואו מאוחר):** M1 Inventory ✅, M1.5 Shared ✅, M2 Platform Admin ✅, M3 Storefront ✅, M3.1 Project Reconstruction ✅. Module 10 (Branches) — Q17 קבע 1 סניף בלבד, אז לא חוסם.

---

## 3. סדר בנייה (dependency graph)

```
M4 (CRM, קיים)
   ↓
M5 (Customers) ── M14 (Appointments — עצמאי)
   ↓
M6 (Prescriptions) ── M7 (Orders) ── M8 (Payments)
   ↓                     ↓               ↓
   ↓                   M9 (Lab)
   ↓                     ↓
M11 (Reports)  ←  ────  ←
M12 (Communications) — מתפתח במקביל ל-M4/M5/M6
M13 (Loyalty) — אחרי M5+M7+M8
```

**Critical path:** M5 → M6+M7+M8 (core triplet) → M9 → M11.
**Parallel:** M14 (Appointments) עצמאי, M12 מתפתח רוחבית.
**אחרון:** M13 (Loyalty) — תלוי בכל הליבה.

---

## 4. דרישות פר-מודול לקראת LIVE

לכל מודול: רק מה ש**חייב להיות שם ביום ה-LIVE** כדי שהצוות לא יחווה רגרסיה. הרשימה נגזרת ישירות מה-audits.

### M5 — Customers
**Scope מיגרציה:** רק לקוחות עם מינימום הזמנה 1. **5,028 לקוחות** (לא 20,900). Pre-2021 לא מועבר.

- [ ] מבנה לקוחות מלא: שם, טלפון, אימייל, ת"ז, יום-הולדת, כתובת, מקצוע, מין
- [ ] שדות מועדון: `moadon`, `qhaver`, `kupon`, יתרות זיכוי
- [ ] `kupa` (קופת חולים) — לאומית 51%, מכבי 19% — מערך רשמי קיים
- [ ] `khist` (יומן Memo) — 82% מהלקוחות תלויים בו — חייב להעביר במלואו
- [ ] טופס "אישור שיווק active" (per Launch Decision #3 Apr 27)
- [ ] segments לפי tenant (per Q25)
- [ ] שפה לכל לקוח (HE/RU/EN ביום-1, ES בהמשך)
- [ ] soft-delete בלבד (Iron Rule 3)
- [ ] לטפל ב-`cust_listb` (156 לקוחות) — החלטה פתוחה

### M6 — Prescriptions / Eye Exams
- [ ] מבנה מרשם משקפיים: 65 שדות per-eye (sphere/cyl/axis/add/PD/visus/PR/pupil)
- [ ] מבנה מרשם עדשות-מגע נפרד (34 שדות, PD שונה)
- [ ] סוגי בדיקה: סופי/ישן/סובייקטיבי/אובייקטיבי + 7 סוגי מרשם (Q24)
- [ ] תוקפי-recall multi-axis (Launch Decision #4 Apr 27)
- [ ] **draft/commit/cancel pattern** — חיוני (`bdka` flag ב-OpticPlus)
- [ ] **Recall engine** — 13 וריאנטים → קונפיגורבילי, פעיל ביום-1
- [ ] קישור לקופת-חולים (לאומית פלטינום, מכבי וכו')

### M7 — Orders
- [ ] 146 עמודות הזמנה ב-OpticPlus → `orders` שטוחה ו-`order_items` מנורמלת
- [ ] **פורמולת תמחור** עם logic של "הנחה יחסית מעדשות → מסגרת" (קוד מ-`qlist_sales`)
- [ ] Sequential numbering atomic (Iron Rule 11)
- [ ] מסגרת זוגית (זוג ראשי + שני) — 17% מההזמנות
- [ ] שלבי מעבדה: sent / done / delivered (`dworka` / `ddonea` / `ddelva`)
- [ ] Tag הזמנה: 12 קטגוריות (מדף-מלאי / מדף-הזמנה / מולטיפוקל / תיקון / מגע / שמש / ייצור / אופיס / משימה / הצעת-מחיר / בי-פוקל)
- [ ] שפת מסמך per-order (HE/RU/EN ביום-1, ES בהמשך)
- [ ] **תבניות PDF גמישות** במקום 25 דוחות סטטיים
- [ ] קופונים inside (Launch Decision Apr 28)
- [ ] הערות-CS (`tb_order_rem`)

### M8 — Payments
- [ ] **מאחד `tb_kabala` (BE) + `tb_credits` (FE, 1,160 רשומות)** — בלי זה אין מעקב על תשלומים-בכרטיס
- [ ] 8 סוגי תשלום: אשראי 66%, מזומן 28%, העברה, שיק, ביט, ירד-ממשכורת, נסגר (status), ניכוי
- [ ] post-dated (לצ'קים — `tpiraon`)
- [ ] adjustments / reversals עם audit trail
- [ ] Gama Pay (non-POS) + Z Credit/Linet (POS) (Launch Decision #5 Apr 27)
- [ ] חשבונית/קבלה (אבל **לא** עוסק מורשה — מותאם לקיימות)

### M9 — Lab / KDS
- [ ] **37 ספקי מעבדה** (ב-`SAPAKIM`) — entity נפרדת מספקים רגילים, שדות שונים (`nikuy`, `qmaamg`, sosek, ש"ח/דולר)
- [ ] שלבי מעבדה (3 stages) — שילוב ב-M7
- [ ] מעקב לכל הזמנה — לא 7.4% כמו ב-OpticPlus, אלא 100%
- [ ] **תהליך "ארגז" (Returns-to-Supplier)** — 496 ארגזים, 840 פריטים. זה תהליך שלם: בוחרים פריטים להחזרה → יוצרים מסמך → שולחים לספק → מקבלים זיכוי. **חסר ב-Roadmap המקורי, יש להוסיף.**
- [ ] **זיכויים מספק** — 130 זיכויים, 411 פריטים. נוצרים מ"ארגז", מסתיימים בזיכוי כספי. **תלוי ב-M8 (Payments).**
- [ ] קטלוג מסגרות (8,733) + קטלוג עדשות-מגע (2,904) — מועברים ל-Module 1 (Inventory)
- [ ] היסטוריית עדכוני-מלאי (~20K רשומות) — מועברת ל-`activity_log` של M1.5

### M11 — Reports
- [x] **Architecture Brief נסגר 2026-05-09.** ראה `architecture-briefs/M11 - Reports/M11_REPORTS_BRIEF.md`.
- [ ] **LTV per-customer** — חישוב חי על JOIN של Views (M5+M7+M8), בלי cache ביום-1
- [ ] LTV-multifocal segment — deferred ל-post-LIVE
- [ ] מכירות חודשי / שנתי (לרואה-חשבון) — בתוך 5-10 דוחות-default
- [ ] דוחות מלאי: חוסרים / לא-נמכרים / עודף / barcode-errors — דורש `v_inventory_for_reports` מ-M1
- [ ] **ייצוא Excel פורמט-עשיר** — header מעוצב, סיכומי-סוף, pivot-headers
- [ ] **תבנית PDF אחידה data-driven** — תבנית-יחידה ממותגת tenant ביום-1, להחליף 25 וריאנטי rp_order_*
- [ ] טבלאות-תשתית: 9 טבלאות (reports, report_categories, report_columns, report_filters, report_grouping, report_actions, report_role_access, report_role_overrides) + RLS
- [ ] חוזה: M5/M6/M1/M4/M9/M13 חייבים לחשוף `v_<module>_for_reports`
- [ ] חוזה: עדכון-מתוך-דוח רק דרך RPC של מודול-המקור (M8 חושף `mark_payment_deducted`)
- [ ] קיצור-דרך מתוך כל מודול-מקורי: כפתור "📊 דוחות" שפותח M11 עם הקטגוריה הרלוונטית

### M12 — Communications
- [ ] **WhatsApp Business API פעיל ביום-1** — קריטי, אסור פספס
- [ ] **17 תבניות מ-`doc_title`** — חילוץ + הזרמה ל-`crm_message_templates`
- [ ] משתנים בתבניות (placeholders): שם לקוח, מס' הזמנה, תאריך, תאריך-מסירה
- [ ] SMS (כבר ב-M4 — להרחיב לתבניות)
- [ ] Email (queue ב-`tb_email` → Edge Function)
- [ ] 3 cadences: bdika (recall), insurance window (`cleandate`), invoice follow-up (`insdate`)
- [ ] preview+confirm gate (Daniel directive — auto-memory)

### M13 — Loyalty Club
- [ ] חברות שנתית (אופציונלי per-tenant)
- [ ] tiers קונפיגורבילי (Silver/Gold/Diamond — שמות + amounts per tenant)
- [ ] צבירה rule per-tier (e.g. "5% from every purchase as store credit")
- [ ] Family pooling (בני-משפחה צוברים יחד)
- [ ] tier promotion auto-evaluated annually
- [ ] credit balance + redemption ב-M7
- [ ] coupons inside M7 (Launch Decision Apr 28)

### M14 — Appointments
- [ ] מבנה תורים מאפס (OpticPlus היה ריק)
- [ ] מודל יומי / שבועי
- [ ] קישור ללקוח + סוג תור (בדיקה / איסוף / החזרה)
- [ ] סנכרון ל-Google Calendar אופציונלי
- [ ] WhatsApp תזכורות

---

## 5. תוכנית יום ה-LIVE (cutover)

```
T-14 days:  כל המודולים ירוקים על demo. Smoke tests עוברים.
T-7 days:   Dry-run מיגרציה על snapshot של פריזמה (קופי).
            Validation: counts match, sample-customer end-to-end, recall engine fires.
T-3 days:   Final dry-run. בדיקת WhatsApp, SMS, Email.
            Backup של OpticPlus (read-only mode).
T-1 day:    בדיקת אינטגרציות אחרונות.
            הודעה לצוות שמחר LIVE.

T-day:
  09:00  הקפאת OpticPlus → read-only mode.
  09:30  Snapshot Access → script extract.
  10:30  מיגרציה ל-OpticUp (Postgres direct insert with migration role).
  12:00  Validation: counts, sample customer end-to-end, recall fires correctly.
  13:00  Switch DNS / links / footer / WhatsApp targeting.
  14:00  Open OpticUp לצוות.
  14:00–18:00  תמיכה צמודה.

T+1 day:    Daily ops on OpticUp. OpticPlus archived (read-only, retained for ref).
T+7 days:   אם כל המדדים ירוקים → סגירת רישוי OpticPlus.
T+30 days:  Post-mortem + lessons-learned.
```

---

## 6. סיכוני LIVE — Top 6

1. **WhatsApp לא פעיל ביום-1** → רגרסיה חמורה. הצוות לא יוכל לעבוד.
2. **תבניות הודעה אובדות** (17 ב-`doc_title`) → תקשורת בנויה מאפס, ניסוח שיווקי 5+ שנים נאבד.
3. **Recall engine מנוטרל** → לקוחות לא חוזרים → הכנסה חוזרת מתאיידת.
4. **קודי-ספק לא ממופים לשמות** → ספקים מופיעים כקודים נומריים, הצוות לא מזהה. ← תלוי ב-audit השלישי.
5. **תכניות תשלומים** (`tb_credits`, 1,160 רשומות ב-FE) → אם מיגרציה מתעלמת, אובדן מעקב על אשראי בתשלומים.
6. **VBA לא שוחזר במלואו** → לוגיקה דקה (rounding, edge-cases) שונה ב-OpticUp → דוחות לא תואמים.

לכל סיכון: mitigation מובנה במודול הרלוונטי (סעיף 4).

---

## 7. החלטות פתוחות

| # | החלטה | המלצה | סטטוס |
|---|---|---|---|
| 1 | מטרת `cust_listb` (156 לקוחות + טופס נפרד) | **סגור 2026-05-06:** לידים זמניים מקמפיינים, לא להעביר. | ✅ סגור |
| 2 | מקור `tb_credits` — ידני או סנכרון? | **סגור 2026-05-06:** היום ידני, אין סנכרון. ב-OpticUp נבנה מאפס + אינטגרציה עם Gama Pay/Z Credit (לפי Launch Decision #5 Apr 27). | ✅ סגור |
| 3 | Appointments — איפה היום מנוהל? | **סגור 2026-05-06:** יומן חיצוני נפרד. ב-OpticUp נבנה מאפס, **בסיסי, במקביל למודולים אחרים = 0 עיכוב**. החיצוני מוחלף ביום-1. | ✅ סגור |
| 4 | היסטוריה לפני 2021 (קובץ ארכיון?) | **סגור 2026-05-06:** לא להעביר. **+ כלל הרחבה:** לא להעביר לקוחות בלי הזמנות (מינימום הזמנה 1). 20,900 → 5,028 לקוחות (76% הפחתה). | ✅ סגור |
| 5 | סיסמת VBA של OpticPlus | **סגור 2026-05-06:** דילוג. ה-queries מספקים את הליבה. | ✅ סגור |
| 6 | רישיון OpticPlus | **סגור 2026-05-06:** רישיון לכל החיים, בתוקף. הדאטה נשארת אצל פריזמה. | ✅ סגור |
| 7 | למזג cust_listb לתוך cust_list, או טבלה נפרדת? | **סגור 2026-05-06:** לא להעביר בכלל. | ✅ סגור |
| 8 | i18n מ-day-1 — איזה שפות? | **סגור 2026-05-06:** עברית + רוסית + אנגלית חובה ביום-1. ספרדית בהמשך. | ✅ סגור |

---

## 8. Timeline — אומדן ראשוני

| מודול | אומדן | הערה |
|---|---|---|
| M5 (Customers) | 2-3 שבועות | קיים בסיס ב-M4. הרחבה. |
| M6 (Prescriptions) | 3-4 שבועות | מבנה מורכב, draft/commit + recall. |
| M7 (Orders) | 4-6 שבועות | המודול הכי גדול. 25 וריאנטי דוחות. |
| M8 (Payments) | 2-3 שבועות | מודל יחסית פשוט. |
| M9 (Lab) | 1-2 שבועות | תלוי ב-audit השלישי. |
| M11 (Reports) | 3-4 שבועות | LTV + מלאי + ייצוא Excel. |
| M12 (Communications) | 2-3 שבועות | חצי קיים ב-M4. אינטגרציית WhatsApp Business API. |
| M13 (Loyalty) | 2 שבועות | פר Launch Decision Apr 28. |
| M14 (Appointments) | 1-2 שבועות | מודל פשוט. |
| **Total (sequential):** | **20-29 שבועות** | 5-7 חודשים. |
| **Total (parallel):** | **14-18 שבועות** | 3.5-4.5 חודשים — אם 2 lanes פעילים. |
| **+ Buffer + integration:** | **+2-3 שבועות** | |
| **+ LIVE day prep + soak:** | **+2 שבועות** | |
| **LIVE estimated date:** | **Aug-Sep 2026** | תלוי בהתחלה. |

הערות:
- ה-Timeline יעודכן אחרי scoping מפורט פר-מודול.
- ייתכנו חזרות (re-scoping) בעקבות discoveries באודיט השלישי.
- בכל מודול: SPEC formal + Foreman Review + Executor + Reviewer לפי discipline post-cutover (auto-memory).

---

## 9. הצעדים הבאים (מיידיים)

**עדכון 2026-05-06 ערב:** Audit שלישי הושלם. Timeline אושר. מתחילה עבודת Architecture Briefs cross-module.

**סטטוס Architecture Briefs (את החלטות-העל לכל מודול לפני SPECs):**
- ✅ M5 (Customers) — `architecture-briefs/M5_CUSTOMERS_BRIEF.md` **v3** + סקיצת מסך-לקוח `M5_CUSTOMER_CARD_MOCKUP.html` + סקיצת מסך-לקוחות `M5_CUSTOMERS_LIST_MOCKUPS.html` (Sketch 2 — Split Workspace approved). כולל: composite customer number, Iron Rule 32 (sequence cancellation), customer-list display preferences (configurable per-tenant).
- ✅ M6 (Prescriptions) — `