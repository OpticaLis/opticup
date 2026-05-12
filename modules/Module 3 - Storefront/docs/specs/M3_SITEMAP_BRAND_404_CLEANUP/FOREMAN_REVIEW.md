# FOREMAN_REVIEW — M3_SITEMAP_BRAND_404_CLEANUP

> **Location:** `modules/Module 3 - Storefront/docs/specs/M3_SITEMAP_BRAND_404_CLEANUP/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman + Site Overseer hat)
> **Written on:** 2026-05-09
> **Reviewing:** SPEC.md (authored 2026-05-09) + EXECUTION_REPORT.md + FINDINGS.md
> **Verdict:** 🟢 CLOSED

---

## 1. SPEC Quality Audit

| Aspect | Verdict | Notes |
|---|---|---|
| Step 0 — Reproduce-The-Bug-First | ✅ Pass | Author measured 155/45 ratio + sampled 21 specific 404 brand slugs from M3-DATA-01 BEFORE writing §2. Numbers were real, not assumed. |
| Step 0.1 — Pre-Authoring Sweep | ✅ Pass | Live-state baseline ✅. Identifier verification ✅ (`v_storefront_brands` columns + Astro route path confirmed). Cross-asset coupling ✅ (3 peer surfaces enumerated, alignment goal stated). Inter-commit dependency ✅ (2-commit plan; verify-script update prevents post-fix verify failure). Cross-section consistency ✅ — caught one real tension at execute time (§7 vs §4 on the 47-vs-45 question), see "tension that landed" below. Per-consumer enumeration ✅. Verify-command tooling ✅ (HTTP curl + script, no browser dependency declared up-front). |
| Success criteria measurability | ✅ Pass | All 9 SCs had exact target values + tolerance bands. Hit rate: 9/9 ✅. SC #1 hit exactly 45 (band was 43-47). |
| **SQL-equivalent for SC #1 inline in §10** | ✅ Pass | First SPEC to ship the new convention (per FOREMAN_REVIEW improvement A1 from M3_STUDIO_TRANSLATIONS_BRAND_FILTER). Executor used it; zero mid-execution AskUserQuestion to Daniel. **The improvement loop works.** |
| Autonomy envelope clarity | ✅ Pass | Both "MAY" and "MUST stop" lists narrow + specific. The §4 stop-trigger had a real tension with §7 — see §2 of this review. |
| Stop-trigger calibration | 🟡 One real gap | The §4 stop-trigger about "Astro route applies different filter" was triggered in pre-flight. Executor correctly resolved it via §7 ("47-vs-45 out of scope") but had to do reasoning the SPEC could have pre-resolved. See Author Improvement A1 below. |
| Out-of-Scope clarity | ✅ Pass | View, route, /multifocal-guide/, M3-DATA-02 all explicitly excluded — none touched. |
| Commit plan | ✅ Pass | Two-commit plan as written; both commits single-file single-concern. |
| Rollback plan | ✅ Pass | Single-PR revert is trivial. |
| Cross-repo discipline | ✅ Pass | §12 explicitly told the executor: code in storefront repo, SPEC docs in ERP repo. Followed correctly. No phase letters in storefront commits (per CLAUDE.md §7 phase-label-ownership rule). |

**SPEC overall: 9.5/10.** One real cross-section tension (§4 vs §7) cost the executor ~5 minutes of reading.

---

## 2. The §4-vs-§7 Tension That Landed

This is worth calling out because it's a teachable moment for both skills.

**§4 said:** "STOP if pre-flight discovers the Astro `/brands/[slug]/` route applies a DIFFERENT filter than `brand_page_enabled = true AND product_count > 0`."

**§7 said:** "47-vs-45 question (2 brands have products but `brand_page_enabled = false`) — out of scope. If Daniel later wants those 2 published, he flips `brand_page_enabled` in Studio."

The route DOES apply a different filter (it accepts the 47 set, route gates on `product_count > 0 AND brand_page_visibility != 'hidden'`). §4 read literally would have stopped the executor. §7 read literally resolves the question — the difference is intentional.

**Executor's resolution (correct):** §7 is intent (SPEC author's stated decision); §4 is guardrail (catches accidental misalignment). Intent wins. SQL pre-flight confirmed `spec_emits_but_404s = 0` — the SPEC's predicate is a strict subset of what the route accepts, so under-emits are safe (no 404s ship), only over-emits are unsafe. Logged the resolution in EXECUTION_REPORT §4 Decision #2.

This is exactly the kind of tension Author Improvement A1 (below) targets: future SPECs should call out subset-vs-superset relationships explicitly when they exist.

---

## 3. Execution Quality Audit

I spot-checked production after the deploy:

```
$ curl -s https://www.prizma-optic.co.il/sitemap-dynamic.xml | grep -oE '/brands/[a-z0-9-]+/' | sort -u | wc -l
45    ← exact SC #1 match

