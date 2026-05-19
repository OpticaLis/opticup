# FOREMAN_REVIEW — M3_DEMO_TENANT_SEED_FROM_PRIZMA

**SPEC:** `modules/Module 3 - Storefront/docs/specs/M3_DEMO_TENANT_SEED_FROM_PRIZMA/SPEC.md`
**Foreman:** opticup-strategic (acting as Site Overseer)
**Date written:** 2026-05-18
**Closure status:** 🟡 PARTIAL (8/9 success criteria) — accepted as valid close. Follow-up SPEC `M3_DEMO_WEBHOOK_SCRUB` authored same day to close the 1 fail + 2 HIGH findings.

---

## 1. Summary judgment

The Executor delivered a **correct partial close** under genuine SaaS-architecture pressure. The primary outcome — demo storefront went from completely-broken (raw WP-legacy text, no CSS, 28KB) to fully-rendered (Astro chrome, header, hero, sections, 90KB) — is exactly what Daniel asked for as the visible business outcome. The 1 failing criterion (webhook scrub) and 2 HIGH findings (email cross-contamination, SEO identity) are real but contained, and the Executor was right NOT to fix them by exceeding Iron Rule 32's declared destructive list. The follow-up SPEC handles them cleanly in ~25 minutes of additional work.

**Net assessment:** the Executor scored higher than the Foreman on this run. The SPEC had 5 distinct authoring defects (D-1 through D-5 in EXECUTION_REPORT §4); the Executor caught 4 of them and resolved within intent, surfaced the 5th explicitly, and held the line on Rule 32 when the easy path would have been to "just fix the webhook." That's the discipline I want.

---

## 2. Foreman self-scoring against SPEC quality

