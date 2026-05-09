# פרומפט הפעלה — אימות end-to-end של מסך הקמפיינים

> העתק את כל מה שמתחת לקו ל-Claude Code. **באותו הסשן.**

---

טען את הסקיל `opticup-executor`.

המסך החדש "קמפיינים" נסגר ב-SPEC ונדחף ל-develop. ה-ERP על localhost:3000 רץ. הריפו pulled. עכשיו צריך אימות end-to-end עם נתונים פיקטיביים מציאותיים.

המטרה: לוודא שהמסך עובד נכון לפני שדניאל בונה את ה-Make scenario לנתונים אמיתיים. כל בעיה — לתקן עכשיו, לא אחר כך.

## שלב 1 — הזנת נתונים פיקטיביים מציאותיים לדמו

הזן 8 קמפיינים פיקטיביים לדמו tenant. השתמש ב-Supabase MCP. הנתונים צריכים לכסות את כל המקרים:

```sql
-- Tenant ID של דמו: 8d8cfa7e-ef58-49af-9702-a862d459cccb

-- 8 קמפיינים — תערובת של statuses + event_types + ביצועים
INSERT INTO crm_facebook_campaigns (tenant_id, campaign_id, name, status, event_type, daily_budget, master, interests, last_synced_at)
VALUES
  -- Live & Scaling - SuperSale - SCALE decision (CAC < 400)
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', '120100000000000001', 'קמפיין לידים | SuperSale אשקלון | קץ | 60 יום | UGC', 'Active', 'SuperSale', 100, 'אסטרטגיה_פתוחה', 'אופטיקה,משקפיים', now()),
  -- Live & Scaling - SuperSale - TEST decision (CAC between 400 and 800)
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', '120100000000000002', 'קמפיין לידים | SuperSale אשקלון | בינוני | 30 יום', 'Active', 'SuperSale', 80, 'אסטרטגיה_מקומית', 'משקפי שמש,אופנה', now()),
  -- Live & Scaling - SuperSale - STOP decision (CAC > 800)
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', '120100000000000003', 'קמפיין לידים | SuperSale אשקלון | כשל | 14 יום', 'Active', 'SuperSale', 50, 'אסטרטגיה_כושלת', 'בריאות,רפואה', now()),
  -- Live & Scaling - MultiSale - SCALE decision
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', '120100000000000004', 'קמפיין לידים | MultiSale קרית גת | מצליח', 'Active', 'MultiSale', 120, 'אסטרטגיה_מולטי', 'משקפי קריאה,מבוגרים', now()),
  -- Live & Scaling - SuperSale - TEST (low leads, < 30)
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', '120100000000000005', 'קמפיין לידים | SuperSale חדש | טסט', 'Active', 'SuperSale', 30, 'אסטרטגיה_חדשה', 'נסיוני', now()),
  -- Paused - SuperSale
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', '120100000000000006', 'קמפיין לידים | SuperSale ירושלים | UGC', 'Paused', 'SuperSale', 60, 'אסטרטגיה_מושעית', 'משקפיים', now()),
  -- Paused - MultiSale
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', '120100000000000007', 'קמפיין לידים | MultiSale תל אביב | בנוי', 'Paused', 'MultiSale', 90, 'אסטרטגיה_מסחרית', 'אופטיקה', now()),
  -- Stopped (no decision should appear — "—")
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', '120100000000000008', 'קמפיין לידים | SuperSale אשדוד | סגור', 'Stopped', 'SuperSale', 40, 'אסטרטגיה_עצורה', 'מבוגרים', now())
ON CONFLICT (tenant_id, campaign_id) DO NOTHING;

-- Ad spend snapshots — שורה אחת לכל קמפיין עם ספנד מצטבר
INSERT INTO crm_ad_spend (tenant_id, campaign_id, spend_date, total_spend)
VALUES
  -- Campaign 1 (SCALE): low CAC, מספיק לידים
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', '120100000000000001', current_date, 1500),
  -- Campaign 2 (TEST): medium CAC
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', '120100000000000002', current_date, 3000),
  -- Campaign 3 (STOP): high CAC
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', '120100000000000003', current_date, 5000),
  -- Campaign 4 (MultiSale SCALE): low CAC
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', '120100000000000004', current_date, 2000),
  -- Campaign 5 (TEST low leads)
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', '120100000000000005', current_date, 800),
  -- Paused (last week)
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', '120100000000000006', current_date - 7, 1200),
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', '120100000000000007', current_date - 5, 2400),
  -- Stopped
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', '120100000000000008', current_date - 14, 3800)
ON CONFLICT (tenant_id, campaign_id, spend_date) DO NOTHING;
```

