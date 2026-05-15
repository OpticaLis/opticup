אתה האסטרטג של מודול M4. תכתוב SPEC ל-STATUS_CHANGE_TRIGGERS_FRAMEWORK ותריץ אותו דרך ה-Full-Auto Pipeline (Foreman → Executor → Reviewer → Localhost-Tester → Foreman-Review).

הקראתי את הקובץ הבא לפני כל פעולה — הוא ה-Brief מהארכיטקט ומכיל את כל ההחלטות הנעולות והסקופ:

`modules/Module 4 - CRM/architecture-brief/STATUS_CHANGE_TRIGGERS_FRAMEWORK_BRIEF.md`

הצורך בקצרה:
1. Framework גנרי לטריגרים מסוג status_change (attendee עכשיו, sale/payment/inventory בעתיד מבלי לשנות קוד engine).
2. דפוס: DB trigger מכניס אירוע לתור מרכזי, automation-engine קורא משם. לא code-level call מכל מודול.
3. שליחה מקבילה של SMS+Email כשתבנית מוגדרת לשני ערוצים והנמען יש לו את שני הפרטים.

החלטות נעולות מהארכיטקט נמצאות ב-§4 של ה-Brief — אסור לפתוח מחדש.
שאלות פתוחות ל-Strategist נמצאות ב-§7 — תפתור עם Daniel תוך כדי כתיבת ה-SPEC.

תתחיל בפועל ה-First Action של opticup-strategic, אחר כך תכתוב SPEC ב-`modules/Module 4 - CRM/docs/specs/STATUS_CHANGE_TRIGGERS_FRAMEWORK/SPEC.md`, אחר כך תפעיל את ה-Pipeline.
