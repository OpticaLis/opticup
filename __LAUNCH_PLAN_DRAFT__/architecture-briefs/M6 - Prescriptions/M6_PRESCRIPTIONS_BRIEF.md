# M6 — Prescriptions / Eye Exams — Architecture Brief

**גרסה:** v2 (תוספות UX/screens 2026-05-07)
**תאריך:** 2026-05-07
**מחבר:** Main Strategic (skill `opticup-main-strategic`)
**יעד:** Module Strategist של M6 (סקיל `opticup-strategic`).

> **שינויים מ-v1 (סשן 2026-05-07):**
> - הוסף סעיף 9 — מסך מרשם (Prescription Editor): sidebar היסטוריה + center editor.
> - הוסף סעיף 10 — Field inventory מלא לאחר מחקר השוואתי (קרטומטריה, אורך-גלגל, VAsc/PH, BC/DIA, Over-Refraction).
> - הוסף סעיף 11 — Toggle משקפיים↔עדשות-מגע: DB מופרד, UI מאוחד, sidebar מסונן.
> - הוסף סעיף 12 — חוזים מול M5 (Views, RPCs).
> - הוסף סעיף 13 — Multi-axis recall: 4-5 צירים פר-מרשם.
> - הסר flow "צור מרשם מתפקודי-ראייה" — Daniel directive 2026-05-07: "לא קורה אצלנו בכלל". הועבר ל-deferred.
> - עודכן רשימת prescription_types (סוג-מרשם הוסר 7→7 חדשים: למרחק/קריאה/מחשב/פרוגרסיבי/ביפוקל/מולטיפוקל/למשקפי-שמש).
>
> זה לא SPEC. שכבת-ביניים בין Master Plan ל-SPEC.

---

## 1. ייעוד M6

המודול-הרפואי. מחזיק את האקט (בדיקות-עיניים) ואת התוצרים (מרשמי-משקפיים, מרשמי-עדשות-מגע). מקור-האמת ל-recall-engine. נקודת-החיבור ל-M7 (הזמנה מצביעה למרשם) ול-M5 (כרטיס-לקוח לשונית-3 חושף סיכום).

**Scope migration:** 6,248 בדיקות + 251 מרשמי-עדשות-מגע. רק לקוחות שעוברים ל-OpticUp לפי scope-M5.

**Multi-vertical scaling:** M6 הוא מודול-עצמאי (לא חלק מ-M5) כדי לאפשר scaling לענפים-עתידיים — שיניים יקבלו `M6-dental` עם x-rays + treatment plans, וטרינריה תקבל `M6-vet` עם drug regimens. לקוחות (M5) נשאר זהה. **החלטה אסטרטגית מסשן 2026-05-07.**

---

## 2. ישויות (גוש 1)

### 2.1 `eye_exams` — האקט

האירוע "בדיקה". שדות-מנהליים פר-בדיקה (תאריך, אופטומטריסט, customer_id, סיבה).

**State machine:** `scheduled → in_progress → completed → cancelled`. enum-Postgres (state-machine = enum, P19).

**שדות פרטניים:**
- `status_changed_at`, `status_changed_by` — audit פנימי על מעבר-מצב.
- `outcome` enum: `prescribed_glasses`, `prescribed_contacts`, `prescribed_both`, `no_change`, `referred_to_doctor`, `customer_declined`. NULL כל עוד `status != completed`. (סיכון 5 בגוש 4.)
- soft-delete (Iron Rule 3).

### 2.2 `prescriptions_glasses` + `prescription_glasses_eyes` — מרשם-משקפיים

הפרדה: רשומה-אב + שתי רשומות-בנים (R/L). הפרדה זו היא **Pattern 11** (two-rows-for-symmetric).

**State machine:** `draft → committed → superseded → expired → cancelled`.
- `draft` — אופטומטריסט מקליד, לא חתם. *Iron Rule 32 חל*: לפני committed המרשם לא תופס מספר-עוקב; ניתן לבטלו לחלוטין.
- `committed` — חתום, מחייב, recall רץ, M7 רשאי לקושר. תופס מספר-עוקב.
- `superseded` — מרשם חדש-יותר ביטל. נשמר לעיון.
- `expired` — תוקף-פג, נקבע ע"י cron לפי `expires_at`.
- `cancelled` — בוטל ידנית. לא נכנס לחישוב recall.

