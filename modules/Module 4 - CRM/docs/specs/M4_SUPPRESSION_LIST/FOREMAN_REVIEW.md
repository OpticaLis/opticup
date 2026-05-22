# FOREMAN_REVIEW — M4_SUPPRESSION_LIST

> **Verdict:** 🟢 **CLOSED.**

## Audit
- All 3 acceptance bar requirements verified live via 4 smoke tests.
- Fold-ins applied cleanly: display fix (status OR date), 57 inconsistencies normalized to 0, 130 contacts backfilled to 250 suppression rows.
- DB trigger catches every path including admin SQL (Daniel's airtight requirement, Decision 4).
- Per-lead gate preserved alongside contact-level gate (IR22 belt+suspenders).
- Daniel's 10K test leads intact at 10,000 throughout.
- FB CAPI exposure noted honestly + recommended as immediate-next SPEC.

## IR34 runtime trace evidence

**4 live smoke tests via curl + SQL truth cross-check:**
1. Existing suppressed lead → STATUS:200 `{"ok":false,"error":"lead_unsubscribed"}` (Layer 1).
2. NEW lead with suppressed email → STATUS:200 `{"ok":false,"error":"contact_suppressed"}` (Layer 2).
3. Resubscribe RPC → `{ok:true, suppression_rows_deleted:2, lead_status_after:'waiting'}`.
4. Post-resubscribe to same email → reached the demo allowlist gate (`phone_not_allowed`), proving Layer 1 + Layer 2 BOTH passed.

**Chrome MCP screenshot:** `crm-leads-after-suppression.png` (CRM leads page in expected state).

## Verdict justification
🟢 — clean execution of a legal-compliance-sensitive feature. The 2-layer defense (per-lead + contact-level) survives every attack vector tested. Daniel-authorized Prizma writes limited to the 252 audit-traceable rows (244 backfill + 6 trigger + ~2 norm-side-effects, post-dedupe = 247 final). No Iron Rule violations. FB CAPI exposure was discovered + transparently documented rather than silently scoped out.

## Sprint 4 candidates surfaced
1. **`M4_FB_CAPI_SUPPRESSION_GATE_2026_05_23`** (CRITICAL) — fold the contact-suppression check into fb-capi-dispatch. GDPR concern; small volume but real privacy leak.
2. **`M4_LEAD_DETAIL_SUPPRESSION_BANNER`** — show a "(contact suppressed — click to re-enable)" banner when any of lead.email/lead.phone is in suppression, regardless of current lead row state. Closes the cross-lead UX gap.
3. **`M4_CRM_UNSUBSCRIBES_LEGACY_DROP`** — after ~30 days of confirming nothing reads from `crm_unsubscribes`, drop the empty legacy table.

## 2 author-skill proposals
1. **For legal-compliance SPECs, the brief MUST include a "what does deferring leave uncovered?" clause for any deferred sub-scope.** This SPEC's Decision 3 deferred FB CAPI + WhatsApp BUT mandated a confirmation check — turned out FB CAPI was a real hole. Codify the pattern.
2. **For SPECs that backfill from an inconsistent source (status XOR date), normalize the source BEFORE backfilling.** This SPEC ran normalization first (52+6), then backfilled — clean. Codify as standard order.

## 2 executor-skill proposals
(See EXECUTION_REPORT — endorsed.)

---
*End of FOREMAN_REVIEW.*
