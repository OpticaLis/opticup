# FINDINGS — M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE / Rung 2

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE/RUNG_2_FINDINGS.md`
> **Written by:** opticup-executor
> **Written on:** 2026-05-02
> **Source SPEC:** `RUNG_2_ACTIVATION_PROMPT.md`
> **Companion file:** `RUNG_2_EXECUTION_REPORT.md`

Two findings. Both are project-quality observations surfaced during Rung 2 execution; neither is a Rung 2 defect that requires re-doing the work.

---

## Finding 1 — `config.toml` is missing per-function `verify_jwt` blocks for 8 of 9 Edge Functions

**Code:** M4-SPEC-CV2R2-01
**Severity:** **HIGH**
**Type:** Latent project-wide deploy-config bug; production-impacting on next CLI redeploy of any affected EF.
**Disposition (per dispatcher 2026-05-02):** Flag here, do NOT scope into Rung 2. Open as a separate post-cutover SPEC.
**Status:** Captured for follow-up SPEC. Rung 2 fixed only `facebook-campaigns-sync` (the EF this Rung touched).

### Reproduction

1. Inspect `supabase/config.toml` — only `[functions.pin-auth]` has an explicit per-function block (config.toml line 390 in the post-Rung-2 state, line 390 onwards has both pin-auth and the new facebook-campaigns-sync blocks).
2. List the EFs in the repo: `ls supabase/functions/`
   ```
   dispatch-queue/    event-register/    facebook-campaigns-sync/    lead-intake/
   ocr-extract/       pin-auth/          resolve-link/    retry-failed/
   send-message/      unsubscribe/
   ```
   That's 10 EFs total, of which `pin-auth` and (post Rung 2) `facebook-campaigns-sync` have explicit blocks. **8 EFs are at risk.**
3. For each at-risk EF: if a developer (or AI executor) ever runs `supabase functions deploy <name> --project-ref tsxrrxzmdxaenlvocyit`, the CLI will apply default `verify_jwt=true` regardless of whatever the dashboard had it set to. The function will then reject any caller that does not send an `Authorization: Bearer <jwt>` header.

### Impact

**Live evidence captured during this Rung's execution:** the moment we redeployed `facebook-campaigns-sync` via CLI without the config.toml block, the deployed function went from `verify_jwt=false` (set at dashboard) to `verify_jwt=true` (CLI default). Result: every Make scenario call returned `UNAUTHORIZED_NO_AUTH_HEADER` from the Supabase gateway, never reaching the EF's own `body.shared_secret` check. Production was broken until the config.toml block was added and the EF redeployed.

For each of the 8 at-risk EFs, ask: does this EF authenticate via something other than a JWT in the Authorization header? If yes, it is silently waiting to break on the next CLI redeploy. Likely candidates that authenticate via body fields, custom headers, or no auth (webhooks):
- `dispatch-queue` — likely service-role internal, may already require JWT.
- `event-register` — public storefront write path. Probably JWT-required.
- `lead-intake` — webhook from external source; may use shared_secret pattern.
- `ocr-extract` — likely internal.
- `resolve-link` — public link-resolver; may use JWT or no auth.
- `retry-failed` — likely internal.
- `send-message` — internal.
- `unsubscribe` — public link click; may need to work without JWT.

The actual blast radius can only be determined by reading each EF's auth code.

### Suggested next action

A separate post-cutover SPEC (`SUPABASE_CONFIG_TOML_AUDIT` or similar) that:
1. Audits each of the 8 EFs for its actual auth pattern.
2. For each EF, decides what `verify_jwt` should be (`true` for JWT-using EFs, `false` for body-secret/webhook EFs).
3. Adds the corresponding `[functions.{name}]` block to `supabase/config.toml`.
4. Adds a pre-commit hook (Rule 32, perhaps) that fails if any `supabase/functions/*/index.ts` lacks a corresponding `[functions.{name}]` block in `config.toml`. Mechanically: scan both, diff the sets, fail with a clear message naming the missing function(s).
5. (Optional) Adds a pre-deploy lint to `scripts/verify.mjs --staged` that fails the same check.

The existing `[functions.pin-auth]` block in config.toml (line 390-398) plus the Rung-2-added `[functions.facebook-campaigns-sync]` block (line 401-413) are the canonical patterns.

### Secondary observation — secret rotation
The `MAKE_SECRET` value used for shared-secret auth on `facebook-campaigns-sync` is currently:
- Hardcoded in the Make scenario `9126542` blueprint (visible to anyone with Make admin access).
- Visible in the activation prompt for this Rung (acceptable — internal artifact).
- Now also visible in `RUNG_2_blueprint_pre_change.json` (this commit, this repo).

Rotating it post-cutover and storing it referenced from a Supabase secret instead of inline in the blueprint would tighten the surface. Out of scope for Rung 2.

---

## Finding 2 — The `MAKE_SECRET` retrieval recipe in §3.6 of the activation prompt does not work

**Code:** M4-SPEC-CV2R2-02
**Severity:** LOW
**Type:** SPEC quality — copy-paste recipe that fails at runtime.
**Status:** Worked around inline; logged here for future Foreman review of the activation prompt template.

### Reproduction

The activation prompt §3.6 supplied this command:
```bash
MAKE_SECRET=$(supabase secrets list --project-ref tsxrrxzmdxaenlvocyit | grep -i MAKE_SECRET | awk '{print $2}')
```

`supabase secrets list` (Supabase CLI v2.75.0, current local installation) emits only the **names** of the secrets, not their **values**. Example output is:
```
$ supabase secrets list --project-ref tsxrrxzmdxaenlvocyit
NAME                  | DIGEST
MAKE_SECRET           | <hash>
SOME_OTHER_SECRET     | <hash>
```

So the awk extracts a SHA256 hash, not the secret value. The curl tests then fail with `Invalid or missing shared_secret` (401 from EF body), not the expected `ok:true`.

### Impact

The recipe set up the executor to fail the very curl tests it was supposed to enable. In this Rung I bypassed the recipe by reading the secret value from the Make scenario blueprint (where it is visible in `mapper.data` of flow[2]) — already in this session's context from §2.6 + visible in §4.1 of the activation prompt itself.

### Suggested next action

In the activation-prompt template the Foreman uses for future EF-touching SPECs, replace §3.6's recipe with one that actually works. Two options:

**(a) Reference the Make blueprint:**
```
# The shared secret is captured in the Make scenario blueprint at
# flow[2].mapper.data. Pull via mcp__claude_ai_Make__scenarios_get
# and extract; do NOT echo standalone.
```

**(b) Store the secret in a checked-in env file (encrypted) or local-only env:**
```bash
source $HOME/.optic-up/credentials.env
echo "$MAKE_SECRET" | wc -c   # sanity check, do not echo value
```

Option (b) aligns with CLAUDE.md §11's "credentials isolation" principle. Option (a) is simpler when the scenario already has the secret hardcoded.

The current `supabase secrets list | grep | awk` pattern should be removed from the template entirely — it never worked.

---

## Finding 3 — Executor confabulation under partial-progress resume

**Code:** M4-SPEC-CV2R2-03
**Severity:** **HIGH**
**Type:** Executor-skill defect — inaccurate retrospective when external actor changes state during executor pause.
**Status:** Captured by resumption session 2026-05-02. Action deferred to a separate post-cutover SPEC against `opticup-executor`.

When an executor session pauses (long-running wait, network timeout) and external state changes during the pause (here: Cowork Overseer patched the Make blueprint via `scenarios_update` while the executor slept), the executor on wake-up does not detect the external change. It authors retrospective reports as if it performed the work itself, producing inaccurate records.

### Evidence preserved in this SPEC's folder

- Make blueprint `lastEdit` = `2026-05-02T19:23:51.096Z`, attributable to Cowork via session log (only one update event exists on the blueprint).
- Original `RUNG_2_EXECUTION_REPORT.md` body (preserved verbatim under the new correction note at top) attributes PART B to the executor.
- Mismatch detected by resumption session before commit, per opticup-guardian §1 verify-before-write.

### Action — opticup-executor skill update (separate post-cutover SPEC)

1. Before any long-running wait (>30s), snapshot relevant external state (Make blueprint hash, DB row counts, EF version IDs).
2. On wake-up, re-fetch and compare. If diff exists, treat as out-of-band change — surface the diff explicitly, pause for re-orientation, and never claim the executor performed the changed action.
3. Retrospective reports must include explicit attribution per section ("performed by: executor / overseer / external") with timestamps drawn from the source-of-truth API (Make's `lastEdit`, Supabase's `updated_at`, git commit hashes), not from the executor's own narrative.

---

## Finding 4 — Top-of-funnel CTR data immediately surfaces actionable insights

**Code:** M4-INFO-CV2R2-04
**Severity:** INFO
**Type:** SPEC outcome confirmation — informational only, no action required.
**Status:** Closed.

End-to-end verification post-Rung-2 surfaced concrete business signal on Daniel's first look:
- 2 prizma campaigns running at 5.23-9.02% CTR (above industry norm)
- 3 prizma campaigns at 1.24-1.82% CTR (below norm)

Validates the SPEC's core premise that this data was missing from decision-making and adding it materially changes the choices available to the operator. No action required — informational confirmation that the SPEC delivers as intended.

---

*End of FINDINGS for Rung 2.*
