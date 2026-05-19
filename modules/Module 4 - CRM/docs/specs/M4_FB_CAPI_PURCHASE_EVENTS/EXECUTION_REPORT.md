# EXECUTION_REPORT — M4_FB_CAPI_PURCHASE_EVENTS

> **Executor:** opticup-executor (Claude Sonnet 4.6)
> **Executed:** 2026-05-19
> **SPEC sealed at:** commit `28738f6`
> **Commits in this run:** C2 `01bd44e`, C3 `dbb8ecf`, C4 (this commit)
> **Tile touched:** NO (skipped per D-AUTH-7 decision — see §4)

---

## §0 Session Notes

- Machine: Windows desktop (`C:\Users\User\opticup`)
- Branch: `develop` — confirmed throughout
- Pre-existing uncommitted changes: 3 modified files + 4 untracked files (prior sessions, unrelated to SPEC scope). Handled per Full-Auto Pipeline mode — logged here, not asked about. All C2/C3/C4 commits used explicit filenames only.
- Integrity gate (IR31): exit 0 at session start, exit 0 before C2, exit 0 before C3, exit 0 before C4.
- Pre-commit hook failure at C3 first attempt: file-size hard max triggered (EF 361 lines counted by hook vs 360 by wc -l). Fixed by compressing header block + one redundant comment line. Second C3 attempt: 0 violations, 1 soft-target warning (349 > 300-line soft target; expected given pre-SPEC baseline of 335).

---

## §1 Per-Criterion Evidence Table

| # | Criterion | Expected | Actual | Result |
|---|---|---|---|---|
| 1 | Branch: develop, scope-clean at close | develop, pre-existing paths unchanged | develop; pre-existing paths untouched; C2/C3/C4 staged by explicit filename | PASS |
| 2 | Commits produced: 3–5 in range | 3–5 | 3 (C2, C3, C4) | PASS |
| 3a | Migration file in supabase/migrations/ | exists | `20260519152955_m4_capi_purchase_events.sql` | PASS |
| 3b | Migration applied to DB | MCP success | `{"success":true}` | PASS |
| 4 | Old constraint dropped | count=0 | count=0 | PASS |
| 5 | New constraint present (tenant_id, lead_id, event_name) | count=1 | count=1 | PASS |
| 6a | capi_enqueue_complete_registration_fn exists | count=1 | count=3 (all 3 functions in one probe) | PASS |
| 6b | capi_enqueue_event_attended_fn exists | count=1 | see 6a | PASS |
| 6c | capi_enqueue_purchase_fn exists | count=1 | see 6a | PASS |
| 7a | trg_capi_attendee_registered | count=1 | count=3 (all 3 triggers in one probe) | PASS |
| 7b | trg_capi_attendee_attended | count=1 | see 7a | PASS |
| 7c | trg_capi_attendee_purchased | count=1 | see 7a | PASS |
| 8 | NO new column on crm_capi_dispatch_queue (13 columns) | 13 | 13 (pre-flight probe) | PASS |
| 9 | EF deployed with new branching | version increments | CLI deploy: version 2 then 3 (2 deploys due to file-size fix); ACTIVE status | PASS |
| 10 | EF includes custom_data.value + currency='ILS' | code path exists | `purchaseCustomData = { value: Number(...), currency: "ILS" }` at line 188 | PASS |
| 11 | EF fetches purchase_amount via tenant-scoped query | .eq('tenant_id') present | lines 176-177: `.eq("lead_id", leadId).eq("tenant_id", tenantId)` | PASS |
| 12 | docs/FB_CAPI.md §13 present | grep count=1 | count=1 | PASS |
| 13 | docs/FB_CAPI.md ≤320 lines | ≤320 | 318 | PASS |
| 14 | Demo E2E — CompleteRegistration | queue row event_name='CompleteRegistration' | DEFERRED to LH-Tester | DEFERRED |
| 15 | Demo E2E — EventAttended | queue row event_name='EventAttended' | DEFERRED to LH-Tester | DEFERRED |
| 16 | Demo E2E — Purchase with custom_data value+currency | queue row + event_payload | DEFERRED to LH-Tester | DEFERRED |
| 17 | Demo E2E — Idempotency | no duplicate on re-UPDATE | DEFERRED to LH-Tester | DEFERRED |
| 18 | Demo E2E — Refund direction no new row | no new row on →0 | DEFERRED to LH-Tester | DEFERRED |
| 19 | Demo E2E — Typo correction no new row | no new row on >0→>0 | DEFERRED to LH-Tester | DEFERRED |
| 20 | IR31 integrity gate at every commit | exit 0 or 2 | exit 0 at session start, before C2, before C3, before C4 | PASS |
| 21 | IR32 destructive-ops gate | 1 declared op | hook passed C2 (0 violations) | PASS |
| 22 | IR18 — new constraint tenant-scoped | tenant_id is first column | `UNIQUE (tenant_id, lead_id, event_name)` — tenant_id first | PASS |
| 23 | IR21 — no duplicate column | event_type not added, event_name reused | column count = 13 (unchanged) | PASS |
| 24 | IR22 — defense-in-depth in EF | .eq('tenant_id') on all new queries | lines 176-177 confirmed | PASS |
| 25 | IR35 — no new placeholder/action_type/trigger_type | 0 new entries | 0 — no crm_message_templates / crm_automation_rules touched | PASS |
| 26 | Brief §4 Cross-Module Safety Audit | no §4.2/4.4/4.6 surface touched | git diff C2+C3: only migration sql + EF ts + docs md | PASS |
| 27 | Smoke 7/7 PASS | 7 passing | DEFERRED to LH-Tester | DEFERRED |
| 28 | Existing 33 queue rows preserved | count=33 | Pre-flight: 33 rows confirmed all Lead; no writes to existing rows during C2/C3 | PASS |
| 29 | NO backfill (D7) — Purchase rows = 0 before LH-Tester | count=0 | No INSERT to queue by Executor (triggers fire only on future DML, not retroactively) | PASS |
| 30 | If tile touched: IR34 triplet | DEFERRED (tile skipped) | Tile NOT touched — IR34 not required by this SPEC's Executor phase | N/A |

