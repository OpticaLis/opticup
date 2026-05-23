# Root-Cause Diagnosis — Why Clean-Repo §9 Keeps Failing

> **Author:** opticup-strategic · **Date:** 2026-05-23
> **Trigger:** dirty-tree incident referenced by `REPO_CLEANUP_MERGE_ENFORCEMENT_BRIEF.md`. Brief asserted 2,627 uncommitted files; current actual = **46 untracked** (the earlier session's `commit -a` swept ~2,000+ tracked-modified files including `.claude/skills/**` into the VISUAL_FIDELITY_GATE close — the very `-a` discipline breach we now want to prevent). The remaining 46 are pure untracked drops that the existing §9 rule never caught.

---

## 1. Categorization of the current 46 untracked paths (exact counts)

| Category | Count | Examples | Real work? |
|---|---:|---|---|
| **Architecture briefs + activation prompts** (Cowork-authored drops) | **30 files** across 3 modules | `M5_UI_CUSTOMER_LIST_BRIEF.md` (+ ACTIVATION_PROMPT), `VISUAL_FIDELITY_GATE_BRIEF.md`, `M4_CRM_FULL_AUDIT_BRIEF_2026_05_21.md`, etc. | **YES** — historical record of SPEC inputs |
| **Roles + campaigns artifacts** (events-ops + regopen) | **9 paths** | `roles/campaign-overseer/briefs/2026-05-21_*.md` (6 files), `_events_ops_skill_review/` dir, `campaigns/supersale/CAMPAIGN_DECISIONS_LOG.md`, `campaigns/supersale/sketches/` dir | **YES** — operational work artifacts |
| **Paired preview/handoff** | **2 files** | `regopen_email_preview.html` (paired with regopen brief), `DESKTOP_ACTIVATION_PROMPT.md` | **YES** — keep |
| **Throwaway tmp scripts** (explicit `tmp-` prefix) | **7 files** | `scripts/tmp-build-launch-v2-json.mjs` (+v3, +v4), `scripts/tmp-extract-launch-json.mjs`, `scripts/tmp-{fashion,luxury}-reading.json`, `scripts/tmp-mint-prizma-jwt.mjs` | **NO** — junk |
| **One-off PR draft** | **1 file** | `.pr-body.md` (M4 prior-PR body draft) | **NO** — junk |
| **Server log** | **1 file** | `dev-server.log` (4 lines) | **NO** — should be gitignored |

**Total:** 41 real-work files + 9 junk/log files = 46.

## 2. Why the existing §9 "Clean Repo at Session End" rule failed to prevent this

CLAUDE.md §9 #6 ("Clean Repo at Session End (mandatory)") + memory `feedback_clean_repo_in_specs` already exist. The rule says: "Every session that touches files MUST end with a clean working tree. No exceptions." And yet the pile accumulated. Four reasons:

### Reason 1 — Orphan-by-design: architecture briefs are inbound artifacts, not output of any session

Cowork (the Architect VM) writes briefs + activation prompts into `modules/Module N/architecture-brief/*.md` BEFORE any Claude Code session runs. When the Claude Code session opens to AUTHOR the SPEC, those briefs are already there — they are INPUT to the session, not outputs. The session's mental model:

- "I'm here to write the SPEC + execute the SPEC. The brief is the spec for THIS session. The brief itself is the Architect's commit, not mine to commit."

But Cowork doesn't commit either — it leaves them as untracked drops for the Foreman session to pick up. **Each side assumes the other owns the commit.** Neither does. 30 of the 46 untracked paths are this exact class.

### Reason 2 — Text-only enforcement (no hook)

Iron Rule 14 (tenant_id), Iron Rule 15 (RLS), Iron Rule 18 (UNIQUE), Iron Rule 31 (integrity), Iron Rule 32 (destructive ops) — all have pre-commit hooks in `scripts/checks/` that HARD FAIL the commit. They cannot be silently violated.

§9 #6 (clean repo) has NO hook. It's prose. A session that ends with a dirty tree experiences zero friction. The next session opens and the rule is invisible (just a §9 text in CLAUDE.md). Friction is what makes a rule stick; the rule has no friction.

### Reason 3 — No category-specific exemption / no signal-vs-noise discrimination

A real "session leftover" (a 50-file untracked block from work-in-progress) and a real "Cowork brief drop" (1-2 .md files in `architecture-brief/`) look identical to `git status --porcelain`. A session that sees "1-2 untracked .md files" tends to ignore them as someone-else's-business; a session that sees "50 files" panics. There's no automated category-aware response.

### Reason 4 — The most recent dirty close used `git commit -a`, which masked the problem

The VISUAL_FIDELITY_GATE close commit (`eb12a0d`) used `git commit -a`, sweeping in 7 unintended pre-existing dirty files (Guardian Alerts, decision logs, Module 9 db-schema). That violated CLAUDE.md §9 #6 (`never -a`). The Foreman flagged it in the commit message — but the breach happened. **The breach itself is the same class as the broader clean-repo failure**: when the rule is text-only, the easy-but-wrong path (sweep with `-a`) wins under time pressure.

## 3. Which enforcement layer was MISSING

Pattern P31 (defense in depth) says: text-rule → session-start reminder → automated hook → periodic detection. We have layers 1 and 2 (text-rule + session-start reminder in CLAUDE.md First Action §4). We are MISSING:

- **The automated hook** (Layer 3 of P31) — a pre-commit / pre-session-end check that FAILS on a dirty tree above N untracked files, same regime as Iron Rule 31's integrity gate (no `--no-verify` bypass).
- **The periodic detection** (Layer 4 of P31) — a Sentinel mission that scans for accumulating dirty trees and alerts in `GUARDIAN_ALERTS.md`.

Both are now being added by the REPO_CLEANUP_MERGE_ENFORCEMENT SPEC.

## 4. The specific orphan-class problem: `.claude/skills/**` edits + briefs

The pile in this Brief's premise (2,627 files) was overwhelmingly `.claude/skills/**` modifications from parallel sessions that:
- Each session's First Action §4 sees the skill edits as "pre-existing dirty WIP" → user says "leave them alone" → session ends → next session sees the same dirty WIP → cycle repeats.
- No SPEC declares "I own the skill edits I just made" — skill edits are an orphan output of every SPEC's improvement-proposal-application loop.

**Fix:** every session that EDITS `.claude/skills/**` MUST commit those edits IN THE SAME COMMIT CYCLE as the rest of its work. Document this in the relevant skills' closure checklists (opticup-strategic Foreman closure checklist, opticup-executor closure checklist, opticup-reviewer closure checklist).

## 5. The recurring-failure recipe (so we recognize it next time)

When a rule keeps being violated, look for:
1. **Orphan-by-design** — the artifact's owner is ambiguous between two roles.
2. **Text-only enforcement** — no hook fails when the rule breaks.
3. **No signal-vs-noise** — the tooling can't distinguish "real" from "Cowork drop" from "tmp-junk".
4. **Convenient easy-wrong path** — `git commit -a` is one keystroke; selective add is dozens.

All four were present here. The 3-layer enforcement (Layer 1 hook + Layer 2 Sentinel + Layer 3 bootstrap) closes the first three; Layer 1 also makes `-a` discipline self-enforcing because the gate runs at commit time and surfaces unintended files.
