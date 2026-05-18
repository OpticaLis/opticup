---
spec_id: M1_LENS_GOODS_RECEIPT_REBUILD
authored: 2026-05-18 IDT
total_findings: 1
status: 🟡 closed-with-HIGH-finding — rebuild verified; smoke blocked by pre-existing demo data corruption
---

# FINDINGS — M1_LENS_GOODS_RECEIPT_REBUILD

## F-1 — HIGH (PRE-EXISTING) — `next_lot_number` cannot parse 3 corrupt demo `stock_lot.lot_number` values

**Surface area:** `public.next_lot_number(p_tenant_id uuid)` RPC body, line:

```sql
SELECT COALESCE(MAX(CAST(SUBSTRING(lot_number FROM LENGTH(v_prefix) + 1) AS INT)), 0)
  INTO v_max_seq
  FROM stock_lot
  WHERE tenant_id = p_tenant_id AND lot_number LIKE v_prefix || '%';
```

**Trigger:** any call to `m1_create_receipt_from_box` on demo tenant — which `PERFORM`s `next_lot_number` per receipt line — fails with `22P02 invalid input syntax for type integer: "PO300005-1"`.

**Root cause:** demo `stock_lot` table contains 3 rows with non-numeric suffixes:

```
LOT-PO300005-1
LOT-PO300005-2
LOT-PO300005-3
```

These were seeded by an earlier manual SQL test (NOT by any production code path) and predate this SPEC by weeks. They violate the implicit invariant that all `lot_number` values match `LOT-{6-digit-NNNNNN}`.

**Why this surfaced now:** SPEC 8 Tier C is the first attempted programmatic receipt creation on demo since these rows were seeded. SPEC 6 (Purchase Order) and SPEC 7 (POs List) did not touch `m1_create_receipt_from_box`. The rebuild correctly calls the 9-arg RPC; the RPC's internal `next_lot_number` is what fails.

**Status:** PRE-EXISTING. **Not introduced by this SPEC.** The same failure would occur with the pre-rebuild code (no JS code change involved). My Step 1.6 + 1.7 pre-flight verified paths and RPC arity — neither would have caught the data-state issue in a downstream RPC's seq-number generator.

**Decision: STOP at smoke per SPEC §6, escalate to Daniel.**

### Resolution paths (Foreman/Daniel decide which)

**Option A — Data cleanup SPEC `M1_LENS_GR_DEMO_LOT_NUMBER_CLEANUP` (~10 min):**

```sql
-- Rename the 3 corrupt lot_numbers to safe numeric format
UPDATE stock_lot
   SET lot_number = 'LOT-000900' || substring(lot_number from 'LOT-PO300005-(.)$')
 WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
   AND lot_number LIKE 'LOT-PO300005-%';
-- Result: LOT-000901, LOT-000902, LOT-000903 (or pick any free range)
```

Pros: 3-line fix, instantly unblocks all future GR smokes, zero RPC change.
Cons: Doesn't prevent future corruption if someone else seeds non-numeric suffixes manually.

**Option B — Resilience SPEC `M1_RPC_NEXT_LOT_NUMBER_NON_NUMERIC_SAFE` (~30 min):**

Modify `next_lot_number` (and the 3 sibling `next_*_number` RPCs that use the same `MAX(CAST(SUBSTRING(...) AS INT))` pattern: `next_po_number`, `next_purchase_order_number`, `next_receipt_number`) to filter the WHERE clause to ONLY rows where the suffix is numeric, e.g.:

```sql
WHERE tenant_id = p_tenant_id
  AND lot_number LIKE v_prefix || '%'
  AND SUBSTRING(lot_number FROM LENGTH(v_prefix) + 1) ~ '^[0-9]+$'
```

Pros: makes ALL sequential-number generators resilient to ad-hoc seed data forever.
Cons: 4 RPCs to update; needs a small migration + advisor check.

**Foreman recommendation:** Option B. Pre-existing data may have similar suffix-corruption for other prefixes (PO/RCP/TRN). 30-minute fix that prevents the entire class.

### Lessons re-confirmed (not new findings)

1. **DB-state dependencies are silent until they fire.** Step 1.6 path verification + Step 1.7 consumer grep + Step 1.5 schema pre-flight all passed. The defect was inside an RPC's sequence-number generator — invisible to path/consumer/schema checks. The only way to catch it pre-flight would be a "live RPC dry-run on demo" step, which isn't standard practice and would have its own pitfalls.
2. **Iron Rule 21 (no orphans/duplicates) extends to data convention adherence.** Seeded test data should follow the same conventions as production-RPC-generated data. A future TECH_DEBT could be a "demo data sanity check" sentinel mission.

## Proposals for opticup-strategic (Foreman) skill

**P-AUTHOR-1 (NEW)** — Add a "Sequence-number generator pre-flight" sub-step to §1.5 DB Pre-Flight when the SPEC's smoke involves any RPC that calls a `next_*_number` function. The probe is a single SQL query:

```sql
-- For each next_*_number used by the SPEC's RPC path:
SELECT lot_number FROM stock_lot
WHERE tenant_id = '{demo_tid}'
  AND NOT (SUBSTRING(lot_number FROM 5) ~ '^[0-9]+$')
LIMIT 5;
```

Apply to `next_lot_number` (lot_number), `next_receipt_number` (receipt_number), `next_po_number` (po_number), `next_transfer_number` (transfer_number). If ANY non-numeric suffix found → flag in §0 BEFORE sealing the SPEC. ~60 seconds; catches this defect class at author time.

Source: F-1 above. Catching at author-time prevents the surprise-at-smoke escalation.

## Proposals for opticup-executor skill

**P-EXEC-1 (NEW)** — When an RPC smoke fails with `22P02 invalid input syntax for type integer`, the executor should immediately suspect a **sequence-number generator** (`next_*_number`) parsing non-conforming suffixes — not a payload defect. The Tier C debug flow should be:

1. Capture full error code + message.
2. If code is `22P02` AND message contains "invalid input syntax for type integer" AND the failing RPC is in the K-RPC family that PERFORMs `next_*_number` — query `pg_get_functiondef` of `next_*_number` AND search the target table for non-conforming suffix values.
3. If found → flag as F-X (PRE-EXISTING), STOP per Bounded Autonomy.

Codify as a 3-line decision tree in SKILL.md under "Tier C error triage" subsection. Source: F-1 above. ~3 minutes of debug saved per future occurrence; more importantly, prevents executors from blaming the JS payload.

---

**END FINDINGS**

_1 HIGH (PRE-EXISTING, NOT INTRODUCED BY THIS SPEC). 0 MEDIUM, 0 LOW, 0 INFO. 2 SKILL proposals harvested. 1 deviation (Tier C blocked, properly escalated per §6)._