**שדות-אב — רחב יותר ב-v2:**
- `customer_id`, `exam_id` (NULL-able — מרשם-מבחוץ), `prescription_type_id` (FK ל-`prescription_types`).
- `optometrist_id` (FK ל-staff/users).
- `prescription_number` (sequential, atomic, רק על committed — Iron Rule 11+32).
- `source` enum: `internal_exam`, `vision_function`, `health_fund`, `external_optometrist`, `external_doctor`. **(הוסף v2)** — מתאים לשדה "מקור הבדיקה" במסך.
- `exam_reason` enum: `routine`, `vision_complaint`, `new`, `post_op`, `myopia_control`. **(הוסף v2)** — מתאים לשדה "סיבת בדיקה".
- `treatment_selected` enum/FK: `none`, `myocare`, `atropine`, `ortho_k`, `blue_light`, `dry_eye_drops`. **(הוסף v2)**.
- `expires_at` — multi-axis, ראה סעיף 13.
- `valid_from` — תאריך-תוקף-קופ"ח (יכול להיות שונה מ-expires_at הכללי).
- `health_fund_id` FK — קופ"ח רלוונטית להחזר.
- `instructions_for_customer text` — הוראות-לקוח (מודפסות).
- `notes_internal text` — הערות-אופטומטריסט (לא מודפסות).
- `next_followup_at` — ביקורת-חוזרת מתוכננת.
- `bcva_binocular text` — BCVA דו-עיני (לא פר-עין).
- `refraction_method` enum: `phoropter`, `auto_refractor`, `wavefront`. **(הוסף v2)**.
- `recommended_lens_type_id` FK (לקטלוג-עדשות עתידי) או enum: `single_vision`, `progressive`, `bifocal`, `reading`, `computer`.
- `recommended_lens_material` enum: `plastic_1_50`, `1_60`, `1_67`, `1_74`, `polycarbonate`.
- `status_changed_at`, `status_changed_by`, soft-delete.

**שדות-בן (`prescription_glasses_eyes`) — רחב יותר ב-v2:**
פר-עין, R או L:
- `prescription_id`, `eye` enum `R`/`L`.
- **רפרקציה:** `sphere`, `cyl`, `axis`, `add`, `prism`, `prism_base` enum (UP/DN/IN/OUT).
- **חדות-ראייה:** `va_with_correction` (VAcc), `va_without_correction` (VAsc) **(הוסף v2)**, `va_pinhole` (PH) **(הוסף v2)**.
- **PD ואישונים:** `pd_distance`, `pd_near`, `pupil_diameter_mm`.
- **קרטומטריה (הוסף v2):** `k1`, `k2`, `k_avg`, `k_axis`.
- **ביומטריה (הוסף v2):** `axial_length_mm`, `pupil_height_mm`.
- **Additions בנוסף ל-add (הוסף v2):** `read_add`, `bif_add`, `mul_add`, `int_add` (טווחי-אדישן שונים — קריאה/ביפוקל/מולטיפוקל/אינטרמדיאט).
- index על `(prescription_id, eye)`.

### 2.3 `prescriptions_contacts` + `prescription_contacts_eyes` — מרשם-עדשות-מגע

