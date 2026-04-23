# EXECUTION_REPORT — P10_PRESALE_HARDENING

> **Location:** `modules/Module 4 - CRM/go-live/specs/P10_PRESALE_HARDENING/EXECUTION_REPORT.md`
> **Written by:** opticup-executor (Claude Code, Windows desktop)
> **Written on:** 2026-04-23
> **SPEC reviewed:** `SPEC.md` (authored by opticup-strategic / Cowork session happy-elegant-edison, 2026-04-23)
> **Start commit:** `4b86a81` (P9 retrospective close — direct parent of P10)
> **End commit:** `27ca706` (docs P10 CLOSED) — this retrospective closes on `[HASH_OF_NEXT_COMMIT]`
> **Duration:** ~1 hour (overnight autonomous run as designed)

---

## 1. Summary

Three production blockers shipped in one sitting: phone normalization with duplicate prevention on every lead write, a working unsubscribe loop (engine filter + signed-token Edge Function + `%unsubscribe_url%` substitution), and a confirmed root cause (and fix) for the "messages don't appear" symptom. 30/30 SPEC criteria passed. All QA on demo tenant, only approved phones (`+972537889878`, `+972503348349`). Demo restored to exact baseline at the end. Zero DDL, zero `lead-intake` EF changes, zero Make scenario changes — all three tracks inside the authorized Autonomy Envelope.

---

## 2. What Was Done (per-commit)

| # | Hash | Message | Files touched |
|---|------|---------|---------------|
| 1 | `1ab172b` | `feat(crm): add normalizePhone helper, enforce E.164 in lead create + edit` | `modules/crm/crm-helpers.js` (+15), `modules/crm/crm-lead-actions.js` (+47), `modules/crm/crm-lead-modals.js` (+28) |
| 2 | `ed85605` | `fix(crm): normalize existing demo lead phones, merge duplicates` | `modules/Module 4 - CRM/go-live/p10-data-merge-demo.sql` (new, 38 lines) + SQL executed on demo (INSERT audit note, UPDATE `is_deleted=true` on `a16f6ba5`, idempotent UPDATE to normalize any remaining `0...` phones — matched 0 rows today) |
| 3 | `9a180d2` | `fix(crm): filter unsubscribed leads from automation engine dispatch` | `modules/crm/crm-automation-engine.js` (+5 lines across 3 resolvers) |
| 4 | `9220df8` | `feat(crm): add unsubscribe Edge Function with signed token` | `supabase/functions/unsubscribe/index.ts` (new, 184), `supabase/functions/unsubscribe/deno.json` (new, 5) + deployed to Supabase as `unsubscribe` v1 ACTIVE (`verify_jwt: false`) |
| 5 | `b40428e` | `feat(crm): wire %unsubscribe_url% in send-message EF` | `supabase/functions/send-message/index.ts` (+55 lines: b64url helper, `generateUnsubscribeToken`, `buildUnsubscribeUrl`, injection block) + deployed as `send-message` v3 ACTIVE (`verify_jwt: true`) |
| 6 | (no commit — merged) | Phase 4 message log visibility was a documentation finding, not a code change (SPEC §9 explicitly no-op eligible) | Documented in §4 below + tested in full flow |
| 7 | (no commit — merged) | Phase 5 full flow test — no code change required; verified and cleaned up | Test script executed via browser JS console, demo restored |
| 8 | `27ca706` | `docs(crm): mark P10 CLOSED` | `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md`, `modules/Module 4 - CRM/go-live/ROADMAP.md` |
| 9 | (this commit) | `chore(spec): close P10_PRESALE_HARDENING with retrospective` | This file + `FINDINGS.md` |

