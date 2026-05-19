# FINDINGS — M4_MODAL_DEFAULT_ALL_CHECKED

---

## F-1 — Provenance correction: session-save came from Phase 7 (e4e1330), not from 0a0fa39
**Severity:** INFO (honest finding)
**Status:** Documented openly

Daniel attributed the regression to `0a0fa39` (M4_MODAL_DESELECTION_RESTORE, the SPEC closed earlier today). Git archaeology proves otherwise:

```
$ git show 0a0fa39 -- modules/crm/crm-confirm-send-v2.js | grep -E 'STORE_KEY|sessionStorage|restored|Session'
# (no output)

$ git log -S 'STORE_KEY' -- modules/crm/crm-confirm-send-v2.js
e4e1330 feat(m4,crm,ui): QoL — count progression + chips + history + session-save (Phase 7)
```

The session-save was introduced in `e4e1330` (Phase 7, 2026-05-14). `220de10` ("restore v2 modal selections on reopen via showAsync", same day) added the load-on-reopen wire.

**Why it surfaced now:** before today's `0a0fa39`, deselections didn't actually affect dispatch (`probeAndCommit` dropped `ctx.excludeLeadIds` on the floor). Persistent session-save was harmless noise. After 0a0fa39 fixed the dispatch wire, persistent deselection across sessions produced operationally surprising behavior.

The BEHAVIORAL FIX Daniel requested is still correct — just attributing it to 0a0fa39 was off by 5 days.

---

## F-2 — Memory: "don't add unrequested features to SPECs"
**Severity:** PROCESS
**Status:** Saved to memory

Daniel's note: "הPipeline הקודם הוסיף feature שדניאל לא ביקש. בעתיד - אם SPEC נראה לעשות יותר ממה שדניאל ביקש, תעצור ותשאל."

While `0a0fa39` did NOT add session-save, the principle is broadly correct. Phase 7's session-save was probably such a case originally — added as an adjacent QoL feature when the Brief was scoped to specific functionality. Once added, it was sticky enough that it stayed quietly latent for 5 days until today's fix made its consequences visible.

Saved to `C:\Users\User\.claude\projects\C--Users-User-opticup\memory\feedback_dont_add_unrequested_features.md`. Indexed in MEMORY.md.

Future SPECs: before adding any persistent state (localStorage/sessionStorage), undo/redo, history banners, multi-session restoration, or autosave indicators — STOP and ask Daniel if it's wanted.

---

## F-3 — `restored` field on _state was load-bearing for the banner + wire only
**Severity:** INFO (cleanup completeness)
**Status:** RESOLVED

The removed `_state.restored` field was read in 3 places:
1. `renderRestoredNotice` (render.js) — `if (!state || !state.restored) return ''`.
2. `_loadSession` callsite in `_ensureState` (v2.js) — `restored: !!restored`.
3. `_hydrate` late-load block (v2.js) — `if (!_state.restored)`.

All 3 removed cleanly. No other references exist; grep confirms.

---

## F-4 — `_state.chip` and `_state.search` still preserved per-session (intra-modal)
**Severity:** INFO (scope clarity)
**Status:** Working as intended

The bulk-action / no-cross-session-persistence change does NOT affect within-modal state. `_state.chip` (active filter chip) and `_state.search` (search input) are still maintained while the modal is open. They reset to defaults (`'all'` / `''`) on modal re-open per the new `_ensureState`. That's the correct UX — operator's mid-flight filter/search choices shouldn't survive a modal close.

---

## Future SPEC candidates

1. **`M4_PHASE_7_QOL_AUDIT`** — review the other Phase 7 features (count progression, chips, history) for any other latent UX choices Daniel didn't explicitly request. If found, propose removal.
2. **`M4_RULE_EDITOR_AUTO_PROMOTE_REGRESSION_TEST`** (carried from M4_AUTO_PROMOTE_GOVERNANCE) — automated Chrome MCP smoke for the auto-promote toggle. Still open.

None block today's customer outcome.
