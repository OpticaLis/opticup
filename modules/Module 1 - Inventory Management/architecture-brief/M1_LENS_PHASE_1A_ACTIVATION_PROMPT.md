# Activation Prompt — M1 Lens Inventory Phase 1A (Schema + Platform Catalog Admin)

> **Paste this into a fresh Claude Code chat to dispatch Phase 1A to the Executor.**
> **Sibling Brief:** `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_PHASE_1_BRIEF.md`
> **SPEC:** `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/SPEC.md`
> **Sibling Phase 1B SPEC stub** (DO NOT execute yet): `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1B_CUSTOMER_SCREENS/SPEC.md`

---

## Activation prompt — paste into a fresh chat

```
Full Auto Pipeline — M1 Lens Inventory Phase 1A (Schema + Platform Catalog Admin).

SPEC: modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/SPEC.md

Activate the `opticup-executor` skill. Read the SPEC end-to-end. Then run the standard
Bounded-Autonomy execution loop:

1. Step 0 — repo + branch + integrity-gate confirmations per CLAUDE.md §1 First Action.
2. Step 1 — load and validate the SPEC. Apply executor improvements from recent
   FOREMAN_REVIEWs (live-state baseline probe, identifier-existence verification,
   cross-section consistency).
3. Step 1.5 — DB Pre-Flight: `list_tables` to confirm none of the 17 new table names
   exist; capture current max migration number; capture current `js/shared.js` T-constant
   count (expected 40, see SPEC §0 BASE_SHARED_TCONST); list pre-existing untracked files
   and leave them all alone (use selective `git add` by filename throughout).
4. Steps 2–N — execute per the 12-commit plan in SPEC §10. Stop on deviation, not on success.
5. At close — write EXECUTION_REPORT.md + FINDINGS.md inside the SPEC folder + 22-criterion
   actuals table + smoke-test record + executor-skill improvement proposals. Capture
   BEFORE_STATE.json before any change.

Iron Rules: 31 apply. Most likely tested in this SPEC: Rules 1, 11 (atomic RPCs +
sequential numbers via FOR UPDATE), 14 (tenant_id NOT NULL on every tenant-scoped table —
currencies + vat_rates are documented exceptions), 15 (canonical RLS — JWT-claim USING +
service_bypass; platform-owned tables use the two-permissive owner_view + public_view
pattern per handoff), 18 (UNIQUE includes tenant_id; platform tables include
owner_tenant_id), 21 (No Duplicates — see SPEC §1.5 cross-reference check),
22 (defense-in-depth tenant_id on every insert/upsert/select), 31 (integrity gate at
every commit), 32 (Destructive Operations — SPEC §7 declares NONE on existing
tables/data; executor MUST stop and escalate if any destructive op surfaces).

Out of scope for this run:
- The 6 customer-facing screens (Phase 1B sibling SPEC — DO NOT touch its folder
  except to leave the stub in place)
- `modules/goods-receipts/` code extension with product_category dispatcher (Phase 1B)
- Legacy goods_receipts / shipments / shipment_items tables (M9 SPEC scope for shipments)
- M9 work — `lab_jobs.purchase_receipt_id`, K1, K3-consumer-side, K4 are M9 SPEC scope
- LLM-powered catalog import (Phase 2+; this SPEC ships structured xlsx only)
- Production tenant Prizma — smoke test runs on demo only
- Merge to main (Daniel-only after SPEC review + execution + tests)

On escalation: write to `modules/Module 1 - Inventory Management/escalations/{ISO_TS}_{topic}.md`
and emit one short English line (per Daniel's terminal-rendering preference) referencing the
escalation file path. Then halt.
```

---

## Pre-flight checklist for the dispatcher (Daniel)

Before pasting the activation prompt:

- [ ] Brief sealed and on develop (`b4a3745` — verified at SPEC author time, 2026-05-14)
- [ ] Phase 1A SPEC committed and pushed
- [ ] Phase 1B stub committed and pushed
- [ ] ROADMAP updated with Lens-1A + Lens-1B rows committed and pushed
- [ ] No other M1 SPEC currently in-flight (last sealed M1 SPEC was on 2026-04-27)
- [ ] Demo tenant accessible (slug `demo`, UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`)
- [ ] Supabase MCP server is connected (the executor needs `apply_migration`, `execute_sql`, `deploy_edge_function`, `list_tables`)

---

## Expected execution timeline

- DB schema + migrations: ~45–90 minutes
- RPCs + trigger + view: ~30–45 minutes
- Edge Function (lens-catalog-import): ~30–45 minutes
- Platform Catalog Admin screen: ~60–90 minutes
- T-constants + FIELD_MAP + docs merges: ~20–30 minutes
- Smoke test + EXECUTION_REPORT + FINDINGS: ~20 minutes

**Total estimate: 3.5–5 hours of executor time.** Likely warrants a single uninterrupted session.

---

## What happens after Phase 1A closes

1. opticup-strategic (Foreman) reads the EXECUTION_REPORT + FINDINGS, writes FOREMAN_REVIEW.md.
2. The next opticup-strategic session reads Phase 1A's FOREMAN_REVIEW + applies its lessons
   to the **full** Phase 1B SPEC (currently a stub).
3. Optic Up team seeds the global lens catalog using the new Platform Catalog Admin screen
   + the lens-catalog-import EF, so Phase 1B can build the customer-facing screens against
   real catalog data.
4. Daniel authorizes the merge of Phase 1A to main (if QA on demo is clean).
5. Phase 1B execution begins.

---

*End of activation prompt.*
