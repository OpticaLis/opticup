#!/usr/bin/env node
// One-off transform for M1_5_DESIGN_SYSTEM_MOCKUPS_3A_CONSERVATIVE SPEC.
// Reads each source HTML, applies staticization rules, writes to direction-1-conservative/.
// Delete this file after SPEC closes (see retro Findings).
import fs from 'node:fs';
import path from 'node:path';

const DEST = 'modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/direction-1-conservative';
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

// kind: 'production' (M1/M3/M4) — strip all scripts, all page CSS, all external fonts
//       'mockup' (M5-M15) — keep <style> blocks, strip <script>, add CSS chain at end of head
function transform(src, kind, mockBlock) {
  let s = fs.readFileSync(src, 'utf8');

  // 1) Strip every <script>...</script> block (with src or inline).
  s = s.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  // 2) Strip self-closed <script ... />.
  s = s.replace(/<script\b[^>]*\/>/gi, '');
  // 3) Strip Google Fonts links (Heebo loaded externally — handled by variables.css default).
  s = s.replace(/<link[^>]*fonts\.googleapis\.com[^>]*>\s*/gi, '');
  s = s.replace(/<link[^>]*fonts\.gstatic\.com[^>]*>\s*/gi, '');

  if (kind === 'production') {
    // 4a) Strip page-level CSS links (css/foo.css). Production-only — mockups don't have these.
    s = s.replace(/<link[^>]*href="css\/[^"]+"[^>]*>\s*/gi, '');
    // 4b) Strip existing shared/css links (we re-emit a canonical chain via CSS_CHAIN).
    s = s.replace(/<link[^>]*href="shared\/css\/[^"]+"[^>]*>\s*/gi, '');
  }

  // 5) Strip hex colors from inline style="" attributes only.
  //    Replace any "#abc" / "#abcdef" / "#abcdef12" appearing inside style="..." with `transparent`.
  s = s.replace(/(style="[^"]*?)#[0-9a-fA-F]{3,8}\b/g, '$1transparent');
  // Re-run to catch a second hex in the same attribute.
  s = s.replace(/(style="[^"]*?)#[0-9a-fA-F]{3,8}\b/g, '$1transparent');
  s = s.replace(/(style="[^"]*?)#[0-9a-fA-F]{3,8}\b/g, '$1transparent');
  s = s.replace(/(style="[^"]*?)#[0-9a-fA-F]{3,8}\b/g, '$1transparent');

  // 6) Add the direction stylesheet chain right before </head>.
  if (s.includes('</head>')) {
    s = s.replace('</head>', `\n${cssLinks}\n</head>`);
  } else {
    // Shouldn't happen, but fail loud rather than silent.
    throw new Error(`No </head> in ${src}`);
  }

  // 7) Inject mock block into first <main> (production only — mockups already have content).
  if (kind === 'production' && mockBlock) {
    s = s.replace(/<main(\b[^>]*)?>/i, (m) => `${m}\n${mockBlock}\n`);
  }

  // 8) Collapse 3+ blank lines.
  s = s.replace(/\n{3,}/g, '\n\n');

  return s;
}

