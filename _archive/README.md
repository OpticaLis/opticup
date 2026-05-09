# `_archive/` — Repository Archive

> **Purpose:** Single archive vault for the entire opticup repo. Files here are preserved for historical reference but are NOT actively maintained.

## Structure

- `root-onboarding/` — legacy onboarding docs and chat prompts that were superseded by `.claude/skills/`
- `project-genesis/` — March 2026 era files (old `archive/`, `data/`, `---QA---/`)
- `launch-plan-versions/` — historical MASTER_LIVE_PLAN versions (current truth: `/MASTER_ROADMAP.md`)
- `session-outputs/` — historical session prompts/handoffs from `outputs/`

## How to add to archive

Per CLAUDE.md §0.5 (Root Discipline Rule), any file leaving root or any other actively maintained location → move here under the appropriate subfolder. Add a brief note in this README if a new subfolder is created.

## How to recover

Files here are git-tracked. Use `git log --follow <path>` to see history; `git show <hash>:<path>` to view a specific version.
