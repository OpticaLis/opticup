# הוראות ייבוא — הפניות 301 מהוורדפרס הישן

**SPEC:** `M3_WP_SUBDOMAINS_REDIRECT` — Phase B (Daniel's manual cPanel work)
**Created:** 2026-05-08 (Phase A executor: Claude Code on develop branch)
**Files in this folder:**
- `ru.csv` — redirects for `ru.prizma-optic.co.il`
- `en.csv` — redirects for `en.prizma-optic.co.il`

---

## למה זה כאן

האתר הישן ב-`ru.prizma-optic.co.il` וב-`en.prizma-optic.co.il` עדיין חי ומציג
תוכן ישן: טלפון ישן (`053-434-7265`), מחירים ישנים, טקסט משפטי שכבר לא תקף.
הקבצים בתיקייה הזאת מפנים כל URL ישן ל-URL מקביל באתר ה-Astro החדש.
לאחר הייבוא, גוגל יחליף את התוצאות באינדקס תוך 4-8 שבועות, וההפניות 301
ימשיכו לעבוד בכל מקרה למבקרים ישירים.

**אחרי שלב זה (~30 יום):** SPEC עתידי `M3_WP_SUBDOMAINS_DECOMM` יסיר את ה-WP
לחלוטין (DNS unbind + cPanel domain remove). לא עכשיו.

---

## שלבים — `ru.prizma-optic.co.il`

### 1. כניסה ל-cPanel
1. פתח: `https://cp2.dreamvps.com:2083/cpsess5761918619/frontend/jupiter/wp-toolkit/`
2. אם הסשן פג — היכנס מחדש דרך הדאשבורד הראשי של DreamVPS.

### 2. פתיחת WP-Admin של ru.
1. ב-WP-Toolkit בחר את ה-instance של `ru.prizma-optic.co.il`.
2. לחץ "Log in" כדי להיכנס ל-WP-Admin בלי סיסמה.

### 3. התקנת Redirection plugin
1. WordPress Admin → **Plugins → Add New**.
2. חפש "**Redirection**" — by **John Godley** (icon אדום-לבן, ~2M+ active installs).
3. לחץ **Install Now** → **Activate**.
4. אם נדרש wizard ראשוני: השאר את כל ההגדרות בברירת מחדל ולחץ "Continue setup",
   ואז "Finish setup".

### 4. ייבוא ה-CSV
1. **Tools → Redirection → Import/Export** (טאב Import/Export).
2. בקטע **Import** בחר file → העלה את `ru.csv` מהתיקייה הזאת.
3. בחר module: **Redirections** (לא URL Mappings).
4. לחץ **Upload**.
5. אישור: רשימת ההפניות צריכה להכיל 1,609 שורות, כולן `301`.

### 5. בדיקת מדגם — `ru.`
פתח 5 URLs ישנים בדפדפן (incognito כדי לעקוף cache); כל אחד צריך להפנות אוטומטית:

| URL ישן | יעד צפוי |
|---|---|
| `https://ru.prizma-optic.co.il/` | `https://www.prizma-optic.co.il/ru/` |
| `https://ru.prizma-optic.co.il/about/` | `https://www.prizma-optic.co.il/ru/about/` (אם נמצאה התאמה) |
| `https://ru.prizma-optic.co.il/product/example-frame/` | `https://www.prizma-optic.co.il/ru/products/` |
| `https://ru.prizma-optic.co.il/product-category/sunglasses/` | `https://www.prizma-optic.co.il/ru/categories/` |
| `https://ru.prizma-optic.co.il/2024/01/some-blog-post/` | `https://www.prizma-optic.co.il/ru/blog/` |

(החלף את ה-slugs במשהו שקיים בקובץ `ru.csv` — בדוק את 5 השורות הראשונות
כדי להחליט אילו URLs לבדוק.)

---

## שלבים — `en.prizma-optic.co.il`

חזור על שלבים 1-5 עם ה-instance של `en.prizma-optic.co.il` ועם הקובץ `en.csv`
(1,610 שורות).

URLs לבדיקת מדגם:
- `https://en.prizma-optic.co.il/` → `https://www.prizma-optic.co.il/en/`
- `https://en.prizma-optic.co.il/about/` → `https://www.prizma-optic.co.il/en/about/`
- `https://en.prizma-optic.co.il/product/example-frame/` → `https://www.prizma-optic.co.il/en/products/`

---

## אם משהו לא עובד

| בעיה | פתרון |
|---|---|
| Redirection plugin לא נטען | בדוק WordPress version — נדרש `>= 5.0`. אם ה-WP ישן מדי, עדכן דרך WP-Toolkit. |
| CSV import נכשל עם "invalid format" | פתח את ה-CSV בעורך טקסט; וודא שהשורה הראשונה היא `source_url,target_url,match_type,action_type,action_code` — בדיוק. אם נפתח באקסל ושמרת מחדש, ייתכן שאקסל הוסיף BOM או שינה encoding — חזור ל-`ru.csv` המקורי מתוך הקבוצה `develop`. |
| Redirect לא מתבצע על URL מסוים | (1) נקה Engintron cache: `cPanel → Engintron → Purge Cache`. (2) נקה WP cache plugin אם מותקן. (3) בדוק את השורה ב-`Tools → Redirection → All Redirections` — וודא שה-source_url תואם בדיוק. (4) בדוק שה-source לא מתחיל ב-`https://...` — זה צריך להיות path בלבד (`/about/`). |
| הצליח על URL אחד אבל לא על אחר | יכול להיות trailing-slash mismatch. הוורדפרס תמיד מוסיף trailing slash; ה-CSV נכתב עם trailing slash. אם בעיה ספציפית — דווח, אגיש patch לקובץ. |

---

## הערות לטכנאי / Daniel

- **לא** לערוך את ה-CSVs ב-Excel — Excel ישנה את ה-encoding. אם נדרש ערוך,
  ערוך ב-VS Code או notepad בלבד.
- **לא** למחוק את ה-WP instances כעת — הם חייבים להישאר בחיים כדי לשרת
  את ה-301 redirects. תוכנית ההסרה (Phase C) היא ~30 יום אחרי שגוגל מאנדקס
  מחדש את היעדים החדשים.
- **לא** להפעיל גם את ה-301 גם redirect ב-Cloudflare/Vercel — תקבל לולאה.
  הוורדפרס הוא ה-301 source, וה-Astro site מקבל את התעבורה.
- **כן** לאמת ב-Google Search Console (אחרי 1-2 שבועות) שהמיגרציה התחילה
  להופיע: Old URLs ירדו, New URLs יעלו.

---

## אימות סופי (אחרי הייבוא)

לאחר שגם `ru.csv` וגם `en.csv` יובאו והבדיקה ידנית עברה:

1. עדכן את הסטטוס בקובץ `__LAUNCH_PLAN_DRAFT__/site-overseer/SITE_OVERSEER_HANDOFF.md`
   — REC-SITE-015 → **Phase B done, awaiting Google reindex**.
2. תזכורת ביומן ל-`+30 days` כדי לפתוח SPEC להסרת ה-WP (Phase C).

---

*End of IMPORT_INSTRUCTIONS.md.*
