# SPEC: M4_SHORT_LINKS_CHANNEL_DASHBOARD

**Status:** Ready for execution
**Author:** Foreman (opticup-strategic)
**Date:** 2026-05-24
**Module:** Module 4 - CRM
**Dependency:** Depends on M4_SHORT_LINKS_CHANNEL_SPLIT (landed, commit 9089b2b). Convention and data are in place; this SPEC builds the screen on top.
**Brief:** campaigns/supersale/sketches/BRIEF_short_links_channel_dashboard.md

---

## 0. Problem Statement

The short-links screen lists one row per `code` with a raw `click_count`. After the channel-split (M4_SHORT_LINKS_CHANNEL_SPLIT), each logical link has two codes (E-prefix for email, S-prefix for SMS). The screen now shows twice as many rows, making it harder to read. Campaign managers need:
- **(A)** A grouped view: one row per logical link showing total clicks, with a channel filter to break down by SMS / email.
- **(B)** A channel-aware create flow: the "+ קישור קצר חדש" dialog lets the operator choose SMS-only, email-only, or both (creating the matched E/S pair in one action with convention-compliant codes).

---

## 1. Acceptance Criteria

### Part A — Channel-grouped click view
1. Default view shows one row per logical link (grouped by label prefix before `_email`/`_sms`), displaying TOTAL clicks across all channels.
2. Channel filter chips `הכל | SMS | מייל` above the table. Selecting a channel shows only that channel's click count per group.
3. Links not following the convention (no `_email`/`_sms` label suffix, no E/S code prefix) appear in an "אחר" bucket — never hidden.
4. Per-group row optionally shows a compact breakdown `(SMS: X · מייל: Y)` in muted text alongside the total — nice-to-have for v1.
5. RTL, mobile-first, matches existing CRM screen styling. No new colors outside the design canon.

### Part B — Channel-aware create flow
6. Create dialog adds a "ערוץ" radio group: `SMS בלבד | מייל בלבד | שניהם (SMS + מייל)`.
7. "שניהם" creates two `short_links` rows (E-prefix + S-prefix codes) pointing to the same `target_url`, labeled `{purpose}_email` / `{purpose}_sms`, in one dialog action.
8. Single-channel creates one row with the matching prefix + label suffix.
9. Generated codes follow the convention: first character = channel letter (`E`/`S`), remainder = random alphanumeric. Collision-checked globally before insert.
10. The operator types only the target URL + a purpose label — never hand-types a code.
11. Success feedback shows both codes (when "שניהם"), each with its short path.

### Cross-cutting
12. No change to `resolve-link` EF or click-counting logic.
13. No new placeholders (Iron Rule 35 — N/A, this is UI-only).
14. Demo-first per Iron Rule 33 (test on demo, then verify prizma).

---

## 2. Verified Live State (2026-05-24)

### Existing files (to modify)

| File | Lines | Role |
|---|---:|---|
| `modules/crm/crm-short-links-tiles/template-static-card.js` | 316 | Template-static links table + create/edit/delete dialogs |
| `modules/crm/crm-short-links-stats.js` | 120 | Orchestrator for the short-links stats tab |

### Existing RPC

`crm_create_static_short_link(p_tenant_id, p_target_url, p_label)` — generates random 8-char codes (md5-based), collision-checks globally, inserts one `short_links` row. Defined in migration `20260522070100`.

### Convention (locked, proven by M4_SHORT_LINKS_CHANNEL_SPLIT)

- Code first character: `E`=email, `S`=SMS (future `W`=WhatsApp)
- Label suffix: `_email`, `_sms`
- Grouping key: label without the trailing `_email`/`_sms`; or if no suffix, the raw label.
- Live examples: `ECATp` (pricing_catalog_email), `SCATp` (pricing_catalog_sms), `ESLpw1` (supersale_launch_wave1_email), `SSLpw1` (supersale_launch_wave1_sms).

---

## 3. Destructive Operations

