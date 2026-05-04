# ACTIVATION PROMPT — QUICK_REGISTER_QR_HOTFIX_TENANT_AND_EMAIL

> **Purpose:** small hotfix on top of QUICK_REGISTER_QR_FLOW Rung 1. Two repos, one commit per repo. No merges to main.
> Daniel pastes the block below into a fresh Claude Code session loaded with `opticup-executor`.

---

## Paste-ready block

```
You are working in C:\Users\User\opticup. Follow CLAUDE.md.

For storefront work in this SPEC, also follow C:\Users\User\opticup-storefront\CLAUDE.md.

Load the opticup-executor skill.

SPEC location: modules/Module 4 - CRM/docs/specs/QUICK_REGISTER_QR_HOTFIX_TENANT_AND_EMAIL/SPEC.md

Read SPEC.md fully before starting. Two fixes, two commits across two repos.

EXECUTION ORDER:

1. First Action protocol per CLAUDE.md §1 on opticup. Then verify opticup-storefront is on develop + clean.

2. opticup repo — modify supabase/functions/quick-register/index.ts:
   a. Add `if (!emailRaw) return errorResponse("missing_email", 400);` BEFORE the existing email regex check.
   b. Tighten the existing regex pass: instead of nullifying invalid email (current code does `: null`), reject with `errorResponse("invalid_email", 400)`. Keep the .toLowerCase() pass when valid.
   c. Verify Iron Rule 12 (file size ≤350) + integrity gate clean.
   d. Single commit: `fix(crm): require email + accept tenant_slug from request body in quick-register EF`
   e. Push origin/develop.
   f. STOP. Ask Daniel to run CLI deploy: `npx supabase functions deploy quick-register --project-ref tsxrrxzmdxaenlvocyit`
   g. Wait for Daniel's confirmation that v2 is live (verify via list_edge_functions).

3. opticup-storefront repo — modify the quick-register page (the file created in Rung 1, location commit 74e2225 — likely src/pages/quick-register/index.astro or similar):
   a. Read URL param `tenant` server-side (Astro context.url.searchParams). Default value: 'prizma'. Allowed values: any string (no allowlist; the EF is the gate).
   b. Pass the resolved tenant slug to the EF in the submit body as `tenant_slug`.
   c. Make email field required: HTML5 attribute `required` + `type="email"` + add visible `*` indicator next to the label. Remove the `(אופציונלי)` text from the email field.
   d. Storefront safety-net scripts pass.
   e. Single commit: `fix(quick-register): read ?tenant URL param + require email field`
   f. Push origin/develop.
   g. STOP. Ask Daniel to run end-to-end smoke test per SPEC §12.

4. SPEC close — write modules/Module 4 - CRM/docs/specs/QUICK_REGISTER_QR_HOTFIX_TENANT_AND_EMAIL/EXECUTION_REPORT.md + FINDINGS.md (cumulative — even if 0 findings, leave a stub note). Single retro commit. Push.

CONSTRAINTS:
- Test ONLY on demo tenant (8d8cfa7e-ef58-49af-9702-a862d459cccb). Zero prizma writes without explicit Daniel approval.
- Single commit per repo (2 commits total before retro). Push to develop. NEVER merge to main on either repo.
- Mandatory clean repo at end of each step.
- DO NOT call Supabase MCP `deploy_edge_function` — CLI-only via Daniel.
- DO NOT modify the EF's `lookup_url` op behavior — it does NOT need email.
- DO NOT modify any other EF, RPC, or template.
- If the storefront file structure differs materially from what Rung 1 produced, STOP and surface what's there before modifying.
- Stop on any deviation per CLAUDE.md §9 Bounded Autonomy.

Begin with step 1.
```

---

## After Claude Code finishes (next Overseer touchpoint)

When the hotfix closes:
1. Update HANDOFF — log this hotfix as part of QUICK_REGISTER_QR_FLOW Rung 1 closure.
2. Move forward with Rung 2 (lookup_url op) of the original SPEC.
3. Defer the End-of-M4 tenant-default-lockdown task to the M4 final-close SPEC.
