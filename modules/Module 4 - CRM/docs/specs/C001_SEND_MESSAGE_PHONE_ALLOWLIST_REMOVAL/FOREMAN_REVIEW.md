# FOREMAN_REVIEW — C001_SEND_MESSAGE_PHONE_ALLOWLIST_REMOVAL

> **Reviewer:** opticup-strategic (Foreman hat)
> **Date:** 2026-05-03
> **SPEC author:** Campaign Overseer (Cowork session) — DRAFT
> **Verdict:** 🟢 **APPROVED with minor scope additions.** Single Rung as proposed. No structural restructure required.
> **Cutover-blocker?** YES — must land before any other pre-cutover work fires real SMS.

---

## 1. Verdict & headline reasoning

🟢 The SPEC is well-shaped, well-bounded, and architecturally correct. The fail-closed posture, NULL=wide-open semantics, and one-Rung structure are all the right calls. Three minor scope corrections required before dispatch — none change the SPEC's structure, all are factual fixes:

1. **Layer 2 is REAL** — `supabase/functions/dispatch-queue/index.ts` lines 19-28 contain an identical hardcoded `ALLOWED_PHONES` constant + `phoneAllowed` function, with the check firing at line 111. Pre-flight §11 step 2 should be reframed from "verify if it exists" to "confirm it still matches send-message's shape". Same-Rung refactor of layer 2 is **mandatory**, not optional. The defense-in-depth comment in the source ("Allowlist layer 2 — same list as send-message") makes this explicit.
2. **Layer 3 (CRM UI guard) does NOT exist** — grep of `modules/crm/` returned `crm-automation-dispatch.js` (comment only), `crm-message-error-labels.js` (Hebrew label for `phone_not_allowed` rejection — display, not gate), `crm-confirm-send.js` (rejection display), and `supabase/functions/retry-failed/index.ts` (a possible 4th layer). None has the hardcoded `ALLOWED_PHONES` constant. The "layer 1 of 3" comment in send-message is **aspirational**, not factual. Document this in EXECUTION_REPORT.md as the answer to §5.4 — no layer-3 code change needed.
3. **`retry-failed` EF** is a possible layer-4 surface that the SPEC does not mention. Pre-flight must read it and decide: if it independently re-checks the allowlist, refactor it the same way; if it just retries `crm_message_log` rows whose status was once `rejected`, it inherits whatever shape send-message returns and needs no change.

The line numbers in §3.1 are stale: the constant is at line 37 (not 38–45), `phoneAllowed` is lines 42–46, and the check fires at line 283 (not "around line 270"). Trivial drift; the executor will resolve naturally by reading the file.

§3.3 says `tenants.config` exists ("generic tenant config"). It does **not**. The actual JSONB columns are `shipment_config`, `ui_config`, `payment_links`. No effect on Rung 1 (the new column is independent), but the SPEC's description of what's there is wrong.

§6 success criterion 4 says `[functions.send-message]` block is already in config.toml ("verified in M4_AUTOMATION_ENGINE_SERVER_SIDE Foreman review"). **It is NOT yet in config.toml** — the M4 review *found it missing* and folded its addition into M4 Rung 1. Since Daniel's pre-cutover order is C-001 first → M4 Rung 1 second, **C-001 must add the `[functions.send-message]` block itself**, not depend on M4 Rung 1. Otherwise C-001's send-message redeploy could revert the EF's verify_jwt to its CLI default per the M4_CAMPAIGNS_V2 verify_jwt regression lesson. Folded into the activation prompt.

---

## 2. SPEC quality audit

### 2.1 Strengths

- §1 + §2 framing is sharp: the "blast radius" reasoning makes the cutover-blocker case without hyperbole.
- §5.2 fail-closed-on-error posture is exactly right (see §3 below).
- §5.5 cutover-day flip mechanism is correctly minimal — one UPDATE row, atomic, reversible.
- §11 pre-flight checks are queryable and concrete.
- §13 honestly carries forward the M4_AUTOMATION_ENGINE Foreman lesson (citation accuracy).

### 2.2 Defects (none structural — all factual / line-number drift)

1. Line numbers in §3.1 stale by ~6. (Resolves naturally on read.)
2. Layer 2 framed as "verify if it exists" — it does, identically. Reframe.
3. Layer 3 "CRM UI guard" does not exist as code; comment is aspirational. Document.
4. §3.3 mentions `tenants.config` which does not exist.
5. §6 SC4 incorrectly assumes config.toml block exists. Doesn't.
6. SPEC silent on `supabase/functions/retry-failed/index.ts` — possible layer 4 to verify.

---

## 3. Decisions on §5.2 / §5.3+5.4 / §5.5

### §5.2 — EF refactor (sync→async, fail-closed): ✅ APPROVED as-written

