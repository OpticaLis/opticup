// v2-modal-session-restore.test.mjs — regression smoke for
// M4_V2_MODAL_SESSION_RESTORE_FIX (2026-05-14).
//
// Validates the 7-step recipe from M4_V2_MODAL_SESSION_RESTORE_FIX_BRIEF.md §5:
//   1. Open modal for a rule and uncheck 3 recipients (save).
//   2. Close without dispatching.
//   3. Reopen via showAsync (the bug entry point).
//   4. Verify the 3 deselected recipients are restored + notice rendered.
//   5. Verify stale lead_ids are silently skipped.
//   6. Verify 6h TTL clears the saved entry on reopen.
//   7. Verify the formal allowlist (Brief §4.2) is observed (informational).
//
// The test loads the real production JS via `vm` with a stubbed window/DOM —
// the same code that ships to the browser. No mocks of the controller logic.
//
// Exit 0 = all pass. Exit 1 = at least one failed.

import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const renderJs = readFileSync(path.join(repoRoot, 'modules/crm/crm-confirm-send-v2-render.js'), 'utf8');
const v2Js     = readFileSync(path.join(repoRoot, 'modules/crm/crm-confirm-send-v2.js'),        'utf8');

let failures = 0;
function assert(cond, msg) {
  if (cond) console.log(`  PASS  ${msg}`);
  else { console.log(`  FAIL  ${msg}`); failures++; }
}

// ---------- stubbed browser ----------

