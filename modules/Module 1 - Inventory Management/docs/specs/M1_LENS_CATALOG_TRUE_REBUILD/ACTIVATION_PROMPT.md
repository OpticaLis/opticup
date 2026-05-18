# ACTIVATION_PROMPT — M1_LENS_CATALOG_TRUE_REBUILD

**Paste into Claude Code on Daniel's Windows desktop.** Same session that closed M1 lens earlier today is fine.

---

You are **opticup-executor**. Execute the SPEC at:

```
modules/Module 1 - Inventory Management/docs/specs/M1_LENS_CATALOG_TRUE_REBUILD/SPEC.md
```

**Critical context — this SPEC supersedes SPEC 9 + 10 polish-by-validation outputs.**

Daniel reviewed the live screens after M1 lens was declared 100% complete and found:
1. "הקטלוג שלי" (private) — looks identical to pre-rebuild state. SPEC 10 closed with 0 code changes ("polish-by-validation" decision).
2. "קטלוג מערכת" (admin) — has dark theme + 4 cols but **missing the Suppliers column** from the mockup; only 1 screenshot captured; drill not verified.

This SPEC is the CORRECTION. It produces a TRUE 1:1 rebuild for both screens.

**Read SPEC §2 in full** — it documents exactly what SPECs 9 + 10 shipped vs what was promised. Don't repeat those mistakes.

## Bootstrap

1. Load skill `opticup-executor`. First Action protocol.
2. Pre-Action Collision Check:
   ```powershell
   node scripts/pipeline-coordination.mjs claim --spec-slug M1_LENS_CATALOG_TRUE_REBUILD --files-owned-globs "modules/lens-catalog-admin/**,shared/js/catalog-private-admin.js,shared/css/catalog-private-admin.css,css/lens-catalog-*,inventory.html,modules/Module 1 - Inventory Management/docs/specs/M1_LENS_CATALOG_TRUE_REBUILD/**" --branch develop
   ```

## Pre-flight §0 — MANDATORY

Before authoring/editing any file:

1. Read `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html` IN FULL (671 lines). Identify the 4 columns + their headers + their data sources.
2. Read current `modules/lens-catalog-admin/lens-catalog-admin-partial.html` + 7 JS files in `modules/lens-catalog-admin/`. Identify gap.
3. Read current `shared/js/catalog-private-admin.js` (339 lines) IN FULL.
4. Query Supabase: `SELECT count(*) FROM suppliers WHERE tenant_id = '<demo>'` — confirm there are suppliers to populate column 1.
5. Test the OAuth gate bypass mechanism that SPEC 9's executor used (read `EXECUTION_REPORT.md` of M1_LENS_CATALOG_ADMIN_REBUILD §"Tier C: bypass platform-admin gate" for the technique).

If any of the 5 pre-flight items fails → STOP, escalate, do NOT proceed.

## Execute SPEC

5 commits per SPEC §7. ~3-4h estimated.

**TIER C VFV IS THE CORE OF THIS SPEC.** Don't ship without §6 protocol. Side-by-side mockup-vs-live comparison is mandatory. Self-certifying "looks right" without side-by-side capture is FORBIDDEN.

**S11 (mockup fidelity check):** If ANY CRITICAL or HIGH drift is found in your side-by-side classification → STOP at that point, document in FINDINGS, escalate. Don't push a 🟢 verdict over CRITICAL/HIGH drift.

## NO polish-by-validation

If at any point during execution you find yourself thinking "the existing code already does this, no changes needed" → that's the SPEC 10 anti-pattern. STOP. The Foreman set the bar at "TRUE 1:1 with mockup". Existing code is the floor, not the ceiling. Escalate to Foreman if you genuinely believe the existing code already meets the bar — but do NOT close 🟢 without code changes.

## Mandatory FOREMAN_REVIEW

After SPEC closes, the **Foreman (Cowork-Architect, Daniel)** writes FOREMAN_REVIEW.md. The executor should leave a `FOREMAN_REVIEW.md` placeholder file in the SPEC folder if the Foreman isn't immediately available — but DO NOT close the SPEC 🟢 without the Foreman having read EXECUTION_REPORT + FINDINGS + mockup side-by-side check.

## After SPEC closes 🟢

Notify Daniel in chat with:
- 6 screenshot paths
- Mockup-fidelity-check table summary (count of INTENTIONAL vs DRIFT by severity)
- Confirmation that Pricing screen TableBuilder error is unchanged (S13 regression check)
- Commit hash range
- Path forward (pre-existing Pricing TableBuilder hotfix SPEC pending)

**Bounded Autonomy. Path X. Stop on deviation.**
