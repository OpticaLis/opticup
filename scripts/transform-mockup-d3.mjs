#!/usr/bin/env node
// One-off transform for M1_5_DESIGN_SYSTEM_MOCKUPS_3C_BOLD_DENSE_PRO_TOOL SPEC.
// Sibling of scripts/transform-mockup-d1.mjs — same staticization logic,
// different DEST + mock blocks tuned for Direction 3 (dense, ≥ 22 rows in
// inventory to satisfy criterion #18).
// Delete this file after SPEC closes.
import fs from 'node:fs';
import path from 'node:path';

const DEST = 'modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/direction-3-bold-dense-pro-tool';
const CSS_CHAIN = [
  '../../../../../shared/css/variables.css',
  '../../../../../shared/css/layout.css',
  '../../../../../shared/css/components.css',
  '../../../../../shared/css/components-extra.css',
  '../../../../../shared/css/forms.css',
  '../../../../../shared/css/modal.css',
  '../../../../../shared/css/toast.css',
  '../../../../../shared/css/table.css',
  './_tokens.css',
];
const cssLinks = CSS_CHAIN.map(h => `<link rel="stylesheet" href="${h}">`).join('\n');

function transform(src, kind, mockBlock) {
  let s = fs.readFileSync(src, 'utf8');

  s = s.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<script\b[^>]*\/>/gi, '');
  s = s.replace(/<link[^>]*fonts\.googleapis\.com[^>]*>\s*/gi, '');
  s = s.replace(/<link[^>]*fonts\.gstatic\.com[^>]*>\s*/gi, '');

  if (kind === 'production') {
    s = s.replace(/<link[^>]*href="css\/[^"]+"[^>]*>\s*/gi, '');
    s = s.replace(/<link[^>]*href="shared\/css\/[^"]+"[^>]*>\s*/gi, '');
  }

  s = s.replace(/(style="[^"]*?)#[0-9a-fA-F]{3,8}\b/g, '$1transparent');
  s = s.replace(/(style="[^"]*?)#[0-9a-fA-F]{3,8}\b/g, '$1transparent');
  s = s.replace(/(style="[^"]*?)#[0-9a-fA-F]{3,8}\b/g, '$1transparent');
  s = s.replace(/(style="[^"]*?)#[0-9a-fA-F]{3,8}\b/g, '$1transparent');

  if (s.includes('</head>')) {
    s = s.replace('</head>', `\n${cssLinks}\n</head>`);
  } else {
    throw new Error(`No </head> in ${src}`);
  }

  if (kind === 'production' && mockBlock) {
    s = s.replace(/<main(\b[^>]*)?>/i, (m) => `${m}\n${mockBlock}\n`);
  }

  s = s.replace(/\n{3,}/g, '\n\n');

  return s;
}

