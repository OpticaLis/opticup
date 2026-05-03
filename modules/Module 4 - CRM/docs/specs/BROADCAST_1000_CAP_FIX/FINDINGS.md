# FINDINGS — BROADCAST_1000_CAP_FIX

> Findings discovered during execution of this SPEC that are NOT inside its scope. One entry per finding. Severity: INFO / LOW / MEDIUM / HIGH / CRITICAL.
> Suggested next-action per entry: new SPEC stub / TECH_DEBT entry / dismiss.

---

## F1 — Supervisor brief's "7 hits + 2 inner = 9 total" decomposition was off

- **Severity:** INFO
- **Location:** `modules/Module 4 - CRM/docs/specs/BROADCAST_1000_CAP_FIX/SUPERVISOR_DECISION.md` §SPEC scope #2 + ACTIVATION_PROMPT.md Section 8 #3
- **Description:** The Supervisor's binding decision said "All 7 resolvers in `crm-automation-recipient-resolvers.js` use `paginateQuery` (grep `paginateQuery` in that file = 7 hits, plus 2 inner queries = 9 hits total)". The actual file structure has **9 distinct recipient-type slugs** (not 7 — the file header comment also says "(7)" but lists 9 slugs across the cluster lines: trigger_lead, tier2, tier2_excl_registered, leads_by_status, attendees, attendees_waiting, attendees_all_statuses, cross_event_active_waitlist, attendees_with_active_coupon). After excluding `trigger_lead` (single-row), the remaining 8 multi-row slugs collapse to **4 distinct query-builder call sites** because the tier2 cluster (3 slugs) shares one query and the attendees cluster (3 slugs) shares one query. So "7 hits in resolvers" was conflating recipient-type-slug count with paginate-call-site count. Actual paginate-call-site math: 4 outer + 2 inner in resolvers = 6, plus 2 in broadcast-filters + 1 in messaging-broadcast = 9 wraps outside `fetchAll`. Adding the 1 wrap inside `fetchAll` + the 1 declaration = 11 grep hits repo-wide. The Foreman corrected this in SPEC §3 criteria #2-#8 with the right numbers; the brief's count is preserved in the dispatch chain for audit.
- **Suggested next action:** **Dismiss** as a one-time count drift; SPEC corrected it before execution. If a future Supervisor brief uses the same "N resolvers + M inner = total" arithmetic, the Foreman should re-decompose by query-builder call sites, not by recipient-type slugs. Worth highlighting in FOREMAN_REVIEW for the Supervisor's awareness.
- **Discovered during:** Foreman authoring; verified by direct read of `crm-automation-recipient-resolvers.js`.

---

## F2 — `docs/GLOBAL_MAP.md` registry append for `paginateQuery` was skipped

- **Severity:** LOW
- **Location:** `docs/GLOBAL_MAP.md` (~600+ lines)
- **Description:** SPEC §8 said the executor should append a single-line entry for `paginateQuery` to `docs/GLOBAL_MAP.md`'s function registry, but conditioned this on "if the file's structure makes the entry placement ambiguous, log a finding and skip". I judged the placement non-trivial (the registry has multiple plausible sections — Shared Helpers, DB Functions, ERP Globals — and inserting in the wrong section would create a real Rule 21 documentation drift) and skipped per SPEC. The new function `paginateQuery` is therefore live in code (visible to all callers via top-level declaration in `js/supabase-ops.js`) but absent from the master function registry until a follow-up edit lands. **Net effect today:** anyone searching `docs/GLOBAL_MAP.md` for "paginateQuery" gets 0 hits and might not realize the helper exists, potentially leading to a parallel implementation (Rule 21 violation). Mitigated by: (a) it's right next to `fetchAll` in `js/supabase-ops.js`, which IS in GLOBAL_MAP; (b) any future Foreman doing Step 1.5 Cross-Reference Check on a "paginate" topic will grep `js/` and `modules/` directly and find it.
- **Suggested next action:** **Foreman handles in FOREMAN_REVIEW.md** — either fold it into the post-QA cleanup commit or open a tiny housekeeping SPEC `GLOBAL_MAP_PAGINATEQUERY_REGISTRY` that appends the single line. The wording for the entry: `paginateQuery(builder, pageSize=1000)` — `js/supabase-ops.js` — pagination engine (Rule 21 single source); `fetchAll` wraps it; CRM resolvers + broadcast paths call directly to bypass the PostgREST 1000-row cap.
- **Discovered during:** SPEC §8 conditional eval at execution time.

---

## F3 — Rule 7 still partially violated by resolvers (raw `sb.from()` calls inside `paginateQuery(...)`)

- **Severity:** INFO (acknowledged design tension)
- **Location:** `modules/crm/crm-automation-recipient-resolvers.js` (all 6 paginate sites), `modules/crm/crm-broadcast-filters.js` (2 sites), `modules/crm/crm-messaging-broadcast.js` (1 site)
- **Description:** This SPEC eliminates the cap leak but leaves the resolvers calling `sb.from(...).select(...).eq(...)` directly inside `paginateQuery(...)`. Iron Rule 7 requires DB I/O via `shared.js` helpers (`fetchAll`, `batchCreate`, etc.), with the documented exception of "specialized joins impossible through helpers". The PostgREST joins like `crm_leads(id, full_name, phone, email, unsubscribed_at, is_deleted)` legitimately fall under the exception (current `fetchAll` signature does not support nested-select shapes), so this is technically compliant — but a future Module 1.5 SPEC could thread these through a typed wrapper (e.g. `DB.fetchJoin(table, select, filters)`) that encapsulates the pattern AND uses `paginateQuery` internally, closing the Rule 7 gap fully. Out of scope for this SPEC per §7 explicitly.
- **Suggested next action:** **TECH_DEBT entry** — add `M4-DEBT-RULE7-RESOLVERS` to `docs/TECH_DEBT.md` (or equivalent module-level tracker): "9 paginate call sites in CRM still use raw `sb.from(...)` inside `paginateQuery(...)`. Acceptable under Rule 7's specialized-join exception. Revisit when Module 1.5 ships a typed `DB.fetchJoin` wrapper."
- **Discovered during:** Iron-Rule self-audit (EXECUTION_REPORT §6, Rule 7 row).

---

## Cross-Reference Check evidence (Iron Rule 21, Step 1.5)

- `grep -rn "paginateQuery" js/ modules/ shared/` BEFORE edit → 0 hits (no prior pagination helper).
- `grep -rn "function fetchAll" js/ shared/` → 1 hit (`js/supabase-ops.js:34` pre-edit; `js/supabase-ops.js:54` post-edit).
- `grep -rn "\.range(" js/ modules/crm/` BEFORE edit → 1 hit (inside the original `fetchAll`). AFTER edit → 1 hit (inside `paginateQuery` only).
- Result: 0 collisions / 1 new helper introduced as the SOLE pagination engine repo-wide. Rule 21 satisfied.

---

## Reverse-callsite report (per Auto-Engine SE-2 inherited proposal — only when deletions are in scope)

**N/A** — this SPEC deletes no files, so the reverse-callsite proposal does not apply. Recorded explicitly so future audits can see the proposal was considered, not skipped.
