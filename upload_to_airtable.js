const fs = require('fs');
const path = require('path');

const TOKEN = 'pat1pURpXGsIMgCMm.0e6dda3c0a5f473e0291f52a13127616c77c9a320d30560b6f665c15628394b1';
const BASE = 'app8V8ehCNikznEBA';
const TABLE = 'tbl9LaxJOzI1ozgQm';
const API = 'https://api.airtable.com/v0';
const BATCH_SIZE = 10;
const DELAY_MS = 220;

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'test_data.json'), 'utf8'));
const items = data.inventory;

console.log(`Total items to upload: ${items.length}`);

const FIELDS_TO_SEND = [
  'ברקוד', 'ספק', 'חברה / מותג', 'דגם', 'גודל', 'צבע',
  'סוג מוצר', 'מחיר מכירה', 'הנחה מכירה %', 'כמות',
  'סנכרון אתר', 'סטטוס'
];

// Map supplier names to match existing Airtable options
const SUPPLIER_MAP = {
  'SHARON': 'Sharon',
  'SITON': 'Siton',
  'Sol optic': 'Sol Optic',
  'סי די אופטיק': 'סי די אופטיקה'
};

// Map status values
const STATUS_MAP = {
  'פעיל': 'במלאי'
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function uploadBatch(batch, batchNum, total) {
  const records = batch.map(item => {
    const fields = {};
    for (const key of FIELDS_TO_SEND) {
      let val = item.fields[key];
      if (val === undefined || val === '') continue;
      if (key === 'ספק' && SUPPLIER_MAP[val]) val = SUPPLIER_MAP[val];
      if (key === 'סטטוס' && STATUS_MAP[val]) val = STATUS_MAP[val];
      fields[key] = val;
    }
    return { fields };
  });

  const res = await fetch(`${API}/${BASE}/${TABLE}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ records, typecast: true })
  });

  const body = await res.json();
  if (!res.ok) {
    console.error(`Batch ${batchNum} FAILED:`, JSON.stringify(body, null, 2));
    throw new Error(`Batch ${batchNum} failed: ${body.error?.message || res.status}`);
  }
  console.log(`Batch ${batchNum}/${total} — ${body.records.length} records created`);
  return body.records.length;
}

async function main() {
  const totalBatches = Math.ceil(items.length / BATCH_SIZE);
  let created = 0;

  console.log(`Uploading ${items.length} items in ${totalBatches} batches of ${BATCH_SIZE}...`);
  console.log('---');

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const count = await uploadBatch(batch, batchNum, totalBatches);
    created += count;

    if (i + BATCH_SIZE < items.length) {
      await sleep(DELAY_MS);
    }
  }

  console.log('---');
  console.log(`Done! ${created} records created in Airtable.`);
}

main().catch(e => {
  console.error('Upload failed:', e.message);
  process.exit(1);
});
