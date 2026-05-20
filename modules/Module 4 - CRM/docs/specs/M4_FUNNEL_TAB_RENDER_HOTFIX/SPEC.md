# SPEC — M4_FUNNEL_TAB_RENDER_HOTFIX

> **Class:** P1 HOTFIX — UI regression on develop after PR #103 merge.
> **Authored by:** opticup-strategic (Foreman, M4)
> **Authored on:** 2026-05-20
> **Branch:** develop
> **Pipeline:** LIGHT (Foreman authors + executes inline; doc-only Reviewer audit; Chrome MCP verification deferred to Daniel — MCP server disconnected this session).
> **Risk class:** LOW. Single 1-file edit (`modules/crm/crm-bootstrap.js`). Pure additive — 4 + 8 lines.

---

## 1. Bug + Root Cause

**Symptom (verified by Daniel):**
- Click "מצב פאנל" tab → sidebar activates, header shows literal text "funnel-health", but `#funnel-dashboard-host` stays empty.
- Click "קישורים קצרים" tab → same shape — header + sidebar activate, host empty.
- Manual console call `window.renderFunnelDashboard(document.getElementById('funnel-dashboard-host'))` renders all 14 tiles correctly.
- `window.renderFunnelDashboard` IS defined at click time. `window.loadCrmShortLinksStats` IS defined at click time. Host divs exist.

**Root cause (verified by Foreman code-read):**

`crm-init.js` (line 10-37) defines `showCrmTab(name)` with dispatch branches for `dashboard / incoming / leads / events / campaigns / event-day / messaging / activity-log / short-links / funnel-health` — total 10 branches. Exposed via `window.showCrmTab = showCrmTab`.

`crm-bootstrap.js` (line 22) **OVERWRITES** `window.showCrmTab` with a wrapper that adds header-title management:
```js
window.showCrmTab = function (name) { ... };
```

The wrapper has its own dispatch branches but is MISSING:
- `if (name === 'short-links') { ... loadCrmShortLinksStats(...) }`
- `if (name === 'funnel-health') { ... window.renderFunnelDashboard(...) }`

It also has `TAB_META` for header titles but no entries for `short-links` or `funnel-health`. Result: `meta.title || name` → falls back to the raw string `'funnel-health'` → that's the literal text Daniel sees in the page header.

Both tabs were last touched on 2026-05-19 in:
- **PR #103 (M4_FUNNEL_HEALTH_DASHBOARD):** added the `funnel-health` branch + button + panel; updated `crm-init.js` correctly but didn't update `crm-bootstrap.js`'s wrapper.
- **Earlier (prior to today):** `short-links` was added to `crm-init.js` similarly without updating `crm-bootstrap.js`.

The wrapper-shadow pattern (crm-bootstrap.js loads LAST and overwrites window.showCrmTab) means every new tab needs to be added in BOTH `crm-init.js` AND `crm-bootstrap.js`. This is a code-smell that should be cleaned up post-hotfix (proposed as follow-up SPEC `M4_CRM_TAB_DISPATCH_DEDUPE` — collapse to single source of truth).

---

## 2. Fix

**File:** `modules/crm/crm-bootstrap.js`
**Change:** add TAB_META entries for both tabs + add the 2 missing render branches inside the wrapper. Mirror the exact form of `crm-init.js` lines 29-36.

**Lines added: 12 total** (4 in TAB_META block, 8 in wrapper body).
**Lines deleted: 0.**

---

## 3. Success Criteria

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 1 | Branch state | On develop, scope-clean at close | `git status --short` shows only pre-existing-unrelated paths |
| 2 | Commits | 1-3 commits (this SPEC + fix + EXECUTION_REPORT) | `git log` |
| 3 | `crm-bootstrap.js` contains `short-links` and `funnel-health` in TAB_META | 2 hits | `grep -c "'short-links':\|'funnel-health':" modules/crm/crm-bootstrap.js` → 2 |
| 4 | `crm-bootstrap.js` wrapper dispatches to `loadCrmShortLinksStats` | 1 hit | grep |
| 5 | `crm-bootstrap.js` wrapper dispatches to `window.renderFunnelDashboard` | 1 hit | grep |
| 6 | `crm-init.js` UNCHANGED (the originals stay; bootstrap shadows them — fix in both is defense-in-depth) | byte-identical | `git diff -- modules/crm/crm-init.js` empty |
| 7 | Smoke 8/8 PASS | all passing | `node tests/smoke/baseline.test.mjs` |
| 8 | Iron Rule 31 integrity gate | exit 0 | hook |
| 9 | Iron Rule 32 destructive ops | 0 declared, 0 detected | hook |
| 10 | Cross-Module Safety: ONLY `modules/crm/crm-bootstrap.js` modified (+ SPEC folder) | yes | `git diff --name-only` |
| 11 | Live Chrome verification | DEFERRED to Daniel (MCP server disconnected this session) | Daniel manually clicks the 2 tabs |

---

## 4. Autonomy Envelope

### CAN
- Modify exactly `modules/crm/crm-bootstrap.js`.
- Create the SPEC folder + EXECUTION_REPORT.md.
- Run smoke + integrity gate.
- Push develop. Open PR to main per Daniel's hotfix instruction.

### MUST STOP
- Any file outside `crm-bootstrap.js` needs to change.
- Smoke regresses.
- Iron Rule 31/32 fails.
- Need to refactor crm-init.js (that's the follow-up SPEC, not this hotfix).

---

## 5. Stop-Triggers (extended)

1. The 1-file edit accidentally touches other functionality.
2. The wrapper's existing dispatches break.
3. Linting reveals the wrapper has more shadowed functions than just these 2 tabs.

---

## 6. Out of Scope

- Refactoring crm-init.js / crm-bootstrap.js to eliminate the shadow-overwrite pattern (follow-up SPEC `M4_CRM_TAB_DISPATCH_DEDUPE`).
- Adding any new tab.
- Modifying any other CRM file.
- DB / EF / migration changes.

---

## 7. Expected Final State

- `modules/crm/crm-bootstrap.js`: +12 lines (4 TAB_META + 8 wrapper body).
- New SPEC folder with SPEC.md + EXECUTION_REPORT.md.
- Smoke 8/8 PASS.
- Develop pushed.
- PR open to main.

---

## 8. Rollback

`git revert <fix_commit_hash>`. Pure JS edit; no DB rollback.

---

## 9. Destructive Operations

**Count: 0.** Pure additive edit.

---

## 10. Verification handoff (Chrome MCP MANDATORY per user prompt — DEFERRED)

User's verification protocol mandates Chrome MCP screenshots of 6 sequences (click מצב פאנל → screenshot, switch tabs, re-click, click קישורים קצרים, repeat in 4 orders). The Chrome MCP server is **disconnected** in this session (per system reminder). The static code-fix verification is complete; live browser verification is Daniel's manual step after pull.

**Daniel's manual verification** (after pulling latest develop):
1. Reload `localhost:3000/crm.html?t=demo`.
2. Click "מצב פאנל" → expect 14 tiles render within ~500ms.
3. Click any other tab → confirm switch works.
4. Click "מצב פאנל" again → confirm re-render works.
5. Click "קישורים קצרים" → confirm content renders.
6. Repeat in different orders to confirm no race condition.

If any of these fails, the fix didn't take effect (re-pull) OR there's a second cause (escalate).

---

*End of SPEC.*
