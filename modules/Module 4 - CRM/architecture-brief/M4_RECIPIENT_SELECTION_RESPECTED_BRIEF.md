# M4 Recipient Selection Must Be Respected

**Status:** Brief. Full-Auto Pipeline. Daniel approved.
**Authored by:** Architect (Cowork, 2026-05-19 ~14:15 IL).
**Priority:** P0 — UI says "send to 1", EF sends to 3. Operator control over recipients is broken.

---

## 1. The problem (verified by DB evidence)

Daniel opened the "אישור פעולה" preview modal for `שינוי סטטוס: ייפתח מחר` rule. The modal listed 3 recipients with checkboxes. He **unchecked 2**, leaving 1 selected. Button said "אישור ושלח הודעות (1)". He clicked confirm.

DB evidence from run `f6c5d984-95dc-4bdd-bdc4-4255d1a99af2` (14:10:00 IL) shows 5 message_log rows across **3 different lead_ids**:
- `01269ab9` — sms + email sent (the one Daniel kept checked)
- `cb6b343e` — sms sent + email rejected (Daniel unchecked this one)
- `67e3d6fe` — sms sent (Daniel unchecked this one)

**Daniel's selection was completely ignored.** The checkboxes are UI-only state; the EF re-resolves recipients server-side from `recipient_type` and sends to all.

This is a privacy/control regression — the operator believes they limited the send and was lied to by the UI.

---

## 2. The fix — 2 layers

### Layer 1 — Plumb selected recipient IDs through dispatch path

When the user confirms the modal, the `dispatchPreviewConfirm` (or equivalent) call must pass `selected_recipient_lead_ids: [...]` in the payload to `automation-engine`. The EF, in dispatch mode, must:
1. Accept the new optional field.
2. If present and non-empty: filter the server-side recipient resolution to ONLY these lead_ids. Drop the rest.
3. If absent or empty array: original behavior (send to all per recipient_type).
4. If present but contains lead_ids not in the original server-resolved set: drop them (security — don't let UI add recipients).

### Layer 2 — Modal must always send the selection

`crm-confirm-send-v2.js` confirm handler must:
1. Gather all checked recipient lead_ids from the modal state.
2. Pass them as `selected_recipient_lead_ids` in the call.
3. If 0 are checked: prevent confirm (button should already be disabled at 0, but verify).
4. Add a console.assert that the selected count matches the button label.

---

## 3. Verification Criteria

1. Modal preview shows 3 recipients. User unchecks 2.
2. Confirm sends → only 1 lead receives messages.
3. DB run row has `total_recipients=1` (not 3).
4. DB log has rows for ONLY the selected lead_id (1 sms + 1 email = 2 rows total).
5. If user re-opens preview and checks 2 of 3: confirm sends to those 2 (4 log rows).
6. Edge case: user unchecks all → button disabled, no confirm possible.
7. Edge case: user manipulates DevTools to add a lead_id not in the original server-resolved set → EF drops it (verified in security test).
8. Chrome MCP screenshots: modal with selection state + DB query confirming only selected received.
9. Smoke 7/7 PASS.
10. Iron Rules 12/21/31/32/34 enforced.

---

## 4. Destructive Operations

- Code edits: `automation-engine` EF (dispatch mode handler), `crm-confirm-send-v2.js`, possibly `crm-automation-client.js`.
- No DB schema changes.
- NO writes to Prizma row data.

---

## 5. Knowledge Transfer (Iron Rule 35)

Update `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md`:
- Document the new `selected_recipient_lead_ids` field in the dispatch payload contract.
- Clarify: server-side `recipient_type` resolution defines the **maximum** recipient set. The UI selection narrows from there. UI cannot ADD recipients beyond what `recipient_type` resolves to.

---

## 6. Estimated wall-clock

2-3 hours.