| Criterion | Score | Reason |
|---|---|---|
| **(a) Scope clarity** | 8/10 | The 3-table seed scope was unambiguous; the demo-tenant lock was strong; Out-of-Scope §8 explicitly listed deferrals. |
| **(b) Pre-flight depth** | 5/10 | §3 had 8 sanity checks but ZERO schema-probe queries. All 4 SQL-shape defects (D-1 jsonb→text[], D-2 spec-seed→seed, D-3 active→published, D-4 hours object→array) were avoidable with a 4-query schema-probe step. |
| **(c) Destructive-Ops declaration (Rule 32)** | 4/10 | §4 declared `UPDATE on tenants.{logo_url, business_email}` and `UPDATE on storefront_config` but NOT `UPDATE on storefront_pages.blocks`. The latter is necessary for any post-insert content patch — its absence forced the Executor into PARTIAL when the leakage check failed. Should have anticipated the need for surgical UPDATE alongside the bulk INSERT. |
| **(d) replace() pattern correctness** | 2/10 | The single largest defect. `replace()` patterns used literal `webhook_url="..."` and `tenant_slug="prizma"` which never match jsonb-text storage (`\"` not `"`). Pre-flight investigation correctly identified WHICH rows needed rewriting but did not validate THE EXACT BYTE PATTERN being matched. Cost: 30+ min Executor debug time + 🟡 PARTIAL close + new SPEC. |
| **(e) Email/URL classification** | 3/10 | SPEC §2 conflated "files containing `prizma-optic.co.il`" with "files containing prizma URL." Of the 29 hits, 0 were URLs in nav/links — all 29 were `mailto:` email addresses. A regex `~ 'https?://[^/]*prizma-optic.co.il'` in pre-flight would have classified correctly. |
| **(f) Vercel redeploy necessity** | 5/10 | §6 Step 6 required redeploy. Executor verified empirically that storefront is SSR/ISR — no redeploy needed. SPEC over-cautioned. |
| **(g) STOP trigger clarity vs ABSOLUTE RULES** | 6/10 | §10 says "MUST stop" while dispatch ABSOLUTE RULES say "continue to PARTIAL." Executor correctly chose PARTIAL but had to reason it out. Should have been explicit in SPEC. |
| **(h) Snapshot/rollback discipline** | 9/10 | §6 Step 1 + §9 Rollback were complete. BACKUPS/ committed BEFORE writes. Strong. |
| **(i) Verification coverage** | 8/10 | §6 Step 7 had 5 distinct curl assertions including the "prizma must be UNCHANGED" sanity check (criterion #9). Good coverage; could have added stage-by-stage verification queries between Steps 2/3/4/5 to catch the leakage failure earlier. |
| **(j) Documentation hygiene** | 8/10 | EXECUTION_REPORT + FINDINGS produced, BACKUPS/ included, ROADMAP/CHANGELOG references appropriate. No GLOBAL_MAP/GLOBAL_SCHEMA drift introduced because no new schema. |

**Composite (unweighted average):** **5.8 / 10**. Below my own benchmark of 7+. The replace() pattern defect and the missing destructive-op declaration are the two avoidable issues — both fixed in the follow-up SPEC.

---

## 3. Executor scoring

Per EXECUTION_REPORT §8 the Executor self-scored:
- (a) Adherence to SPEC: 6/10
- (b) Adherence to Iron Rules: 9/10
- (c) Commit hygiene: 9/10
- (d) Documentation currency: 8/10

**Foreman concurrence:**
- (a) **Adjust to 8/10.** The Executor adhered to *what the SPEC actually authorized*. They auto-fixed 4 trivial-within-intent defects (D-1..D-4) which is correct judgment; they did NOT exceed Rule 32 on D-5 which is also correct. The 6/10 self-score is too humble. SPEC-author error caused most of the friction.
- (b) **Concur 9/10.** Rule 32 held when easy path was to break it.
- (c) **Concur 9/10.** Single commit, explicit file adds, parallel-session untracked files left alone.
- (d) **Concur 8/10.** Documentation is current and complete for what was changed.

---

## 4. Specific accountability — Foreman authoring mistakes

### Mistake #1 — `replace()` patterns without hex-dump verification

**What I should have done:** Before writing §3 INSERT, I should have probed the actual stored byte form via `SELECT encode(convert_to(substring(blocks::text, position('marker' in blocks::text), 90), 'UTF8'), 'hex')` on a sample prizma row. Inner JSON quotes appear as `5c22` (`\"`). I would have seen this immediately and written escape-aware patterns from the start.

**Why I missed it:** I authored the SPEC assuming jsonb's stored form matched its parsed form. That's true at the API/Astro layer but NOT at the `::text` cast layer. I conflated "what jsonb_pretty() shows" with "what `::text` returns."

**Cost:** ~30 min Executor debug + 🟡 PARTIAL close + 1 follow-up SPEC.

**Fix forward:** the follow-up SPEC §2 includes the hex dump. Proposal #1 to opticup-strategic SKILL.md captures the lesson permanently.

### Mistake #2 — Destructive-Ops declared list incomplete

**What I should have done:** §4 should have included `UPDATE on storefront_pages.blocks` as a 5th declared op, because §3 INSERT's `replace()` chain WAS effectively an UPDATE on the source data being inserted. The transformation function is bytewise identical to a post-insert UPDATE. If I'd seen the equivalence, I would have declared it, and the Executor would have had authority to auto-fix the leakage when verification caught it.

**Why I missed it:** I treated "INSERT with transformation" and "UPDATE with transformation" as architecturally distinct, but for Rule 32 purposes they're both destructive ops on the same column. The rule's "no silent destructive op" intent should expand to "no destructive op not anticipated in the declared list, regardless of operation name."

**Cost:** the leakage couldn't be fixed mid-run; PARTIAL close was the only legal exit.

**Fix forward:** Proposal #2 to opticup-strategic SKILL.md — when declaring destructive ops on jsonb columns, declare BOTH INSERT-with-transformation AND UPDATE on the same column, so post-insert patches are authorized.

### Mistake #3 — Pre-flight investigation conflation

The 29 `prizma-optic.co.il` hits were all emails, not URLs. I should have written a regex check that classified them. Cost: same as Mistake #1.

---

## 5. What went RIGHT (worth keeping)

1. **Tenant-id locking discipline.** Every WHERE clause in §3-§5 included the demo UUID literal. Zero risk of prizma drift. Executor verified prizma untouched in Step 7-E.
2. **Snapshot-first protocol.** §6 Step 1 wrote 4 JSON backups BEFORE writes. The Executor committed them. If we needed to roll back, we could.
3. **Out-of-Scope explicit listing.** §8 itemized 7 deferrals. The Executor didn't try to expand scope to fix any of them. Clean.
4. **Parallel-session coordination.** §3 0h required the pipeline lock + collision check. Worked: parallel M1 session noticed, no conflict.
5. **STOP triggers were non-overridable.** §10 listed 9 triggers. The Executor honored all 9 — even the one that forced PARTIAL.
6. **The Executor's own discipline.** When Rule 32 said no, they said no. When the leakage was technically trivial to fix, they didn't fix it. That's the discipline I want and I'm going to write it into the skill as a positive example.

---

## 6. Cross-check against project memory & feedback files

| Source | Rule | Compliance | Note |
|---|---|---|---|
| `feedback_no_polish_by_validation` | "Rebuild SPECs MUST ship code changes; existing code already meets criteria → MUST escalate" | ✅ | Demo had ZERO published storefront_pages before this SPEC. 64 inserted = real data change. Not polish-by-validation. |
| `feedback_no_polish_by_validation` | "FOREMAN_REVIEW mandatory within 24h of close" | ✅ | This file, same day. |
| `feedback_never_propose_wind_down` | "Stopping is Daniel-only call" | ✅ | Executor continued through to closure. |
| `feedback_always_recommend` | "Every option-list must end with explicit recommendation" | ✅ | This review ends with §10 recommendation. |
| `feedback_always_saas_clean` | "Recommend SaaS-clean by default" | ✅ | The seed approach (tenant_id-scoped, demo-isolated) is SaaS-clean: works for any future tenant added later (`copy from prizma + rewrite N strings`). |
| `feedback_audit_real_world_check` | "Classify findings as live-customer-harm vs theoretical" | ✅ | F-1 = real harm (CRM cross-contamination). F-2 = real harm (mail to wrong people). F-3 = real harm (SEO competition). F-7+F-8 = informational, no harm. All correctly classified. |
| `feedback_finish_the_sequence` | "Chain dispatches without pausing" | ✅ | Foreman immediately authored M3_DEMO_WEBHOOK_SCRUB without asking Daniel "ready for next?" |
| Iron Rule 32 | "Declared destructive list non-overridable" | ✅ | Executor held the line. Foreman acknowledged the declaration was incomplete and authored the follow-up. |
| `feedback_overnight_run_pattern` | "Skip-not-stop on independent items" | N/A | Single-SPEC run, not an overnight bundle. |

---

## 7. Skill-improvement proposals — opticup-strategic (self-improvement)

Per the opticup-strategic SKILL's "self-improving" mandate, every FOREMAN_REVIEW must surface 2 concrete proposals to improve the skill, harvested from this SPEC's execution data.

### Proposal A — Add "jsonb-text hex-dump probe" to SPEC_TEMPLATE pre-flight section

**Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` (or equivalent), in the "Step 0 — Pre-flight checks" section. Add a sub-bullet:

> **For any SPEC that uses `replace()`, `regexp_replace()`, or `jsonb_set()` against a jsonb column:**
> Include a hex-dump probe in §3 0X:
> ```sql
> SELECT encode(convert_to(
>   substring(<col>::text,
>             position('<unique_marker>' in <col>::text),
>             90),
>   'UTF8'), 'hex')
> FROM <table>
> WHERE <some_row_with_the_marker>;
> ```
> If the hex contains `5c22` near the marker, inner JSON quotes are escaped as `\"`. Match patterns MUST use postgres E-string escape: `E'\\"<x>\\"'`. Verification LIKE patterns MUST account for `\\` as the LIKE default escape character.

**Why this proposal:** the single largest defect class in this SPEC. Without this probe, jsonb-text replace SPECs will fail again. Adding it to the template makes future Foremen catch it during authoring, not during execution.

### Proposal B — "Anticipated destructive ops" sub-section in §4 Declared List

**Where:** `.claude/skills/opticup-strategic/SKILL.md`, in the "Destructive Operations" guidance for §4 authoring. Add:

> **When authoring §4, ask: "If verification in §7 fails on Criterion N, what UPDATE/DELETE would the Executor need to perform to fix it?"** If the answer involves a column or table not yet in the declared list, ADD IT to the list now. This expands the Executor's authority to auto-fix verification-caught defects WITHIN the SPEC's scope, rather than forcing PARTIAL close on every verification miss.
>
> Example pattern (from M3_DEMO_TENANT_SEED_FROM_PRIZMA): the §3 INSERT used `replace()` to rewrite content. If the verification check finds residual content, the obvious fix is an UPDATE on the same column with a corrected pattern. The §4 list should declare BOTH the INSERT and the targeted UPDATE on `<column>`, even if the SPEC's happy-path doesn't run the UPDATE.

**Why this proposal:** Rule 32 is correct as written, but the Foreman's pre-authoring discipline can EXPAND legal Executor authority by anticipating verification-fix paths. This converts "PARTIAL close because we didn't declare the fix" into "GREEN close because we declared and applied the fix in-run."

---

## 8. Follow-up actions

| Action | Owner | Status |
|---|---|---|
| Author M3_DEMO_WEBHOOK_SCRUB SPEC | opticup-strategic (Foreman) | ✅ Done same day, sibling folder |
| Execute M3_DEMO_WEBHOOK_SCRUB | opticup-executor (Claude Code) | Pending — activation prompt delivered to Daniel |
| Update opticup-strategic SKILL.md with Proposals A + B | opticup-strategic | Pending — separate SPEC (`STRATEGIC_SKILL_PROPOSALS_2026_05_18`) or inline edit |
| Update SITE_OVERSEER_HANDOFF.md with REC-SITE-NN (new) entries | site-overseer | Pending — after M3_DEMO_WEBHOOK_SCRUB closes |
| Append L-SITE-002 to LEARNINGS.md (jsonb-text rule) | site-overseer | Pending — after M3_DEMO_WEBHOOK_SCRUB closes |
| Add findings to TECH_DEBT.md (F-5 SPEC §10 vs ABSOLUTE RULES lang, F-6 pipeline-coordination --self) | site-overseer | Pending |

---

## 9. Closure stamp

This SPEC closes 🟡 PARTIAL **as a valid close** (not a "good enough" close). The PARTIAL is caused by Foreman SPEC-authoring defects, not Executor error. Follow-up SPEC `M3_DEMO_WEBHOOK_SCRUB` addresses the 3 open findings (F-1 + F-2 + F-3) within the same business day. Per `feedback_no_polish_by_validation`, this Foreman review is the required-within-24h artifact.

**Foreman signature:** opticup-strategic acting as Site Overseer, 2026-05-18.

---

*End of FOREMAN_REVIEW.md. Co-located with SPEC.md + EXECUTION_REPORT.md + FINDINGS.md per folder-per-SPEC protocol.*
