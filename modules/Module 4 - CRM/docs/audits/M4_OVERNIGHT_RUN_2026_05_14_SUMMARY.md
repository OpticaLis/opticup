# Overnight Run Summary — 2026-05-14/15

**Run:** M4 Overnight Harvest Round 2 (per Brief `M4_OVERNIGHT_HARVEST_ROUND_2_BRIEF.md`)
**Pipeline:** Full Auto, single Claude Code chat, Opus 4.7
**Duration:** ~3 hours
**Verdict:** 🟢 GREEN with one ESCALATION (SPEC #2)

---

## Master tag

- `pre-overnight-m4-r2-2026-05-14` → `d0d1ae47` (baseline before any overnight commit)
- **One-command full rollback:**
  ```
  git reset --hard pre-overnight-m4-r2-2026-05-14 && git push --force-with-lease origin develop
  ```
- Plus, for the DB:
  ```sql
  DROP TRIGGER IF EXISTS trg_lead_status_change_event ON crm_leads;
  DROP TRIGGER IF EXISTS trg_event_status_change_event ON crm_events;
  DROP FUNCTION IF EXISTS lead_status_change_event_fn();
  DROP FUNCTION IF EXISTS event_status_change_event_fn();
  DELETE FROM crm_trigger_type_registry WHERE entity_type IN ('lead','event');
  -- The sync_lead_status_from_attendee body change can be reverted by running the
  -- pre-SPEC-3 body (captured in M4_STATUS_MODEL_FINETUNES/SPEC.md §0).
  ```

---

## SPECs run

| # | SPEC slug | Status | Duration | Commits | Top result |
|---|-----------|--------|----------|---------|-----------|
| 1 | M4_STATUS_TRIGGER_FRAMEWORK_EXTENSION | 🟢 GREEN | ~1.5h | 4 (`482346b`, `b226ce2`, `fb49972`, `ee2a14b`) | Lead + event status changes now route through `crm_status_change_events` queue (parallel to legacy in-process dispatch). DB triggers + EF consumer + UI conditions all wired. Smoke 7/7 baseline + 5/5 SPEC-specific. |
| 2 | M4_RAW_SB_WRAPPER_MIGRATION_PHASE_2 | 🟠 ESCALATED | ~15min pre-flight | 1 (`66a7a26`) | Brief premise contradicted: existing wrappers (`fetchAll`, `batchCreate`, `batchUpdate`) only support `select('*')` + batch INSERT/UPDATE-by-id. 0 of the 8 calls in the target files migrate cleanly without semantic change. Foundational wrapper-extension SPEC needed first. |
| 3 | M4_STATUS_MODEL_FINETUNES | 🟢 GREEN | ~25min | 1 (`fd1862f`) | F-CSF-3 (composite-NULL idiom in `sync_lead_status_from_attendee`) replaced with canonical `IF NOT FOUND`. F2 trigger-rename scope-corrected at SPEC-author time (legacy pattern is M1-scoped, not M4). |
| 4 | M4_STATUS_MODEL_DOC_UPDATE | 🟢 GREEN | ~30min | 1 (`c5c942a`) | STATUS_MODEL.md §5.4 + §6.4 + new §6.8 reflect 2026-05-14 reality. Brief asked to "Mark F-CSF-1 RESOLVED" — pre-flight rejected (F-CSF-1 is the forward-sweep proposal; not actually resolved). |

**Total commits on develop:** 7 (6 substantive + 1 escalation file). All pushed to origin/develop.

---

## Escalations

1. **`modules/Module 4 - CRM/escalations/20260514_184500_OVERNIGHT_R2_BLOCKER.md`** — SPEC #2 escalation, detailing the wrapper-API gap and recommending 3 options (foundational extension SPEC / document M4 as wrapper-partial zone / migrate only batch-shaped sites).

---

## Smoke results

| Suite | Result |
|---|---|
| `tests/smoke/baseline.test.mjs` (after SPEC #1 commit chain) | 7/7 passed (PIN auth, CRM lead create, inventory read, 2 storefront pages, cross-module visibility, no 5xx). |
| SPEC #1 producer triggers (demo) | Lead row inserted with payload `{phone, source}`; event row inserted with payload `{event_date, event_name}`. No-op UPDATEs correctly produced 0 rows. |
| SPEC #1 consumer routing (demo) | Both rows reached `consumed_at`; event-entity evaluation matched the demo rule "שינוי סטטוס: ייפתח מחר" (fired=1). Side effect: 2 test messages sent to Daniel's whitelisted phone (`+972537889878`) — per Brief §2.3, this is permitted. |
| SPEC #3 RPC fix (demo) | Existing lead → `{ok:true,updated:false}`; non-existent uuid → `{ok:false,error:lead_not_found}` (the path the fix actually changes). |
| SPEC #4 doc | Markdown parses; 3 Mermaid blocks intact; file grew 12 lines. |

**Side effects to know about:** 2 SMS+email messages reached Daniel's test phone/email as a documented side effect of the SPEC #1 event-status smoke. Subject line: throwaway event "__M4_SMOKE_FRAMEWORK_EXT_2026_05_14__". This is expected and within Brief §2.3 whitelist.

---

## Open questions for Daniel

1. **Wrapper API extension** — recommend authoring `M4_DB_WRAPPER_API_EXTENSION` SPEC (adds `selectColumns`, `selectOne`, `updateOne`) before the next wrapper-migration phase. Without it, "migrate the next 25 sb.from() calls" is mechanically impossible without semantic regressions on column SELECTs and single-row gets. See escalation file for 3 options.
2. **F-CSF-1 forward-sweep** — the 1042-lead demo sweep was tenant-scoped to demo. A parallel Prizma sweep is the obvious next step, but no SPEC has been authored. Author one? Or leave it as the kind of issue we discover-and-fix opportunistically?
3. **M1 trigger naming normalization** — Module 1 has 4 legacy-pattern triggers (`trg_*_updated`). Module 4 is fully consistent on the new pattern. When does M1 next open a maintenance SPEC where renaming bundles cleanly?
4. **Decommission the in-process dispatch path** — both queue path and in-process path now run in parallel for lead and event status changes. The double-firing is intentional but adds observability noise (e.g., SPEC #1's smoke showed 2 automation runs for one event flip; the duplication is the cost). Eventually one path should win. Which?
5. **`crm_events` missing `updated_at`** — Finding F-STFE-1 from SPEC #1. Most other CRM tables have it; events do not. Small fix, asymmetry only. Worth fixing?

---

## Recommended next steps

**Recommendation: (b) Cherry-pick — develop has 7 mixed-quality commits. 6 of them (SPECs 1+3+4) merge cleanly to main; the escalation file (SPEC #2 commit `66a7a26`) should also go to main as a record but adds no functional change.**

**Reasoning:**
- All shipped code (SPECs 1, 3) passed baseline smoke 7/7 AND SPEC-specific smoke. The infrastructure is more capable than yesterday and equally safe.
- The doc refresh (SPEC 4) keeps the canonical reference truthful — important for the next Brief author.
- The escalation file documents the wrapper-API gap; pushing it to main keeps the project record honest.
- Nothing on develop should NOT go to main.

**Specific merge plan (if approved):**
```
git checkout main
git merge develop --ff-only   # or git merge develop if a merge commit is preferred
git push origin main
git checkout develop
```

(`--ff-only` should succeed because no `main` commits diverged during the overnight; if it fails, that means someone else pushed to main concurrently — investigate before merging.)

**Alternative (a) Full develop→main merge** is equivalent here because all 7 commits are good. **Alternative (c) Rollback** is NOT recommended — no commit on develop is regressive.

**Before merging to main:**
- Daniel may want to open `crm.html` → Automations → New rule and visually confirm the new `status_changed_from` / `status_changed_to` options appear on the tier2 (לידים — רשומים) and events boards. This was deferred from SPEC #1's smoke; takes ~30 seconds.
- Daniel may want to read the F-CSF-1 follow-up question above and decide whether to author the forward-sweep SPEC before or after the merge.

---

## What's NOT in this summary

- No Prizma data was modified.
- No merge to main happened autonomously.
- No `git reset --hard` was used.
- No `--no-verify` bypass was used.
- The 8 source files modified by this run stayed under the 350-line cap.

---

*End of Overnight Run Summary. Pre-existing untracked files on the repo (not shown here) remain as Daniel left them.*
