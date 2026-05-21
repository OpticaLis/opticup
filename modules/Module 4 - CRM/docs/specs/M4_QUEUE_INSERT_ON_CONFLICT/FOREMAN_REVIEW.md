# FOREMAN_REVIEW — M4_QUEUE_INSERT_ON_CONFLICT

> **Date:** 2026-05-21
> **Verdict:** 🟢 **CLOSED**

## 1. SPEC quality audit

| Aspect | Score | Notes |
|---|---|---|
| Measurable success criteria | 10/10 | 13 criteria, all met. The migration SQL in §9 was verbatim-applied via Supabase MCP `apply_migration` and worked first-try. |
| Destructive-ops declaration | 10/10 | Scope honored exactly. |
| Runtime-semantics rehearsal (§0) | 10/10 | The 5 test cases mentally walked in §0 (both have run_id+template_slug → dup-skip; missing run_id → reject batch; same run_id different channel → both insert; cancelled-row re-enqueue → both insert because cancelled excluded from partial index) all hold up against the live verification. |
| Rollback plan | 10/10 | Pure-additive migration; rollback is `DROP FUNCTION`. ROLLBACK.md not separately written (single-line drop is trivial). |
| Defense-in-depth lock-in | 10/10 | SPECs A + B + C now form three independent safety layers (operator brake + SCE claim + queue ON CONFLICT). FINDINGS F-05 documents the stack. |

## 2. Execution quality audit

| Aspect | Score | Notes |
|---|---|---|
| SPEC adherence | 9/10 | Verification used direct-SQL RPC instead of parallel curls; functionally equivalent (D-1 in EXECUTION_REPORT). |
| Iron Rule compliance | 10/10 | All rules honored. IR34 explicitly N/A. |
| Commit hygiene | 10/10 | Single focused commit (`276c614`). |
| Test discipline | 10/10 | Clean-slate pre-test (queue/log/SCE deleted), first enqueue measured, re-enqueue measured, queue invariant verified. Each assertion has a single source of truth (`enqueue_crm_messages_idempotent` return value + `crm_message_queue` group-by-status count). |

## 3. Findings processing

| Finding | Action |
|---|---|
| F-01 SPEC A's `queue_insert_failed` rows GONE | Verified resolved. |
| F-02 Old SELECT-then-INSERT pattern in queue-send.ts | Deleted in same commit. |
| F-03 RPC validates run_id + template_slug | Documented for maintainers. |
| F-04 dispatch-queue mid-test processing | Operationally normal. |
| F-05 Defense-in-depth stack documented | INFO. |

## 4. 2 author-skill improvement proposals (opticup-strategic)

### P-AUTHOR-1 — RPC-bridge pattern documentation
**Where:** `.claude/skills/opticup-strategic/references/` — new file `RPC_BRIDGE_FOR_PARTIAL_INDEX.sql`.
**What:** SPEC C bridges the supabase-js limitation that the client can't emit a partial unique index's WHERE clause in `.upsert()`. This is a reusable pattern for any future case where Postgres has a partial unique index and supabase-js can't drive the matching ON CONFLICT. Codify it as a reference template.
**Rationale:** the pattern is reusable across modules. Future SPECs that need atomic deduped inserts shouldn't have to re-derive the SECURITY DEFINER + jsonb_array_elements + ON CONFLICT (cols) WHERE (...) DO NOTHING shape.

### P-AUTHOR-2 — Defense-in-depth verification cross-SPEC
**Where:** SPEC_TEMPLATE.md §7 Out of Scope — add subsection "Layer-in-stack accounting".
**What:** when a SPEC is one layer of a multi-SPEC defense-in-depth, explicitly state which other layers it depends on and which it complements. SPEC C's INCIDENT_REPORT framing was 3 of 3 — but the SPEC body could have been more explicit about which failure modes are STILL prevented by lower layers if C didn't exist.
**Rationale:** improves reviewer confidence and clarifies the rollback envelope (if you have to roll back C, what protection level remains?).

## 5. 2 executor-skill improvement proposals (opticup-executor)

### P-EXEC-1 — Direct-RPC-via-SQL pattern (endorsed)
Endorsed from EXECUTION_REPORT §7. Codify in skill as the preferred approach for ON CONFLICT verification.

### P-EXEC-2 — Soft-delete vs hard-delete cleanup matrix (endorsed)
Endorsed. The FK cascade dance is the #1 time-sink of load-test cleanup; a pre-built recipe table would shave 2-3 minutes per SPEC.

## 6. Verdict

🟢 **CLOSED.**
- ✅ ON CONFLICT DO NOTHING verified at scale: `inserted=0, conflicted=9955`.
- ✅ Queue total invariant held under re-enqueue.
- ✅ Zero `queue_insert_failed: duplicate key` log rows (the SPEC A failure mode is GONE).
- ✅ Zero real customer sends.
- ✅ Demo restored bit-identical to baseline.
- ✅ Prizma untouched.

**Defense-in-depth fully landed.** The dispatch pipeline now has three independent layers preventing the original incident's failure mode: operator-confirm brake (SPEC A) → atomic SCE claim (SPEC B) → atomic queue ON CONFLICT (SPEC C). Each layer is independently sufficient to prevent its specific race shape; together they're redundant by design.

---

*End of FOREMAN_REVIEW.*
