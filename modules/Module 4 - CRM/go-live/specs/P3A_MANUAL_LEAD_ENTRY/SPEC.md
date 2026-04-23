# SPEC — P3A_MANUAL_LEAD_ENTRY

> **Location:** `modules/Module 4 - CRM/go-live/specs/P3A_MANUAL_LEAD_ENTRY/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-22
> **Module:** 4 — CRM
> **Phase:** P3a (Go-Live)
> **Execution environment:** Claude Code local (Windows desktop)

---

## 1. Goal

Add manual lead entry to the CRM so a user can create a lead directly from
the UI (bypassing the external form), enforce that manually-entered leads
cannot be transferred to Tier 2 until they approve the terms, and fix the
pre-existing `Toast.show()` compat debt across 7 CRM files.

---

## 2. Background & Motivation

Currently there is no way to add a lead from within the CRM. Every lead
enters via the `lead-intake` Edge Function (P1) — which means through an
external form only. Daniel needs to enter leads manually (phone calls,
walk-ins, referrals).

A lead entered manually did NOT fill out a form and did NOT approve the
terms/privacy policy. Per Daniel's decision (2026-04-22): such leads must
receive a "didn't approve terms" status and CANNOT be transferred to Tier 2
until they approve. The approval mechanism (sending a terms link via
WhatsApp/SMS) will come in P3b (Make dispatcher) — but the gate must be
built now.

**Toast.show compat shim:** 7 CRM files call `Toast.show()` which doesn't
exist in `shared/js/toast.js`. P2a FOREMAN_REVIEW recommended a 1-line fix:
`Toast.show = Toast.info` in `toast.js`. This is a shared utility fix, not
a module file — include in this SPEC as a quick Commit 0.

**Depends on:** P2a (lead actions pattern), P2b (done).
**Feeds into:** P3b (Make message dispatcher — will send terms approval link).

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean | `git status` → "nothing to commit" |
| 2 | `pending_terms` status exists for demo | 1 row in `crm_statuses` | `SELECT slug FROM crm_statuses WHERE tenant_id = '8d8cfa7e-...' AND slug = 'pending_terms'` → 1 row |
| 3 | `pending_terms` status exists for Prizma | 1 row in `crm_statuses` | `SELECT slug FROM crm_statuses WHERE tenant_id = '6ad0781b-...' AND slug = 'pending_terms'` → 1 row |
| 4 | "הוסף ליד +" button visible | Button in incoming-tab header area | Browser: button visible above the leads table |
| 5 | Manual lead form works | Create test lead "P3a Test Lead" on demo | DB: `SELECT full_name, status, terms_approved, source FROM crm_leads WHERE tenant_id = '8d8cfa7e-...' AND full_name = 'P3a Test Lead'` → status=`pending_terms`, terms_approved=`false`, source=`manual` |
| 6 | Lead appears in incoming tab | After creation, lead shows in Tier 1 list | Browser: incoming tab shows "P3a Test Lead" row |
| 7 | Transfer blocked for `pending_terms` | Click "אשר" on a lead with `terms_approved=false` | Toast.error with message explaining terms must be approved first. DB: status unchanged. |
| 8 | Transfer works after terms approved | Manually set `terms_approved=true` on test lead, then click "אשר" | Lead moves to Tier 2, status = `waiting` |
| 9 | `TIER1_STATUSES` includes `pending_terms` | Array updated in `crm-helpers.js` | `grep pending_terms crm-helpers.js` → found in TIER1_STATUSES array |
| 10 | `Toast.show` compat shim added | `Toast.show = Toast.info` in `toast.js` | `grep 'Toast.show' shared/js/toast.js` → shim line found |
| 11 | All `Toast.show` calls still work | No console errors on messaging hub interactions | Browser: open messaging tab, no JS errors |
| 12 | All writes include `tenant_id` (Rule 22) | Every INSERT includes `tenant_id: getTenantId()` | `grep -n "tenant_id" {modified_files}` |
| 13 | File sizes ≤ 350 lines (Rule 12) | All modified/new JS files | `wc -l` → all ≤ 350 |
| 14 | Docs updated | SESSION_CONTEXT, CHANGELOG, MODULE_MAP | File inspection |
| 15 | Test data cleaned up | Test lead removed | DB: `SELECT COUNT(*) FROM crm_leads WHERE full_name = 'P3a Test Lead' AND tenant_id = '8d8cfa7e-...'` → 0 |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read any file in the repo
- Modify `modules/crm/crm-lead-actions.js` — add `createManualLead` function + modify `transferLeadToTier2` to check `terms_approved`
- Modify `modules/crm/crm-incoming-tab.js` — add "הוסף ליד +" button + wire to form modal
- Modify `modules/crm/crm-helpers.js` — add `pending_terms` to `TIER1_STATUSES` array
- Modify `shared/js/toast.js` — add 1-line compat shim `Toast.show = Toast.info`
- INSERT `pending_terms` status into `crm_statuses` for both demo AND Prizma tenants (Level 2 — approved)
- INSERT test leads on demo tenant (Level 2 — approved)
- DELETE test leads on demo after testing (Level 2 — approved)
- Commit and push to `develop`
- Update MODULE_MAP, SESSION_CONTEXT, CHANGELOG
- Use `Toast.success/error/info/warning` (NOT `.show` — except for the compat shim itself)

### What REQUIRES stopping and reporting

- Any schema change (DDL) — new columns, tables, etc.
- Any modification to `js/shared.js`
- Any modification to existing RPCs
- Any write to Prizma tenant data (the `crm_statuses` INSERT for Prizma is pre-approved above — but any OTHER Prizma write requires stopping)
- Any merge to `main`
- Any step where actual output diverges from §3 expected values
- Any new file exceeding 350 lines
- If the form modal pattern doesn't fit in `crm-lead-actions.js` without exceeding 350 lines → STOP, propose split

---

## 5. Stop-on-Deviation Triggers

- If `crm-lead-actions.js` exceeds 350 lines after adding `createManualLead` + transfer guard → STOP, propose split
- If `crm_statuses` INSERT fails on either tenant (e.g., unique constraint) → STOP
- If the transfer block doesn't prevent the status change (i.e., the UPDATE still goes through) → STOP

---

## 6. Rollback Plan

- **Code:** `git reset --hard {START_COMMIT}`
- **DB:** Delete test leads: `DELETE FROM crm_leads WHERE source = 'manual' AND tenant_id = '8d8cfa7e-...'`. Delete status rows: `DELETE FROM crm_statuses WHERE slug = 'pending_terms'`.
- SPEC marked REOPEN, not CLOSED.

---

## 7. Out of Scope (explicit)

- **Sending terms approval link** — P3b (Make message dispatcher).
- **Automatic terms approval workflow** — future SPEC (lead clicks link → `terms_approved` flips to `true`).
- **Make scenarios** — P3b.
- **Message templates** — P5.
- **Duplicate phone detection in form** — the `lead-intake` Edge Function has this, but manual entry in P3a does a simple INSERT. Duplicate detection UI can come later.
- **Phone number normalization in form** — Edge Function normalizes `05X → +972...`. Manual entry could do the same but it's not required for P3a. The lead is entered as-is.
- **Schema changes** — no DDL.

---

## 8. Expected Final State

### Modified files
- `modules/crm/crm-lead-actions.js` — add `createManualLead(data)` + modify `transferLeadToTier2` to check `terms_approved`. Export new function.
- `modules/crm/crm-incoming-tab.js` — add "הוסף ליד +" button above table, wire to `CrmLeadActions.openCreateLeadModal()`
- `modules/crm/crm-helpers.js` — add `'pending_terms'` to `TIER1_STATUSES` array (position: after `'callback'`, before Tier 2 begins)
- `shared/js/toast.js` — add 1-line compat shim
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md`
- `modules/Module 4 - CRM/docs/CHANGELOG.md`
- `modules/Module 4 - CRM/docs/MODULE_MAP.md`