## שלב 2 — הזנת לידים פיקטיביים מקושרים לקמפיינים

כדי שיהיו leads_num + buyers_num במסך, הזן לידים פיקטיביים עם `utm_campaign_id` תואם:

```sql
-- 50 לידים לקמפיין 1 (SCALE: CAC=1500/X buyers, נצטרך לפחות 4 קונים כדי שCAC<400 → 1500/4=375)
INSERT INTO crm_leads (tenant_id, full_name, phone, email, status, source, utm_source, utm_medium, utm_campaign_id, language, created_at)
SELECT '8d8cfa7e-ef58-49af-9702-a862d459cccb', 'TEST_CAMP01_' || g, '+97250000' || lpad(g::text, 4, '0'), 'test_camp01_' || g || '@test.com',
       'waiting', 'fb_test', 'fb', 'paid', '120100000000000001', 'he', now() - (g || ' minutes')::interval
FROM generate_series(1, 50) g
ON CONFLICT DO NOTHING;

-- 50 לידים לקמפיין 2 (TEST: CAC=3000/5 buyers=600 → between 400-800 → TEST)
INSERT INTO crm_leads (tenant_id, full_name, phone, email, status, source, utm_source, utm_medium, utm_campaign_id, language, created_at)
SELECT '8d8cfa7e-ef58-49af-9702-a862d459cccb', 'TEST_CAMP02_' || g, '+97250001' || lpad(g::text, 4, '0'), 'test_camp02_' || g || '@test.com',
       'waiting', 'fb_test', 'fb', 'paid', '120100000000000002', 'he', now() - (g || ' minutes')::interval
FROM generate_series(1, 50) g
ON CONFLICT DO NOTHING;

-- 50 לידים לקמפיין 3 (STOP: CAC=5000/5 buyers=1000 → >800 → STOP)
INSERT INTO crm_leads (tenant_id, full_name, phone, email, status, source, utm_source, utm_medium, utm_campaign_id, language, created_at)
SELECT '8d8cfa7e-ef58-49af-9702-a862d459cccb', 'TEST_CAMP03_' || g, '+97250002' || lpad(g::text, 4, '0'), 'test_camp03_' || g || '@test.com',
       'waiting', 'fb_test', 'fb', 'paid', '120100000000000003', 'he', now() - (g || ' minutes')::interval
FROM generate_series(1, 50) g
ON CONFLICT DO NOTHING;

-- 80 לידים לקמפיין 4 (MultiSale SCALE: gross_margin=50%, kill=3*50%/100*1000=1500, scale=1.5*50%/100*1000=750. CAC=2000/4 buyers=500 → <750 → SCALE)
INSERT INTO crm_leads (tenant_id, full_name, phone, email, status, source, utm_source, utm_medium, utm_campaign_id, language, created_at)
SELECT '8d8cfa7e-ef58-49af-9702-a862d459cccb', 'TEST_CAMP04_' || g, '+97250003' || lpad(g::text, 4, '0'), 'test_camp04_' || g || '@test.com',
       'waiting', 'fb_test', 'fb', 'paid', '120100000000000004', 'he', now() - (g || ' minutes')::interval
FROM generate_series(1, 80) g
ON CONFLICT DO NOTHING;

-- 15 לידים לקמפיין 5 (TEST low leads — <30 → TEST regardless of CAC)
INSERT INTO crm_leads (tenant_id, full_name, phone, email, status, source, utm_source, utm_medium, utm_campaign_id, language, created_at)
SELECT '8d8cfa7e-ef58-49af-9702-a862d459cccb', 'TEST_CAMP05_' || g, '+97250004' || lpad(g::text, 4, '0'), 'test_camp05_' || g || '@test.com',
       'waiting', 'fb_test', 'fb', 'paid', '120100000000000005', 'he', now() - (g || ' minutes')::interval
FROM generate_series(1, 15) g
ON CONFLICT DO NOTHING;

-- 30 לידים לקמפיין 6 (Paused)
INSERT INTO crm_leads (tenant_id, full_name, phone, email, status, source, utm_source, utm_medium, utm_campaign_id, language, created_at)
SELECT '8d8cfa7e-ef58-49af-9702-a862d459cccb', 'TEST_CAMP06_' || g, '+97250005' || lpad(g::text, 4, '0'), 'test_camp06_' || g || '@test.com',
       'waiting', 'fb_test', 'fb', 'paid', '120100000000000006', 'he', now() - (g || ' minutes')::interval
FROM generate_series(1, 30) g
ON CONFLICT DO NOTHING;

-- 60 לידים לקמפיין 7 (Paused MultiSale)
INSERT INTO crm_leads (tenant_id, full_name, phone, email, status, source, utm_source, utm_medium, utm_campaign_id, language, created_at)
SELECT '8d8cfa7e-ef58-49af-9702-a862d459cccb', 'TEST_CAMP07_' || g, '+97250006' || lpad(g::text, 4, '0'), 'test_camp07_' || g || '@test.com',
       'waiting', 'fb_test', 'fb', 'paid', '120100000000000007', 'he', now() - (g || ' minutes')::interval
FROM generate_series(1, 60) g
ON CONFLICT DO NOTHING;

-- 100 לידים לקמפיין 8 (Stopped — no decision)
INSERT INTO crm_leads (tenant_id, full_name, phone, email, status, source, utm_source, utm_medium, utm_campaign_id, language, created_at)
SELECT '8d8cfa7e-ef58-49af-9702-a862d459cccb', 'TEST_CAMP08_' || g, '+97250007' || lpad(g::text, 4, '0'), 'test_camp08_' || g || '@test.com',
       'waiting', 'fb_test', 'fb', 'paid', '120100000000000008', 'he', now() - (g || ' minutes')::interval
FROM generate_series(1, 100) g
ON CONFLICT DO NOTHING;
```

