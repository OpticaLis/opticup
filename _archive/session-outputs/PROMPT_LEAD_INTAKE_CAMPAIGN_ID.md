# פרומפט הפעלה — הוספת Campaign_ID ל-lead-intake

> העתק את כל מה שמתחת לקו ל-Claude Code. **באותו הסשן.**

---

טען את הסקיל `opticup-executor`.

## רקע

הקמפיינר בפייסבוק מצרף לכל מודעה פרמטר `utm_campaign_id` ב-URL עם ה-Facebook Campaign ID (מספר 15-ספרתי). הטופס בסטורפרונט קורא את הפרמטר מה-URL ושולח ל-`lead-intake` Edge Function. אבל ה-Edge Function כרגע לא קורא ולא שומר אותו — הוא מתעלם. כל ליד שנכנס מהיום מאבד את הקישור לקמפיין.

המטרה: לתקן את הזליגה. הליד נשמר עם ה-Campaign_ID, מה שיאפשר בעתיד לבנות מסך מדידת קמפיינים.

## שלב 1 — בדיקת מצב DB

הרץ:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'crm_leads'
  AND column_name LIKE '%campaign%';
```

דווח מה חזר. שלוש אפשרויות:
- (א) קיימת עמודה בשם `utm_campaign_id` — מעולה, דלג לשלב 3.
- (ב) קיימת עמודה בשם דומה (לדוגמה `fb_campaign_id`, `campaign_id`) — דווח לי, אעדכן את התכנון.
- (ג) לא קיימת שום עמודה כזאת — עבור לשלב 2 (migration).

## שלב 2 — אם צריך migration

צור migration חדש שמוסיף עמודה:

```sql
ALTER TABLE crm_leads
ADD COLUMN utm_campaign_id TEXT;

COMMENT ON COLUMN crm_leads.utm_campaign_id IS
  'Facebook Ads Campaign ID (numeric string, ~15 digits). Sent by storefront form when ad URL contains utm_campaign_id parameter. Used to link leads to Facebook campaigns for ROI measurement.';

CREATE INDEX IF NOT EXISTS idx_crm_leads_utm_campaign_id
  ON crm_leads(tenant_id, utm_campaign_id)
  WHERE utm_campaign_id IS NOT NULL;
```

הרץ את ה-migration על דמו ופריזמה.

## שלב 3 — עדכון Edge Function

קרא את `supabase/functions/lead-intake/index.ts`. מצא את הבלוק שמכיל:

```ts
const utm_source = trimOrNull(body.utm_source);
const utm_medium = trimOrNull(body.utm_medium);
const utm_campaign = trimOrNull(body.utm_campaign);
const utm_content = trimOrNull(body.utm_content);
const utm_term = trimOrNull(body.utm_term);
```

הוסף שורה אחרי `utm_term`:

```ts
const utm_campaign_id = trimOrNull(body.utm_campaign_id);
```

מצא את ה-INSERT שמכיל את כל ה-utm fields (סביב שורה 282-286). הוסף את `utm_campaign_id` לרשימה:

```ts
utm_source,
utm_medium,
utm_campaign,
utm_content,
utm_term,
utm_campaign_id,
```

## שלב 4 — Deploy Edge Function

```
supabase functions deploy lead-intake
```

או — אם דניאל deploy ידני בלבד — דווח שהקובץ מוכן ל-deploy והוא צריך לבצע ידנית.

## שלב 5 — בדיקה

הרץ curl לבדיקת ה-EF (החלף את ה-tenant_slug אם צריך):

```bash
curl -X POST 'https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/lead-intake' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -d '{
    "tenant_slug": "demo",
    "name": "TEST Campaign ID",
    "phone": "0537889878",
    "email": "danylis92@gmail.com",
    "utm_source": "fb",
    "utm_medium": "paid",
    "utm_campaign": "supersaletaaruha",
    "utm_content": "taaruha2",
    "utm_term": "tlv",
    "utm_campaign_id": "120243589267430789"
  }'
```

ודא שהתגובה מחזירה `{id: "...", is_new: true}` או duplicate (אם כבר קיים).

ואז SQL לוודא שנשמר:

```sql
SELECT id, full_name, phone, utm_source, utm_campaign, utm_campaign_id
FROM crm_leads
WHERE phone = '+972537889878'
  AND tenant_id = (SELECT id FROM tenants WHERE slug = 'demo')
ORDER BY created_at DESC
LIMIT 1;
```

הערך של `utm_campaign_id` צריך להיות `120243589267430789`.

נקה את הליד הטסט אחרי הבדיקה:

```sql
DELETE FROM crm_leads
WHERE full_name = 'TEST Campaign ID'
  AND tenant_id = (SELECT id FROM tenants WHERE slug = 'demo');
```

## שלב 6 — Commit

```
git add supabase/functions/lead-intake/index.ts [+ migration file if created]
git commit -m "feat(crm): capture utm_campaign_id (Facebook Ads ID) in lead-intake

Facebook ads append utm_campaign_id={{campaign.id}} to ad URLs. The
storefront form reads it and sends to lead-intake EF, but the EF was
silently dropping it. This caused every lead since launch to lose its
link to the Facebook campaign.

Now stored in crm_leads.utm_campaign_id (15-digit numeric string).
Enables building campaign performance screen in CRM."
git push origin develop
```

## שלב 7 — דיווח

דווח חזרה:
- מה חזר משלב 1 (האם הייתה עמודה קיימת או נדרש migration).
- האם curl test עבר.
- האם השאילתה החזירה את ה-Campaign_ID.
- Commit hash.
- האם ה-EF deployed או ממתין ל-deploy ידני של דניאל.

## עצור על:

- אם הטבלה `crm_leads` לא נמצאה או עמודה דומה כבר קיימת בשם אחר (לדוגמה `fb_campaign_id`) — עצור ושאל.
- אם ה-deploy של Edge Function נכשל — עצור ודווח.
- אם curl test החזיר 4xx/5xx — עצור ובדוק את הלוגים של ה-EF.

---

*End of prompt.*
