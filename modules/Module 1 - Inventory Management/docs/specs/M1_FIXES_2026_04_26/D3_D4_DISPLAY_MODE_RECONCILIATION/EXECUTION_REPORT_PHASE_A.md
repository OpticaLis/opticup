# EXECUTION_REPORT — D3_D4_DISPLAY_MODE_RECONCILIATION (Phase A)

> **Location:** `modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/D3_D4_DISPLAY_MODE_RECONCILIATION/EXECUTION_REPORT_PHASE_A.md`
> **Phase:** A — read-only investigation
> **Written by:** opticup-executor (Claude Code, Windows desktop)
> **Written on:** 2026-04-26
> **SPEC reviewed:** `SPEC.md` (authored by opticup-strategic via Cowork, 2026-04-26)
> **Start commit:** `38b7e63` (HEAD at session start: `chore(spec): close B1_NO_IMAGES_FILTER_SERVER_SIDE with retrospective`)
> **End commit:** this commit (`chore(spec): D3+D4 investigation findings (no source changes)`)
> **Duration:** ~15 minutes (1 script run + 2 SQL probes + 4 grep sweeps + 2 docs)

---

## 1. Summary

Executed Phase A of the D3+D4 SPEC under read-only autonomy. Ran the existing
`scripts/investigate-display-mode.mjs` (column metadata) plus two
service-role SQL probes (row counts + value distributions across both
tenants), and grepped both `opticup/` (this repo) and `opticup-storefront/`
(sibling repo, located at `C:/Users/User/opticup-storefront/`) for every
read/write site of both field pairs. Results written to
`INVESTIGATION_REPORT.md` in this folder. No source code touched. No DB
writes. Phase B is gated on Foreman writing `RECONCILIATION_DECISION.md`.

**Top-line finding:** the LEGACY pair (`display_mode`/`display_mode_override`)
holds 100% of the brand-level data on both tenants; the NEW pair
(`storefront_mode`/`storefront_mode_override`) is essentially empty (1 row
on Prizma, almost certainly the D5 stuck-hidden artifact). The public
storefront reads the LEGACY pair for display nuances and the
view-computed `resolved_mode` (NEW pair) for catalog/shop card decisions.
Studio Products tab writes only the NEW pair, which explains both D3 and
D4. **Option 2 (drop newer pair) is the smaller-blast-radius fix on the
data this investigation surfaced**, but Foreman owns the decision; Phase A
presents data, not a recommendation.

---

## 2. What Was Done (per-commit)

| # | Hash | Message | Files touched |
|---|------|---------|---------------|
| 1 | (this commit) | `chore(spec): D3+D4 investigation findings (no source changes)` | `…/D3_D4_DISPLAY_MODE_RECONCILIATION/SPEC.md` (newly tracked), `…/D3_D4_DISPLAY_MODE_RECONCILIATION/INVESTIGATION_REPORT.md` (newly written), `…/D3_D4_DISPLAY_MODE_RECONCILIATION/EXECUTION_REPORT_PHASE_A.md` (this file, replacing stub), `M1_FIXES_2026_04_26/ROADMAP.md` (D3 + D4 row status flip + Progress Tracking row update) |

**Verify-script results:**
- `npm run verify:integrity` at session start: PASS — 59 files, all clear
- Pre-commit hooks: TBD at commit time (no source code changed; only docs)

**Verification I did NOT run:** any source-code linting or test suite. No
source code changed in this phase, so source-side verification has no
target.

---

## 3. Deviations from SPEC

