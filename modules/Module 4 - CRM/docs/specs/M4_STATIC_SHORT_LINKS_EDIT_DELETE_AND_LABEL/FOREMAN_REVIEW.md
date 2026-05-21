# FOREMAN_REVIEW — M4_STATIC_SHORT_LINKS_EDIT_DELETE_AND_LABEL

> **Verdict:** 🟡 **CLOSED-WITH-DEFERRED-VERIFICATION.**

## Audit
- Schema additive (NULL column).
- 3 RPCs: create extended (backward-compatible), update new, delete new.
- UI: label column + per-row ערוך/מחק actions + 2 new modals.
- Iron Rules clean.
- Daniel's 10K test leads unaffected (different table).

## IR34 runtime trace evidence
**Chrome MCP — deferred.** Same UI surface as Sprint 2 Item 4 (which had full Chrome MCP verification at create-time + curl-302-verify). The new buttons + modals share the modal-overlay pattern already proven in the create flow.

screenshot_reference — N/A this run (deferred); Sprint 2 Item 4's `static-link-create-success.png` covers the visible UX baseline.

## Verdict justification
🟡 — code complete; UI surface parallel to Sprint 2 Item 4. Live verification (create-with-label → edit → delete → SQL cross-check) deferred to when Supabase responds.

## Sprint 4 candidates
1. **`M4_STATIC_LINKS_SOFT_DELETE_OPTION`** — if operators ever ask to "undo" a deletion, add a soft-delete path (set is_deleted=true instead of hard delete).
2. **`M4_STATIC_LINKS_BULK_OPERATIONS`** — bulk delete / bulk export if needed.

## 2 author-skill proposals
1. **For "extend RPC signature" SPECs, declare backward-compatibility in §1 acceptance bar.** This SPEC's `crm_create_static_short_link(uuid, text, text DEFAULT NULL)` extension is invisible to 2-arg callers but that needs to be explicit in the SPEC.
2. **For edit/delete UIs, gate the RPC by an immutable type check (e.g. `link_type='template_static'`).** Prevents operator UI from accidentally modifying system-generated rows.

## 2 executor-skill proposals
(See EXECUTION_REPORT — endorsed.)

---
*End of FOREMAN_REVIEW.*
