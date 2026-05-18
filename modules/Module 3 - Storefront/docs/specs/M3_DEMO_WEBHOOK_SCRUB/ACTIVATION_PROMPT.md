# ACTIVATION PROMPT — M3_DEMO_WEBHOOK_SCRUB

**For Daniel:** copy the block below into the same Claude Code session that just closed M3_DEMO_TENANT_SEED_FROM_PRIZMA, OR a fresh session on Windows desktop ERP repo, branch `develop`. The Executor will run end-to-end under Bounded Autonomy.

---

```
Execute SPEC at:
modules/Module 3 - Storefront/docs/specs/M3_DEMO_WEBHOOK_SCRUB/SPEC.md

Mode: opticup-executor, Bounded Autonomy.
Repo: opticalis/opticup (ERP). Branch: develop. Machine: Windows desktop.

CONTEXT: Predecessor SPEC M3_DEMO_TENANT_SEED_FROM_PRIZMA closed 🟡 PARTIAL
at 12:30 UTC with 8/9 success criteria. The 1 fail + 2 HIGH findings share
the same root cause: replace() patterns didn't account for jsonb-text quote
escaping. This SPEC closes all 3 with escape-aware patterns derived from
hex-dump probes of the actual stored bytes.

THREE DELIVERABLES (all on demo tenant only — tenant_id=
  8d8cfa7e-ef58-49af-9702-a862d459cccb):
1. F-1 WEBHOOK SCRUB: 1 UPDATE on /supersale/ HE — emptyset prizma Make
   webhook URL. SQL uses E'...\\\\"...\\\\"' escape-aware pattern.
2. F-2 EMAIL REWRITE: 3 UPDATEs (service@/nayedet@/events@) → demo@.
   Total ~29 affected rows.
3. F-3 SEO IDENTITY: 1 UPDATE on storefront_config.seo.title +
   .description so <title> says "אופטיקה דמו" not "אופטיקה פריזמה".

AUTHORITIES (Bounded Autonomy):
- Level 2 SQL UPDATE on storefront_pages.blocks (demo only, ≤ 30 rows) — AUTHORIZED per SPEC §4.
- Level 2 SQL UPDATE on storefront_config.seo (demo only, 1 row) — AUTHORIZED per SPEC §4.
- NO DDL. NO writes to prizma. NO Vercel redeploy (SSR — no need).
- Git: 1 commit on develop. NO main, NO branches.

PARALLEL SESSION COORDINATION:
Module 1 lens session continues in parallel — zero overlap with
storefront_pages / storefront_config. Still run pipeline-coordination.mjs
claim + check-collision before any write.

STOP TRIGGERS (per SPEC §10):
- Step 0 pre-flight count mismatch (webhook=1, emails=29, seo says פריזמה)
- Step 2 affected_rows ≠ 1
- Step 3 totals: 3a=24, 3b=3, 3c=2 (any deviation = STOP)
- Post-write LIKE queries return >0 for any "expected 0" check
- Any row's blocks loses array type (Rule 31 violation)
- Step 5-F: prizma's webhook count drops below 1 (CRITICAL — Daniel
  directly, do NOT continue)

ABSOLUTE RULES:
- Per `feedback_no_polish_by_validation`: if any of the 9 success criteria
  fails, close 🟡 PARTIAL with FINDINGS naming root cause + suggested fix.
  Do NOT silent-close 🟢.
- Per `feedback_never_propose_wind_down`: stop only on genuine technical
  blocker. No "stable handoff" framing.
- Per Iron Rule 32: 3 declared destructive ops only. UPDATE on prizma
  tenant_id is FORBIDDEN — every UPDATE must include tenant_id=demo UUID.

KEY LESSON FROM PRIOR SPEC (cited in SPEC §13):
jsonb-text stores inner JSON quotes as \" (2 bytes). Match patterns
must use postgres E-string `E'\\"'` (4 chars per quote). Do NOT retry
blindly with non-escape patterns if the count is wrong — STOP and write
FINDINGS.

Begin Step 0 pre-flight IMMEDIATELY per SPEC §3. After pre-flight passes,
proceed through Steps 1→5 without asking for per-step confirmation.
Final commit message starts with:
  "fix(demo): scrub prizma webhook + emails + seo identity"
```

---

**Notes for Daniel:**

- **Estimated wall-clock time:** 15–25 minutes. This is a much smaller SPEC than its predecessor — 3 targeted UPDATEs + verification, no INSERT loops, no schema probes, no Vercel deploy.
- **Risk: LOW.** Snapshots committed before any write. Predecessor SPEC's verified scope (demo tenant_id locked, prizma untouched) is reproduced here. The CRITICAL stop trigger explicitly catches any accidental write to prizma.
- **What you'll see when it's done:** demo `/supersale/` form's hidden `webhook_url=""` (empty) so demo lead submissions go to lead-intake EF only — Make automation chain stays disconnected (intentional, until you wire demo-specific webhooks). Demo legal pages show `demo@prizma-optic.co.il` instead of `service@`/`nayedet@`/`events@`. Demo `<title>` says "אופטיקה דמו | סביבת בדיקה" so it doesn't compete with prizma in Google.
- **Why the title says "דמו | סביבת בדיקה":** demo is identified as a TEST environment (not a separate optical chain), which is what it actually is. If you want different copy, say so and I'll author a 1-line follow-up SPEC.
- **After completion:** all 3 findings from prior SPEC close. M3 demo storefront fully usable for M4 form-flow testing in isolation from prizma. I'll write FOREMAN_REVIEW for both SPECs (the prior + this one) once this closes.