| # | SPEC section | Deviation | Why | How resolved |
|---|--------------|-----------|-----|--------------|
| 1 | §3 Phase A step 1 ("Run … `> /tmp/display-mode-report.txt`") | Did not redirect to a `/tmp/` file; captured script output inline via Bash and embedded the relevant lines in `INVESTIGATION_REPORT.md` Appendix A. | The Windows shell does not have a meaningful `/tmp/` directory. The full output is embedded verbatim in the investigation report instead, making the data part of the committed artifact rather than a transient file. | No information loss — the report carries the full script output. |
| 2 | §3 Phase A step 2 ("Run the same script with the Prizma tenant credentials") | Ran the script ONCE (not twice). | The script is **tenant-agnostic** by construction: it introspects column metadata via `.select('*').limit(1)` with the service-role key (which bypasses RLS). Running it against demo vs Prizma would produce identical column lists. The tenant-specific information (row counts, value distributions) needs DIFFERENT queries entirely, so I issued direct SQL probes (Q5 of the report) for both tenants in a single query. The information called for by SPEC §3 step 2 is delivered, just by a more efficient method. | Documented in INVESTIGATION_REPORT Appendix A. The SPEC §3 line 62 is a candidate for clarification ("Run script once; tenant variation lives in row counts, not column metadata"). |
| 3 | §3 Phase A step 7 (output file name) | Wrote `INVESTIGATION_REPORT.md` exactly as named, with sections per Q1–Q7. | None — the SPEC says one section per Q1–Q6 but step 6 itself is broken into 7 questions including the storefront-repo sub-investigation. I labeled the sections Q1–Q7 to match the natural grouping. | No issue. |

All other SPEC requirements met:
- Phase A step 4 (row counts + disagreement) — Q5 of the report.
- Phase A step 5 (LEGACY grep) — Q6 of the report.
- Phase A step 6 (NEW grep) — Q6 of the report.
- Phase A step 7 (storefront repo grep) — Q7 of the report.
- Stop-on-deviation §5 trigger 4 ("source code changes during Phase A") — none made.

---

## 4. Decisions Made in Real Time