// Mock inventory rows — Direction 3 targets ≥ 22 rows / 1080 viewport (criterion #18).
// Numeric columns annotated with [data-numeric] so _tokens.css tabular-nums kicks in.
const MOCK_INVENTORY = `
<div class="card" data-mock="design-direction-3">
  <h3>📦 מלאי לדוגמה (mock — Direction 3 · dense-pro-tool)</h3>
  <div class="table-wrap">
    <table>
      <thead><tr><th>ברקוד</th><th>מותג</th><th>דגם</th><th>גודל</th><th>צבע</th><th>מחיר</th><th>כמות</th><th>סטטוס</th></tr></thead>
      <tbody>
        <tr><td data-numeric>0100001</td><td>Ray-Ban</td><td>RB-2140</td><td data-numeric>54</td><td>שחור</td><td data-numeric>1,290</td><td data-numeric>3</td><td>זמין</td></tr>
        <tr><td data-numeric>0100002</td><td>Persol</td><td>PO-3019</td><td data-numeric>52</td><td>חום-טורטז</td><td data-numeric>1,490</td><td data-numeric>2</td><td>זמין</td></tr>
        <tr><td data-numeric>0100003</td><td>Oakley</td><td>OO-9272</td><td data-numeric>57</td><td>שחור-מט</td><td data-numeric>980</td><td data-numeric>5</td><td>זמין</td></tr>
        <tr><td data-numeric>0100004</td><td>Prada</td><td>PR-17ZV</td><td data-numeric>54</td><td>זהב</td><td data-numeric>2,150</td><td data-numeric>1</td><td>נמוך</td></tr>
        <tr><td data-numeric>0100005</td><td>Gucci</td><td>GG-0061</td><td data-numeric>56</td><td>כסף</td><td data-numeric>1,790</td><td data-numeric>4</td><td>זמין</td></tr>
        <tr><td data-numeric>0100006</td><td>Tom Ford</td><td>TF-5040</td><td data-numeric>54</td><td>חום-בהיר</td><td data-numeric>2,490</td><td data-numeric>2</td><td>זמין</td></tr>
        <tr><td data-numeric>0100007</td><td>Carrera</td><td>CA-1019</td><td data-numeric>58</td><td>שחור-מט</td><td data-numeric>650</td><td data-numeric>6</td><td>זמין</td></tr>
        <tr><td data-numeric>0100008</td><td>Tag Heuer</td><td>TH-7711</td><td data-numeric>56</td><td>אפור-טיטניום</td><td data-numeric>3,290</td><td data-numeric>1</td><td>נמוך</td></tr>
        <tr><td data-numeric>0100009</td><td>Hugo Boss</td><td>BO-1083</td><td data-numeric>55</td><td>כחול-כהה</td><td data-numeric>1,150</td><td data-numeric>3</td><td>זמין</td></tr>
        <tr><td data-numeric>0100010</td><td>Polaroid</td><td>PLD-4061</td><td data-numeric>53</td><td>חום</td><td data-numeric>490</td><td data-numeric>8</td><td>זמין</td></tr>
        <tr><td data-numeric>0100011</td><td>Lacoste</td><td>L-2870</td><td data-numeric>54</td><td>ירוק-בקבוק</td><td data-numeric>790</td><td data-numeric>4</td><td>זמין</td></tr>
        <tr><td data-numeric>0100012</td><td>Versace</td><td>VE-3306</td><td data-numeric>55</td><td>זהב-ורוד</td><td data-numeric>2,290</td><td data-numeric>2</td><td>זמין</td></tr>
        <tr><td data-numeric>0100013</td><td>Dior</td><td>DI-5078</td><td data-numeric>54</td><td>שחור-שקוף</td><td data-numeric>2,490</td><td data-numeric>1</td><td>נמוך</td></tr>
        <tr><td data-numeric>0100014</td><td>Armani</td><td>EA-4047</td><td data-numeric>56</td><td>שחור-מט</td><td data-numeric>1,090</td><td data-numeric>5</td><td>זמין</td></tr>
        <tr><td data-numeric>0100015</td><td>Calvin Klein</td><td>CK-19121</td><td data-numeric>54</td><td>חום-שקוף</td><td data-numeric>790</td><td data-numeric>4</td><td>זמין</td></tr>
        <tr><td data-numeric>0100016</td><td>Burberry</td><td>BE-4216</td><td data-numeric>57</td><td>שחור</td><td data-numeric>1,890</td><td data-numeric>2</td><td>זמין</td></tr>
        <tr><td data-numeric>0100017</td><td>Maui Jim</td><td>MJ-264</td><td data-numeric>58</td><td>כסוף-מראה</td><td data-numeric>2,690</td><td data-numeric>3</td><td>זמין</td></tr>
        <tr><td data-numeric>0100018</td><td>Vogue</td><td>VO-2606</td><td data-numeric>53</td><td>ורוד-זהב</td><td data-numeric>590</td><td data-numeric>7</td><td>זמין</td></tr>
        <tr><td data-numeric>0100019</td><td>Bvlgari</td><td>BV-6111</td><td data-numeric>55</td><td>זהב-ורוד</td><td data-numeric>3,490</td><td data-numeric>1</td><td>נמוך</td></tr>
        <tr><td data-numeric>0100020</td><td>Fendi</td><td>FF-0379</td><td data-numeric>54</td><td>שחור-זהב</td><td data-numeric>2,790</td><td data-numeric>2</td><td>זמין</td></tr>
        <tr><td data-numeric>0100021</td><td>Chanel</td><td>CH-3392</td><td data-numeric>53</td><td>שחור</td><td data-numeric>3,890</td><td data-numeric>1</td><td>נמוך</td></tr>
        <tr><td data-numeric>0100022</td><td>Cartier</td><td>CT-0090O</td><td data-numeric>56</td><td>זהב-מבריק</td><td data-numeric>5,290</td><td data-numeric>1</td><td>נמוך</td></tr>
        <tr><td data-numeric>0100023</td><td>Police</td><td>PL-2070</td><td data-numeric>55</td><td>שחור-מט</td><td data-numeric>590</td><td data-numeric>6</td><td>זמין</td></tr>
        <tr><td data-numeric>0100024</td><td>Diesel</td><td>DL-5108</td><td data-numeric>54</td><td>כחול-שקוף</td><td data-numeric>690</td><td data-numeric>5</td><td>זמין</td></tr>
        <tr><td data-numeric>0100025</td><td>D&G</td><td>DG-5078</td><td data-numeric>53</td><td>ורוד-טורטז</td><td data-numeric>1,490</td><td data-numeric>3</td><td>זמין</td></tr>
        <tr><td data-numeric>0100026</td><td>Saint Laurent</td><td>SL-M76</td><td data-numeric>55</td><td>שחור-מסגרת</td><td data-numeric>2,890</td><td data-numeric>2</td><td>זמין</td></tr>
        <tr><td data-numeric>0100027</td><td>Marc Jacobs</td><td>MJ-1010</td><td data-numeric>54</td><td>חום-בהיר</td><td data-numeric>890</td><td data-numeric>4</td><td>זמין</td></tr>
        <tr><td data-numeric>0100028</td><td>Coach</td><td>HC-6177</td><td data-numeric>56</td><td>שחור-זהב</td><td data-numeric>1,290</td><td data-numeric>3</td><td>זמין</td></tr>
      </tbody>
    </table>
  </div>
</div>
`;