// Mock inventory rows — gives criterion #22 visual density a target (~14 rows).
const MOCK_INVENTORY = `
<div class="card" data-mock="design-direction-1">
  <h3>📦 מלאי לדוגמה (mock — Direction 1)</h3>
  <div class="table-wrap">
    <table>
      <thead><tr><th>ברקוד</th><th>מותג</th><th>דגם</th><th>גודל</th><th>צבע</th><th>מחיר</th><th>כמות</th><th>סטטוס</th></tr></thead>
      <tbody>
        <tr><td>0100001</td><td>Ray-Ban</td><td>RB-2140</td><td>54</td><td>שחור</td><td>1,290</td><td>3</td><td>זמין</td></tr>
        <tr><td>0100002</td><td>Persol</td><td>PO-3019</td><td>52</td><td>חום-טורטז</td><td>1,490</td><td>2</td><td>זמין</td></tr>
        <tr><td>0100003</td><td>Oakley</td><td>OO-9272</td><td>57</td><td>שחור-מט</td><td>980</td><td>5</td><td>זמין</td></tr>
        <tr><td>0100004</td><td>Prada</td><td>PR-17ZV</td><td>54</td><td>זהב</td><td>2,150</td><td>1</td><td>נמוך</td></tr>
        <tr><td>0100005</td><td>Gucci</td><td>GG-0061</td><td>56</td><td>כסף</td><td>1,790</td><td>4</td><td>זמין</td></tr>
        <tr><td>0100006</td><td>Tom Ford</td><td>TF-5040</td><td>54</td><td>חום-בהיר</td><td>2,490</td><td>2</td><td>זמין</td></tr>
        <tr><td>0100007</td><td>Carrera</td><td>CA-1019</td><td>58</td><td>שחור-מט</td><td>650</td><td>6</td><td>זמין</td></tr>
        <tr><td>0100008</td><td>Tag Heuer</td><td>TH-7711</td><td>56</td><td>אפור-טיטניום</td><td>3,290</td><td>1</td><td>נמוך</td></tr>
        <tr><td>0100009</td><td>Hugo Boss</td><td>BO-1083</td><td>55</td><td>כחול-כהה</td><td>1,150</td><td>3</td><td>זמין</td></tr>
        <tr><td>0100010</td><td>Polaroid</td><td>PLD-4061</td><td>53</td><td>חום</td><td>490</td><td>8</td><td>זמין</td></tr>
        <tr><td>0100011</td><td>Lacoste</td><td>L-2870</td><td>54</td><td>ירוק-בקבוק</td><td>790</td><td>4</td><td>זמין</td></tr>
        <tr><td>0100012</td><td>Versace</td><td>VE-3306</td><td>55</td><td>זהב-ורוד</td><td>2,290</td><td>2</td><td>זמין</td></tr>
        <tr><td>0100013</td><td>Dior</td><td>DI-5078</td><td>54</td><td>שחור-שקוף</td><td>2,490</td><td>1</td><td>נמוך</td></tr>
        <tr><td>0100014</td><td>Armani</td><td>EA-4047</td><td>56</td><td>שחור-מט</td><td>1,090</td><td>5</td><td>זמין</td></tr>
      </tbody>
    </table>
  </div>
</div>
`;

const MOCK_STOREFRONT_STUDIO = `
<div class="card" data-mock="design-direction-1">
  <h3>🎨 בלוקים פעילים בעמוד הבית (mock)</h3>
  <ul>
    <li>1 · Hero — "קמפיין סופרסייל 2026"</li>
    <li>2 · Brand carousel — Ray-Ban / Persol / Oakley / Prada / Gucci</li>
    <li>3 · Category grid — שמש · קריאה · רב-מוקדיות · ילדים</li>
    <li>4 · Promo strip — "משלוח חינם מעל ₪400"</li>
    <li>5 · Testimonials — 3 ציטוטים של לקוחות</li>
  </ul>
</div>
`;

const MOCK_CRM = `
<div class="card" data-mock="design-direction-1">
  <h3>👥 לידים פעילים (mock)</h3>
  <div class="table-wrap">
    <table>
      <thead><tr><th>שם</th><th>טלפון</th><th>מקור</th><th>שלב</th><th>תאריך</th></tr></thead>
      <tbody>
        <tr><td>דני כהן</td><td>050-1234567</td><td>פייסבוק</td><td>חם</td><td>2026-05-09</td></tr>
        <tr><td>מיכל לוי</td><td>052-7654321</td><td>אינסטגרם</td><td>חם</td><td>2026-05-09</td></tr>
        <tr><td>אורי שמש</td><td>054-9988776</td><td>הפניה</td><td>פעיל</td><td>2026-05-08</td></tr>
        <tr><td>שירה אדרי</td><td>053-3344556</td><td>WhatsApp</td><td>קר</td><td>2026-05-07</td></tr>
        <tr><td>יוסי בן-דוד</td><td>050-7788990</td><td>אתר</td><td>חם</td><td>2026-05-06</td></tr>
        <tr><td>טליה שטרן</td><td>052-1122334</td><td>פייסבוק</td><td>פעיל</td><td>2026-05-05</td></tr>
        <tr><td>אביב מזרחי</td><td>054-5566778</td><td>הפניה</td><td>פעיל</td><td>2026-05-05</td></tr>
        <tr><td>נועה פרנקל</td><td>053-2233445</td><td>WhatsApp</td><td>סגירה</td><td>2026-05-04</td></tr>
      </tbody>
    </table>
  </div>
</div>
`;

const targets = [
  // [destFile, srcFile, kind, mockBlock]
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
