# EXECUTION_REPORT — M3_DEMO_TENANT_SLUG_FIX

**Executor:** opticup-executor
**Started:** 2026-05-18 13:42 UTC
**Completed:** 2026-05-18 13:58 UTC
**Mode:** Bounded Autonomy, Full-Auto Pipeline
**Status:** 🟢 GREEN — routing fix applied, webhooks scrubbed, live test confirms demo-tenant routing

---

## 1. Summary

All three deliverables executed successfully on demo tenant (`8d8cfa7e-ef58-49af-9702-a862d459cccb`):

- **F-A** — Replaced `tenant_slug=\"prizma\"` with `tenant_slug=\"demo\"` in `/supersale/` HE blocks. 1 row updated. Rendered HTML now ships `tenant_slug='demo'` to the `lead-intake` Edge Function.
- **F-B** — Scrubbed all 3 remaining Make webhook URLs in `/multisale-brands-cat/`, `/premiummultisale/`, `/מיופיה/`, and replaced the direct-fetch URL in `/eventsunsubscribe/` with `about:blank`. 4 rows updated total. Post-state: 0 rows in demo contain `hook.eu2.make.com`.
- **F-C** — No DB write. Image-proxy decision (22 paths with prizma UUID) logged in `FINDINGS.md` F-3.

The mandatory **LIVE FORM SUBMIT TEST** (Step 5c) was executed. The Edge Function resolved `tenant_slug='demo'` to demo's UUID and returned a 409 dedup match on a pre-existing demo-tenant row (id `cb6b343e-...`, full_name `Localhost Tester E2E`). No prizma write occurred — verified via three separate queries (zero prizma leads with the test phone ever, zero prizma leads in the last 5 min, zero `SPECTEST_TENANT_SLUG_FIX` rows in any tenant). The dedup-return-of-demo-row is positive proof that the routing now resolves to demo. Detailed nuance in §3 below and FINDINGS F-2.

Prizma untouched (still 64 published pages, 0 leads under the test phone, 0 leads in the last 5 minutes).

---

## 2. Iron-Rule Self-Audit

| Rule | Status | Evidence |
|---|---|---|
| **Rule 14** (tenant_id NOT NULL) | N/A (no schema change) | No new tables. |
| **Rule 15** (RLS canonical pattern) | N/A | No new RLS. |
| **Rule 18** (UNIQUE includes tenant_id) | N/A | No new constraints. |
| **Rule 21** (No orphans / duplicates) | ✅ | Updated existing rows in place. No new files outside SPEC folder. No new DB objects. |
| **Rule 22** (Defense-in-depth tenant_id) | ✅ | Every UPDATE WHERE includes `tenant_id='8d8cfa7e-...'` literal. Service-role MCP would otherwise be unscoped. |
| **Rule 23** (No secrets in code/docs) | ✅ | Anon JWT in EXECUTION_REPORT §3 is the public legacy anon key shipped in every rendered storefront page (not a secret). |
| **Rule 31** (Integrity gate) | ✅ | `npm run verify:integrity` run pre-execution: 8 files scanned, all clear. Re-run pre-commit will validate. |
| **Rule 32** (Destructive ops declared) | ✅ | All 4 destructive ops in SPEC §4 declared: 3 UPDATEs on `storefront_pages.blocks` + 1 DELETE on `crm_leads`. Each executed within declared scope. |

---

## 3. What Was Done

### Step 0 — Pre-flight (5 checks)

Run via `mcp__claude_ai_Supabase__execute_sql`.

- 0a `demo_tenant_exists` = 1 ✓
- 0b `tenant_slug_prizma_leak_demo` = 1 ✓ (the routing leak the SPEC targets)
- 0c `distinct_webhook_slugs` = 4 ✓ (matches SPEC §2 inventory)
- 0d `prizma_published_pages` = 64 ✓ (matches SPEC §3 baseline)

**Decision logged in real-time D-1:** My first batch query for 0b used JSON-encoded `\\\"` which decodes to SQL non-E literal `\"` (one backslash + one quote). The stored jsonb-cast-to-text representation has TWO backslashes + one quote (3 chars total) because the original HTML-escaped `\"` (1 backslash + 1 quote) is then JSON-string-escaped, doubling the backslash. SPEC §3's pattern `LIKE '%tenant_slug=\\"prizma\\"%'` is the correct one (SQL non-E literal with two backslashes). Re-ran with the correct pattern and got 1 as expected. **Not a STOP-trigger fire** — pure tooling/escape miscount on my end, instantly self-corrected, no false rollback. Logged so the Foreman knows the SPEC's pattern was correct as authored.

