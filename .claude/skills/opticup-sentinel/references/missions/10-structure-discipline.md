# Mission 10: Structure Discipline (משמר המבנה)

> **Cadence:** Daily
> **Severity:** MEDIUM (structural drift accumulates slowly but persistently)
> **Output:** Findings to `GUARDIAN_REPORT.md` + alerts to `GUARDIAN_ALERTS.md` if violations found.
> **Added:** 2026-05-09 by `STRUCTURE_PROTECTIONS` SPEC.

---

## What this mission audits

This mission verifies that the **Root Discipline Rule** (CLAUDE.md §0.5) and the **One Home Per Module rule** are still being followed. It is the periodic detection layer:

- **Pre-commit hooks** (`scripts/checks/check-root-discipline.mjs` via `verify.mjs --staged`) prevent NEW violations.
- **This mission** catches drift that accumulates despite hooks (e.g., locally-staged changes that bypass hooks via `--no-verify`, or items that pre-date the hook).
- **Bootstrap auto-check** (Step 4.5 in `opticup-main-strategic` SKILL.md) reminds at every session start.

Three independent layers — culture turned into infrastructure.

---

## Checks

### Check 10.1 — Root inventory matches allowlist

Compare `ls -1 /` (top-level repo) against `scripts/checks/root-allowlist.json`:

```bash
node -e "
  const { readdirSync } = require('fs');
  const allowlist = require('./scripts/checks/root-allowlist.json');
  const allowedFiles = new Set(Object.values(allowlist.files).flat());
  const allowedDirs = new Set(Object.values(allowlist.directories).flat());
  const entries = readdirSync('.', { withFileTypes: true });
  const offFiles = entries.filter(e => !e.isDirectory() && !allowedFiles.has(e.name)).map(e => e.name);
  const offDirs  = entries.filter(e =>  e.isDirectory() && !allowedDirs.has(e.name)).map(e => e.name);
  console.log('files-not-in-allowlist:', offFiles);
  console.log('dirs-not-in-allowlist:',  offDirs);
"
```

- Expected: both arrays empty.
- Report any file/dir present at root but NOT in allowlist as a finding (severity MEDIUM).

### Check 10.2 — In-design modules have `architecture-brief/`

For every directory `modules/Module N - Name/` that has a `README.md` whose Status line declares "In-design" or "Pre-Brief":

```bash
for dir in modules/Module*/; do
  readme="$dir/README.md"
  if [ -f "$readme" ]; then
    status=$(grep -E "^>\s*\*\*Status:\*\*" "$readme" | head -1)
    if echo "$status" | grep -qE "In-design|Pre-Brief"; then
      brief_dir="$dir/architecture-brief"
      if [ ! -d "$brief_dir" ]; then
        echo "MISSING architecture-brief/: $dir"
      else
        if ! ls "$brief_dir"/*_BRIEF.md >/dev/null 2>&1 && ! ls "$brief_dir"/*_HANDOFF.md >/dev/null 2>&1; then
          echo "EMPTY architecture-brief/: $dir"
        fi
      fi
    fi
  fi
done
```

- Expected: empty output.
- Report missing or empty `architecture-brief/` as a finding (severity MEDIUM).

### Check 10.3 — Single archive vault

Verify there is ONLY ONE archive location at repo root:

```bash
# Canonical _archive/ exists
test -d _archive/ || echo "MISSING: _archive/"

# No competing archive dirs at root
ls -d archive/ 2>/dev/null && echo "FOUND ROGUE: archive/ at root"

# No resurrected sub-archives in retired locations
test -d __LAUNCH_PLAN_DRAFT__/ && echo "FOUND RESURRECTED: __LAUNCH_PLAN_DRAFT__/"

# No '_archive' nested inside other top-level dirs (except the canonical one)
find . -maxdepth 2 -type d -name "_archive" -not -path "./_archive" 2>/dev/null
```

- Expected: only `_archive/` at root, no rogue or resurrected archives.
- Report any rogue/resurrected as severity HIGH (active drift).

### Check 10.4 — Roles directory integrity

Verify `roles/` exists and contains expected operational personas:

```bash
test -d roles/                           || echo "MISSING: roles/"
test -d roles/campaign-overseer/         || echo "MISSING: roles/campaign-overseer/"
test -d roles/site-overseer/             || echo "MISSING: roles/site-overseer/"
test -f roles/README.md                  || echo "MISSING: roles/README.md"

# Each role subfolder needs at least a HANDOFF.md or README.md
for dir in roles/*/; do
  if [ "$dir" = "roles/README.md/" ]; then continue; fi
  ls "$dir"*HANDOFF.md "$dir"README.md 2>/dev/null | head -1 | grep -q . || echo "EMPTY: $dir (no HANDOFF/README)"
done
```

- Expected: empty output.
- Report missing as severity MEDIUM.

### Check 10.5 — Module Close Ceremony backlog

Read `.claude/skills/opticup-main-strategic/references/DECISIONS_LOG.md`. Find:

- Sealed-Brief modules (per the index tables there).
- "Last Module Close ceremonies performed" entries (or equivalent log section).

For every sealed-Brief module that has NO recorded close ceremony, log a finding (severity LOW — reminder, not violation). The bootstrap auto-check (Step 4.5 in `opticup-main-strategic` SKILL) also catches this; this mission provides redundancy.

---

## Output format

Write findings to `GUARDIAN_REPORT.md` under "Mission 10: Structure Discipline":

```markdown
## Mission 10: Structure Discipline
**Status:** [PASS — no findings | FINDINGS — see below]

### Finding: [10-A] Root file not in allowlist
- **Severity:** MEDIUM
- **Rule:** CLAUDE.md §0.5 (Root Discipline)
- **Location:** /SOMEFILE.md
- **What's wrong:** File present at repo root, not in scripts/checks/root-allowlist.json.
- **Suggested action:** Move to subfolder (recommended) OR add to allowlist + document in CLAUDE.md §0.5.

(repeat per finding)

### Clean Areas
- ✅ Root inventory: 100% matches allowlist
- ✅ All in-design modules have architecture-brief/ with at least one BRIEF or HANDOFF
- ✅ Single archive vault confirmed (_archive/ only)
- ✅ Roles directory integrity: OK
- ✅ Module Close Ceremony backlog: 0
```

If any MEDIUM or HIGH finding → also append to `GUARDIAN_ALERTS.md` under the matching severity section.

---

## How to run this mission

This mission is invoked as part of the daily Sentinel sweep. To run manually:

1. Load `opticup-sentinel` skill.
2. Execute Check 10.1 through 10.5 in order.
3. Aggregate findings into the output format above.
4. Append to `GUARDIAN_REPORT.md` and (if needed) `GUARDIAN_ALERTS.md`.

The Sentinel never modifies project source files — only reads + writes reports to `docs/guardian/`.
