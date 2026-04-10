// supabase/functions/generate-brand-content/style-guide.ts

export const STYLE_GUIDE = `
# Brand Content Guide — Optic Up

## Structure
- Tagline: 1 sentence in Hebrew about the brand essence
- Description Part 1 (3 paragraphs): Brand heritage, design philosophy, what makes it special
- Description Part 2 (3 paragraphs): Why buy at Prizma — general service description, no specific commitments
- SEO Title format: "משקפי {brand Hebrew} {brand English} — משקפי שמש ומסגרות ראייה | אופטיקה פריזמה"
- SEO Description: ~155 chars with brand keywords

## Rules
- Professional but warm Hebrew tone
- Must include: "משקפי {brand}", "משקפי שמש של {brand}", "מסגרות ראייה של {brand}"
- No prices, no competitor comparisons, no specific commitments or promises
- Last 3 paragraphs about Prizma service — general, warm, professional
- Each paragraph wrapped in <p> tags

## Approved Example: Gucci
Tagline: "יוקרה איטלקית מפירנצה מאז 1921."

Part 1:
<p>מותג משקפי גוצ'י Gucci הוא חלק בלתי נפרד מהמורשת האיטלקית של בית האופנה שנוסד בשנת 1921 בפירנצה על ידי גוצ'יו גוצ'י. מאז הקמתו, הפך Gucci לאחד מבתי האופנה המזוהים ביותר בעולם עם איכות, עיצוב נועז וסטייל עילית. קולקציית המשקפיים של גוצ'י משקפת את אותה תפיסה אסתטית – שילוב בין מסורת איטלקית עשירה לבין חדשנות עיצובית ויצירתית.</p>
<p>במהלך השנים נבנו קולקציות המשקפיים של Gucci Eyewear סביב רעיונות של זהות, אופנה ואומנות. המותג מתאפיין ביכולת יוצאת דופן לחדש תוך שמירה על שורשיו: אלמנטים המזוהים עם בית האופנה – כמו פסי הירוק־אדום הקלאסיים, לוגו GG המוזהב ודגמים בהשראת עולם הרטרו – משתלבים בקולקציות מודרניות עם חומרים מתקדמים כמו אצטט, טיטניום ומתכת קלה.</p>
<p>העיצוב של משקפי גוצ'י Gucci נודע בשילוב בין דרמה, אלגנטיות ויצירתיות, והוא מייצג את ה־DNA של בית האופנה: אקספרסיביות, יוקרה ופרשנות עכשווית למושג "קלאסי".</p>

Part 2:
<p>באופטיקה פריזמה תמצאו מבחר רחב של משקפי גוצ'י Gucci — משקפי שמש של גוצ'י לנשים ולגברים, מסגרות ראייה של גוצ'י בכל הסגנונות, ודגמים ייחודיים מהקולקציות העדכניות ביותר של Gucci Eyewear.</p>
<p>אנחנו מאמינים שבחירת משקפי גוצ'י היא חוויה — לא רק קנייה. לכן אנחנו מציעים ייעוץ מקצועי, התאמה אישית של המסגרת, ואפשרות להתקנת עדשות מותאמות במעבדה שלנו.</p>
<p>כשאתם בוחרים משקפי גוצ'י Gucci באופטיקה פריזמה, אתם נהנים משילוב של מותג יוקרה עולמי עם שירות אישי ומקצועי שמלווה אתכם מהבחירה ועד ההתאמה הסופית.</p>
`;

export const STRICT_MODE_SUFFIX = ""; // populated in Phase 2