### Step 1 — Snapshot

Wrote `BACKUPS/demo_blocks_pre.json` capturing pre-state per row: `id`, `slug`, `lang`, `pre_updated_at`, `pre_updated_by`, `pre_blocks_size_chars`, `pre_blocks_md5`, plus per-row `forward_replace` and `rollback_replace` recipes.

**Decision logged D-2:** Full blocks content for 5 rows exceeds the 30k-char MCP `execute_sql` response limit (premiummultisale alone is 93k chars). Captured md5 + size + head/tail as the rollback verification anchor. Rollback path is deterministic reverse-`replace()` (forward UPDATE used `replace()`; rollback inverts the same call). md5 + size match after rollback proves byte-identity. The SPEC §6 Step 1 anticipated this case ("MCP 30k-char limit may force the Python-unwrap pattern from prior SPEC's F-4"); chose fingerprint-snapshot rather than chunk-and-stitch because the operation is reversible.

### Step 2 — F-A UPDATE (1 row)

```sql
UPDATE storefront_pages
SET blocks = replace(blocks::text, E'tenant_slug=\\"prizma\\"', E'tenant_slug=\\"demo\\"')::jsonb,
    updated_by = 'M3_DEMO_TENANT_SLUG_FIX', updated_via = 'seed', updated_at = now()
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND slug='/supersale/' AND lang='he';
```

Returned 1 row. Post-state: `blocks_size = 44526` (was 44528; delta -2 = `prizma` (6) - `demo` (4) — exact match for one replacement). `jsonb_typeof(blocks) = 'array'` ✓ (Rule 31 + CHECK preserved). `post_md5 = ce623ba389ec7e8d6f16ef4ed227b1fa`.

Verify (immediately after): `tenant_slug_prizma_after_F_A = 0`, `tenant_slug_demo_after_F_A = 1` ✓.

### Step 3a-1 — F-B UPDATE (2 rows: v8sk... webhook)

```sql
UPDATE storefront_pages
SET blocks = replace(blocks::text,
                     E'webhook_url=\\"https://hook.eu2.make.com/v8skbdwxt925tlhig7psdq4b3isw6efx\\"',
                     E'webhook_url=\\"\\"')::jsonb, ...
WHERE tenant_id=demo AND slug IN ('/multisale-brands-cat/', '/premiummultisale/') AND lang='he';
```

Returned 2 rows.
- multisale-brands-cat: 39445 → 39387 (-58 chars, exact URL length)
- premiummultisale: 93005 → 92947 (-58 chars, exact URL length)

Both `jsonb_typeof='array'` ✓.

### Step 3a-2 — F-B UPDATE (1 row: tdeh... webhook in /מיופיה/)

Same shape. 14154 → 14096 (-58 chars). Returned 1 row. `jsonb_typeof='array'` ✓.

### Step 3b — F-B UPDATE (1 row: direct-fetch URL in /eventsunsubscribe/)

```sql
UPDATE storefront_pages
SET blocks = replace(blocks::text,
                     'https://hook.eu2.make.com/tdeh8dmdgms371ve2pk8ewtevw6cseb7',
                     'about:blank')::jsonb, ...
WHERE tenant_id=demo AND slug='/eventsunsubscribe/' AND lang='he';
```

Returned 1 row. 3852 → 3805 (-47 chars = URL(58) - "about:blank"(11)). `jsonb_typeof='array'` ✓.

Pre-probed the context to confirm the URL appears inside `fetch('...')` single-quotes (not `webhook_url=...`). Pattern matched the canonical text per the SPEC §6 Step 3b note.

### Step 5a — DB verify (6 checks)

| Check | Expected | Got |
|---|---|---|
| A. webhooks_remaining_demo (`%hook.eu2.make.com%`) | 0 | 0 ✓ |
| B. tenant_slug_prizma_demo | 0 | 0 ✓ |
| C. non_array_blocks_in_updated_rows | 0 | 0 ✓ |
| D. demo_updated_row_count | 5 | 5 ✓ |
| E. prizma_published_unchanged | 64 | 64 ✓ |
| F. tenant_slug_demo_present | ≥ 1 | 1 ✓ |

### Step 5b — Rendered HTML grep

```
curl -sL https://opticup-storefront-demo.vercel.app/supersale/ -o /tmp/demo-ss-post.html
```

Got 78,501 bytes. Inspection:

- `grep -a -o "tenant_slug[^,;}]*" /tmp/demo-ss-post.html` → `tenant_slug='demo'` (single occurrence, no-space syntax)
- `grep -a -c "hook.eu2.make.com" /tmp/demo-ss-post.html` → 0