### DB state (both tenants)
- 1 new row in `crm_statuses` per tenant: `{ slug: 'pending_terms', name_he: 'לא אישר תקנון', entity_type: 'lead', color: '#f59e0b', sort_order: 6, is_default: false, is_terminal: false, triggers_messages: false }`
  - sort_order 6 places it after `callback` (5) and before `waiting` (6 → shifted to 7). OR: use sort_order 5.5 equivalent — executor decides based on current DB state.

### DB state (demo tenant only after testing)
- 0 test leads remain

---

## 9. Commit Plan

- **Commit 0:** `fix(shared): add Toast.show compat shim mapping to Toast.info` — 1-line change in `shared/js/toast.js`
- **Commit 1:** `feat(crm): seed pending_terms status for manual lead entry` — seed SQL + run for both tenants
- **Commit 2:** `feat(crm): add manual lead entry form and pending_terms gate` — createManualLead form, transferLeadToTier2 guard, TIER1_STATUSES update
- **Commit 3:** `docs(crm): update P3a session context, changelog, module map`
- **Commit 4:** `chore(spec): close P3A_MANUAL_LEAD_ENTRY with retrospective`

**Budget note:** Feature SPECs consistently produce 1–2 unplanned fix commits. This is expected.

---

## 10. Dependencies / Preconditions

- P2a completed ✅ — `crm-lead-actions.js` exists with `CrmLeadActions` pattern
  Verify: `ls modules/crm/crm-lead-actions.js` → exists, 230 lines
