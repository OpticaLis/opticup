# PENDING_ENTRIES_AUTO_RESOLUTION — Activation Prompt

Paste the block below into a fresh Claude Code chat to run the Full-Auto Pipeline end-to-end.

---

```
Run the Full-Auto Pipeline for PENDING_ENTRIES_AUTO_RESOLUTION.

Brief: modules/Module 1.5 - Shared Components/architecture-brief/PENDING_ENTRIES_AUTO_RESOLUTION_BRIEF.md

Load opticup-strategic (Foreman) first to author the SPEC at:
modules/Module 1.5 - Shared Components/docs/specs/PENDING_ENTRIES_AUTO_RESOLUTION/SPEC.md

Then chain to opticup-executor, opticup-reviewer, opticup-localhost-tester, and back to opticup-strategic (Foreman closure with FOREMAN_REVIEW.md + 4 skill improvement proposals + apply the 4 queued from STOREFRONT_PUBLIC_DATA_LAYER if relevant).

Key constraints from the Brief:
- 3 layers: Executor protocol (SKILL.md update) + pre-commit advisory check + Sentinel Mission 10 extension.
- Pre-commit check is ADVISORY (exit 2 warning), NOT blocking (exit 1).
- Sentinel thresholds: 1 file > 48h = MEDIUM, 2+ files = HIGH.
- Apply the existing pending file (_archive/architect-pending-entries/2026-05-15_STOREFRONT_PUBLIC_DATA_LAYER.md) as part of THIS SPEC — its content goes to .claude/skills/opticup-architect/references/DECISIONS_LOG.md as entry #32 above entry #28.
- Iron Rule 32: Destructive Operations declared = 1 (delete the pending file after content merged).
- Stop trigger: if more than 1 pending file exists at SPEC start, halt and escalate.
- All commits on develop. Working tree clean at close.

Smoke 7/7 must remain GREEN. Iron Rule 31 integrity gate must pass.

When done, surface a Hebrew one-line status to Daniel.
```

---

*End of Activation Prompt. The Brief contains the full Locked Decisions (D1-D5), Success Criteria (1-10), Stop-Triggers, Rollback Plan, and Commit Plan.*