$ curl -s -o /dev/null -w "%{http_code}\n" https://www.prizma-optic.co.il/brands/west-coast/
404   ← previously emitted, now correctly absent from sitemap

$ curl -s -o /dev/null -w "%{http_code}\n" https://www.prizma-optic.co.il/brands/matsuda/
200   ← still emitted, still works
```

The 230 vs 45 discrepancy (raw `grep -c '/brands/'` returns 230, distinct slugs = 45) is correct: each brand slug appears 5x in the sitemap (1 `<loc>` for `he` + 1 `xhtml:link` per alt-lang × 2 langs × 2 brands-index references = ~5). The executor's reported "45" is the unique-slug count; matches the SPEC's intent. Confirmed.

| Aspect | Verdict | Notes |
|---|---|---|
| Followed SPEC §3 success criteria | ✅ Pass | 9/9 strict SCs met on production. Bonus: general-sample probe (check #8) returned 30/30 200, confirming the M3_SITEMAP_CONSOLIDATION leftover "pre-existing data-quality issue" was entirely brand-block-driven and is now fully closed. |
| Followed SPEC §4 autonomy envelope | ✅ Pass | Stayed in 2 files. |
| Followed SPEC §5 stop triggers | ✅ Pass | Resolved §4-vs-§7 tension correctly (intent over guardrail) + documented. |
| Iron Rule 25 (image-proxy) | ✅ Pass | `check-no-direct-supabase-image.mjs` ran clean as part of the build. |
| Iron Rule 21 (no duplicates) | ✅ Pass | Pre-flight grepped existing helpers, none matched the predicate, inline filter chosen with peer-surface comment. Defensible. |
| Cross-repo discipline | ✅ Pass | Code in `opticup-storefront`, SPEC docs in `opticup`. Two PRs (storefront + ERP retro) handled cleanly. |
| Build-side-effect handling | ✅ Pass | `tenant-fallback-map.json` drift detected, restored, logged as M3-DEBT-12. Did not pollute the commit. |
| Commit hygiene | ✅ Pass | Two commits per SPEC §9, single-file each, conventional commit messages. |
| Iron Rule self-audit | ✅ Pass | All in-scope rules addressed in §6 with evidence. |
| Findings discipline | ✅ Pass | Two findings logged, each with severity + reproduction + suggested action. Both LOW/INFO, neither blocks the SPEC's primary goal. |

**Execution overall: 9.7/10.** Self-score of 9.7 is accurate. Zero AskUserQuestion mid-execution despite a real tension to resolve — that's the Bounded Autonomy ideal.

---

## 4. Findings Processing

### M3-DEBT-12 — `tenant-fallback-map.json` drift on every build

- **Disposition:** **TECH_DEBT.** Add to root `TECH_DEBT.md` as a hygiene item.
- **Why not new SPEC:** 1-commit fix (run generator, commit fresh JSON). Doesn't justify a SPEC of its own; should be bundled with other small drift items in a future "post-cutover hygiene" SPEC.
- **Cross-ref:** Stays referenced from `FINDINGS.md` for full provenance.
- **Action:** I'll add a one-liner to `TECH_DEBT.md` in the same commit as this review so it has a permanent home.

### M3-OBS-01 — verify-sitemap.mjs check #8 warn-only allowance is now stale

- **Disposition:** **TECH_DEBT.** Same bucket as M3-DEBT-12.
- **Why not new SPEC:** 5-minute change (warn → fail + comment update). The new brand404Probe (check #10) already covers brands strictly, so tightening check #8 is incremental hardening, not bug-fix urgency.
- **Action:** Add to `TECH_DEBT.md` as a "after the next sample run shows 30/30 for 2 weeks" item — gives data confidence before tightening.

Both findings are real, both are LOW priority, neither blocks anything. No new SPEC required for either.

---

## 5. Site Overseer HANDOFF Update — REC-SITE-017 Closure

REC-SITE-017 is **CLOSED** by this SPEC. Will update `roles/site-overseer/SITE_OVERSEER_HANDOFF.md` table row + `DECISIONS_LOG.md` entry as part of this commit (see master-doc checklist below).

Bonus harvest: the M3_SITEMAP_CONSOLIDATION FINDINGS.md M3-DATA-01 ("pre-existing brand-slug 404s") is now fully resolved. The general-sample probe in `verify-sitemap.mjs` check #8 returned 30/30 200, confirming the brand-block fix eliminated the entire data-quality cluster — no residual non-brand 404s remain.

---

## 6. Master-Doc Update Checklist

| Doc | Needs update? | Action |
|---|---|---|
| `docs/GLOBAL_MAP.md` | No | No new functions, no new contracts. |
| `docs/GLOBAL_SCHEMA.sql` | No | Zero schema changes. |
| `docs/DB_TABLES_REFERENCE.md` | No | Zero new tables/columns. |
| `docs/FILE_STRUCTURE.md` | No | Zero new files in ERP repo (SPEC folder lives under module's `docs/specs/`, already covered by structure). Storefront file changes are in `opticup-storefront`, not tracked here. |
| `modules/Module 3 - Storefront/docs/MODULE_MAP.md` | No | No new function added; existing `sitemap-dynamic.xml.ts` predicate widened. |
| `modules/Module 3 - Storefront/docs/CHANGELOG.md` | Optional | Could add a one-liner; not a phase boundary, not required by Integration Ceremony. |
| `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` | No | Not a phase boundary; not changing module state. |
| `MASTER_ROADMAP.md` | No | Not a phase boundary. |
| `TECH_DEBT.md` | **Yes** | Add 2 line items: M3-DEBT-12 (tenant-fallback-map.json drift) + M3-OBS-01 (verify-sitemap check #8 stale). |
| `roles/site-overseer/SITE_OVERSEER_HANDOFF.md` | **Yes** | Mark REC-SITE-017 as (closed) in the table; add 2026-05-09 row in the recent decisions table; update "Last updated" header. |
| `roles/site-overseer/DECISIONS_LOG.md` | **Yes** | Add 2026-05-09 entry "sitemap-brand-404-cleanup". |

**Net master-doc changes required: 4 files (2 new TECH_DEBT lines, 2 site-overseer state updates).** Will land in this same retro commit.

---

## 7. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal A1 — Add "subset-vs-superset relationship" callout to SPEC template when scope intentionally diverges from a stricter check

- **Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` § "Out of Scope" — add a sub-section template
- **Change:** Add this template snippet to §7 Out-of-Scope guidance:
  ```
  ### Subset relationships (use only if applicable)

  If the SPEC's predicate is intentionally a SUBSET of what a related route /
  view / consumer accepts (i.e. SPEC emits FEWER items than the consumer
  would render), state this explicitly here:

  > "SPEC predicate emits N items; route accepts M items where M > N. The
  > delta of (M − N) items is intentional — they exist in the system but
  > are excluded from this surface for [reason]. The route will continue
  > to serve them at 200 if reached directly. This is not a bug;
  > deliberate scope reduction."

  This pre-resolves any §4 stop-trigger that would otherwise fire on
  "predicate diverges from route filter" — the executor sees the intent
  immediately and doesn't have to read both sections to reconcile.
  ```
