# Mission 9: Executive Summary — Checklist

Create a plain-language summary for Daniel. This mission always runs LAST,
after all other missions have produced their findings.

## Rules

1. **Hebrew only.** Daniel reads Hebrew. The entire summary is in Hebrew.
2. **No technical terms.** Not one. No file names, no function names, no SQL,
   no "RLS", no "tenant_id", no "JWT". If you can't explain it without
   technical terms — rephrase until you can.
3. **Business impact focus.** Instead of "missing RLS on table X" → 
   "יש טבלה שלא מוגנת כראוי — מידע של חנות אחת עלול להיראות לחנות אחרת."
4. **Short.** Maximum 20 lines. Daniel doesn't have time for more.
5. **Actionable.** Each item says what Daniel needs to decide, if anything.
   If no decision needed — don't include it, it's internal.

## Structure

```markdown
# דוח יומי — [תאריך]

## מצב כללי: [🟢 הכל תקין | 🟡 יש דברים לשים לב | 🔴 יש בעיה דחופה]

## דחוף (אם יש)
- [one line per critical finding, in business terms]

## דורש תשומת לב (אם יש)
- [one line per high finding, in business terms]

## מה בסדר
- [2-3 lines about what passed — Daniel should know the system is being watched]

## המלצה
[One sentence: what should happen next, if anything]
```

## Translation Guide (Technical → Business)

| Technical Finding | Business Language |
|---|---|
| Missing RLS policy | מידע לא מוגן — חנות אחת יכולה לראות מידע של חנות אחרת |
| Hardcoded tenant name | שם חנות מסוימת כתוב ישירות בקוד — אם נצרף חנות חדשה היא תראה "פריזמה" |
| Missing tenant_id | טבלה לא מחוברת למערכת ההפרדה בין חנויות |
| innerHTML with user input | פרצת אבטחה — מישהו יכול להזריק קוד זדוני דרך שדה טקסט |
| File over 350 lines | קובץ גדול מדי — קשה לתחזק ומסוכן לערוך |
| Schema drift | המסמכים אומרים דבר אחד אבל מה שנמצא בבסיס הנתונים שונה |
| Orphaned function | יש קוד שאף אחד לא משתמש בו — מבלבל ומסכן |
| UNIQUE without tenant_id | מנגנון שמונע כפילויות לא מותאם לריבוי חנויות |
| Stale documentation | מסמכים לא עדכניים — הצ'אט שעובד יכול לקבל מידע שגוי |

## When to Include Something

Include only if:
- Daniel needs to make a decision (scope, priority, approval)
- There's a security risk that affects real data
- Something blocks the next phase of work

Do NOT include:
- Code style issues
- Internal refactoring suggestions
- Findings that the development team can handle without Daniel
