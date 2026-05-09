# פרומפט הפעלה — תיקון 401 Unauthorized

> העתק את כל מה שמתחת לקו ל-Claude Code. **באותו הסשן.**

---

טען את הסקיל `opticup-executor`.

## מצב נוכחי

ה-Make scenario `9126542` רץ נקי ושולח HTTP POST ל-EF. ה-EF מחזיר **401 Unauthorized** ולכן הנתונים לא נשמרים. סביר ש-Supabase Gateway דורש BOTH headers — `Authorization` AND `apikey` — בעוד שב-Make יש רק `Authorization`.

## משימה

### שלב 1 — הוסף `apikey` header ל-Module 4

עדכן את ה-blueprint של scenario `9126542`. ב-Module 4 (`http:ActionSendData`), הוסף header נוסף:

```json
{"name": "apikey", "value": "<SUPABASE_ANON_KEY_REDACTED>"}
```

(אותו ערך כמו `Authorization`, אבל בלי "Bearer" prefix.)

הרשימה הסופית של headers ב-Module 4:
1. `Authorization`: `Bearer eyJhbG...JZU` (כפי שהיה)
2. `apikey`: `eyJhbG...JZU` (חדש, בלי Bearer)
3. `Content-Type`: `application/json`

### שלב 2 — הרץ ידנית

scenarios_run על 9126542. אמור לקחת ~30-60 שניות עם הגרסה האופטימלית.

### שלב 3 — אמת

- בדוק EF logs: צריך להופיע `POST | 200 | facebook-campaigns-sync` (לא 401).
- בדוק DB: `SELECT count(*) FROM crm_facebook_campaigns WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'` — אמור להיות > 0 (200+ קמפיינים).
- אם עדיין 401 — קרא את גוף השגיאה: `get_logs service=edge-function` עם המפתח `event_message` של ה-401 — אמור להופיע גם payload או response message שמסביר.

### שלב 4 — אם apikey עדיין לא מספיק

ננסה אסטרטגיה חלופית — לשנות את ה-EF ל-`verify_jwt: false` ולאמת באמצעות secret token משלנו.

1. ערוך `supabase/functions/facebook-campaigns-sync/index.ts`:
   - שנה `verify_jwt: true` ל-`verify_jwt: false` ב-config (אם יש).
   - בתחילת ה-handler, בדוק header `x-make-secret`. אם לא תואם ל-`Deno.env.get('MAKE_SECRET')` או לקבוע hardcoded — החזר 401.
2. הוסף secret לסביבה (Supabase Edge Functions secrets).
3. Re-deploy.
4. עדכן Make scenario לשלוח `x-make-secret` במקום `Authorization`.

**אבל** — נסה קודם רק `apikey`. רוב הסיכויים שזה יספיק.

### שלב 5 — אם הכל עובד

1. נווט ל-`http://localhost:3000` ב-Chrome (chrome-devtools MCP). היכנס לדמו → קמפיינים. ודא שהקמפיינים האמיתיים מופיעים עם החלטות.
2. צלם screenshot ל-`outputs/campaign-screen-screenshots/4-real-data.png`.
3. דווח חזרה.

## הקשר טכני

- Scenario ID: 9126542 (צריך להיות `isActive: true`)
- Header חסר: `apikey` עם אותו ערך כמו `Authorization` בלי Bearer.
- אם בודקים את הגרסה האופטימלית (ה-blueprint שעודכן באלה האחרונה) — הוא מבנה: listCampaigns → BasicAggregator(feeder=2) — אבל **הסר את ה-active-only filter אם הוסף** כדי שנקבל את כל הקמפיינים.

## עצור על

- אם ה-blueprint update נכשל פעמיים — דווח את ה-error.
- אם 401 ממשיך גם עם apikey — דווח את ה-EF log של ה-401 (event_message מלא).
- אם הכל עובד — מצוין, צלם ודווח.

---

*End of prompt.*
