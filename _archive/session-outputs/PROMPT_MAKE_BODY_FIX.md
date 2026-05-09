# פרומפט הפעלה — תיקון Make body serialization (מודול 4 קמפיינים)

> העתק את כל מה שמתחת לקו ל-Claude Code. **באותו הסשן.**

---

טען את הסקיל `opticup-executor`.

## רקע מלא

מסך הקמפיינים החדש ב-CRM עובד אבל ריק כי ה-Make scenario לא מצליח לסנכרן נתונים אמיתיים מ-Facebook. ה-Edge Function `facebook-campaigns-sync` עובד תקין (מאומת ב-curl 200). הבעיה: Make scenario `9126542` (Facebook Campaigns → Optic Up CRM (DEMO)) שולח HTTP POST עם body בפורמט ש-Supabase EF מחזיר 400 "Invalid JSON body".

הסטטוס:
- Scenario `9126542` כרגע DEACTIVATED.
- Blueprint שלו: 4 מודולים (listCampaigns → BasicAggregator → GetAdAccountInsights account-level → BasicAggregator → HTTP POST).
- ה-Body של Module 4 בנוי כ-`bodyType: raw` עם interpolation `{{3.array}}` — זה שובר כי Make מעצב JSON שלא תקני.
- ה-EF גרסה 2 כבר deployed (`verify_jwt: false` + shared_secret בגוף) — מאומת בזה הבוקר.

יש Make scenarios שעובדים בפרודקשן היום ושולחים ל-Supabase EFs. הדפוס שלהם פותר את אותה בעיה. צריך להעתיק.

## משימה

### שלב 1 — חקור Make scenarios קיימים שעובדים

יש כמה candidates. בדוק את כולם:

1. **Scenario `8479284`** — "2) רישום משתתפים לאירוע" — סביר שזה שולח ל-`event-register` EF.
2. **Scenario `9104395`** — send-message dispatcher (4 מודולים: Webhook → Router → SMS | Gmail).
3. כל scenario נוסף שבו יש מודול `http:ActionSendData` או `http:ActionSendDataAdvanced` שמכוון ל-`tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/`.

לכל candidate, השתמש ב-`scenarios_get` (אם הפלט גדול מדי, השתמש ב-Agent tool עם הוראה לחלץ רק את ה-HTTP module config).

מצא את ה-HTTP module שעובד וחזור עם:
- ה-`bodyType` שבו השתמשו (raw / form / json / x-www-form-urlencoded?)
- ה-`body` עצמו — איך הם בנו את ה-string/object?
- האם הם השתמשו ב-`json:CreateJSON` module לפני HTTP?
- מה ה-headers (במיוחד `Content-Type` ו-`Authorization`/`apikey`)?

### שלב 2 — החלת הדפוס על scenario 9126542

עדכן את ה-blueprint של `9126542` Module 4 (HTTP POST) לפי הדפוס שמצאת:

**אפשרות A** (אם הם השתמשו ב-json:CreateJSON):
- הוסף Module חדש (json:CreateJSON) בין Module 3 ל-Module 4 שיבנה את ה-JSON properly.
- ה-Module HTTP יקח את `{{4.json}}` כ-body.

**אפשרות B** (אם יש technique אחרת):
- יישם בדיוק לפי מה שראית בעבודה.

חשוב: ה-EF צריך לקבל body בפורמט הזה:
```json
{
  "tenant_slug": "demo",
  "secret": "<the shared secret value>",
  "campaigns": [
    {"campaign_id": "...", "name": "...", "status": "...", "event_type": "SuperSale", "daily_budget": 100, "total_spend": 1234.56},
    ...
  ]
}
```

### שלב 3 — בדיקה

1. validate_blueprint_schema — אם נכשל, תקן.
2. Activate the scenario.
3. scenarios_run — הרץ פעם אחת ידנית.
4. ודא שהסיים תוך 30-60 שניות (לא 30 דקות כמו לפני).
5. בדוק EF logs — צריך להופיע `POST | 200 | facebook-campaigns-sync`.
6. בדוק DB:
   ```sql
   SELECT count(*) FROM crm_facebook_campaigns WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
   SELECT count(*) FROM crm_ad_spend WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
   ```
   אמור להיות > 0.

### שלב 4 — צפייה במסך

נווט ל-`http://localhost:3000` (chrome-devtools MCP), היכנס לדמו → CRM → 📈 קמפיינים.
- ודא שהקמפיינים האמיתיים מופיעים.
- ודא שהחלטות (STOP/SCALE/TEST) מחושבות נכון.
- צלם screenshot ל-`outputs/campaign-screen-screenshots/4-real-data.png`.

### שלב 5 — דווח

דווח בעברית קצרה:
- איזה scenario candidate נתן את הדפוס הנכון.
- אופציה A או B (json:CreateJSON או technique אחרת).
- כמה זמן + ops לקחה הריצה האופטימלית.
- כמה קמפיינים נטענו.
- האם המסך מציג נתונים אמיתיים.

## עצור על

- אם לא נמצא scenario candidate שעובד עם POST ל-Supabase EF — דווח ושאל.
- אם 2 ניסיונות לעדכן את scenario `9126542` נכשלו — דווח את ה-error המדויק.
- אם 401 חוזר (auth issue) — בדוק את ה-secret value ב-EF code (`supabase/functions/facebook-campaigns-sync/index.ts`) ובמה ש-Make שולח. הם חייבים להיות זהים.

## פרטים טכניים

- Scenario ID: 9126542 (DEACTIVATED currently)
- EF URL: `https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/facebook-campaigns-sync`
- demo tenant_id: `8d8cfa7e-ef58-49af-9702-a862d459cccb`
- Connection: 13500740 (Facebook ADS)
- adAccountId: `act_270898661673629`, businessId: `106457754847532`

---

*End of prompt.*