const MOCK_STOREFRONT_STUDIO = `
<div class="card" data-mock="design-direction-3">
  <h3>🎨 בלוקים פעילים בעמוד הבית (mock — Direction 3)</h3>
  <ul>
    <li><span data-numeric>1</span> · Hero — "קמפיין סופרסייל 2026"</li>
    <li><span data-numeric>2</span> · Brand carousel — Ray-Ban / Persol / Oakley / Prada / Gucci / Tom Ford / Chanel</li>
    <li><span data-numeric>3</span> · Category grid — שמש · קריאה · רב-מוקדיות · ילדים · מותגי בוטיק</li>
    <li><span data-numeric>4</span> · Promo strip — "משלוח חינם מעל ₪400"</li>
    <li><span data-numeric>5</span> · Testimonials — 3 ציטוטים של לקוחות</li>
    <li><span data-numeric>6</span> · Featured collection — "חדש על המדפים"</li>
    <li><span data-numeric>7</span> · Footer — קישורים · יצירת קשר · מדיניות</li>
  </ul>
</div>
`;

const MOCK_CRM = `
<div class="card" data-mock="design-direction-3">
  <h3>👥 לידים פעילים (mock — Direction 3)</h3>
  <div class="table-wrap">
    <table>
      <thead><tr><th>שם</th><th>טלפון</th><th>מקור</th><th>שלב</th><th>תאריך</th></tr></thead>
      <tbody>
        <tr><td>דני כהן</td><td data-numeric>050-1234567</td><td>פייסבוק</td><td>חם</td><td data-numeric>2026-05-09</td></tr>
        <tr><td>מיכל לוי</td><td data-numeric>052-7654321</td><td>אינסטגרם</td><td>חם</td><td data-numeric>2026-05-09</td></tr>
        <tr><td>אורי שמש</td><td data-numeric>054-9988776</td><td>הפניה</td><td>פעיל</td><td data-numeric>2026-05-08</td></tr>
        <tr><td>שירה אדרי</td><td data-numeric>053-3344556</td><td>WhatsApp</td><td>קר</td><td data-numeric>2026-05-07</td></tr>
        <tr><td>יוסי בן-דוד</td><td data-numeric>050-7788990</td><td>אתר</td><td>חם</td><td data-numeric>2026-05-06</td></tr>
        <tr><td>טליה שטרן</td><td data-numeric>052-1122334</td><td>פייסבוק</td><td>פעיל</td><td data-numeric>2026-05-05</td></tr>
        <tr><td>אביב מזרחי</td><td data-numeric>054-5566778</td><td>הפניה</td><td>פעיל</td><td data-numeric>2026-05-05</td></tr>
        <tr><td>נועה פרנקל</td><td data-numeric>053-2233445</td><td>WhatsApp</td><td>סגירה</td><td data-numeric>2026-05-04</td></tr>
        <tr><td>אלון כספי</td><td data-numeric>050-9988123</td><td>פייסבוק</td><td>חם</td><td data-numeric>2026-05-04</td></tr>
        <tr><td>רוני אזולאי</td><td data-numeric>052-4567890</td><td>אינסטגרם</td><td>פעיל</td><td data-numeric>2026-05-03</td></tr>
        <tr><td>הילה ברק</td><td data-numeric>054-1230987</td><td>אתר</td><td>קר</td><td data-numeric>2026-05-03</td></tr>
        <tr><td>גיא חמו</td><td data-numeric>053-8765432</td><td>הפניה</td><td>סגירה</td><td data-numeric>2026-05-02</td></tr>
        <tr><td>שני הרוש</td><td data-numeric>050-2345678</td><td>WhatsApp</td><td>חם</td><td data-numeric>2026-05-02</td></tr>
        <tr><td>עומר דהן</td><td data-numeric>052-3456789</td><td>פייסבוק</td><td>פעיל</td><td data-numeric>2026-05-01</td></tr>
      </tbody>
    </table>
  </div>
</div>
`;