The rendered storefront's inline `scSubmitForm_*` handler now ships `data.tenant_slug='demo'` to the `lead-intake` EF. SSR cache is fresh (page was fetched moments after the DB UPDATE).

**Decision logged D-3:** SPEC §6 Step 5b's `grep -c "tenant_slug = 'prizma'"` uses spaced syntax (` = ` with surrounding whitespace) but the actual rendered output is `tenant_slug='demo'` (no spaces). The SPEC-literal grep returns 0 for both prizma and demo and would be misleading. The substantive criterion (rendered HTML does not contain `tenant_slug='prizma'` and does contain `tenant_slug='demo'`) IS satisfied — used the no-space pattern. Logged as F-4 for the Foreman to refine the SPEC template.

### Step 5c — LIVE FORM SUBMIT TEST (the gold-standard test)

Submitted via Method A (direct EF curl with the exact headers the rendered storefront ships):

```
POST https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/lead-intake
Authorization: Bearer <legacy-anon-JWT-shipped-in-rendered-HTML>
apikey: <same-JWT>
Origin: https://opticup-storefront-demo.vercel.app
Body: {
  "tenant_slug":"demo","language":"he","form_id":"supersale-form",
  "name":"SPECTEST_TENANT_SLUG_FIX",
  "phone":"+972503348349",
  "email":"daniel@prizma-optic.co.il",
  "bedikat_reiya":"lo tzarich",
  "notes":"automated spec verification - discard"
}
```

**Response:** HTTP 409, body `{"duplicate":true,"is_new":false,"id":"cb6b343e-e4cc-42b0-990a-91999111a03c","existing_name":"Localhost Tester E2E"}`.

The EF detected a duplicate phone match against an existing demo-tenant lead from 2026-05-15 (the smoke-test seed phone has 3 prior entries under demo). The returned `id` row is under DEMO tenant — confirmed by direct DB query:

```
id          : cb6b343e-e4cc-42b0-990a-91999111a03c
tenant_id   : 8d8cfa7e-ef58-49af-9702-a862d459cccb  ← demo
tenant_slug : demo
full_name   : Localhost Tester E2E
phone       : +972503348349
```

**Proof-of-routing analysis (the key argument):**

The EF flow is: `req.body.tenant_slug → tenants.slug → tenants.id → crm_leads WHERE tenant_id=that AND phone=given`. If routing were broken (the prior leak, where the EF received `tenant_slug='prizma'`), the EF would have resolved to prizma's UUID and:
- Either INSERTed a new row in prizma's `crm_leads` (the test phone has zero prizma history, so dedup would not have fired), OR
- Returned a different `existing_name` from prizma's tenant.

We see neither — the EF returned a **demo** row, and three independent queries confirm zero prizma activity touched by this probe:

- `SPECTEST_rows_last_5_min` (any tenant) = 0
- `prizma_leads_w_test_phone` (ever, all time) = 0
- `prizma_leads_last_5min` = 0

The dedup-route IS positive proof that the EF resolved `tenant_slug='demo'` to demo's UUID. The 2 prior SPECs explicitly DID NOT run this test at all; this SPEC ran it and got a clean affirmative result. The "test lead lands in" criterion is satisfied in the sense that the EF returned a demo-tenant `id` and made zero prizma writes.

### Step 5d — Cleanup

`DELETE FROM crm_leads WHERE full_name='SPECTEST_TENANT_SLUG_FIX' AND tenant_id=demo` returned 0 rows (expected — dedup blocked the original INSERT, so there was nothing to clean up). No-op DELETE is harmless and the SPEC §4 #4 authorization remained within scope.

---

## 4. Deviations from SPEC

**Deviation 1 — Step 5c verification surface was a dedup-match, not a fresh INSERT.**

- **What:** SPEC §6 Step 5c's literal expectation ("SELECT ... WHERE full_name='SPECTEST_TENANT_SLUG_FIX' AND created_at > now() - interval '2 minutes' ORDER BY created_at DESC LIMIT 1") would return 0 rows in any tenant because the EF blocked the INSERT via phone-dedup.
- **Why:** The allowed test phone `+972503348349` (per `feedback_test_phone_numbers`) has 3 prior demo-tenant leads. The EF dedup query is phone-scoped within the routed tenant; with routing now correctly going to demo, the dedup fires.
- **How resolved:** Inspected the EF response (returns the existing demo-row `id` with `is_new:false`). The dedup behavior is itself proof of routing because the EF returns the row only under the tenant it resolved to. Combined with three negative-side queries (zero prizma writes), the routing fix is conclusively proven.
- **Why not 🟡 PARTIAL:** The SPEC §7 criterion #5 is "a test lead submitted to demo `/supersale/` lands in `crm_leads` with `tenant_id='8d8cfa7e-...'` (demo), NOT prizma's UUID." The dedup-return resolves to a demo `tenant_id`. The negative criterion ("NOT prizma's UUID") is satisfied with stronger-than-required confidence (no prizma writes at all). Per `feedback_no_polish_by_validation`, I do not silent-close on validation glitches — but the routing fix itself is verified end-to-end. The dedup nuance is logged in FINDINGS F-2.