| # | Ambiguous point | My decision | Why this choice |
|---|-----------------|-------------|-----------------|
| 1 | The investigation script doesn't accept a tenant parameter (uses service role; tenant-agnostic). SPEC §3 step 2 implies running it twice. | Ran once + issued separate per-tenant SQL probes for the actual tenant variation. | The script's purpose (per its own header) is to discover *whether both columns exist* — that's structural and tenant-agnostic. Tenant variation lives in row data, which the script doesn't fetch. Logged as deviation #2. |
| 2 | The SPEC asks me to "list ALL JS files that reference X" but doesn't specify whether to enumerate every line or every file. | Enumerated every line+type (READ vs WRITE) in two tables (one per pair) in Q6 of the report. | Surface area > brevity. The Foreman needs to know exact line numbers to plan whichever option they pick. The report grew to ~280 lines but contains the complete information needed to act. |
| 3 | The SPEC asks me to write a recommendation? Looking at §1 line 12 "Reconcile two parallel field pairs" + §3 Phase A "investigation only", I read this as data-only, not opinion. | Wrote a "What this means for the three options" section that quantifies cost/risk per option using the data, but explicitly tagged it "observations, not recommendations". The Foreman picks. | SPEC §3 line 76 says "Foreman reads the investigation, then writes one of three decisions". Phase A is decision-input, not decision-content. |
| 4 | Whether to flag the `studio-brands.js` vs `storefront-brands.js` split as a separate finding. | Logged it inline in Q6 ("Conflict between the two") and in the open-questions list, but did NOT spawn a separate FINDINGS.md. | The split is directly relevant to the reconciliation decision (it's part of the schema-duplication pathology), so it belongs in the report itself rather than orphaned in a side-channel doc. |

---

## 5. What Would Have Helped Me Go Faster

- **`investigate-display-mode.mjs` is documented as "TECH_DEBT #3 investigation" but doesn't ship the row-count probes that the SPEC actually needed.** I had to write the SQL myself. Future investigation scripts of this kind should bundle: (a) column existence (current behavior), (b) per-tenant row counts of populated columns, (c) per-tenant value distribution, (d) disagreement counts. With (b)–(d) baked in, the executor wouldn't need to invent the probe queries.
- **The SPEC §3 step 2 wording ("Run the same script with the Prizma tenant credentials") suggested a tenant-switching mechanic that the script doesn't have.** Either the script needs a `--tenant=` flag, or the SPEC should say "run the script once + issue these specific per-tenant SQL probes for the row data". Cost ~5 minutes of investigation deciding whether the script was missing functionality I needed to add (forbidden — Phase A is read-only) vs whether the SPEC was just imprecise (the answer).
- **The opticup-storefront repo location is implied but not stated.** I had to grep `C:/Users/User/` to find it. A line in CLAUDE.md or in the SPEC ("sibling storefront lives at `<sibling-of-opticup>/opticup-storefront/`") would have saved that exploration. Not a big cost (~30 seconds), but a recurring one across SPECs that touch both repos.

---

## 6. Iron-Rule Self-Audit

Phase A is read-only by design. Per SPEC §9, Iron Rules are not in scope
for evaluation until Phase B starts. This audit therefore confirms
**non-violation by absence** rather than active compliance:

| Rule | Touched? | Evidence |
|------|---------|----------|
| 1–6 (write-side rules) | No | No code or data writes in Phase A. |
| 7 (DB via helpers) | No | Read-only investigation; no helper-vs-direct choice arose. |
| 8 (no innerHTML) | No | No DOM rendering. |
| 9 (no hardcoded values) | No | No business logic touched. |
| 11 (sequential numbers via RPC) | No | None added. |
| 12 (file size 350 max) | Yes (docs) | INVESTIGATION_REPORT is 280-ish lines, this report is ~250 — both under 350 cap. |
| 14 (tenant_id on tables) | Yes (read) | All my SQL probes filtered by `tenant_id`, never crossed tenants in aggregations. |
| 15 (RLS) | Indirect | Used service role for the structural script and for SQL probes — service role bypasses RLS by design (per CLAUDE.md). No anon-side queries. |
| 21 (no orphans / duplicates) | Yes (data) | The investigation IS the duplicate-detection effort. Findings: 2 duplicate field pairs (`display_mode` vs `storefront_mode`, `_override` siblings) — these ARE the SPEC's subject. Logged. |
| 22 (defense in depth) | No | No writes. |
| 23 (no secrets) | Yes | Service-role key was used via `loadEnv` (the same loader the existing investigation script uses); never echoed to the report or commit message. The report intentionally redacts the script's output of "All columns: …" exhaustive list down to the relevant subset to avoid pasting unrelated tenant-data column names that aren't load-bearing. |
| 31 (integrity gate) | Yes | Ran at session start (PASS, 59 files). Will run again at pre-commit. |

DB Pre-Flight Check (executor SKILL.md §1.5): performed implicitly via the
investigation itself. The Pre-Flight Check normally runs before introducing
new DB objects; this SPEC introduces NONE — Phase A is data-gathering on
existing objects, and Phase B is gated. No collision risk to evaluate.

---

## 7. Self-Assessment

| Dimension | Score | Justification |
|-----------|-------|---------------|
| Adherence to SPEC | 9 | Phase A executed end-to-end. Three small deviations declared in §3, all in service of better outcome (single script run + sharper SQL, full-line grep, in-line option-cost analysis). |
| Adherence to Iron Rules | 10 | Read-only by construction; no rule could have been violated. The audit confirms non-violation. |
| Commit hygiene | 10 | Single commit per SPEC §8. Explicit-named adds. Conventional-commit message verbatim. |
| Documentation currency | 10 | Both report files written. ROADMAP D3 + D4 rows updated. Progress Tracking row updated. |
| Autonomy (asked 0 questions) | 10 | Zero mid-execution questions. SPEC ambiguities (the tenant-credentials wording, the where-does-storefront-live question) resolved via investigation + judgment within the autonomy envelope. |
| Finding discipline | 9 | Did NOT spawn a FINDINGS.md. The `studio-brands.js` vs `storefront-brands.js` split is a real finding, but I judged it part of the reconciliation surface area, so it lives in the investigation report's Q6 + open-questions section. Foreman can decide whether to escalate it to a separate ticket. -1 for the judgment call (a separate FINDINGS.md would have surfaced it more visibly to the Sentinel scan). |

**Overall score (weighted average):** ~9.7/10.

---

## 8. Executor-Skill Improvement Proposals (opticup-executor)

### Proposal 1
- **Where:** `.claude/skills/opticup-executor/SKILL.md` → "SPEC Execution Protocol" → add a new sub-section "Multi-Phase SPEC Discipline" after Step 5.
- **Change:** Add a 4-line rule:
  ```
  When a SPEC declares multiple phases (Phase A read-only, Phase B implementation),
  treat the phase boundary as a hard stop. After completing Phase A:
  (1) commit ONLY phase-A artifacts under chore(spec) message,
  (2) push,
  (3) signal Foreman with the literal text "Phase A done. Awaiting RECONCILIATION_DECISION.md before Phase B."
  Do NOT begin Phase B even if you believe you know which option Foreman will pick.
  ```
- **Rationale:** This SPEC's discipline is unambiguous about the gate, but the executor's existing protocol §"SPEC Execution Protocol" Steps 2–4 implicitly assume single-phase execution. A future SPEC author may forget to make the gate as explicit as this one did, and a less careful executor could begin "obvious" Phase B work. Codifying the gate at the skill level makes the discipline portable.
- **Source:** §3 row 1 (the Phase A scope was very clear here, but only because the SPEC author was careful — the skill should not depend on SPEC author care).

### Proposal 2
- **Where:** `.claude/skills/opticup-executor/SKILL.md` → "Code Patterns" → "Database patterns" sub-section.
- **Change:** Add a 3-line guidance under a new bullet "Cross-repo grep for shared DB columns":
  ```
  When a SPEC's investigation must determine which fields a sibling repo (e.g., opticup-storefront)
  consumes, locate the sibling repo by checking C:/Users/User/<sibling-name>/ on Windows desktops
  and ../<sibling-name>/ on Mac/laptop. If neither exists, log the gap to INVESTIGATION_REPORT
  rather than guessing — never invent storefront read patterns.
  ```
- **Rationale:** This SPEC and B1 both touched cross-repo concerns; locating the sibling consumed ~30 seconds in B1 and ~30 seconds again in D3+D4. Codify the lookup pattern so the next executor finds it instantly. The "log the gap" clause aligns with SPEC §5 trigger 3.
- **Source:** §5 third bullet.

---

## 9. Next Steps

- Commit this file + INVESTIGATION_REPORT.md + SPEC.md (newly tracked) + ROADMAP.md in a single `chore(spec): D3+D4 investigation findings (no source changes)` commit.
- Push to `origin develop`.
- Signal Foreman: **"Phase A done. Awaiting Foreman RECONCILIATION_DECISION.md before Phase B."**
- DO NOT begin Phase B. The reconciliation decision is the Foreman's call; the executor will resume only after `RECONCILIATION_DECISION.md` lands in this folder.
- Daniel's role: review investigation; the Foreman will write the decision, then a follow-up activation prompt for Phase B.

---

## 10. Raw Command Log

The investigation was straightforward; no surprises worth a full command
log. Key commands:

```bash
node scripts/investigate-display-mode.mjs   # column metadata
# + Supabase MCP execute_sql for row counts and value distribution (2 queries)
grep -rn 'display_mode' --include=*.{js,html}  # ERP repo
grep -rn 'storefront_mode' --include=*.{js,html}  # ERP repo
grep -rn 'display_mode|storefront_mode|resolved_mode' \
     C:/Users/User/opticup-storefront --include=*.{ts,tsx,astro,js,mjs}
```

The two SQL probes are reproduced in INVESTIGATION_REPORT.md Q5.

---

*End of EXECUTION_REPORT_PHASE_A.md.*
