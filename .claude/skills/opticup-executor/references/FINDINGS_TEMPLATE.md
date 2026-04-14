# FINDINGS — {SPEC_SLUG}

> **Location:** `modules/Module X - [Name]/docs/specs/{SPEC_SLUG}/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Rules

1. One entry per finding. Never merge two unrelated issues.
2. Findings are things discovered OUTSIDE the SPEC's declared scope.
   In-scope bugs are just normal work — they belong in commits, not here.
3. Do NOT fix findings inside this SPEC. Fixing would violate "one concern per task."
4. Every finding needs a **suggested next action**: NEW_SPEC / TECH_DEBT / DISMISS.
   The Foreman can override, but never leave it blank.
5. Severity labels:
   - **CRITICAL** — data leak, multi-tenant isolation break, production outage risk
   - **HIGH** — Iron Rule violation in existing code, security exposure, broken feature
   - **MEDIUM** — latent bug, performance risk, missing validation, stale doc that misleads
   - **LOW** — cosmetic, minor refactor opportunity, tech debt under threshold
   - **INFO** — observation for context, not actionable

---

## Findings

### Finding 1 — {short descriptive title}

- **Code:** `{MODULE}-{TYPE}-{NUM}` (e.g. `M3-BUG-01`, `M1-R09-02`, `M5-DEBT-05`)
- **Severity:** HIGH / MEDIUM / LOW / etc.
- **Discovered during:** {step of the SPEC — e.g. "§3 criterion 4 verification"}
- **Location:** `path/to/file.ext:line` or `table.column` or `view_name`
- **Description:** 2–3 sentences. What is wrong, why it matters.
- **Reproduction:**
  ```
  {exact command or query that shows the issue}
  ```
- **Expected vs Actual:**
  - Expected: ...
  - Actual: ...
- **Suggested next action:** NEW_SPEC / TECH_DEBT / DISMISS
- **Rationale for action:** One sentence why this is the right disposition.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — {title}

(same structure)

---

### Finding 3 — {title}

(same structure)

---

## If no findings

Delete the "Findings" section and write a single line:

> No out-of-scope findings during this SPEC execution.

Then commit this file as part of the retrospective commit. The absence of
findings is itself a signal (positive or suspicious, depending on SPEC size)
that the Foreman will weigh.