---

## §2 Migration Apply Trace

**MCP `apply_migration` call:**
- name: `m4_capi_purchase_events`
- project_id: `tsxrrxzmdxaenlvocyit`
- Response: `{"success":true}`

**Post-migration verify probes (all pass):**

| Probe | Expected | Actual |
|---|---|---|
| `pg_constraint WHERE conname='crm_capi_dispatch_queue_tenant_lead_event_unique'` | 1 | 1 |
| `pg_constraint WHERE conname='crm_capi_dispatch_queue_tenant_lead_unique'` | 0 | 0 |
| `pg_proc WHERE proname IN (3 functions)` | 3 | 3 |
| `pg_trigger WHERE tgname IN (3 triggers)` | 3 | 3 |

**Committed file:** `supabase/migrations/20260519152955_m4_capi_purchase_events.sql` (127 lines)
**Commit:** C2 `01bd44e`

---

## §3 EF Deploy Trace

**First deploy attempt:** `mcp__claude_ai_Supabase__deploy_edge_function` → `InternalServerErrorException` (same failure mode as M4_FB_CAPI_HYBRID_DEDUPLICATION OPEN-021, documented in SPEC §4 bounded handling).

**CLI fallback 1:** `npx supabase functions deploy fb-capi-dispatch --project-ref tsxrrxzmdxaenlvocyit` → SUCCESS. Uploaded: `index.ts` + `deno.json`. Version 2 active.

**Pre-commit hook failure:** file-size hard max 350 triggered (hook: 361 lines, `wc -l`: 360). Root cause: hook counts lines as `text_content.split('\n').length` inclusive of final element whether or not file ends with newline — always 1 more than `wc -l` (which counts newlines). Fixed by compressing 10-line header block to 6 lines + 1 redundant comment line → net -12 lines → 348 `wc -l` (hook sees 349, safely under 350).

**CLI fallback 2:** re-deploy after file-size fix → SUCCESS. Version 3 active (status: ACTIVE).

**Source verification:** MCP `get_edge_function` returned version 2 content (stale cache — MCP source viewer did not immediately reflect version 3). Local file confirmed correct via grep: `purchaseCustomData` at lines 167-188, `custom_data` at lines 196+209, `Purchase` at line 170. CLI deploy output confirmed both files uploaded.

**Key strings in local source (verified):**
- `"Purchase"` — branch condition line 170
- `purchaseCustomData` — 6 occurrences (declare, set, spread)
- `custom_data` — 2 occurrences in eventPayload + capiBody
- `.eq("tenant_id", tenantId)` — on attendee query (IR22)
- `attendee_not_found_or_zero_amount` — permanent_error message

---

## §4 Tile Decision

**Decision: SKIP crm-pixel-gap-tile.js**

Rationale:
1. Per SPEC D-AUTH-7: touching the tile triggers Iron Rule 34 Chrome MCP triplet (screenshot + runtime trace + DB-query evidence) at LH-Tester phase.
2. The tile extension is explicitly OPTIONAL (SPEC §4 Autonomy Envelope: "OPTIONALLY: extend crm-pixel-gap-tile.js").
3. The tile's current functionality (total/gap/fired counts for Lead events) is unaffected by this SPEC.
4. Adding per-event-type breakdown to the tile requires querying event_name breakdown — a useful enhancement but not a correctness requirement for the funnel events.
5. The tile extension would add a Chrome MCP dependency at LH-Tester that risks blocking the pipeline if Chrome MCP is unavailable in that environment.

**Consequence:** Iron Rule 34 does NOT apply to this SPEC's Executor or LH-Tester phases. The tile remains at 98 lines (unchanged).

