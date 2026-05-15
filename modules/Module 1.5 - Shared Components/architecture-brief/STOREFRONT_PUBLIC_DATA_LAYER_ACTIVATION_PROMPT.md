אתה ה-Foreman של פרוייקט Optic Up. תטען את הסקיל `opticup-strategic` ותעקוב אחרי כל הכללים שלו.

המשימה: SPEC חדש בשם **STOREFRONT_PUBLIC_DATA_LAYER**. זה SPEC ארכיטקטוני יסודי, לא hotfix. הוא מחליף את SECURITY_HOTFIX_4 (ה-stub במצב retired).

ה-Brief המלא:
`modules/Module 1.5 - Shared Components/architecture-brief/STOREFRONT_PUBLIC_DATA_LAYER_BRIEF.md`

תקרא אותו במלואו ואז:

1. צור תיקיית SPEC: `modules/Module 1.5 - Shared Components/docs/specs/STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15/`
2. בצע את כל ה-pre-flight שמופיע ב-§11 של ה-Brief — 7 פעולות חובה לפני כתיבת ה-SPEC. תוצאת ה-pre-flight נכנסת לתוך ה-SPEC כ-§1.5 ("Pre-flight findings").
3. תכריע בין Pattern A (mirror tables) ל-Pattern B (SECURITY DEFINER projection views) לפי §6 של ה-Brief. הארכיטקט נוטה ל-A אבל לא מחייב — תנמק את הבחירה שלך בתוך ה-SPEC.
4. כתוב SPEC.md מלא לפי הפרוטוקול של opticup-strategic. ה-SPEC חייב לכלול:
   - §1.5 Pre-flight findings (תוצרת §11)
   - §3 Destructive Operations (Iron Rule 32) — מועתק מ-§9 של ה-Brief
   - §4 Migration order (חמש טבלאות לפי הסדר המופיע ב-§7 של ה-Brief — `inventory` אחרון)
   - §5 Verification gates — 12 הגייטים של §8 בברייף
   - §6 STOP triggers — מועתק מ-§13 של ה-Brief
   - לוח זמנים: 2-3 ימי עבודה. אסור לקצר.
5. כתוב ACTIVATION_PROMPT.md ל-Executor (לפי הפרוטוקול שלך). ה-Executor יקבל את ה-SPEC ויריץ Full-Auto Pipeline על demo קודם ואז Prizma. הסדר הזה חובה — שום פעולה הרסנית על Prizma לפני שאומתה ב-demo.
6. החזר לי בעברית: "SPEC נכתב ב-`<path>`. Activation Prompt ל-Executor ב-`<path>`. ההכרעה Pattern A או B: `<X>`. סיבה: `<line>`."

כללי עבודה — חוזר עליהם:
- אסור לי לעשות git. אתה כותב, אני קורא, ואני שולח Activation Prompt ל-Claude Code חדש שיריץ את ה-Executor.
- אם ה-pre-flight חושף שמשהו ב-Brief לא נכון (לדוגמה ש-`v_storefront_products` מקרין עמודה רגישה שלא חשבתי עליה) — STOP, תכתוב escalation, תחזיר אליי. אל תמשיך לכתוב SPEC על בסיס שגוי.
- אם אתה מזהה שהבחירה Pattern A vs B צריכה אישור Daniel אסטרטגי (לדוגמה storage cost משמעותי או latency concern שמשפיע על UX) — STOP, תחזיר שאלה אחת בעברית. אחרת תכריע לבד ותתעד.
- backups חובה לפי §12 של ה-Brief.
- בסוף תקבל גם 4 הצעות לשיפור הסקיל שלך (2 author + 2 executor), כרגיל.

הברייף הוא הסופי. תתחיל.