- **Sync→async conversion:** clean; one caller in `index.ts:283`. No other module imports `phoneAllowed`. No downstream breakage.
- **Fail-closed on lookup error:** **ENDORSED.** Daniel's intent — "never blast strangers" — is best served by failing the rare DB-hiccup case rather than the catastrophic blast case. The cost (occasional false rejection during a Supabase outage) is small and observable (`crm_message_log.status='rejected'` row with a clear `error_message`). The benefit (zero accidental customer blasts during a transient DB issue) is large and protects exactly what the original guardrail was designed to protect.
- **Fail-closed on malformed JSON:** Same reasoning. Endorsed.
- **NULL = wide-open semantics:** **CORRECT for the migration moment** — pre-populating prizma + demo with the existing 3-phone array means deploy preserves current behavior exactly. If NULL meant blocked, every tenant without an explicit allowlist would silently drop SMS, including any tenant onboarded between deploy and Daniel's cutover-day flip. Foreman recommendation: extend the column COMMENT clause to make the production-default semantics explicit ("NULL = production / SMS to all phones; non-NULL JSONB array = test mode / allowlisted phones only"). The SPEC's comment text is already close — endorse with a wording check at execution time.
- **SaaS-litmus consideration:** A second tenant joining tomorrow inherits NULL = production by default. That's the right axis. If onboarding wants a "soft-launch" mode where new tenants start with `[]` (blocked-until-configured), that's a tenant-provisioning concern handled in tenant-create flow, not in C-001. C-001 keeps the column semantic clean and lets future onboarding logic decide its own default.

### §5.3 + §5.4 — Layer 2 + Layer 3 audit: ✅ APPROVED with corrections