- `crm_leads.terms_approved` column exists ✅ — boolean NOT NULL
  Verify: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'terms_approved'` → 1 row, boolean
- `crm_leads.source` column exists ✅ — text, nullable
  Verify: `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'source'` → text, YES
- No `pending_terms` status exists yet ✅
  Verify: `SELECT COUNT(*) FROM crm_statuses WHERE slug = 'pending_terms'` → 0
- `Toast.show` is NOT a real method in toast.js ✅
  Verify: `grep 'Toast.show' shared/js/toast.js` → 0 matches (shim not yet added)
  Verify (smoke-test): calling `Toast.show('test')` in browser console → TypeError or undefined
- `TIER1_STATUSES` in crm-helpers.js has 5 entries ✅
  Verify: `grep -A5 'TIER1_STATUSES' modules/crm/crm-helpers.js` → ['new', 'invalid_phone', 'too_far', 'no_answer', 'callback']
- Pre-commit hook working ✅ (P2a fix: `set +e` in `.husky/pre-commit`)
  Verify: executor runs tooling probe before first commit

---

## 11. Lessons Already Incorporated

- FROM `P2A FOREMAN_REVIEW` §6 Proposal 1 → Mandatory Verify queries → APPLIED: all preconditions have Verify lines
- FROM `P2B FOREMAN_REVIEW` §6 Proposal 1 → RPC smoke-test for behavior, not just existence → APPLIED: no RPCs in this SPEC, but `Toast.show` smoke-test included
- FROM `P2B FOREMAN_REVIEW` §6 Proposal 2 → Budget 1–2 fix commits → APPLIED: §9 includes budget note
- FROM `P2A FINDINGS` #2 → Toast.show doesn't exist → APPLIED: Commit 0 adds the compat shim before any feature work
- FROM `P2B EXECUTION_REPORT` §8 Proposal 2 → Modal.show footer pattern → NOTED: manual lead form may use a modal with footer buttons — pass `footer` in config

---

## 12. Technical Design

### 12.1 Toast.show Compat Shim (Commit 0)

In `shared/js/toast.js`, after the `window.Toast = { ... }` assignment block, add:

```js
// Compat shim: legacy CRM files call Toast.show() which was never implemented.
// Map to Toast.info to prevent silent failures. See P2a Finding M4-BUG-02.
Toast.show = Toast.info;
```

This fixes all 7 call sites without touching any CRM file:
- `crm-messaging-templates.js:52`
- `crm-messaging-rules.js:34`
- `crm-messaging-broadcast.js:41`
- `crm-leads-tab.js:190`
- `crm-event-day-schedule.js:157`
- `crm-event-day-manage.js:25`
- `crm-event-day-checkin.js:101`

### 12.2 Seed `pending_terms` Status (Commit 1)

Insert for BOTH tenants (demo + Prizma). The status needs:
- `slug`: `pending_terms`
- `name_he`: `לא אישר תקנון`
- `entity_type`: `lead`
- `color`: `#f59e0b` (amber — stands out as "needs attention")
- `sort_order`: place after `callback` in Tier 1 sequence. Query current max sort_order for Tier 1, or use 6.
- `is_default`: false
- `is_terminal`: false
- `triggers_messages`: false (no auto-message on this status — yet)

```sql
INSERT INTO crm_statuses (tenant_id, slug, name_he, entity_type, color, sort_order, is_default, is_terminal, triggers_messages)
VALUES
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'pending_terms', 'לא אישר תקנון', 'lead', '#f59e0b', 6, false, false, false),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', 'pending_terms', 'לא אישר תקנון', 'lead', '#f59e0b', 6, false, false, false)
ON CONFLICT DO NOTHING;
```

Save as `modules/Module 4 - CRM/go-live/seed-pending-terms-status.sql`.

After running, update `TIER1_STATUSES` in `crm-helpers.js`:
```js
var TIER1_STATUSES = [
    'new',
    'pending_terms',    // ליד ידני שלא אישר תקנון
    'invalid_phone',
    'too_far',
    'no_answer',
    'callback'
];
```

### 12.3 Manual Lead Entry Form

**Where:** Add `createManualLead(data)` and `openCreateLeadModal(onCreated)` to `crm-lead-actions.js`.

**Trigger:** "הוסף ליד +" button in `crm-incoming-tab.js`, placed in the header area (above filter/search, next to the tab title). Style: indigo button matching the P2b event creation pattern.

**Form fields (Modal with footer):**

| Field | Type | Required | Default |
|-------|------|----------|---------|
| שם מלא | text | ✅ | — |
| טלפון | tel | ✅ | — |
| אימייל | email | ❌ | — |
| עיר | text | ❌ | — |
| שפה | select (he/en/ru) | ❌ | `he` |
| הערות | textarea | ❌ | — |

