# Optic Up — Troubleshooting & Known Issues

> **Check here FIRST before debugging any issue.**
> Every resolved bug is documented with root cause and fix.

---

## CSS / Layout

### Right margin gap on mobile Safari (RTL)

**Symptom:** All pages show a visible gap/margin on the right side in mobile Safari.

**Root cause (found after 3 attempts):**
1. `overflow-x:hidden` on `body` alone does NOT work on iOS Safari — must also be on `html`
2. `100vw` in CSS includes scrollbar width on mobile Safari — any element using `width:100vw` or `calc(100vw - X)` will exceed the viewport

**Fix:**
- Add `html, body { overflow-x: hidden; }` to ALL page CSS files
- Replace ALL `100vw` usages with `100%` or `auto` with `left:0;right:0`
- Files fixed: css/styles.css, css/inventory.css, css/employees.css, css/shipments.css, css/settings.css, css/header.css, shared/css/modal.css

**Prevention:** Never use `100vw` in CSS. Use `100%` instead. Add to code review checklist.

**Commits:** Phase 7 hotfix cycle (2026-03-19)

---

## Database / Constraints

### stock_counts_count_number_key — duplicate key on count creation

**Symptom:** Error "duplicate key value violates unique constraint stock_counts_count_number_key" when creating a new stock count in demo tenant.

**Root cause:** The UNIQUE constraint on `count_number` was global, not per-tenant. Demo and Prizma could collide.

**Fix:**
```sql
ALTER TABLE stock_counts DROP CONSTRAINT IF EXISTS stock_counts_count_number_key;
ALTER TABLE stock_counts ADD CONSTRAINT stock_counts_count_number_tenant_key UNIQUE (count_number, tenant_id);
```

**Prevention:** Every UNIQUE constraint must include `tenant_id`. Add to SaaS Rules in CLAUDE.md.

**Commits:** Manual SQL fix (2026-03-19)

---

## Barcode Scanning

### ZXing barcode scan issues

**Symptom:** Most barcodes don't scan, or error toast keeps repeating.

**Root causes:**
1. `decodeFromVideoDevice(null, ...)` opens default camera instead of rear — changed to `decodeFromStream(stream, videoEl, ...)`
2. Garbage filter regex `/^\d{5,}$/` was too strict — changed to `/^[A-Za-z0-9\-]{4,}$/`
3. Error debounce wasn't working — same barcode within 2s was re-triggering. Added camera-level debounce in ZXing callback.

**Fix:** All three fixed in stock-count-camera.js hotfix.

**Prevention:** Test barcode scanning on physical device after any camera code change.

**Commits:** Phase 7 hotfix (2026-03-19)

---

## Multi-Tenant

### Demo tenant missing data / broken UI

**Symptom:** Demo tenant shows "אין מותגים", empty screens, broken functionality.

**Root cause:** clone-tenant.sql creates data snapshots that become stale over time. New tables, columns, or data added after the clone are missing.

**Fix:** Re-run clone-tenant.sql after any schema or major data changes.

**Prevention:** After adding new tables, update clone-tenant.sql to include them (noted in CLAUDE.md QA Rules).

### Demo barcodes prefixed with "D" — physical scanning fails

**Symptom:** Scanning real Prizma barcodes in demo tenant returns "not found" because demo inventory has barcodes like D0003762 while physical labels say 0003762.

**Root cause:** clone-tenant.sql prefixes all barcodes with "D" to avoid UNIQUE constraint violations (barcode was globally unique, not per-tenant).

**Fix applied:**
```sql
DROP INDEX IF EXISTS idx_inventory_barcode_unique;
ALTER TABLE inventory ADD CONSTRAINT inventory_barcode_tenant_key UNIQUE (barcode, tenant_id);
```
Updated clone-tenant.sql to copy barcodes as-is (no "D" prefix).

**Status:** RESOLVED

**Commits:** 035_barcode_unique_per_tenant.sql migration (2026-03-20)

### Stale session after tenant re-clone — mobile shows empty data

