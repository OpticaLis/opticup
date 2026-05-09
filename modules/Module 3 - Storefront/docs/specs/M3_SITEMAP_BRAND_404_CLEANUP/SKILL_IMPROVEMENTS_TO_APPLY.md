# Skill Improvements To Apply — accumulated from recent FOREMAN_REVIEWs

> **Created:** 2026-05-09 by opticup-strategic (Cowork session)
> **Purpose:** Cowork can't write to `.claude/skills/` (read-only protected location). This file batches all pending skill-improvement edits so Claude Code on Windows can apply them in one commit.
> **Activation:** Hand this file to opticup-executor with the prompt at the bottom.

---

## Source FOREMAN_REVIEWs

1. `M3_STUDIO_TRANSLATIONS_BRAND_FILTER/FOREMAN_REVIEW.md` (2026-05-09) — proposals A1, A2, Executor 1, Executor 2 (A1 already applied in next SPEC's authoring; A2 + executor 1+2 still open)
2. `M3_SITEMAP_BRAND_404_CLEANUP/FOREMAN_REVIEW.md` (2026-05-09) — proposals A1, A2, Executor 1, Executor 2 (all 4 still open)

---

## Edit 1 — opticup-strategic SPEC_TEMPLATE §7 — add "Subset relationships" sub-section

**File:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md`

**Find:**
```
## 7. Out of Scope (explicit)

Things that look related but MUST NOT be touched in this SPEC:
- [file or module]
- [feature or behavior]

---
```

**Replace with:**
```
## 7. Out of Scope (explicit)

Things that look related but MUST NOT be touched in this SPEC:
- [file or module]
- [feature or behavior]

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

(Source: improvement A1 from M3_SITEMAP_BRAND_404_CLEANUP FOREMAN_REVIEW, 2026-05-09.)

---
```

---

## Edit 2 — opticup-strategic SPEC_TEMPLATE §8 — add "Build-side-effect file expectations" sub-section

**File:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md`

**Find:**
```
### DB state
- Table `X` has columns {Y, Z} with expected seed data

### Docs updated (MUST include)
```

**Replace with:**
```
### DB state
- Table `X` has columns {Y, Z} with expected seed data

### Build-side-effect file expectations

If the SPEC's commands include any build/codegen step (`npm run build`,
`npm run generate`, etc.), explicitly state which files those commands
are expected to regenerate, and whether they should be committed or
restored:

- **Tightly-coupled side-effects** (the SPEC's intent regenerates the file): list here, executor includes in commit.
- **Unrelated build drift** (file regenerates on every build but isn't this SPEC's concern): list here as "executor MUST `git checkout <file>` before staging; log as finding if drift is new".
- **Unknown** (don't know if build touches anything): say so; default rule is restore + log as finding.

Example line for unrelated drift:
> "NOT touched: `src/data/tenant-fallback-map.json` — regenerates on every `npm run build`, restore before commit; pre-existing drift logged as TECH_DEBT M3-DEBT-12."

This prevents the executor from either (a) accidentally polluting the
commit with unrelated drift, or (b) wasting time deciding whether to
restore vs include without authorial guidance.

(Source: improvement A2 from M3_SITEMAP_BRAND_404_CLEANUP FOREMAN_REVIEW, 2026-05-09.)

### Docs updated (MUST include)
```

---

## Edit 3 — opticup-strategic SPEC_TEMPLATE §10 (Pre-Merge Checklist) — add "Browser readiness pre-flight"

**File:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md`

**Find:** the start of §10 Pre-Merge Checklist (or §QA Steps if that section exists). If neither exists in the template, **add the following BEFORE §11 Lessons Already Incorporated:**

```
### Browser readiness pre-flight (executor instructs at start)

If any QA step in this SPEC names a browser action — "open localhost", "click", "console", "browser", "DOM" — the executor MUST confirm at the start of execution that Chrome is running with `--remote-debugging-port=9222`. If not, surface it in the readiness sentence BEFORE editing any file: "Browser-QA required by SPEC §X.Y but Chrome debug-port not detected — please start Chrome with `--remote-debugging-port=9222` before I proceed past commit."

This converts a mid-execution surprise into a session-start clarification.

If the SPEC's verification is purely SQL/HTTP/script-based and no browser action is needed, state it explicitly: "Pre-flight (executor): SPEC's QA is HTTP-level (curl) + script-based — no browser required. Skip Chrome readiness check."

(Source: improvement A2 from M3_STUDIO_TRANSLATIONS_BRAND_FILTER FOREMAN_REVIEW, 2026-05-09. Symmetric to opticup-executor improvement #1 from same review.)
```

---

## Edit 4 — opticup-executor SKILL.md — add "§7-vs-§4 tie-breaker rule"

**File:** `.claude/skills/opticup-executor/SKILL.md`

**Locate:** Step 1 of the SPEC Execution Protocol ("Load and validate the SPEC"), or add a new Step 1.5 immediately after.

**Add this sub-section:**

```
### Step 1.5 — Cross-section tension resolution

When two SPEC sections appear to conflict (e.g. a stop-trigger in §4 vs an explicit out-of-scope decision in §7), apply this tie-breaker:

- **The section that explicitly resolves the question wins** over the section that flags it as a generic risk.
- The out-of-scope decision (§7) is the SPEC author's stated intent; the stop-trigger (§4) is a guardrail. Read both, identify which is intent and which is guardrail, and document the resolution in EXECUTION_REPORT §4.
- **Special case for subset relationships:** if §7 names a subset relationship explicitly (per the SPEC_TEMPLATE convention), the SPEC predicate intentionally emits fewer items than a related consumer accepts. SQL pre-flight should confirm the predicate is a STRICT subset (i.e. `spec_emits_but_404s = 0`) before proceeding. Strict-subset under-emit is safe; superset over-emit is the case the §4 stop-trigger is designed for.
- **If the conflict is genuine** (both are intent statements with no clear hierarchy), STOP and ask Daniel.

(Source: improvement #1 from M3_SITEMAP_BRAND_404_CLEANUP FOREMAN_REVIEW, 2026-05-09.)
```

---

## Edit 5 — opticup-executor SKILL.md — add "Browser-QA readiness pre-flight"

**File:** `.claude/skills/opticup-executor/SKILL.md`

**Locate:** The "First Action — Every Execution Session" section, after the existing pre-flight steps (CLAUDE.md read, integrity gate run, etc.).

**Add this sub-step (e.g. as 4b):**

```
### 4b. Browser-QA readiness check

Before editing any file, scan the SPEC's `§10 QA Steps` and `§3 Success Criteria` for keywords: "open localhost", "browser", "console", "click", "DOM", "Chrome".

- **If present and Chrome not running with `--remote-debugging-port=9222`:** include this in the readiness sentence: "Browser-QA required by SPEC §X.Y but Chrome debug-port not detected — please start Chrome with `--remote-debugging-port=9222` before I proceed past commit." Continue the SPEC up to commit, then surface the readiness gap before post-deploy verification.
- **If present and Chrome IS running with debug port:** confirm in the readiness sentence: "Chrome debug-port detected; browser QA enabled."
- **If absent (HTTP/SQL/script-based QA only):** state in the readiness sentence: "SPEC's QA is non-browser; Chrome readiness check skipped."

This converts a mid-execution surprise into a session-start clarification.

(Source: improvement #1 from M3_STUDIO_TRANSLATIONS_BRAND_FILTER FOREMAN_REVIEW, 2026-05-09. Symmetric to opticup-strategic improvement A2 in SPEC_TEMPLATE §10.)
```

---

## Edit 6 — opticup-executor SKILL.md — add "Build-side-effect file restoration"

**File:** `.claude/skills/opticup-executor/SKILL.md`

**Locate:** The "Code Patterns" section → "Git discipline" sub-section (where `git add -A` is forbidden). If no such section exists, add it as a new sub-section in the most appropriate location (likely near the commit-hygiene rules).

**Add this rule:**

```
### Build-side-effect file restoration

After running build/codegen scripts (e.g. `npm run build`, generators, type emitters), run `git status --short` and identify side-effect files. Apply the following decision:

1. **Are they listed in SPEC §8 as expected regeneration?** → Include in commit.
2. **Are they unrelated to the SPEC's scope?** → `git checkout <file>` to restore BEFORE staging. Log as finding (TECH_DEBT) so the drift is visible without expanding the SPEC's scope.
3. **Unknown:** default to restore + log as finding. Never commit unintended side-effect drift just because the build produced it.

The SPEC author SHOULD pre-declare expected side-effects per the SPEC_TEMPLATE §8 "Build-side-effect file expectations" sub-section. If they didn't, the default rules above apply.

(Source: improvement #2 from M3_SITEMAP_BRAND_404_CLEANUP FOREMAN_REVIEW, 2026-05-09. Symmetric to opticup-strategic improvement A2 in SPEC_TEMPLATE §8.)
```

---

## Activation Prompt for Claude Code

Paste into Claude Code on Windows desktop:

```
טען את skill opticup-executor.

המשימה: החל 6 עדכוני סקיל מצטברים מ-3 סשנים אחרונים. הקובץ:
modules/Module 3 - Storefront/docs/specs/M3_SITEMAP_BRAND_404_CLEANUP/SKILL_IMPROVEMENTS_TO_APPLY.md

מכיל 6 edits:
- 3 לקובץ .claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md
- 3 לקובץ .claude/skills/opticup-executor/SKILL.md

לכל edit יש Find/Replace מדויק. החל את כל ה-6, אמת שהקבצים שמורים, ואז commit אחד:
chore(skills): apply 6 improvements from M3_SITEMAP_BRAND_404_CLEANUP + M3_STUDIO_TRANSLATIONS_BRAND_FILTER FOREMAN_REVIEWs

push לdevelop. אין צורך לפתוח PR ל-main (סקילים אינם משפיעים על production).

בסוף תאר אילו 6 השינויים בוצעו בפועל + שורת hash של ה-commit.
```
