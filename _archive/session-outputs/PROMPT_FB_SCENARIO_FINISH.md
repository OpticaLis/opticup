# פרומפט הפעלה — סיום ואופטימיזציה של ה-Make scenario

> העתק את כל מה שמתחת לקו ל-Claude Code. **באותו הסשן.**

---

טען את הסקיל `opticup-executor`.

## מצב נוכחי

יצרתי ב-Make scenario חדש `9126542` בשם "Facebook Campaigns → Optic Up CRM (DEMO)" ב-folder Demo (499779). הוא רץ כרגע (execution `fd6c0b85d56c4c139524c3abba5eede5`).

המבנה: 4 מודולים — listCampaigns → GetAdAccountInsights (per-campaign) → BasicAggregator → HTTP POST ל-`facebook-campaigns-sync`.

**הבעיה:** ה-scenario עושה ~100 קריאות Facebook insights (אחת לכל קמפיין), ולכן רץ 8+ דקות. במצב הזה כל ריצה אורכת ~100 ops, וב-6 ריצות ביום זה 600 ops/יום ≈ 18,000 ops/חודש — חורג מהמכסה (10,000).

דניאל אישר אופטימיזציה: לעבור לקריאת insights ברמת ה-Ad Account (1 קריאה במקום 100).

## משימה

### שלב 1 — חכה לסיום הריצה הנוכחית

Poll executions_get-detail כל 60 שניות עד שהסטטוס לא יהיה RUNNING. אם זה ייקח מעל 30 דקות — דווח ועצור.

### שלב 2 — אמת את התוצאה

אם הסטטוס SUCCESS:
- בדוק ב-Supabase: `SELECT count(*) FROM crm_facebook_campaigns WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'` — אמור להיות > 0.
- בדוק `crm_ad_spend` עם אותו tenant — אמור להיות > 0.
- בדוק EF logs ב-Supabase MCP (`get_logs service=edge-function`) — אמור להופיע `POST | 200 | facebook-campaigns-sync`.

אם הסטטוס ERROR — דווח את ה-error ועצור. אל תמשיך לאופטימיזציה.

### שלב 3 — אופטימיזציה: גרסה 2 של ה-scenario

עדכן את ה-scenario `9126542` עם blueprint אופטימלי:

**מבנה חדש (5 מודולים):**

1. **Module 1 — facebook-ads-cm:listCampaigns** (זהה לקיים)
2. **Module 2 — builtin:BasicAggregator** — feeder=1, מקבץ את כל הקמפיינים מ-Module 1 לארגון אחד. מטרה: לגרום ל-Module 3 להיקרא **פעם אחת בלבד**.
3. **Module 3 — facebook-insights:GetAdAccountInsights** — type=campaign, **בלי** הפרמטר `campaign` (שמסנן לפי קמפיין ספציפי), date_preset=lifetime, fields=[campaign_id, spend]. הקריאה הזאת מחזירה את הספנד של כל הקמפיינים בקריאה אחת.
4. **Module 4 — builtin:BasicAggregator** — feeder=1, מקבץ עם lookup: לכל קמפיין מ-Module 1, חפש את ה-spend המתאים מ-Module 3 לפי campaign_id. השתמש בנוסחה: `{{first(map(3.array; "spend"; "campaign_id"; 1.id))}}`.
5. **Module 5 — http:ActionSendData** (זהה לקיים — שולח ל-EF)

**הערות חשובות:**
- ה-aggregator הראשון (Module 2) הוא רק כדי "לעצור את הזרימה" כך שה-Insights ייקרא פעם אחת. אחרי Module 3 הזרימה מופנית חזרה ל-Module 1 דרך feeder=1 ב-Module 4.
- אם המבנה הזה לא עובד ב-Make (לפעמים Make לא תומך ב-feeder=1 אחרי שכבר היה aggregator) — נסה מבנה חלופי:
  - Module 1: listCampaigns
  - Module 2: GetAdAccountInsights account-level (בלי campaign filter, יחזיר N bundles של insights)
  - Module 3: BasicAggregator עם feeder=2 — מקבץ insights לארגון אחד עם array
  - Module 4: BasicAggregator עם feeder=1 — מקבץ campaigns + lookup לתוך 3.array עם הנוסחה לעיל
  - Module 5: HTTP POST

חשוב: לפני update, בדוק את ה-blueprint הסופי דרך `validate_blueprint_schema`. אם מודול נכשל — נסה את המבנה החלופי.

### שלב 4 — אמת את הגרסה החדשה

1. הרץ pulver דרך scenarios_run.
2. חכה לסיום (אמור להיות פחות מ-30 שניות, לא 8 דקות).
3. בדוק שוב את DB ו-EF logs.
4. ודא שמספר השורות זהה למה שהיה בריצה הראשונה (אותם קמפיינים).

### שלב 5 — נקה את הנתונים אם יש שכפול

אם הריצה הראשונה והשנייה הביאו את אותם קמפיינים — אין בעיה (UPSERT). אבל אם יש שורות `crm_ad_spend` כפולות לאותו `(campaign_id, spend_date)` — נקה אותן.

### שלב 6 — דווח

דווח ב-עברית קצרה:
- כמה זמן לקחה הריצה האופטימית.
- כמה ops צריכה (אמור להיות 3-5 ולא 100+).
- כמה קמפיינים הגיעו ל-`crm_facebook_campaigns`.
- כמה שורות ב-`crm_ad_spend`.
- האם המסך בדפדפן (CRM → קמפיינים) מציג את הנתונים נכון.

### עצור על:

- אם הריצה הראשונה נכשלת ב-EF (תקלה בקריאה ל-Supabase) — עצור ודווח.
- אם המבנה האופטימלי לא עובד אחרי 2 ניסיונות — עצור ודווח.
- אם תקבל שגיאה לא ברורה — תפתח את ה-execution log ב-Make UI ותדווח את הודעת השגיאה המדויקת.

## הקשר טכני

- Connection ID: 13500740 (Facebook ADS — Daniel Lisker)
- businessId: 106457754847532
- adAccountId: act_270898661673629
- EF URL: https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/facebook-campaigns-sync
- Anon key: <SUPABASE_ANON_KEY_REDACTED>
- demo tenant_id: 8d8cfa7e-ef58-49af-9702-a862d459cccb
- Schedule: כרגע 14400 שניות (4 שעות). לא צריך לשנות.
- ה-scenario פעיל (`isActive: true`).

---

*End of prompt.*
