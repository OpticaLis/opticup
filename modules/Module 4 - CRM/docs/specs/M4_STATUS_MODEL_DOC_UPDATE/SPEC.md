# M4_STATUS_MODEL_DOC_UPDATE — SPEC

**Module:** 4 — CRM
**Author:** opticup-strategic (Foreman)
**Date:** 2026-05-14
**Brief:** `M4_OVERNIGHT_HARVEST_ROUND_2_BRIEF.md` §3.4
**Run context:** Overnight Round 2, SPEC #4 of 4 (last in queue).

---

## 0. Pre-Authoring Reality Check

The Brief named these out-of-date elements in `STATUS_MODEL.md`:

1. §5.4 says lead/event triggers are "Not wired" — outdated; **SPEC #1 of this overnight run wired both**.
2. §6.4 issue #1 names `crm-attendee-cancel.js:73,106` as a sync-bypass site — **fixed by `M4_CANCEL_SYNC_FIX` (2026-05-14)**.
3. F-CSF-3 in `M4_CANCEL_SYNC_FIX/FINDINGS.md` (composite-NULL idiom) — **fixed by SPEC #3 of this overnight run**.
4. Brief mentions a historical note about the M4_STALE_INVITED_LEADS_SWEEP (1042 leads swept, 2026-05-14) — should land in §6.

Also discovered during this run:
- F-SMF-1 (FINDINGS of SPEC #3): cross-module trigger naming inconsistency lives in M1, not M4. Worth a 1-line acknowledgment in §6 so future authors know M4 itself is consistent.
- F-CSF-1 in `M4_CANCEL_SYNC_FIX/FINDINGS.md`: forward-sweep proposal (idempotent re-sync of every non-terminal lead) — still open; not closed by any of this overnight run. Leave the finding referenced in §6 as informational.

Doc-only SPEC; no code changes; no DB changes.

### Rule 21
No new names introduced. Pure edits to existing doc.

---

## 1. Goal

Bring `modules/Module 4 - CRM/docs/STATUS_MODEL.md` into alignment with the 2026-05-14 reality after `M4_CANCEL_SYNC_FIX`, `M4_STALE_INVITED_LEADS_SWEEP`, `M4_STATUS_TRIGGER_FRAMEWORK_EXTENSION`, and `M4_STATUS_MODEL_FINETUNES`.

---

## 2. Scope

**In scope:**
- Edit `modules/Module 4 - CRM/docs/STATUS_MODEL.md`:
  - §5.4 framework table: flip "Not wired" rows to "Live (2026-05-14)" and update the parallel-routing prose to reflect lead+event entering the queue path.
  - §6.4 issue #1: strike the `crm-attendee-cancel.js:73,106` reference; add a parenthetical noting the fix landed in `M4_CANCEL_SYNC_FIX (2026-05-14)`.
  - §6 new historical note: "Stale-invited-leads sweep (2026-05-14): 1042 demo leads re-derived via `sync_lead_status_from_attendee` (the canonical forward sweep)."
  - §6 new entry: "F2 cross-module trigger naming — Module 1 retains legacy pattern, Module 4 is fully on the new pattern. Surface area = M1, deferred to a future M1 SPEC."
  - F-CSF-3 (composite-NULL idiom) marked RESOLVED by `M4_STATUS_MODEL_FINETUNES (2026-05-14)` — referenced in §6.
- The Brief also asks to "Mark F-CSF-1 RESOLVED." Pre-flight finding: F-CSF-1 is **NOT** resolved by this overnight run (no forward-sweep SPEC was run; F-CSF-1 is the forward-sweep proposal). Marking it RESOLVED would be inaccurate. **Decision:** keep F-CSF-1 in informational state in §6 with a pointer; do NOT mark resolved. This is a deliberate divergence from the Brief's literal wording, justified by truth — the Brief authored that line before the overnight queue's actual contents were finalized. Logged as Finding F-SMD-1.

**Out of scope:**
- All code/DB changes (handled by SPECs #1 and #3).
- Mermaid diagram edits (the state diagrams in §2.2/§3.2/§4.2 are unchanged by this overnight run).
- Updating any other doc (SESSION_CONTEXT, MASTER_ROADMAP, GLOBAL_MAP).

---

## 3. Destructive Operations

**None.** Doc edits only. No file deletions, no section removals. Adding to existing sections.

---

## 4. Success Criteria

After edits:

- `modules/Module 4 - CRM/docs/STATUS_MODEL.md` §5.4 framework table shows `lead` + `event` producer triggers as "Live" with date `2026-05-14`.
- §6.4 issue #1 has a parenthetical fix reference (no longer points the reader at fixed code as a current bug).
- §6 has a new sub-section noting:
  - Stale-invited sweep (M4_STALE_INVITED_LEADS_SWEEP, 1042 leads, 2026-05-14)
  - F2 trigger naming is cross-module, M1-scoped
  - F-CSF-3 resolved by M4_STATUS_MODEL_FINETUNES (2026-05-14)
  - F-CSF-1 still open (forward-sweep proposal not yet a SPEC)
- File still has correct Mermaid fences (`mermaid stateDiagram-v2` blocks unchanged).
- File line count growth ≤ 80 lines.
- 1 commit.

---

## 5. Implementation

Single `Edit` calls (Edit tool) on `STATUS_MODEL.md` targeting:
1. §5.4 table — flip Lead/Event triggers to Live.
2. §5.4 prose — say the queue now covers lead+event AND attendee.
3. §6.4 issue #1 — add parenthetical fix reference.
4. §6 — insert a new sub-section `§6.8 — Historical notes (2026-05-14 same-day fixes)`.

---

## 6. Smoke

- `cat` the file, confirm it still parses as markdown (Mermaid fences intact).
- Confirm none of the changed lines accidentally invalidate the Authority Matrix.

---

## 7. Out of Scope

- Mass-rename any §6 issue numbers (preserve §6.1–§6.7 numbering).
- Touch the Mermaid diagrams.
- Renumber §6 entries.

---

## 8. Rollback

`git revert` the single commit, or `git reset --hard pre-overnight-m4-r2-2026-05-14` for full overnight revert.

---

## 9. Lessons Already Incorporated

- **Pre-flight discipline:** §0 flagged the Brief's "Mark F-CSF-1 RESOLVED" line as inaccurate; the SPEC consciously diverges and explains why.
- **Iron Rule 32 — None declared in §3.**
- **No phantom Authority-Matrix updates** — this SPEC only updates the doc it owns.

---

*End of SPEC.*
