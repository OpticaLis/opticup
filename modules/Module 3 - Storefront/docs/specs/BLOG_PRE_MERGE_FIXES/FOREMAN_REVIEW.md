# FOREMAN_REVIEW — BLOG_PRE_MERGE_FIXES

> **Location:** `modules/Module 3 - Storefront/docs/specs/BLOG_PRE_MERGE_FIXES/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman, Cowork session 2026-04-15)
> **Reviews:** `SPEC.md` (authored 2026-04-15 by opticup-strategic) + `EXECUTION_REPORT.md` (executor: opticup-executor, 2026-04-15) + `FINDINGS.md` (5 findings) + `FINDINGS_TENANT.md` (82-post Instagram scope)
> **Commit range reviewed:** `678a82e..3e92f7f` (4 commits on `develop`)

---

## 1. Verdict

🟡 **CLOSED WITH FOLLOW-UPS**

All 14 verifiable success criteria pass; 3 criteria (14/15/16 — browser spot-check, storefront build, blog page 200s) are legitimately UNVERIFIED because a running `localhost:4321` is not reachable from the Cowork executor session — these are rolled into the existing `QA_HANDOFF_2026-04-14.md` QA pass. Two real follow-ups are queued: (a) the 82-post Instagram-handle scope (new SPEC `BLOG_INSTAGRAM_TEMPLATIZE`), and (b) 4 permanently-lost images added to TECH_DEBT. No rework of what shipped.

---

## 2. SPEC Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Goal clarity | 5 | §1 one-paragraph goal, followed by per-section scope tables |
| Measurability of success criteria | 4 | 17 criteria, all with exact expected values + verify queries. -1 because Criterion 6 was ambiguous (`/api/image/` OR Supabase public — executor had to infer). |
| Completeness of autonomy envelope | 5 | Added dedup criterion 4b + commit-2 dedup protocol at Daniel's request before dispatch — caught the right "check before upload" concern. |
| Stop-trigger specificity | 5 | §5 triggered on real-world quantities (≥500 URL count, 0-row UPDATE, empty content post-rewrite). |
| Rollback plan realism | 4 | Per-phase rollback was realistic and pre-phase SQL snapshot was required. -1 because §6 did not spell out storage.objects cleanup precisely (orphan storage bytes tolerated but not described). |
| Expected final state accuracy | **3** | §8 said "41 posts (21 en + 20 ru)" for slugs — actual was 58 (19 en + 39 ru, after soft-deletes). §7 said "7 posts" for tenant hardcoding — actual was 82. Both numbers were borrowed from the prior audit's sampling, not re-enumerated. The CRITERIA themselves were DB-live queries so the SPEC still executed correctly, but the narrative counts were wrong. |
| Commit plan usefulness | 3 | Planned 6 commits; executor produced 4 (combined 3+4+5). The combined commit is cleaner in hindsight — the plan over-granularized DB-only operations. |

**Average score:** 4.1 / 5.

**Weakest dimension:** "Expected final state accuracy" (3/5) — I trusted the prior audit's sample-based counts instead of requiring a full-enumeration baseline before drafting the narrative. The live-DB criteria saved the execution, but the narrative discrepancy forced the executor to file a deviation (FINDING-001, 002) that should have been authored accurately from the start. Proposal 1 in §6 addresses this.

---

## 3. Execution Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Adherence to SPEC scope | 5 | Every criterion addressed. No out-of-scope edits. |
| Adherence to Iron Rules | 5 | R14 (tenant_id on inserts), R21 (dedup check before upload), R22 (tenant_id in UPDATE filters), R23 (no service_role key committed, only public key flagged as false positive). Clean. |
| Commit hygiene | 4 | 4 clean messages, proper scoping. -1 because commits 3+4+5 merged — but executor documented why in EXECUTION_REPORT §4. Acceptable. |
| Handling of deviations | 5 | All 4 deviations logged in EXECUTION_REPORT §3 + FINDINGS. None silently absorbed. |
| Documentation currency | 4 | EXECUTION_REPORT, FINDINGS, FINDINGS_TENANT, SESSION_CONTEXT, CHANGELOG — all touched per executor self-report. -1 pending my spot-check of MASTER_ROADMAP §3 (see §8). |
| FINDINGS.md discipline | 5 | 5 findings, each with severity + location + root cause + suggested action. Full discipline. |
| EXECUTION_REPORT honesty + specificity | 5 | §5 "What Would Have Helped Go Faster" is a model executor retrospective — names the environmental friction (no service_role, NTFS, POSIX regex) concretely, with actionable improvements. |

**Average score:** 4.7 / 5.

**Autonomy envelope followed correctly?** YES. Executor never stopped to ask per-commit approval; used the SPEC's approval as pre-approval for Level-2 writes. Stopped exactly where §5 stop-triggers demanded (slug count deviation, tenant scope deviation — both surfaced via FINDINGS rather than silently absorbed).

**Unnecessary questions asked:** 0.

**Silently-absorbed scope changes:** 0.

---

## 4. Findings Processing

| # | Finding summary | Disposition | Action |
|---|-----------------|-------------|--------|
| 1 | FINDING-001 Hebrew slug count 41→58 (prior audit under-sampled) | DISMISS | Criterion 8 passed on live enumeration; narrative-only discrepancy. Incorporated into SPEC Author proposal below. |
| 2 | FINDING-002 Instagram handle in 82 posts (prior audit counted 7) | NEW SPEC | Stub to be filed at `modules/Module 3 - Storefront/docs/specs/BLOG_INSTAGRAM_TEMPLATIZE/SPEC.md` — deferred, not a merge blocker. Rolls into Module 3 SaaS-ization work alongside M3-SAAS-14/15. |
| 3 | FINDING-003 Two-pass regex for `<a>` stripping | ABSORB (Executor Proposal 1) | Already captured in EXECUTION_REPORT §10 Proposal 1 — POSIX-ERE non-greedy gap. Will land in opticup-executor skill docs. |
| 4 | FINDING-004 Criteria 14/15/16 UNVERIFIED | DEFER to existing QA gate | Covered by `docs/QA_HANDOFF_2026-04-14.md`. No new artifact. |
| 5 | FINDING-005 4 permanently-lost WP images | TECH_DEBT | Add entry `M3-BLOG-05` to `TECH_DEBT.md` (or module CHANGELOG if no central debt file yet): "4 WP images (listed in FINDINGS.md) were permanently 404 at migration; posts render without them. If Prizma has originals, re-upload via Studio Media." |

**No finding orphaned.**

---

## 5. Spot-Check Verification

| Claim (from EXECUTION_REPORT) | Verified? | Method |
|-------------------------------|-----------|--------|
| "4 commits on develop: 678a82e → 4738191 → dd0fe6f → 3e92f7f" | ✅ | `git log --oneline 678a82e^..3e92f7f` — all 4 present with correct messages |
| "19 uploaded, 0 reused, 4 skipped_404, 23 unique WP URLs" | ✅ | Read `_image_migration_result.json` — counts match EXECUTION_REPORT §7; tenant_id = Prizma UUID `6ad0781b-...`; all URLs use `/api/image/media/<tenant>/blog/...` pattern |
| "Hebrew filenames sanitized to ASCII on upload" | ✅ | `_image_migration_result.json` entries show `rawFilename: "איך-לבחור-משקפיים-..."` → `sanitized: "ayk-lbhvr-mshkpyym-..."` — matches project memory `feedback_migration_lessons` ("no Hebrew in Storage paths") |

All 3 spot-checks pass. No verdict downgrade.

---

## 6. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal 1
- **Where:** `.claude/skills/opticup-strategic/SKILL.md` §"SPEC Authoring Protocol" → Step 1.5 Cross-Reference Check
- **Change:** Add a new sub-step: **"Re-enumerate any count cited by a prior audit before writing it into §7/§8 of a new SPEC."** Specifically: if the new SPEC is a FIXES SPEC that follows an AUDIT SPEC, every row-count, URL-count, or post-count borrowed from the audit must be re-queried against the live DB in Step 1.5 and the query + result logged alongside the Cross-Reference sweep entry.
- **Rationale:** In this SPEC, §7 said "7 posts" for tenant hardcoding (actual 82) and §8 said "41 slugs" (actual 58). Both came from the audit's sample queries without re-enumeration. Live-DB criteria saved the execution, but the narrative drift forced deviations and FINDINGS that shouldn't have existed. A 30-second re-query would have caught both.
- **Source:** FINDING-001, FINDING-002 + §2 "Expected final state accuracy" score = 3/5.

### Proposal 2
- **Where:** `.claude/skills/opticup-strategic/SKILL.md` §"SPEC Authoring Protocol" → Step 3 "Populate the Folder with SPEC.md"
- **Change:** When a success criterion involves a URL scheme or render pattern that has two valid forms in the codebase (e.g. `/api/image/` proxy vs. direct Supabase public URL), the SPEC MUST name ONE canonical form AND cite the file + line where that form is already in use. Do not leave the choice to the executor as "pick based on convention." Add this to the SPEC_TEMPLATE as a §3 checklist note.
- **Rationale:** Criterion 6 in this SPEC allowed either pattern; executor had to infer. In this case the inference was correct, but that's luck. Next time a SPEC ambiguously cites two patterns, the executor may pick one and the storefront may render the other → broken production.
- **Source:** §2 "Measurability of success criteria" score = 4/5; Criterion 6 wording.

---

## 7. Executor-Skill Improvement Proposals (opticup-executor)

### Proposal 1 (lifting from EXECUTION_REPORT §10 Proposal 1)
- **Where:** `.claude/skills/opticup-executor/SKILL.md` new §"Environment Quirks" subsection (or append to existing "Code Patterns")
- **Change:** Document the PostgreSQL POSIX-ERE non-greedy gap: when a `regexp_replace` needs `.*?` semantics (non-greedy match across HTML that may contain nested tags), use the two-pass pattern `([^<]|<[^/]|</[^a])*` rather than attempting `.*?` (unsupported). Provide the exact pattern used in this SPEC's `<a href>` stripping as the canonical reference.
- **Rationale:** This cost one extra DB round-trip in this SPEC and was not previously documented. Future content-rewrite SPECs will hit the same wall.
- **Source:** EXECUTION_REPORT §10 Proposal 1 + FINDING-003.

### Proposal 2 (lifting from EXECUTION_REPORT §10 Proposal 2)
- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"Autonomy Playbook" or new §"Environment Quirks"
- **Change:** Document two recurring Cowork/NTFS-mount quirks: (a) git index lock files cannot be deleted via `os.remove()`/`os.unlink()` on NTFS-mounted repos but CAN be moved via `os.rename()` within the same directory; (b) `GIT_INDEX_FILE=/tmp/git_index_tmp` env var bypasses a corrupted index.lock for read operations. Include the exact workaround recipes.
- **Rationale:** Executor self-reports ~15 minutes lost on the first encounter. Documenting it brings subsequent encounters to 30 seconds.
- **Source:** EXECUTION_REPORT §10 Proposal 2.

---

## 8. Master-Doc Update Checklist

| Doc | Should have been updated? | Was it? | If not, follow-up |
|-----|--------------------------|---------|-------------------|
| `MASTER_ROADMAP.md` §3 Current State | YES — this closes a pre-merge blocker | **VERIFY** — not confirmed in EXECUTION_REPORT §2. Foreman must check before sign-off. | If NO → add one line under Module 3 current state: "Blog pre-merge content cleanup ✅ (SPEC BLOG_PRE_MERGE_FIXES, commits 678a82e→3e92f7f)". |
| `docs/GLOBAL_MAP.md` | NO | N/A | No new functions/contracts (data-only). |
| `docs/GLOBAL_SCHEMA.sql` | NO | N/A | No DDL. |
| Module's `SESSION_CONTEXT.md` | YES | YES per EXECUTION_REPORT §2 commit 4 | — |
| Module's `CHANGELOG.md` | YES | YES per EXECUTION_REPORT §2 commit 4 | — |
| Module's `MODULE_MAP.md` | NO | N/A | No code-level map changes. |
| Module's `MODULE_SPEC.md` | NO | N/A | Business logic unchanged. |
| `TECH_DEBT.md` (or module equivalent) | YES | **VERIFY** | Finding #5 (4 lost images) needs a TECH_DEBT row. |
| `docs/guardian/GUARDIAN_ALERTS.md` | Only if any alert was blocked on this fix | Not applicable — no active alert was specifically blog-content-related | — |

**Pending Foreman-side verification:** MASTER_ROADMAP §3 line; TECH_DEBT entry for 4 lost images. Both are trivial surgical edits; Main Strategic Chat can do them in <2 minutes. Capping the verdict at 🟡 until those land is consistent with the Hard-Fail rule and the usual Integration Ceremony discipline.

---

## 9. Daniel-Facing Summary (Hebrew, 3 sentences max)

> הבלוג נקי לפני ה-merge: 19 תמונות עברו מ-WordPress ל-Studio Media (תיקיה "בלוג"), 132 כתבות נכתבו מחדש עם URLs חדשים, כתבת הדקדוק נמחקה באנגלית ורוסית, ו-58 slugs תועתקו. **3 בדיקות נותרו** — ריצת build + פתיחת דפי הבלוג בדפדפן על localhost — הן חלק מה-QA הקבוע שכבר מתוזמן. **מעקב פתוח:** 82 כתבות שמקשרות ל-Instagram של "optic_prizma" נשאר לתקן ב-SPEC נפרד אחרי ה-merge (לא חוסם).

---

## 10. Followups Opened

- **`modules/Module 3 - Storefront/docs/specs/BLOG_INSTAGRAM_TEMPLATIZE/`** — new SPEC stub, deferred. Source: Finding #2.
- **`TECH_DEBT.md` entry `M3-BLOG-05`** — 4 permanently-lost WP images. Source: Finding #5.
- **`MASTER_ROADMAP.md` §3** — one-line update reflecting blog pre-merge cleanup done. Source: §8.
- **Localhost QA (Criteria 14/15/16)** — to be run by Daniel per `docs/QA_HANDOFF_2026-04-14.md`. Source: Finding #4.
- **opticup-executor skill edits** (Proposals §7.1 + §7.2) — to be applied on next opticup-executor session.
- **opticup-strategic skill edits** (Proposals §6.1 + §6.2) — to be applied on next opticup-strategic session.

---

*End of FOREMAN_REVIEW. SPEC BLOG_PRE_MERGE_FIXES is 🟡 CLOSED WITH FOLLOW-UPS.*