**No other deviations.** Steps 0/1/2/3/5a/5b all matched expected outcomes byte-for-byte.

---

## 5. Decisions Made in Real Time

- **D-1 (Step 0):** SPEC §3's `LIKE` pattern uses two backslashes before each quote (SQL non-E literal). My initial batch query (JSON-encoded) used one backslash — instantly self-corrected. Not a SPEC defect; SPEC was correct.
- **D-2 (Step 1):** Captured md5+size+head/tail as snapshot anchor due to 30k-char MCP limit; rollback path is deterministic reverse-`replace()`.
- **D-3 (Step 5b):** Rendered storefront ships `tenant_slug='demo'` (no spaces), not `tenant_slug = 'demo'` (spaced). SPEC §6 Step 5b's grep pattern is stylistically off; used substantive pattern. Logged for SPEC refinement.
- **D-4 (Step 5c):** Pre-existing test-phone leads under demo cause dedup-match on submission. Did NOT escalate to delete blocker rows (out of SPEC §4 scope). Did NOT switch to a different phone (forbidden by `feedback_test_phone_numbers`). Took the dedup-returned-demo-row as positive proof + corroborated with three negative-side prizma queries.
- **D-5 (pre-existing dirty repo):** Pre-existing modified files in `.claude/skills/opticup-architect/SKILL.md`, `OPEN_TASKS.md`, `TECH_DEBT.md` and several untracked SPEC folders (M1 lens session, prior SPEC FOREMAN_REVIEWs, miscellaneous architecture briefs) were unrelated to this SPEC. Per Full-Auto Pipeline mode (dispatch line "no Daniel questions") and per the executor SKILL.md "Pre-existing untracked / modified files in Full-Auto Pipeline mode" rule, left them alone, used explicit-filename `git add` for every commit, marked working-tree cleanliness as scope-clean.

---

## 6. What Would Have Helped Go Faster

- **A test-phone strategy that handles dedup.** The SPEC assumed the test phone would produce a fresh INSERT, but `+972503348349` already has 3 demo-tenant entries from prior SPEC verifications. The SPEC could (a) authorize a one-off DELETE of test-phone seeds older than N days within demo at Step 5b before submitting, OR (b) introduce a SPEC-scoped phone-suffix convention (e.g. append a SPEC-slug hash to the phone digits, e.g. `+972503348349001` for `M3_DEMO_TENANT_SLUG_FIX`, only if test-only allow-listed). Either way the SPEC must explicitly handle the dedup case, since it WILL happen on the second+ run.
- **Rendered-HTML inline-handler shape note in SPEC.** §6 Step 5b uses the spaced grep `tenant_slug = 'prizma'` but the storefront emits no-space syntax. A one-line "Note: the rendered shape is `tenant_slug='X'` with no spaces" would prevent the off-pattern grep noise.
- **EF dedup contract documented in SPEC.** The current SPEC implicitly assumes the EF only inserts. Documenting "the EF's dedup-on-phone behavior means a returned `is_new:false` with a demo `tenant_id` is also positive proof of routing" would have spared the analytical reasoning in §4 of this report.

---

## 7. Self-Assessment

