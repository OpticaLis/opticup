# M4 v2 Modal — Session-Restore Fix + Email Allowlist Expansion

**Brief version:** v1
**Date:** 2026-05-14 (post-validation)
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single Claude Code chat, ~1-1.5 hours)
**Model preference:** Sonnet (small JS fix + config update)
**Owning module:** Module 4 — CRM

---

## 1. Purpose

Two follow-ups from the E2E validation run on 2026-05-14:

1. **M4-V2-SESSION-RESTORE-01 (medium):** the v2 dispatch-preview modal saves the operator's recipient selections to sessionStorage on close, but the showAsync path does NOT load them back when the modal reopens for the same rule. Operator must re-select each time after an accidental close.
2. **Allowlist drift (low):** demo's email allowlist contains `danylis92@gmail.com` which is not in Daniel's formal whitelist. Daniel approved adding this email to the formal whitelist (chat 2026-05-14).

Both items are low-risk and bundled. The third validation finding (cascade restore on lead soft-delete) is OUT OF SCOPE and stays in the open-findings backlog per Daniel's decision.

---

## 2. Daniel's Locked Decisions (chat 2026-05-14)

| # | Topic | Decision |
|---|---|---|
| 1 | Session-restore | Fix in this SPEC. Same modal logic that saves should also load on reopen. |
| 2 | Allowlist drift | Add `danylis92@gmail.com` to the formal whitelist going forward. Update Architect skill + future Briefs to include it. |
| 3 | Cascade restore (third finding) | DEFER. Not in this SPEC. Stays in backlog. |

---

## 3. Scope

### 3.1 Fix the session-restore bug
- Locate where v2 modal opens via `showAsync` (or whatever the async entry point is — Pipeline confirms via grep).
- Verify the save-on-close logic works (was confirmed in validation).
- Wire the load-on-open logic: read the sessionStorage key for THIS rule+operator, apply to the recipient list (unchecking the saved-as-deselected lead_ids), surface a "Restored your previous selections" badge or quick-undo button.
- TTL: 6 hours (already enforced today on the save side). Stale entries discarded silently.
- Stale-lead-id reconciliation: if a previously-deselected lead is no longer in the current recipient list (lead deleted, status changed), skip that ID silently — don't crash.

### 3.2 Add email to the formal whitelist
- Update demo's `tenants.ui_config.test_mode_email_allowlist` to formally include `danylis92@gmail.com` (single-row UPDATE on demo only). It's already present today; this UPDATE just confirms the formal canonical state and authorizes it for ongoing Brief use.
- NO change needed to demo's SMS allowlist.
- NO touch to Prizma allowlists.

---

## 4. Safety Envelope

### 4.1 Safety tag
```
git tag -a pre-v2-session-restore-fix-2026-05-14 -m "Pre-session-restore-fix baseline"
git push origin pre-v2-session-restore-fix-2026-05-14
```

### 4.2 Whitelist (HARD GATE)
For any test message dispatched during smoke testing:
- **Phones:** `0537889878`, `0503348349`, `0507168471`
- **Emails:** `daniel@prizma-optic.co.il`, `alkimovich94@gmail.com`, `danylis92@gmail.com`

Note: `danylis92@gmail.com` is now formally on the list per Daniel's decision §2 #2.

### 4.3 Tenant rules
- Demo tenant ONLY for testing.
- One single-row UPDATE on demo `tenants` row authorized for §3.2.
- Zero Prizma writes.

### 4.4 Localhost
- Localhost required for smoke. Confirm reachable at run start.

### 4.5 DDL
- None.

### 4.6 Iron Rules
- 31, 32, 12, 15, 21, 22 enforced.

### 4.7 Commit budget
- 2-3 commits. Cap at 4.

### 4.8 Stop triggers
- If the v2 modal's save-on-close logic turns out to NOT work (premise refuted in pre-flight), STOP, the bug is in a different place than assumed.
- If session-restore introduces a regression in the existing modal flow (recipient list doesn't render correctly), STOP.

---

## 5. Smoke

On demo:
1. Open the v2 modal for any active automation rule.
2. Uncheck 3 recipients. Confirm sessionStorage has the entries.
3. Close modal WITHOUT dispatching.
4. Reopen the modal for the same rule.
5. EXPECTED: the 3 previously-deselected recipients are again unchecked. A small badge or "Restored" indicator appears.
6. Repeat with a recipient that has been removed from the list (e.g., lead deleted between sessions) — reopen should not crash; the stale ID is silently skipped.
7. Wait > 6 hours (or simulate by manipulating the timestamp in sessionStorage). Reopen. Confirm the stale entry is cleared.

---

## 6. Pipeline Selection

Standard Full Auto Pipeline. Sonnet model.

---

## 7. Communication

English status updates between phases. ONE concise English summary at end:
- File path of the JS change.
- Confirmation that allowlist update on demo succeeded.
- Smoke results.
- Ready for develop→main PR.

---

*End of Brief.*
