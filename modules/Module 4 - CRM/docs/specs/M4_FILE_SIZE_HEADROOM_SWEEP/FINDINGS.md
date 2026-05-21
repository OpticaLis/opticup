# FINDINGS — M4_FILE_SIZE_HEADROOM_SWEEP

## F-01 (resolved) — 5 files at exactly 349 lines (1 below cap)
**Severity:** MEDIUM.
**Resolution:** All 5 trimmed to ≤ 348 via header-banner compression.

## F-02 (resolved) — 2 additional files at 347 (3 lines below cap)
**Severity:** LOW.
**Resolution:** Both trimmed to ≤ 343 via same pattern.

## F-03 (Sprint 4 candidate) — Pre-cap warning at 340 lines
**Severity:** LOW.
**What:** Today the file-size hook errors at >350. A non-blocking warning at >=340 would catch drift earlier without forcing immediate refactor. Would be a one-line addition to `scripts/verify.mjs`.

## F-04 (INFO) — Headers were the lowest-hanging trim
**Severity:** INFO.
**What:** Most of the trimmed files had a 5-line `/* ===... ===*/` banner that compressed to 1 line. For files where this pattern is exhausted, future sweeps need structural refactoring (helper extraction).

---
*End of findings.*