const targets = [
  ['M1-inventory.html',        'inventory.html',                                                                                      'production', MOCK_INVENTORY],
  ['M3-storefront-studio.html','storefront-studio.html',                                                                              'production', MOCK_STOREFRONT_STUDIO],
  ['M4-crm.html',              'crm.html',                                                                                            'production', MOCK_CRM],
  ['M5-customers.html',        'modules/Module 5 - Customers/architecture-brief/M5_CUSTOMERS_LIST_MOCKUPS.html',                       'mockup',     null],
  ['M6-prescriptions.html',    'modules/Module 6 - Prescriptions/architecture-brief/M6_PRESCRIPTION_EDITOR_MOCKUP.html',               'mockup',     null],
  ['M7-orders.html',           'modules/Module 7 - Orders/architecture-brief/M7_ORDERS_FULL_MOCKUP_V6.html',                          'mockup',     null],
  ['M8-payments.html',         'modules/Module 8 - Payments/architecture-brief/M8_CHECKOUT_MOCKUP_V3.html',                            'mockup',     null],
  ['M9-lab-kds.html',          'modules/Module 9 - Lab/architecture-brief/M9_DASHBOARD_SKETCHES.html',                                'mockup',     null],
  ['M11-reports.html',         'modules/Module 11 - Reports/architecture-brief/M11_REPORTS_LIST_MOCKUP.html',                          'mockup',     null],
  ['M12-communications.html',  'modules/Module 12 - Communications/architecture-brief/M12_WHATSAPP_INBOX_MOCKUP.html',                 'mockup',     null],
  ['M13-loyalty.html',         'modules/Module 13 - Loyalty Club/architecture-brief/M13_SKETCHES.html',                                'mockup',     null],
  ['M14-appointments.html',    'modules/Module 14 - Appointments/architecture-brief/M14_APPOINTMENTS_MOCKUP.html',                     'mockup',     null],
  ['M15-queue.html',           'modules/Module 15 - Queue/architecture-brief/M15_QUEUE_MOCKUP.html',                                   'mockup',     null],
];

const only = process.argv.slice(2);
let count = 0;
for (const [destName, srcPath, kind, mock] of targets) {
  if (only.length && !only.includes(destName)) continue;
  const out = transform(srcPath, kind, mock);
  const outPath = path.join(DEST, destName);
  fs.writeFileSync(outPath, out, 'utf8');
  count++;
  console.log(`✓ ${destName} (${out.split('\n').length} lines, kind=${kind})`);
}
console.log(`\n${count} files written.`);
