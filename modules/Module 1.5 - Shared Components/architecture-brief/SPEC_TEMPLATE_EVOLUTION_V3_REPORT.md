# SPEC_TEMPLATE_EVOLUTION_V3 — Report

**Tier:** T4.1 of OVERNIGHT_BUNDLE_2_2026_05_14
**Date:** 2026-05-14 (overnight Bundle 2)
**Author:** opticup-strategic (Foreman, synthesizing T3 findings)
**Inputs:** SPEC_TEMPLATE.md v2 (327 lines), 11 applied + 10 proposed improvements from T3.1 audit, 30+ recent FOREMAN_REVIEWs harvested by T3 sub-agents.

---

## 1. Why v3

V2 evolved by accretion: every FOREMAN_REVIEW added a paragraph to §0 / §3 / §6, often without renumbering or consolidating. Symptoms by 2026-05-14:

1. **`## Destructive Operations` was unnumbered** while everything else was `## N. Title` → inconsistent.
2. **Critical sections missing entirely** — no smoke-type taxonomy, no Daniel-decision protocol, no common-gotchas appendix.
3. **§7 SPEC_TEMPLATE Version Footprint adoption was 5.6%** (10 of 177 EXECUTION_REPORTs included the section) — learning-loop telemetry effectively broken.
4. **No "REQUIRED for every SPEC vs REQUIRED for <type>" matrix** — authors guessing which sections to trim.
5. **CRLF-aware diff missing from §3 boilerplate** despite repeated occurrences (M1_5_CSS_HOUSEKEEPING_POST_FIX 990-deletion false positive).
6. **`.gitignore`-awareness for §9 paths missing** — 2 SPECs in the last week lost time on this.
7. **`_down.sql` rollback artifact gate-compatibility unwarned** — M3_UTM_TRIPLE_LAYER_PERSISTENCE recovery cost ~5 min.

## 2. v3 changes

| Change | Source | Section |
|---|---|---|
| **Required Sections Matrix** at top of file | NEW (Brief direction "REQUIRED for every SPEC vs REQUIRED ONLY FOR <type>") | Frontmatter |
| **Template version banner** | NEW | Frontmatter |
| **§7 SPEC_TEMPLATE Version Footprint mandatory + hard-fail rule** | T3.1 P-EX-03 | Frontmatter + §13 (Pre-Merge Checklist) |
| **`.gitignore`-awareness for §9 paths** | T3.1 P-ST-01 | §0 Pre-Authoring Reality Check |
| **CRLF-aware diff recipe** | T3.1 P-ST-04 | §3 Success Criteria |
| **`_down.sql` → `ROLLBACK.md` rule** | T3.1 P-ST-03 | §6 Rollback Plan |
| **Renumbered `## Destructive Operations` → `## 7. Destructive Operations`** | v3 consistency rule | §7 |
| **Renumbered §7→§8, §8→§9, ..., §12→§13** | v3 consistency rule | All subsequent |
| **NEW §14 Smoke Test Cases with `Type:` taxonomy** | T3.1 P-ST-05 | §14 |
| **NEW §15 Daniel-Decision Sub-Questions (conditional)** | T1.1 P-T1.1-1 (Foreman pre-bake of decision matrix) | §15 |
| **NEW Appendix A — Common Gotchas** (A1-A7) | Synthesized from FINDINGS + Bundle 2 escalations | Appendix |

## 3. Before/after structural diff

| Metric | v2 | v3 |
|---|---|---|
| Total lines | 327 | 454 |
| Numbered sections | 13 (§0-§12, §3a) | 17 (§0-§15, §3a, App. A) |
| Unnumbered sections | 1 (`## Destructive Operations`) | 0 |
| Smoke-test taxonomy | implicit | explicit (`db/api/code-review/visual-browser`) |
| Daniel-decision protocol | absent | §15 with required Option matrix |
| Common-gotchas appendix | absent | A1-A7 |
| Required-for-every vs type matrix | absent | top-of-file table |

## 4. Harvested-lessons inventory

20 lessons inventoried from T3 + recent FOREMAN_REVIEWs. **8 already encoded in v2** (live-baselines from measurement, multi-form count criteria, sweep-criteria link-vs-comment distinction, shared edit blocks, subset relationships, backup-format guidance, browser readiness pre-flight, function-EXECUTE permission migrations). **5 newly encoded in v3** (the v3 changes table above). **7 documented in T3 audit report as proposals** for future encoding (P-AR-04, P-RV-04/05/06, P-EX-04 etc.).

## 5. Migration plan

- **Old SPECs:** no backfill required. v3 applies to SPECs authored on or after 2026-05-14.
- **In-flight SPECs:** complete on v2 if already authored; switch to v3 at the next SPEC author event.
- **Tooling:** `destructive-ops-declared.mjs` regex already accepts both `## Destructive Operations` AND `## N. Destructive Operations`. No tooling change required.
- **Backup:** v2 archived at `_archive/spec-template-versions/v2_2026_05_14/SPEC_TEMPLATE_v2.md`.

## 6. Future improvements (deferred to v4)

- Skill-bloat refactor on `opticup-executor` SKILL.md (P-EX-04) — needs its own SPEC.
- Reviewer SKILL.md structural buildup (`references/CHECK_TOOLS_REFERENCE.md` per P-RV-01) — also its own SPEC.
- Promote Architect Brief gotchas P-AR-04 (verify-hook compatibility envelope) into the Brief template (different file).

## 7. Self-improvement of THIS evolution

What worked: T3.1's audit-report-first approach gave me a clean inventory of unencoded lessons. The Required Sections Matrix at the top is a structural improvement that should compound (every future SPEC author sees it first).

What to improve: I renumbered §7→§13 manually via 6 Edit calls. If a future Foreman wants v4, a `scripts/renumber-spec-template.mjs` helper would save ~10 min. Not building it for v4 because the renumbering cost is rare.

End of report.
