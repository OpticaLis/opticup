# FINDINGS — P21_AUTOMATION_OVERHAUL

> **Location:** `modules/Module 4 - CRM/go-live/specs/P21_AUTOMATION_OVERHAUL/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — Multi-machine disk-vs-HEAD drift not surfaced at SPEC time

- **Code:** `M4-DOC-P21-01`
- **Severity:** LOW
- **Discovered during:** First Action / §2 D1 pre-flight (before any code changes)
- **Location:** `modules/Module 4 - CRM/go-live/specs/P21_AUTOMATION_OVERHAUL/SPEC.md` §2 D1 and §11 "Files are truncated on disk" verification claim
- **Description:** The SPEC declared that `crm-automation-engine.js` and `crm-messaging-log.js` were truncated on disk (222 and 148 lines vs 296 and 201 in git). On this executor's machine (Windows desktop), both files on disk matched the committed `0a78aa4` versions byte-for-byte (same `git hash-object` SHAs). The truncation was on a different machine (Cowork session). The SPEC's verification evidence was correct *somewhere* but not on the machine where execution happened. This cost ~3 minutes of investigation and turned SPEC §10's planned 3 commits into 2.
- **Reproduction:**
  ```
  $ git hash-object modules/crm/crm-automation-engine.js
  6781c9e6b839694de09ee1cf5ec2259b61065de4
  $ git rev-parse 0a78aa4:modules/crm/crm-automation-engine.js
  6781c9e6b839694de09ee1cf5ec2259b61065de4   # identical
  ```
- **Expected vs Actual:**
  - Expected (per SPEC §11): `wc -l crm-automation-engine.js` = 222, truncation present.
  - Actual (on Windows desktop): `wc -l` = 296, files match HEAD exactly.
- **Suggested next action:** TECH_DEBT (protocol improvement, not a bug)
- **Rationale for action:** Multi-machine dev (Daniel rotates between Windows desktop / Windows laptop / Mac — CLAUDE.md §9 "Multi-Machine") means any SPEC claim about *local* file state can be true on one machine and false on another. Future SPECs that reference local disk state should either (a) re-verify on the executing machine at Step 1.5 pre-flight, or (b) express the claim as "if line count is X, restore from git; if already ≥ Y, skip restoration." The existing opticup-strategic skill doesn't mandate disk-state reconciliation at SPEC-write time; this finding feeds a proposal to add one. See EXECUTION_REPORT.md §8 Proposal 1 for the executor-side fix.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — `TIER2_STATUSES` runtime list has 2 statuses the UI filter doesn't expose

- **Code:** `M4-UX-P21-02`
- **Severity:** LOW
- **Discovered during:** §2 B1 implementation — designing the status-filter checkbox group
- **Location:** `modules/crm/crm-helpers.js:89–100` (`TIER2_STATUSES` array) vs `modules/crm/crm-messaging-rules.js:31–37` (`TIER2_FILTER_STATUSES` P21 addition)
- **Description:** `window.TIER2_STATUSES` contains 6 entries at runtime: `waiting`, `invited`, `confirmed`, `confirmed_verified`, `not_interested`, `unsubscribed`. The P21 rule-editor filter shows only the first 4. When a user leaves the filter empty, the engine queries `IN (tier2)` → all 6 statuses, and leads with status `not_interested` or `unsubscribed` get messages (though `unsubscribed_at IS NULL` filters the second group by timestamp, not status slug). No SPEC deviation — Daniel explicitly picked the 4 in the SPEC mock — but the behavior means "empty filter" sends to statuses that aren't selectable *individually*. Worth surfacing so Daniel can confirm intent.
- **Reproduction:**
  ```
  $ grep -n "TIER2_STATUSES" modules/crm/crm-helpers.js
  89:  var TIER2_STATUSES = [
  90:    'waiting', 'invited', 'confirmed', 'confirmed_verified',
  91:    'not_interested', 'unsubscribed'
  92:  ];
  ```
  ```
  $ grep -n "TIER2_FILTER_STATUSES" modules/crm/crm-messaging-rules.js
  31:  var TIER2_FILTER_STATUSES = [
  32:    { slug: 'waiting', ... }, { slug: 'invited', ... },
  33:    { slug: 'confirmed', ... }, { slug: 'confirmed_verified', ... }
  ];
  ```
- **Expected vs Actual:**
  - Expected (if the UI 4 are the full actionable set): the engine's fallback `tier2` list should also be those 4.
  - Actual: fallback sends to 6 (including `not_interested` and `unsubscribed`). Behavior has not changed from pre-P21 — this is latent not regressive.
- **Suggested next action:** DISMISS if Daniel confirms the 4-item UI filter matches product intent. Else NEW_SPEC (thin — either add the 2 missing statuses to `TIER2_FILTER_STATUSES` as deselectable options, or tighten the engine's fallback list to the 4 actionable statuses).
- **Rationale for action:** The existing behavior is documented in the code and has been shipping since P8 (2026-04-22). It's not a P21 regression. Daniel may be relying on "empty filter = send to everyone in tier2 who hasn't unsubscribed" for broadcast-style rules, in which case the 4-vs-6 split is intentional. A 5-minute chat with Daniel resolves this without a SPEC.
- **Foreman override (filled by Foreman in review):** { }

---

*End of FINDINGS — P21_AUTOMATION_OVERHAUL*
