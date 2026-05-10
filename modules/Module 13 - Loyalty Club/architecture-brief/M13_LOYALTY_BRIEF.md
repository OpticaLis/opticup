# M13 — Loyalty Club — Architecture Brief v1

> **מצב:** סגור · 2026-05-09
> **מאשר:** Daniel
> **סקיצות:** 5 מסכים — `M13_SKETCHES.html` באותה תיקייה
> **תלוי ב-Briefs נסגרים:** M5 (Customers), M7 (Orders), M8 (Payments), M11 (Reports), M12 (Communications)

---

## 1. מטרה

מועדון לקוחות SaaS-מוכן שמתפקד כשכבת CRM-מסחרית מעל הליבה: צבירת קרדיט אוטומטית בכל קנייה, קופונים, קידום-tier אוטומטי לפי הוצאה שנתית, סל משפחתי משותף, והודעות אוטומטיות בנקודות-מפתח של מסע-החבר. כל המספרים והכללים ניתנים לקונפיגורציה per-tenant מהפאנל ניהול.

**זה לא:** מנוע קמפיינים שיווקיים (M4/M12), AI המלצות (לא בסקופ), gamification (deferred), referral program (deferred).

---

## 2. החלטות ננעלות (Prizma Day-1)

### תמחור
- מודל עיקרי: **מחיר אחיד** + עלייה ב-tier לפי הוצאה שנתית
- חברות בודדת: **₪50** · משפחתית: **₪100** (multiplier=2)
- משך חברות: **24 חודשים**
- חידוש: ידני, ₪50 נטו (בלי בונוס נוסף)

### בונוס הצטרפות
- **5% הנחה מיידית על הקנייה הראשונה**
- תקרה: ₪150
- תוקף: 30 יום מההצטרפות
- ניתן לכבות per-tenant

### Tiers Prizma
| Tier | סף עלייה (₪/שנה) | סף שמירה | מסגרות | עדשות | אחר |
|---|---|---|---|---|---|
| Silver (default) | 0 | 0 | 4% | 7% | 0% |
| Gold | 10,000 | 8,000 | 6% | 12% | 0% |
| Diamond | 15,000 | 12,000 | 8% | 15% | 0% |

### משפחה
- מקסימום חברים: 5
- מדיניות צבירה: equal (כולם תורמים)
- scale_factor: 0.3 (סף עולה 30% לחבר נוסף)
- **סל משותף, default פתוח** (כל בן-משפחה מממש בלי אישור)
- תקרת מימוש לבן-משפחה: 0 (ללא הגבלה) — ניתן לקבוע per-משפחה

### קרדיט
- תוקף: 24 חודשים
- Grace period downgrade: 6 חודשים
- מקסימום קופונים בהזמנה: 1

### הצטרפות
- **דרך אחת בלבד:** עמוד באתר (M3 storefront)
- אין auto-opt-in דרך תקנון
- אין enrollment בקופה
- נציג יכול ללוות לקוח במילוי על מסך/טאבלט בחנות

### Migration
- אין — מתחילים מאפס. החברים הקיימים ב-`customers.qhaver` הם leftover של מערכת ישנה שלא יחזרו ל-M13.

---

## 3. ישויות (6 entities)

### 3.1 `loyalty_membership` — חברות פעילה

חבר = שורה אחת עם FK ל-`customers.id`. לקוח אחד יכול להיות member של מועדון אחד או של אף אחד.

**שדות עיקריים:**
- `tenant_id`, `customer_id`, `tier_id`
- `household_id` (NULL=פרטית, ערך=משפחתית)
- `joined_at`, `expires_at`, `status` (active/expired/cancelled/paused)
- `annual_fee_paid_at`
- `lifetime_spend` (צובר היסטורי, לא יורד)
- `current_year_spend` (מתאפס בכל שנת-חברות לקידום)
- `welcome_bonus_used_at` (NULL = עוד לא ניצל את הבונוס)
- `manual_tier_override` (slot עתידי — VIP override)

**RLS:** tenant_isolation (canonical JWT pattern)

### 3.2 `loyalty_tier` — הגדרות tier

