# Activation Prompt — M5 Main-Menu Wiring + Localhost Walkthrough

> Paste the block below into a Claude Code session (same one as M5 if context is healthy).
> Brief: `modules/Module 5 - Customers/architecture-brief/M5_MAIN_MENU_WIRING_BRIEF.md`
> Needs Chrome MCP + localhost ERP.

---

```
M5 main-menu wiring + localhost walkthrough. M5's screens are all 🟢 but the home-screen tile "ניהול לקוחות" in index.html is still status:'coming_soon' (locked) — flip it to active so it's reachable, then start localhost and open the module so Daniel can see it himself. Tiny change. Demo only. No Prizma writes. No merge to main.

Brief: modules/Module 5 - Customers/architecture-brief/M5_MAIN_MENU_WIRING_BRIEF.md

Activate the `opticup-strategic` skill (small SPEC or direct fix per project convention — your call; this is a one-line change + a walkthrough). Read the Brief FIRST.

ITEM A — flip the main-menu tile (one line in index.html):
- The `customers` row in the index.html modules array is currently:
    { id: 'customers', label: 'ניהול לקוחות', icon: '👤', url: 'customers.html', status: 'coming_soon' },
- Change it to match the shape of the existing ACTIVE rows (inventory/debt/shipments/crm):
    status: 'active', permission: 'settings.view'
  (Permission decision settled by Daniel 2026-05-23: same gate as the CRM tile — customers + leads are the same kind of work. A finer customers.view key can come later.)
- Match the CRM row's exact shape (CRM has no `feature` key — likely customers needs none either; mirror CRM).
- Do NOT touch any other tile (finance/lab/attendance stay coming_soon — their UIs aren't built). No render-logic change expected (active+permission path already works for inventory/debt/crm).

ITEM B — start localhost + open for Daniel:
- Run scripts/start-local.ps1 (ERP → localhost:3000).
- Open + report these URLs for Daniel to click through himself:
    http://localhost:3000/index.html?t=demo   (confirm "ניהול לקוחות" tile is now live/clickable, not locked)
    http://localhost:3000/customers.html?t=demo   (the customer list)

CLOSURE (Iron Rule 34 — index.html is browser-consumed):
  (1) Chrome-MCP screenshot of the main menu showing "ניהול לקוחות" active/clickable (not the lock overlay),
  (2) click-through: tile → customers.html → list renders against demo data (screenshot + trace),
  (3) confirm the tile respects settings.view gating like the other active tiles.

Constraints: branch develop; demo only; no Prizma writes; no merge to main. SURGICAL — one line in index.html. **Selective git add by explicit filename (index.html only) — do NOT use git commit -a / git add . (last session's commit -a swept unintended files; explicit-filename add only).** Integrity gate clean. Iron Rules 9 + 21 + 34.

Return ONE Hebrew status line + the two localhost URLs:
  "כפתור 'ניהול לקוחות' פעיל בתפריט הראשי [🟢] (הרשאת settings.view, מאומת Chrome MCP). השרת המקומי רץ — תראה את המודול כאן: http://localhost:3000/index.html?t=demo  +  http://localhost:3000/customers.html?t=demo"
```

---

## Pre-flight checklist for Daniel

- [ ] Chrome MCP available + you're on the machine where you'll view localhost
- [ ] Branch = develop, repo = opticalis/opticup
- [ ] After it finishes: open the two URLs it reports, in your browser, and walk through M5

---

## Expected timing

- Flip the tile + Chrome verify + start localhost + open: ~20-30 min.

---

*End of activation prompt. Tiny menu wiring + a localhost walkthrough so Daniel sees M5 live.*
