# RUNG 1 — Activation Prompt — C001_SEND_MESSAGE_PHONE_ALLOWLIST_REMOVAL

> **Paste this entire block into a fresh Claude Code session. Load the `opticup-executor` skill first.**
> **Reporting language: ENGLISH to Daniel.**
> **Cutover blocker: YES — must land before any other pre-cutover work fires real SMS.**
> **Pre-cutover order:** This is the FIRST of 3. After this lands → M4_AUTOMATION_ENGINE_SERVER_SIDE Rung 1 → P5_7_STOREFRONT_FORM_REWIRE.

---

## YOUR MANDATE

You are the Executor for Optic Up. Load `opticup-executor` (which loads `opticup-guardian` automatically). Then execute Rung 1 of C001_SEND_MESSAGE_PHONE_ALLOWLIST_REMOVAL per this prompt.

The SPEC and FOREMAN_REVIEW live at `modules/Module 4 - CRM/docs/specs/C001_SEND_MESSAGE_PHONE_ALLOWLIST_REMOVAL/`. **Read FOREMAN_REVIEW.md first** — it contains scope corrections (layer 2 IS real and identical, must refactor; layer 3 does NOT exist; layer 4 candidate `retry-failed` to verify; `[functions.send-message]` config block must be added by THIS Rung). **Where SPEC and FOREMAN_REVIEW disagree, the FOREMAN_REVIEW wins.**

### Pre-flight (mandatory, before any change)

