# פרומפט הפעלה — חקירת ה-Make scenarios הקיימים של קמפיינים

> העתק את כל מה שמתחת לקו ל-Claude Code. **באותו הסשן.**

---

טען את הסקיל `opticup-executor` במצב חקירה.

המטרה: ללמוד איך הקמפיינים של פייסבוק מסונכרנים אוטומטית במייק היום. דניאל בנה כמה scenarios שמושכים נתונים מ-Facebook ומעדכנים את Monday. אנחנו רוצים לבנות scenario חדש שיעשה את אותו דבר אבל ישלח ל-Edge Function שלנו במקום ל-Monday. צריך להבין את המבנה הקיים לפני שמשכפלים.

## הקשר

ב-Make יש folder בשם **"Ads & Money Management"** (folderId 445283) עם 4 scenarios:
- 8467280: "Facebook ADS יצירת מודעות חדשות"
- 8467639: "Facebook ADS Integration Facebook Insights"
- 8484085: "Facebook ADS ניקוי מודעות לא פעילות"
- (אחד נוסף — שלח רשימה לפייסבוק?)

המידע במאנדיי בבורד "Facebook ADS" כולל: Campaign ID, name, status, total_spend, daily_budget, master, interests, event_type. אנחנו צריכים את כולם לכדי המסך החדש.

## משימה

### שלב 1 — רשימת כל ה-scenarios

השתמש ב-Make MCP. teamId = 402680. רשום:
- כל ה-scenarios ב-folder "Ads & Money Management" (445283).
- לכל אחד: id, name, isActive, scheduling, lastEdit.

### שלב 2 — לכל scenario — פרט את המודולים

לכל scenario מהשלב 1, השתמש ב-`scenarios_get` ושאוב את ה-blueprint. לכל מודול בתוך flow, דווח:
- module name (e.g., `facebook-ads-cm:listCampaigns`)
- mapper key configs (limit, businessId, fields, וכו')
- אם יש routes (router) — ירידה לעומק.

**שמור את ה-blueprints למחקר** — אם מודול ספציפי נראה רלוונטי, הוצא ממנו את הפרטים.

### שלב 3 — דוח על שדות

המטרה: לדעת איזה שדות בדיוק מ-Facebook אנחנו יכולים למשוך אוטומטית. לכל scenario מהשלב 2:
- אילו fields נמשכים מ-`facebook-ads-cm:listCampaigns`?
- אילו fields נמשכים מ-`facebook-insights:GetAdAccountInsights`?
- אילו fields אחרים נטענים ממקורות אחרים (Monday lookup, formula, וכו')?
- במיוחד — איפה מגיעים `master`, `interests`, `event_type`? האם הם:
  - מובאים מ-Facebook Labels?
  - מובאים מ-Custom Audience metadata?
  - נשלפים מתוך שם הקמפיין (regex parse)?
  - חישוב/lookup אחר?

### שלב 4 — מבנה מומלץ ל-scenario החדש

על בסיס מה שלמדת — תכתוב מבנה מומלץ ל-scenario חדש שיעשה את אותו דבר כמו ה-3 הקיימים, רק שבמקום לכתוב ל-Monday — יעשה POST ל-Edge Function `facebook-campaigns-sync`. דווח:
- כמה מודולים?
- אילו מודולים בדיוק (שם + סוג)?
- בסדר מה?
- כל מה שצריך להעתיק 1:1 מהקיים (adAccountId, businessId, scopes).

### שלב 5 — דוח קצר בעברית לדניאל

דווח לי בעברית פשוטה (5-7 שורות):
- כמה scenarios קיימים בעניין הזה.
- מאיפה כל שדה במאנדיי מגיע (במיוחד master, interests, event_type).
- האם המבנה החדש (5 מודולים, מ-listCampaigns ועד POST) ברור ויישים, או שיש סיבוכים שהוצפו.

**אל תיצור scenario חדש עדיין.** אני אכתוב את ה-blueprint על בסיס הדוח שלך ונבנה ביחד.

## עצור על

- אם MCP מחזיר שגיאה — דווח. אל תנחש.
- אם blueprint גדול מדי וקריאה אחת לא מספיקה — דווח. אני אמצא דרך לפצל.
- אם משהו לא ברור (למשל קמפיין שמשתמש ב-`monday:GetItem` עם columnId שאני לא מבין מה מחזיק) — דווח עם השאלה.

---

*End of prompt.*
