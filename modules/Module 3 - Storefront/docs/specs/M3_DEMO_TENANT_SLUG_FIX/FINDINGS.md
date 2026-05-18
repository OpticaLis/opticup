# FINDINGS — M3_DEMO_TENANT_SLUG_FIX

**Executor:** opticup-executor
**Date:** 2026-05-18

---

## F-1 — INFO — Dedup behavior of `lead-intake` EF blocks fresh INSERT on repeat smoke-test phones

**Severity:** INFO (verification-surface nuance, not a defect)
**Location:** `lead-intake` Edge Function (storefront-public) + crm_leads schema
**Description:**

The SPEC §6 Step 5c live form submit returned HTTP 409 with `{"duplicate":true,"is_new":false,"id":"cb6b343e-..."}`. The dedup blocker is a 3-day-old smoke-test leftover (`Localhost Tester E2E`, demo tenant, source `supersale_localhost_tester_e2e`). Two more dedup-prevention test rows exist under demo for the same phone:

| id | tenant_slug | full_name | source | created_at |
|---|---|---|---|---|
| cb6b343e-e4cc-42b0-990a-91999111a03c | demo | Localhost Tester E2E | supersale_localhost_tester_e2e | 2026-05-15 19:56 |
| b06d2f06-a800-4f69-8d1b-6f8f77c86990 | demo | P1.1 Scenario B | supersale_form | 2026-05-14 14:02 |
| efc0bd54-c6ed-4430-9552-018935a7ebbc | demo | P55 Daniel Secondary | p5_5_seed | 2026-04-22 16:33 |

These rows accumulated over prior SPEC verifications and never got pruned. None point at prizma (which is good — the routing was fixed at 13:42 UTC today; before that, smoke tests likely hit prizma but cleanup deleted those).

**Suggested action:** New low-priority TECH_DEBT entry — "M3-DEMO-CLEANUP: scheduled task to prune `supersale_*` test-source leads older than 30 days under demo tenant. Prevents dedup-blocking of future SaaS-isolation SPECs that re-use `+972503348349`." Foreman discretion to convert to a small SPEC or include in next Module 3 housekeeping pass.

---

## F-2 — INFO — Live-test verification surface required analytical reasoning (proof-of-routing via dedup-response)

**Severity:** INFO (process learning, not a defect)
**Location:** SPEC §6 Step 5c verification protocol + opticup-executor skill
**Description:**

The SPEC assumed a fresh INSERT path: "test lead lands in crm_leads with tenant_id=demo". Because the test phone has prior demo entries (see F-1), the live-test path was dedup-blocked. The proof of routing came from:

1. The EF's 409 response returned a **demo-tenant** `id`.
2. Three negative-side queries (all returning 0) confirmed no prizma writes occurred: `SPECTEST_rows_last_5_min` (any tenant) = 0; `prizma_leads_w_test_phone` (ever) = 0; `prizma_leads_last_5min` = 0.

This is conclusive — but the conclusion required derivation. The SPEC author should encode "dedup-route returning the expected tenant_id is also positive proof" as an explicit success path. Otherwise the next executor will either pause to escalate or close 🟡 unnecessarily.

**Suggested action:** Foreman to incorporate the dedup-aware verification subsection in future SaaS-isolation SPECs (per EXECUTION_REPORT §8 Proposal 1). Either bake into a SPEC template under `.claude/skills/opticup-strategic/references/`, or include as a "Verification Patterns" section in `docs/CONVENTIONS.md`.

---

## F-3 — DEFERRED — 22 demo pages contain `/api/image/media/6ad0781b-.../` (prizma media UUID)

**Severity:** LOW (asset-serving, not tenant data-isolation)
**Location:** `storefront_pages.blocks` (demo tenant, 22 pages)
**Description:**

Per SPEC §2 F-C, 22 demo pages contain image proxy paths embedding prizma's tenant UUID (`/api/image/media/6ad0781b-37f0-47a9-92e3-be9ed1477e1c/...`). Decision per Daniel 2026-05-18: leave as-is. Rationale:

- Demo's own Supabase Storage media bucket is empty. Rewriting these paths to demo's UUID would point at non-existent objects → broken images everywhere on demo.
- The image proxy at `/api/image/[...path]` resolves by UUID-in-path using `SUPABASE_SERVICE_ROLE_KEY` server-side, so cross-tenant serving works in practice.
- No data-isolation impact: the image proxy emits binary image bytes, not tenant-scoped DB data.

**Suggested action:** Future SPEC `M3_DEMO_MEDIA_SEED` (not yet scheduled) — once demo gets its own media library, rewrite all 22 paths in a single UPDATE on `storefront_pages.blocks`. Pattern: replace `/api/image/media/6ad0781b-37f0-47a9-92e3-be9ed1477e1c/` with `/api/image/media/8d8cfa7e-ef58-49af-9702-a862d459cccb/` after seeding demo's media bucket with the same filenames.

---

## F-4 — LOW — SPEC §6 Step 5b grep pattern is whitespace-sensitive and slightly off

**Severity:** LOW (documentation / SPEC-template defect)
**Location:** `modules/Module 3 - Storefront/docs/specs/M3_DEMO_TENANT_SLUG_FIX/SPEC.md` §6 Step 5b
**Description:**

The SPEC writes:

```bash
grep -c "tenant_slug = 'prizma'" /tmp/demo-ss-post.html  # expected 0
grep -c "tenant_slug = 'demo'" /tmp/demo-ss-post.html    # expected ≥ 1
```

The actual rendered storefront output uses **no spaces** around `=`: `tenant_slug='demo'`. The spaced grep would return 0 for both even when routing IS correct, leading to a false STOP-trigger fire.

**Suggested action:** Foreman to update the SPEC template (or any next SPEC drafted on top of this one) to either (a) use whitespace-flexible regex `grep -oE "tenant_slug[[:space:]]*=[[:space:]]*'[^']+'"`, or (b) document the canonical rendered shape as no-space and use literal grep. Recommend (a) for future-proofing against renderer style changes.

---

## F-5 — INFO — SEO meta + canonical hrefs on demo `/supersale/` still point at prizma-optic.co.il domain

**Severity:** INFO (SEO bleed, NOT a data-isolation defect — out of scope per SPEC §8)
**Location:** Rendered HTML of `https://opticup-storefront-demo.vercel.app/supersale/` (and likely other demo pages)
**Description:**

The rendered HTML contains:

- `<link rel="canonical" href="https://www.prizma-optic.co.il/supersale/">`
- `<meta property="og:url" content="https://www.prizma-optic.co.il/supersale/">`
- `<meta name="twitter:image" content="https://www.prizma-optic.co.il/api/image/media/6ad0781b-.../...">`
- `<link rel="alternate" hreflang="he" href="https://www.prizma-optic.co.il/supersale/">`
- Static asset path: `<img src="/images/prizma-logo-site.png">`

These do not affect tenant_id routing (they're meta/SEO/static-asset attributes, not API call data). But for demo's SEO hygiene they should eventually point at the demo domain (or be omitted on demo entirely). The `M3_DEMO_WEBHOOK_SCRUB` SPEC's predecessor already scrubbed the `<title>` issue per Daniel 2026-05-18 deferral. SEO meta is similar — cosmetic / SEO-only, not isolation.

**Suggested action:** Future SPEC `M3_DEMO_SEO_IDENTITY_FULL_PASS` — single migration to rewrite canonical/og:url/hreflang/twitter:image domains for all demo pages. Likely a small migration (UPDATE on `storefront_pages` rows that contain the prizma domain literal). Not blocking and not isolation-critical.

---

*End of FINDINGS. 5 findings: 1 INFO (dedup), 1 INFO (proof-pattern), 1 DEFERRED-LOW (image UUIDs), 1 LOW (grep pattern), 1 INFO (SEO bleed). No CRITICAL/HIGH/MEDIUM findings.*
