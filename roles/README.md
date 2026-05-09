# `roles/` — Operational Role Artifacts

> **Purpose:** Active operational roles that are NOT modules. Each subfolder = one role with its own handoff, decisions log, learnings, and skill notes.

## Roles

- `campaign-overseer/` — Campaign Overseer (active campaigns + decisions log)
- `site-overseer/` — Marketing/info site Overseer (site map, content drift)

These roles parallel the Module Strategist + Executor roles for development modules, but they own operational surfaces (campaigns, the public site) rather than building modules.

## How to add a new role

1. Create `roles/<role-name>/` with `HANDOFF.md`, `DECISIONS_LOG.md`, `LEARNINGS.md`.
2. Add a skill in `.claude/skills/opticup-<role-name>/` if the role has session-startup automation.
3. Document in this README.
