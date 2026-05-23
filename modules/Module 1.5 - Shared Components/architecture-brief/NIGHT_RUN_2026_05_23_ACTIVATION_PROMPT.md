# Activation Prompt — Night-Run 2026-05-23 (Fixes + Migration + M9 Schema)

> Paste the block below into a FRESH Claude Code chat (NOT Cowork — DDL chain needs > 45s MCP timeout).
> Brief: `modules/Module 1.5 - Shared Components/architecture-brief/NIGHT_RUN_2026_05_23_BRIEF.md`
> Run-to-end overnight. ~10-14 hours. Single session.

---

```
Overnight Full-Auto Pipeline CHAIN — Cross-Contract Fixes + Leads Migration + M9 Schema. Schema-only + one gated production data migration. No UI. No merge to main.

Brief: modules/Module 1.5 - Shared Components/architecture-brief/NIGHT_RUN_2026_05_23_BRIEF.md

Activate the `opticup-strategic` skill (it authors each SPEC, dispatches `opticup-executor` to build, `opticup-reviewer` to review, then Foreman-reviews each). Skill state inherits all harvested patterns (mandatory inner-call arity audit + smoke-touched schema audit + concurrent-pipeline awareness + MIGRATION.md Applied Log + advisors-for-objects.mjs + P42 self-validate-before-delivery).

Read the Brief end-to-end FIRST. Then read the two review reports it consumes (M5_M8_STRATEGIC_REVIEW_REPORT.md + M5_M8_CODE_REVIEW_REPORT.md in the same folder) and the M9 v1 Brief (modules/Module 9 - Lab/architecture-brief/M9_LAB_BRIEF.md). Run the §6 pre-flight probes and pin every result as the §0 baseline — if any finding's premise is already resolved (trigger already attached, snapshot column already exists, etc.), note it and SKIP that fix; do not invent work.

THIS IS A CHAIN of three tracks in dependency order. Finish-the-sequence: no pause between tracks unless a real deviation fires.

=== TRACK 1 — Cross-Contract Fix SPEC (the 8 findings) ===
Author SPEC at: modules/Module 1.5 - Shared Components/docs/specs/M5_M8_CROSS_CONTRACT_FIXES/SPEC.md
Schema-only, ADDITIVE, ~12 migrations. ## Destructive Operations: None.
Fix the 8 findings per Brief §2 (fix directions are pre-decided there):
  F-A-1 lifecycle trigger on payments (first PAID ≥ ₪1 advances customer to active)
  F-B-1 rx_snapshot_jsonb on sub_orders, populated by add_sub_order at link-time
  F-B-2 first_payment predicate gate WHEN NEW.status='paid' AND NEW.amount>=1
  F-D1 partial unique (order_id) WHERE event_kind='first_payment' + exception-trap dedup
  F-C3/F-D2 mark_check_returned WHERE status='in_bank' + partial unique (payment_id) WHERE event_kind='check_returned'
  F-F1 tenant_id/order_id/customer_id indexes on payment_events_queue
  F-C2 CHECK amount>0 on payments + quantity>0 on sub_order_items
  F-F2 the 6 remaining unindexed FKs (one CREATE INDEX each)
Document the F-A-2 invariant in M7 db-schema (order quote→active only via sub_order; no new RPC).
MANDATORY Track 1 smoke 7/7 on demo (Brief §2). If ANY fail → STOP, escalate, HALT chain.
Track 1 MUST close 🟢 before Track 3 opens.

=== TRACK 2 — Leads-Migration SPEC (crm_leads → customers) ===
Author SPEC at: modules/Module 5 - Customers/docs/specs/M5_LEADS_MIGRATION/SPEC.md
Additive migration + FK-seam. ## Destructive Operations: declare the INSERT-into-customers + FK re-point; NO DROP of crm_leads (it stays live; M4 still uses it).
Scope per Brief §3: migrate crm_leads → customers (lifecycle_stage='lead' seam), phone-dedup against existing customers, re-point/seam the crm_leads FKs keeping M4 production functioning, demo-first (28) then Prizma (1,354).
MANDATORY Track 2 demo smoke 5/5. If ANY fail → STOP, escalate, HALT (do NOT touch Prizma).
Prizma 1,354-row write gate: only after demo 5/5 + a backup taken. Production write — backup-first, verify-after, report row counts before/after.

=== TRACK 3 — M9 Lab Schema SPEC (gated on Track 1 🟢) ===
Author MODULE_9_ROADMAP.md (schema phase) + SPEC at: modules/Module 9 - Lab/docs/specs/M9_SCHEMA/SPEC.md
Build against the SEALED M9 v1 Brief — do NOT re-design. Scope per Brief §4:
  ~10 tables (lab_jobs, lab_categories, lab_compensation_tiers, lab_notes, shipping_boxes, shipping_box_items, lab_damage_reasons, lab_couriers, lab_supplier_thresholds; lab_status_log = View over activity_log, NOT a table)
  5 engines (Clock via pg_cron, Compensation, Shipping Box, + the rest per M9 Brief §4) — DB functions/RPCs only, NO notification side-effects (WhatsApp/sound deferred to M12, foundation-first)
  cross-contract FKs to sub_orders/orders/customers + M1 supplier/courier
  M9-owned views; reuse v_lab_queue consumer side from M7
  Same discipline as M5-M8: canonical 2-policy RLS, SECURITY DEFINER + search_path + Block-A JWT guard, tenant-scoped UNIQUE, FK indexes, soft-delete, T-constants + FIELD_MAP, allocate_tenant_number reuse.
  If M9 ships its own lab_events_queue (Pattern P22) → it MUST include the partial-unique-on-source-id idempotency guard from day one (inherit the Track 1 / F-D1 lesson).
MANDATORY M9 smoke ≥8/8 + cross-contract on demo (Brief §4). If ANY fail → STOP, escalate, HALT.

=== CLOSE ===
Per track: opticup-reviewer → REVIEW.md + advisors-for-objects.mjs; opticup-strategic Foreman → FOREMAN_REVIEW.md. Module docs (SESSION_CONTEXT + CHANGELOG + MODULE_MAP + ROADMAP) updated per touched module. GLOBAL_MAP + GLOBAL_SCHEMA + DB_TABLES_REFERENCE merged additive. MIGRATION.md Applied Log (MCP-migration-heavy).

Iron Rules in sharp focus: 1, 2, 11, 14, 15, 18, 19, 21, 22, 23, 31, 32.

Out of scope (HARD — do NOT touch):
- ANY UI (customer card, order screen, checkout, M9 KDS/shipments/dashboard) — separate UI SPECs, Daniel-in-loop, Chrome MCP
- Drop/decommission of crm_leads — additive only; M4 runs on it
- Project-wide RLS-perf rewrite (181 auth_rls_initplan) — separate SPEC
- Anon-view REVOKE grants — separate project-wide SPEC
- customer_number_display width / short_code backfill — separate data write
- OpticPlus 5,028-customer historical import — separate migration
- M1 inventory-extension (lens/CL/accessory stock tables) — separate SPEC; M9 builds without it, document-defer the lens-specific FKs if absent
- Notification side-effects in M9 (WhatsApp/sound) — M12 owns delivery
- Merge to main (Daniel-only after QA)
- Relitigating the sealed M5/M6/M7/M8/M9 decisions

Branch: develop. Environment: Claude Code + Supabase MCP connected. Claim the pipeline-coordination session lock; no competing session on this repo. Demo tenant 8d8cfa7e-ef58-49af-9702-a862d459cccb (PIN 12345) for all functional smoke; DDL applies to both tenants; Prizma DATA writes only in Track 2's gated step (backup-first). Integrity gate clean before every commit, never --no-verify. Selective git add by filename only. Backups per Working Rule 9.9 + before the Prizma write.

Pipeline returns ONE Hebrew status line at chain end:
  "Night-Run [🟢/🟡/🔴]: Track1 fixes [smoke 7/7], Track2 leads-migration [demo 5/5 + Prizma 1354], Track3 M9 schema [smoke 8/8]. דו"חות בתיקיות הספקים. UI + visual QA = גל נפרד עם דניאל."

Stop on deviation, not on success. Run-to-end overnight. No track closes 🟢 without its smoke passing on demo. Per P42, self-validate every file write (line count + tail + markers) before declaring any phase complete. On escalation: write modules/Module {N}/escalations/{ISO_TS}_{topic}.md + one Hebrew line. Halt.
```

---

## Pre-flight checklist for Daniel

- [ ] Running in Claude Code, NOT Cowork (MCP 45s timeout would break the DDL chain)
- [ ] Working directory confirmed (Windows desktop / laptop / Mac)
- [ ] Branch = develop, repo = opticalis/opticup
- [ ] Supabase MCP connected
- [ ] No other Claude Code session running on this repo overnight (pipeline-coordination lock)
- [ ] Both M5-M8 review reports present (Strategic + Code) — the chain reads them

---

## Expected timing

- Pre-flight probes + baseline pin: ~30 min
- Track 1 (8 fixes SPEC + build + smoke 7/7): ~2.5-3.5 hours
- Track 2 (leads-migration SPEC + demo + Prizma 1,354): ~2.5-3.5 hours
- Track 3 (M9 schema SPEC + ~10 tables + 5 engines + smoke 8/8): ~4-5 hours
- Reviews + Foreman + docs merge per track: ~2 hours

**Total: ~10-14 hours.** Single overnight Claude Code session.

---

*End of activation prompt. Three tracks. Schema-only + one gated production migration. UI + visual QA are a separate later wave with Daniel.*
