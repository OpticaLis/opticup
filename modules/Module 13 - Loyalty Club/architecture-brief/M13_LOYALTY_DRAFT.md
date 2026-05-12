# M13 — Loyalty Club — אפיון מקיף (טיוטה)

> **סטטוס:** טיוטה לקריאת Daniel — Cowork session 2026-05-09
> **לא נעול:** דורש החלטות Daniel (סוף המסמך) לפני הפיכה ל-M13_LOYALTY_BRIEF.md
> **בנוי על:** M13_HANDOFF.md + Master Plan §4 + Launch Decisions Apr 28 + חוזים סגורים מ-M5/M7/M8/M11/M12 + אפיון בסיסי של Daniel

---

## 1. מטרה והקשר

מועדון לקוחות הוא שכבת CRM-מסחרית מעל הליבה (M5 לקוחות + M7 הזמנות + M8 תשלומים). הוא מתפקד כ:

- **מנוע צבירה** — כל קנייה צוברת קרדיט/נקודות לפי tier של הלקוח
- **מנוע תגמול** — קופונים, הנחות, יתרת זיכוי, הטבות tier-specific
- **מנוע קידום** — אלגוריתם שנתי שמעלה (או מוריד) tier על בסיס פעילות
- **מנוע משפחה** — pooling של הוצאות בתוך unit משפחתי
- **מנוע תקשורת** (דרך M12) — הודעות אוטומטיות בנקודות-מפתח של מסע-החבר

**זה לא:** מנוע קמפיינים שיווקיים (זה M4/M12), AI המלצות (לא בסקופ), gamification (deferred), referral program (deferred).

---

## 2. ישויות מרכזיות (6 entities)

### 2.1 `loyalty_membership` — חברות פעילה

חבר = שורה אחת ב-`loyalty_membership` עם FK ל-`customers.id`. לקוח **אחד** יכול להיות `member` של מועדון אחד (או של אף אחד). חברות היא state-bearing — היא יודעת מתי הצטרף, מתי מסתיים, איזה tier כרגע, ועל איזה household_id מחובר.

**שדות עיקריים:**
- `tenant_id` — חובה (Iron Rule 14)
- `customer_id` — FK יחיד-לאחד עם `customers`
- `tier_id` — FK ל-`loyalty_tier`
- `household_id` — FK ל-`loyalty_household` (NULL = פרטית, ערך = משפחתית)
- `joined_at`, `expires_at` — חברות שנתית/תאריך סיום
- `status` — `active` / `expired` / `cancelled` / `paused`
- `annual_fee_paid_at` — last fee payment (NULL אם tenant לא גובה)
- `lifetime_spend` — צבור היסטורי (לא יורד)
- `current_year_spend` — מתאפס בכל שנת-חברות (לקידום-tier)
- `created_at`, `updated_at`

**RLS:** tenant_isolation (canonical pattern)

---

### 2.2 `loyalty_tier` — הגדרות tier per-tenant

זהו ה-config-table מסוג Pattern P19 (לא enum). כל tenant מגדיר את ה-tiers שלו: שמות, צבעים, אייקונים, ספים, צבירה, הטבות.

