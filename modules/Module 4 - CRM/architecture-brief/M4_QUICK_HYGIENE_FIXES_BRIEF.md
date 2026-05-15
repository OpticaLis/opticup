# M4 Quick Hygiene Fixes — Brief

**Brief version:** v1
**Date:** 2026-05-14
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single Claude Code chat, ~30-45 min)
**Model preference:** Sonnet (well-scoped, low risk)
**Owning module:** Module 4 — CRM (with light touch to Module 3 for verify_jwt config)

---

## 1. Purpose

Two small fixes harvested from the Deep Audit report (`modules/Module 4 - CRM/docs/audits/M4_DEEP_AUDIT_2026_05_13.md`):
1. **Rec 6** — Fix `v_crm_event_dashboard` INNER JOIN that hides events without a campaign.
2. **Rec 7** — Add explicit `verify_jwt = false` to `supabase/config.toml` for the 6 public-facing Edge Functions, preventing accidental auth-gate flip on redeploys.

Both XS effort, LOW risk. Bundled because together they take ~30 min and ship in a single small SPEC.

---

## 2. Scope

### 2.1 Rec 6 — `v_crm_event_dashboard` JOIN fix
- Audit finding 3.5.2: the view uses INNER JOIN on `crm_campaigns`, so events created WITHOUT a campaign_id are invisible in the dashboard.
- Fix: change INNER JOIN to LEFT JOIN. Single line edit. Recreate the view with `CREATE OR REPLACE VIEW`.
- Verify: post-fix, demo + Prizma show all `crm_events` rows, including any without `campaign_id`.

### 2.2 Rec 7 — `config.toml` `verify_jwt` declarations
- 6 EFs are intentionally `verify_jwt=false` in production: `pin-auth`, `fetch-google-reviews`, `generate-brand-content`, `translate-content`, `event-register`, `resolve-link`, `submit-lead` (verify the exact list at execution time — the audit cited 6 but more may exist; confirm via `mcp__supabase__list_edge_functions`).
- Today the flag is NOT declared in `supabase/config.toml` — it was applied at first deploy and is preserved only because subsequent deploys passed `--no-verify-jwt`. If anyone redeploys WITHOUT the flag, the EF flips to `verify_jwt=true` and silently breaks public access.
- Fix: add an explicit `[functions.<slug>]` block in `supabase/config.toml` with `verify_jwt = false` for each public EF. Declarative truth matches deployed state.

---

## 3. Safety Envelope

### 3.1 Safety tag
First action:
```
git tag -a pre-m4-quick-hygiene-fixes-2026-05-14 -m "Pre-quick-hygiene-fixes baseline"
git push origin pre-m4-quick-hygiene-fixes-2026-05-14
```

### 3.2 DDL — pre-approved
- ONE view recreation: `CREATE OR REPLACE VIEW public.v_crm_event_dashboard ...` (existing view body with JOIN keyword changed). Same column list, same RLS posture.
- NO other DDL.

### 3.3 No EF redeploys
- Adding `verify_jwt = false` to `config.toml` does NOT require redeploying the EF. The flag stays as it is on the server. The config file is now the declarative source of truth so the next deploy doesn't accidentally flip it.
- This SPEC ships ZERO EF deploys.

### 3.4 No Prizma data writes
- View recreation does NOT touch data — only schema.
- `config.toml` is a repo file — does not touch DB at all.

### 3.5 No merges to main
- Daniel handles PR.

### 3.6 Commit budget
- 2-3 commits expected. Cap at 4.

### 3.7 Stop triggers
- If the audit-cited list of 6 public EFs doesn't match the live `verify_jwt=false` set in Supabase → STOP, escalate. The Pipeline must use the LIVE set, not the audit's stale list.
- If `v_crm_event_dashboard` recreation produces a different column list than the original → STOP. Same columns required for downstream consumers.

---

## 4. Pipeline Selection

Standard Full Auto Pipeline. Sonnet model.

---

## 5. Communication

English status updates between phases. ONE concise English summary at end:
- Confirmed list of EFs that now have explicit `verify_jwt = false` in config.toml.
- Confirmed: v_crm_event_dashboard now shows events without campaigns (count delta on Prizma).
- Demo smoke results.
- Ready for develop→main PR? Yes/no.

---

*End of Brief. Activation prompt at `M4_QUICK_HYGIENE_FIXES_ACTIVATION_PROMPT.md`.*
