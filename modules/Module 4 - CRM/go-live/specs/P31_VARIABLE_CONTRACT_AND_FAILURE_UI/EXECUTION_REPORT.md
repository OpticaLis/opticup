# EXECUTION_REPORT — P31_VARIABLE_CONTRACT_AND_FAILURE_UI

> **Run started:** 2026-04-30 evening IL
> **Closed:** 2026-05-01 morning IL
> **Mode:** standard (Daniel reachable; ack-on-migration + ack-on-extractions required)
> **Outcome:** 10/10 commits on origin/develop. Migration applied + verified live on Prizma. EF deploy blocked (P29-style MCP 500) — handed off to Daniel for CLI deploy. QA Phase 1+2 deferred to post-deploy verification per dispatch §10 step 6.

---

## Summary

P31 closes the "%name% reaches customer" bug class with an explicit machine-checkable contract on every message template, plus operator-facing visibility for any dispatch that fails the contract. Pre-flight surfaced 3 file-size STOP triggers (all 3 P31-target files at-or-beyond Iron Rule 12 cap) plus 2 ambiguous parser cases (D7 false-positives from URL-encoded Hebrew; `lead_id` placeholder in event_coupon_delivery_email_he); Daniel acked the extraction strategy + tightened regex + `lead_id` auto-fill expansion. 3 verbatim extractions (commits 0a/0b/0c) made room. The migration applied cleanly with all 30 active Prizma templates resolving to `required_variables=[]` — every real placeholder is in the auto-fill or auto-inject set. Send-message EF code changes (commits 2+3) committed but not yet live: MCP `deploy_edge_function` returned `InternalServerErrorException` on first attempt (the P29-style failure surfaced again). Daniel will deploy via Supabase CLI; QA scenarios that require the EF live are deferred to post-deploy.

## What was done

### Pre-flight (per dispatch §10 + SPEC §10)

- Verifier-method line counts of P31 target files surfaced 3 STOP triggers:
  - `crm-leads-tab.js` 350 (cap), SPEC §7 estimate +10 → 360 over
  - `crm-leads-detail.js` 350 (cap), SPEC §7 estimate +50 → 400 over
  - `send-message/index.ts` 333, SPEC §7 estimate +30 → 363 over
- 30-template inventory + body parser surfaced 2 ambiguous cases (also documented in FINDINGS.md):
  - `D7` matched in 3 templates — false positive from URL-encoded Hebrew `%D7%94%D7%99%D7%99` in WhatsApp `wa.me/...?text=...` URLs
  - `%lead_id%` in `event_coupon_delivery_email_he` — real placeholder for QR code generator URL
- pg_constraint scan on `crm_message_templates`: 0 CHECK (column will be free-form JSONB)

### Daniel acks (3 questions resolved before any commits)

1. Extraction strategy — approved. New file names: `crm-leads-tab-filters.js`, `crm-leads-detail-messages.js`, `send-message/dispatch.ts`.
2. Regex tightening — approved: `%([a-z][a-z0-9_]*)%`. Lowercase-first-char excludes URL-encoded hex pairs without affecting any real placeholder.
3. `lead_id` — option (b) approved: expand auto-fill to include `lead_id` from `crm_leads`. Architectural-decision list updated: auto-fill set = `name, phone, email, lead_id` from crm_leads + `event_name, event_date, event_time, coupon_code` from crm_events (when `event_id` present).

### Commits (10 total)

| # | Hash | Subject |
|---|---|---|
| 0a | `8ab376c` | refactor(crm): extract chip-bar + pagination from crm-leads-tab.js |
| 0b | `4f41e59` | refactor(crm): extract messages tab from crm-leads-detail.js |
| 0c | `afbe6be` | refactor(send-message): extract pending-log + Make-webhook block |
| 1 | `ffe5789` | migrations(crm): add required_variables to message templates |
| 2 | `c00cd93` | feat(send-message): auto-fill core lead variables from crm_leads |
| 3 | `06c16a1` | feat(send-message): validate required variables; reject 400 on missing |
| 4 | `a19dce4` | feat(crm): hebrew error labels for message_log error_message values |
| 5 | `bb60cb6` | feat(crm): registered tab shows failed-messages badge + filter chip |
| 6 | `cbac62d` | feat(crm): lead detail card shows failed messages + per-row retry |
| 7 | `98b507f` | chore(crm): MODULE_MAP + CHANGELOG for P31 |

Pre-commit gate green every commit. 0 violations across all 10 commits. 0 `--no-verify` invocations.

### Migration (live Prizma, verified)

Applied via `mcp__claude_ai_Supabase__apply_migration` with name `2026_04_30_message_template_required_vars` after Daniel ack. Post-migration verification:

```
column_present_not_null = 1
active_templates        = 30
null_count              = 0
empty_array_count       = 30
non_empty_count         = 0
```

