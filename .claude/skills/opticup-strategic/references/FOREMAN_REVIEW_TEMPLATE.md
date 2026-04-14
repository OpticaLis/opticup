# FOREMAN_REVIEW — {SPEC_SLUG}

> **Location:** `modules/Module X - [Name]/docs/specs/{SPEC_SLUG}/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman)
> **Written on:** YYYY-MM-DD
> **Reviews:** `SPEC.md` (author: {X}, date {Y}) + `EXECUTION_REPORT.md` (executor: {Z}) + `FINDINGS.md` (if present)
> **Commit range reviewed:** `{START_HASH}..{END_HASH}`

---

## 1. Verdict

Pick ONE:
- 🟢 **CLOSED** — SPEC fully delivered, no follow-ups.
- 🟡 **CLOSED WITH FOLLOW-UPS** — delivered but findings queued for separate work.
- 🔴 **REOPEN** — executor work must be redone. Name the gap. (Rare — use sparingly.)

**HARD-FAIL RULES (cap the verdict at 🟡 or worse — never 🟢):**

- If §8 Master-Doc Update Checklist has ANY row marked "should have been
  updated = YES" but "was it updated = NO" → max verdict is **🟡**. Documentation
  drift is a follow-up, period. Do not rationalize it away.
- If §5 Spot-Check Verification has ANY failed spot check → verdict is **🔴 REOPEN**.
  A claim in EXECUTION_REPORT that doesn't match the repo/DB is not a small thing.
- If §4 Findings Processing has ANY finding without a disposition → review is
  incomplete. Do not set a verdict until every finding has a disposition.
- If §3 Execution Quality Audit scored below 3/5 on "Adherence to SPEC scope" or
  "Adherence to Iron Rules" → max verdict is **🟡**, with explicit follow-up.

One-sentence justification.

---

## 2. SPEC Quality Audit

Rate the SPEC itself. This is self-review for the Foreman role.

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Goal clarity | | |
| Measurability of success criteria | | |
| Completeness of autonomy envelope | | |
| Stop-trigger specificity | | |
| Rollback plan realism | | |
| Expected final state accuracy | | |
| Commit plan usefulness | | |

**Average score:** {X}/5.

**Weakest dimension + why:** {which one scored lowest, specifically why}

**If score < 4 in any dimension:** include the corresponding fix in §6
("Author-skill improvement proposals") below.

---

## 3. Execution Quality Audit

Rate the executor's run against the SPEC.

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Adherence to SPEC scope | | |
| Adherence to Iron Rules | | |
| Commit hygiene (one-concern, proper messages) | | |
| Handling of deviations (stopped when required) | | |
| Documentation currency (MODULE_MAP, MASTER_ROADMAP, etc.) | | |
| FINDINGS.md discipline (logged vs absorbed) | | |
| EXECUTION_REPORT.md honesty + specificity | | |

**Average score:** {X}/5.

**Did executor follow the autonomy envelope correctly?** YES / NO + details.

**Did executor ask unnecessary questions?** Count and list. Zero is the goal.

**Did executor silently absorb any scope changes?** If yes — that's a finding
against execution quality. Name them.

---

## 4. Findings Processing

For each entry in `FINDINGS.md`, decide disposition:

| # | Finding summary | Disposition | Action taken |
|---|-----------------|-------------|--------------|
| 1 | {e.g. M1-R09-02 hardcoded domain} | NEW SPEC | Filed `M1_R09_02_GOOGLE_URL_HARDCODED/` stub |
| 2 | {e.g. sync-watcher.js > 350 lines} | TECH_DEBT | Added to `TECH_DEBT.md` as M5-DEBT-05 |
| 3 | {e.g. minor whitespace issue} | DISMISS | Reason: cosmetic, below threshold |

**Zero findings left orphaned.** If a finding has no disposition here, this
review is not done.

---

## 5. Spot-Check Verification

Pick 3 of the executor's largest claims and verify against the repo/DB.

| Claim (from EXECUTION_REPORT) | Verified? | Method |
|-------------------------------|-----------|--------|
| "Added chokidar@^3.6.0 to package.json" | ✅ | `grep chokidar package.json` |
| "Prizma brand count unchanged: 232" | ✅ | Supabase MCP query |
| "BrandsBlock.astro now routes through image proxy" | ✅ | `grep resolveStorageUrl BrandsBlock.astro` |

If any spot-check fails → verdict is 🔴 REOPEN.

---

## 6. Author-Skill Improvement Proposals (opticup-strategic)

Exactly 2 concrete proposals. Each must name a section/file and specify
the exact change. Generic advice is invalid.

### Proposal 1
- **Where:** `.claude/skills/opticup-strategic/SKILL.md` §{section}
- **Change:** {exact edit}
- **Rationale:** {specific failure in this SPEC that this prevents}
- **Source:** {EXECUTION_REPORT §X or FINDINGS #Y}

### Proposal 2
- **Where:** {file + section}
- **Change:** {exact edit}
- **Rationale:** ...
- **Source:** ...

---

## 7. Executor-Skill Improvement Proposals (opticup-executor)

Exactly 2 concrete proposals, same format.

### Proposal 1
- **Where:** `.claude/skills/opticup-executor/SKILL.md` §{section}
- **Change:** {exact edit}
- **Rationale:** ...
- **Source:** ...

### Proposal 2
- **Where:** ...
- **Change:** ...
- **Rationale:** ...
- **Source:** ...

---

## 8. Master-Doc Update Checklist

| Doc | Should have been updated? | Was it? | If not, follow-up needed |
|-----|--------------------------|---------|-------------------------|
| `MASTER_ROADMAP.md` §3 Current State | | | |
| `docs/GLOBAL_MAP.md` | | | |
| `docs/GLOBAL_SCHEMA.sql` | | | |
| Module's `SESSION_CONTEXT.md` | | | |
| Module's `CHANGELOG.md` | | | |
| Module's `MODULE_MAP.md` | | | |
| Module's `MODULE_SPEC.md` | | | |

If any row says "should have been" but "wasn't" — add to §4 Findings Processing
as a new TECH_DEBT entry (documentation drift) AND cap the verdict at 🟡 per
the Hard-Fail Rules in §1. No 🟢 verdict is permitted while documentation is
out of date. This is the mechanism that prevents silent drift across 20 modules.

---

## 9. Daniel-Facing Summary (Hebrew, 3 sentences max)

For the Main Strategic Chat to paraphrase to Daniel:

> {Hebrew summary — one line on what shipped, one line on findings, one line on verdict}

---

## 10. Followups Opened

List every new artifact created because of this review:
- `{SPEC stub path}` — for finding #1
- `TECH_DEBT.md` entry {code} — for finding #2

Link each followup back to the finding number above.