1. **Session-start protocol from CLAUDE.md §1** — confirm machine, verify branch is `develop`, pull latest, two-phase Cowork sync gate (survey untracked first), clean-repo check, **integrity gate `npm run verify:integrity`** (exit 0 mandatory).
2. **Load Iron Rules 1–23 + 31** — top of mind throughout.
3. **Tenant scope:** all QA in this Rung uses **prizma** tenant — UUID `6ad0781b-37f0-47a9-92e3-be9ed1477e1c`. Any curl test, any DB write verification, any post-deploy check is on prizma. **NOT demo.**
4. **Phone allowlist for any SMS-triggering test:** ONLY `0537889878` and `0503348349` (Daniel's two personal lines). The third historical phone `0507168471` IS in the existing hardcoded list and IS in the new pre-populated `tenants.test_mode_sms_allowlist` JSONB array — but you MUST NOT use it for live test sends in this Rung. If a test would reach any phone other than the two allowlisted-for-testing, abort.
5. **Selective `git add` only** — the repo has pre-existing intentional WIP from prior Cowork sessions (5 untracked draft files at repo root + the `__LAUNCH_PLAN_DRAFT__/` tree). Daniel has authorized those as WIP. **Do NOT `git add -A` or `git add .` ever.** Add only the files this Rung touches by explicit name.
6. **Read these files end-to-end before writing any code:**
   - `modules/Module 4 - CRM/docs/specs/C001_SEND_MESSAGE_PHONE_ALLOWLIST_REMOVAL/SPEC.md`
   - `modules/Module 4 - CRM/docs/specs/C001_SEND_MESSAGE_PHONE_ALLOWLIST_REMOVAL/FOREMAN_REVIEW.md`
   - `supabase/functions/send-message/index.ts` (full — pay attention to lines 32-46 = constant + helper, line 283 = check site, the surrounding INSERT block lines 284-295)
   - `supabase/functions/dispatch-queue/index.ts` (full — lines 17-28 = constant + helper, line 111 = check site)
   - `supabase/functions/retry-failed/index.ts` (full — verify whether it has its own `phoneAllowed` / `ALLOWED_PHONES`)
   - `supabase/config.toml` lines 390–423 (existing EF blocks — note `[functions.send-message]` is ABSENT)

### Step 1 — DB + Repo Pre-Flight (Iron Rule 21)

Run these checks; report findings:

```sql
-- A. Confirm test_mode_sms_allowlist column does NOT yet exist
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='tenants' AND column_name='test_mode_sms_allowlist';
-- Expected: 0 rows. If 1 row → STOP, reconcile with Foreman.

-- B. Capture current prizma + demo rows for rollback baseline
SELECT id, slug, name FROM tenants WHERE id IN
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c', '8d8cfa7e-ef58-49af-9702-a862d459cccb');

-- C. Confirm tenants table actual JSONB columns (FOREMAN_REVIEW §5 delta — SPEC §3.3 lists 'config' which does not exist)
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema='public' AND table_name='tenants' AND data_type='jsonb' ORDER BY column_name;
-- Expected: payment_links, shipment_config, ui_config (NO 'config' column).
```

Then in repo:
```
grep -rn "ALLOWED_PHONES\|phoneAllowed" supabase/functions/ modules/ --include="*.ts" --include="*.js"
```

Expected matches: `send-message/index.ts` (constant + helper + caller), `dispatch-queue/index.ts` (constant + helper + caller), and POSSIBLY `retry-failed/index.ts`. Document all matches in a section of EXECUTION_REPORT.md before any edit.

If `retry-failed/index.ts` defines its own `ALLOWED_PHONES` or `phoneAllowed` → it is layer 4; refactor it the same way in this Rung.
If `retry-failed/index.ts` only references `phone_not_allowed` as a status string (no allowlist code) → it inherits the new behavior automatically; no change.

### Step 2 — DB schema migration

Apply via `mcp__claude_ai_Supabase__apply_migration`. Migration name: `c001_add_tenants_test_mode_sms_allowlist`.

```sql
ALTER TABLE tenants
  ADD COLUMN test_mode_sms_allowlist JSONB NULL;

COMMENT ON COLUMN tenants.test_mode_sms_allowlist IS
'When NULL: production mode — SMS to any phone is allowed.
When NOT NULL: must be a JSONB array of E.164 phone strings (e.g. ["+972537889878"]) — only those phones receive SMS, all others rejected with phone_not_allowed (test mode).
Set during pre-cutover QA windows; set to NULL by cutover-day operational checklist when tenant goes live.
Replaces the hardcoded ALLOWED_PHONES constants in send-message + dispatch-queue EFs (C001, 2026-05-03).';

-- Pre-populate prizma + demo with the existing 3-phone array (preserves current behavior through deploy).
UPDATE tenants
SET test_mode_sms_allowlist = '["+972537889878", "+972503348349", "+972507168471"]'::jsonb
WHERE id IN (
  '6ad0781b-37f0-47a9-92e3-be9ed1477e1c',  -- prizma
  '8d8cfa7e-ef58-49af-9702-a862d459cccb'   -- demo
);
```

Verify:
```sql
SELECT id, slug, test_mode_sms_allowlist FROM tenants
WHERE id IN ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c','8d8cfa7e-ef58-49af-9702-a862d459cccb');
```
Expected: both rows return the JSONB array; jsonb_array_length = 3.

### Step 3 — Refactor send-message EF (layer 1)

Edit `supabase/functions/send-message/index.ts`:

1. **Delete** the constant + sync helper at lines 37-46:
   ```ts
   const ALLOWED_PHONES = ["0537889878", "0503348349", "0507168471"];
   function normalizePhone(p: string): string {
     const d = p.replace(/[\s+\-]/g, "");
     return d.startsWith("972") ? "0" + d.slice(3) : d;
   }
   function phoneAllowed(phone: string | null): boolean {
     if (!phone) return true;
     const n = normalizePhone(phone);
     return ALLOWED_PHONES.some(a => normalizePhone(a) === n);
   }
   ```

2. **Replace** the comment block at lines 32-36 with:
   ```ts
   // C001 (2026-05-03) — phone allowlist moved from hardcoded ALLOWED_PHONES to
   // tenants.test_mode_sms_allowlist (JSONB array of E.164 strings, NULL = production).
   // Fail-closed on lookup error or malformed JSON — never accidentally blast strangers.
   ```

3. **Add** the new helpers in the same location (need normalizePhone; phoneAllowed becomes async):
   ```ts
   function normalizePhone(p: string): string {
     const d = p.replace(/[\s+\-]/g, "");
     return d.startsWith("972") ? "0" + d.slice(3) : d;
   }
   async function phoneAllowed(db: any, tenantId: string, phone: string | null): Promise<boolean> {
     if (!phone) return true;
     const { data: tenant, error } = await db
       .from("tenants")
       .select("test_mode_sms_allowlist")
       .eq("id", tenantId)
       .maybeSingle();
     if (error) {
       console.warn("phoneAllowed: tenant lookup failed; failing CLOSED for safety", error);
       return false;
     }
     const allowlist = tenant?.test_mode_sms_allowlist;
     if (allowlist == null) return true;  // production mode
     if (!Array.isArray(allowlist)) {
       console.warn("phoneAllowed: malformed allowlist on tenant", tenantId);
       return false;
     }
     const n = normalizePhone(phone);
     return allowlist.some((a: unknown) =>
       typeof a === "string" && normalizePhone(a) === n
     );
   }
   ```

4. **Update the caller at line 283** (currently `if (channel === "sms" && !phoneAllowed(recipientPhone)) {`):
   ```ts
   if (channel === "sms" && !(await phoneAllowed(db, tenantId, recipientPhone))) {
   ```
   `db` and `tenantId` are already in scope at that line (verify by reading the surrounding 50 lines first).

5. The `// --- Allowlist gate (layer 1) ---` comment on line 282 stays accurate — keep it.

### Step 4 — Refactor dispatch-queue EF (layer 2)

Edit `supabase/functions/dispatch-queue/index.ts`:

1. **Delete** lines 17-28 (the constant + sync `normalizePhone` + sync `phoneAllowed`).

2. **Add** the same comment + new helpers as in Step 3 (copy-paste — Iron Rule 21 is about names not duplicated 5-line functions; the alternative is a shared `_lib/` import path the project hasn't established):
   ```ts
   // C001 (2026-05-03) — allowlist layer 2 (defense in depth). Same lookup as
   // send-message; mirrors the layer-1 fail-closed semantics. tenants.test_mode_sms_allowlist
   // is the single source of truth for both layers.
   function normalizePhone(p: string): string {
     const d = p.replace(/[\s+\-]/g, "");
     return d.startsWith("972") ? "0" + d.slice(3) : d;
   }
   async function phoneAllowed(db: any, tenantId: string, phone: string | null): Promise<boolean> {
     if (!phone) return true;
     const { data: tenant, error } = await db
       .from("tenants")
       .select("test_mode_sms_allowlist")
       .eq("id", tenantId)
       .maybeSingle();
     if (error) {
       console.warn("phoneAllowed: tenant lookup failed; failing CLOSED for safety", error);
       return false;
     }
     const allowlist = tenant?.test_mode_sms_allowlist;
     if (allowlist == null) return true;
     if (!Array.isArray(allowlist)) {
       console.warn("phoneAllowed: malformed allowlist on tenant", tenantId);
       return false;
     }
     const n = normalizePhone(phone);
     return allowlist.some((a: unknown) =>
       typeof a === "string" && normalizePhone(a) === n
     );
   }
   ```

3. **Update the caller at line 111** (currently `if (r.channel === "sms" && !phoneAllowed(phone)) {`):
   ```ts
   if (r.channel === "sms" && !(await phoneAllowed(db, r.tenant_id, phone))) {
   ```
   `db` and `r.tenant_id` are already in scope (verify lines 95-115).

### Step 5 — Refactor retry-failed EF if applicable (layer 4)

If pre-flight Step 1's grep showed `retry-failed/index.ts` has its own `ALLOWED_PHONES` or `phoneAllowed`: refactor identically.
If it does NOT: do nothing. Document the decision in EXECUTION_REPORT.md.

### Step 6 — Add `[functions.send-message]` config block (folded in per FOREMAN_REVIEW §1 finding 6)

Edit `supabase/config.toml`. Add this block at the end of the file (after `[functions.lead-intake]`):

```toml
# C001 (2026-05-03) — send-message verify_jwt = true. Block was missing pre-C001;
# the EF defaulted in via CLI. Adding the explicit block prevents CLI redeploy
# from defaulting verify_jwt incorrectly (lesson from M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE
# Rung 2 facebook-campaigns-sync incident, also referenced in lead-intake block).
[functions.send-message]
enabled = true
verify_jwt = true
import_map = "./functions/send-message/deno.json"
entrypoint = "./functions/send-message/index.ts"
```

### Step 7 — Deploy both EFs

Order:
1. Deploy `send-message` EF: `mcp__claude_ai_Supabase__deploy_edge_function`. The deploy applies the new config block AND the EF code change in one shot. Verify via `mcp__claude_ai_Supabase__list_edge_functions` — version should increment.
2. Deploy `dispatch-queue` EF same way.
3. If `retry-failed` was modified (Step 5), deploy that too.

### Step 8 — Curl parity verification on prizma (BEFORE the cutover-day flip)

The pre-populated allowlist preserves current behavior, so these tests should match the pre-Rung behavior exactly.

```bash
# Test A — allowlisted phone → ok:true (will dispatch SMS to Daniel's primary)
curl -X POST 'https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/send-message' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <legacy anon JWT — same key inlined in dispatch.ts:18>' \
  -d '{
    "tenant_id":"6ad0781b-37f0-47a9-92e3-be9ed1477e1c",
    "channel":"sms",
    "body":"C001 verify — please ignore",
    "variables":{"phone":"0537889878","name":"Daniel"}
  }'
# Expected: { "ok": true, "log_id": "<uuid>" }
# Daniel will receive the SMS. Confirm with Daniel before proceeding.

# Test B — non-allowlisted phone → ok:false, error:phone_not_allowed
curl -X POST 'https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/send-message' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <same anon key>' \
  -d '{
    "tenant_id":"6ad0781b-37f0-47a9-92e3-be9ed1477e1c",
    "channel":"sms",
    "body":"C001 verify — should be REJECTED, this should NOT arrive",
    "variables":{"phone":"+15551234567","name":"Test"}
  }'
# Expected: { "ok": false, "error": "phone_not_allowed" }
# NO SMS arrives anywhere. Verify with: SELECT id, status, error_message FROM crm_message_log
#   WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c' ORDER BY created_at DESC LIMIT 5;
# Most recent row should be status='rejected', error_message LIKE 'phone_not_allowed%'.
```

If Test B returns `ok:true` → CRITICAL, the guardrail is broken. STOP. Do not commit. Investigate.

### Step 9 — Integrity gate + commits

1. `npm run verify:integrity` (exit 0).
2. Pre-commit hooks pass.
3. Two atomic commits:

   **Commit A (the EF + config changes):**
   ```
   git add supabase/functions/send-message/index.ts supabase/functions/dispatch-queue/index.ts supabase/config.toml
   # If retry-failed was modified, add it too.
   git commit -m "feat(crm): C-001 — replace hardcoded SMS allowlist with tenants.test_mode_sms_allowlist
   
   send-message + dispatch-queue EFs now read the allowlist from tenants.test_mode_sms_allowlist
   (JSONB array of E.164 strings, NULL = production). Fail-closed on lookup error or malformed
   JSON — never accidentally blast strangers. Pre-populated prizma + demo with the existing
   3-phone array so deploy preserves current behavior; cutover-day flip to NULL goes live.
   
   Also adds [functions.send-message] block to config.toml (was defaulting in via CLI;
   explicit block prevents verify_jwt regression per M4_CAMPAIGNS_V2 Rung 2 lesson).
   
   Per FOREMAN_REVIEW.md."
   ```

   **Commit B (the migration file generated by `apply_migration`):**
   The `mcp__claude_ai_Supabase__apply_migration` tool writes a file under `supabase/migrations/`. Add and commit separately:
   ```
   git add supabase/migrations/<timestamp>_c001_add_tenants_test_mode_sms_allowlist.sql
   git commit -m "chore(db): C-001 — add tenants.test_mode_sms_allowlist + pre-populate prizma + demo"
   ```

4. `git push origin develop` after both commits.

### Step 10 — Write retrospective deliverables (MANDATORY)

Both files at `modules/Module 4 - CRM/docs/specs/C001_SEND_MESSAGE_PHONE_ALLOWLIST_REMOVAL/`:

1. **`EXECUTION_REPORT.md`** — required sections per the executor's template. Must include:
   - The pre-state of both EFs (deployed versions before this Rung).
   - The full grep output from Step 1 (every `ALLOWED_PHONES` / `phoneAllowed` hit in the repo).
   - The retry-failed disposition (refactored / not needed) with the reasoning.
   - Documented confirmation that **layer 3 in `modules/crm/` does NOT exist** as code — answers FOREMAN_REVIEW §1 finding 2 with evidence.
   - Curl test outputs (A and B) with the actual `crm_message_log` row IDs they produced.
   - The exact JSONB written to `tenants.test_mode_sms_allowlist` for both prizma and demo.
   - Rollback recipe: `ALTER TABLE tenants DROP COLUMN test_mode_sms_allowlist; -- redeploy EFs from git revert <commit-hash>`.

2. **`FINDINGS.md`** — anything surprising. Likely small for this SPEC; if empty, write a one-line FINDINGS.md noting "no surprises".

### Step 11 — Report to Daniel (English, brief)

- One sentence: what shipped.
- Confirmation that pre-cutover behavior is preserved (allowlist is now in DB, contains the same 3 phones).
- Reminder of the cutover-day operational step Daniel must run on Sunday morning:
  ```sql
  UPDATE tenants SET test_mode_sms_allowlist = NULL WHERE id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
  ```
- ONE next question, if any (likely "shall I move to M4 Rung 1?").

### Stop-on-deviation triggers (non-negotiable)

- Integrity gate exit ≠ 0 → STOP.
- `apply_migration` returns an error → STOP.
- Step 8 Test B returns `ok:true` (guardrail broken for non-allowlisted phone) → CRITICAL STOP.
- Step 8 Test A does not deliver SMS to Daniel within 60 seconds → STOP, the EF is broken.
- Any unexpected file change appears in `git status` beyond what this prompt scoped → STOP. The 5 pre-existing untracked draft files at repo root + `__LAUNCH_PLAN_DRAFT__/` tree are intentional WIP — DO NOT touch them.
- A null-byte ERROR (exit 1) from the integrity gate at any point → STOP and escalate.
- Pre-flight Step 1 reveals `tenants.test_mode_sms_allowlist` already exists → STOP, reconcile with Foreman.

### Out of scope for Rung 1

- The Sunday-morning cutover-day flip (`UPDATE ... SET test_mode_sms_allowlist = NULL`) — Daniel runs that himself.
- Any email allowlist work — separate post-cutover SPEC.
- Tenant-provisioning logic for the default value of `test_mode_sms_allowlist` on newly-created tenants — concerns tenant onboarding, not C-001.
- Consolidating tenants' multiple JSONB columns — TD-2 in FOREMAN_REVIEW, post-cutover.

---

*End of Rung 1 activation prompt.*