All 30 active Prizma templates have `required_variables=[]` — the contract is comprehensive without per-template manual labor (all real placeholders sit in the auto-fill or auto-inject set).

### EF deploy attempt

`mcp__claude_ai_Supabase__deploy_edge_function` for `send-message` with all 6 source files (`index.ts`, `dispatch.ts`, `lead-variables.ts`, `event-variables.ts`, `url-builders.ts`, `deno.json`) returned `InternalServerErrorException` on the first attempt. Per dispatch §10 step 6 + SPEC §11 ("if MCP fails again, hand off to Daniel for dashboard deploy. Don't block."), no retry was attempted; deploy step deferred.

The deploy command for Daniel:

```
supabase functions deploy send-message --project-ref tsxrrxzmdxaenlvocyit
```

### File sizes — final

| File | Pre-extract | Post-extract | Final | Cap |
|---|---|---|---|---|
| `modules/crm/crm-leads-tab.js` | 350 | 315 (0a) | **348** | 350 |
| `modules/crm/crm-leads-tab-filters.js` | new | 104 (0a) | 104 | 350 |
| `modules/crm/crm-leads-detail.js` | 350 | 319 (0b) | **332** | 350 |
| `modules/crm/crm-leads-detail-messages.js` | new | 67 (0b) | 150 | 350 |
| `modules/crm/crm-message-error-labels.js` | new | n/a | 56 | 350 |
| `supabase/functions/send-message/index.ts` | 333 | 246 (0c) | **282** | 350 |
| `supabase/functions/send-message/dispatch.ts` | new | 129 (0c) | 129 | 350 |
| `supabase/functions/send-message/lead-variables.ts` | new | n/a | 43 | 350 |

All files under 350. The 3 originals that triggered the STOPs all landed under cap with headroom.

## Deviations from SPEC

