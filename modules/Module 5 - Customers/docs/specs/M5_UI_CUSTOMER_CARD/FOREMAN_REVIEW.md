# M5_UI_CUSTOMER_CARD — Foreman Review

> **Role:** opticup-strategic (Foreman, post-execution review)
> **Authored:** 2026-05-23 close
> **Subject:** SPEC + EXECUTION_REPORT + FINDINGS + TEST_REPORT + REVIEW for `M5_UI_CUSTOMER_CARD`
> **Commit range:** `804bc32` (SPEC seal) → `d59f838` (REVIEW.md) + this close commit.

## SPEC quality audit

- **Measurable success criteria?** Yes — 30 success criteria with exact expected values (DB query results, file counts, smoke states). The Reviewer + Executor both worked off the same matrix; no ambiguity surfaced at execution-time except the cosmetic "8 files vs 9" count (F-1).
- **Stop triggers clear?** Yes — §5 enumerated 6 specific deviation triggers beyond CLAUDE.md §9. The smoke caught real deviations (T-orders fetch error, T-edit DB.update error) and the Executor stopped + fixed in-loop without escalating.
- **Autonomy envelope appropriate?** Yes — Daniel-in-loop checkpoints C1, C2, C3 were narrow and specific; none fired. The Executor stayed within envelope (selective git add, no Prizma writes, no main merge).
- **Daniel-in-loop discipline followed?** Yes — 4 pre-seal judgment points (D-T2, D-T5, D-BADGES, D-EDIT) all settled in chat BEFORE the SPEC was sealed. The codified §0.D table prevented mid-build re-questioning.
- **What the SPEC missed:**
  - **§3 #24 file-count drift:** SPEC said "8 files" in the backup but listed 9. Cosmetic. F-1 + P-AUTHOR-1 below.
  - **§10 Dependencies omitted the page-boot auth precondition.** The SPEC said "Local ERP stack must be up" + "Demo tenant resolution working" but did NOT call out that any new ERP page reading customer-scoped data must invoke `loadSession()` to inject the PIN-issued JWT into `sb`. F-6 caught it at smoke time; should have been an explicit precondition in §10. P-AUTHOR-2 below.
  - **§3a smoke matrix didn't anticipate the Locked-badge-unreachable trap.** The smoke T5 assumed the Locked badge would light up after toggling is_deleted, but didn't notice that the same toggle would make the card render "customer not found" because the views filter is_deleted=false. The SPEC could have caught this in §0 Runtime semantics rehearsal. F-T5-DESIGN.

## Execution quality audit

- **Did the Executor follow the SPEC?** Yes, with maximum-autonomy discipline. 5 logically-scoped commits in plan order. Selective `git add` throughout (pre-existing dirty files left alone). No Prizma writes. No main touches.
- **Deviations handled correctly?** Yes — the 3 smoke-caught bugs (auth gap, orders columns, DB.update sig) were fixed in a single dedicated commit (`7287852`) with clear messaging — not silently absorbed.
- **Spot-checks (3 of largest claims):**
  1. **"8 new JS files all ≤ 350 lines"** — `wc -l modules/customers/*.js`: largest = `customer-card-tab-details.js` 247. Verified.
  2. **"customers.html in root-allowlist + CLAUDE.md §0.5"** — both grep hits land. Verified.
  3. **"customer-docs bucket exists + 4 RLS policies"** — `SELECT FROM storage.buckets / pg_policies` confirmed bucket public=false + 4 policies SELECT/INSERT/UPDATE/DELETE tenant-gated. Verified.
- **Chrome MCP closure evidence quality:** runtime traces (T3 / T7 / T9) are real and show the expected event order with millisecond timestamps. DB-write evidence is real (pre-state count + post-state count + revert). Screenshots: 4 saved; full-page PNG screenshots intermittently timed out (Chrome MCP `Page.captureScreenshot timed out`), but a11y snapshots embedded in TEST_REPORT.md provide equivalent structural-fidelity proof — Iron Rule 34 acceptable per the rule's "(b) runtime trace + (c) DB-write evidence" branch.
- **Self-assessment accuracy:** Executor scored 8/9/9/8. Foreman concurs. The Executor's honesty about the file-size cap warning + the smoke-caught bugs is the discipline working as designed.

## Findings processing

`FINDINGS.md` lists 11 items. Foreman decisions:

| # | Severity | Foreman decision | Action |
|---|---|---|---|
| F-1 | INFO | Dismiss; codify via P-AUTHOR-1. | This FOREMAN_REVIEW carries the proposal. |
| F-2 | LOW | TECH_DEBT → future M5 column-expansion SPEC. | `customer_documents.size_bytes` + `mime_type` + `description` added when Tab 5 needs richer display. |
| F-3 | LOW | TECH_DEBT → M7-future SPEC. | `v_order_total` view or `compute_order_total(order_id)` RPC, then Tab 4 can re-add the column. |
| F-4 | LOW | Resolved in `7287852`. | FK hint pattern now established for any future M7-consuming page. |
| F-5 | LOW | Resolved in `7287852`. | P-EXEC-2 codifies the `DB.*` signature reference for future SPECs. |
| F-6 | MEDIUM | Resolved in `7287852` + queue for `auth-service.js` `authReady()` extraction. | New TECH_DEBT entry: extract `authReady()` helper. |
| F-7 | LOW | **APPLIED at close (this commit)**. | Tab 3 R/L double-prefix → 1-line render fix. Reviewer recommendation honored. |
| F-T5-DESIGN | MEDIUM | TECH_DEBT → Foreman decision: **remove the Locked badge UI in a follow-up** (not in this close). Adding an include-deleted card mode is over-scope for what is essentially an audit-only flow; the badge is misleading otherwise. | Document in M5 SESSION_CONTEXT "what's next" + new TECH_DEBT entry. |
| F-8 | LOW | TECH_DEBT → file-split SPEC. | `js/shared-field-map.js` per-module split before the next module's M5-class FIELD_MAP entries are added. |
| F-9 | INFO | Out-of-scope (pre-existing CLAUDE.md drift). | Sentinel Mission 10 sweep. |
| F-10 | INFO | Dismiss (test artifact only). | The smoke harness's synthetic-event double-fire is not a production bug. |

No reopener-class findings. The card is functional + secure + well-bounded.

## 2 author-skill (opticup-strategic) improvement proposals

### P-AUTHOR-1 — Per-file backup manifest in §0 Baselines, not a project-wide sum

**Symptom:** SPEC §3 #24 said "8 files" but listed 9 explicit paths. The author counted "M5 docs = 6" without including js/shared.js + js/shared-field-map.js explicitly. Cosmetic; harmless this time, but the same axis is what produced M5_SCHEMA's "40 columns vs actual 42" sum-of-additions error (M5_SCHEMA P-AUTHOR-1).