## שלב 3 — הזנת קונים פיקטיביים (event_attendees)

צריך אירוע אחד תקין בדמו וregistrations עם payment_status='paid' לחישוב buyers + revenue. הרץ:

```sql
-- בדוק אם יש אירוע פעיל בדמו:
SELECT id, event_name, event_date, status FROM crm_events WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb' LIMIT 1;
```

אם יש — השתמש ב-event_id הקיים. אם אין — צור אחד פיקטיבי:

```sql
INSERT INTO crm_events (tenant_id, event_name, event_date, status, location, max_capacity, booking_fee, campaign_id)
SELECT '8d8cfa7e-ef58-49af-9702-a862d459cccb', 'TEST_EVENT_FOR_CAMPAIGNS', current_date + 30, 'registration_open', 'אשקלון', 100, 50,
       (SELECT id FROM crm_campaigns WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb' LIMIT 1)
RETURNING id;
```

ואז קונים — 4 לקמפיין 1, 5 לקמפיין 2, 5 לקמפיין 3, 4 לקמפיין 4 (כדי לפגוע בדיוק בכל החלטה):

```sql
-- שמור את event_id מהשאילתה למעלה. נניח שהוא $EVENT_ID.
-- 4 קונים מקמפיין 1 (CAC = 1500/4 = 375 → <400 → SCALE)
INSERT INTO crm_event_attendees (tenant_id, event_id, lead_id, payment_status, purchase_amount, paid_at, created_at)
SELECT '8d8cfa7e-ef58-49af-9702-a862d459cccb', '$EVENT_ID', l.id, 'paid', 800, now(), now()
FROM crm_leads l
WHERE l.tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND l.utm_campaign_id = '120100000000000001'
  AND l.full_name LIKE 'TEST_CAMP01_%'
ORDER BY l.created_at LIMIT 4;

-- 5 קונים מקמפיין 2 (CAC = 3000/5 = 600 → between 400-800 → TEST)
INSERT INTO crm_event_attendees (tenant_id, event_id, lead_id, payment_status, purchase_amount, paid_at, created_at)
SELECT '8d8cfa7e-ef58-49af-9702-a862d459cccb', '$EVENT_ID', l.id, 'paid', 800, now(), now()
FROM crm_leads l
WHERE l.tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND l.utm_campaign_id = '120100000000000002'
  AND l.full_name LIKE 'TEST_CAMP02_%'
ORDER BY l.created_at LIMIT 5;

-- 5 קונים מקמפיין 3 (CAC = 5000/5 = 1000 → >800 → STOP)
INSERT INTO crm_event_attendees (tenant_id, event_id, lead_id, payment_status, purchase_amount, paid_at, created_at)
SELECT '8d8cfa7e-ef58-49af-9702-a862d459cccb', '$EVENT_ID', l.id, 'paid', 800, now(), now()
FROM crm_leads l
WHERE l.tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND l.utm_campaign_id = '120100000000000003'
  AND l.full_name LIKE 'TEST_CAMP03_%'
ORDER BY l.created_at LIMIT 5;

-- 4 קונים מקמפיין 4 (MultiSale: CAC = 2000/4 = 500 → <750 → SCALE)
INSERT INTO crm_event_attendees (tenant_id, event_id, lead_id, payment_status, purchase_amount, paid_at, created_at)
SELECT '8d8cfa7e-ef58-49af-9702-a862d459cccb', '$EVENT_ID', l.id, 'paid', 1500, now(), now()
FROM crm_leads l
WHERE l.tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND l.utm_campaign_id = '120100000000000004'
  AND l.full_name LIKE 'TEST_CAMP04_%'
ORDER BY l.created_at LIMIT 4;
```

