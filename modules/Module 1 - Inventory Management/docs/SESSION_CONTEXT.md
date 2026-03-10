# Optic Up — Session Context

> Update this file at the end of every session. It is the first thing read in every new session.

---

## Current Status — March 2026

### What's Done
| Goal | Description | Commit |
|------|-------------|--------|
| Goal 1 ✅ | Airtable legacy cleanup — removed `rowToRecord`/`fieldsToRow`, replaced with `enrichRow` | `bb92630` |
| Goal 2 ✅ | File splitting — 8 monoliths → 30 files, all under 350 lines | `673e506` |
| Goal 0.5 ✅ | Folder reorganization — `js/` (4 globals) + `modules/` (7 subfolders) | `8b58b58` |
| Goal 4 ✅ | Code cleanup — removed debug code, dead functions, stale comments (-42 lines) | `38abb0c` |
| Goal 3 ✅ | MODULE_MAP.md created — 856 lines, full codebase reference | `01d86e9` |
| Goal 0 ✅ | Atomic quantity updates — replaced all client-side qty calculations with Supabase RPC (`increment_inventory` / `decrement_inventory`) in 5 functions across 4 files | `62381b7` |
| Phase 2a ✅ | Stock Count module — full flow: list screen, session with camera scanning + worker PIN, diff report, approval + writeLog, Excel export | `f3c5f0f`, `c8bcaa3` |

### Current File Structure
```
js/                        ← 4 global files (load first)
├── shared.js              (184 lines)
├── supabase-ops.js        (184 lines)
├── data-loading.js        (166 lines)
└── search-select.js       (135 lines)

modules/
├── inventory/             ← 7 files
├── purchasing/            ← 5 files
├── goods-receipts/        ← 4 files
├── audit/                 ← 3 files
├── brands/                ← 2 files
├── access-sync/           ← 3 files
├── stock-count/           ← 3 files
└── admin/                 ← 2 files
```

---

## What's Next — Phase 2b

### Phase 2b Features (ROADMAP פאזה 2)
1. **Access Bridge** — Node.js Folder Watcher on Dropbox
   - Read sales Excel → auto-update quantities
   - "Pending" screen for unrecognized barcodes
   - Export new inventory to Access
   - Windows Service with auto-restart

---

## Open Decisions
| Decision | Status | Notes |
|----------|--------|-------|
| Atomic updates via Supabase RPC | ✅ Done | `62381b7` — 5 functions across 4 files |
| PIN verification → server-side RPC | Planned | Future (currently client-side) |
| favicon.ico | Minor | 404 on GitHub Pages — cosmetic only |

---

## Known Issues
| Issue | File | Severity | Notes |
|-------|------|----------|-------|
| `loadPOsForSupplier` console warning | `goods-receipts/goods-receipt.js` | Low | Fires when receipt tab loads without supplier selected. Non-blocking. |
| ~~`scanned_by` column missing~~ | `stock-count/stock-count-session.js` | ✅ Resolved | Was missing from migration 013 — fixed in migration 014 (`c8bcaa3`) |

---

## How to Use This File
- **Claude Code:** reads this at session start, confirms status, then proceeds with task
- **Strategy chat (like this one):** reads this to understand where we are before planning next steps
- **Update rule:** whoever closes a session updates this file — what was done, what commit, what's next