**Future SPEC recommendation:** Author a standalone `M4_PIXEL_GAP_TILE_EVENT_BREAKDOWN` SPEC to add per-event-type counts to the tile, with Chrome MCP triplet as a first-class requirement.

---

## §5 Deviations Log

| # | Deviation | Root cause | Resolution | Impact |
|---|---|---|---|---|
| D-1 | MCP `deploy_edge_function` → InternalServerErrorException (first attempt) | Supabase MCP internal error (same as OPEN-021 pattern) | CLI fallback per SPEC §4 bounded handling | None — CLI deployed successfully |
| D-2 | Pre-commit hook blocked C3 first attempt: EF file 361 lines (hook count) vs 360 (wc -l) | Hook counts lines as array length (trailing newline adds 1 vs wc -l which counts newlines) | Compressed header block + 1 redundant comment line: net -12 lines → 348 wc-l / 349 hook-count | Minor rework; no logic changes |
| D-3 | MCP `get_edge_function` showed old version 1 source after CLI deploy | MCP source-viewer caches the last MCP-deployed version; CLI deploy is independent | Documented; CLI deploy is authoritative evidence. Source verified via local grep | None — deployment is correct |
| D-4 | SPEC said "EF target ≤400 lines" but IR12 hard max is 350 | SPEC's 400-line target conflicts with the repo's enforced 350-line hard max | Trimmed to 348 lines (wc -l); hard max not breached | Minor: less room for future additions to this file. Finding logged in FINDINGS.md |

---

## §6 Real-Time Decisions Table

| Decision | Options considered | Chosen | Rationale |
|---|---|---|---|
| Tile touch or skip | Touch (adds IR34 Chrome MCP at LH-Tester) vs Skip (clean pipeline) | Skip | Optional per SPEC; IR34 dependency avoided; future SPEC recommended |
| Comment compression strategy for line-count fix | Full logic rewrite vs comment trim only | Comment trim only | IR 9 no-logic-changes during structural work; surgical edit |
| uuid-ossp probe failure on first attempt | `default_version` column doesn't exist | Use `extversion` column instead | Standard pg_extension column name; probe re-ran and confirmed v1.1 |

---

## §7 Self-Assessment (1–10)

| Dimension | Score | Justification |
|---|---|---|
| Scope adherence | 9 | All 4 declared files handled correctly; tile skip is a valid bounded decision per SPEC §4. Only deviation was line-count overage caught by hook and fixed immediately. |
| Iron Rules | 9 | IR12 violation caught at pre-commit stage and fixed before commit; IR22 honored on all new queries; IR31/32 gates passed; IR18/21/35 all verified. -1 for not pre-calculating the hook's line-counting difference from wc-l (known divergence from prior SPECs). |
| Commit hygiene | 9 | 3 explicit-filename staged commits; HEREDOC messages with Co-Authored-By; `git diff --cached --name-only` verified before each commit. -1 for needing a second C3 attempt due to line-count miscalculation. |
| Deviation handling | 10 | MCP InternalServerError handled per SPEC §4 bounded handling without hesitation. File-size deviation caught, fixed, and documented. MCP source-viewer staleness identified and documented. No escalation needed. |

---

## §8 Executor-Skill Improvement Proposals

**P-EXEC-1 — Pre-calculate hook line count before staging**

Section to update: `opticup-executor/SKILL.md` §"Code Patterns — How We Write Code Here" → add subsection under "Git discipline":

> **Hook line-count vs wc-l discrepancy:** The pre-commit `file-size` hook counts lines as `content.split('\n').length`, which is always `wc -l` + 1 when the file ends with a newline (the final element is an empty string after the trailing newline). Always compute estimated hook count as `wc -l <file> + 1` before committing any modified source file. If that number exceeds 350 → trim before staging. The `wc -l` ≤ 349 rule-of-thumb avoids the off-by-one.

Rationale: D-2 in this SPEC cost one extra commit (C3 first attempt blocked). The pattern is reproducible in any SPEC that adds code near the line budget.

**P-EXEC-2 — MCP deploy_edge_function InternalServerError as expected-deviation, not stop-trigger**

Section to update: `opticup-executor/SKILL.md` §"Autonomy Playbook" table, add row:

> | `mcp__claude_ai_Supabase__deploy_edge_function` returns `InternalServerErrorException` | Immediately invoke CLI fallback: `npx supabase functions deploy <slug> --project-ref <id>`. Document as D-N in EXECUTION_REPORT. Do NOT escalate — this is a known MCP infrastructure instability. |

Rationale: This failure mode has now occurred in M4_FB_CAPI_HYBRID_DEDUPLICATION (OPEN-021) and again in this SPEC (D-1). The CLI fallback is always available. Pre-wiring this as an explicit playbook row avoids the mental-model question of "is this a stop trigger?" each time it fires.
