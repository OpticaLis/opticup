#!/usr/bin/env node
// One-shot SQL applier via the migration-sql-runner edge function.
// Reads each *.sql file in --dir (sorted), POSTs to the function with
// the service role JWT in Authorization. Stops on first error.
//
// Usage:
//   node apply-via-edge.mjs --dir campaigns/supersale/scripts/_sql --start 02_leads_03

import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
let dir = null;
let start = null;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--dir' && argv[i + 1]) dir = argv[i + 1];
  if (argv[i] === '--start' && argv[i + 1]) start = argv[i + 1];
}
if (!dir) {
  console.error('--dir required');
  process.exit(1);
}

// Load credentials
const home = process.env.HOME || process.env.USERPROFILE;
const credPath = path.join(home, '.optic-up', 'credentials.env');
const env = {};
for (const line of fs.readFileSync(credPath, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.+)$/);
  if (m) env[m[1]] = m[2];
}
const projectUrl = env.PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!projectUrl || !serviceKey) {
  console.error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const fnUrl = `${projectUrl}/functions/v1/migration-sql-runner`;

const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort();
const startIdx = start ? files.findIndex((f) => f.startsWith(start)) : 0;
if (start && startIdx < 0) {
  console.error(`File starting with "${start}" not found in ${dir}`);
  process.exit(1);
}

const startTime = Date.now();
for (let i = startIdx; i < files.length; i++) {
  const file = files[i];
  const sql = fs.readFileSync(path.join(dir, file), 'utf8');
  const t0 = Date.now();
  const res = await fetch(fnUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'text/plain',
      apikey: serviceKey,
    },
    body: sql,
  });
  const dt = Date.now() - t0;
  const body = await res.text();
  if (!res.ok) {
    console.error(`✗ ${file} (${dt}ms): ${res.status} ${body}`);
    process.exit(2);
  }
  console.log(`✓ ${file} (${dt}ms): ${body}`);
}
console.log(`\nDone. Total ${(Date.now() - startTime) / 1000}s, ${files.length - startIdx} files.`);
