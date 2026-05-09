# Claude Code — Execute SPEC: M4_CAMPAIGNS_MAKE_BODY_FIX_V3

> **Purpose:** Execute the SPEC at `outputs/SPEC_M4_CAMPAIGNS_MAKE_BODY_FIX_V3.md`. Move it to its canonical location, perform the iteration-pattern pivot under Bounded Autonomy, write retrospective.
> **Author:** opticup-strategic (Cowork session 2026-04-26 evening)

---

## First Action — Session Start (CLAUDE.md §1)

Continuation. Confirm only:
- `git remote -v` is `opticalis/opticup`, branch is `develop`. ✅
- `git log -1` shows `19edad0 docs(spec): FOREMAN_REVIEW for M4_CAMPAIGNS_MAKE_BODY_FIX_V2 (verdict: 🔴 REOPEN — pivot to V3)`.
- `git status`: 3 guardian files modified, untracked outputs/strays, no staged files.

If state diverges — STOP and report.

---

## Step 0 — Move the SPEC into place

```bash
mkdir -p "modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_MAKE_BODY_FIX_V3"
mv "outputs/SPEC_M4_CAMPAIGNS_MAKE_BODY_FIX_V3.md" "modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_MAKE_BODY_FIX_V3/SPEC.md"
```

Use plain `mv` (the SPEC is untracked at this point — per V1 FINDING F3).

Verify with `ls modules/Module\ 4\ -\ CRM/docs/specs/M4_CAMPAIGNS_MAKE_BODY_FIX_V3/`.

---

## Step 1 — Read the SPEC

Read `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_MAKE_BODY_FIX_V3/SPEC.md` in full.

---

## Step 2 — Load opticup-executor skill

Load `opticup-executor` if not already loaded. Follow its SPEC Execution Protocol.

---

## Step 3 — Execute the SPEC

Follow §11 (Pre-flight) → §13 (QA Protocol) Paths 0–6.

Key reminders:

- **Architectural pivot.** This SPEC removes the BasicAggregator entirely. The flow becomes 3 modules: List Campaigns → Get Insights → HTTP. No CreateJSON. No array substitutions.
- **Hand-written flat body.** The HTTP `mapper.data` field is a literal JSON template with `{{N.field}}` substitutions for scalars only. The `campaigns: [...]` array wrapper is hand-written around a single campaign object — the EF accepts arrays, and a 1-item array is the simplest case.
- **Wire-body cross-check is mandatory.** After smoke test, verify both Make-side transfer bytes (>200 per HTTP call) AND EF-side log entries (one per campaign). If either signal is missing, treat as failure.
- **Wait window:** 5 minutes per smoke test (longer than V2's 4 min because iteration pattern adds ~10 HTTP calls per run).
- **Single rung.** If Rung 1 fails, STOP. There's no Rung 2 — this is the third architectural attempt and we need to escalate before trying again.
- **Mask all secrets.** Use `fbsync_***` prefix in any output. Real value lives in Make scenario UI + Supabase env + `~/.optic-up/make-secret.txt`.

---

## Step 4 — Documentation

If Rung 1 succeeded:
- Write `modules/Module 4 - CRM/docs/make-patterns/README.md` per §14 of the SPEC.
- Commit per §10.

If Rung 1 failed: skip docs. Write only the retrospective.

---

## Step 5 — At SPEC close

Per the folder-per-SPEC retrospective protocol:
- `EXECUTION_REPORT.md` — required.
- `FINDINGS.md` — only if findings to log.
- Commit them: `chore(spec): close M4_CAMPAIGNS_MAKE_BODY_FIX_V3 with retrospective`.

After the retrospective commit, hand back to the strategic chat with:
- Did Rung 1 succeed (verdict).
- Final commit hashes.
- Final `git status`.
- DB row counts (after first smoke + after second smoke).
- Confirmation that scenario `9126542` is `isActive: false`.
- Any FINDINGS.

---

## Stop-on-Deviation

Per SPEC §6 + CLAUDE.md §9.

The most likely stops:
- Rung 1 fails (HTTP 400 or empty wire body) → roll back, STOP.
- Smoke test returns 200 but DB shows zero rows → flag as finding (EF issue, not Make).
- HTTP 401 → secret mismatch, STOP.
- `scenarios_update` rejects the new blueprint → revert, STOP.

---

## Time Estimate

20–35 minutes. ~5 min update + 5 min smoke 1 + 3 min DB verify + 5 min smoke 2 (UPSERT verify) + 5 min docs + 5 min retrospective + commits.

---

## Iron Rule Compliance

All covered in SPEC §12 + §4 criteria 12, 13, 14, 15. Triple-check Rule 23.

---

*End of dispatcher prompt. Read the SPEC at `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_MAKE_BODY_FIX_V3/SPEC.md` and execute it.*