**Proposed change:** Update `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §0 Baselines section with a new sub-bullet:

> **For backup-folder criteria:** §0 must pin a BULLETED list of the exact file paths to back up, named `BASE_BACKUP_PATHS`. §3 success criteria reference the COUNT of `BASE_BACKUP_PATHS` symbolically (e.g., "Backup folder has `count(BASE_BACKUP_PATHS)` files"). Avoids the sum-of-additions class of error that bit both M5_SCHEMA (40 vs 42 cols) + M5_UI_CUSTOMER_CARD (8 vs 9 backup files).

**Acceptance:** Next SPEC with a backup-folder criterion uses the pinned-list pattern. Next module-close FOREMAN_REVIEW verifies.

### P-AUTHOR-2 — Page-boot auth precondition in §10 Dependencies for any new ERP-page SPEC

**Symptom:** F-6 (the card needed `loadSession()` to inject the PIN-issued JWT) was caught by the smoke at runtime instead of being declared in §10 Dependencies / §5 Stop-Triggers at author time. The SPEC said "Local ERP stack on http://localhost:3000 must be up" but didn't enumerate the page-boot sequence (tenant resolution → session injection → first DB read). A new ERP-page SPEC that doesn't think through this will hit the same trap.

**Proposed change:** Update `opticup-strategic` SKILL.md "SPEC Authoring Protocol — Step 3 — Populate the Folder with SPEC.md" with a new mandatory sub-bullet:

> **For SPECs that ship a new ERP root HTML entrypoint:** §10 Dependencies MUST list the page-boot sequence explicitly: (a) `resolveTenant()` (auto-fired by shared.js); (b) `loadSession()` from `auth-service.js` — REQUIRED before any `DB.select`/`sb.from()` against customer-scoped tables, because the customer views use `security_invoker=on` and the underlying RLS USING clause needs the PIN-issued JWT's `tenant_id` claim; (c) the friendly "not authenticated" UX if `loadSession()` returns null. Reference: `M5_UI_CUSTOMER_CARD/FINDINGS.md` F-6.

**Acceptance:** Next ERP-page SPEC (Phase E, M7 UI, etc.) declares the page-boot sequence in §10 Dependencies. FOREMAN_REVIEW verifies.

## 2 executor-skill (opticup-executor) improvement proposals

### P-EXEC-1 — Page-boot auth pattern probe at Step 1.5 DB Pre-Flight (mirror of P-AUTHOR-2)

**Symptom:** F-6 — same root cause as P-AUTHOR-2 but from the Executor's side. The Executor's Step 1.5 DB Pre-Flight should grep an existing equivalent entrypoint and identify the auth pattern BEFORE writing the page bootstrap JS.

**Proposed change:** Add to `opticup-executor` SKILL.md "Step 1.5 — DB Pre-Flight Check (MANDATORY...)" a new sub-bullet (after item 9):

> **10. Page-boot auth pattern probe (when SPEC adds a new ERP root HTML entrypoint):** before writing the page bootstrap JS, grep an existing equivalent entrypoint (e.g. `crm.html`, `inventory.html`) for the auth-injection pattern. Identify whether `loadSession()` (or equivalent) is the prerequisite for any DB read via `DB.select`/`sb.from()`. Document the page-boot sequence in EXECUTION_REPORT §3 §"What Was Done" as a one-line precondition: "auth-injection: `await loadSession()` between tenant resolution and first DB read". Mismatch → ESCALATE. Skipping this delegates discovery to the smoke, which costs an iteration.

**Acceptance:** Next ERP-page-introducing execution surfaces the page-boot auth precondition before code-write, not at smoke time.

### P-EXEC-2 — `DB.*` wrapper signature reference doc + Pre-Flight check

**Symptom:** F-5 (`DB.update('customers', { id: ... }, ...)` vs the actual signature `(table, idScalar, changes, opts)`) cost a smoke iteration to discover. The DB wrapper is the canonical Iron Rule 7 pattern, but its argument shapes are spread across `shared/js/supabase-client.js`. New code or pre-warmed sessions re-derive the signature by guessing.

**Proposed change:** Add a new reference file `.claude/skills/opticup-executor/references/DB_WRAPPER_API.md` with one-line signatures + tiny canonical examples for each of `DB.select / DB.insert / DB.update / DB.batchUpdate / DB.softDelete / DB.hardDelete / DB.rpc`. Update `opticup-executor` SKILL.md "Code Patterns — Database patterns" section to reference the file. Pre-Flight check item: any new code that uses `DB.update` / `DB.softDelete` / `DB.hardDelete` should cross-check against the reference before commit.

**Acceptance:** Next SPEC that uses `DB.update` doesn't repeat the `{ id: ... }` mistake. The reference file is greppable.

## Master-doc update checklist

| File | Status | Notes |
|---|---|---|
| `MASTER_ROADMAP.md` §3 row #5 | ✅ updated this commit | Customer row now reflects Phase A+B + leads-migration + Phase D card CLOSED 2026-05-22→23. |
| `docs/GLOBAL_MAP.md` | ✅ updated in `a83516b` | New "Module 5 — Customer Card UI" subsection. |
| `docs/GLOBAL_SCHEMA.sql` | N/A | No new tables/views/RPCs this SPEC; existing schema unchanged. |
| `docs/DB_TABLES_REFERENCE.md` | N/A | No new T constants this SPEC. |
| `docs/FILE_STRUCTURE.md` | ✅ updated in `a83516b` | New customers.html row + new modules/customers/ folder. |
| `js/shared.js` | N/A | No new T constants needed (existing ones cover all consumed tables). |
| `js/shared-field-map.js` | ✅ updated in `a83516b` | 6 M5 FIELD_MAP entries. At 350-line cap; split TECH_DEBT logged. |
| `CLAUDE.md` §0.5 | ✅ updated in `14d5d75` | customers.html added to Category 3. |
| `scripts/checks/root-allowlist.json` | ✅ updated in `14d5d75` | customers.html added. |
| `modules/Module 5 - Customers/MODULE_5_ROADMAP.md` | ✅ updated in `e246c52` | Phase D ⬜→✅ |
| `modules/Module 5 - Customers/docs/SESSION_CONTEXT.md` | ✅ updated in `e246c52` | Phase D state + 7-item "what's next" list. |
| `modules/Module 5 - Customers/docs/CHANGELOG.md` | ✅ updated in `e246c52` | Phase D entry with 4 commit hashes. |
| `modules/Module 5 - Customers/docs/MODULE_MAP.md` | ⏳ Pending | The MODULE_MAP file is schema-focused; Phase D added UI files, not schema. The new UI surface is captured in GLOBAL_MAP §"Module 5 — Customer Card UI" subsection. Could add a "UI Surfaces" section to MODULE_MAP for completeness — proposing as a separate small SPEC (or pick up in Phase E). |
| `MODULE_SPEC.md` | N/A | Business logic unchanged. |

## Verdict

🟡 **CLOSED WITH FOLLOW-UPS.**

All 30 §3 success criteria are hit or have documented findings. Iron Rule 34 closure evidence is real, captured, and Foreman-spot-checked. The card works end-to-end on demo with proper PIN authentication. The render+action wiring pattern is now established for every later M5-M9 UI screen to copy.

**Documented follow-ups (not blockers):**
- **F-T5-DESIGN:** remove the Locked badge OR add an include-deleted card mode (Daniel-judgment).
- **F-2 + F-3:** schema column expansions (`customer_documents.{size_bytes,mime_type,description}` + orders `total_amount` aggregation).
- **F-6 follow-up:** extract `authReady()` helper into `auth-service.js`.
- **F-8:** split `js/shared-field-map.js` per-module before the next FIELD_MAP-heavy SPEC.
- **Phase E:** customer list + create-mode (reuses entrypoint).
- **Tab 2 follow-up:** M6 ships `v_customer_vision_function_history` → Tab 2 stub lights up.

The 2 author + 2 executor improvement proposals above feed the next session's skill-improvement sweep. The next opticup-strategic session checks recent FOREMAN_REVIEWs and applies accumulated proposals to the skill files.

Phase D 🟢. Move to Phase E when Daniel directs.
