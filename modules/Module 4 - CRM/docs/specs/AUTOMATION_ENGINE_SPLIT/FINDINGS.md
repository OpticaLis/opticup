# FINDINGS — AUTOMATION_ENGINE_SPLIT

> File-only structural refactor. Function copied verbatim. No DB writes. No
> behavior changes. Limited surface for findings beyond what was already
> known in advance.

---

## F1 — `verify.mjs` file-size check is off-by-one vs `wc -l`

**Severity:** LOW
**Location:** `scripts/verify.mjs` file-size rule.
**Discovered while:** committing the engine change. `wc -l` showed 326; `verify.mjs` reported 327 in its soft-warning output.

**Description.** The file-size warning ("file exceeds 300-line soft target") appears to count one more line than `wc -l` does — likely an off-by-one in how trailing newlines are handled. Not a bug in either tool individually, but it makes SPEC criteria phrased as `wc -l` thresholds harder to land precisely against the verifier's view. We avoided it here by trimming a comment line (326 in `wc -l`, 327 in verify.mjs — both are well under the 350 hard cap).

**Suggested next action.** A small follow-up SPEC could either (a) make `verify.mjs` match `wc -l` exactly so SPEC criteria are unambiguous, or (b) document the +1 convention explicitly in `CLAUDE.md` Rule 12 so SPEC authors and executors use the same counter. Not blocking.

---

*End of FINDINGS.md.*