- **Layer 2:** REAL. Refactor in the same Rung, mirroring the layer-1 change exactly. The same `tenants.test_mode_sms_allowlist` lookup, the same fail-closed posture, the same NULL=wide-open semantics. The only difference: dispatch-queue already has the `r.tenant_id` field on every row it processes (line 105 type annotation), so passing `tenantId` into `phoneAllowed` is trivial. **Don't share the helper across EFs** — Deno EFs don't share modules cleanly across folders. Copy-paste the function into both files (identical code is fine — Iron Rule 21 is about names, not duplicated 5-line functions; the alternative is a shared `_lib/` import path the project hasn't established).
- **Layer 3:** Does NOT exist as a code surface. The grep matches are all secondary (error labels, status displays). **No code change in `modules/crm/`.** Document the absence in `EXECUTION_REPORT.md` so the SPEC's "layer 1 of 3" comment is finally answered with evidence.
- **Layer 4 (executor pre-flight):** Read `supabase/functions/retry-failed/index.ts`. If it independently calls `phoneAllowed` or has its own `ALLOWED_PHONES`, refactor it the same way. If it simply retries by re-POSTing to send-message, it inherits the new behavior automatically and needs no change.

### §5.5 — Cutover-day flip mechanism: ✅ APPROVED as-written

- **Single-row UPDATE is the right shape.** Atomic, instant, fully reversible (`UPDATE ... SET test_mode_sms_allowlist = '[...]'::jsonb` rewinds it). Adds an audit row in `tenants.updated_at`.
- An RPC wrapper would add ceremony with no real upside — Daniel runs the UPDATE manually as part of the cutover-day operational checklist; the SQL is short enough to type without error.
- Optional enhancement (not a blocker): the cutover-day report should record (a) the UPDATE statement run, (b) the timestamp of `tenants.updated_at` post-UPDATE, (c) a curl proof that a non-allowlisted phone now returns `ok:true` post-flip. This is checklist material, not Rung 1 code.

---

## 4. Rung structure

**Single Rung — APPROVED.** No reason to split.

The split-trigger in §12 ("if layers 2+3 are larger than expected") doesn't fire: layer 2 is a 5-line copy-paste mirror of layer 1, and layer 3 is empty. The whole change is small, symmetric, and naturally atomic.

### Rung 1 acceptance criteria (mapped from SPEC §6)

1. ✅ `tenants.test_mode_sms_allowlist` JSONB column exists with the canonical comment.
2. ✅ `prizma` + `demo` rows pre-populated with the existing 3-phone array (E.164 form: `["+972537889878", "+972503348349", "+972507168471"]`).
3. ✅ `send-message` EF: `ALLOWED_PHONES` constant removed; `phoneAllowed` is async `(db, tenantId, phone)` with fail-closed semantics.
4. ✅ `dispatch-queue` EF: same refactor (layer 2).
5. ✅ `retry-failed` EF: verified in pre-flight; refactored only if it has its own check.
6. ✅ `[functions.send-message]` block ADDED to `supabase/config.toml` (defensive — folded in here per §1 finding 6 above).
7. ✅ Curl test on prizma BEFORE flip: allowlisted phone → `ok:true`; non-allowlisted phone → `ok:false, error:phone_not_allowed`.
8. ✅ EXECUTION_REPORT.md documents: layer-3 non-existence, retry-failed disposition, the pre-state of both EFs (deployed versions), the rollback plan.
9. ✅ `verify:integrity` exit 0; pre-commit hooks pass.

The post-cutover Sunday-morning flip + post-flip curl proof are NOT Rung 1 acceptance — they are Daniel's cutover-day operational checklist (per §7 autonomy envelope).

---

## 5. Deltas to apply to SPEC.md (record-only — do NOT rewrite the SPEC)

If a future session edits the SPEC, these deltas apply:

1. §3.1 line numbers: constant is line 37 (not 38–45); `phoneAllowed` is lines 42–46; check fires line 283 (not "around line 270").
2. §3.2 reframe layer 2 from "verify if it exists" to "exists at dispatch-queue lines 19-28; refactor in parallel".
3. §3.3 remove the line claiming `tenants.config` exists. List actual JSONB columns: `shipment_config`, `ui_config`, `payment_links`.
4. §5.4 reframe to: "verified absent; document in EXECUTION_REPORT.md".
5. Add new sub-section §5.6 (or fold into §5.3) — "Layer 4 candidate: read retry-failed/index.ts in pre-flight; refactor only if it has its own check".
6. §6 SC4 — replace with "[functions.send-message] block ADDED to config.toml in this Rung (defensive — was missing pre-Rung)".

---

## 6. Findings processing

No EXECUTION_REPORT or FINDINGS yet — pre-execution review.

Adjacent finding worth tracking as tech-debt (does not block this Rung):
- **TD-2:** `tenants` table has 3 separate JSONB columns (`shipment_config`, `ui_config`, `payment_links`) plus 30+ scalar columns. Adding `test_mode_sms_allowlist` as a 4th JSONB column is fine for now, but the schema is sprawling. A future SaaS-readiness SPEC could consolidate the JSONB columns into a single `config jsonb` with namespaced keys. NOT in scope here.

---

## 7. Self-improvement proposals (opticup-strategic)

### Proposal A — Add a "verify SPEC's stated cross-SPEC dependencies" check to Step 1.5 Cross-Reference Check.

**Justification:** This SPEC's §6 SC4 said "[functions.send-message] block already exists (verified in M4_AUTOMATION_ENGINE_SERVER_SIDE Foreman review)". It conflated "the M4 review identified the gap" with "the gap is fixed". The block does NOT yet exist in config.toml — the M4 review *found it missing*. The SPEC author read the M4 review, saw the topic discussed, and assumed resolution. This is a class of error: assuming a referenced SPEC has shipped when it has only been authored. The fix: when a SPEC asserts "[X] is already done as of [other SPEC]", the author MUST verify against the live state (config.toml, DB, deployed EF version) — not just the other SPEC's text. Add to Step 1.5: "for every cross-SPEC dependency claim in the new SPEC, verify the dependency against the live state, not the cited SPEC's body."

### Proposal B — When the Pre-SPEC sweep finds existing infrastructure described as "layer N of M", verify the count of layers actually exists.

**Justification:** The original send-message comment ("3-layer phone allowlist (layer 1 of 3)") was aspirational scaffolding, not a factual count. C-001 SPEC inherited the framing and structured §5.3 + §5.4 around the assumption that layers 2 and 3 are real. Layer 2 *is* real; layer 3 *is not*. Generalization: source-code comments are claims, not contracts. When a SPEC plans work scaffolded on a comment's claim, the author should grep for the actual code that the claim refers to. Add to Step 1: "when a SPEC's scope cites a comment-described inventory ('3 of 4', 'layer 1 of 3', etc.), grep for each item; do not trust the count."

---

## 8. Master-doc update checklist

After Rung 1 ships:
- `MASTER_ROADMAP.md` — note that the hardcoded SMS allowlist is removed and `tenants.test_mode_sms_allowlist` is the new control surface.
- `docs/GLOBAL_SCHEMA.sql` — at next Integration Ceremony: add the `test_mode_sms_allowlist` column.
- `docs/DB_TABLES_REFERENCE.md` — update tenants row.
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — note the C-001 close.

The cutover-day flip (UPDATE to NULL) is recorded in the cutover-day report, not in any roadmap file.

---

## 9. Pre-cutover sequencing (re-confirm)

Daniel's adopted order is:
1. **C-001 Rung 1** (this SPEC) — smallest, safest, atomic.
2. **M4_AUTOMATION_ENGINE_SERVER_SIDE Rung 1** — large architectural change; long soak window.
3. **P5_7_STOREFRONT_FORM_REWIRE** — cross-repo; depends on lead-intake stability post-M4-Rung-1.

C-001 ships first — so C-001 must self-add the `[functions.send-message]` config block (§1 finding 6, §4 acceptance 6). M4 Rung 1's same change becomes a no-op when it lands (the block is already present); no conflict.

---

*End of FOREMAN_REVIEW.*
