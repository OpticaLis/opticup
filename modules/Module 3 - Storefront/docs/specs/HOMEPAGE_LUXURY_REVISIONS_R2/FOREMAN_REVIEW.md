# FOREMAN_REVIEW — HOMEPAGE_LUXURY_REVISIONS_R2

> **Location:** `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS_R2/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman) — Cowork session `relaxed-dreamy-gates`
> **Written on:** 2026-04-16
> **Reviews:** `SPEC.md` (author: opticup-strategic / same Cowork session, 2026-04-16 ~15:00, amended ~16:00) + `EXECUTION_REPORT.md` (executor: opticup-executor on Windows Claude Code, 2026-04-16 ~16:11) + `FINDINGS.md` (4 findings)
> **Commit range reviewed:**
> - ERP: `3a88d1c..54d3f00` (1 commit)
> - Storefront: `ac838bf..2d4173f` (2 commits: `faa31c5` + `2d4173f`)

---

## 1. Verdict

🟢 **CLOSED**

Every SPEC criterion that could be verified from the Foreman's side verified cleanly (block count, order, ids, YouTube IDs, StoryTeaser title, gold class, EN/RU baseline). All 4 findings have explicit dispositions (2 TECH_DEBT, 1 NEW_SPEC stub, 1 DISMISS). No master-doc drift (SESSION_CONTEXT + CHANGELOG updated in the close commit; MASTER_ROADMAP correctly untouched per SPEC §8 — R2 is polish, not a phase close). Execution scored ≥4.5/5 on every dimension. The SPEC itself had two authoring mistakes (marquee premise, safety-net script name) which the executor caught and resolved in-flight; these feed directly into the two author-skill proposals in §6.

---

## 2. SPEC Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Goal clarity | 4 | §1 Goal is unambiguous on the 3 changes Daniel wanted + the bundled quality passes. **But:** the Goal explicitly claimed R1 used a buggy single-track `-100%` marquee animation, which turned out to be false (finding M3-SPEC-DRIFT-01). A 30-second `cat global.css \| grep -A5 marquee` before dispatch would have shown the twin-track `translateX(-50%)` was already in place. |
| Measurability of success criteria | 5 | 21 criteria each with an exact expected value + copy-paste verify command. Criterion #3 verifies `jsonb_array_length = 8`, #4 verifies exact block-type array, #6 verifies exact YouTube IDs. Literal-verify is a good guard-rail. |
| Completeness of autonomy envelope | 5 | §4 explicitly lists what executor CAN do (read, Level-1 SQL, one targeted UPDATE with scoped WHERE, shared-renderer edits, 3 commits) and what REQUIRES stop (EN/RU rows, schema DDL, new block type, safety-net failure, build failure). Executor reported 0 mid-flight questions. |
| Stop-trigger specificity | 5 | §5 triggers were narrow: "if block_count ≠ 8", "if EN/RU updated_at changes", "if contrast audit finds >8 occurrences". All actionable, none vague. |
| Rollback plan realism | 5 | §6 specified PRE_STATE_BACKUP.json as the rollback source of truth + the exact `UPDATE … SET blocks = '<backup>'::jsonb` recipe. Executor captured the backup before the write, per plan. |
| Expected final state accuracy | 3 | §8 specified the HE row's 8-block target correctly, but **did not address HE/EN/RU structural parity.** Live DB state shows EN + RU both have `tier1_spotlight` at index 2 (no exhibitions block), while HE now has `exhibitions-home-he` at index 2 (no tier1_spotlight). The SPEC assumed "EN + RU unchanged" was a sufficient cross-locale guard, but didn't flag that R1 had already diverged the 3 locales and this SPEC widens that divergence. Documented here as new finding M3-LOCALE-PARITY-01 → TECH_DEBT. |
| Commit plan usefulness | 5 | §9 applied the A1 proposal from `PRE_MERGE_SEO_FIXES` FOREMAN_REVIEW (per-file deltas per commit). Executor's 3 landed commits map 1:1 to the 3 planned commits. |

**Average score:** 4.57/5.

**Weakest dimension:** Expected final state accuracy (3/5). The SPEC operated as if all 3 locales had symmetric pre-state and only HE needed changing — true for the field-level changes, but misleading about structural parity. §6 Proposal 2 below makes this a standing Foreman pre-SPEC check.

---

## 3. Execution Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Adherence to SPEC scope | 5 | 8 files touched in storefront + 1 DB row UPDATE + 6 ERP files. Zero files modified outside §8 scope. D6 in EXECUTION_REPORT explicitly refused scope creep ("did NOT rewrite copy on un-touched blocks"). |
| Adherence to Iron Rules | 5 | §6 of EXECUTION_REPORT audits every applicable rule with evidence. Rule 20 (SaaS litmus) explicitly verified via grep for tenant-id literals in keyframes + contrast rules → 0 hits. Rule 21 (no duplicates) reused `events_showcase` block type + existing `text-gold` class. Rule 22 (defense-in-depth) quadruple-guarded the UPDATE WHERE. |
| Commit hygiene | 5 | 3 commits, each one-concern: `faa31c5` is purely reduced-motion, `2d4173f` is contrast + font only, `54d3f00` is SPEC close only. All messages follow `type(scope): description`. No `git add -A`. |
| Handling of deviations | 5 | 4 deviations, all stopped + documented: #1 criterion #5 literal mismatch → jsonb_set follow-up (didn't hide it, logged in §3); #2 missing script → substituted + logged as finding; #3 localhost smoke deferred → named explicitly + rationalized; #4 wrong Foreman premise → documented honestly as finding M3-SPEC-DRIFT-01 with concrete fix proposal. Textbook stop-on-deviation behavior. |
| Documentation currency | 5 | SESSION_CONTEXT rewritten with new "Execution Close-Out 2026-04-16" section (I spot-read — it's comprehensive). CHANGELOG updated with R2 entry + deltas table. MASTER_ROADMAP correctly NOT touched (SPEC §8 said don't — R2 is polish, not phase close). GLOBAL_MAP + GLOBAL_SCHEMA correctly NOT touched (no new contracts or DB objects). FILE_STRUCTURE not updated — not needed, no new code files outside the canonical SPEC folder. |
| FINDINGS discipline | 5 | 4 findings logged with codes (M3-EXEC-DEBT-02, M3-DOC-DRIFT-02, M3-EXEC-INFO-02, M3-SPEC-DRIFT-01), severity (3 LOW + 1 INFO), reproduction, suggested disposition. None absorbed. |
| EXECUTION_REPORT honesty + specificity | 5 | §3 admits the Foreman premise was wrong; §5 "What would have helped me go faster" names 4 concrete improvements; §7 Self-Assessment gives 9.7/10 with breakdown per dimension; §4 Decisions documents 7 real-time calls (D1–D7) with rationale. Not a whitewash. |

**Average score:** 5.0/5.

**Did executor follow the autonomy envelope correctly?** YES. Zero unauthorized file modifications, zero unauthorized SQL beyond Level 2 scope (one targeted UPDATE + follow-up `jsonb_set` on the same row, both within Prizma/HE scope).

**Did executor ask unnecessary questions?** Zero mid-execution questions. One pre-execution clarification on pre-existing WIP (per First Action step 4) — this is protocol-mandated, not unnecessary.

**Did executor silently absorb any scope changes?** No. Every deviation (including the jsonb_set follow-up) is named in EXECUTION_REPORT §3 + EXECUTION_REPORT §4.

---

## 4. Findings Processing

| # | Finding summary | Disposition | Action taken |
|---|-----------------|-------------|--------------|
| 1 | **M3-EXEC-DEBT-02** — Storefront `verify:full` fails on 55 pre-existing baseline violations in `docs/*.html` + `scripts/seo/*` | **NEW_SPEC queued** | File `M3_STOREFRONT_VERIFY_BASELINE_CLEANUP/` after NAV_FIX closes. Either exclude `docs/**` from `verify.mjs` or sanitize JWT-looking strings in WP exports. Priority: MEDIUM — gates future SPECs' literal `verify:full` checks. |
| 2 | **M3-DOC-DRIFT-02** — SPEC criterion #18 cited `npm run safety-net` which does not exist in storefront `package.json` | **TECH_DEBT** (add entry) + **folded into Proposal 2 below** | Add to `TECH_DEBT.md` as M3-DEBT-DOC-03 ("SPEC templates reference `safety-net` which does not exist as an npm script — either add the script alias or stop using the name in criteria"). |
| 3 | **M3-EXEC-INFO-02** — `localhost:4321/` console smoke deferred (autonomous flow has no dev-server lifecycle) | **DISMISS** | Accept executor's analysis. Going forward, SPEC criteria that require a running browser must be explicitly labeled "Daniel-side" per the convention in §6 Proposal 1 below. No follow-up artifact. |
| 4 | **M3-SPEC-DRIFT-01** — Foreman's §1 Goal claimed R1 used a buggy single-track `-100%` marquee; reality was already the seamless twin-track `translateX(-50%)` pattern | **DISMISS** (self-resolved) + **folded into Proposal 1 below** | The deviation was caught + handled in execution (commit `faa31c5` landed the one real fix — reduced-motion syntax). The learning — pre-SPEC reality grep — is absorbed into author-skill Proposal 1. No retroactive artifact needed. |
| 5 (Foreman-added) | **M3-LOCALE-PARITY-01** — HE homepage now has `exhibitions-home-he` at index 2 while EN + RU still have `tier1_spotlight` at index 2. Divergence predates R2 (R1 also only updated HE), but R2 widens it. | **TECH_DEBT** | Add to `TECH_DEBT.md` as M3-DEBT-LOCALE-01 ("HE vs EN/RU homepage block divergence: HE has exhibitions + events_showcase, EN/RU still have tier1_spotlight + tier2_grid. Decide during LANGUAGES_FIX whether to: (a) port exhibitions to EN/RU, (b) accept HE-only by design, or (c) port both ways for parity"). NOT a blocker for NAV_FIX. |

**Zero findings left orphaned.**

---

## 5. Spot-Check Verification

| Claim (from EXECUTION_REPORT) | Verified? | Method |
|-------------------------------|-----------|--------|
| "HE block_count = 8 with exact type array `[hero_luxury, brand_strip, events_showcase, story_teaser, events_showcase, tier2_grid, optometry_teaser, visit_us]`" | ✅ | Supabase MCP `SELECT jsonb_array_length(blocks), jsonb_path_query_array(blocks, '$[*].type') …` → 8, exact match |
| "Exhibitions block at index 2 has id `exhibitions-home-he` + section_title mentions תערוכות + 3 YouTube IDs `XvfUYI87jso, E8xt6Oj-QQw, hOCxDNFEjWA`" | ✅ | Supabase MCP → id match, title = "מהתערוכות בעולם — לחנות שלנו" contains תערוכות, youtube_ids exact array match |
| "StoryTeaser title = `נעים מאוד, אופטיקה פריזמה`, body contains `text-gold`, image unchanged from pre-SPEC path" | ✅ | Supabase MCP → title exact match, `body ILIKE '%text-gold%'` = true, image path `/api/image/media/6ad0781b.../general/IMG-20241230-WA0096_1775230678239.webp` preserved |
| "EN + RU `updated_at` preserved at baseline `2026-04-16 09:17:23.065827+00`" | ✅ | Supabase MCP → both rows show exactly that timestamp |
| "ERP commit `54d3f00` contains 6 files: SESSION_CONTEXT + CHANGELOG + SPEC.md + EXECUTION_REPORT + FINDINGS + PRE_STATE_BACKUP" | ✅ | `git show --stat 54d3f00` → exactly 6 files, 650 insertions / 3 deletions |

All 5 spot-checks PASS. No 🔴 REOPEN trigger.

---

## 6. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal 1 — Pre-SPEC Reality-Check sweep on §1 Goal claims

- **Where:** `.claude/skills/opticup-strategic/SKILL.md` § "SPEC Authoring Protocol — Step 1 — Pre-SPEC Preparation (MANDATORY before drafting)" — add a new sub-step **8.5 "Reality Check"**
- **Change:** Add the following sub-step between current 8 (harvest lessons) and the Guardian load:
  > **8.5 Reality-Check any "X is currently broken / missing / wrong" claim before putting it in §1 Goal.** If the SPEC premise rests on the current state of the code (e.g., "R1's marquee uses a single-track `-100%` animation"), run a 30-second grep to confirm:
  > ```
  > cd <target_repo>
  > git show HEAD:<file> | head -n 120
  > # OR
  > grep -rn "<the thing you're claiming is broken>" src/
  > ```
  > Paste the grep output (or a one-line summary) into §11 Lessons Already Incorporated: "Reality Check completed 2026-04-16 against {ref}: premise verified / premise revised to {new framing}." An unchecked §1 premise = an incomplete SPEC.
- **Rationale:** R2 §1 claimed the R1 marquee used `-100%` single-track; the executor found R1 already had twin-track `translateX(-50%)` (finding M3-SPEC-DRIFT-01). This wasted ~5 minutes of executor time verifying "the fix is already in place" and injected a false assumption into the Goal statement that leaked into Commit 1's framing. The grep would have cost 30 seconds at authoring time and forced the SPEC to reframe around the real issue (only `prefers-reduced-motion` syntax was off).
- **Source:** EXECUTION_REPORT §3 deviation #4 + FINDINGS M3-SPEC-DRIFT-01

### Proposal 2 — Pre-SPEC verify-command script-name sanity check

- **Where:** `.claude/skills/opticup-strategic/SKILL.md` § "SPEC Authoring Protocol — Step 1.5 Cross-Reference Check (MANDATORY)" — add a new bullet **6**
- **Change:** Add to the numbered list in Step 1.5:
  > **6. Verify every `npm run X` / `script Y` cited in §3 Success Criteria verify-column.** For each cited script, grep the target repo's `package.json` (or the script path on disk): `cd <repo> && cat package.json \| jq -r '.scripts \| keys[]' \| grep -F '<cited-name>'` — if the name is not in the output, the SPEC is not dispatchable. Either rename the criterion to an actually-existing script (e.g., `verify:full` instead of `safety-net`), or add the missing script to scope as a prerequisite commit. Document in §11: "Verify-command sanity check 2026-04-XX against `<repo>/package.json`: N/N script names confirmed."
- **Rationale:** R2 criterion #18 said `npm run safety-net` must pass — but no such script exists in `opticup-storefront/package.json`. The name was inherited from CLAUDE.md §6 Rule 30 wording, which describes the policy concept, not a literal npm script. This forced the executor to substitute `verify:full` mid-execution and log a finding (M3-DOC-DRIFT-02). A pre-dispatch grep of `package.json` would have caught this in 10 seconds.
- **Source:** FINDINGS M3-DOC-DRIFT-02 + EXECUTION_REPORT §3 deviation #2 + executor-side mirror in EXECUTION_REPORT §8 Proposal 1

### (Standing intent for future: HE/EN/RU parity pre-check)

Finding M3-LOCALE-PARITY-01 suggests a third author-skill improvement: before dispatching any homepage-row SPEC, SELECT all 3 locale rows and diff their structure. **Deferred to the next FOREMAN_REVIEW** to keep this review at exactly 2 proposals per the skill contract (avoid proposal inflation). Tracked in TECH_DEBT → re-evaluate after LANGUAGES_FIX closes.

---

## 7. Executor-Skill Improvement Proposals (opticup-executor)

### Proposal 1 — Pre-execution §1 Goal sanity check (complementary guard to Foreman A1)

- **Where:** `.claude/skills/opticup-executor/SKILL.md` § "SPEC Execution Protocol — Step 1 Load and validate the SPEC" — add sub-step **1.6 "§1 Goal Reality Check"**
- **Change:** Add after existing sub-steps:
  > **1.6 Reality-check every concrete state claim in §1 Goal + §3 success criteria.** If the SPEC says "R1's current CSS animates by -100%" or "BlockX uses ClassY" or "TableZ has N rows", run the equivalent `git show HEAD:<file>` / grep / `SELECT` in ≤30 seconds. If the reality differs from the claim: STOP and report to the Foreman: *"§1 premise says X; reality shows Y. Confirm whether SPEC scope changes."* This is different from Step 1.5 DB Pre-Flight (which checks name collisions for NEW objects) — this checks whether the SPEC's premises about EXISTING state are accurate.
- **Rationale:** Even if the Foreman-side Proposal 1 (§6) gets implemented, it's a single point of failure at authoring time. A mirror pre-check on the executor side gives defense-in-depth — if the Foreman forgot, the executor catches it and the feedback loop tightens. In R2, the executor effectively did this reality check but took ~5 minutes and absorbed the cost silently. Codifying it as a ≤30-second mandatory step turns implicit vigilance into a named, cheap habit.
- **Source:** EXECUTION_REPORT §3 deviation #4 + §5 bullet 2 ("Foreman premise verification on existing CSS — 30 seconds would have saved 5 minutes")

### Proposal 2 — JSONB partial-update pattern in Code Patterns

- **Where:** `.claude/skills/opticup-executor/SKILL.md` § "Code Patterns — Database patterns" — add one new bullet
- **Change:** Add:
  > - **JSONB column partial updates**: for field-level fixes inside a JSONB column, prefer `UPDATE … SET col = jsonb_set(col, '{path,to,key}', '<value>'::jsonb) WHERE <scoped>` over re-running a full `col = '{...}'::jsonb` UPDATE. Benefits: (a) atomic, (b) byte-cheap (no full-payload re-upload), (c) leaves an isolated audit diff that's easy to review. Always include the same tenant-id + slug + lang + is_deleted WHERE clause as the parent UPDATE. Use when a verify-step discovers a single JSONB field needs correction after a bulk UPDATE landed (e.g., criterion-5 literal-phrase fix in the R2 exhibitions section_title).
- **Rationale:** When R2's executor detected criterion #5 literal-phrase mismatch, their first instinct could have been to re-run the full 8-block UPDATE with one character change. Choosing `jsonb_set` was the right call but the skill doesn't currently surface it as a documented pattern. The R2 fix (`jsonb_set(blocks, '{2,data,section_title}', …)`) is a textbook example that future SPECs with JSONB columns will benefit from.
- **Source:** EXECUTION_REPORT §8 Proposal 2 (executor's own; accepted verbatim with the "same scoped WHERE" clarification added)

---

## 8. Master-Doc Update Checklist

| Doc | Should have been updated? | Was it? | If not, follow-up needed |
|-----|--------------------------|---------|-------------------------|
| `MASTER_ROADMAP.md` §3 Current State | NO — R2 is polish within Phase D Content Iteration, not a phase close | N/A | No follow-up. Decisions log could optionally carry an entry; left to discretion. |
| `docs/GLOBAL_MAP.md` | NO — no new functions, contracts, or RPCs | N/A | — |
| `docs/GLOBAL_SCHEMA.sql` | NO — no new tables, columns, views, RLS policies, or constraints (UPDATE-only on existing JSONB column) | N/A | — |
| Module 3 `SESSION_CONTEXT.md` | YES | ✅ | Executor commit `54d3f00` rewrote the top block (R1 → R2 status) and added a full "Execution Close-Out 2026-04-16 — HOMEPAGE_LUXURY_REVISIONS_R2" section with all deliverables, verification, retrospective artifacts, and next gate (NAV_FIX). |
| Module 3 `CHANGELOG.md` | YES | ✅ | Executor commit `54d3f00` added an R2 entry with the deltas table (44 insertions). |
| Module 3 `MODULE_MAP.md` | NO — no new code files, functions, or global symbols (renderer edits are in place, no new exports) | N/A | — |
| Module 3 `MODULE_SPEC.md` | NO — business logic unchanged; only HE copy + one new data-driven block | N/A | — |
| `TECH_DEBT.md` | YES — 2 new entries (M3-DEBT-DOC-03 safety-net name drift, M3-DEBT-LOCALE-01 HE/EN/RU parity) | ❌ | **Follow-up needed:** 2 TECH_DEBT entries to be added in the next ERP commit. Added to §10 Followups below. |
| `docs/guardian/GUARDIAN_ALERTS.md` | Optional — Sentinel runs autonomously; could flag the TECH_DEBT additions next cycle | N/A | No manual update required; next Sentinel cycle will pick up the new TECH_DEBT entries. |

**Hard-fail check:** one row (TECH_DEBT.md) says "should have been" + "wasn't" — this would cap the verdict at 🟡 per §1 rules. **However**, the expected TECH_DEBT entries are generated by THIS review (they didn't exist at executor-commit-time because I hadn't processed findings yet). The correct reading: the TECH_DEBT update is a Foreman responsibility, not an executor miss, and will be committed together with this FOREMAN_REVIEW.md in the same commit. Verdict stays 🟢 contingent on the TECH_DEBT entries landing in this commit. If they don't — reopen and downgrade.

---

## 9. Daniel-Facing Summary (Hebrew, 3 sentences max)

> R2 סגור. דף הבית העברי קיבל את כל התיקונים — בלוק תערוכות חדש עם 3 סרטונים, סיפור "נעים מאוד אופטיקה פריזמה" עם שם המותג בזהב, פונט אחיד, וכותרות קריאות על רקע כהה. מצאנו 5 דברים קטנים בדרך (רובם דוקומנטציה) — אף אחד לא חוסם, הכול מתועד ל־TECH_DEBT. מוכן להמשיך ל־NAV_FIX מתי שתרצה.

---

## 10. Followups Opened

Every new artifact created because of this review:

- **`TECH_DEBT.md` — new entry M3-DEBT-DOC-03** (name: "SPEC templates reference `npm run safety-net` which is not a real script"; source: finding #2 M3-DOC-DRIFT-02) — to be added in this review's commit
- **`TECH_DEBT.md` — new entry M3-DEBT-LOCALE-01** (name: "HE homepage has exhibitions + events_showcase; EN/RU still have tier1_spotlight + tier2_grid — decide parity strategy during LANGUAGES_FIX"; source: finding #5 M3-LOCALE-PARITY-01) — to be added in this review's commit
- **SPEC stub `M3_STOREFRONT_VERIFY_BASELINE_CLEANUP/`** — NOT created now; queued to open AFTER NAV_FIX closes (avoid opening SPECs faster than we close them). Source: finding #1 M3-EXEC-DEBT-02
- **Skill file edits** — 2 to opticup-strategic + 2 to opticup-executor per §6 and §7 above. Per skill's self-improvement mandate, these apply on a future session that runs the "recent-FOREMAN_REVIEW proposals sweep", NOT in this Cowork commit (authoring edits to skill files requires a Windows-side Claude Code session with the plugin repo mounted).

---

*End of FOREMAN_REVIEW.*
*Skill self-improvement check: this review produced exactly 2 author-skill proposals + exactly 2 executor-skill proposals per the opticup-strategic SKILL.md contract. A future session running the "consecutive-reviews same-issue" audit will find that Proposals 1 + 2 here echo the "pre-execution state verification" theme raised in R1's FOREMAN_REVIEW (A1/E1 "repo-vs-plugin path resolution") — not the same issue, but both are instances of the meta-pattern "verify premise before acting on it". If a 3rd review raises the same theme, the skill should be edited to elevate premise-verification to a top-level protocol section, not just a step.*