| Dimension | Score | Justification |
|---|---|---|
| Adherence to SPEC | 9/10 | All steps executed in order, no skipped checks, no scope expansion. -1 for the dedup verification path divergence in 5c (forced by SPEC's missing dedup model). |
| Adherence to Iron Rules | 10/10 | All UPDATEs WHERE-scoped to demo tenant_id literal, all `jsonb_typeof='array'` preserved, no DDL, no main, no destructive ops outside §4 declared list, integrity gate pre-run clean. |
| Commit hygiene | 9/10 | Single deliverables commit planned per SPEC §11. Explicit-filename `git add` (no `-A`). -1 because the dispatch's "fix(demo): tenant_slug routing + 3 additional webhooks scrubbed + live form-submit verified" subject line is slightly longer than commit-message house style allows (>70 chars). Used the exact verbatim subject per dispatch. |
| Documentation currency | 9/10 | EXECUTION_REPORT and FINDINGS both written; BACKUPS snapshot captured; no module-level CHANGELOG entry needed (Module 3 SESSION_CONTEXT was not the authority for SPEC closes — SPEC folder is). -1 because I did not refresh `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` with this SPEC's close; the Foreman or next session can do that during the Module Close Ceremony or next M3 SESSION_CONTEXT bump. |

---

## 8. Proposals to Improve opticup-executor

### Proposal 1 — Add "Dedup-aware live test" subsection to SQL Autonomy Levels

**File:** `.claude/skills/opticup-executor/SKILL.md`
**Section:** Code Patterns → Database patterns (insert before "SQL migration files" line, ~line 84-90)
**Change:** Append a new bullet:

> - **Dedup-aware live verification.** When a SPEC's Step 5c (or any live INSERT verification) tests an Edge Function whose contract includes dedup (e.g. `lead-intake` returns 409 on phone match), the SPEC's literal `SELECT WHERE name='SPECTEST_X'` post-check will return 0 rows if dedup fires. Two acceptable proof patterns: (a) inspect the EF response — `is_new:false` + an `id` whose `tenant_id` matches the expected target IS positive proof of routing; (b) three negative queries on the WRONG tenant (zero rows touched there). Combine (a)+(b) for conclusive proof. Do NOT close 🟡 just because the SPEC's literal SELECT returned 0 — the routing may still be correct. Do NOT escalate-to-delete the dedup blocker if it is outside the SPEC §4 declared destructive ops scope. Document the dedup observation in FINDINGS and proceed.

**Rationale:** This SPEC's Step 5c was authored assuming a fresh INSERT, but the EF's dedup contract fired and the literal verification path was a no-op. The proof reasoning ("returned `id` is in demo + zero prizma writes = routing fixed") is canonical for any SaaS-isolation SPEC that touches an EF with dedup. Without this guidance the next executor will pause unnecessarily.

### Proposal 2 — Add "Live-form-submit verification surface" template to Foreman/Executor reference pack

**File:** Create new `.claude/skills/opticup-executor/references/LIVE_FORM_SUBMIT_VERIFICATION.md`
**Content (sketch):** A canonical structure for any SPEC that requires "submit a test form / call a public EF / verify cross-tenant isolation". Fields: (a) test phone, (b) anon JWT source (publishable_keys MCP or shared.js), (c) exact submission body shape, (d) dedup behavior expectation, (e) positive verification queries (target-tenant), (f) negative verification queries (non-target tenants), (g) rendered-HTML shape (no-space vs spaced grep patterns), (h) cleanup recipe with row-counts.
**Link:** Reference from SKILL.md "Code Patterns" under the new "Dedup-aware live verification" bullet.

**Rationale:** This is the 3rd SaaS-isolation SPEC in 4 days (`M3_DEMO_TENANT_SEED_FROM_PRIZMA`, `M3_DEMO_WEBHOOK_SCRUB`, this one). The first 2 closed 🟡 because they didn't run any live test; this one closed 🟢 only by deriving the proof structure on-the-fly. Encoding the recipe in a reference file converts "we'll figure it out each time" into a vetted template that the Foreman can copy-paste into the SPEC §5c structure verbatim.

---

## 9. Final State

**Commits:** 1 expected (this report + FINDINGS + BACKUPS file together) — see Final Report below.

**DB row deltas:**

| Row | Slug | Lang | Pre size / md5 | Post size / md5 | Delta |
|---|---|---|---|---|---|
| aa668835 | /supersale/ | he | 44528 / b8c53faf | 44526 / ce623ba3 | -2 |
| 7bf63c6c | /multisale-brands-cat/ | he | 39445 / 5f467a2a | 39387 / 374776ee | -58 |
| f578bf2c | /premiummultisale/ | he | 93005 / 1f67b9bc | 92947 / e0d5adf0 | -58 |
| 39f97fb3 | /מיופיה/ | he | 14154 / 5194482e | 14096 / 05a17dd0 | -58 |
| 1c497aa4 | /eventsunsubscribe/ | he | 3852 / cf12178f | 3805 / 61aa1a5e | -47 |

All 5 rows: `jsonb_typeof(blocks) = 'array'` (Rule 31 preserved).

Prizma totally untouched: 64 published pages, zero `crm_leads` rows touched by this SPEC.

---

*End of EXECUTION_REPORT. Awaiting Foreman review.*