**On submit:**
1. Validate: name + phone required
2. `sb.from('crm_leads').insert({ tenant_id: getTenantId(), full_name, phone, email, city, language, status: 'pending_terms', source: 'manual', terms_approved: false, marketing_consent: false }).select('id, full_name, status').single()`
3. If notes provided → `sb.from('crm_lead_notes').insert({ tenant_id, lead_id, content: notes })`
4. Toast.success "ליד נוסף — ממתין לאישור תקנון"
5. Close modal, reload incoming tab

### 12.4 Transfer Guard — terms_approved Check

**Where:** Modify `transferLeadToTier2()` in `crm-lead-actions.js` (line 91).

**Before the existing UPDATE, add:**
```js
// Check terms_approved before allowing Tier 2 transfer
var check = await sb.from('crm_leads')
  .select('terms_approved')
  .eq('id', leadId)
  .eq('tenant_id', tenantId)
  .single();
if (check.error) throw new Error('lead check failed: ' + check.error.message);
if (!check.data.terms_approved) {
  if (window.Toast) Toast.error('לא ניתן להעביר — הליד לא אישר תקנון');
  return { blocked: true, reason: 'terms_not_approved' };
}
```

This blocks the transfer and shows a clear error. The "אשר" button in the incoming tab will handle the return value — if `blocked: true`, no further action.

### 12.5 Incoming Tab Button Wiring

**Where:** `crm-incoming-tab.js`, in the `renderIncomingTable` function (or the header-building section).

Add a button above the table:
```html
<button class="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition shadow-sm" id="crm-add-lead-btn">
  + הוסף ליד
</button>
```

Wire click → `CrmLeadActions.openCreateLeadModal(function() { loadIncomingLeads(true); })`.

### 12.6 Shared API Dependencies

| Utility | Method to call | Verified? | Source file |
|---------|---------------|-----------|-------------|
| Toast | `Toast.success(msg)`, `Toast.error(msg)` | ✅ (P2a/P2b verified) | `shared/js/toast.js` |
| Modal | `Modal.show({ title, size, content, footer })` | ✅ (P2b verified — must pass `footer` for buttons) | `shared/js/modal-builder.js` |
| escapeHtml | `escapeHtml(str)` | ✅ | `js/shared.js` |
| CrmHelpers | `CrmHelpers.formatPhone(phone)` | ✅ | `modules/crm/crm-helpers.js` |
| sb | `sb.from(table).insert/update/select` | ✅ | `js/shared.js` |

---

## 13. Test Protocol

All tests on demo tenant (`?t=demo`). Use chrome-devtools MCP for browser testing.

### Pre-test: Verify seed
1. `SELECT slug, name_he FROM crm_statuses WHERE slug = 'pending_terms' AND tenant_id = '8d8cfa7e-...'` → 1 row
2. Open CRM → incoming tab → verify "הוסף ליד +" button visible

### Test 1: Create manual lead
- Click "הוסף ליד +"
- Fill: name="P3a Test Lead", phone="0501112233", email="test@example.com"
- Submit
- Expected: Toast success, lead appears in incoming tab with status "לא אישר תקנון" (amber badge)
- DB verify: `SELECT full_name, status, terms_approved, source FROM crm_leads WHERE tenant_id = '8d8cfa7e-...' AND full_name = 'P3a Test Lead'` → status=`pending_terms`, terms_approved=`false`, source=`manual`

### Test 2: Transfer blocked
- Click on the test lead's "אשר" button
- Expected: Toast.error "לא ניתן להעביר — הליד לא אישר תקנון"
- DB verify: status still `pending_terms` (unchanged)

### Test 3: Transfer works after terms approved
- Manually update: `UPDATE crm_leads SET terms_approved = true WHERE full_name = 'P3a Test Lead' AND tenant_id = '8d8cfa7e-...'`
- Refresh page, click "אשר" again
- Expected: lead moves to Tier 2, status = `waiting`
- DB verify: status = `waiting`

### Test 4: Toast.show compat
- Open Messaging Hub tab → Templates sub-tab → click any template action
- Expected: no console errors about `Toast.show is not a function`

### Test 5: Form validation
- Click "הוסף ליד +", leave name empty, try to submit
- Expected: form prevents submission (required field)

### Test 6: Cleanup
```sql
DELETE FROM crm_lead_notes WHERE lead_id IN (
  SELECT id FROM crm_leads WHERE full_name LIKE 'P3a Test%' AND tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
);
DELETE FROM crm_leads WHERE full_name LIKE 'P3a Test%' AND tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
```
Verify: 0 test leads remain. `pending_terms` status rows stay (they're reference data).
