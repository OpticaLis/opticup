# RETROSPECTIVE — M1_SKILL_IMPROVEMENT_HARVEST

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_SKILL_IMPROVEMENT_HARVEST/RETROSPECTIVE.md`
> **Written by:** opticup-strategic (single-skill Pipeline mode)
> **Written on:** 2026-05-15
> **Purpose:** Capture divergence between the proposal text (as written by the M1B0 Foreman) and the text that actually landed in the skill files. Skill-meta-harvests must be re-readable in 6 months — this file is the audit trail.

---

## Source-vs-applied diff table

| Proposal | Source (M1B0 FOREMAN_REVIEW.md) | What landed | Verbatim? |
|---|---|---|---|
| **A1** — §0 mandatory audits | §6 Proposal 1: "Add two new explicit sub-headings that are MANDATORY (not optional): ### Inner-call arity audit (mandatory for SPECs that create or extend any SECDEF function) — with a recipe + a 'Records: 0 mismatches \| N mismatches' line. ### Smoke-touched schema audit (mandatory for SPECs that author a §13 smoke section) — with a per-table baselines table + a 'all fixtures present' line." | Two new H3 sub-headings inserted into `SPEC_TEMPLATE.md` §0 between the existing live-baselines bullet and the closing citations paragraph. Both marked **MANDATORY** via a callout block at the top ("These two audits are MANDATORY..."). Each carries a full recipe (4–5 numbered steps) + closing reporting line ("Records: 0 mismatches \| N mismatches" for arity; "all fixtures present \| N fixtures missing" for schema). | **Mostly verbatim.** Adapted: source said "§13 smoke section" but the live template's smoke section is §14 (the M1B0 review was written against an older template revision). Updated to "§14". Source did not specify the exact placement inside §0 — chose "after baselines bullet, before citations paragraph" to keep audits adjacent to §0 prose. |
| **A2** — Concurrent-Pipeline awareness | §6 Proposal 2: "Add bullet-template: 'If another Pipeline may run in parallel on `develop`...this SPEC declares its orthogonality envelope: this SPEC touches `<files/objects>`; it WILL NOT conflict with files/objects in `<other modules/scope>`. If a concurrent Pipeline's commits interleave, that is acceptable as long as both stay within their declared scope.'" | One new H3 sub-section `### Concurrent-Pipeline awareness (orthogonality envelope)` added to SPEC_TEMPLATE.md §12 Lessons Already Incorporated. Carries the bullet template verbatim plus 1 expansion paragraph on Executor behavior ("will not abort on interleaved commits from declared-orthogonal scopes; will abort if interleaved commit touches a path inside this SPEC's declared scope") and 1 historical-context paragraph (M1B0's 3 SECURITY_HOTFIX_2 interleave + Reviewer §3 spot-check 4). | **Mostly verbatim** with two additions: (a) Executor-behavior expansion paragraph — not in the source proposal but logically necessary for the bullet to be actionable. (b) Historical-context paragraph — comes from the proposal's own Rationale section, included here so future SPEC authors don't need to re-read M1B0 to understand why this convention exists. **Section number adapted:** Brief A2 named "§11", live template Lessons section is §12. |
| **E1** — Applied Log convention | §7 Proposal 1: "Add a sub-step after the existing Step 2: '**Applied Log convention (MCP-only SPECs).** When the SPEC uses MCP `apply_migration` and produces no `supabase/migrations/*.sql` files: create `<SPEC_FOLDER>/MIGRATION.md` with an Applied Log table (columns: `# \| Migration name \| Block (SPEC §6) \| Applied (UTC) \| Verify result`). Append one row per `apply_migration` call, in the commit semantically representing that block. This satisfies the SPEC §10 commit-row granularity by giving every MCP-only commit a real file delta.'" | Inserted as a single paragraph immediately after the existing one-liner body of Step 2 and BEFORE `### Step 3 — Log findings as you go`. Body text verbatim except: minor copy-edit "produces no `supabase/migrations/*.sql` files **on disk**" (clarifies the MCP-only condition) and "**otherwise** a 'Block N applied' commit has nothing in the working tree to commit, breaking the per-block one-commit pattern" (explanatory clause expanding the original "satisfies §10 granularity" claim). Suffixed with promotion citation. | **Verbatim core + minor copy-edits + citation.** No semantic change. |
| **E2** — `advisors-for-objects.mjs` + SKILL reference | §7 Proposal 2: "Create a Node script that wraps `mcp__claude_ai_Supabase__get_advisors` (security + performance), filters HIGH/ERROR/CRITICAL findings, matches them to object names passed as args, and prints only matching rows (exit 1 if any). Usage: `node scripts/audit/advisors-for-objects.mjs purchase_order purchase_order_line supplier_debt next_purchase_order_number place_purchase_order mark_po_sent cancel_purchase_order m1_create_supplier_debt_from_receipt`. Add a line in SKILL.md: 'After any DDL pipeline, run this script with the SPEC's new-object list to verify §3 advisor-cleanliness criterion programmatically instead of by subagent grep.'" | Created `scripts/audit/advisors-for-objects.mjs` (197 lines, pure Node 18+, no `node_modules` deps). Per Brief Decision 3, implementation (a): script reads `--advisors-json <path>` flag plus positional names rather than wrapping the MCP call itself (MCP tools aren't callable from a Node script; the executor dumps to a temp file first, then runs the script). SKILL.md reference added in §"Verification After Changes" as a new bullet for "DDL Pipelines (Level 3 SPECs that added/altered DB objects)" with full recipe; cross-reference one-liner added under §"SQL Autonomy Levels" / Level 1 confirming the script is safely read-only. | **Adapted** per Brief locked Decision 3. The proposal's "wraps `mcp__claude_ai_Supabase__get_advisors`" is impossible from a Node script (MCP tools live inside Claude's tool layer); the SPEC and Brief explicitly chose implementation (a) — script as a JSON-file consumer. Brief §9 question #2 answered: pure Node 18+, zero deps. Smoke-time discovery (c4 commit) added MCP envelope unwrap (`parsed.result.lints` fallback) — not in source proposal, but required for the script to work against actual MCP output. |

---

## What the source proposals did NOT cover (and we had to figure out)

1. **MCP `get_advisors` response envelope shape.** The source proposal said "wraps `mcp__claude_ai_Supabase__get_advisors`" but didn't enumerate the response shape. Discovered at smoke time: `{"result":{"lints":[...]}}`. Fix added in c4. FINDINGS F-2 captures this gap as a future-harvest candidate.
2. **Section number drift in target file.** Brief A2 named SPEC_TEMPLATE.md §11; live template has §12. Source proposals reference section anchors that drift over time — implementer adapts to current state, logs in §0 D1 + FINDINGS.
3. **Exact insertion point inside §0.** Source proposal said "Add at the top of §0" but the actual §0 has many existing bullets and a closing citations paragraph. Chose "after baselines bullet, before citations paragraph" — preserves visual hierarchy and citation provenance.
4. **Whether to add MANDATORY callout at §0 top or per-sub-heading.** Both. The top-of-§0 callout block ("These two audits are MANDATORY for SPECs in their applicable categories. A SPEC missing the applicable audit is NOT ready for dispatch.") + each sub-heading repeats "mandatory for SPECs that..." in its own title. Redundant by design — a future SPEC author scanning §0 from any direction sees MANDATORY.
5. **What "Applied Log" exact column header to use in MIGRATION.md.** Source said `# \| Migration name \| Block (SPEC §6) \| Applied (UTC) \| Verify result`. Applied verbatim. Note: "Block (SPEC §6)" implies the SPEC has a §6 with Block names — which M1B0 did but not every SPEC will. The convention should generalize: "Block (SPEC §<block-section>)" — but this is a future-harvest concern, not a defect now.

---

## Cross-check: do the 4 changes work together?

Yes. They are independent + composable:

- A1 fires for SPECs that create SECDEF functions OR author a smoke section.
- A2 fires for every SPEC (orthogonality envelope is universal — even when N=1 declaration of "no concurrent-Pipeline expected").
- E1 fires for MCP-only SPECs (no `supabase/migrations/*.sql` on disk).
- E2 fires for Level-3 DDL SPECs that touch DB objects (post-DDL advisor verify).

This SPEC itself exercised: A2 (declared orthogonality envelope in §0), implicitly A1 (N/A — no SECDEF, no DB smoke), implicitly E1 (N/A — no MCP migrations), implicitly E2 (N/A — no DDL). Future SPECs will exercise the full matrix.

---

## What the next harvest should look for

1. **Promotion of F-1 to 1st-strike Author Proposal.** If the next SPEC that creates a new CLI script ALSO hits a smoke-time fix, that's a 2-strike pattern → bake a "smoke-discovery contingency" row into SPEC_TEMPLATE.md §10 commit plan.
2. **Promotion of F-2 to 1st-strike Executor/Author Proposal.** If another SPEC discovers an MCP response shape at smoke time, promote a canonical MCP-shapes reference doc into the skill references.
3. **2nd occurrence of single-skill Pipeline.** F-3's RETROSPECTIVE.md filename convention will become a recurring pattern only after a 2nd single-skill Pipeline runs. At that point bake it into the strategic SKILL.md.

---

## Closure note

This is the first single-skill Pipeline in the project. The model (skill harvests its own work, no Executor/Reviewer/Foreman chain) worked end-to-end in ~30 minutes for 4 proposals + 6 commits + retrospective. The chain protocol (`docs/AGENT_CHAIN_PROTOCOL.md`) does not currently describe single-skill Pipelines — but the orthogonality envelope (A2) provides a forward-compatible way to declare them: "this Pipeline runs in skill-meta mode; the only files touched are skill files; the only commits produced are skill-edits + retrospective."

After 🟢 close: Architect dispatches `M1_LENS_PHASE_1B_FOUNDATION` against frozen skill state.

*End of RETROSPECTIVE.md.*
