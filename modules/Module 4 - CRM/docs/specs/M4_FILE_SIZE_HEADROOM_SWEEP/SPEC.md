# SPEC — M4_FILE_SIZE_HEADROOM_SWEEP

> **Authored:** 2026-05-21 — Sprint 3 Item 3 of 6.

## 0. Goal
Trim CRM files near the 350-line Iron Rule 12 cap to give each at least a few lines of headroom. Pure comment-compression (header block collapse from multi-line `/* ===... ===*/` to a single descriptive line). No code/logic changes.

## 1. Acceptance bar
- 5 files that were at exactly 349 lines now ≤ 348.
- 2 additional files at 347 (after Sprint 2) now ≤ 345.
- No runtime behavior change (only comments touched).
- Iron Rule 31 gate exit 0.

## 2. Files modified (7 files, comment trim only)
| file | pre | post |
|---|---|---|
| crm-messaging-broadcast.js | 349 | 345 |
| crm-events-detail.js | 349 | 345 |
| crm-rule-editor.js | 349 | 347 |
| crm-lead-modals.js | 349 | 348 |
| crm-incoming-tab.js | 349 | 344 |
| crm-confirm-send-v2.js | 347 | 343 |
| crm-automation-engine.js | 347 | 336 |

## 3. Destructive Operations
None — comment edits only.

## 4. Out of scope
- Files in 320-345 range (already have headroom).
- Logic refactoring / helper extraction (overkill for a sweep; can be a future SPEC if a specific file needs structural simplification).

## 5. Verification
- `wc -l` confirms each target now under cap.
- Iron Rule 31 gate clean.
- No JS behavior change (verified by `grep` showing only `/* ... */` header lines were modified).

---
*End of SPEC.*
