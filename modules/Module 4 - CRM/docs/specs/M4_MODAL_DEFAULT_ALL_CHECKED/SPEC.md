# SPEC — M4_MODAL_DEFAULT_ALL_CHECKED

**Authored by:** opticup-strategic (Foreman role).
**Date:** 2026-05-19.
**Trigger:** Daniel — modal preview opens with 0 nominees checked + banner "שוחזרו 3 בחירות קודמות [בטל שחזור]". Button counter "(3)" while UI shows 0 checked → confusing inconsistency. Daniel: "default behavior should be all nominees checked; operator unchecks who they don't want."
**Pipeline mode:** Full-Auto with Chrome MCP live verification (Iron Rule 34).

---

## 0. Investigation (Foreman-first, before code)

Daniel's diagnosis: "ככל הנראה נוספה state restoration ב-0a0fa39 (M4_MODAL_DESELECTION_RESTORE)."

**Actual provenance** (verified via git archaeology):
- `git show 0a0fa39 -- modules/crm/crm-confirm-send-v2.js | grep STORE_KEY` → **no matches**.
- `git log -S "STORE_KEY"` → **commit `e4e1330`** ("Phase 7 — QoL — count progression + chips + history + session-save", 2026-05-14) introduced the session-storage feature.
- `220de10` ("restore v2 modal selections on reopen via showAsync") added the restore-on-reopen wire 2 days later.

**Why Daniel attributed it to 0a0fa39:** the session-storage was a latent UX choice since Phase 7 (2026-05-14). It persisted operator deselections to `sessionStorage` and restored them on reopen. Before today, deselections didn't actually affect dispatch (`probeAndCommit` dropped `ctx.excludeLeadIds` on the floor — the regression M4_MODAL_DESELECTION_RESTORE fixed). So the persistent restoration was harmless noise.

**After M4_MODAL_DESELECTION_RESTORE (0a0fa39)**, deselections DO affect dispatch. The previously-harmless persistence now produces operationally surprising behavior: open modal → 3 unchecked + button "(3)" inconsistent state → operator confused.

The fix is what Daniel asked for: remove the cross-session persistence. The investigation just clarifies that 0a0fa39 didn't add the feature — it surfaced the consequence.

(Saved to memory: `feedback_dont_add_unrequested_features.md` — for future SPECs, when the design includes adjacent capabilities not in the Brief, stop and ask Daniel. Phase 7's session-save was probably such a case originally.)

---

## 1. Pre-flight (executed 2026-05-19T11:51Z)

| Check | Result |
|---|---|
| develop HEAD | `0a0fa39` (M4_MODAL_DESELECTION_RESTORE closed) |
| Smoke 7/7 | ✅ PASS |
| Pipeline lock | ✅ `pid-6764-5bc874b6.lock` |

---

## 2. The fix — 3 concrete changes

### Change 1 — Remove cross-session restoration
- `modules/crm/crm-confirm-send-v2.js`: delete `_saveSession`, `_loadSession`, `_clearSession`, `STORE_KEY`, `STORE_TTL_MS`. Remove their callsites (3 inside `_state` mutators + `handleConfirm` + `_ensureState` + `_hydrate`).
- `_state.excluded` always initializes empty (all recipients checked by default).
- `_state.restored` field removed (always false).

### Change 2 — Remove the restored banner
- `modules/crm/crm-confirm-send-v2-render.js`: delete `renderRestoredNotice` function + its callsite in `renderBody`.
- The "♻️ שוחזרו N בחירות קודמות [בטל שחזור]" banner is gone.

### Change 3 — Add "סמן הכל" / "נקה הכל" buttons
- `modules/crm/crm-confirm-send-v2-render.js`: add 2 buttons in the recipient-list header (above the table).
- `modules/crm/crm-confirm-send-v2.js`: wire them. Select-all clears `_state.excluded`; clear-all populates `_state.excluded` with all visible-recipient lead_ids. Both trigger rerender + refreshFooterLabels.

---

## 3. Steps

1. Pre-flight ✅.
2. Author SPEC.
3. Edit `crm-confirm-send-v2.js`: remove session-storage helpers + restored-state + undo-restore wire. Edit `_ensureState` for default-empty-excluded. Add select-all/clear-all wire in `wireBodyEvents`.
4. Edit `crm-confirm-send-v2-render.js`: remove `renderRestoredNotice`. Add 2 bulk-action buttons in recipient list header.
5. Iron Rule 12 line-count check (current 348 + 259; net should reduce, not grow).
6. Chrome MCP verification (5 scenarios).
7. Retros + commit + push.

---

## 4. Destructive Operations

1. Edit `modules/crm/crm-confirm-send-v2.js`: delete ~50 lines (session-storage helpers + restore wires).
2. Edit `modules/crm/crm-confirm-send-v2-render.js`: delete ~12 lines (renderRestoredNotice + invocation). Add ~10 lines (2 bulk buttons).
3. New SPEC folder + retros + verification archive.

NO DB changes. NO EF changes. NO Prizma writes.

---

## 5. Verification Criteria (5 scenarios)

1. **Default** — open modal with 3 recipients → all 3 checked, button "אישור ושלח הודעות (3)", no banner.
2. **Clear-all** — click "נקה הכל" → 0 checked, button "(0)" disabled.
3. **Select-all** — from cleared state, click "סמן הכל" → 3 checked, button "(3)".
4. **Manual deselect 2** — uncheck 2 manually → button "(1)".
5. **Close + reopen** — cancel modal, reopen → again all 3 checked default (no cross-session persistence).

Always-on: smoke 7/7 PASS. Iron Rules 12/21/23/31/32/34/35 enforced.

---

## 6. Rollback

Rollback tag: `pre-m4-modal-default-all-checked-2026-05-19` on commit `0a0fa39`. `git revert` if needed.

---

## 7. Out of Scope

- Phase 7's other QoL features (count progression chips, history surface). Only the session-save/restore is removed; chips/filters/test-send remain.

---

*End of SPEC.*
