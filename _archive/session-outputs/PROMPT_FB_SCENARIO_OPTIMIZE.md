# פרומפט הפעלה — ביטול הריצה הנוכחית + מעבר לגרסה האופטימלית

> העתק את כל מה שמתחת לקו ל-Claude Code. **באותו הסשן.**

---

טען את הסקיל `opticup-executor`.

## מצב נוכחי

ה-scenario `9126542` בריצה כבר 30+ דקות, תקוע ב-Module 2 (per-campaign Facebook Insights calls — 200+ ops). ה-DB עדיין ריק, ה-EF לא קיבל כלום. דניאל אישר לבטל ולעבור לגרסה האופטימלית (account-level insights בקריאה אחת).

## משימה

### שלב 1 — הפסקת הריצות הנוכחיות

1. Deactivate את ה-scenario `9126542` דרך scenarios_deactivate. זה יעצור את הריצות הקיימות.
2. אחרי 30 שניות — בדוק שה-executions הסתיימו (כל הסטטוסים אמורים להיות INCOMPLETE/STOPPED/ERROR, לא RUNNING).

### שלב 2 — עדכון ה-blueprint לגרסה אופטימלית

**מבנה חדש:**

```
Module 1: facebook-ads-cm:listCampaigns (זהה לקיים)
Module 2: facebook-insights:GetAdAccountInsights — אבל בלי per-campaign filter
   - mapper: {type: "campaign", limit: "500", fields: ["campaign_id", "spend"], business: "...", adAccount: "...", date_preset: "lifetime", specify_date: "date_preset"}
   - חסר ה-`campaign` field — זה מה שגורם לקריאה אחת account-level
Module 3: builtin:BasicAggregator עם feeder=2
   - מקבץ את כל ה-insights bundles לארגון אחד עם array.
   - mapper: {campaign_id: "{{2.campaign_id}}", spend: "{{2.spend}}"}
Module 4: builtin:BasicAggregator עם feeder=1
   - מקבץ את כל ה-campaigns + lookup ל-3.array לפי campaign_id
   - mapper: {
       campaign_id: "{{1.id}}",
       name: "{{1.name}}",
       status: "{{1.effective_status}}",
       event_type: "{{if(contains(1.name; \"SuperSale\"); \"SuperSale\"; if(contains(1.name; \"MultiSale\"); \"MultiSale\"; null))}}",
       daily_budget: "{{parseNumber(1.daily_budget; \".\") / 100}}",
       total_spend: "{{parseNumber(first(map(3.array; \"spend\"; \"campaign_id\"; 1.id)); \".\")}}"
     }
Module 5: http:ActionSendData (זהה לקיים — שולח ל-EF)
```

**Pitfalls שצריך לדעת:**
- אם ה-`feeder=2` ב-Module 3 לא עובד (כי Module 2 כבר אגרגציה של bundles) — נסה גם feeder עם module 1 אבל רק כדי לאסוף את העטיפה.
- אם הביטוי `first(map(3.array; "spend"; "campaign_id"; 1.id))` נכשל — נסה אלטרנטיבה: `get(map(3.array; "spend"; "campaign_id"; 1.id); 1)`.
- אם Module 2 בלי `campaign` filter עדיין יוצא bundle לכל קמפיין — זה מה שאנחנו רוצים, ה-aggregator הוא שמטפל בזה.

לפני שתעשה update — ולידציה דרך `validate_blueprint_schema`. אם נכשל — תתקן.

### שלב 3 — הפעל מחדש

1. activate scenario.
2. הרץ פעם אחת ידנית (`scenarios_run`).
3. הריצה אמורה להסתיים תוך **15-30 שניות**, לא דקות.
4. אם תוך 60 שניות לא הסתיימה — עצור ודווח. כנראה שה-blueprint שגוי.

### שלב 4 — אמת

- `SELECT count(*) FROM crm_facebook_campaigns WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'` — אמור להיות > 0 (200+ קמפיינים).
- `SELECT count(*) FROM crm_ad_spend WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'` — אמור להיות > 0 (שורה לכל קמפיין על תאריך היום).
- `SELECT name, total_spend FROM crm_facebook_campaigns WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb' LIMIT 5` — דווח 5 שורות לדוגמה.
- ב-EF logs — אמור להופיע `POST | 200 | facebook-campaigns-sync` עם execution_time_ms סביר (1000-5000ms).

### שלב 5 — צפייה במסך

נווט ל-`http://localhost:3000` בדפדפן (chrome-devtools MCP), היכנס לדמו, לטאב "📈 קמפיינים". ודא שהקמפיינים האמיתיים מ-Facebook מופיעים עם החלטות נכונות (STOP/SCALE/TEST). אם הכל נראה תקין — צלם screenshot ושמור ב-`outputs/campaign-screen-screenshots/4-real-data.png`.

### שלב 6 — דווח

דווח קצר בעברית:
- כמה זמן לקחה הריצה האופטימית.
- כמה ops הושקעו.
- כמה קמפיינים נטענו.
- האם ההחלטות במסך נראות נכונות.
- אם הכל עובד — נא לציין שדניאל יכול עכשיו לקבל החלטה אם לעבור ל-prizma (לשנות `tenant_slug` בגוף ה-HTTP).

## עצור על

- אם אחרי 2 ניסיונות לעדכן את ה-blueprint עדיין שגיאה — עצור ודווח את ה-error המדויק.
- אם הקריאה לאחר אופטימיזציה עוד לוקחת מעל דקה — עצור, יכול להיות שיש עיוות בהבנה של איך GetAdAccountInsights מתנהג.
- אם המסך מציג אפס קמפיינים אבל ה-DB מלא — זה bug שצריך לחקור.

---

*End of prompt.*