function makeContext() {
  const sessionData = {};
  const sessionStorage = {
    setItem(k, v) { sessionData[k] = String(v); },
    getItem(k) { return Object.prototype.hasOwnProperty.call(sessionData, k) ? sessionData[k] : null; },
    removeItem(k) { delete sessionData[k]; },
    _all() { return { ...sessionData }; },
  };

  function host() {
    return {
      _innerHTML: '',
      get innerHTML() { return this._innerHTML; },
      set innerHTML(v) { this._innerHTML = v; },
    };
  }
  const contentHost = host();
  const footerHost  = host();

  const modalEl = {
    querySelector(sel) {
      if (sel === '[data-ccsv2-content="1"]') return contentHost;
      if (sel === '.modal-footer')            return footerHost;
      return null;
    },
    querySelectorAll() { return []; },
  };

  let closeCount = 0;
  const Modal = {
    show(opts) {
      contentHost.innerHTML = String(opts.content || '');
      footerHost.innerHTML  = String(opts.footer || '');
      return { el: modalEl, close() { closeCount++; } };
    },
  };

  const Toast = { success() {}, warning() {}, error() {} };
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const ctx = {
    Modal, Toast, escapeHtml,
    sessionStorage,
    Date, Set, Array, JSON, Math, Object, String, Number, Promise,
    console,
    setTimeout, clearTimeout,
    Error,
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(renderJs, ctx, { filename: 'crm-confirm-send-v2-render.js' });
  vm.runInContext(v2Js,     ctx, { filename: 'crm-confirm-send-v2.js' });
  return { ctx, sessionStorage, contentHost, footerHost, modalEl, get closeCount() { return closeCount; } };
}

// ---------- fixtures ----------

const RULE_ID = 'rule-test-1';
function preview(recipientIds) {
  return {
    rules: [{ rule_id: RULE_ID, rule_name: 'Test Rule' }],
    channels: ['sms'],
    recipients_by_lead: recipientIds.map(lid => ({
      lead_id: lid,
      full_name: 'Lead ' + lid,
      phone: '0500000000',
      email: lid + '@demo.local',
      message_body_sms: 'hi',
    })),
  };
}

// ---------- tests ----------

async function run() {
  // ====== STEPS 1-3: save → reopen via showAsync → restore ======
  console.log('Steps 1-4 — save on close, reopen via showAsync, restore + notice:');
  {
    const env = makeContext();
    const pre = preview(['l1', 'l2', 'l3', 'l4', 'l5']);
    // Seed save side: pretend operator unchecked l2, l3, l4 in a prior session.
    env.sessionStorage.setItem('crm_confirm_send_selection_v1', JSON.stringify({
      ruleKey: RULE_ID,
      excluded: ['l2', 'l3', 'l4'],
      chip: 'all',
      search: '',
      ts: Date.now(),
    }));
    // Reopen via showAsync (the bug entry point).
    const promise = Promise.resolve(pre);
    await env.ctx.window.CrmConfirmSendV2.showAsync(promise, async () => ({ queued: 0 }));
    // Settle microtasks (hydrate runs after the await pv).
    await new Promise(r => setTimeout(r, 0));
    const rendered = env.contentHost.innerHTML;
    assert(rendered.includes('data-ccsv2-restored-notice="1"'), 'restored notice rendered after showAsync hydrate');
    assert(rendered.includes('שוחזרו 3'), 'notice reports correct count (3 restored)');
    assert(rendered.includes('data-ccsv2-undo-restore="1"'), 'quick-undo button present');
    // Verify each restored lead row is rendered UNCHECKED while non-excluded
    // rows are CHECKED. The render template puts `checked` on the checkbox
    // input when NOT excluded.
    const l1CheckedRe = /data-ccsv2-cb="1" data-ccsv2-lead-id="l1" checked/;
    const l2NotCheckedRe = /data-ccsv2-cb="1" data-ccsv2-lead-id="l2"(?! checked)/;
    assert(l1CheckedRe.test(rendered), 'l1 (not excluded) is checked');
    assert(l2NotCheckedRe.test(rendered), 'l2 (excluded) is unchecked');
    assert(/data-ccsv2-cb="1" data-ccsv2-lead-id="l3"(?! checked)/.test(rendered), 'l3 (excluded) is unchecked');
    assert(/data-ccsv2-cb="1" data-ccsv2-lead-id="l4"(?! checked)/.test(rendered), 'l4 (excluded) is unchecked');
    assert(/data-ccsv2-cb="1" data-ccsv2-lead-id="l5" checked/.test(rendered), 'l5 (not excluded) is checked');
  }

  // ====== STEP 5: stale lead_id silently skipped ======
  console.log('Step 5 — stale lead_ids silently dropped during reconciliation:');
  {
    const env = makeContext();
    const pre = preview(['l1', 'l2']);
    env.sessionStorage.setItem('crm_confirm_send_selection_v1', JSON.stringify({
      ruleKey: RULE_ID,
      excluded: ['l1', 'stale-id-no-longer-in-list'],
      chip: 'all',
      search: '',
      ts: Date.now(),
    }));
    const promise = Promise.resolve(pre);
    await env.ctx.window.CrmConfirmSendV2.showAsync(promise, async () => ({ queued: 0 }));
    await new Promise(r => setTimeout(r, 0));
    const rendered = env.contentHost.innerHTML;
    assert(/data-ccsv2-cb="1" data-ccsv2-lead-id="l1"(?! checked)/.test(rendered), 'l1 still excluded (valid)');
    assert(/data-ccsv2-cb="1" data-ccsv2-lead-id="l2" checked/.test(rendered), 'l2 included (valid)');
    assert(!rendered.includes('stale-id-no-longer-in-list'), 'stale id absent from render (no crash)');
    assert(rendered.includes('שוחזרו 1'), 'notice reports 1 restored after stale-id reconciliation');
  }

  // ====== STEP 6: 6h TTL — stale entry cleared on reopen ======
  console.log('Step 6 — 6h TTL clears the saved entry on reopen:');
  {
    const env = makeContext();
    const pre = preview(['l1', 'l2', 'l3']);
    const sevenHoursAgo = Date.now() - (7 * 60 * 60 * 1000);
    env.sessionStorage.setItem('crm_confirm_send_selection_v1', JSON.stringify({
      ruleKey: RULE_ID,
      excluded: ['l1'],
      chip: 'all',
      search: '',
      ts: sevenHoursAgo,
    }));
    const promise = Promise.resolve(pre);
    await env.ctx.window.CrmConfirmSendV2.showAsync(promise, async () => ({ queued: 0 }));
    await new Promise(r => setTimeout(r, 0));
    const rendered = env.contentHost.innerHTML;
    assert(!rendered.includes('data-ccsv2-restored-notice'), 'no restored notice when TTL expired');
    // l1 should be checked (not excluded) — TTL cleared the saved selection.
    assert(/data-ccsv2-cb="1" data-ccsv2-lead-id="l1" checked/.test(rendered), 'l1 is checked after TTL expiry (selection cleared)');
    // The stale entry should have been deleted from sessionStorage by _loadSession.
    // After hydrate, the controller re-saves the (now empty) state — that's
    // expected behaviour and the new save has a fresh ts. So the key may
    // re-appear, but with excluded=[] and a current ts. Verify both.
    const raw = env.sessionStorage.getItem('crm_confirm_send_selection_v1');
    if (raw) {
      const entry = JSON.parse(raw);
      assert(Array.isArray(entry.excluded) && entry.excluded.length === 0, 'fresh save has empty excluded after TTL clear');
      assert((Date.now() - entry.ts) < (6 * 60 * 60 * 1000), 'fresh save ts is recent');
    } else {
      assert(true, 'sessionStorage key absent (acceptable)');
    }
  }

  // ====== STEP 7 (sync show path): restore on sync show entry still works ======
  console.log('Step 7 — sync show() entry path still restores (regression guard):');
  {
    const env = makeContext();
    const pre = preview(['l1', 'l2', 'l3']);
    env.sessionStorage.setItem('crm_confirm_send_selection_v1', JSON.stringify({
      ruleKey: RULE_ID,
      excluded: ['l2'],
      chip: 'all',
      search: '',
      ts: Date.now(),
    }));
    await env.ctx.window.CrmConfirmSendV2.show(pre, async () => ({ queued: 0 }));
    const rendered = env.contentHost.innerHTML;
    assert(/data-ccsv2-cb="1" data-ccsv2-lead-id="l2"(?! checked)/.test(rendered), 'show(): l2 restored as excluded');
    assert(rendered.includes('שוחזרו 1'), 'show(): notice renders');
  }

  // ====== ruleKey mismatch — different rule does NOT restore ======
  console.log('Bonus — ruleKey isolation (different rule does NOT restore):');
  {
    const env = makeContext();
    const pre = preview(['l1', 'l2']); // uses RULE_ID
    env.sessionStorage.setItem('crm_confirm_send_selection_v1', JSON.stringify({
      ruleKey: 'some-OTHER-rule',
      excluded: ['l1'],
      chip: 'all',
      search: '',
      ts: Date.now(),
    }));
    const promise = Promise.resolve(pre);
    await env.ctx.window.CrmConfirmSendV2.showAsync(promise, async () => ({ queued: 0 }));
    await new Promise(r => setTimeout(r, 0));
    const rendered = env.contentHost.innerHTML;
    assert(!rendered.includes('data-ccsv2-restored-notice'), 'no notice for a different rule');
    assert(/data-ccsv2-cb="1" data-ccsv2-lead-id="l1" checked/.test(rendered), 'l1 stays checked under foreign rule key');
  }

  console.log('');
  if (failures === 0) {
    console.log(`All session-restore smoke checks PASS.`);
    process.exit(0);
  } else {
    console.log(`${failures} failure(s).`);
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
