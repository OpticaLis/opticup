# Sentinel Mission 13 — UI-touching SPEC closure verification

**Author:** M4_DUAL_PATH_CLEAN_FIX_2026_05_19 SPEC, Layer 4.
**Iron Rule:** 34.
**Cadence:** Daily.

---

## Goal

Confirm that every SPEC closing in the last 7 days that touched browser-rendered code includes Chrome MCP evidence in its `FOREMAN_REVIEW.md`. Catch any SPEC that slipped past the pre-commit gate `scripts/checks/ui-spec-verification.mjs` (e.g., due to allowlist bypass or Daniel-authorized in-chat override that should later be back-filled with evidence).

## Inputs

- `modules/*/docs/specs/*/FOREMAN_REVIEW.md` — every SPEC closure in the repo.
- Git history filtered to the last 7 days: `git log --since="7 days ago" --name-only --pretty=format:"COMMIT %H %s"`.

## Detection logic

For each FOREMAN_REVIEW.md whose containing SPEC folder shows any UI-file edit in the same git history window:

1. Identify "UI file" = `.js`/`.html` under `modules/crm/`, `modules/admin/`, `modules/inventory/`, `modules/lens-catalog-admin/`, `modules/storefront/`, `modules/shared/`, or `js/` outside `scripts/`.
2. Identify the SPEC folder by walking up from the changed UI file until `docs/specs/<SLUG>/` is found. If the matching `FOREMAN_REVIEW.md` exists in that folder, mark it for the audit.
3. Read the FOREMAN_REVIEW.md and check for the three Iron Rule 34 evidence categories:
   - **Chrome MCP mention** — text matching `Chrome MCP`, `chrome-devtools`, or `mcp__chrome-devtools`.
   - **Screenshot reference** — text matching `screenshot`, `screenshots`, `.png`, `.jpeg`, or `.webp`.
   - **Runtime trace** — text matching `window.__modalTrace`, `runtime trace`, `console trace`, `modal_trace.json`, `Modal.show`, or `CrmAutomationClient.evaluate`.

If any of the three are missing → emit a finding.

## Output format

When a violation is found, append to `docs/guardian/GUARDIAN_ALERTS.md` under `## Mission 13 — Iron Rule 34`:

```
- 🟡 HIGH — SPEC `<SLUG>` (closed YYYY-MM-DD via commit `<sha>`) is missing Chrome MCP evidence in FOREMAN_REVIEW.md.
  - missing categories: [chrome_mcp_mention | screenshot_reference | runtime_trace]
  - touched UI files: <list, max 5>
  - resolution: amend FOREMAN_REVIEW.md with the required evidence OR open a follow-up
    SPEC documenting why the rule was bypassed (Daniel-authorized in-chat).
```

When the audit window is clean: append a single `## Mission 13 — All clear` heading with `Audited N SPEC closures in the last 7 days; 0 violations.`

## Severity

- **HIGH** — the SPEC has been committed to develop. Bypass-without-record is the failure mode this rule prevents.
- **CRITICAL** — same SPEC has been merged to main with no evidence. Rare; requires immediate Daniel attention.

## Acceptable bypasses

- Closure paperwork-only commits (FOREMAN_REVIEW updates that don't touch UI code in the same commit) — skip silently.
- SPECs older than 7 days — out of audit window.
- SPECs whose UI changes were storefront-only and verified via `tests/smoke/baseline.test.mjs` Test 4/5/7 (HEAD-only HTTP 200 + render) — accept that as the "live verification" proxy since the storefront repo has its own verification stack.

## False-positive handling

If a SPEC's FOREMAN_REVIEW.md was deliberately stripped of evidence references (e.g., for security review of an authentication flow that can't be screenshot-attached), the SPEC author should add a `Iron Rule 34 bypass: <reason>` line to FOREMAN_REVIEW.md. Mission 13 should accept that line as evidence of explicit author awareness; the alert downgrades to INFO.

## Test data

`scripts/checks/ui-spec-verification.mjs --test` exercises the same 3 categories. Mission 13 reuses the same detection logic — keep them in sync.

## Rationale

Established 2026-05-19 by `M4_DUAL_PATH_CLEAN_FIX_2026_05_19` Layer 4 after the prior morning's SPEC 5 (`M4_DUAL_PATH_DEPRECATION_PHASE_1`) shipped broken-modal JS to main with a `FOREMAN_REVIEW.md` claiming "all green" based on SQL probes only. Mission 13 is the daily safety net that catches the same failure mode if a future SPEC bypasses the pre-commit check.
