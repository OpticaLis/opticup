// =========================================================
// receipt-guide.js — Employee quick reference guide for goods receipt
// Split from receipt-form.js for file size management
// Provides: RECEIPT_GUIDE_TEXT, showReceiptGuide()
// =========================================================

const RECEIPT_GUIDE_TEXT = `
\uD83D\uDCE6 קבלת סחורה — מדריך מהיר

1. סחורה הגיעה? בדוק מה מצורף:
   • חשבונית מס → בחר "חשבונית מס"
   • תעודת משלוח → בחר "תעודת משלוח"

2. סרוק או צלם את המסמך (שמירה לתיקייה משותפת)

3. פתח "קבלה חדשה":
   • בחר ספק (המערכת תזהה את סוג המסמך הרגיל שלו)
   • הכנס מספר מסמך
   • אם יש הזמנת רכש פתוחה — היא תופיע אוטומטית

4. הוסף פריטים:
   • פריט קיים → סרוק ברקוד או חפש
   • פריט חדש → הכנס פרטים → ברקוד ייווצר אוטומטית
   • ודא כמויות ומחירים

5. בדוק את הסיכום ואשר עם PIN

\u2705 המלאי יתעדכן, החוב לספק ייווצר אוטומטית

\uD83E\uDD16 סריקה חכמה עם AI
\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
1. צרף מסמך (PDF או תמונה) בלחיצה על "צרף מסמך"
2. לחץ על "סרוק עם AI" — המערכת תזהה אוטומטית:
   • שם הספק
   • מספר מסמך ותאריך
   • פריטים, כמויות ומחירים
3. בדוק את הנתונים שזוהו ותקן במידת הצורך
4. אשר עם PIN — המלאי מתעדכן אוטומטית

\uD83D\uDCA1 ככל שתשתמש יותר, המערכת לומדת את הפורמט של כל ספק ומשתפרת!
`.trim();

function showReceiptGuide() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center';
  const box = document.createElement('div');
  box.style.cssText = 'background:#fff;border-radius:12px;padding:24px 28px;max-width:520px;width:90%;max-height:80vh;overflow-y:auto;direction:rtl;text-align:right;line-height:1.8;white-space:pre-line;font-size:.95rem;box-shadow:0 8px 32px rgba(0,0,0,.25)';
  box.textContent = RECEIPT_GUIDE_TEXT;
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'סגור';
  closeBtn.className = 'btn'; closeBtn.style.cssText = 'background:#1a73e8;color:#fff';
  closeBtn.style.cssText = 'margin-top:16px;display:block;margin-right:auto';
  closeBtn.onclick = () => overlay.remove();
  box.appendChild(closeBtn);
  overlay.appendChild(box);
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}
