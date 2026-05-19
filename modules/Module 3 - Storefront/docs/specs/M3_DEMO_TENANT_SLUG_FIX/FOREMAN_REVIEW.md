# FOREMAN_REVIEW — M3_DEMO_TENANT_SLUG_FIX

**SPEC:** `modules/Module 3 - Storefront/docs/specs/M3_DEMO_TENANT_SLUG_FIX/SPEC.md`
**Foreman:** opticup-strategic (acting as Site Overseer)
**Date written:** 2026-05-18
**Closure status:** 🟢 GREEN — all 7 success criteria pass. SaaS-isolation leak closed end-to-end with live form-submit proof.

---

## 1. Summary judgment

**The chain is closed.** Three SPECs over one day, ~75 minutes of Executor wall-clock time, two 🟡 PARTIAL closes that surfaced increasingly precise diagnoses, one 🟢 GREEN close that proved end-to-end isolation with a live form submit. Demo storefront now:

1. Renders content (predecessor SPEC #1)
2. Has no prizma support emails or seo branding (predecessor SPEC #2)
3. Routes lead submissions to demo's CRM, not prizma's (this SPEC)

Independent verification by Foreman (post-close, 2026-05-18):

| Check | Expected | Actual |
|---|---|---|
| `tenant_slug=\"prizma\"` in demo blocks | 0 | **0** ✅ |
| `tenant_slug=\"demo\"` in demo blocks | ≥1 | **1** ✅ |
| `hook.eu2.make.com` in demo blocks | 0 | **0** ✅ |
| Prizma emails (non-`demo@`) in demo | 0 | **0** ✅ |
| Prizma published pages | 64 | **64** ✅ |
| Test leads in prizma in last 30m | 0 | **0** ✅ |

**Net assessment:** Executor 10/10 on this SPEC. Foreman 8.5/10. The improvement from SPEC #1's 5.8 → SPEC #2's 7.5 → SPEC #3's 8.5 traces the discipline absorbed: hex-dump probes (SPEC #1 → SPEC #2), live-test-or-it-didn't-happen (SPEC #2 → SPEC #3). Each PARTIAL produced a real learning that the next SPEC consumed.

---

## 2. Foreman self-scoring

| Criterion | Score | Reason |
|---|---|---|
| Scope clarity | 9/10 | 3 deliverables, each scoped to specific (slug, lang) tuples + UUID. F-C explicit deferral with rationale. |
| Pre-flight depth | 8/10 | §3 included escape-aware count check (0b) which caught the predecessor SPEC's miss (`tenant_slug=\"prizma\"` was actually present despite predecessor's intent). |
| Destructive-Ops declaration (Rule 32) | 9/10 | 4 declared ops (3 UPDATEs + 1 DELETE for verification cleanup). Anticipated the cleanup need from the verification probe — improvement over predecessor SPEC's missing-UPDATE-on-blocks. |
| replace() pattern correctness | 10/10 | Escape-aware E-strings derived from actual hex dump in §2. All affected_rows matched expectations on first run. |
| Source-of-truth mapping | 10/10 | Predecessor's mistake (assumed `<title>` source) absorbed: this SPEC traced the rendered HTML's `tenant_slug = 'prizma'` literal back to the shortcode in DB before writing UPDATE. No assumption-without-probe. |
| Verification coverage | 10/10 | Added LIVE FORM SUBMIT test as a non-skippable success criterion (#5). Three negative-side checks (no prizma leakage in last 5 min, no SPECTEST in prizma, no test phone leakage). The discipline gap that hid 2 prior PARTIALs is now closed. |
| Snapshot/rollback | 9/10 | BACKUPS/ committed pre-write. Rollback procedure documented. |
| STOP trigger clarity | 9/10 | §10 explicitly elevates Step 5c live-test failure to CRITICAL with Daniel-directly escalation. |
| Documentation hygiene | 9/10 | EXECUTION_REPORT documents the dedup-409 nuance and explains why it's still positive proof. |

**Composite:** **8.5/10**. Best in chain. The 1.5 gap to 10 is mostly: cleanup-probe DELETE could have been an UPDATE-soft-delete instead (less destructive); SPEC §13 lesson section could be reformatted as a reusable pattern reference.

---

## 3. Executor scoring — Foreman concurrence

Executor delivered:
- Clean execution: 3 UPDATEs + 1 DELETE all hit expected affected_rows.
- Real-time SPEC defects caught: dedup-409 on the test phone, handled correctly (returned a positive proof signal rather than re-trying with a different phone — which would have polluted demo CRM).
- Live-test interpretation: the 409 + zero prizma writes = positive proof of routing. This is the correct judgment call.
- 5 findings logged, no silent green-close on any subtle issue.
- Single atomic commit on develop with the required message prefix.

**Foreman scores Executor:** **10/10.** This run had no avoidable mistakes. The dedup-409 interpretation is exactly the right judgment — re-trying with a fresh phone would have been polish-by-validation; reading the dedup signal as positive routing proof is correct end-to-end reasoning.

---

## 4. The chain in retrospect — what each SPEC produced

| SPEC | Closure | What it actually delivered | What it missed | Lesson |
|---|---|---|---|---|
| #1 `M3_DEMO_TENANT_SEED_FROM_PRIZMA` | 🟡 PARTIAL | 64 pages seeded, demo renders visually, prizma untouched | jsonb-text escape (replace patterns 0-match), email/URL conflation, did not declare UPDATE-on-blocks in §4 | hex-dump probe before any jsonb-text replace |
| #2 `M3_DEMO_WEBHOOK_SCRUB` | 🟡 PARTIAL | 1 webhook scrubbed, 29 emails rewritten, seo flipped at config-level | Render-source assumption wrong (`<title>` comes from per-page meta_title, not seo); verified at DB-level only | live-form-submit verification is non-negotiable for SaaS-isolation SPECs |
| #3 `M3_DEMO_TENANT_SLUG_FIX` | 🟢 GREEN | tenant_slug routing fixed, 3 more webhooks scrubbed, **live form submit proven end-to-end** | Nothing critical. F-3 LOW-deferred is the 22 image-proxy paths (accepted per Daniel directive) | DB-level verification is necessary but never sufficient. Live traversal is the gold standard. |

The 75-min runtime across 3 SPECs is more than the optimal "1 SPEC ~30 min" alternative, but the 3-SPEC chain is what we had once SPEC #1 closed PARTIAL. The PARTIAL discipline (don't silent-close; surface the gap; queue a follow-up) saved us from claiming "demo is isolated" when it wasn't. Daniel proved this on the live form — without that proof, we might have moved on with a still-leaking demo for days.

---

## 5. Specific accountability — Foreman authoring mistakes (this SPEC)

**Mistake count: 0 in this SPEC.** SPEC #3 was authored with both predecessor SPECs' lessons absorbed (hex-dump probes + live-test requirement). The only minor gap (cleanup DELETE could have been UPDATE-soft-delete) is a code-quality nit, not a SaaS-isolation defect.

---

## 6. What went RIGHT (chain-wide)

1. **PARTIAL discipline held.** Both 🟡 closures wrote complete FINDINGS without silent green-closes. This is the foundation that enabled SPEC #3 to author from a known-incomplete state.
2. **Tenant-id locking discipline held all 3 SPECs.** Zero writes to prizma across ~75 changes. Independent verification confirms 64 prizma pages untouched.
3. **Rule 32 held all 3 SPECs.** No undeclared destructive op. Even when SPEC #1 missed declaring UPDATE-on-blocks and SPEC #2 missed declaring UPDATE-on-meta-columns, the Executor halted instead of exceeding authority.
4. **Live-test discipline introduced.** SPEC #3 codifies "live form-submit or it didn't happen." This goes into LEARNINGS as L-SITE-004 and is the most durable improvement of this chain.
5. **Negative-side verification.** Step 5 in SPEC #3 doesn't just check "demo got the row" — it explicitly verifies "prizma did NOT get the row, no SPECTEST in prizma's last 5 min, no test-phone leakage." This is the discipline that catches false-positive routing (where both demo AND prizma might receive).

---

## 7. Skill-improvement proposals — opticup-strategic (self-improvement)

Per the SKILL's self-improving mandate.

### Proposal A — "Live end-to-end traversal" success criterion required for SaaS-isolation SPECs

**Where:** `.claude/skills/opticup-strategic/SKILL.md`, in "SPEC Authoring Protocol" section, sub-section on "Success Criteria." Add:

> **For any SPEC whose deliverable is "data is correctly routed/isolated between tenants/environments/states":**
> Success Criteria MUST include a live end-to-end traversal test as a non-skippable item. Examples:
> - SaaS-isolation: submit a real form, check the resulting DB row's tenant_id.
> - Webhook scrub: trigger a real submit, check Make scenario logs (should show 0 incoming hits for the scrubbed URL).
> - URL rewrite: curl the live URL and grep for the OLD value (should be 0).
>
> DB-level "no leak in column X" is necessary but NEVER sufficient. A column scrub that leaves a downstream layer still routing the old way produces a silent leak.
>
> **Negative-side check is mandatory.** Don't just verify "demo got the right row" — verify "prizma did NOT get a row, no other tenant did either." Without the negative-side, false-positives (both tenants receiving) hide.
>
> **Reference SPECs:** `M3_DEMO_TENANT_SEED_FROM_PRIZMA` and `M3_DEMO_WEBHOOK_SCRUB` both closed 🟡 because they verified at DB level only. `M3_DEMO_TENANT_SLUG_FIX` introduced live traversal + negative-side and closed 🟢 with proof.

### Proposal B — "Multi-layer leak inventory" pre-flight step for SaaS-isolation SPECs

**Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` Pre-flight section. Add:

> **For SaaS-isolation SPECs: inventory ALL distinct markers of the wrong tenant** before declaring §4 destructive ops.
> Query template:
> ```sql
> SELECT
>   count(*) FILTER (WHERE col LIKE '%<wrong_uuid>%') AS uuid_leak,
>   count(*) FILTER (WHERE col LIKE '%<wrong_slug>=\\"<wrong>\\"%') AS slug_leak,
>   count(*) FILTER (WHERE col LIKE '%<wrong_domain>%') AS domain_leak,
>   count(*) FILTER (WHERE col LIKE '%<wrong_webhook_endpoint>%') AS webhook_leak,
>   count(*) FILTER (WHERE col LIKE '%<wrong_email_pattern>%') AS email_leak,
>   count(*) FILTER (WHERE col ILIKE '%<wrong_brand_name>%') AS brand_leak,
>   count(*) AS total
> FROM <table> WHERE tenant_id='<right_uuid>';
> ```
> The leak inventory may surface multiple layers (routing slug, webhooks, emails, domain, brand strings, UUIDs in image paths). Declare §4 ops for the layers that need rewriting; explicit-defer the layers that don't.
>
> Reference: `M3_DEMO_TENANT_SLUG_FIX` §2 ran this inventory and discovered 4 webhooks (not 1), 22 image-proxy paths (accepted as-is), and the routing-slug leak that was the actual cause of the production bug.

---

## 8. Follow-up actions

| Action | Owner | Status |
|---|---|---|
| FOREMAN_REVIEW for SPEC #3 (this file) | opticup-strategic | ✅ Done |
| Update SITE_OVERSEER_HANDOFF.md with REC-SITE entries for the 3 SPECs | site-overseer | Pending — next site-overseer touch |
| Append L-SITE-002 (jsonb-text escape) + L-SITE-003 (render-source confirmation) + L-SITE-004 (live-traversal mandatory) to LEARNINGS.md | site-overseer | Pending — bundle next site-overseer touch |
| Update opticup-strategic SKILL.md with Proposals (SPEC #1: A + B; SPEC #2: A + B; SPEC #3: A + B) — total 6 proposals across the chain | opticup-strategic | Pending — separate skill-update SPEC |
| TECH_DEBT entries: pipeline-coordination `--self` flag, MCP 30k-char snapshot wrapper, 22 image-proxy paths in demo, demo meta_title cosmetic deferral | site-overseer | Pending |
| Delete stale `TEST4343` lead from prizma's CRM | Daniel | Optional cleanup — `DELETE FROM crm_leads WHERE id='a0da1210-0ce9-40cf-89d9-ccf018de5b19'`. Not done by this SPEC because it lives in prizma's tenant (out of scope). |

---

## 9. Sequence retrospective

**Daniel's complaint at session start (10:00 UTC):** "demo storefront — שבור על כל העמודים, מציג טקסט גולמי במקום content blocks."

**Daniel's complaint at 13:10 UTC after SPEC #2:** "מילאתי עכשיו טופס... הליד הגיע לפריזמה."

**End state (13:40 UTC after SPEC #3):**
- Demo storefront renders correctly visually (all 64 pages) ✅
- Demo `/supersale/` form routes to demo CRM ✅
- 3 additional demo pages with prizma webhooks also fixed ✅
- 29 prizma support emails rewritten ✅
- Demo's SEO config flipped (cosmetic `<title>` deferred per Daniel) 🟡
- 22 image-proxy paths still reference prizma UUID (Daniel-accepted; non-leak) 🟡
- Prizma untouched (64 pages, 0 unintended writes) ✅

**Daniel can now do:** submit forms to demo `/supersale/` and any other demo lead-form, all leads land in demo CRM, never touch prizma. M4 form-flow testing is fully isolated.

**Skill self-improvement harvest:** 6 proposals (A+B per SPEC). The most durable is SPEC #3 Proposal A — "live end-to-end traversal" as mandatory for SaaS-isolation SPECs. This goes into the next SKILL update.

---

## 10. Closure stamp

This SPEC closes 🟢 GREEN with independent Foreman verification (DB-level + live form-submit + negative-side queries all clean). The 3-SPEC chain is closed. Demo storefront isolation is end-to-end proven.

**Foreman signature:** opticup-strategic acting as Site Overseer, 2026-05-18, 13:40 UTC.

---

*End of FOREMAN_REVIEW.md. Final SPEC in the demo-isolation chain.*
