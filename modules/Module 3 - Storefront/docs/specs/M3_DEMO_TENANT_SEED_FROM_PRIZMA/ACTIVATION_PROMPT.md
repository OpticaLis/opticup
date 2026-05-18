# ACTIVATION PROMPT — M3_DEMO_TENANT_SEED_FROM_PRIZMA

**For Daniel:** copy the code block below and paste it into a fresh Claude Code session on Windows desktop (ERP repo, `C:\Users\User\opticup`, branch `develop`). The Executor will run end-to-end under Bounded Autonomy and stop only on deviation from the SPEC's Success Criteria.

---

```
Execute SPEC at:
modules/Module 3 - Storefront/docs/specs/M3_DEMO_TENANT_SEED_FROM_PRIZMA/SPEC.md

Mode: opticup-executor, Bounded Autonomy.
Repo: opticalis/opticup (ERP). Branch: develop. Machine: Windows desktop.

CONTEXT: Daniel reported the demo storefront (opticup-storefront-demo.vercel.app)
is completely broken — every page renders as raw, unstyled text without CSS.
Root cause (verified read-only by site-overseer): the demo tenant in Supabase
was never seeded with storefront content:
  - storefront_config.enabled=false
  - storefront_config.footer_config=NULL
  - 0 published storefront_pages (prizma has 64)
  - tenants.logo_url=NULL
  - 0 tenant_branches

This SPEC seeds demo from prizma data WITHOUT cloning prizma's M4 wiring
(webhooks emptied, prizma URLs rewritten to demo URL, tenant_slug rewritten).
Demo's existing ui_config (green theme, demo phone numbers, demo email
allowlist) is preserved untouched.

PARALLEL SESSION COORDINATION (verified 2026-05-18 by Foreman):
A parallel Claude Code session is running on Module 1 lens tables (lens_brand,
lens_design, lens_variant, supplier_*). Confirmed zero overlap with this SPEC's
target tables (storefront_*, tenants, tenant_branches). Still, run
`pipeline-coordination.mjs claim` + `check-collision` per SPEC §3 0h before
any write.

DELIVERABLES:
1. JSON snapshots of demo's current state (rollback safety) — BACKUPS/
2. storefront_config of demo populated from prizma (with enabled=true and
   custom_domain set to demo's vercel hostname)
3. 64 storefront_pages inserted for demo, with URL/webhook/slug rewrites
4. tenants.logo_url + business_email set for demo
5. 1 tenant_branches row for demo
6. opticup-storefront-demo Vercel project redeployed to READY
7. Curl assertions per SPEC §6 Step 7 all pass
8. EXECUTION_REPORT.md + FINDINGS.md in SPEC folder
9. ONE atomic commit on develop with message starting:
   "feat(demo): seed demo tenant from prizma —"

AUTHORITIES (Bounded Autonomy):
- Level 2 SQL UPDATE + INSERT on demo tenant ONLY (tenant_id=
  8d8cfa7e-ef58-49af-9702-a862d459cccb). All WHERE clauses must include
  this UUID. Never write to prizma.
- Vercel redeploy of opticup-storefront-demo project — AUTHORIZED.
- NO Level 3 DDL. NO ALTER TABLE. NO main-branch operations.
- Git: commit + push to develop. No PR-to-main in this SPEC.

STOP TRIGGERS (per SPEC §10):
- Pre-flight count mismatch (prizma=64, demo=0)
- Any UPDATE/INSERT affected_rows differs from expected
- Any "expected 0" leakage query returns >0 (prizma URL/webhook/slug leaked)
- Vercel deploy fails or stays BUILDING > 10 min
- Any curl verification assertion fails
- pipeline-coordination check-collision reports a collision

ABSOLUTE RULES:
- Per `feedback_no_polish_by_validation` (Daniel directive 2026-05-18):
  if any Success Criterion fails, close 🟡 PARTIAL with FINDINGS, do NOT
  close 🟢 GREEN. No silent polish closures.
- Per `feedback_never_propose_wind_down`: do not propose "stop for the
  night" or "stable handoff" — only stop on genuine technical blockers.
- Per Iron Rule 32: Destructive Operations are limited to the 4 items
  declared in SPEC §4. Nothing else.

Begin Step 0 pre-flight IMMEDIATELY per SPEC §3. After pre-flight passes,
proceed through Steps 1→7 without asking for per-step confirmation.
```

---

**Notes for Daniel:**

- **Estimated wall-clock time:** 25–40 minutes total. Breakdown: pre-flight + snapshots ~5 min, DB writes ~5 min, Vercel deploy ~3–5 min build, verification ~5 min, commit + push ~2 min, EXECUTION_REPORT + FINDINGS ~5–10 min.
- **Risk: LOW.** All writes are scoped to demo tenant_id (`8d8cfa7e-...`). Prizma is read-only. Rollback path documented in SPEC §9.
- **What you'll see when it's done:** `https://opticup-storefront-demo.vercel.app/` renders the same chrome as prizma (logo, hero, header, footer) but with demo's green theme + demo phone numbers. `/lab/`, `/supersale/`, `/צרו-קשר/`, etc. all render properly styled. SuperSale form on demo submits but Make automation chain stays disconnected (intentional — you'll wire demo-specific webhooks in a follow-up).
- **Mid-execution interactions:** ideally zero. Claude Code is fully autonomous on this SPEC. The only place it might pause is if pre-flight catches a state drift (e.g., demo already has pages from a prior unrecorded seed). In that case it'll STOP and tell you.
- **What this does NOT do:** does not wire demo Make webhooks (deferred), does not copy lens inventory (demo stays empty per your directive), does not touch prizma at all, does not change any code in either repo.
- **After completion:** I'll write `FOREMAN_REVIEW.md` reading the Executor's EXECUTION_REPORT + FINDINGS, and propose any follow-up SPECs (likely: demo-specific Make webhooks + demo lens inventory if you want it).