**Symptom:** After deleting and re-creating demo tenant, mobile browser shows
"אין מותגים", 0 items, empty screens — despite data existing in DB.
Desktop works fine after refresh.

**Root cause:** sessionStorage retains the OLD tenant UUID. The new tenant
gets a new UUID. All queries run with the stale UUID → 0 results.

**Fix:** Log out, close the browser tab completely, reopen and log in fresh.
Clearing Safari cache also works.

**Prevention:** When re-cloning a tenant, all connected devices must log out
and back in. Consider adding a session validation check: if tenant_id in
sessionStorage doesn't exist in the tenants table, force logout.

**Status:** Documented. Session validation enhancement deferred.

### inventory_barcode_tenant_key — duplicate key on unknown item "create new barcode"

**Symptom:** Error "duplicate key value violates unique constraint inventory_barcode_tenant_key" when clicking "צור פריט חדש (ברקוד חדש)" in the unknown item flow during stock count.

**Root cause:** `loadMaxBarcode()` in data-loading.js silently swallowed query errors via `catch(e) { console.warn(...) }`. When the query failed (RLS issue, network, stale JWT), `maxBarcode` was set to 0, causing `generateNextBarcode()` to return `0000001` — which already existed. Additionally, there was no collision verification or retry logic.

**Fix:**
1. `loadMaxBarcode()` — now throws on query error instead of silent catch
2. `generateNextBarcode()` — verifies candidate barcode doesn't exist in DB before returning; retries up to 10 times if collision detected
3. `_insertNewInventoryItem()` — retries with fresh barcode on unique constraint violation (PostgreSQL error code 23505)

**Prevention:** Any function generating unique identifiers should verify uniqueness before returning. Never silently swallow errors in functions that produce values used for DB inserts.

**Commits:** da7cce6 (2026-03-21)

---

## Edge Functions

### Edge Function cross-function calls return 401

**Symptom:** One Edge Function calls another via `fetch()` with
`Authorization: Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}` and gets HTTP 401.
The call never reaches the target function's handler — the Supabase gateway
rejects it.

**Root cause:** Inside Edge Functions, `Deno.env.get("SUPABASE_ANON_KEY")`
returns the newer `sb_publishable_*` key format. The Edge Function gateway's
`verify_jwt` only accepts JWT-format tokens, so it rejects the publishable key.
`supabase-js` `functions.invoke()` hits the same wall because its default
auth path uses the same anon key.

**Fix:** Use the legacy JWT anon key (same value as in `js/shared.js` line 3)
for cross-EF calls. Either read from a dedicated Supabase secret
(`LEGACY_ANON_KEY`) or hardcode as a constant — acceptable since the value
is already git-tracked.

**Pattern:**
```typescript
// Legacy JWT anon key — copy verbatim from js/shared.js line 3
const ANON_KEY = "<LEGACY_JWT_ANON_KEY_FROM_SHARED_JS>";

const res = await fetch(`${SUPABASE_URL}/functions/v1/target-function`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${ANON_KEY}`,
    apikey: ANON_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});
