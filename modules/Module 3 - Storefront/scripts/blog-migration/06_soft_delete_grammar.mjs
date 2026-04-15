/**
 * 06_soft_delete_grammar.mjs
 * ──────────────────────────
 * Soft-deletes the en + ru variants of the grammar article
 * "משקפיים זה בלשון זכר או נקבה? 🤔" (Criterion 7).
 *
 * IDs from SPEC §3 Criterion 7:
 *   en: c3b13a1c-c29f-4616-adc7-c1753271fb3b
 *   ru: 0640cf3d-8b43-4458-a1a0-213eacb093dc
 *   he: 66e93a9f-0c4b-4c97-9acd-3e66abfb8dee  ← NOT touched
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY in env.
 * Run: SUPABASE_SERVICE_ROLE_KEY=<key> node 06_soft_delete_grammar.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL
  || 'https://tsxrrxzmdxaenlvocyit.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PRIZMA_UUID = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';

const GRAMMAR_EN_ID = 'c3b13a1c-c29f-4616-adc7-c1753271fb3b';
const GRAMMAR_RU_ID = '0640cf3d-8b43-4458-a1a0-213eacb093dc';
const GRAMMAR_HE_ID = '66e93a9f-0c4b-4c97-9acd-3e66abfb8dee'; // must remain active

if (!SERVICE_KEY) { console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY required.'); process.exit(1); }

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

// Verify current state before touching
const { data: before } = await sb
  .from('blog_posts')
  .select('id, lang, slug, is_deleted')
  .in('id', [GRAMMAR_EN_ID, GRAMMAR_RU_ID, GRAMMAR_HE_ID]);

console.log('Before:');
before?.forEach(r => console.log(`  ${r.lang} ${r.id} is_deleted=${r.is_deleted}`));

const heRow = before?.find(r => r.id === GRAMMAR_HE_ID);
if (!heRow) { console.error('ERROR: Hebrew grammar article not found.'); process.exit(1); }
if (heRow.is_deleted) { console.error('ERROR: Hebrew article is already deleted — unexpected state.'); process.exit(1); }

// Soft-delete en + ru only
const { error: deleteErr } = await sb
  .from('blog_posts')
  .update({ is_deleted: true, updated_at: new Date().toISOString() })
  .in('id', [GRAMMAR_EN_ID, GRAMMAR_RU_ID])
  .eq('tenant_id', PRIZMA_UUID);

if (deleteErr) { console.error('FAILED:', deleteErr.message); process.exit(1); }

// Verify
const { data: after } = await sb
  .from('blog_posts')
  .select('id, lang, is_deleted')
  .in('id', [GRAMMAR_EN_ID, GRAMMAR_RU_ID, GRAMMAR_HE_ID]);

console.log('\nAfter:');
after?.forEach(r => console.log(`  ${r.lang} ${r.id} is_deleted=${r.is_deleted}`));

const enRow = after?.find(r => r.id === GRAMMAR_EN_ID);
const ruRow = after?.find(r => r.id === GRAMMAR_RU_ID);
const heAfter = after?.find(r => r.id === GRAMMAR_HE_ID);

if (!enRow?.is_deleted || !ruRow?.is_deleted) {
  console.error('ERROR: Soft-delete did not apply!'); process.exit(1);
}
if (heAfter?.is_deleted) {
  console.error('ERROR: Hebrew article was accidentally deleted!'); process.exit(1);
}

console.log('\n✓ Grammar article en+ru soft-deleted. Hebrew article untouched.');