טבלת config (Pattern P19). per-tenant. כל ה-numbers שב-S5 מגיעים מכאן.

**שדות עיקריים:**
- `tenant_id`, `slug`, `name_he/en/ru`, `display_order`, `color`, `icon`
- `annual_fee` — דמי-חבר ל-tier (per_tier_pricing) או = base_fee (flat_pricing)
- `pricing_model` — `flat_pricing` (Prizma default) / `per_tier_pricing`
- `min_annual_spend_to_promote` — סף עלייה
- `min_annual_spend_to_retain` — סף שמירה
- `accrual_rate_frames`, `accrual_rate_lenses`, `accrual_rate_default`
- `tier_benefits` JSONB — הטבות חופשיות (free shipping, priority queue, וכו')
- `is_default_tier` (true ל-Silver), `is_active`

**RLS:** tenant_isolation

### 3.3 `loyalty_household` — יחידה משפחתית

קיים רק כש-tenant מאפשר family pooling.

**שדות עיקריים:**
- `tenant_id`, `name`, `head_customer_id`
- `max_members` (per-tenant, default 5)
- `pooling_policy` (equal / head_only)
- `redemption_mode` — `open` (default Prizma) / `requires_head_approval`
- `redemption_cap_per_member` (₪, NULL=ללא)
- `created_at`, `dissolved_at`

יציאה מ-household = `loyalty_membership.left_household_at` + `household_id=NULL`. היסטוריה נשמרת.

**RLS:** tenant_isolation

### 3.4 `loyalty_credit_balance` — יתרת זיכוי

**מודל סל-משותף:** balance הוא per-household (לא per-customer) כשקיים household; per-customer כש-household_id IS NULL.

**שדות עיקריים:**
- `tenant_id`
- `customer_id` או `household_id` (mutually exclusive — אחד מהם NULL)
- `balance` (₪)
- `lifetime_earned`, `lifetime_redeemed`
- `last_activity_at` (לחישוב expiry)

**RLS:** tenant_isolation

### 3.5 `loyalty_credit_transaction` — audit trail

כל earn/redeem/expiry/adjustment. **immutable** — אין UPDATE.

**שדות עיקריים:**
- `tenant_id`
- `customer_id`/`household_id` (target)
- `source_customer_id` — מי תרם (בעל הקנייה במקרה earn)
- `spending_customer_id` — מי משך (בעל ההזמנה במקרה redeem)
- `direction` (earn/redeem/expire/adjust_admin)
- `amount` (חיובי תמיד; direction קובע סימן)
- `balance_after` (snapshot לדיבוג)
- `source_type` (purchase/redemption/manual_admin/expiry_job/tier_bonus/signup_bonus/welcome_discount)
- `source_id` (FK ל-order_id וכו')
- `reason` (חובה ב-manual_admin)
- `created_by_user_id`, `created_at`

**Two-tag traceability:** `source_customer_id` + `spending_customer_id` נותן שקיפות מלאה — "מי תרם, מי משך" — בלי lock-mechanism (פתרון לבעיה של Access).

**RLS:** tenant_isolation; INSERT-only via RPC.

### 3.6 `loyalty_coupon` — קופון מונפק

**אחריות מחולקת:** M13 מנפיק, M7 שורף.

**שדות עיקריים:**
- `tenant_id`, `code` (UNIQUE per-tenant)
- `customer_id` (NULL=generic, ערך=אישי) או `household_id` (קופון משפחתי)
- `tier_id` (אם tier-bonus)
- `value_type` (percent/fixed_amount/free_item)
- `value`, `max_redemption_value`
- `applies_to` JSONB — `{"product_types":["sunglass_frame"]}` או `{"all":true}`
- `min_purchase_amount`, `expires_at`
- `usage_limit`, `usage_count`
- `is_transferable`
- `issued_by_source` (signup_bonus/tier_promotion/birthday/manual_admin/campaign)
- `issued_at`, `redeemed_at`

**RLS:** tenant_isolation

---

## 4. מנועים (4 engines)

### 4.1 Earn Engine

**Trigger:** M7 → order completed → calls `loyalty_earn_on_order(order_id)`.

**Flow:**
1. שלוף membership + tier של customer.
2. אם אין membership → return 0.
3. עבור על order_items, חשב accrual לכל פריט לפי category (frames/lenses/default) × tier rate.
4. INSERT ל-`loyalty_credit_transaction` (direction=earn, source_customer_id=customer, source_id=order_id).
5. UPDATE balance אטומי (`FOR UPDATE` lock).
6. אם יש household → balance של household. אחרת balance של customer.
7. UPDATE `loyalty_membership.current_year_spend`.
8. אם חצה 80% מ-promote_threshold → trigger `almost_next_tier` notification (idempotent).
9. אם חצה את ה-threshold → trigger `tier_promotion_eligible` event (לא מקדם — promotion engine עושה).
10. החזר {accrued, new_balance, promotion_eligible} ל-M7.

**Edge cases:**
- Refund של order → reverse via `adjust_admin`, source=refund.
- Order עם payment_method=loyalty_credit חלקי → earn רק על net_paid_excluding_credit (לא לופ).

**Iron Rules:** atomic via RPC (1), writeLog (2).

### 4.2 Redeem Engine

**Trigger:** M7 checkout → לקוח חבר → רכיב Loyalty מופיע (S3).

**Flow per redeem:**
1. M7 קורא `loyalty_redeem_credit(customer_id, amount, order_id)`.
2. RPC: שלוף membership; אם household → balance של household; אחרת של customer.
3. בדוק `redemption_mode`:
   - `open` → המשך
   - `requires_head_approval` → אם spending_customer != head → trigger approval flow (push לראש-המשפחה דרך M12 — `loyalty_redemption_pending_approval`). חזור pending=true. M7 חוסם checkout עד אישור.
4. בדוק `redemption_cap_per_member`: אם amount > cap AND spending_customer != head → require approval (גם במצב פתוח).
5. בדוק balance >= amount (FOR UPDATE).
6. INSERT transaction (direction=redeem, source_customer=NULL, spending_customer=customer).
7. UPDATE balance.
8. M7 רושם `payment_record` סוג loyalty_credit (M8 contract).

**Coupon flow (parallel):**
1. M7 → `loyalty_validate_coupon(code, order_items)` → {valid, applicable_amount, reason}.
2. M7 מחיל הנחה internally.
3. בסגירת order → `loyalty_consume_coupon(code, order_id)`.

**Welcome Bonus (special case):**
- Trigger אוטומטי בקנייה הראשונה אחרי הצטרפות (אם `welcome_bonus_used_at IS NULL` AND now() < joined_at + welcome_bonus_expires_after_days).
- מחושב כ-`min(order.total × welcome_bonus_value, welcome_bonus_max_amount)`.
- INSERT transaction (source_type=welcome_discount).
- UPDATE `loyalty_membership.welcome_bonus_used_at = now()`.

### 4.3 Promotion Engine

**Trigger:** Cron job יומי (`pg_cron`) ב-02:00.

**Flow per membership:**
1. אם expires_at < now() AND status=active → status=expired, downgrade ל-default_tier, schedule `loyalty_expired` notification.
2. אם joined_at + 1 year ≤ now() — שנה הסתיימה, החל חוקי-קידום:
   - חבר ב-household → סף = base_threshold × (1 + (members-1) × scale_factor). חישוב על אגרגציית-משפחה של current_year_spend.
   - חבר עצמאי → סף = base_threshold. חישוב על current_year_spend שלו.
   - ספי promote ↔ retain:
     - spend ≥ promote_threshold AND קיים tier גבוה יותר → קידום.
     - spend < retain_threshold → grace=true, schedule `loyalty_tier_grace` notification (60 יום).
     - אחרת → שמירה.
3. RESET current_year_spend = 0.
4. Schedule מימוש grace בעוד 6 חודשים (אם spend עדיין נמוך → downgrade בפועל).

### 4.4 Notification Engine

M13 קורא ל-M12 `send_message_by_template`. ערוץ נקבע ב-M12 לפי Template-Channel Matrix.

| Event | Trigger | Template |
|---|---|---|
| Welcome | חבר חדש | `loyalty_welcome` |
| Tier promoted | promotion engine | `loyalty_tier_promoted` |
| Tier downgraded | grace expired | `loyalty_tier_downgraded` |
| Renewal reminder | 30/14/7 ימים לפני expires_at | `loyalty_renewal_reminder` |
| Membership expired | expires_at חצה | `loyalty_expired` |
| Credit expiring | 60 ימים לפני credit expiry | `loyalty_credit_expiring` |
| Almost next tier | 80% מהסף | `loyalty_almost_next_tier` |
| Birthday | יום-הולדת לקוח | `loyalty_birthday` |
| Coupon issued | קופון חדש | `loyalty_coupon_issued` |
| Redemption approval | בן-משפחה מבקש מימוש | `loyalty_redemption_pending` |

---

## 5. חוזים מול מודולים אחרים

| מ-מודול | חוזה |
|---|---|
| **M5 Customers** | M5 הוא source-of-truth ל-customers. M13 קורא לקריאה. שדה `customers.qhaver` יבוטל אחרי migration עתידית — source-of-truth החדש = `loyalty_membership.status='active'`. |
| **M7 Orders** | M7 קורא `loyalty_earn_on_order` בסגירה, `loyalty_validate_coupon` + `loyalty_consume_coupon` ב-checkout, `loyalty_redeem_credit` למימוש קרדיט. |
| **M8 Payments** | M8 רואה `loyalty_credit` כ-payment_method internal-non-cash. לא עובר POS. נכלל ב-EOD reconciliation כקטגוריה נפרדת. |
| **M11 Reports** | M13 חושף `v_loyalty_for_reports` עם: members_active_count, by_tier_breakdown, redemption_rate, ARPU_member_vs_nonmember, top_spenders_per_tier_30d, churn_rate, household_count, total_credit_outstanding. |
| **M12 Communications** | M13 קורא `send_message_by_template` ב-10 נקודות-מפתח. M12 מטפל בערוץ + locale + שריפת variables. |
| **M4 CRM** | אין auto-enrollment דרך תקנון. M4 ממשיך לטפל בתקנון רגיל. M13 enrollment הוא flow נפרד דרך עמוד-האתר. |
| **M3 Storefront** | עמוד `/loyalty-club/` — הצטרפות יחידה. Form → POST → Edge Function `loyalty-enroll` → יצירת customer (אם לא קיים) + membership + payment redirect ל-M8. |

---

## 6. סקיצות (5 מסכים)

ראה `M13_SKETCHES.html` באותה תיקייה.

| # | מסך | מודול-host |
|---|---|---|
| S1 | Tab "מועדון" בכרטיס לקוח | M5 |
| S2 | Dashboard מנהל המועדון | M13 (או Settings) |
| S3 | בלוק checkout | M7 |
| S4 | עמוד הצטרפות mobile-first | M3 storefront |
| S5 | פאנל הגדרות tenant | M13 settings |

---

## 7. Pattern-passover — slots עתידיים

חמישה slots-מובטחים בקוד שלא ימומשו ב-LIVE day-1 אבל לא ידרשו schema-change כשיגיע הזמן:

- **P1 — Multi-program-per-tenant.** `loyalty_program_id` (NULL בתחילה).
- **P2 — Cross-tenant pooling.** `network_id` בעתיד ב-tenants.
- **P3 — AI personalization.** `loyalty_membership.preferences` JSONB ריק.
- **P4 — Manual tier override (VIP).** `loyalty_membership.manual_tier_override`.
- **P5 — Multi-currency.** `loyalty_tier.accrual_currency` עם default 'ILS'.

---

## 8. סיכונים זוהו

| # | סיכון | מענה |
|---|---|---|
| R1 | Race condition בין earn/redeem | `FOR UPDATE` lock על שורת balance ב-RPC |
| R2 | Family fraud (חבר סינטטי לחציית סף) | `max_members` per-tenant + alert ל-admin על households שגדלים מהר |
| R3 | Coupon stacking | `max_coupons_per_order` per-tenant (default=1) |
| R4 | Credit liability infinite | expiry 24 חודשים default |
| R5 | Tier downgrade resentment | grace 6 חודשים + warning notification |
| R6 | Welcome bonus abuse | one-shot per-membership (`welcome_bonus_used_at`), 30-day expiry |
| R7 | Concurrent family redemption | atomic via RPC + `spending_customer_id` tagging |

---

## 9. To-dos לפני LIVE

- [ ] **התייעצות רואה-חשבון** על רישום `total_credit_outstanding` כ-deferred revenue / customer credit liability
- [ ] **Migration plan** ל-customers הקיימים עם `qhaver=true` (כיבוי השדה, יצירת `loyalty_membership` ל-active members אחרי בחירה ידנית-VIP אם רלוונטי)
- [ ] **Templates ב-M12** — 10 templates (§4.4) ב-3 שפות (he/en/ru) × 3 ערוצים (whatsapp/sms/email)
- [ ] **Edge Function** `loyalty-enroll` ב-storefront — קלט form, יצירה ב-DB, redirect לתשלום
- [ ] **`v_loyalty_for_reports` view** — אגרגציות ל-M11
- [ ] **`pg_cron` jobs:** promotion engine (יומי 02:00), credit expiry (יומי 03:00), renewal reminders (יומי 04:00)
- [ ] **תקנון מועדון** משפטי (privacy, family pooling consent, tier rules)

---

## 10. Out-of-scope ל-LIVE day-1

- Marketing campaigns engine (M4/M12)
- AI recommendations
- Cross-tenant pooling
- Gamification (badges/leaderboards)
- Referral program ("הבא חבר")
- Multi-program-per-tenant (slot only)
- Manual tier override / VIP (slot only)
- B2B loyalty
- Tier-based limited-time bonuses ("X2 weekend")

---

## 11. Decisions Log

13 החלטות לאורך הסשן ה-2026-05-09:

| # | נושא | החלטה |
|---|---|---|
| D1 | תמחור-tier | Per-tenant: יכול להיות per-tier או flat. Prizma = flat. |
| D2 | חידוש | ידני |
| D3 | Downgrade | Grace 6 חודשים, per-tenant config |
| D4 | Credit expiry | 24 חודשים default |
| D5 | הצטרפות | רק עמוד באתר (אין auto-opt-in, אין קופה) |
| D6 | Family policy | equal default, head_only אופציה |
| D7 | Migration | אין |
| D8 | Coupons separation | M13 מנפיק, M7 שורף |
| D9 | Frames vs Lenses | מודל 1 — צבירה נפרדת, סף משולב |
| D10 | Default accrual | 0% (רק frames + lenses צוברים) |
| D11 | Family scale_factor | 30% (Prizma) |
| D12 | Welcome bonus | 5%, תקרה ₪150, 30 יום, ₪50/₪100 דמי-חבר |
| D13 | Family balance | סל משותף, default פתוח, תקרת מימוש אופציונלית, two-tag traceability |

---

## 12. Skill Improvements proposed by this Brief

(Foreman self-review — to apply before next module's Brief)

### Author-skill (opticup-strategic / opticup-main-strategic)

**Proposal 1:** Add a "Patterns from prior Briefs" pre-step at the start of any new module's Brief authoring — explicitly grep the prior Briefs for: (a) Pattern P19 (config-table not enum), (b) per-tenant override slots, (c) JSONB extension points. Currently each module redo's this discovery; should be canonical checklist.

**Proposal 2:** Add an "anti-Access pattern check" — when the user describes an existing process from a legacy system (Access in Prizma's case), explicitly flag whether the design choice was driven by (i) genuine business requirement vs (ii) limitation of legacy tech. If (ii), the new system should NOT replicate it. M13 had this exactly with the "code-yad-yadani" mechanism.

### Executor-skill (opticup-executor)

**Proposal 1:** When implementing a Brief, add a Step 0 check: "Read all 5 sketches in the SKETCHES.html file. Each sketch represents a contract — a UI component the executor must deliver to spec, not a creative interpretation. Diff sketches against final UI before commit."

**Proposal 2:** For Brief modules with cron jobs (M13 has 3), require a separate `cron-jobs.sql` deliverable in the SPEC's expected final state — to ensure cron deployments are not forgotten in pg_cron.

---

*Brief sealed 2026-05-09. Next: Module Strategist writes M13 SPECs based on this Brief.*
