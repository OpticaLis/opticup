# פרומפט הפעלה — חקירת תשתית קמפיינים קיימת

> העתק את כל מה שמתחת לקו ל-Claude Code. **באותו הסשן.**

---

טען את הסקיל `opticup-executor` במצב חקירה (read-only — לא לבצע שום שינוי במערכת).

## רקע

ב-2026-04-20 או לפני זה — נוצרה ב-DB תשתית קמפיינים (טבלאות `crm_campaigns`, `crm_ad_spend`, `crm_facebook_campaigns`, `crm_campaign_pages`, `crm_unit_economics` + view `v_crm_campaign_performance`). דניאל לא זוכר שזה נבנה ולא משתמש בזה היום. ההנחה: זה נבנה ספקולטיבית, לא חובר לשום מסך, ואפשר לזרוק.

לפני שזורקים — צריך לוודא בוודאות מלאה שאין קוד פעיל במערכת שמשתמש בזה. אחרת נשבור משהו עובד.

## משימה

חקירה מלאה. **שום שינוי במערכת. רק קריאה ודוח.**

### שלב 1 — מצב הנתונים בטבלאות הקיימות

הרץ את השאילתות הבאות ודווח את התוצאות:

```sql
-- כמה רשומות יש בכל טבלה (פר tenant):
SELECT 'crm_campaigns' AS table_name, t.slug, count(*) AS rows
FROM crm_campaigns c
JOIN tenants t ON t.id = c.tenant_id
GROUP BY t.slug
UNION ALL
SELECT 'crm_ad_spend', t.slug, count(*)
FROM crm_ad_spend a
JOIN tenants t ON t.id = a.tenant_id
GROUP BY t.slug
UNION ALL
SELECT 'crm_facebook_campaigns', t.slug, count(*)
FROM crm_facebook_campaigns f
JOIN tenants t ON t.id = f.tenant_id
GROUP BY t.slug
UNION ALL
SELECT 'crm_campaign_pages', t.slug, count(*)
FROM crm_campaign_pages p
JOIN tenants t ON t.id = p.tenant_id
GROUP BY t.slug
UNION ALL
SELECT 'crm_unit_economics', t.slug, count(*)
FROM crm_unit_economics u
JOIN tenants t ON t.id = u.tenant_id
GROUP BY t.slug;

-- מתי הוכנסו / עודכנו לאחרונה?
SELECT 'crm_campaigns' AS table_name,
       max(created_at) AS last_create,
       max(updated_at) AS last_update
FROM crm_campaigns
UNION ALL
SELECT 'crm_ad_spend', max(created_at), max(updated_at) FROM crm_ad_spend
UNION ALL
SELECT 'crm_facebook_campaigns', max(created_at), max(updated_at) FROM crm_facebook_campaigns
UNION ALL
SELECT 'crm_campaign_pages', max(created_at), max(updated_at) FROM crm_campaign_pages
UNION ALL
SELECT 'crm_unit_economics', max(created_at), max(updated_at) FROM crm_unit_economics;
```

### שלב 2 — מי הכניס את הנתונים? (אם יש)

לכל טבלה שיש בה רשומות — דווח 3 רשומות אקראיות (כל העמודות) כדי לראות מה התוכן בפועל.

### שלב 3 — האם יש קוד שמשתמש בטבלאות?

חפש בכל הריפו (גם opticup וגם opticup-storefront אם מותקן):

```bash
grep -rn "crm_campaigns\|crm_ad_spend\|crm_facebook_campaigns\|crm_campaign_pages\|crm_unit_economics\|v_crm_campaign_performance" \
  --include="*.js" --include="*.ts" --include="*.html" --include="*.astro" --include="*.tsx" \
  /sessions/magical-gifted-ptolemy/mnt/opticup/ 2>/dev/null | \
  grep -v "node_modules" | grep -v ".git/" | grep -v "outputs/" | grep -v "docs/specs/"
```

דווח לכל קובץ שנמצא — מה הוא עושה (קורא? כותב? איזה פעולה? איפה זה נקרא?). אם מצאת רק במסמכים/spec — דווח שאין קוד פעיל.

### שלב 4 — האם יש Edge Functions שמשתמשות?

```bash
grep -rn "crm_campaigns\|crm_ad_spend\|crm_facebook_campaigns\|crm_campaign_pages\|crm_unit_economics" \
  /sessions/magical-gifted-ptolemy/mnt/opticup/supabase/functions/ 2>/dev/null
```

### שלב 5 — האם יש Make scenarios שמשתמשות?

נסה להשתמש ב-MCP של Make כדי לחפש scenarios שכתובים אליהם או מהם נתונים אל הטבלאות האלה. אם זה לא אפשרי דרך MCP — דווח שלא ניתן לבדוק.

### שלב 6 — קרא את ה-migration המקורי

קרא את הקובץ `campaigns/supersale/migrations/001_crm_schema.sql` ודווח:
- האם יש שם קומנטים שמסבירים למה נוצרו הטבלאות?
- האם יש זכר לקוד או למסך שאמור היה להשתמש בהן?
- מה התאריך של ה-migration?

### שלב 7 — בדוק היסטוריית git

```bash
cd /sessions/magical-gifted-ptolemy/mnt/opticup && \
git log --all --oneline --diff-filter=A -- "campaigns/supersale/migrations/001_crm_schema.sql" 2>/dev/null
```

מתי הקובץ נוצר? באיזה commit? מה הייתה הודעת ה-commit?

```bash
git log --all --oneline --grep="crm_campaigns\|crm_ad_spend\|crm_facebook_campaigns\|unit_economics" 2>/dev/null | head -20
```

איזה commits מזכירים את הטבלאות האלה?

### שלב 8 — דוח סיכום

דווח חזרה בעברית, מובנה כך:

**א. מצב הנתונים:** כמה רשומות בכל טבלה, פר tenant, ומתי האחרונות נוצרו/עודכנו.

**ב. שימוש בקוד:** האם נמצא קוד פעיל (ב-ERP, storefront, EFs)? כמה מקומות? איזה?

**ג. שימוש ב-Make:** האם נמצא scenario שכותב/קורא? אם כן — איזה?

**ד. היסטוריית הבנייה:** מתי המיגרציה נוצרה? מי הקומיט? איזה SPEC היה אם בכלל?

**ה. המלצה שלך:** האם בטוח לזרוק (DROP)? או יש סיכון? אם יש סיכון — מה הוא?

## עצור על:

- אם אתה מוצא קוד אקטיבי שמשתמש בטבלאות — עצור ודווח מיד. **אל תזרוק כלום.**
- אם אתה לא בטוח לגבי מצב משהו — עצור ושאל.
- שום DROP, DELETE, ALTER, או UPDATE. רק SELECT, grep, git log, cat.

---

*End of prompt.*
