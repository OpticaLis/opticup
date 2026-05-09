# פרומפט הפעלה — בניית 3 מוקאפים למסך מדידת קמפיינים

> העתק את כל מה שמתחת לקו ל-Claude Code. **באותו הסשן.**

---

טען את הסקיל `opticup-executor`.

## רקע

דניאל רוצה לבנות מסך חדש בתוך ה-CRM למדידת ביצועי קמפיינים בפייסבוק. במקום לקבוע עיצוב מראש — הוא רוצה לראות 3 מוקאפים שונים בסגנונות שונים ולבחור אחד.

המוקאפים צריכים להיות **HTML סטטיים עצמאיים** עם נתונים מומצאים (אבל ריאליסטיים) — כדי שדניאל יוכל לפתוח אותם בדפדפן ולהשוות.

## הקשר שצריך לאסוף לפני בנייה

קרא את המסמכים הבאים כדי להבין מה המידע הרלוונטי שצריך להופיע במסך:

1. **תמונות שדניאל שיתף בסשן הקודם** (במאנדיי): בורד "Facebook ADS" עם עמודות:
   - Campaign name, Status (Active/Paused/Stopped), Event Type (SuperSale/MultiSale)
   - Campaign ID, Total Spend, Daily Budget, Decision Text (STOP/SCALE/TEST)
   - Revenue, Buyers Num, Gross Profit
   - CAC (Customer Acquisition Cost), Kill CAC, Scaling CAC, CPL (Cost Per Lead)
   - Leads Num, Kill Multiplier, Scaling Multiplier
   - Master, Interests, Unique, Total Revenue
   - m.Status, Unit Economics, Gross Margin %

2. **בורד Unit Economics** (פרמטרים שמוזנים ידנית):
   - Event type → Gross Margin % → Kill Multiplier → Scaling Multiplier
   - דוגמה: SuperSale → 0.2 → 4 → 6; MultiSale → 0.5 → 5 → 7

3. **קיבוץ במאנדיי:** קמפיינים מקובצים אוטומטית לפי סטטוס:
   - Live & Scaling (ירוק)
   - Paused (כתום)
   - Stopped (אדום)
   - לכל קבוצה — שורת סיכום (sums + averages)

4. **הגיון ה-Kill/Scale:** המערכת אמורה להציע החלטה אוטומטית לכל קמפיין:
   - אם CAC > Kill CAC → "STOP" (אדום)
   - אם CAC < Scaling CAC → "SCALE" (ירוק)
   - באמצע → "TEST" (אפור)

5. **הקשר אסטרטגי:** דניאל רוצה אוטומציה מלאה — שום הזנה ידנית במסך הזה. הקלט היחיד: ה-Unit Economics (Kill/Scale thresholds + Gross Margin) פר event_type. הכל אחר מחושב או מסונכרן מ-Facebook אוטומטית.

6. **מקורות נתונים שיהיו ב-DB אחרי P7:**
   - `crm_facebook_campaigns` — קמפיינים עם ספנד, סטטוס, יעדים (סנכרון מפייסבוק כל 4 שעות)
   - `crm_leads.utm_campaign_id` — קישור ליד לקמפיין
   - `crm_event_attendees` + רכישות — לחישוב Revenue ו-Buyers
   - `crm_unit_economics` — הגדרות לכל סוג event

7. **עיצוב כללי:** המוקאפים צריכים להתאים לסגנון של המערכת (Tailwind, RTL Hebrew, Heebo font, palette indigo/violet/emerald/amber). תוכל לקחת השראה מ-`crm.html` הקיים (`modules/Module 4 - CRM/...`).

## משימה

בנה 3 קבצי HTML עצמאיים בנתיב `outputs/campaign-mockups/`:

### Mockup A — Table-First (טבלה דומה למאנדיי)

טבלה רחבה אחת עם כל העמודות. קיבוץ אוטומטי לפי סטטוס (Live & Scaling / Paused / Stopped) עם שורת sum לכל קבוצה. ההחלטה (STOP/SCALE/TEST) כעמודה צבעונית. סינון/מיון בכותרות העמודות. דומה למאנדיי אבל יותר מודרני, עם Tailwind. מתאים למי שרגיל למאנדיי ורוצה את כל הנתונים בעין אחת.

### Mockup B — Card-First (כל קמפיין כרטיס)

כל קמפיין הוא כרטיס גדול עם: שם, סטטוס badge, החלטה (STOP/SCALE/TEST) כ-banner צבעוני בראש, KPIs ראשיים (Spend, Revenue, CAC, Profit) בתוך הכרטיס בגרידים, sparkline קטן של ביצועים. הכרטיסים מקובצים בקטעים לפי סטטוס. סקרול אנכי. יותר ויזואלי, פחות צפוף, מתאים לסקירה מהירה.

### Mockup C — Dashboard + Drill-Down (סטטיסטיקות מעל + טבלה למטה)

חלק עליון — 6 KPI cards של סיכום כללי (Total Spend, Total Revenue, Overall CAC, Total Leads, Total Buyers, Gross Profit). תחתון — טבלה קומפקטית של קמפיינים עם פחות עמודות (רק החיוניים: שם, סטטוס, ספנד, לידים, CAC, החלטה). לחיצה על שורה פותחת modal עם פרטים מלאים. מתאים למי שרוצה תמונה כללית קודם, ואז drill-down.

## דרישות לכל המוקאפים

- HTML עצמאי לחלוטין (כולל Tailwind CDN, Heebo font CDN, אייקונים Lucide CDN).
- RTL Hebrew, dir="rtl".
- 8-12 קמפיינים לדוגמה (mix של Live & Scaling, Paused, Stopped — לפחות אחד מכל סטטוס).
- שמות קמפיינים אמיתיים בסגנון פייסבוק: "קמפיין לידים | SuperSale אשקלון | קץ | 60 יום | UGC", "קמפיין מודעות | קרית גת" וכו'.
- מספרים ריאליסטיים (ספנד 100-5000 ש"ח, CAC 200-2000, לידים 5-300).
- צבעים: ירוק (Live/Scale), כתום (Paused), אדום (Stopped/STOP), אפור (TEST), אינדיגו (highlights).
- כותרת בראש כל מוקאפ: "Mockup [A/B/C] — [תיאור קצר]".
- הערה למטה: 1-2 משפטים על למה הסגנון הזה טוב/מתי לבחור בו.

## פלט

3 קבצים:
- `outputs/campaign-mockups/A-table-first.html`
- `outputs/campaign-mockups/B-card-first.html`
- `outputs/campaign-mockups/C-dashboard-drill.html`

ובנוסף קובץ אינדקס:
- `outputs/campaign-mockups/index.html` — דף נחיתה עם 3 קישורים לכל מוקאפ + תיאור קצר.

## דיווח

בסיום, דווח חזרה:
- 3 + 1 קבצים נוצרו בנתיב המבוקש.
- כל מוקאפ נפתח בדפדפן ללא שגיאות console.
- שורה אחת לכל מוקאפ — נקודה חזקה ונקודה חלשה לדעתך.

**אל תעלה ל-git** — אלה קבצים זמניים ב-`outputs/`. דניאל יבחר אחד ואז ניצור SPEC לבנייה.

---

*End of prompt.*