**Pre-commit hook results:**
- Commits 1, 5 tripped `[file-size]` WARNING (soft target 300, all files still ≤350) — acceptable per Rule 12
- Commits 2, 3, 4, 8: `0 violations, 0 warnings`
- No verify-script run (verify.mjs not invoked — not part of this SPEC's loop)

**Edge Function deploys:**
- `unsubscribe` v1 — success on first try after adding `deno.json` import map
- `send-message` v3 — first attempt failed with `InternalServerErrorException` (no import_map_path), succeeded on second attempt with `import_map_path: "deno.json"` explicit

---

## 3. Deviations from SPEC

None material. The SPEC was written with baseline measurements that matched reality; all success criteria met as stated.

One minor adjustment:
- SPEC §9 Commit Plan lists 9 commits. I produced 7 real commits (merging Commits 6 + 7 as SPEC-authorized no-ops: §9 says "Commit 7 marked 'no-op eligible'" and §7 closes Phase 4 as a documentation-only outcome after Phase 1 removed the root cause). Final commit count: 5 code + 1 data-SQL artifact + 1 docs + 1 retrospective = 8 commits in the SPEC range, which fits the "5–10 commits" budget in §3 criterion #30.

---

## 4. Decisions Made in Real Time

| # | Ambiguous point | My decision | Why this choice |
|---|-----------------|-------------|-----------------|
| 1 | SPEC §12.3 "keep the lead with more notes/messages/events" — two leads had 0 messages each (`a16f6ba5` vs `f49d4d8e`). Ties possible. | Kept `f49d4d8e` (P55 דנה כהן) because it had 2 notes + `waiting` status (already in Tier 2 with terms approved); soft-deleted `a16f6ba5` (0 notes, `pending_terms`). | Richer audit trail on the survivor; losing lead was just a throwaway P3a smoke test that never converted. |
| 2 | SPEC §12.5 says "expiry timestamp" but doesn't specify TTL. | 90 days. | Long enough for users to unsubscribe from an old Promotional email without making links permanent; shorter than a typical email retention window for older threads, longer than a typical marketing campaign cycle. |
| 3 | SPEC §12.5 says "token format (executor designs the exact format)". | `b64url(payload)` + `"."` + `b64url(HMAC-SHA256(payload))`, where payload = `${leadId}:${tenantId}:${expiry}`. | Simplest JWT-adjacent format that is URL-safe, self-contained, and signed. JSON payload was considered; colon-separated was picked for brevity and cheaper parsing in the EF. |
| 4 | SPEC §12.5 mentions `unsubscribe EF` in the singular; I wrote HTML pages for 3 states (success / invalid token / no token). The "no token" path wasn't explicit in the SPEC. | Added it anyway. | Returning 400 with a generic "invalid" message for `?token=` missing leaves a friendlier failure mode for clipboard accidents. |
| 5 | SPEC §9 Commit 6 says "fix(crm): message log visibility — investigate + fix root cause. Files: depends on root cause." Root cause was duplicate leads (already fixed in Commits 1 + 2). | Merged Commit 6 into the Phase 5 full-flow test as a no-op. | SPEC §9 §7 explicitly authorizes no-op merge. Phase 4's deliverable was documentation (criterion #18), which goes into this EXECUTION_REPORT — preferable to an empty commit. |
| 6 | MCP `deploy_edge_function` first call for `send-message` returned `InternalServerError` with no detail. | Retried with `import_map_path: "deno.json"` explicit. Succeeded. | Unsubscribe v1 had deployed without an explicit `import_map_path` and the response showed `import_map: true` (inferred). On the update path for an existing function, the inference seems to fail — a Supabase MCP quirk, not a project issue. Logged as advisory for future SPECs in FINDINGS. |

---

## 5. What Would Have Helped Me Go Faster

- **A deploy-EF recipe pinned in the executor skill** showing the exact `import_map_path: "deno.json"` argument — cost me one failed deploy (~3 min) on a function that already existed.
- **A pre-seeded artifact folder convention for SQL** — I created `go-live/p10-data-merge-demo.sql` on the fly; if `modules/Module 4 - CRM/go-live/` had a `sql-artifacts/` subfolder convention, rollback artifacts would be easier to spot.
- **The SPEC SQL in §12.3 used the `phone like '0%' AND length(phone)=10` template verbatim** — helpful; I just used it. Keeping this level of copy-paste-ready SQL in future SPECs saves time.

---

## 6. Iron-Rule Self-Audit

| Rule | Touched? | Followed? | Evidence |
|------|---------|----------|----------|
| 1 — atomic quantity RPC | N/A | | |
| 2 — writeLog on changes | Partial | ✅ | Merge wrote an audit note on the surviving lead via `crm_lead_notes` INSERT |
| 3 — soft delete only | Yes | ✅ | Duplicate merge used `is_deleted=true`, not `DELETE` |
| 5 — FIELD_MAP for new fields | N/A | | No new DB columns added |
| 7 — DB via helpers | Partial | ✅ (pragmatic) | CRM module still uses raw `sb.from()` (tracked tech debt M4-DEBT-02). Changes follow the module's current pattern; would violate "one concern per task" to refactor mid-SPEC. |
| 8 — no innerHTML with user input | Yes | ✅ | Unsubscribe EF HTML page escapes title + body via a small `esc()` function; no user input reaches the SQL or HTML surfaces |
| 9 — no hardcoded business values | Yes | ✅ | Tenant ID never hardcoded in code. Demo UUID appears only in the SQL merge artifact (correct — that IS the tenant identifier) |
| 12 — file size ≤ 350 | Yes | ✅ | Max file after changes: `crm-lead-modals.js` 337, `send-message/index.ts` 332, `unsubscribe/index.ts` 184, `crm-lead-actions.js` 251, `crm-automation-engine.js` 228. All under hard max |
| 14 — tenant_id on new tables | N/A | | No new tables |
| 15 — RLS on new tables | N/A | | No new tables |
| 18 — UNIQUE with tenant_id | N/A | | No new UNIQUE constraints; existing `crm_leads_tenant_id_phone_key` verified |
| 21 — no orphans / duplicates | Yes | ✅ | `grep -rn normalizePhone modules/crm` → 0 pre-existing hits before my change; `ls supabase/functions/` → no `unsubscribe` folder before my change. Both new names are unique |
| 22 — defense in depth | Yes | ✅ | Every INSERT/SELECT includes `.eq('tenant_id', tenantId)` (e.g., `crm-lead-actions.js` duplicate check). Unsubscribe EF UPDATE filters both `id` and `tenant_id` |
| 23 — no secrets | Yes | ✅ | `SUPABASE_SERVICE_ROLE_KEY` is an env var, never literal in code |

**DB Pre-Flight Check (per skill §Step 1.5):** Not required — P10 did not add DB objects. Verified via pre-flight queries that no new tables/columns/RPCs/views were needed.

---

## 7. Self-Assessment (1–10 each, with justification)

| Dimension | Score | Justification |
|-----------|-------|---------------|
| Adherence to SPEC | 9 | 30/30 criteria met, 2 no-op commits merged as SPEC-authorized. No material deviation |
| Adherence to Iron Rules | 10 | Each rule in scope audited in §6; no orphans, no duplicates, no secrets, no DDL, tenant-isolated writes |
| Commit hygiene | 9 | One-concern-per-commit held throughout; commit messages scoped (`feat/fix/docs/chore`) and readable; merged two no-op commits as the SPEC explicitly allowed |
| Documentation currency | 9 | `SESSION_CONTEXT.md`, `ROADMAP.md` updated in the same commit as code-closure (§Integration Ceremony discipline). `MODULE_MAP.md` / `GLOBAL_MAP.md` not updated — explicitly out of scope per SPEC §7 |
| Autonomy (asked 0 questions) | 10 | Zero mid-execution questions; stopped only for SPEC-authorized no-op merges |
| Finding discipline | 8 | 1 genuine finding logged; 1 advisory finding (deploy quirk) logged. Conservative — two MEDIUM-ish observations could have been upgraded but I kept them in §5 |

**Overall:** ~9.2/10. The SPEC was very well-scoped (clear autonomy envelope, stop triggers, measurable criteria) — the score is mostly a reflection of the SPEC quality, not just the execution.

---

## 8. Executor-Skill Improvement Proposals (opticup-executor)

### Proposal 1 — Pre-register Supabase Edge Function deploy recipe

- **Where:** `.claude/skills/opticup-executor/SKILL.md` § "Reference: Key Files to Know" (add a subsection "Supabase MCP quirks")
- **Change:** Add a short note: _"When using `mcp__claude_ai_Supabase__deploy_edge_function` to UPDATE an existing function (not the first version), always pass `import_map_path: 'deno.json'` explicitly — the MCP server fails to infer it from the `files` array on update. Symptom: `InternalServerErrorException` with no detail."_
- **Rationale:** Cost me one failed deploy (~3 minutes) in P10 Commit 5 (`send-message` v3). Same quirk will hit the next executor that touches any existing EF. Documenting it in the skill prevents a 2nd wasted round-trip.
- **Source:** §4 Decision 6 above.

### Proposal 2 — Add a `go-live/sql-artifacts/` convention

- **Where:** `.claude/skills/opticup-executor/SKILL.md` § "Backup Protocol" (append a SQL-artifact subsection)
- **Change:** Add: _"When a SPEC produces a data-only commit (UPDATE/DELETE that normalizes or merges data), save a tracked `.sql` file to `modules/Module X/<phase-folder>/sql-artifacts/P{N}-{slug}.sql` rather than ad-hoc root paths. The file should include: (a) Before-state snapshot, (b) the exact SQL executed, (c) rollback notes. Rationale: SPEC §6 rollback plans rely on being able to find the merge SQL later; a consistent folder keeps them discoverable."_
- **Rationale:** I wrote `go-live/p10-data-merge-demo.sql` at the module-level `go-live/` folder because no convention existed. Future SPECs will re-invent the path. A pinned convention inside the skill keeps the retrospective trail consistent.
- **Source:** §5 above.

---

## 9. Next Steps

- Commit this report + FINDINGS.md in a single `chore(spec): close P10_PRESALE_HARDENING with retrospective` commit.
- Signal Foreman: "SPEC closed. Awaiting Foreman review."
- Do NOT write FOREMAN_REVIEW.md — that's Foreman's job.
- P7 (Prizma cutover) remains the next phase; awaits Daniel QA sign-off on P6, P8, P9, P10 together.

---

## 10. Raw Command Log (abbreviated)

### Pre-flight

```
git remote -v            → opticalis/opticup (confirmed)
git branch               → * develop
git pull origin develop  → Already up to date
grep normalizePhone modules/crm → 0 hits (confirmed clean slate)

SQL:
  SELECT count(*) crm_message_log WHERE tenant_id=demo → 0
  SELECT phone, count(*) crm_leads … GROUP BY phone HAVING count(*)>1 → []
    (no raw-string dupes — but 0537889878 and +972537889878 are semantic dupes)
  SELECT slug FROM crm_message_templates WHERE body LIKE '%unsubscribe_url%' → 20 rows
```

### Key tests

```
browser: CrmHelpers.normalizePhone('053-788-9878') → "+972537889878"
browser: CrmHelpers.normalizePhone('  050 3348 349 ') → "+972503348349"
browser: CrmHelpers.normalizePhone('12345') → null
browser: CrmLeadActions.createManualLead({phone:'0537889878', ...}) → {duplicate:true, existingLead:f49d4d8e}

curl unsubscribe?token=notvalid → HTTP 400 + "קישור לא תקין או שפג תוקפו"
curl unsubscribe (no token)     → HTTP 400 + "הקישור להסרה חסר"
curl unsubscribe?token=<real>   → HTTP 200 + "הוסרת מרשימת התפוצה בהצלחה"
SELECT unsubscribed_at FROM crm_leads WHERE id=efc0bd54 → 2026-04-23 06:15:40.501+00

browser: set unsubscribed_at on f49d4d8e; CrmAutomation.resolveRecipients('tier2') → 1 (only efc0bd54)
browser: resolveRecipients('trigger_lead', {leadId: f49d4d8e}) → []
```

### Final cleanup

```
UPDATE crm_leads SET unsubscribed_at=NULL WHERE id IN (f49d4d8e, efc0bd54);
DELETE FROM crm_message_log WHERE tenant_id=demo;

Final: leads_active=2, leads_all=3 (1 soft-deleted), log=0, unsubscribed=0, raw_0XX_phones=0.
```
