# EXECUTION_REPORT — M4_UNSUB_SUPPRESSION_CRIT

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_UNSUB_SUPPRESSION_CRIT/EXECUTION_REPORT.md`
> **Written by:** opticup-executor
> **Written on:** 2026-05-06
> **SPEC reviewed:** `SPEC.md` (authored by opticup-strategic, 2026-05-06)
> **Start commit:** `b35b6f6`
> **End commit:** `177c93c` (fix) + this retrospective commit
> **Duration:** ~45 minutes (including ~10 min wait for Daniel's CLI deploy after MCP 5xx ×2)

---

## 1. Summary

CRITICAL CAN-SPAM-equivalent suppression gate shipped. `send-message` v19 now rejects dispatch to leads with `unsubscribed_at IS NOT NULL` OR `status='unsubscribed'` — defense in depth per Iron Rule 22. Implemented as option (a) per SPEC §8: widened `injectLeadVariables` SELECT to also fetch the suppression fields and changed its signature to return them, avoiding the 2nd-SELECT cost of option (b). EF deployed v18→v19 by Daniel's CLI after MCP returned `InternalServerErrorException` twice (3rd occurrence of OPEN-021). All 4 demo E2E tests GREEN; 0 prizma writes; whitelist contacts only.

---

## 2. What Was Done

| # | Hash | Message | Files touched |
|---|------|---------|---------------|
| 1 | `177c93c` | `fix(crm): send-message rejects dispatch to unsubscribed leads (M4_UNSUB_SUPPRESSION_CRIT)` | `supabase/functions/send-message/index.ts` (+18/-2), `lead-variables.ts` (+15/-5), `CHANGELOG.md` (entry), `SESSION_CONTEXT.md` (Today line). |
| 2 | _(this commit)_ | `chore(spec): close M4_UNSUB_SUPPRESSION_CRIT with retrospective` | `SPEC.md` + this file + `FINDINGS.md`. |

**Edge Function deploy:** v19 deployed by Daniel via local `supabase functions deploy send-message --project-ref tsxrrxzmdxaenlvocyit` (no `--no-verify-jwt` — confirmed via `get_edge_function`: `verify_jwt=true`). Live state at `get_edge_function`: `version=19, status=ACTIVE, ezbr_sha256=6d5a6b6f8066c6a3cff34898e9b7c2df495698e93770feec3ec20a4a0a044c97`. Deployed source includes the suppression gate verbatim.

**Verify-script results:**
- `npm run verify:integrity` (Iron Rule 31): PASS at session start, post-edit, pre-fix-commit, pre-retro-commit.
- Pre-commit hooks at fix commit: 0 violations, 1 warning — `[file-size] index.ts:332 — exceeds 300-line soft target` (file was 317 pre-edit; gate adds 14 lines; 332 stays under 350 hard cap).

**Diff stats:** 4 files changed, 40 insertions(+), 7 deletions(-). Net code growth in `send-message/`: 33 lines. Slightly over SPEC §3 #4 ≤25 target — see §3 Deviations.

---

## 3. Deviations from SPEC

| # | SPEC section | Deviation | Why | How resolved |
|---|--------------|-----------|-----|--------------|
| 1 | §3 #4 (≤25 lines changed in send-message/) | Final: 33 lines | The mechanical cost of the function-signature change in `injectLeadVariables` — `Promise<void>` → `Promise<{...}\|null>` plus 3 early-return rewrites — was underestimated by the SPEC. Trimmed an exported type alias to inline-anonymous to save 5 lines (38 → 33). | Documented; functionally complete. The "2 logical edits" intent is fully satisfied. |
| 2 | §3 criterion 3 (deploy via Supabase MCP) | Used Daniel's local CLI instead | MCP `deploy_edge_function` returned `InternalServerErrorException` twice — 3rd occurrence of OPEN-021 in 14 days. SPEC §5 explicitly authorizes stop-and-escalate after second failure. | Stopped, escalated, Daniel deployed via CLI, resumed. |
| 3 | §10 Dependencies template_slug `event_registration_open` | That slug doesn't exist in demo DB; used `event_coupon_delivery` instead | The SPEC author cited a template by name from memory; confirmed via `crm_message_templates` query that `event_registration_open` is not present. | `event_coupon_delivery_sms_he` is simpler (no required vars, no event-binding) so it isolates the gate test cleanly. Logged as Finding 1 (LOW). |

---

## 4. Decisions Made in Real Time

| # | Ambiguous point | My decision | Why |
|---|-----------------|-------------|-----|
| 1 | SPEC §8 offered options (a) / (b) / (c) for plumbing the suppression fields from lead-variables.ts to index.ts | **Option (a)** — change `injectLeadVariables` signature to return `{unsubscribed_at, status} \| null` | Single SELECT vs (b)'s 2 SELECTs per dispatch; the function is private to `send-message/`; only one caller (index.ts:158) needed updating. Cleaner long-term and microscopically faster on hot path. |
| 2 | Test 4 required a "fresh, never-unsubscribed lead" but `crm_leads_tenant_phone_active_uniq` constraint blocked creating a 2nd lead with the same whitelist phone while the 1st was active | Soft-deleted the 1st test lead (which was already in `unsubscribed_at=NULL, status='waiting'` state after Test 3), then created a 2nd fresh one for Test 4 | Preserves the SPEC's "fresh lead" intent. Logged as a minor SPEC-author note (Finding 2, LOW). |
| 3 | I added a 5-line exported type alias `LeadSuppressionFields` then inlined it back when the diff exceeded SPEC §3 #4's 25-line target | Inline the anonymous return type in `injectLeadVariables` signature | Diff: 38 → 33 lines. Type alias was used in only 1 place; inline is acceptable readability for one-off return shapes. |
| 4 | The SPEC §3 #12 criterion ("literal 'lead_unsubscribed' string nowhere in template body") is moot for our case | Verified by inspection: rejection rows have `content=""` (gate fires before template lookup); customer-facing rows (Tests 3 + 4) contain only the legitimate template body | Trivially satisfied. |

---

## 5. What Would Have Helped Me Go Faster

- **MCP-deploy fallback in §10 already had the CLI command verbatim** — applying Foreman Proposal 2 from `M4_PUBLIC_FORM_VARIABLES_HIGH/FOREMAN_REVIEW.md`. Saved ~30 seconds vs the prior SPEC. ✓ The harvest worked.
- **Schema-impossibility check in §10 already validated** that `unsubscribed_at` is nullable — applying Foreman Proposal 1. ✓ Saved cycles.
- **What still cost time:** the SPEC's §3 #4 ≤25-line threshold is too aggressive for a SPEC that requires both a function-signature change AND a gate insertion. Each early-return rewrite is mechanically unavoidable when the return type changes from `Promise<void>` to a Promise of a value. A tighter and more honest budget for "signature-change + new gate" is ~30-35 lines.
- **Template name in SPEC §10**: `event_registration_open` was cited but doesn't exist in DB. Same root cause as the prior SPEC's `recipient_phone` / `recipient_email` reference: SPEC author cited names from memory. The `\d` mitigation from FOREMAN_REVIEW Proposal 1 catches column nullability; it does NOT catch template-slug existence. Worth extending.

---

## 6. Iron-Rule Self-Audit

| Rule | Touched? | Followed? | Evidence |
|------|---------|----------|----------|
| 1 — atomic quantity RPC | N/A | | |
| 2 — writeLog() | N/A | | (this is messaging, not quantity/price) |
| 3 — soft delete only | Yes | ✅ | Cleanup `UPDATE crm_leads SET is_deleted=true` for both test leads. |
| 5 — FIELD_MAP for new fields | N/A | | No new DB fields. |
| 7 — DB via helpers | N/A | | EF code (Deno + supabase-js), not client JS. |
| 8 — escapeHtml/textContent | N/A | | No UI. |
| 9 — no hardcoded business values | Yes | ✅ | No literals added (the string `lead_unsubscribed` is a machine code, not a customer-facing business value). |
| 12 — file size ≤350 | Yes | ✅ | `index.ts` 317 → 332; `lead-variables.ts` 43 → 47. Both under 350. |
| 14 — tenant_id on tables | Yes | ✅ | The new `crm_message_log` insert at the gate writes `tenant_id` explicitly. |
| 15 — RLS on tables | N/A | | No new tables. |
| 18 — UNIQUE includes tenant_id | N/A | | No new constraints. |
| 21 — no orphans / duplicates | Yes | ✅ | **Step 1.5 Pre-Flight Check executed:** verified `crm_leads.unsubscribed_at` exists (nullable timestamptz) and `crm_leads.status` exists (NOT NULL text) via `information_schema.columns`. No new code names introduced. The widened SELECT extends an existing function rather than creating a sibling. |
| 22 — defense in depth | Yes | ✅ | The gate checks BOTH `unsubscribed_at IS NOT NULL` AND `status='unsubscribed'` — exactly per SPEC §11 Iron Rule 22 application. |
| 23 — no secrets | Yes | ✅ | The hardcoded `ANON_KEY` in send-message tree is pre-existing, not added here. SERVICE_ROLE_KEY remains env-only. |
| 31 — integrity gate | Yes | ✅ | Ran 4× during session; all PASS. |

---

## 7. Self-Assessment (1–10)

| Dimension | Score | Justification |
|-----------|-------|---------------|
| Adherence to SPEC | 9 | One real deviation (§3 #4 line count: 33 vs ≤25), driven by SPEC underestimating the cost of the chosen Edit-A pattern. All logical edits satisfied verbatim. |
| Adherence to Iron Rules | 10 | All in-scope rules verified, including the explicit Iron Rule 22 defense-in-depth pattern the SPEC called out. |
| Commit hygiene | 10 | Single fix commit with all related files (source + 2 docs). Standard retrospective commit. No `--amend`, no `--no-verify`. |
| Documentation currency | 10 | CHANGELOG + SESSION_CONTEXT updated in same fix commit. MODULE_MAP correctly NOT modified — no new function names exported (signature widened on existing function only). |
| Autonomy (asked 0 questions to Daniel) | 9 | One genuine escalation (MCP deploy 5xx ×2) per SPEC §5 stop-trigger. No discretionary questions. |
| Finding discipline | 10 | 2 findings logged to FINDINGS.md, neither absorbed into the fix commit. |

**Overall (weighted avg):** 9.5/10.

---

## 8. Executor-Skill Improvement Proposals

### Proposal 1 — Pre-flight template-slug existence check
- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"Step 1.5 — DB Pre-Flight Check" — extend bullet 5 (name-collision grep).
- **Change:** Add a sub-bullet 5b: *"For every template slug, RPC name, T-constant, or other database identifier the SPEC's QA plan cites, run a `SELECT 1 FROM <table> WHERE <id_col> = <name>` confirmation query before relying on it. If the SPEC says `template_slug='X'` and X doesn't exist, substitute the closest valid alternative and log a finding so the SPEC author can fix the template-name reference next time."*
- **Rationale:** This SPEC's §10 cited `event_registration_open` which doesn't exist; the prior SPEC's §3 #8 cited columns `recipient_phone`/`recipient_email` that don't exist. Same root cause: SPEC author cites names from memory. A 30-second confirmation query catches both. The Foreman's Proposal 1 (column nullability check) covers `\d <table>`; this extends it to `\d` for catalog rows (templates, RPCs by name).
- **Source:** §3 Deviation #3 + §5 bullet 4 above.

### Proposal 2 — Embed the SPEC §3 #4 line-count budget heuristic
- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"Bounded Autonomy — Execution Model"
- **Change:** Add a paragraph: *"If a SPEC §3 success criterion specifies a line-count threshold AND the SPEC asks for a function-signature change, mentally budget +5-7 extra lines for mechanical signature-update cost (early-return rewrites, type alias or inline-anonymous return type, downstream consumer threading). If the change exceeds threshold by less than that mechanical cost, document the deviation in EXECUTION_REPORT §3 — do NOT trim past the point of readability to hit the number. The SPEC's intent ('2 logical edits') is what counts."*
- **Rationale:** This SPEC's §3 #4 ≤25-line target was logically unreachable for the option-(a) path the SPEC itself recommended; even the leanest possible signature change pushed to 33 lines. I burned ~3 minutes trimming a type alias to inline-anonymous to gain 5 lines, when the more honest answer was "the SPEC's arithmetic was off." Codifying this avoids similar trimming gymnastics.
- **Source:** §3 Deviation #1 + §4 Decision #3.

---

## 9. Next Steps

- Commit this report + `FINDINGS.md` + `SPEC.md` in `chore(spec): close M4_UNSUB_SUPPRESSION_CRIT with retrospective`.
- Push to `develop`.
- Signal Foreman: "SPEC closed. Awaiting Foreman review."
- DO NOT write `FOREMAN_REVIEW.md` — Foreman's job.
- DO NOT merge to main — Daniel-only per Iron Rule 9.7.

---

## 10. Raw Command Log (excerpts)

**MCP deploy attempts (both failed):**
```
mcp__claude_ai_Supabase__deploy_edge_function(...) →
{"error": {"name": "InternalServerErrorException", "message": "Function deploy failed due to an internal error"}}
```
(×2; SPEC §5 authorized stop-on-second-failure. 3rd occurrence in 14 days of OPEN-021 pattern.)

**Daniel's CLI deploy:** Resulted in `version=19, ezbr_sha256=6d5a6b6f8066c6a3cff34898e9b7c2df495698e93770feec3ec20a4a0a044c97` per `get_edge_function`.

**Test 1 (unsubscribed lead, SMS):** `{"ok":false,"error":"lead_unsubscribed"}` → log row `b42481c3-...`: `status='rejected', error_message='lead_unsubscribed', template_id=NULL, content=""`.

**Test 2 (unsubscribed lead, email):** Same shape, channel=email.

**Test 3 (re-subscribed, SMS):** `{"ok":true,"log_id":"bc397179-...","channel":"sms"}` → log row: `status='sent', error_message=NULL, content=<full body>`.

**Test 4 (never-unsubscribed lead, SMS):** `{"ok":true,"log_id":"13590128-...","channel":"sms"}` → log row: `status='sent', content=<full body>`.

**Prizma write count during run:** `0`.
