# Brief — M5 Main-Menu Wiring + Localhost Walkthrough

> **Author:** opticup-architect (Cowork) · **Date:** 2026-05-23
> **Activation Prompt:** `M5_MAIN_MENU_WIRING_ACTIVATION_PROMPT.md` (sibling — paste THAT into Claude Code).
> **Type:** tiny wiring fix + a localhost walkthrough so Daniel can SEE M5 himself.
> **Why:** M5's screens are all 🟢, but the main-menu (`index.html`) tile for "ניהול לקוחות" is still `status: 'coming_soon'` with no permission — so the button is locked and Daniel can't reach the module from the home screen. Every prior M5 SPEC built the screens but none flipped the menu tile.

---

## 0. One-paragraph summary

The customer module is built and works on localhost (proven by the Phase D/E Chrome-MCP smokes). It's just not reachable from the main menu yet: the home-screen tile is flagged "coming soon." This SPEC does two small things — (1) flip the `customers` tile in `index.html` from `coming_soon` to `active` with a permission key so it's a real, clickable, permission-gated button, and (2) start the local server and open the screen so Daniel can walk through M5 himself. Demo only. No Prizma writes. No merge to main.

## 1. Item A — flip the main-menu tile (the only code change)

In `index.html` the modules array has one row per tile, e.g.:
```
{ id: 'customers', label: 'ניהול לקוחות', icon: '👤', url: 'customers.html', status: 'coming_soon' },
```
Every ACTIVE tile follows the pattern `status: 'active', permission: '<key>', feature: '<flag>'` (see `inventory`, `debt`, `shipments`, `crm` rows). The `customers` row must match that pattern.

**Required change:** flip the `customers` row to:
```
status: 'active', permission: 'settings.view'
```
**Permission decision (settled, Daniel 2026-05-23):** use `permission: 'settings.view'` — the same gate as the CRM tile. Rationale: customers + leads are the same kind of work (people), handled by the same staff; consistent + simplest now. A dedicated finer-grained `customers.view` key can be added later when the permissions module is extended.

- Match the EXACT shape of the other active rows (status + permission; add `feature` only if the other people-modules use one — CRM does not, so likely no `feature` key needed; match CRM's shape).
- Do NOT touch any other tile (finance/lab/attendance stay `coming_soon` — their modules' UI isn't built).
- Verify the menu's render logic already handles `active` + `permission` correctly (it does for inventory/debt/etc — this row just joins them; no render-code change expected).

## 2. Item B — start localhost + open the screen for Daniel

After the flip:
- Start the local ERP server (`scripts/start-local.ps1` → ERP on `localhost:3000`).
- Open the customer module so Daniel can see it: the list at `http://localhost:3000/customers.html?t=demo` and confirm the main-menu tile (`http://localhost:3000/index.html?t=demo`) now shows "ניהול לקוחות" as a live, clickable button (not greyed/locked).
- Report the exact URLs back to Daniel so he can click through himself.

## 3. Closure gate — Iron Rule 34 (UI change touches index.html)

Because this changes a browser-consumed file (`index.html`), close with:
1. **Chrome-MCP screenshot** of the main menu showing the "ניהול לקוחות" tile now active/clickable (not the locked overlay).
2. **A click-through trace/screenshot**: clicking the tile navigates to `customers.html` and the list renders against demo data.
3. Confirm permission gating: the tile respects `settings.view` (visible to a permitted role, hidden/locked otherwise) — match how the existing active tiles behave.

## 4. Constraints

- Branch develop. Demo only. No Prizma writes. No merge to main.
- Surgical edit — ONE line in `index.html` (the customers row). No other tiles, no render-logic changes unless the active+permission path genuinely needs it (it shouldn't — other tiles already use it).
- Iron Rules: 9 (no hardcoded business values — label/permission follow the existing pattern), 21 (reuse the existing menu render path — don't add a parallel mechanism), 34 (Chrome verify the tile + click-through).
- Integrity gate clean; **selective git add by explicit filename** (`index.html` only — last session's `git commit -a` swept unintended files; do NOT repeat — explicit-filename add only).
- Same Claude Code session if healthy; this is tiny.

## 5. What Daniel has at the end

"ניהול לקוחות" is a real, clickable button on the home screen, permission-gated like every other live module — and the local server is running with the screen open so Daniel can walk through the full M5 module (list → search → open card → 5 tabs → create) himself, live, on demo.

---

*End of Brief. Tiny menu wiring + a localhost walkthrough. Demo only. No merge to main.*
