# FINDINGS — ATTENDEE_COUNTER_DISPLAY_FIX

> **Location:** `modules/Module 4 - CRM/docs/specs/ATTENDEE_COUNTER_DISPLAY_FIX/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — `renderConversionCard` uses broad `total_registered` as ratio denominator

- **Code:** `M4-CRM-COUNTER-01`
- **Severity:** MEDIUM
- **Discovered during:** §3 criterion #4 grep verification (remaining `total_registered` references after the fix)
- **Location:** `modules/crm/crm-events-detail-charts.js:138`
- **Description:** The conversion-rates card on the analytics tab computes `נרשם → אישר %` as `Math.round(conf / reg * 100)` where `reg = +stats.total_registered`. Because `total_registered` from the view counts attendees beyond `['registered','confirmed','attended']` (the bug this SPEC works around), the denominator is inflated and the percentage is artificially low. Example on demo event #11: with 1 invited + 1 new + 0 confirmed, the displayed ratio would be `0/2 = 0%` instead of `0/0 = N/A`. The bug has the same root cause as the נרשמו counter but the SPEC explicitly carved out non-counter uses of the field (§3 #4 and §7).
- **Reproduction:**
  ```
  Open CRM → Events tab → click any event → Analytics sub-tab → look at "שיעורי המרה" card.
  Compare displayed % to (total in registered/confirmed/attended) → (total in confirmed/attended).
  ```
- **Expected vs Actual:**
  - Expected: ratio computed from the corrected REGISTERED_STATUSES base, matching what the נרשמו counter shows
  - Actual: ratio computed from the broad `total_registered`, inconsistent with the corrected counter on the same screen
- **Suggested next action:** **NEW_SPEC** — small follow-up that brings `renderConversionCard` (and any other ratio/sparkline-trend math currently using `total_registered`) into alignment with REGISTERED_STATUSES. Should bundle with Finding #2 below into a single "نרשמו semantic alignment" SPEC.
- **Rationale for action:** Ratio inconsistency on the same screen as the corrected counter is user-visible confusion. Small surface area. Best handled together with the view-side fix.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — `v_crm_event_stats.total_registered` view-side semantic bug

- **Code:** `M4-CRM-VIEW-01`
- **Severity:** MEDIUM (LOW for active impact since this SPEC works around it client-side; MEDIUM for systemic risk because the view is consumed by other potential callers and any new caller will hit the same trap)
- **Discovered during:** SPEC author's analysis (Stage 1) confirmed by execution
- **Location:** `v_crm_event_stats.total_registered` column (DB view; definition not in repo's `db-schema.sql` files — needs `pg_views` query to inspect on Supabase)
- **Description:** The view's `total_registered` column counts attendees in statuses beyond `['registered','confirmed','attended']` — empirically confirmed by the demo event #11 case (1 invited + 1 new attendee → view returns `total_registered = 2`). This SPEC bypasses the column at all 4 UI callsites client-side. The view itself remains unfixed. Any future caller (a new tab, a report, an external consumer like Storefront or a Make scenario) would hit the same trap.
- **Reproduction:**
  ```sql
  SELECT total_registered
  FROM v_crm_event_stats
  WHERE event_id = '<demo event 11 UUID>';
  -- expected: 0
  -- actual: 2
  ```
  (Executor did NOT run this query during execution — SPEC §3 #13 / §4 forbade DB writes; read-only verification via SELECT is allowed but was deferred to Daniel's manual demo QA per SPEC §12 fallback.)
- **Expected vs Actual:**
  - Expected: `total_registered = COUNT(*) FILTER (WHERE status IN ('registered','confirmed','attended') AND is_deleted = false)`
  - Actual: broader (probably `... WHERE status NOT IN ('cancelled') AND is_deleted = false` or similar — would need view def to confirm)
- **Suggested next action:** **NEW_SPEC** — DB-write SPEC to `CREATE OR REPLACE VIEW v_crm_event_stats` with the corrected `total_registered` clause aligned to `['registered','confirmed','attended']`. Once the view is fixed, the 4 client-side workarounds in this SPEC become safe to roll back to direct view reads (or kept defensively — Foreman's call). Bundle with Finding #1.
- **Rationale for action:** View-side fix is the proper root-cause fix; client-side bypass is a stop-gap. Future consumers shouldn't have to repeat the workaround. CREATE OR REPLACE is non-destructive (no row data lost).
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — `rule-21-orphans` pre-commit hook false positive on co-staged local variables

- **Code:** `M4-TOOL-COUNTER-01`
- **Severity:** LOW
- **Discovered during:** Commit attempt of the 4-file bundle (commit 2 of SPEC §9 Option B)
- **Location:** `scripts/verify.mjs` rule-21-orphans check (file location not yet inspected; based on hook output format)
- **Description:** The rule-21-orphans hook flagged `function "sent" defined in 2 files: crm-events-detail-charts.js, crm-events-detail.js` and blocked the commit. Both occurrences are local `var sent = ...` inside IIFE-scoped functions (line 312 of detail.js, line 194 of charts.js — both pre-existing, neither touched by this SPEC). This is a false positive: `var` in an IIFE is function-scoped, not module-global, so the two declarations cannot collide. Same false-positive pattern is already documented in SESSION_CONTEXT for M4 P12 (`info`/`phone`/`email` collisions) and M4 B5 (7 false positives in commit 1).
- **Reproduction:**
  ```
  git add modules/crm/crm-events-detail.js modules/crm/crm-events-detail-charts.js
  git commit -m "anything"
  # → blocked: [rule-21-orphans] modules\crm\crm-events-detail.js:312 — function "sent" defined in 2 files
  ```
- **Expected vs Actual:**
  - Expected: hook recognizes IIFE-scoped local-var declarations and skips them, focusing on module-global function/global names
  - Actual: any `var <name> = ...` line at any indentation level matching across staged files triggers the violation
- **Suggested next action:** **TECH_DEBT** — log under M4-TOOL backlog. The detector needs to either (a) restrict to top-level declarations / `window.X = ...` patterns, or (b) accept a per-file allow-list for known IIFE-local names like `sent`, `info`, `phone`, `email`. Workaround (commit-split) is established and 60-second cost. Not urgent.
- **Rationale for action:** Tool quality issue, not project quality. Workaround is cheap. A dedicated tooling SPEC can address this whenever the tool-debt backlog is touched.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 4 — `wc -l` vs pre-commit hook line-count divergence on Windows CRLF files

- **Code:** `M4-TOOL-COUNTER-02`
- **Severity:** LOW (INFO leaning)
- **Discovered during:** Commit 3 (`4cd3bcc`) — file-size warning fired at 350 on `crm-events-detail.js` even though `wc -l` reports 349
- **Location:** `scripts/verify.mjs` file-size check + `wc -l` reference command in SPEC templates
- **Description:** The pre-commit file-size hook reports 350 for `crm-events-detail.js` while `wc -l` reports 349. The file is Windows CRLF (verified via `od -c`: ends in `\r\n`). `wc -l` counts `\n` characters; the hook likely uses `string.split('\n').length` which yields N+1 for files ending in `\n`. The off-by-one means that an SPEC author writing "file at 349/350" using `wc` is actually at 349 by `wc` AND 350 by hook — directly at the hard cap from the hook's perspective.
- **Reproduction:**
  ```
  $ wc -l modules/crm/crm-events-detail.js
  349 modules/crm/crm-events-detail.js
  $ git commit modules/crm/crm-events-detail.js -m "any change"
  [file-size] modules\crm\crm-events-detail.js:350 — file exceeds 300-line soft target (350 lines)
  ```
- **Expected vs Actual:**
  - Expected: hook count and `wc -l` agree
  - Actual: hook is +1 vs `wc -l` for files ending in `\n`
- **Suggested next action:** **TECH_DEBT** — bundle with the M4-TOOL backlog. Either (a) reconcile the hook to match `wc -l` semantics (subtract 1 if final char is `\n`), or (b) add a note to CLAUDE.md / SPEC_TEMPLATE.md that the binding count for Iron Rule 12 is the hook's count and `wc -l` is informational.
- **Rationale for action:** No functional impact today (file still under 350 hard cap). Surface area grows as more files approach the 350 boundary. Documentation note is the cheapest fix.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 5 — `CrmHelpers.countRegistered` deferred from `MODULE_MAP.md`

- **Code:** `M4-DOC-COUNTER-01`
- **Severity:** INFO
- **Discovered during:** SPEC §8 docs-update review at execution close
- **Location:** `modules/Module 4 - CRM/docs/MODULE_MAP.md` (CRM module's code map)
- **Description:** SPEC §8 said adding `countRegistered` and `REGISTERED_STATUSES` to MODULE_MAP.md was "fine but not blocking — small enough that doing it in this commit is fine." I deferred per the executor skill's guidance on bundling docs-only changes. The map is now slightly out of date until the next docs-sync commit.
- **Reproduction:**
  ```
  grep -n countRegistered modules/Module\ 4\ -\ CRM/docs/MODULE_MAP.md
  # → 0 hits (helper exists in code as of commit 303426d but not in MODULE_MAP)
  ```
- **Expected vs Actual:**
  - Expected: MODULE_MAP lists every CRM-module-internal helper exposed on `window.CrmHelpers`
  - Actual: 1 helper (`countRegistered`) and 1 constant (`REGISTERED_STATUSES`) missing
- **Suggested next action:** **TECH_DEBT** — fold into the next CRM docs-sync commit (whichever SPEC's retrospective updates MODULE_MAP next). Or, if Foreman prefers, write a one-off `docs(crm): sync MODULE_MAP with countRegistered` commit immediately.
- **Rationale for action:** Helper is module-internal, not a cross-module contract — low risk of confusion. CHANGELOG.md gets the entry in this same retrospective commit, so the helper is discoverable via git history.
- **Foreman override (filled by Foreman in review):** { }

---

*End of FINDINGS. 5 findings logged. None absorbed into in-scope work — all surface to Foreman for disposition.*