**This SPEC is ADDITIVE.** No deletes. No drops. No renames. No main branch.

| Operation | Type | Reversible? |
|---|---|---|
| New RPC `crm_create_channeled_short_link` | Additive | Yes (DROP FUNCTION) |
| Modify `template-static-card.js` (grouping + create dialog) | Mutative | Yes (git revert) |

---

## 4. Design

### 4a. New RPC: `crm_create_channeled_short_link`

```
crm_create_channeled_short_link(
  p_tenant_id uuid,
  p_target_url text,
  p_label_prefix text,  -- e.g. 'pricing_catalog'
  p_channel text         -- 'sms' | 'email'
)
RETURNS jsonb
```

Behavior:
- Validates p_channel IN ('sms','email'). Map: sms→'S', email→'E'.
- Generates code = channel_letter + substr(md5(random...), 1, 7) — 8 chars total.
- Collision-checks globally: `NOT EXISTS (SELECT 1 FROM short_links WHERE code = v_code)`.
- label = `{p_label_prefix}_{p_channel}` (e.g. `pricing_catalog_sms`).
- Inserts one row, link_type='template_static', expires_at 2099.
- Returns same shape as existing RPC: `{ok, id, code, target_url, short_path, label}`.
- Keep existing `crm_create_static_short_link` untouched (additive — no existing caller breaks).
- SECURITY DEFINER, tenant JWT check (same pattern as existing RPC).

### 4b. Template-static-card.js changes

**Grouping logic (client-side, in `_renderRows`):**
```js
// Group by label prefix (strip trailing _email/_sms)
function groupKey(label) {
  if (!label) return null;
  return label.replace(/_(email|sms)$/, '');
}
function channelFromLabel(label) {
  if (!label) return null;
  if (/_email$/.test(label)) return 'email';
  if (/_sms$/.test(label)) return 'sms';
  return null;
}
```

Build a `Map<groupKey, { email: row|null, sms: row|null, total: number }>`. Rows with `channelFromLabel() === null` go into their own ungrouped bucket (rendered as-is, in an "אחר" section or mixed in).

**Channel filter chips:** added to the template-static card header (between the title and the "+ חדש" button). Three chips: `הכל` (default, shows summed total), `SMS`, `מייל`. On chip click, re-render the table with only the selected channel's click counts (or sum for "הכל"). State is local to this component — does not affect the broadcasts table or drilldown.

**Create dialog changes:**
- Add a "ערוץ" radio group below the label input: `SMS בלבד | מייל בלבד | שניהם`.
- On submit:
  - If single channel: call `crm_create_channeled_short_link` once with `p_channel`.
  - If "שניהם": call twice (sms + email), same `p_target_url` and `p_label_prefix`. Show both results in the success panel.
- Purpose/label input becomes required when channel is selected (it feeds `p_label_prefix`).

### 4c. File size management

`template-static-card.js` is currently 316 lines. The grouping logic + channel filter + create-dialog channel radio adds ~80-100 lines, pushing toward ~400+. If it exceeds 350, extract the grouping + channel-filter logic into a new file `modules/crm/crm-short-links-tiles/channel-group.js` (~60-80 lines) loaded by the orchestrator. The file-size gate (350 hard max) applies to `.js` files in `modules/`.

---

## 5. Execution Steps

### Phase A — Migration (new RPC)

**A1.** Write migration file: `supabase/migrations/YYYYMMDDHHMMSS_m4_create_channeled_short_link_rpc.sql`. Follow the existing RPC pattern (SECURITY DEFINER, JWT tenant check, collision loop, GRANT to authenticated+service_role).

**A2.** Apply migration to demo via `execute_sql`. Verify the RPC exists and works: call it with a test URL + label_prefix + channel='sms', confirm the returned code starts with 'S' and the label ends with '_sms'. Clean up the test row.

### Phase B — UI changes (template-static-card.js)

**B1.** Add channel-grouping logic to `_renderRows`. Group rows by label prefix, sum clicks per group, render one table row per group (default "הכל" mode).