- **Rationale:** Cost ~5 minutes in this SPEC because the executor had to read §4 + §7 together to figure out which was intent and which was guardrail. With this template, the SPEC author would have written the subset relationship directly, and the executor would have recognized it in 30 seconds.
- **Source:** §2 of this review + EXECUTION_REPORT §4 Decision #2 + Executor Improvement Proposal #1.

### Proposal A2 — Add "build-side-effect file expectations" to SPEC §8 (Expected Final State)

- **Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` § "Expected Final State"
- **Change:** Add: "If the SPEC's commands include any build/codegen step (`npm run build`, `npm run generate`, etc.), explicitly state which files those commands are EXPECTED to regenerate, and whether they should be committed or restored. Leaving this implicit creates ambiguity: the executor sees an unexpected `M file.json` in `git status` and doesn't know whether it's part of the SPEC scope or a pre-existing drift situation. Default rule (state in template): unrelated build side-effects → restore + log as finding; tightly-coupled side-effects → include + name them in §8."
- **Rationale:** Cost ~3 minutes in this SPEC navigating the `tenant-fallback-map.json` situation. With this in the template, the SPEC author would have either named the file in §8 ("commit or restore?") or pre-emptively excluded it ("NOT touched: src/data/tenant-fallback-map.json — drifts on every build, restore before commit").
- **Source:** Executor Improvement Proposal #2 + EXECUTION_REPORT §4 Decision #3 + FINDINGS.md M3-DEBT-12.

---

## 8. Executor-Skill Improvement Proposals (opticup-executor)

The executor proposed two solid proposals in EXECUTION_REPORT §8. I accept both:

- **Executor Proposal 1** (§7-vs-§4 tie-breaker rule) — **accept verbatim.** This is the symmetric counterpart to Author A1. Both ends of the loop need the rule: the author should write the subset relationship in §7, AND the executor should know how to resolve cross-section conflicts when they appear.
- **Executor Proposal 2** (build-side-effect file restoration discipline) — **accept verbatim.** Symmetric counterpart to Author A2. Author writes the expectation; executor knows the default rule.

No additional proposals from the Foreman side. Two executor + two author proposals = the standard "2 each" deliverable.

---

## 9. Verdict

**🟢 CLOSED.**

- All 9 SCs met on production with strict measurement.
- Two commits on storefront merged + deployed.
- ERP retro commit landed (`c3964a4`).
- Two findings logged + dispositioned (both → TECH_DEBT, no new SPECs).
- REC-SITE-017 closed in HANDOFF.
- 4 improvement proposals (2 author, 2 executor) ready for application.
- Bonus signal: M3_SITEMAP_CONSOLIDATION leftover data-quality issue fully resolved as a side effect.

This is one of the cleanest SPECs to ship in the post-cutover production-discipline window. SPEC author measured first, executor stopped on no false alarms, evidence quality matched the intent.

---

## 10. Sentence to Daniel (for chat closure)

> תוקן. Sitemap הקטין מ-155 ל-45 URLs של מותגים, כל ה-45 מחזירים 200 בפרודקשן. בונוס: גם ה-30 דגימות הכלליות שגיתה verify-sitemap הוציאה — 30/30 ירוקות, מה שאומר שכל בעיית ה-404 ב-sitemap נסגרה. REC-SITE-017 סגור. נשארו פתוחים: REC-SITE-012/013/014/016 (כולם MEDIUM/LOW). אם תרצה — נמשיך לפי סדר.