**שדות עיקריים:**
- `tenant_id`
- `slug` — `silver`/`gold`/`diamond` (per tenant; pattern דומה ל-`crm_lead_status`)
- `name_he`, `name_en`, `name_ru` — שם הציבורי (per tenant choice)
- `display_order` — סדר תצוגה
- `color`, `icon` — UI hints
- `annual_fee` — דמי-חבר שנתיים (NULL = חינם, מספר = ₪X)
- `min_annual_spend_to_promote` — סף לעלייה ל-tier הבא בסוף שנה
- `min_annual_spend_to_retain` — סף לשמירת tier (אם נמוך מזה — downgrade)
- `accrual_rate` — % מתוך כל קנייה שצובר (לדוג' 0.05 = 5%)
- `accrual_unit` — `credit` / `points` (per tenant — Prizma תהיה credit, אחרים אולי points)
- `redemption_value` — אם points: כמה ₪ נקודה אחת שווה (אם credit: 1.0)
- `tier_benefits` — JSONB: מערך של הטבות קונפיגורבילי (free shipping, priority service, exclusive coupons וכו')
- `is_default_tier` — true עבור ה-tier שנכנסים אליו אוטומטית בהצטרפות
- `is_active` — soft-disable

**Why JSONB for benefits:** הטבות הן הטרוגניות ולא ניתן לחזות מראש מה כל tenant ירצה (free shipping vs priority queue vs exclusive events vs discount on second pair). JSONB מאפשר extension בלי schema-change. הקונסיומרים (M7/M11/UI) קוראים את ה-JSONB מתוך view-helper.

**RLS:** tenant_isolation

---

### 2.3 `loyalty_household` — יחידה משפחתית

כש-tenant מאפשר family pooling, זוהי הישות שמקבצת מספר לקוחות יחד. אם tenant לא מאפשר — הטבלה ריקה ו-`household_id` תמיד NULL.

**שדות עיקריים:**
- `tenant_id`
- `name` — לדוג' "משפחת כהן" (לתצוגה ב-UI מנהל)
- `head_customer_id` — FK ל-`customers` — מי "ראש המשפחה" (משלם דמי-חבר; מקבל הודעות על-tier-up)
- `max_members` — per-tenant config (5 ב-Prizma; אחרים אולי 4 או 8)
- `created_at`, `dissolved_at` — תיעוד life-cycle
- `pooling_policy` — `equal` (כולם משפיעים שווה על tier) או `head_only` (רק ראש-המשפחה משפיע, השאר נהנים)

**שדה משני:** `loyalty_membership.household_id` הוא ה-FK שמחבר. חבר לא יכול להיות בשני households (UNIQUE על membership_id). יציאה מ-household = שמירת היסטוריה (`left_household_at` עמודה ב-membership) + reset של household_id ל-NULL.

**RLS:** tenant_isolation

---

### 2.4 `loyalty_credit_balance` — יתרת זיכוי לכל חבר

טבלת balance נפרדת מ-membership כי balance הוא mutable ויש לו audit trail כבד (כל transaction זז את היתרה).

**שדות עיקריים:**
- `tenant_id`
- `customer_id` — אם tenant ב-`pooling_policy=equal` — או `household_id`. **החלטה: balance הוא per-customer תמיד, גם ב-household.** ה-household משפיע רק על tier-promotion, לא על balance. רציונל: aprivacy + פשטות (כל חבר רואה את שלו).
- `balance` — current credit balance (₪)
- `lifetime_earned` — צבור היסטורי
- `lifetime_redeemed` — סה"כ נמשך
- `last_activity_at` — לחישוב expiry

**RLS:** tenant_isolation

---

### 2.5 `loyalty_credit_transaction` — audit trail של תנועות

כל earn/redeem/expiry/adjustment הוא שורה כאן. unfilterable, immutable. אסור UPDATE.

**שדות עיקריים:**
- `tenant_id`
- `customer_id`
- `direction` — `earn` / `redeem` / `expire` / `adjust_admin`
- `amount` — חיובי תמיד; ה-`direction` קובע את הסימן
- `balance_after` — snapshot של היתרה אחרי התנועה (לדיבוג)
- `source_type` — `purchase` / `redemption` / `manual_admin` / `expiry_job` / `tier_bonus` / `signup_bonus`
- `source_id` — FK ל-מקור (order_id אם purchase, redemption_id אם redemption)
- `reason` — string אופציונלי (חובה ב-manual_admin)
- `created_by_user_id` — מי ביצע (NULL ל-cron jobs)
- `created_at`

**אסור UPDATE.** רק INSERT. תיקון = transaction חדש מסוג `adjust_admin`.

**RLS:** tenant_isolation + read-only ל-authenticated (write רק דרך RPC)

---

### 2.6 `loyalty_coupon` — קופון מונפק

**הערה חשובה — חלוקת אחריות:** M13 **מנפיק** קופונים (קובע מי, כמה, מתי, על איזה תוצרת); M7 **שורף** אותם ב-checkout (מבצע את ההנחה בפועל). הסגמנטציה (Frames/Lenses/Coatings) חיה ב-M7 כי שם יודעים מה הסוג. M13 יודע "תקף על תוצרת X" כתגית; M7 מתרגם תגית → product_type בעת השריפה.

**שדות עיקריים ב-M13:**
- `tenant_id`
- `code` — קוד קופון (ייחודי per-tenant; UNIQUE composite)
- `customer_id` — מי קיבל אותו (NULL = generic, ערך = personal)
- `tier_id` — אם הקופון הוא tier-bonus, איזה tier
- `value_type` — `percent` / `fixed_amount` / `free_item`
- `value` — % או ₪ או quantity (לפי value_type)
- `max_redemption_value` — תקרה ב-₪ אם value_type=percent (למנוע over-redemption)
- `applies_to` — JSONB. דוגמה: `{"product_types": ["sunglass_frame"]}` או `{"category_ids": [12, 47]}` או `{"all": true}`
- `min_purchase_amount` — סף קנייה מינימלי
- `expires_at`
- `usage_limit` — 1 ל-single-use, N ל-multi-use
- `usage_count` — counter
- `is_transferable` — האם ניתן להעביר לאדם אחר
- `issued_by_source` — `signup_bonus` / `tier_promotion` / `birthday` / `manual_admin` / `campaign`
- `issued_at`, `redeemed_at` (NULL עד שנשרף)

**RLS:** tenant_isolation

---

## 3. מנועים (4 engines)

### 3.1 מנוע צבירה (Earn Engine)

**Trigger:** order_id נסגר ב-M7 (status=`completed`).
**Flow:**
1. M7 קורא ל-RPC `loyalty_earn_on_order(order_id)`.
2. RPC: שולף membership + tier של הלקוח.
3. אם אין membership — return 0 (לא חבר, לא צובר).
4. מחשב `accrual = order.total * tier.accrual_rate`.
5. INSERT ל-`loyalty_credit_transaction` (direction=`earn`, source=`purchase`).
6. UPDATE `loyalty_credit_balance` (atomic: `balance = balance + accrual`).
7. UPDATE `loyalty_membership.current_year_spend = current_year_spend + order.total`.
8. אם `current_year_spend` חצה את `tier.min_annual_spend_to_promote` — trigger event "tier_promotion_eligible" (לא מקדם אוטומטית — ראה §3.3 promotion engine).
9. החזר {accrued: X, new_balance: Y, promotion_eligible: bool} ל-M7.

**Edge cases:**
- החזר/refund של order → trigger reverse: `direction=adjust_admin`, source=`refund`, amount שווה ל-earn המקורי.
- order עם payment_method=`loyalty_credit` (חלקי) — earn מתבצע על ה-`net_paid_excluding_credit` (כדי שלא תהיה earn-on-redemption לופ).

**Rule 1/2 (Iron):** atomic via RPC, writeLog נקרא בכל transaction.

---

### 3.2 מנוע מימוש (Redeem Engine)

**Trigger:** ב-checkout של M7, הלקוח בוחר `payment_method = loyalty_credit`.
**Flow:**
1. M7 קורא ל-RPC `loyalty_redeem_credit(customer_id, amount, order_id)`.
2. RPC: בודק `loyalty_credit_balance.balance >= amount`. אם לא — error.
3. INSERT ל-`loyalty_credit_transaction` (direction=`redeem`, source=`redemption`, source_id=order_id).
4. UPDATE balance (`balance = balance - amount`).
5. M7 רושם את ה-`amount` כ-`payment_record` (per M8 contract — מסוג `loyalty_credit`, internal-non-cash).
6. אם order.total > redeemed_amount — היתרה נדרשת ב-payment_method אחר (הפיצול ב-M7 כבר תוכנן).

**Coupon redemption (parallel flow):**
1. M7 ב-checkout מקבל coupon code מהלקוח.
2. M7 קורא ל-RPC `loyalty_validate_coupon(code, order_items)` — מחזיר {valid: bool, applicable_amount: ₪, reason}.
3. אם valid — M7 מחיל את ההנחה internally בקלקולציית-הסכום.
4. בסגירת order — M7 קורא `loyalty_consume_coupon(code, order_id)` שמסמן redeemed_at + מעדכן usage_count.

**Edge cases:**
- ביטול order עם coupon נשרף → reverse via RPC `loyalty_uncomsume_coupon` (מאפס redeemed_at אם usage_limit=1, או מוריד usage_count).
- coupon פג תוקף בין validate ל-consume (race) → consume מבצע re-validation; אם פג — error חוזר ל-M7 כ-stop checkout.

---

### 3.3 מנוע קידום-tier (Promotion Engine)

**Trigger:** Cron job יומי (`pg_cron`) שרץ ב-02:00 ועובר על כל ה-memberships.

**Flow per membership:**
1. אם `expires_at < now()` ו-`status='active'` — set status=`expired`, downgrade ל-default_tier, schedule notification (M12).
2. אם `joined_at + 1 year >= now()` — שנת-חברות הסתיימה. החלת חוקי-קידום:
   - אם `current_year_spend >= current_tier.min_annual_spend_to_promote` AND קיים tier עם `display_order > current` — קידום (UPDATE tier_id, INSERT transaction `tier_bonus` אם מוגדר, schedule notification).
   - אם `current_year_spend < current_tier.min_annual_spend_to_retain` — downgrade (per החלטת tenant — ראה שאלה D3).
   - אם בין שניהם — שמירה.
3. RESET `current_year_spend = 0` עבור השנה החדשה.
4. UPDATE `joined_at` חישוב מחדש (extend by 1 year אם החברות מתחדשת אוטומטית — ראה D2).

**Family pooling:** כשמחשבים `current_year_spend`, אם הלקוח שייך ל-household עם `pooling_policy=equal` — סוכמים את כל ההוצאות של חברי-household. אם `head_only` — מחשבים רק את head_customer.

---

### 3.4 מנוע תקשורת (Notification Engine)

M13 לא שולח הודעות בעצמו. הוא קורא ל-M12 RPC `send_message_by_template`. נקודות-מפתח של מסע-החבר:

| Event | Trigger | Template (M12) |
|---|---|---|
| Welcome / Enrollment | חבר חדש נוסף | `loyalty_welcome` |
| Tier promotion | שדרוג ב-promotion engine | `loyalty_tier_promoted` |
| Tier downgrade | הורדה ב-promotion engine | `loyalty_tier_downgraded` |
| Membership expiring soon | 30/14/7 ימים לפני expiry (cron) | `loyalty_renewal_reminder` |
| Membership expired | אחרי expiry | `loyalty_expired` |
| Credit balance milestone | חצה רף (₪100/₪500/₪1000) | `loyalty_balance_milestone` |
| Credit expiring soon | 60 ימים לפני expiry של credit | `loyalty_credit_expiring` |
| Approaching next tier | חצה 80% מהסף | `loyalty_almost_next_tier` |
| Birthday / Anniversary | יום-הולדת לקוח (per-tenant config) | `loyalty_birthday` |
| Coupon issued | קופון חדש | `loyalty_coupon_issued` |

הערוץ לכל template נקבע ב-M12 (Template-Channel Matrix). M13 פשוט מוסר את הנתונים.

---

## 4. חוזים מול מודולים אחרים (סיכום מאוחד)

| מ-מודול | חוזה |
|---|---|
| M5 (Customers) | M5 מנהל את `customers` עצמו. M13 קורא לקריאה (`customer.id`, `customer.first_name`, `customer.phone`). שדה `qhaver`/`moadon` הקיים ב-customer — נסגר/יוסר; ה-source-of-truth החדש הוא loyalty_membership.status. |
| M5 → M13 | אם enrollment_via_consent=true (ראה D5) — כשלקוח חדש מאשר תקנון ב-M4, נוצר אוטומטית membership ב-default_tier. |
| M7 (Orders) | M7 קורא `loyalty_earn_on_order` בסגירת order. M7 קורא `loyalty_validate_coupon` + `loyalty_consume_coupon` בעת checkout. M7 רושם payment_record מסוג loyalty_credit. |
| M8 (Payments) | M8 רואה loyalty_credit כ-payment_method מסוג internal-non-cash. לא עובר POS. נכלל ב-EOD reconciliation כקטגוריה נפרדת. |
| M11 (Reports) | M13 חושף view `v_loyalty_for_reports` עם: members_active_count, by_tier_breakdown, redemption_rate, ARPU_member_vs_nonmember, top_spenders_per_tier_30d, churn_rate, household_count. |
| M12 (Communications) | M13 קורא `send_message_by_template` ב-10 נקודות-מפתח (§3.4). M12 מטפל בערוץ + locale + שריפת variables. |
| M4 (CRM) | אם enrollment_via_consent=true — חתימת תקנון ב-/quick-register/ או `/supersale/` יוצרת membership אוטומטי. M4 ממשיך לטפל בשפה הרגישה של הסכמה. |

---

## 5. סקיצות (3 מסכים נדרשים — pre-design)

### S1 — Customer Card → Tab "מועדון" (Tab חדש בכרטיס לקוח של M5)

תוכן:
- בלוק ראש: tier badge גדול עם שם + צבע + אייקון. דמי-חבר ששולמו, תאריך-חידוש.
- בלוק יתרה: balance עכשיו, lifetime earned, lifetime redeemed.
- בלוק היסטוריה (3 אחרונות + "הצג הכל"): תנועות earn/redeem עם תאריך + סכום + מקור.
- בלוק קופונים: רשימת קופונים פעילים — code, value, applies-to, expires.
- בלוק משפחה (אם household): רשימת חברים + ראש-משפחה (עם דגל) + סטטיסטיקת תרומה לציון.
- בלוק progression: progress-bar ל-tier הבא ("עוד ₪450 ל-Gold"). אם כבר ב-top tier — "Top Tier!".
- כפתור פעולה (admin): "Adjust balance" / "Issue coupon" / "Manage household".

### S2 — Admin: Loyalty Dashboard

מסך-תפעול של מנהל המועדון. מציג:
- KPI cards: total members, active vs expired, total credit outstanding (₪), redemption rate %.
- by-tier breakdown — טבלה: tier, count, % of base, avg-spend, accrual cost YTD.
- recent activity stream: 20 transactions אחרונות.
- search bar: customer name/phone → קופץ ל-S1.
- "issue coupon batch" — כלי לקמפיין: בחירת קריטריונים → מנפיק לכמות.
- "households" — רשימת households + max-members + שינוי policy.

### S3 — Checkout (M7) → Loyalty Block

זה לא מסך חדש; זה רכיב שנוסף ל-M7 checkout. כשהלקוח חבר:
- שורת tier badge קטנה ליד שם הלקוח.
- בלוק "השתמש ביתרה": שדה ₪ + תקרה (= balance) + checkbox "השתמש בכל היתרה".
- שדה coupon: input + "הוסף קופון". אחרי validate → תוצג ההנחה כשורה ב-summary.
- אחרי סגירה — הודעה: "צברת ₪X ליתרת זיכוי. סך-הכל: ₪Y."

---

## 6. Pattern-passover — נקודות-חולשה ל-future-proofing

לקח מ-M11/M12: לפני שננעל Brief, לעבור על נקודות שיכולות "להישבר" בעתיד.

**P1 — Multi-tier-program per tenant.** האם tenant יכול להריץ 2 תוכניות במקביל (Silver/Gold/Diamond + תוכנית-חברים-פרימיום-נפרדת)? הצעה: תמיכה future via שדה `loyalty_program_id` שיהיה NULL בתחילה (תוכנית יחידה) ואפשר להוסיף לוו אותו בלי schema-change.

**P2 — Cross-tenant pooling.** אם tenant A ו-tenant B הם חלק מ-same brand group — האם חבר ברשת A יכול לצבור ברשת B? **לא בסקופ ל-LIVE.** Slot מובטח: פותרים על-ידי שמירה של `network_id` ב-tenants — בעתיד.

**P3 — AI-personalization slot.** הצעות מותאמות-אישית מבוססות-loyalty-history. **לא בסקופ.** Slot: `loyalty_membership.preferences` JSONB ריק לעת-עתה.

**P4 — Tier override per customer.** האם admin יכול להעניק ל-VIP "כבוד-tier" Gold למרות שלא הגיע לסף? Slot: `loyalty_membership.manual_tier_override` (NULL = automatic, ערך = override). Promotion engine מתעלם משדרוג אם override קיים.

**P5 — Currency.** ₪ קשיח כרגע. כשתבוא tenant שני בארץ אחרת — שדה `loyalty_tier.accrual_currency` יוסף עם default 'ILS'. כל המנועים יקראו אותו במקום hardcode.

---

## 7. סיכונים זוהו

**R1 — Race condition בין earn ל-redeem בו-זמנית.** הצעה: כל ה-RPCs דורשים `FOR UPDATE` על שורת ה-balance.

**R2 — Family fraud.** משפחה שמוסיפה "חבר" סינטטי כדי לחצות סף-קידום. הצעה: `max_members` per-tenant + הודעה ל-admin על households שהוסיפו חברים מהר.

**R3 — Coupon stacking.** לקוח שורף 3 קופונים על אותו order. הצעה: per-tenant config `max_coupons_per_order` (default=1, override-able).

**R4 — Credit expiry policy missing.** אם tenant לא הגדיר → infinite credit liability. הצעה: default 24 חודשים, override-able.

**R5 — Tier downgrade resentment.** לקוח שהיה Gold יורד ל-Silver — סיכון לזעם. הצעה: `loyalty_tier.downgrade_grace_period` (חודשים) + הודעת-אזהרה לפני (M12 template).

**R6 — Prizma legacy data import.** כיום יש "מועדון" קיים בפריזמה (שדות `qhaver`/`moadon` ב-customers). מי הם החברים הקיימים? איזה tier? איזו יתרה? צריך SPEC migration ייעודי.

---

## 8. Out-of-scope ל-LIVE day 1

- Marketing campaigns engine (M4/M12 territory)
- AI recommendation engine
- Cross-tenant pooling
- Gamification (badges/leaderboards)
- Referral program ("הבא חבר")
- Multi-program-per-tenant
- Tier override per customer (slot מובטח, לא יממומש בגרסה ראשונה)
- B2B loyalty (חברי-מועדון עסקיים)

---

## 9. שאלות שדורשות החלטה Daniel

(במסמך נפרד למטה — רק 7 שאלות, כל אחת עם המלצה)
