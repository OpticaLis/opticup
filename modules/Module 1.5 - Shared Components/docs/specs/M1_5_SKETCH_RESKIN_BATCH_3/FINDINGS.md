# FINDINGS — M1_5_SKETCH_RESKIN_BATCH_3

Observations harvested during execution that are not the goal of the SPEC but are worth surfacing. Each item has a disposition (`NEW SPEC` / `TECH_DEBT` / `DISMISS`) which the Foreman accepts or revises in `FOREMAN_REVIEW.md`.

## Finding #1 — M12 mockups never used the legacy purple palette

**Severity:** Medium (revealed a SPEC-author assumption error; required in-flight script extension)
**Discovered:** During M12 transformation pass

**What:** All 4 M12 files (`M12_CHANNEL_CONFIGS`, `M12_CUSTOMER_HISTORY`, `M12_TEMPLATES`, `M12_WHATSAPP_INBOX`) were authored against a different palette than the Brief assumed:

- M5 / M6 / M8 / M11 / M14 / M15 (13 files) use the legacy purple-deep palette (`--purple`, `--purple-deep`, etc.)
- M12 (4 files) use a channel-themed semantic palette: `--whatsapp #25d366`, `--sms #6c8ebf`, `--email #b85450`, plus neutrals `--bg #f5f6f8`, `--text #111b21`, `--border #e5e7eb`, plus a decorative `--gold #c9a555`.

**Why it matters:** The Brief's transformation map (§2.1–§2.4) is purple-palette-specific. Applied mechanically to M12 it would have erased the channel semantic colors — which Brief §2.4 explicitly says to PRESERVE. The script aborted on file 1 (no `:root{` block — M12 uses `:root {` with space), which forced the inspection.

**Disposition:** **DISMISS** for further SPEC work — handled correctly in-flight. M12 received a "light" re-skin (neutrals realigned to Hybrid+Navy, channel semantics preserved). The right architectural call.

**Foreman-author improvement proposal #1 (rolled into FOREMAN_REVIEW.md):** Pre-SPEC palette audit when batching visual files — see FOREMAN_REVIEW §5.

## Finding #2 — `:root` block whitespace variation across mockup files

**Severity:** Low (script-level concern, not a content concern)
**Discovered:** When script regex `:root{` missed M12 files

**What:** Older legacy mockups (M5/M6/M8/M11/M14/M15) use `:root{` (no space). Newer mockups (M12, authored later, possibly with a different style guide / authoring tool / author) use `:root {` (space before `{`).

**Why it matters:** Anchor-string brittleness in batch scripts. The fix was trivial (regex `:root\s*\{`), but a different SPEC could have shipped broken if the verification step were less rigorous.

**Disposition:** **DISMISS** — already fixed in `reskin.mjs`. The script is retained as a SPEC artifact, so future re-skin batches inherit the resilient regex.

## Finding #3 — Mockup files exceed Iron Rule 12's 350-line target

**Severity:** Low (already-known per CLAUDE.md §6 Rule 12 + Brief §10 exception)
**Discovered:** Line count audit

**What:** 16 of 17 files exceed 350 lines after re-skin. Largest: `M12_WHATSAPP_INBOX_MOCKUP.html` at 1,084 lines. The Brief §10 explicitly accepts this exception for "standalone visual deliverables."

**Why it matters:** The 350-line rule is for production code that benefits from modularization. Mockups are single-file visual artifacts where splitting fights the purpose.

**Disposition:** **DISMISS** — Brief §10 carves out the exception.

## Finding #4 — Pre-existing dirty baseline at repo root has 18+ untracked items

**Severity:** Low (not introduced by this SPEC; pre-dates session start)
**Discovered:** First Action step 4 (clean-repo check)

**What:** At session start `git status` showed:
- `M TECH_DEBT.md` (uncommitted mod from prior session)
- Multiple untracked Brief / activation prompt MDs in M1.5 architecture-brief/ and M7 architecture-brief/
- Multiple untracked FOREMAN_REVIEW.md / SKILL_IMPROVEMENTS_TO_APPLY.md files in M3 specs/
- M3_BRAND_CATALOG_MOBILE_2COL/ untracked folder
- `tests/optic.accdr`, `tests/optic_dt.accdb`, `tests/optic_dt_all.accdb` (Access test DB binaries)
- M7 EXECUTION_REPORT.md + FINDINGS.md still untracked

**Why it matters:** Multiple sessions have been adding new files at the same paths without committing them. Some (Briefs, accdb files) appear to be intentional WIP; others (FOREMAN_REVIEW.md files) look like prior sessions that ended without `git add`.

**Disposition:** **NEW SPEC candidate** — title would be `REPO_BASELINE_HYGIENE_2026_05_11` — a 15-minute cleanup to triage each untracked path, either commit-or-archive-or-add-to-`.gitignore`. NOT executed in this SPEC because (a) out of scope for a sketch-reskin, and (b) the activation prompt explicitly told the Pipeline to leave them alone.

**Recommendation to Architect:** schedule before next major Pipeline run, to prevent another "20 untracked files" baseline accumulating.

## Finding #5 — DECISIONS_LOG.md lives in `.claude/skills/opticup-architect/references/`, not at `references/` repo root

**Severity:** Trivial (documentation discoverability)
**Discovered:** When updating cross-module entry

**What:** The activation prompt referenced "`DECISIONS_LOG index update`" without specifying a path. CLAUDE.md §7 Authority Matrix does not list DECISIONS_LOG either. The file lives nested at `.claude/skills/opticup-architect/references/DECISIONS_LOG.md`.

**Why it matters:** A new session bootstrapping the Architect skill needs to know where this lives. The architect SKILL.md probably references the relative path, but a future session opening on docs/ won't find it.

**Disposition:** **DISMISS** with optional follow-up — could add a row to CLAUDE.md §7 Authority Matrix linking to it. Low priority, deferred to next minor CLAUDE.md sweep.

## Finding #6 — No pre-flight cross-check that all 17 files actually existed at the SPEC paths

**Severity:** Low (worked out fine this time)
**Discovered:** During SPEC pre-flight (was actually done correctly)

**What:** The SPEC §2 lists 17 files. Before authoring the SPEC, I globbed all 17 and confirmed they exist. But the SPEC.md doesn't memorialize that check. A future reader can't verify the SPEC was grounded in reality.

**Disposition:** **NEW SPEC PATTERN** — author improvement proposal #2 (FOREMAN_REVIEW §5). Should add a SPEC.md §"Pre-Authoring Reality Check" line: `Globbed N files at the listed paths on YYYY-MM-DD; all N present.`

---

*End of FINDINGS.*
