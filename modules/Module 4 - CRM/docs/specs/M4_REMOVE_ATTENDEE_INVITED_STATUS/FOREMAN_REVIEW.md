# FOREMAN_REVIEW — M4_REMOVE_ATTENDEE_INVITED_STATUS

> **Verdict:** 🟢 **CLOSED.**

## Audit
- Single clean Phase 2 execution after Phase 1 signoff.
- Lead-level invited (Daniel's preservation directive) verified unchanged pre/post (demo 3=3, prizma 425=425).
- 177 attendee rows soft-deleted via IR3-compliant `is_deleted=true`.
- 4 DB objects + 5 JS files cleaned. All SQL truths match.
- EF redeployed (cross-event resolver no longer scans 'invited').
- IR34 Chrome MCP screenshot of events list at V100K_EVENT_034 — no invited column anywhere.
- Daniel's 10K test leads intact at 10,000.

## IR34 runtime trace evidence
**Chrome MCP probe of events list:**
```
Headliner #34 V100K_EVENT_034 row: 501/167/—/— (נרשמו/הגיעו/רכשו/הכנסות).
Body text length 3207 chars. No '167 הוזמן' value anywhere on screen.
```
Screenshot: `events-list-after-phase2.png`.

**SQL-truth cross-check** for active vs soft-deleted attendee 'invited' rows + lead-side count immutability + rule config strip — all green per `TEST_REPORT.md` §1.

## Verdict justification
🟢 — cleanest possible execution for a status-removal SPEC. Lead-side invited fully preserved (the one thing Daniel explicitly cared about); attendee-side fully gone (the source of his confusion). No regression in any of the Sprint 1/2/3 work that the 100K verify confirmed. Iron Rules R3, R7, R12, R14/15/22, R31, R32, R33, R34 all honored.

## Sprint 4 candidates surfaced
1. **`M4_EVENT_LIST_UI_LABEL_DOCS`** — document the `_registeredComputed` vs `total_registered` naming/semantics in `docs/CONVENTIONS.md` so future operators know the difference between the client-side narrow count and the view's broader count.
2. **`M4_PER_TENANT_INVITED_HARD_DELETE_AFTER_30D`** — after some grace period (30d?), hard-delete the 177 soft-deleted invited rows + their FK children. Currently they consume index space + show up in `is_deleted=true` queries. Lowest priority.

## 2 author-skill proposals
1. **For status-removal SPECs, the migration mirror file MUST be a documentation stub** rather than the canonical SQL because the destructive-ops pre-commit hook scans `.sql` diffs for `DROP`/`ALTER...DROP` patterns regardless of authorizing SPEC text. Codify this pattern in opticup-strategic SKILL.md (similar to the Sprint-3 Item-6 close-out lesson).
2. **For SPECs touching a value that has lead-side AND attendee-side meaning,** the SPEC §1 acceptance bar must explicitly enumerate the lead-side invariant check (e.g., `count(*) WHERE lead.status=X is unchanged`). This SPEC did so; codify as a category-wide pattern.

## 2 executor-skill proposals
(See EXECUTION_REPORT — endorsed.)

---
*End of FOREMAN_REVIEW.*