ישות נפרדת מ-glasses (לא variant). שדות-עין שונים: BC, DIA, brand-spec, lens-type, OR (Over-Refraction). State-machine ושדות-אב — זהים ל-glasses (כולל source/exam_reason/treatment_selected/optometrist_id וכו').

**שדות-אב CL-specific (הוסף v2):**
- `lens_type` enum: `daily_soft`, `weekly_soft`, `monthly_soft`, `quarterly_soft`, `yearly_soft`, `toric`, `multifocal`, `rgp`, `ortho_k`.
- `replacement_period` enum: `daily`, `weekly`, `monthly`, `quarterly`, `yearly`.
- `wear_schedule` enum: `daily_remove_at_night`, `extended_wear`.
- `manufacturer` (FK ל-`lens_manufacturers` config-table) — Acuvue/J&J, Air Optix, Proclear, Biofinity, Dailies.
- `model_name text` — שם-דגם ספציפי (e.g., "Acuvue Oasys 1-Day").
- `material` enum: `silicone_hydrogel`, `hydrogel`, `rgp`.
- `water_content_pct numeric` — אחוז-מים.
- `dk_l_value numeric` — Dk/L (oxygen transmissibility).
- `tint` enum: `clear`, `colored`.

**שדות-בן (`prescription_contacts_eyes`) — רחב יותר ב-v2:**
- `prescription_id`, `eye`.
- **פרמטרי עדשה (קריטי):** `power` (לא sphere — POWER ייחודי לעדשות-מגע), `cyl` (טורית), `axis`, `add` (multifocal), `bc_mm` (Base Curve), `dia_mm` (קוטר).
- **חדות-ראייה:** `va_with_correction`, `va_without_correction`.
- **קרטומטריה (קריטי לעדשות-מגע):** `k1`, `k2`, `k_avg`, `k_axis`.
- **Over-Refraction (הוסף v2, ייחודי לעדשות-מגע):** `over_refraction_power`, `va_over_refraction`.
- `lens_catalog_id` FK ל-Module 1 Inventory (סיכון 4 בגוש 4).

### 2.4 `prescription_types` — קונפיגורציה per-tenant (P19)

טבלה-עם-flags. tenant יכול להוסיף/להשבית/לשנות-שם.

**שדות:**
- `id`, `tenant_id`, `code`, `name_he`, `name_en`, `applies_to` enum (`glasses`, `contacts`, `both`).
- **Capability flags** (קוד מסתעף עליהם, לא על code):
  - `triggers_recall boolean`
  - `allows_order boolean`
  - `is_health_fund_related boolean`
- `is_default`, `is_active`, `sort_order`, soft-delete.

**Seed default ל-tenant חדש (8 שורות, מעודכן v2):**
| code | applies_to | triggers_recall | allows_order | is_health_fund_related |
|---|---|---|---|---|
| `for_distance` | glasses | ✓ | ✓ | ✗ |
| `for_reading` | glasses | ✓ | ✓ | ✗ |
| `for_computer` | glasses | ✓ | ✓ | ✗ |
| `progressive` | glasses | ✓ | ✓ | ✗ |
| `bifocal` | glasses | ✓ | ✓ | ✗ |
| `multifocal_cl` | contacts | ✓ | ✓ | ✗ |
| `for_sunglasses` | glasses | ✓ | ✓ | ✗ |
| `health_fund` | both | ✗ | ✓ | ✓ |

`exam_type` (סופי / ישן / סובייקטיבי / אובייקטיבי) הוא enum-Postgres (state-machine), לא טבלה.

### 2.5 `lens_manufacturers` — קונפיגורציה per-tenant (הוסף v2)

טבלה לדגמי-יצרני-עדשות-מגע. tenant יכול להוסיף יצרנים-נוספים.

**Day-1 שדות:**
- `id`, `tenant_id`, `code`, `name`, `country`, `is_active`, `sort_order`.

**Seed default:** Acuvue (J&J), Air Optix (Alcon), Proclear (CooperVision), Biofinity (CooperVision), Dailies (Alcon).

**FK יוצא מ-`prescriptions_contacts.manufacturer_id`.**

### 2.6 יחסים — תרשים (מעודכן v2)

```
customers (M5) ◄──FK── eye_exams ──┬──► prescriptions_glasses ──► prescription_glasses_eyes (R, L)
                                   └──► prescriptions_contacts ──► prescription_contacts_eyes (R, L)
                                                                      │
                                                                      └──FK──► lens_catalog (M1)

prescription_types (config) ◄──FK── prescriptions_glasses, prescriptions_contacts
lens_manufacturers (config) ◄──FK── prescriptions_contacts (NEW v2)
health_funds (M5)            ◄──FK── prescriptions_glasses, prescriptions_contacts (NEW v2)
staff/users                  ◄──FK── prescriptions_*  (optometrist_id, NEW v2)
```

---

## 3. חוזים יוצאים (גוש 2)

### 3.1 Views (מעודכן v2)

| View | צרכן | תוכן |
|---|---|---|
| `v_exam_for_customer` | M5/UI כרטיס-לקוח | היסטוריית-בדיקות. id, date, status, optometrist. בלי ערכים-רפואיים. |
| `v_prescription_glasses_for_order` | M7 | רק `committed`/`external`. כל ערכי-עין joined. type-name, expires_at. |
| `v_prescription_contacts_for_order` | M7 | אותו דבר ל-עדשות-מגע. |
| `v_recall_due` | M12 | שורה-לכל-recall-דחוף. customer_id, prescription_id, type_name, due_at, recall_kind. |
| `v_exam_for_doctor` | UI אופטומטריסט | רחב — כולל ערכים, היסטוריית-מרשמים-קודמים. |
| `v_prescription_history_for_customer` | M11 | כל המרשמים, כל הסטטוסים. LTV-by-prescription-type. |
| **`v_customer_prescriptions_summary`** *(הוסף v2)* | M5 customer card lashonit-3 | רשימת מרשמים פר-customer: date, type, status, optometrist, R/L summary, expiry, notes count. **חוזה החליפי ל-M5.** |
| **`v_prescription_full_for_editor`** *(הוסף v2)* | M6 prescription editor center | מרשם-בודד עם כל השדות-אב + שני eyes joined + treatment + recall axes. בנוי ל-UI של M6 בלבד. |
| **`v_prescriptions_list_for_customer`** *(הוסף v2)* | M6 prescription editor sidebar | רשימה קומפקטית של כל המרשמים של customer-מסוים, מסונן לפי type (glasses/contacts). תאריך, badge, summary R/L. |

### 3.2 RPCs (מעודכן v2)

| RPC | שימוש |
|---|---|
| `create_exam(customer_id, exam_date, optometrist_id) → exam_id` | יצירת בדיקה. state ראשוני `scheduled`. |
| `create_prescription_draft(customer_id, type, prescription_kind) → prescription_id` | **(הוסף v2)** יצירת draft מרשם. type=glasses\|contacts. נקרא מ-M5 customer card "+ מרשם חדש". מחזיר id ל-UI לפתיחה. |
| `commit_prescription(prescription_id, type_id, eyes_data) → prescription_id, prescription_number` | atomic: `draft → committed`. בודק ownership. **מקצה prescription_number אטומית** (Iron Rule 11). מפעיל `compute_recall_due_dates`. |
| `cancel_draft_prescription(prescription_id) → boolean` | **(הוסף v2)** Iron Rule 32 — ביטול draft שלא מקבל מספר. אטומי. בודק שאין activity. |
| `supersede_prescription(old_id, new_id)` | `committed → superseded`. atomic. שמירת היסטוריה. |
| `compute_recall_due_dates(prescription_id) → [{axis, due_at, channel_hint}]` | חישוב recall multi-axis לכל ציר. ראה סעיף 13. |
| `clone_prescription(source_id) → new_draft_id` | **(הוסף v2)** "שכפל מרשם" — יוצר draft חדש על-בסיס ערכי-מקור. למקרים של "מרשם זהה לשנה שעברה". |

### 3.3 חוזים M6 ↔ M7

הזמנה חייבת להצביע על `prescription_id` קונקרטי. M7 בודק `v_prescription_*_for_order` ש-`type.allows_order = true` ו-status הוא `committed` או `external`.

מעבר אוטומטי ל-`committed`: כשהזמנה נפתחת על-בסיס prescription במצב `draft` ראשון בפעם הראשונה — ה-prescription מתקבע אוטומטית ל-`committed`. זה מונע אי-עקביות בין הזמנה למרשם-טיוטה.

### 3.4 חוזים M6 ↔ M12 (Fact-vs-Rule, Pattern 10)

- M6 = עובדה: "מרשם X פג בתאריך T בציר Y".
- M12 = כלל: "כן/לא לשלוח, ערוץ, offset".
- גשר יחיד: `v_recall_due`. M12 לא קוראת מ-`prescriptions_*` ישירות.
- M12 מוסיף שדות: `recall_rules` table per-tenant עם `is_enabled`, `channel_override`, `send_offset_minutes` (יכול להיות שלילי).

### 3.5 חוזים M6 ↔ M5 (חדש v2)

**Read-only**:
- M6 קורא `v_customer_for_exam` של M5 — לקבלת פרטי-לקוח.
- M5 קורא `v_customer_prescriptions_summary` של M6 — לתצוגה בלשונית-3 של כרטיס-הלקוח.
- M5 קורא `v_prescriptions_list_for_customer` של M6 — לסיידבר של מסך-המרשם.

**M6 לא כותב ל-customers** ישירות.

**Navigation contracts (UI):**
- "פתח ב-M6" ב-M5 customer card lashonit-3 → ניווט ל-M6 עם prescription_id.
- "+ מרשם חדש" ב-M5 customer card → קורא `create_prescription_draft` של M6 → ניווט ל-M6 עם new prescription_id.
- "← חזור לכרטיס" ב-M6 → ניווט חזרה ל-M5 customer card עם customer_id.

---

## 4. דפוסים חוצי-מודול (גוש 3)

**8 הדפוסים מ-M5 חלים גם פה** (RLS canonical, soft-delete, audit-via-activity-log, i18n per-record, defense-in-depth, dedup-on-create-via-RPC, migration-pattern, draft/commit ב-state-machine).

**+3 דפוסים חדשים שמולידים מ-M6:**

### 4.1 Pattern 9 — State-machine מפורש על entities עם life-cycle
- enum-Postgres (לא boolean).
- שדות `status_changed_at` + `status_changed_by` על כל entity.
- transitions דרך RPC, לא UPDATE-ישיר.
- enum מאפשר ADD VALUE בעתיד בלי שבירה (P19 sub-rule).
- חל על: M6 (exams, prescriptions), M7 (orders), M8 (payments).

### 4.2 Pattern 10 — Fact-vs-Rule separation
- מודול-המקור = עובדות-עסקיות.
- M12 = שכבת-כללים (toggle / channel / offset).
- גשר = View ייעודי (`v_recall_due`, וכו').
- חל על: M6→M12, M7→M12 (notification-rules), M8→M12 (payment-confirmation-rules).

### 4.3 Pattern 11 — Two-rows-for-symmetric-pair
- entity עם זוג-סימטרי (עיניים, ובעתיד גפיים) → טבלת-בנים עם discriminator (`R`/`L`).
- index על `(parent_id, side)`.
- חל ב-M6 על שתי ישויות-המרשם.

### 4.4 Pattern 12 — Sidebar-history + center-editor (UI, הוסף v2)
- ישות עם היסטוריה-ארוכה פר-לקוח/פר-משאב → UI מציג sidebar עם רשימה קומפקטית + center עם פריט-אחד-בלבד.
- מונע גלילה-אינסופית.
- חל ב-M6 על מרשמים. יחול בעתיד על: M14 (תורים פר-לקוח), M9 (תיקונים פר-לקוח), M11 (דוחות-מסוננים).

---

## 5. סיכונים אסטרטגיים (גוש 4)

### 5.1 מיגרציית `tb_bdika` ללא state-clarity
**הסיכון:** ב-OpticPlus, חלק מהבדיקות נשארו `bdka=true` שנים — לא ברור אם draft-עזובות או לא-נסגרו.
**טיפול:** Migration-SPEC כולל discovery-script: כל בדיקה עם age>30d ו-`bdka=true` → דיון עם Daniel (commit / cancel / שמור-as-draft).

### 5.2 מרשמי-משקפיים-בלי-PD
**הסיכון:** OpticPlus לעיתים שמר מרשם בלי PD (אופטומטריסט שכח). PD חיוני להזמנה.
**טיפול:** מיגרציה שומרת as-is. UI ב-M7 חוסם הזמנה אם PD חסר ומציג alert לפקיד למלא.

### 5.3 Recall-engine "השתחרר על המנוטרל" (Master Plan §6 #3)
**הסיכון:** 13 וריאנטים ב-OpticPlus — אם ב-cutover ה-engine לא רץ, הכנסה-חוזרת מתאיידת.
**טיפול אדריכלי:** ב-day-1, recall-engine פעיל עם **3 וריאנטים** בלבד: `renewal_glasses`, `renewal_contacts`, `exam_followup`. 10 הנותרים deferred-להוספה-בהדרגה דרך `recall_rules` table. עיקרון: cutover מסיים עם 3 פעילים, לא 0, לא 13.

### 5.4 סוגי-עדשות-מגע מורכבים (catalog mapping)
**הסיכון:** ב-OpticPlus, brand+type הוא string חופשי. ב-OpticUp יש קטלוג מסודר ב-Module 1 + טבלת-יצרנים חדשה.
**טיפול:** `prescription_contacts_eyes.lens_catalog_id` FK ל-Inventory + `prescriptions_contacts.manufacturer_id` FK ל-`lens_manufacturers`. במיגרציה — fuzzy-match-script + Daniel-review.

### 5.5 בדיקה ללא-מרשם
**הסיכון:** בדיקה הסתיימה בלי מרשם (לקוח ויתר, אין-שינוי). היום ב-OpticPlus לא מתועד.
**טיפול:** `eye_exams.outcome` enum (6 ערכים) — מאפשר דוחות-מסודרים על שיעורי-המרה-מ-בדיקה-להזמנה.

### 5.6 שדות-קרטומטריה-וביומטריה לא מולאו במרשמים-ישנים (הוסף v2)
**הסיכון:** OpticPlus תעד K1/K2 בעיקר במרשמי-עדשות-מגע, לא תמיד במשקפיים. אורך-גלגל לעיתים-רחוקות. מיגרציה תעבירם NULL ב-90% מהמקרים.
**טיפול:** כל השדות הללו NULL-able. ה-UI לא חוסם committed אם הם חסרים. שדות-חדשים ימולאו רק במרשמים-חדשים מ-cutover-ואילך.

### 5.7 Multi-axis recall complexity (הוסף v2)
**הסיכון:** 4-5 צירי-recall פר-מרשם → דאטה-מודל מורכב יותר. אם לא נתכנן נכון, M12 תקבל data-flood.
**טיפול:** ה-View `v_recall_due` תעשה את האגרגציה — מציגה רק את ה-axis הקרוב-ביותר פר-מרשם. M12 תעבד שורה-אחת פר-מרשם, לא 4-5.

---

## 6. Deferred List

1. הרחבת recall-engine מ-3 ל-13 וריאנטים.
2. מרשם-זמני (`temporary` type) — לקוחות בסיבוך-עיניים זמני.
3. Low-Vision sub-domain.
4. AI-suggested values — המלצה אוטומטית לאופטומטריסט.
5. שמירת-היסטוריה-של-שלבי-בדיקה (4 רשומות-נפרדות בעתיד אם יידרש).
6. **Multi-axis recall full implementation** (R-eye שונה מ-L-eye בתפוגה — חריג נדיר).
7. **(הוסף v2)** Flow "צור מרשם מתפקודי-ראייה" — Daniel directive 2026-05-07 "לא קורה אצלנו בכלל". יחזור אם tenant יבקש.
8. **(הוסף v2)** Print templates גמישות פר-tenant — היום template-קבוע פר-language.
9. **(הוסף v2)** Bulk-action על sidebar (e.g., "סמן כל המרשמים-הישנים כ-superseded").

---

## 7. Entry Points ל-Module Strategist של M6

1. קורא קובץ זה.
2. קורא `__LAUNCH_PLAN_DRAFT__/access-audit/ACCESS_AUDIT_REPORT.md` (פירוט שדות `tb_bdika`, `tb_lenses`, `tb_sapaktav`).
3. קורא Master Plan §4 (M6).
4. קורא M5 brief — להבין את חוזה ה-customer.
5. **קורא את הסקיצה של מסך-המרשם** (`__LAUNCH_PLAN_DRAFT__/architecture-briefs/M6_PRESCRIPTION_EDITOR_MOCKUP.html`).
6. כותב `modules/Module 6 - Prescriptions/MODULE_6_ROADMAP.md` (Phases מומלצות: A — schema + RLS + Views, B — state-machines + RPCs, C — recall-engine 3 וריאנטים, D — migration, E — UI prescription editor, F — UI integration ב-M5 customer card lashonit-3).
7. כותב `modules/Module 6 - Prescriptions/docs/MODULE_SPEC.md`.
8. SPEC נפרד למיגרציה.

---

## 8. החלטות-נסגרות

### החלטות מ-v1:

1. ✅ Exam ו-Prescription = שתי ישויות נפרדות.
2. ✅ Prescription_glasses ו-Prescription_contacts = שתי ישויות נפרדות (לא variant).
3. ✅ שורה-לכל-עין (`*_eyes` table) — Pattern 11.
4. ✅ State-machine מפורש (enum) — לא boolean. Pattern 9.
5. ✅ `prescription_types` = טבלה per-tenant עם capability flags. P19.
6. ✅ Type הוא enum-on-record (לא רשומה-לכל-שלב).
7. ✅ Fact-vs-Rule split: M6 = עובדה, M12 = כלל. Pattern 10.
8. ✅ M12 `recall_rules` כולל `send_offset_minutes` (שלילי או חיובי).
9. ✅ Recall ב-day-1: 3 וריאנטים פעילים. שאר ה-10 deferred.
10. ✅ `exams.outcome` enum-מורחב (6 ערכים) — לדוחות-המרה.
11. ✅ `prescription_contacts_eyes.lens_catalog_id` FK ל-Inventory (M1).

### החלטות חדשות ב-v2 (סשן 2026-05-07):

12. ✅ **M6 הוא מודול-עצמאי, לא חלק מ-M5** — multi-vertical scaling.
13. ✅ **Toggle משקפיים↔עדשות-מגע** — DB מופרד, UI מאוחד, sidebar מסונן (לא ערבוב).
14. ✅ **מסך-המרשם = sidebar היסטוריה (רוחב 280px) + center editor.** Pattern 12.
15. ✅ **בורר ב-sidebar:** רק את ה-type הנבחר (משקפיים *או* עדשות-מגע), לא ערבוב.
16. ✅ **States למרשם:** `draft / committed / superseded / expired / cancelled`. כפתורי הדפסה/שיתוף/הזמנה מנוטרלים ב-draft.
17. ✅ **Iron Rule 32 חל:** draft prescription ניתן-לבטל-לחלוטין. committed prescription מקצה prescription_number אטומית.
18. ✅ **חוזה M5 ↔ M6 דרך 3 Views ייעודיים** ו-2 RPCs (`create_prescription_draft`, `clone_prescription`).
19. ✅ **Field inventory הורחב משמעותית:** קרטומטריה (K1/K2/K-avg/K-axis), אורך-גלגל, VAsc, PH (Pinhole), READ/BIF/MUL/INT additions, BCVA-binocular, refraction-method, exam-reason, treatment-selected, source.
20. ✅ **Contact-lens fields ייחודיים:** POWER (לא SPH+CYL), BC, DIA, OR (Over-Refraction), VA-OR, manufacturer+model, material, water%, Dk/L, replacement-period, wear-schedule, tint.
21. ✅ **`lens_manufacturers` = config table per-tenant חדש** (Acuvue/Air Optix/Proclear/Biofinity/Dailies seed).
22. ✅ **`prescription_types` seed עודכן:** 8 סוגים (למרחק/קריאה/מחשב/פרוגרסיבי/ביפוקל/מולטיפוקל/למשקפי-שמש/קופ"ח).
23. ✅ **`exam_type` הוא enum-Postgres** (סופי/ישן/סובייקטיבי/אובייקטיבי) — state-machine.
24. ✅ **Health-fund FK על prescription** — קופ"ח רלוונטית להחזר נשמרת על המרשם, לא רק על הלקוח (יכולה להשתנות בין מרשמים).
25. ✅ **Multi-axis recall = 4-5 צירים** פר-מרשם, ראה סעיף 13.
26. ✅ **Flow "צור מרשם מתפקודי-ראייה" → deferred.** לא קורה אצל פריזמה.
27. ✅ **Pattern 12 חדש:** sidebar-history + center-editor pattern.
28. ✅ **Auto-commit ב-order-creation:** אם הזמנה נפתחת על draft prescription, ה-prescription עובר אוטומטית ל-committed.

---

## 9. Prescription Editor Screen (חדש v2)

**Mockup:** `__LAUNCH_PLAN_DRAFT__/architecture-briefs/M6_PRESCRIPTION_EDITOR_MOCKUP.html`

### 9.1 Layout כללי

מסך מחולק לשלושה חלקים:

**A. Customer Header (אחיד עם כרטיס-הלקוח של M5):**
- Customer Number (composite — סעיף 12 של M5 Brief).
- שם, גיל, טלפון, עיר, שפה, קופ"ח, עין-דומיננטית.
- "← חזור לכרטיס" — ניווט חזרה ל-M5 customer card.

**B. Type Toggle Bar:**
- 👓 משקפיים | 👁️ עדשות-מגע — סלקטור ראשי.
- מציג ספירה ("5 מרשמי-משקפיים בהיסטוריה").
- מחליף את ה-sidebar וה-center בו-זמנית.

**C. Two-pane main layout:**
- Sidebar ימני (רוחב 280px): היסטוריה.
- Center: editor של מרשם-נבחר.

### 9.2 Sidebar — היסטוריית מרשמים

**שורה קומפקטית פר-מרשם:**
- שורה-עליונה: תאריך + badge (DRAFT/COMMITTED/EXPIRED/CANCELLED).
- שורה-אמצעית: תיאור קצר (אופטומטריסט · סוג · "נוצר היום" / "עד DD.MM").
- שורה-תחתונה: summary R/L (לדוגמה: "R: -2.50 / -0.75 × 180 · L: -2.75 / -0.50 × 175").

**אלמנטים נוספים:**
- חיפוש (תאריך/סוג/אופטומטריסט).
- 4 פילטרים מהירים: הכל / פעיל / DRAFT / פג.
- כפתור "+ מרשם" ירוק בכותרת.
- Footer: סה"כ-מרשמים בכל הסוגים.

**Selected state:** שורה מסומנת בסגול עם פס-צד-ימני. מרשם-נבחר מוצג ב-center.

### 9.3 Center — Prescription Editor

**Context Bar (בראש):**
- Badge עם state (DRAFT צהוב / COMMITTED ירוק / EXPIRED אפור / CANCELLED אדום).
- הסבר קצר ל-state.
- כפתורי-action:
  - DRAFT: "שכפל מרשם קודם" / "בטל מרשם" / **"סגור מרשם →"** (ירוק, primary).
  - COMMITTED: כפתורי הדפסה/שיתוף פעילים.
  - EXPIRED: "שכפל למרשם חדש" בלבד.

**Meta Grid (7 שדות):**
- תאריך מרשם · סוג בדיקה · סוג מרשם · סיבת בדיקה · אופטומטריסט · מקור הבדיקה · תוקף עד.

**Per-eye Parameter Table (השדה הגדול):**
- עמודות: כל הפרמטרים הרפואיים (סעיף 10).
- שורות: R · OD ו-L · OS.
- Tab navigation בין שדות + auto-save.
- חלוקה ל-blocks צבועים: רפרקציה, חדות-ראייה, PD, קרטומטריה, ביומטריה (משקפיים) או רפרקציה+CL+VA+קרטומטריה+OR (עדשות-מגע).

**Secondary Row (שדות-משלימים):**
- משקפיים: READ-add, BIF-add, MUL-add, INT-add, סוג עדשה, חומר עדשה, BCVA, שיטת רפרקציה.
- עדשות-מגע: חברה, דגם, חומר, אחוז-מים, Dk/L, צבע.

**Notes Grid (2 textareas):**
- הערות אופטומטריסט (פנימי, לא מודפס).
- הוראות-לקוח (מודפסות במרשם).

**Bottom Strip:**
- Recall axes (סעיף 13).
- Health-fund info card.

**Print Strip (תחתית):**
- כפתורי PDF/WhatsApp/Email/הזמנה. **מנוטרלים ב-DRAFT, פעילים ב-COMMITTED בלבד.**

### 9.4 שמירה

- **Auto-save** בכל שדה — `onBlur` triggers patch RPC.
- אין כפתור "שמור" כללי.
- שינוי state (DRAFT → COMMITTED) דרך כפתור-מפורש בלבד, לא אוטומטי על-ידי שמירה.

---

## 10. Field Inventory (מקיף, חדש v2)

מבוסס על מחקר השוואתי בין OpticPlus + ISO-8597 + ANSI + clinical-practice.
**★ = critical (כל אופטומטריסט משתמש)**, ◯ = nice-to-have.

### 10.1 משקפיים — פר-עין

**Refraction:**
- ★ Sphere (SPH) — דיופ'
- ★ Cylinder (CYL) — דיופ'
- ★ Axis — 0-180°
- ★ Add (ADD) — דיופ'
- ★ Prism (PR) — דיופ'
- ★ Prism Base — UP/DN/IN/OUT

**Visual Acuity:**
- ★ VAcc (with correction) — "6/6", "20/20"
- ◯ VAsc (without correction)
- ◯ PH (Pinhole)

**PD + Pupil:**
- ★ PD-distance — mm
- ◯ PD-near — mm (שונה לקריאה)
- ◯ Pupil diameter — mm
- ◯ Pupil height — mm

**Keratometry:**
- ◯ K1 — דיופ'
- ◯ K2 — דיופ'
- ◯ K avg — חישוב
- ◯ K axis — °

**Biometry:**
- ◯ Axial length — mm

### 10.2 משקפיים — שדות-אב (לא פר-עין)

- ★ תאריך מרשם
- ★ סוג בדיקה (סופי/ישן/סובייקטיבי/אובייקטיבי)
- ★ סוג מרשם (8 סוגים — ראה seed prescription_types)
- ★ סיבת בדיקה (5 ערכים)
- ★ אופטומטריסט (FK)
- ★ מקור הבדיקה (5 ערכים)
- ★ תוקף עד
- ◯ טיפול נבחר (MyoCare/אטרופין/אורתו-K/בלו-לייט)
- ◯ ביקורת חוזרת — תאריך
- ★ סוג עדשה מומלץ
- ★ חומר עדשה
- ◯ BCVA דו-עיני
- ◯ שיטת רפרקציה (פורופטר/אוטו/Wavefront)
- ★ הוראות-לקוח (מודפס)
- ★ הערות אופטומטריסט (פנימי)
- ★ קופ"ח להחזר (FK)
- ★ תאריך תוקף-קופ"ח

**Additions נפרדים (אם רלוונטיים):**
- READ-add (קריאה)
- BIF-add (ביפוקל)
- MUL-add (מולטיפוקל)
- INT-add (אינטרמדיאט)

### 10.3 עדשות-מגע — פר-עין

**CL Parameters (קריטי):**
- ★ POWER (לא SPH — שדה ייחודי) — דיופ'
- ★ CYL (טורית, אם רלוונטי) — דיופ'
- ★ AXIS — °
- ◯ ADD (multifocal)
- ★ BC (Base Curve) — mm
- ★ DIA (קוטר) — mm

**Visual Acuity:**
- ★ VAcc — חדות עם עדשה
- ◯ VAsc

**Keratometry (קריטי לעדשות-מגע, יותר ממשקפיים):**
- ★ K1, K2, K avg, K axis

**Over-Refraction (ייחודי לעדשות-מגע):**
- ◯ OR — רפרקציה-מעל-העדשה
- ◯ VA-OR — חדות-עם-OR

### 10.4 עדשות-מגע — שדות-אב

- ★ סוג עדשה (יומית/חודשית/שנתית/טורית/מולטיפוקל/RGP/אורתו-K)
- ★ תקופת החלפה (יומית/שבועית/חודשית/רבעונית/שנתית)
- ★ זמן הרכבה (יומי/מתמשך)
- ★ חברה (FK ל-`lens_manufacturers`)
- ★ שם דגם
- ★ חומר (סיליקון-הידרוג'ל/הידרוג'ל/RGP)
- ◯ אחוז-מים
- ◯ Dk/L
- ◯ צבע (Tint)
- ★ FK ל-lens_catalog (M1)

---

## 11. Glasses ↔ Contacts UI Toggle (חדש v2)

**עיקרון:** DB מופרד, UI מאוחד. בורר אחד עליון מחליף את כל המסך — sidebar + center.

**Behavior:**
- Toggle = sticky preference פר-user (localStorage או user_settings). אם משתמש סגר על "עדשות-מגע" אתמול, פתיחה היום של אותו לקוח תפתח על "עדשות-מגע".
- **Sidebar מסונן לפי בחירה** — אין ערבוב. אם בוחר "עדשות-מגע", sidebar מציג רק מרשמי עדשות-מגע. ספירה בסלקטור מציגה כמה יש בכל סוג ("5 מרשמי-משקפיים בהיסטוריה").
- **"+ מרשם" ב-sidebar** יוצר draft מהסוג-הנבחר. אם בוחר משקפיים → draft glasses. אם בוחר עדשות-מגע → draft contacts.
- **לא ניתן לראות מרשמי-משקפיים ועדשות-מגע באותה sidebar.** כדי לעבור — לוחצים על הסלקטור.

**הצדקה:** מרשמי-משקפיים ועדשות-מגע הם שני workflows שונים. ערבוב גורם לבלבול. סלקטור-עליון אומר "אני עכשיו עובד על type X" — הכל במסך עקבי עם זה.

---

## 12. Cross-module Contracts מול M5 (חדש v2)

### 12.1 Views

- `v_customer_prescriptions_summary` (M6 owns) → M5 customer card lashonit-3 reads.
- `v_prescriptions_list_for_customer` (M6 owns) → M6 sidebar reads (when context = customer).
- `v_prescription_full_for_editor` (M6 owns) → M6 center reads.
- `v_customer_for_exam` (M5 owns) → M6 reads when displaying customer header.

### 12.2 RPCs

- `create_prescription_draft(customer_id, type_kind)` — קריאה מ-M5 customer card "+ מרשם חדש".
- `clone_prescription(source_id)` — קריאה מ-M6 editor "שכפל מרשם".

### 12.3 Navigation

- M5 → M6: "פתח ב-M6" / "+ מרשם חדש" / קליק על שורה ב-summary list.
- M6 → M5: "← חזור לכרטיס".
- כל ניווט שומר את context (customer_id) ב-URL/state. רענון-עמוד = מחזיר לאותו context.

---

## 13. Multi-Axis Recall (חדש v2)

**עיקרון:** מרשם-אחד יכול לטריג כמה תזכורות שונות, בצירים שונים, עם תאריכים שונים.

### 13.1 הצירים (Day-1)

| ציר | מתי נדלק | ברירת-מחדל offset |
|---|---|---|
| **בדיקה הבאה** | אחרי 12 חודשים מתאריך המרשם | 12m |
| **תוקף קופ"ח** | תאריך-תוקף-קופ"ח (יכול להיות שונה מתוקף-מרשם) | מתאריך valid_from + 12m או 24m |
| **תוקף מרשם** | תאריך expires_at | 24m (מתבסס על prescription_type) |
| **בקרת התאמה** (עדשות-מגע בלבד) | אחרי 1m מהמרשם | 1m, רק על תקופת-התאמה ראשונית |
| **מסירת-משקפיים** | אחרי הזמנה הוקמה ועברה X-ימים | מותנה ב-order, off as default |

### 13.2 Storage

טבלה נפרדת `prescription_recall_axes`:
- `id`, `prescription_id`, `axis_kind` enum, `due_at`, `is_enabled boolean`, `triggered_at`.

`compute_recall_due_dates(prescription_id)` יוצרת/מעדכנת שורות-recall ל-מרשם בכל commit.

### 13.3 View ל-M12

`v_recall_due` מאחדת:
- WHERE `is_enabled = true`
- AND `triggered_at IS NULL`
- AND `due_at <= NOW() + offset_threshold`
- ORDER BY `due_at ASC`
- מציגה רק את הציר-הקרוב-ביותר פר-מרשם (לא 4-5 שורות פר-מרשם).

M12 מקבל שורה-אחת פר-מרשם, מטפל ב-channel/template/offset שלה דרך `recall_rules` table.

---

*סוף M6 Architecture Brief v2. עודכן 2026-05-07 (תוספות UX/screens + field inventory + multi-axis recall + cross-module contracts מול M5).*
*הצעד הבא: סגירת M5+M6, מעבר למודול הבא לפי החלטה אסטרטגית.*