**B2.** Add channel filter chips to the card header. Wire chip clicks to re-render with filtered mode.

**B3.** Update `_openCreateModal` to add the channel radio group. Wire `_submitCreate` to call the new RPC (once or twice depending on selection).

**B4.** If file exceeds 350 lines, extract channel-group logic to `channel-group.js`, add `<script>` tag in the CRM page loader.

### Phase C — Apply migration to Prizma

**C1.** Apply the same migration to Prizma (or verify it was included in Supabase's auto-apply if using the migrations system). Confirm RPC exists on Prizma.

### Phase D — Verify (Iron Rule 34 — Chrome MCP required)

**D1.** Chrome MCP on demo:
- Screenshot: default view showing grouped rows with total clicks per logical link.
- Screenshot: after clicking "SMS" filter chip — same rows but SMS-only click counts.
- Screenshot: create dialog with channel radio visible, "שניהם" selected.
- Runtime trace: confirm filter re-render fires without a DB reload (client-side re-filter).
- DB query: `SELECT label, click_count FROM short_links WHERE tenant_id=DEMO AND link_type='template_static'` — verify displayed totals = SUM(click_count) grouped by label prefix.

**D2.** Create-flow test:
- Use the dialog to create a "test_channel_split" link with "שניהם" mode.
- Verify 2 new rows appear: `Exxxxxxx` (label=test_channel_split_email) + `Sxxxxxxx` (label=test_channel_split_sms).
- curl both → correct target, click_count increments.
- Delete the test rows via the existing delete button.

**D3.** Prizma spot-check: navigate to prizma's short-links screen, confirm grouping renders correctly with production data. Screenshot.

**D4.** Visual-Fidelity Gate: fill the region table in TEST_REPORT.md.

---

## 6. Verification Evidence Required (Iron Rule 34)

| Evidence | Source |
|---|---|
| Default grouped view screenshot | Chrome MCP |
| SMS-filtered view screenshot | Chrome MCP |
| Create dialog with channel radio screenshot | Chrome MCP |
| "Both" creation produced 2 correctly-coded rows | DB query |
| Displayed totals match DB SUM(click_count) | DB query vs screenshot |
| Filter re-render without full reload | Runtime console trace |
| Test links resolve (curl 302 → target → 200) | curl output |
| Click_count incremented on test links | DB before/after |
| Visual-Fidelity Gate region table | TEST_REPORT.md |

---

## 7. Rollback Plan

1. Revert `template-static-card.js` (and `channel-group.js` if extracted) via git.
2. DROP FUNCTION `crm_create_channeled_short_link` if the migration was applied.
3. No data to clean (create-flow test rows deleted during verify).

---

## 8. Files Modified

| File | Change |
|---|---|
| `modules/crm/crm-short-links-tiles/template-static-card.js` | Grouping logic, channel filter chips, create dialog channel radio |
| `modules/crm/crm-short-links-tiles/channel-group.js` | **NEW** (only if template-static-card exceeds 350 lines) |
| `supabase/migrations/YYYYMMDDHHMMSS_m4_create_channeled_short_link_rpc.sql` | **NEW** — RPC for channel-aware short link creation |

---

## 9. Self-Improvement Proposals

1. **For UI SPECs that add client-side grouping/aggregation,** the SPEC MUST specify which field is the grouping key AND what happens when the key is missing/malformed (the "אחר" bucket). This SPEC does it via `groupKey(label)` with a null fallback. Codify this as a standard pattern: every grouping function needs an explicit "ungrouped" path, never a silent drop.

2. **For SPECs that add a new RPC alongside an existing one** (like `crm_create_channeled_short_link` next to `crm_create_static_short_link`), the SPEC §4 MUST document why the old RPC is kept and whether any caller should migrate. Otherwise the two RPCs drift apart over time (e.g., one gets a bug fix the other doesn't). In this case: old RPC kept for backward compat with any external callers; the UI switches to the new one.