- **§7 detail.js estimate: +50 lines.** Actual delta: +13 in detail.js + +83 in detail-messages.js = +96 across the two files. Extra weight came from the dedicated retry-wiring helper (`renderAndWire` in detail.js) needed to make the rerender-on-retry pattern strict-mode-safe (replaced `arguments.callee` recursion with a named function reference) and the section's full DOM template (channel icon + Hebrew label + translated reason + timestamp + retry button per row).
- **§7 tab.js estimate: +10 lines.** Actual: +33. Extra weight from explicit `_failedCounts` state + explicit pill render with active-state styling + `window.reloadCrmLeadsFailedCounts` exposure for retry callbacks.
- **§7 send-message/index.ts estimate: +30 lines.** Actual: +36 (post-extraction baseline 246 → 282). Within margin.
- **EF deploy via MCP not retried after first 500.** SPEC §11 explicitly says "Don't block" on second occurrence — first attempt is the second occurrence (P29 was the first). Handed off without retry.
- **QA Phase 1+2 not run this session.** EF-dependent scenarios (#2 auto-fill smoke, #3 validation smoke, #10 EF live verify, #11 old-failed-row visibility) require the EF deployed. UI smoke scenarios (#5 badge, #6 chip, #7 detail card section, #8 retry) require the live JS to be served — `app.opticalis.co.il` serves from `main`, which is behind develop. Recommended QA flow post-deploy: (a) Daniel deploys EF via CLI; (b) Daniel merges develop→main + waits for Pages rebuild; (c) re-run all 11 scenarios.

## Decisions made in real time

- **Tightened regex name** — kept the SPEC's intent (catch real placeholders) but used `%([a-z][a-z0-9_]*)%` instead of the original case-insensitive form. Lowercase first-char eliminates `%D7%`-style URL-encoding false positives without losing any real placeholder (project convention is lowercase snake_case).
- **`lead_id` in auto-fill (option b)** — chosen over option (a) because the EF already queries the lead row via `injectLeadVariables`, so the `id` is free; saves a per-template manifest entry; defends against future direct-send paths that forget the field.
- **Chip-bar extraction included pagination** — `crm-leads-tab-filters.js` was named after Daniel's directive but bundled pagination too because filters-only would have left tab.js at 329 (still over 320). Pagination was the cleanest second extract; both are "chrome around the table." Documented in commit 0a body.
- **Failed-messages section above the avatar header** — chose this placement (vs. a new tab or vs. inside the messages tab) for visibility: failures need to grab operator attention. Section is collapsible (open by default per `<details open>`), only renders when N>0.
- **`renderAndWire` helper to support retry-then-rerender** — strict-mode forbids `arguments.callee`. The helper centralizes both render + tab-wire + retry-handler-wire in one named function so the retry callback can recursively invoke it.

## What would have helped go faster

- **Pre-flight line-count verification in the SPEC.** §2.5 left the line-count cells blank; the executor had to run `node -e split` and then surface 3 STOP triggers + propose extraction strategy. If the SPEC author runs the verifier upfront and authors extraction commits as part of the SPEC (not as preamble for the executor to negotiate), this saves a round-trip with Daniel.
- **A localhost dev server with develop served** — would let QA UI scenarios (#5–#8) run autonomously without waiting for the develop→main merge + Pages rebuild cycle. Daniel has localhost:3000 running, but its source-of-truth (which branch it serves) wasn't verified during this session.
- **MCP EF-deploy reliability** — second consecutive `InternalServerErrorException` for an EF deploy. P29 surfaced this as an improvement proposal (pre-flight test deploy); P31 confirms it's a recurring pattern. Worth a Foreman-level conversation about whether to drop MCP deploy from the executor playbook and standardize on Daniel's CLI step.

## Self-assessment

| Dimension | Score (1-10) | Justification |
|---|---|---|
| Adherence to SPEC | 9 | All 7 SPEC commits + 3 prerequisite extractions landed; deviations documented; QA gated by deploy gap rather than skipped |
| Adherence to Iron Rules | 10 | Pre-commit gate green every commit; Iron Rule 22 on every UPDATE/INSERT; Rule 21 collisions resolved via deliberate renames (renderPaginationBar vs renderPagination; searchTxt vs search); 0 `--no-verify`, 0 deletion |
| Commit hygiene | 10 | 10 logical commits, each focused; verbatim extractions documented as "no logic changes"; explicit filenames (no wildcard adds); commit-message bodies document the why |
| Documentation currency | 9 | MODULE_MAP entries for 5 affected files updated; CHANGELOG full P31 section above P29; SPEC folder retrospective files about to land |

## Iron Rule self-audit

| Rule | Result | Evidence |
|---|---|---|
| Rule 5 (FIELD_MAP) | N/A | No new user-facing fields; `required_variables` is system metadata |
| Rule 7 (DB helpers) | OK | EF uses Supabase JS client; UI uses sb wrapper consistently |
| Rule 9 (no hardcoded business values) | OK | The 90-day failure window is a documented operational constant |
| Rule 12 (file size ≤350) | OK | All 8 affected files post-edit: 348, 332, 282, 150, 129, 104, 56, 43 — all ≤350 |
| Rule 14 (tenant_id every table) | OK | `crm_message_templates` already had it; migration didn't touch |
| Rule 15 (RLS) | OK | EF uses service role; UI uses anon → JWT-claim policy; both unchanged |
| Rule 21 (no orphans/duplicates) | OK | Renames during 0a (renderPagination → renderPaginationBar; search → searchTxt) resolved Rule 21 collisions before commit |
| Rule 22 (defense-in-depth tenant_id) | OK | Every UPDATE/INSERT carries `tenant_id`; SELECT chains include `.eq('tenant_id', tid)` |
| Rule 23 (no secrets) | OK | No new secrets; existing ANON_KEY in dispatch-queue stays unchanged |
| Rule 31 (integrity gate) | OK | Every commit's hook reported "All clear — N files scanned" |

## What's needed for P31 to fully land (Daniel queue)

1. **Deploy `send-message` EF via Supabase CLI** — `supabase functions deploy send-message --project-ref tsxrrxzmdxaenlvocyit`. Once deployed, validation logic (commit 3) goes live.
2. **Merge `develop` → `main`** — UI commits 4-6 reach `app.opticalis.co.il` after Pages rebuilds.
3. **QA Phase 1 (demo)** — 8 scenarios, primarily smoke-testing the EF + UI surfaces. Deferred per §6 above.
4. **QA Phase 2 (Prizma)** — 3 scenarios, limited to the 1 known historical failed row + 1 backward-compat test + 1 EF live verify.
5. **Phase 3 (post-cutover, 24h after 3.5)** — verify 0 dispatches with `error_message='missing_required_variable: ...'` (means contracts are accurate); any failures that DO occur should surface in the operator UI with Hebrew reasons.

## Phase Log

- **20:30** Read dispatch + SPEC; ran pre-flight (line counts, pg_constraint, template inventory)
- **20:45** Surfaced 3 file-size STOPs + 2 ambiguous-vars + extraction proposal; awaited Daniel ack
- **(date rolled to 2026-05-01)**
- **(post-ack)** All 3 acks received in one message
- **+10m** Commit 0a (chip-bar + pagination extraction) — pre-commit Rule 21 collision (`renderPagination` + `search` duplicates) caught and resolved via rename
- **+25m** Commit 0b (messages tab extraction)
- **+45m** Commit 0c (dispatch block extraction)
- **+1h** Migration authored + Daniel acked + applied + verified live (commit 1)
- **+1h15m** Commits 2 + 3 (auto-fill + validation in EF)
- **+1h30m** EF deploy via MCP failed (InternalServerErrorException); handed off to Daniel
- **+1h45m** Commit 4 (Hebrew error labels)
- **+2h** Commit 5 (registered tab badge + pill)
- **+2h30m** Commit 6 (lead detail failed-messages section + retry)
- **+2h45m** Commit 7 (MODULE_MAP + CHANGELOG)
- **+3h** Push develop; this report