```

**Prevention:** For new cross-EF wiring, prefer the dedicated secret pattern
over hardcoding. Include the legacy-JWT-only disclaimer in any new
`send-message`-style shared dispatch helper.

**Discovered:** P3c+P4 (2026-04-22), Finding M4-INFRA-01.
**Affected:** `supabase/functions/lead-intake/index.ts` → `send-message` call.

**Commits:** 37e8cc4 (2026-04-22)

---

## Template for new entries

### [Title]

**Symptom:**

**Root cause:**

**Fix:**

**Prevention:**

**Commits:**

---

## Phase 0 Rails — Process & Onboarding

### First Action Protocol catches wrong-repo session attachment

**Symptom:** A new Claude Code session is opened attached to the wrong repository (e.g., to `opticalis/opticup-storefront` while the task is in `opticalis/opticup`, or vice versa). If work begins before the mismatch is noticed, commits land in the wrong repo, file edits target the wrong tree, and recovery requires reverting and reapplying on the correct side.

**Root cause:** Both repos live under the same user directory on each machine (e.g., `C:\Users\User\opticup` and `C:\Users\User\opticup-storefront`). A terminal opened in the wrong folder — or an IDE that remembered a previous working directory — gives Claude Code no implicit signal about which repo it is in. The repos have overlapping filenames (`CLAUDE.md`, `docs/`, `modules/`), so file-level inspection alone cannot disambiguate.

**Fix:** `CLAUDE.md §1 — First Action Protocol` mandates that every new session starts with `git remote -v` to confirm the origin matches the task. This is the first step, before any file is read or modified. If the remote does not match, the session STOPS and reports to the user.

**Prevention (and real-world validation):** On **2026-04-11**, during the launch of **Module 3.1 Phase 1A Foundation Audit**, a secondary chat was opened attached to `opticup-storefront` when the task required `opticup` (the ERP repo). The `git remote -v` check in step 1 of the First Action Protocol caught the mismatch **before any file was touched**. The session was terminated cleanly and reopened in the correct repo. See `modules/Module 3.1 - Project Reconstruction/docs/audit-reports/PHASE_1A_FOUNDATION_AUDIT_REPORT.md §2` ("CLAUDE.md — ALIVE — project constitution...First Action Protocol is the catch that saved the wrong-repo discovery session today") and `modules/Module 3.1 - Project Reconstruction/SESSION_CONTEXT.md` ("Lessons banked from Phase 1A — First Action Protocol works as designed — caught a wrong-repo session attachment before any file was touched"). This is the **first recorded real-world validation** of the protocol. Worth remembering: the protocol's value is proven by a single near-miss; do not shorten it.

**Commits:** Protocol rails shipped in Phase 0 (April 2026); first validated incident logged 2026-04-11 in Module 3.1 Phase 1A.

---

### Cowork-VM reports mass CRLF/truncation corruption — DO NOT trust the raw report

**Symptom:** A Cowork VM strategic session opens the repo and sees `git status --short | wc -l` return a very large number (e.g., 1,083). A forensic sweep reports "800+ files with CRLF changes" and "40+ truncated/null-padded files." A recovery SPEC is authored to clean everything up. When the executor (Claude Code on Daniel's Windows desktop) actually runs, the working tree shows only 4–5 entries — the clean, expected state. Running the SPEC's destructive recovery steps against a healthy tree is wasted work at best, destructive at worst (stash-and-restore can lose real uncommitted edits if the restore step has a bug).

**Root cause:** Two separate things are being conflated:
1. **Line-ending display drift.** Daniel's Windows desktop has `core.autocrlf=true`. Files check out to disk with CRLF and are normalized back to LF when git reads them. `git diff` sees zero change; a raw filesystem reader (`file -i`, `od`, `xxd`, `tail -c`) sees `\r\n`. The Cowork VM does not have autocrlf, so when its subagent reads files via raw-bytes inspection, it reports "CRLF everywhere" — but on Daniel's git, those are NOT staged/unstaged changes. This is a **reporting artifact**, not corruption.
2. **The real null-byte corruption pattern** (documented in auto-memory as the "Cowork truncation" issue) is a separate, rarer event that DID happen historically (286 null bytes in `crm.html` on 2026-04-21). It's real, it's dangerous, and it's the reason Iron Rule 31 exists. But it is NOT what triggers the "1,083 files changed" report.

**Fix:** Before writing any recovery SPEC based on a forensic report from a different environment, the SPEC author MUST:
1. Re-verify every state claim using `git status --porcelain`, `git diff`, `git ls-files` on the **target execution environment**, not the authoring environment.
2. Explicitly record known-config baselines in the SPEC: `core.autocrlf`, `core.eol`, git version, OS.
3. Distinguish reporting artifacts (filesystem-level view through the Cowork VM lens) from real corruption (null bytes in git-tracked content, mid-word truncation).

**Prevention — process-level guard:** 
- `opticup-strategic` SKILL §"SPEC Authoring Protocol" Step 1.5 requires an environment-parity check when authoring SPECs that will execute on a different machine (per FOREMAN_REVIEW of WORKING_TREE_RECOVERY, 2026-04-24).
- `opticup-executor` SKILL Step 1.4 requires a precondition-drift check at execution time — any mismatch between SPEC-stated starting state and live starting state triggers a STOP.
- Iron Rule 31 + `scripts/verify-tree-integrity.mjs` (once shipped) uses `git status --porcelain` / `git ls-files`, NOT raw filesystem scans, for file discovery — avoiding the autocrlf false-positive mode entirely.

**Validated incident:** 2026-04-24 — WORKING_TREE_RECOVERY SPEC was authored on Cowork VM assuming 1,083 corrupted files; executor halted at step 0 on Windows desktop after seeing only 5 entries. Zero destructive action, correct outcome. See `modules/Module 4 - CRM/final/WORKING_TREE_RECOVERY/` (SPEC + EXECUTION_REPORT + FINDINGS + FOREMAN_REVIEW) for full record. INTEGRITY_GATE_SETUP SPEC inherited the corrected design.

**Commits:** `666f20f` (Commit 1 of INTEGRITY_GATE_SETUP — bundles the WORKING_TREE_RECOVERY retrospective + holdover files).

---

### Secondary Chat activation antipattern ("what role am I playing?")

**Symptom:** A new Secondary Chat is opened with its assigned template and SPEC, but instead of immediately executing the SPEC it asks the user meta-questions ("Am I a Secondary Chat? Should I be running the SPEC or reviewing it? What is my scope here?"). The chat stalls in role-clarification instead of producing its first Claude Code prompt. In severe cases the chat refuses to proceed entirely.

**Root cause:** When `MODULE_3.1_SECONDARY_CHAT_TEMPLATE.md` is **attached as a file** (instead of pasted as the first message body), the chat treats it as reference material rather than as an activation prompt. The role-self-identification language at the top of the template is easy to miss when the template is opened as an attachment, leading to the chat reading the SPEC first and then second-guessing whether executing it is actually its job.

**Fix:** Three steps, applied during the Module 3.1 Phase 1 launch sequence:
1. **Template-as-text, SPEC-as-attachment** — paste the Secondary Chat template as the **first message body** in the new chat, then attach the phase SPEC as a file. The template body forces the chat to read "I am a Secondary Chat for Module X Phase Y" before seeing any other material.
2. **Template hardened with a 🚨 activation block** at the top, stating explicitly "YOU ARE A SECONDARY CHAT. YOU DO NOT ASK WHAT YOUR ROLE IS. YOU READ THE SPEC AND PRODUCE A PROMPT." The emoji + all-caps + position-at-top pattern makes the block impossible to skim past.
3. **Forbidden behaviors list** added to the template enumerating "asking what role I am playing" as explicitly off-limits.

**Prevention:** The hardened template is the current `modules/Module 3.1 - Project Reconstruction/MODULE_3.1_SECONDARY_CHAT_TEMPLATE.md`. This fix was banked as a lesson after **three consecutive chats (Phase 1A, 1B, and a Phase 2 first attempt) all triggered the antipattern** — three failures in a row indicated a template defect, not chat caution. The new version was tested on the Phase 2 retry and succeeded. This pattern (template-as-text, SPEC-as-attachment, hardened 🚨 activation block) should be **canonized in the forthcoming `docs/Templates/UNIVERSAL_SECONDARY_CHAT_PROMPT.md`** (a Module 3.1 deliverable). Source: `modules/Module 3.1 - Project Reconstruction/SESSION_CONTEXT.md` — "Lessons banked from Phase 1A #2 — Secondary chat activation" and Decision Log entry for 2026-04-11 ("Secondary chat template fully rewritten (310 → 171 lines). New design: activation-first, sequential file loading, exact-format first response, explicit forbidden behaviors list. Three previous chats (1A, 1B, 2) all triggered the 'what role am I playing' antipattern with the old template. Three failures in a row = template defect, not chat caution. New version tested on Phase 2 retry — succeeded.").

**Commits:** Template hardening landed 2026-04-11 during Module 3.1 Phase 1→2 transition.

---

### Stop-and-ask before assuming on parallel work (escalation protocol)

**Symptom:** A Module Strategic Chat or Secondary Chat discovers, mid-audit, that another module or phase has been running **parallel work on the same files** without the current chat's knowledge. The discovery contradicts the current chat's mental model of the project. The obvious temptation is to "proceed anyway" or "merge both mental models on the fly," which always produces a plan built on a wrong premise.

**Root cause:** In a multi-layer chat hierarchy (Main Strategic → Module Strategic → Secondary → Claude Code), state updates are manual. A Module Strategic chat can be started before news of a parallel remediation effort reaches it. Without an explicit "stop and ask" rule, the natural bias is to keep executing the plan already written.

**Fix:** **Stop immediately, escalate to Daniel, and wait for a decision from Main Strategic Chat.** Do not attempt to reconcile the two worlds yourself. Do not proceed on any assumption about which one is authoritative. The cost of asking is 10–15 minutes; the cost of assuming is a full phase's work built on the wrong premise.

**Prevention (real-world incident):** During **Module 3.1 Phase 1C (Module 3 Dual-Repo Audit)**, the secondary chat discovered that Module 3 Strategic Chat had been running **its own remediation effort in parallel** (a "Phase A" with 10 commits `50523b3 → 97846e8`) that had already rewritten 8 critical Module 3 doc files. The Phase 1C chat **stopped and escalated**, Daniel brought it to Main Strategic, and the R15 decision was made in ~15 minutes: "Module 3 Phase A was paused intentionally to wait for Module 3.1 — Phase A's 8 files are GROUND TRUTH (sealed, PASS sanity 18/18), Module 3.1 supplements but never replaces." If the chat had assumed "I was told Module 3.1 owns the Module 3 docs, so I should rewrite what I find," it would have overwritten sealed work. The stop-and-ask instinct saved the phase.

**Prevention rule (project-wide):** When an audit or spec-writing chat finds something that **contradicts the strategic chat's mental model of the project**, it **escalates before proceeding** — no exceptions. This rule will be canonized in `docs/Templates/UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md` (Module 3.1 deliverable) as a permanent constraint. Related: "Module 3.1 does not duplicate work that has already been done in Module 3" (locked principle from Main, 2026-04-11).

**Commits:** Incident logged 2026-04-11 in `modules/Module 3.1 - Project Reconstruction/SESSION_CONTEXT.md` Decision Log ("R15 RESOLVED by Main Strategic Chat" + "Broader principle locked by Main").

---

### One question at a time — batched question antipattern

**Symptom:** A strategic chat needs multiple decisions from Daniel and presents them as a numbered list or table ("please answer (1), (2), and (3)"). Daniel's response is slower, less precise, and often resolves only one of the questions — leaving the chat blocked on the others. Repeated iterations of the same ask burn time on both sides.

**Root cause:** Multi-question prompts create cognitive load for the decision-maker. When Daniel is reading a table of 3 decisions, he has to hold all three in working memory while weighing each. The natural response is to answer the one that's clearest and punt on the others — which leaves the chat in an ambiguous waiting state.

**Fix:** **One question, one response, repeat.** When a strategic chat needs information from Daniel, it asks **exactly one question**, waits for the answer, processes it, then asks the next question. No tables of multiple questions. No `(1)(2)(3)` lists. If the chat has 5 decisions to make, that's 5 round trips, and that's fine — each round trip is fast because each question is focused.

**Prevention (real-world incident):** Noted correctly by Daniel **on the third reminder** during Module 3.1 Phase 1→2 transition. The pattern of batching questions into tables was producing slow, incomplete answers. The new rule (ONE question at a time) was locked 2026-04-11 and will be canonized in `docs/Templates/UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md`. Source: `modules/Module 3.1 - Project Reconstruction/SESSION_CONTEXT.md` "Lessons banked from Phase 1C closure #5 — Strategic chat must ask one question at a time."

**Commits:** Rule locked 2026-04-11, to be canonized in Module 3.1 Phase 3 deliverables.
