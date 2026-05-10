# `__LAUNCH_PLAN_DRAFT__/` — Pre-LIVE Planning Artifacts

> **Last reorganized:** 2026-05-09 (M12 close).

This folder holds **pre-LIVE planning artifacts** — Architecture Briefs, audits, handoff documents, and overseer specs. It is NOT the source of truth for module status — that lives in **`/MASTER_ROADMAP.md`** at repo root.

---

## Folder map

```
__LAUNCH_PLAN_DRAFT__/
├── README.md                          ← this file
├── MASTER_LIVE_PLAN.md                ← ⚠️ DEPRECATED — see /MASTER_ROADMAP.md instead
├── _archive/                          ← old/superseded planning docs
│   └── MASTER_LIVE_PLAN_v1.md         ← preserved for historical reference
├── access-audit/                      ← OpticPlus Access database audits (3 reports)
│   ├── ACCESS_AUDIT_REPORT.md         ← back-end main
│   ├── ACCESS_FRONTEND_AUDIT_REPORT.md ← front-end OpticPlus
│   └── ACCESS_LAB_AUDIT_REPORT.md     ← lab database (M9 dependency)
├── architecture-briefs/               ← Architecture Briefs per module
│   ├── M5 - Customers/
│   ├── M6 - Prescriptions/
│   ├── M7 - Orders/
│   ├── M8 - Payments/
│   ├── M11 - Reports/
│   ├── M12 - Communications/
│   ├── M14 - Appointments/
│   └── M15 - Queue/
├── handoffs/                          ← session-to-session handoff docs
│   ├── M12_HANDOFF.md
│   └── M13_HANDOFF.md
├── campaign-overseer/                 ← SuperSale campaign overseer artifacts
├── site-overseer/                     ← marketing site overseer artifacts
└── supervisor-system/                 ← legacy supervisor docs (pre-skill era)
```

---

## Authority Map

| What | Where |
|---|---|
| **Master roadmap + module build-order + post-cutover state** | `/MASTER_ROADMAP.md` (repo root) |
| **Architecture Briefs (cross-module decisions)** | `architecture-briefs/<MODULE>/<MODULE>_*_BRIEF.md` |
| **Module sketches (HTML mockups)** | `architecture-briefs/<MODULE>/*_MOCKUP.html` |
| **Session-to-session handoffs** | `handoffs/<MODULE>_HANDOFF.md` |
| **Strategic decisions log (index)** | `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` |
| **Per-module decisions detail** | `.claude/skills/opticup-architect/references/decisions/<MODULE>.md` |
| **Skill self-improvement patterns** | `.claude/skills/opticup-architect/SKILL.md` |
| **Iron Rules + Authority Matrix** | `/CLAUDE.md` (repo root) |

---

## Why MASTER_LIVE_PLAN.md is deprecated

It used to be the cross-module brief tracker. As of 2026-05-09 (M12 close) that role merged into `/MASTER_ROADMAP.md` §2.5 — single source of truth. The original v1 is preserved in `_archive/` for historical reference (cutover risk register, decisions Q1-Q8, original timeline estimates).

If you need any of those: read the archive, but do not update it. Update `/MASTER_ROADMAP.md`.

---

## Conventions for new modules

When opening a new Architecture Brief:

1. Create a **folder** (not a single file): `architecture-briefs/M{N} - {Name}/`
2. Inside the folder:
   - `M{N}_{NAME}_BRIEF.md` — the locked brief
   - `M{N}_*_MOCKUP.html` — sketches (one HTML per screen)
3. Write the next module's `M{N+1}_HANDOFF.md` inside `handoffs/` (NOT inside the architecture-briefs folder).
4. Update `/MASTER_ROADMAP.md` §2.5 with the new brief status.
5. Run **Module Close Ceremony** — see `.claude/skills/opticup-architect/SKILL.md`.

---

*Maintained by the Architect skill. Reorganized 2026-05-09.*
