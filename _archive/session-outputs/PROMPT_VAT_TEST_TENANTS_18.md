# פרומפט הפעלה — עדכון 3 test tenants ל-VAT 18%

> העתק את כל מה שמתחת לקו ל-Claude Code על המכונה שלך.
> באותו הסשן הקיים.

---

ההחלטה: כל ה-tenants צריכים להיות על 18 (מע"מ ישראלי הנוכחי). ה-17 בשלושת ה-test tenants היה טעות מ-knowledge cutoff ישן של המודל, לא בחירה מודעת.

עדכן:

```sql
UPDATE tenants
SET vat_rate = 18
WHERE slug IN ('test-store-qa', 'test-store-v2', 'test-store-verify')
  AND vat_rate = 17;
```

ודא שהעדכון תפס:
```sql
SELECT slug, vat_rate FROM tenants ORDER BY slug;
```

צריך להחזיר את כל ה-tenants עם `vat_rate = 18`.

דווח חזרה: כמה rows עודכנו וטבלת התוצאה הסופית.

---

*End of prompt.*