## שלב 4 — אימות SQL

הרץ:
```sql
SELECT campaign_id, name, status, event_type, total_spend, leads_num, buyers_num, total_revenue, cac, gross_profit
FROM v_crm_campaign_performance
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
ORDER BY status, name;
```

ודא:
- 8 שורות מוחזרות.
- Campaign 1: leads_num=50, buyers_num=4, CAC=375.
- Campaign 2: leads_num=50, buyers_num=5, CAC=600.
- Campaign 3: leads_num=50, buyers_num=5, CAC=1000.
- Campaign 4: leads_num=80, buyers_num=4, CAC=500.
- Campaign 5: leads_num=15 (פחות מ-30), buyers_num=0.
- Campaigns 6-8: שונות לפי ספנד שהוזן.

## שלב 5 — בדיקה בדפדפן (chrome-devtools)

1. נווט ל-`http://localhost:3000`.
2. היכנס לטננט דמו (PIN 12345).
3. נווט ל-CRM → לחץ על "📈 קמפיינים" בסיידבר.
4. בדוק:
   - **6 KPI cards** למעלה — סכומים תקינים (Total Spend ≈ 19,700, Total Leads = 365, Total Buyers = 18, וכו').
   - **3 קבוצות סטטוס** — Live & Scaling (5), Paused (2), Stopped (1).
   - **טבלה עם 8 עמודות** וכל קמפיין עם החלטה צבעונית:
     - Campaign 1 → SCALE (ירוק)
     - Campaign 2 → TEST (אפור)
     - Campaign 3 → STOP (אדום)
     - Campaign 4 → SCALE (ירוק)
     - Campaign 5 → TEST (אפור — בגלל leads<30)
     - Campaigns 6-7 → לפי הנתונים
     - Campaign 8 → "—" (אין החלטה כי Stopped מצד פייסבוק)
5. לחץ על שורה — drill-down modal צריך להיפתח עם פרטים מלאים + הסבר multiplier ("Kill: 4 × 20% × 1000 = ₪800").
6. לחץ על אייקון גלגל שיניים — settings modal עם 2 שורות (SuperSale + MultiSale) עם ערכים נכונים.
7. בדוק console — צריך להיות נקי משגיאות. אם יש שגיאות — דווח אותן.

## שלב 6 — צילום מסך

קח 3 צילומי מסך:
1. המסך הראשי (KPI cards + טבלה).
2. drill-down modal פתוח על קמפיין SCALE.
3. settings modal פתוח.

שמור ב-`outputs/campaign-screen-screenshots/`.

## שלב 7 — ניקוי הדמו

אחרי האימות (גם אם הצליח וגם אם נכשל) — נקה את הדמו:

```sql
-- מחק את כל ה-test attendees
DELETE FROM crm_event_attendees
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND lead_id IN (SELECT id FROM crm_leads WHERE full_name LIKE 'TEST_CAMP%' AND tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb');

-- מחק את ה-test event (אם נוצר)
DELETE FROM crm_events
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND event_name = 'TEST_EVENT_FOR_CAMPAIGNS';

-- מחק את כל ה-test leads
DELETE FROM crm_leads
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND full_name LIKE 'TEST_CAMP%';

-- מחק את כל ה-test campaigns + spend
DELETE FROM crm_ad_spend
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND campaign_id LIKE '12010000000000%';

DELETE FROM crm_facebook_campaigns
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND campaign_id LIKE '12010000000000%';
```

ודא שהמסך חוזר לריק:
```sql
SELECT count(*) FROM crm_facebook_campaigns WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
-- צריך להיות 0
```

## שלב 8 — דיווח

דווח חזרה (בעברית, קצר):
- האם 8 הקמפיינים נטענו והחלטות הוצגו נכונות (פר קמפיין: צפוי vs בפועל).
- האם 6 ה-KPI cards הראו סכומים נכונים.
- האם drill-down + settings modal עבדו.
- האם היו שגיאות console.
- 3 צילומי מסך הם ב-`outputs/campaign-screen-screenshots/`.
- האם הדמו חזר נקי.

## עצור על:

- אם המסך לא נטען בכלל (white screen / error) — דווח מיד.
- אם החלטה כלשהי שגויה (למשל קמפיין SCALE צבוע STOP) — דווח עם פרטי החישוב.
- אם יש שגיאת SQL בנתונים שלא יודע לפתור — דווח לפני שאתה ממשיך.

**אל תעשה commit לכלום.** זה רק אימות בדמו, לא שינוי קבוע.

---

*End of prompt.*
