# M1 — Final Completion Continuation (Phase 5 → 3 → 2 → 4)

**Author:** opticup-architect (Cowork, 2026-05-18 morning)
**Owning module:** Module 1 — Inventory Management
**Type:** Continuation of M1_FINAL_COMPLETION_NIGHT_BRIEF — runs the remaining 4 phases that didn't complete last night
**Estimated duration:** 4-7 hours total, sequenced from most-important-first
**Mode:** Single Pipeline, reordered for time-budget safety (CRITICAL phases first)

**Predecessors (already complete on develop):**
- M1_FINAL_NIGHT_PHASE_1_PRIVATE_CATALOG_UNIFIED ✅ (with Phase 1-FIX for OR-syntax bug)
- 4 of 5 pending-entries applied to skill files
- 3 test private brands seeded on demo (one per category)

**Source:** Daniel directive 2026-05-18 morning — Claude Code sessions consistently terminate after 2-3 phases. Reorder so the MOST IMPACTFUL phase (Phase 5 QA with Hoya+Zeiss seeding) runs FIRST. If the session terminates mid-Pipeline, the high-value work is already done.

---

## 1. Purpose

Phase 5 is the user-visible payoff: Daniel logs in, sees Hoya + Zeiss catalogs on demo, walks through real flows, validates that the past 3 days of work all hang together. If Phase 5 ships and the session dies after — the Pipeline still delivered the headline.

Phases 3 + 2 + 4 are debt + polish — important, but invisible to Daniel's morning check.

This Brief is **strictly continuation** — same Iron Rules, same constraints, same VFV mandate (now with the Phase 1-FIX lesson: "VFV must USE, not just inspect").

---

## 2. Pipeline Structure — 4 Phases, Reordered

```
Phase 5 — Comprehensive QA + Hoya+Zeiss Demo Seeding  [PRIORITY 1, 2-3h]
   ↓ functional VFV gate (must USE every surface)
Phase 3 — M1A FK Indexes  [PRIORITY 2, 1-2h]
   ↓ smoke gate (no UI)
Phase 2 — M1_CL_ACCESSORY_POLISH  [PRIORITY 3, 1-1.5h]
   ↓ smoke gate
Phase 4-continuation — Apply deferred 213-line skill entry  [PRIORITY 4, 30-60min]
   ↓ verification (grep marker text in skill file)
Foreman Close + Hebrew Summary
```

**Time-budget rule:** If the session detects it's been running >4h continuously, it MUST close cleanly at the next Phase boundary even if subsequent Phases haven't run. Document deferred Phases in the morning summary. Daniel restarts a new session for the rest if needed.

---

## 3. Phase 5 — Comprehensive QA (Priority 1 — runs first)

### 3.1 Demo Catalog Seeding (Hoya + Zeiss on Global catalog)

Same scope as the original Brief §7.2 but execute it NOW, in this Pipeline:

**Hoya brand:**
- Brand "Hoya" (verify exists; if not, create on global with `owner_tenant_id = NULL`, `product_type = 'glasses'`)
- 4 designs: Hoya Hilux EYAS BLC, Hoya Lifestyle V+, Hoya Sync III, Hoya Eyenavi Wild Life
- ~5 variants per design = ~20 variants total (mix of index 1.5/1.6/1.67/1.74, coatings, SPH range)

**Zeiss brand:**
- Brand "Zeiss" (verify exists; if not, create on global)
- 4 designs: Zeiss DriveSafe, Zeiss Progressive Individual 2, Zeiss SmartLife Single, Zeiss Officelens Plus
- ~5 variants per design = ~20 variants total

**Seed into:**
- `lens_brand`, `lens_design`, `lens_variant` (all `owner_tenant_id = NULL`, `product_type = 'glasses'`)
- `supplier_catalog_offering` linked to existing demo suppliers
- `pricing_overlay` for demo tenant (~40 retail-price rows, mix of default markup + 2-3 variant overrides)
- `tenant_active_offerings` for demo (activate all 40)
- Sample stock in primary demo location (random 0-15 qty per variant; ensure 8-10 below reorder threshold to trigger alerts)
- 3 POs on demo: 1 Hoya status='sent', 1 Zeiss status='partial' (50% received), 1 Hoya status='fully_received'

### 3.2 The 12 Flow Tests (per original Brief §7.5)

Chrome MCP at 1920×1080. Each flow MUST actually USE the UI (click buttons, enter data, submit) — not just inspect that elements exist. This is the lesson from Phase 1-FIX.

For each flow:
1. Navigate via real clicks (not URL injection)
2. Perform the action (enter data, submit form, click buttons)
3. Verify the action's result in BOTH the DB (SELECT to confirm row exists) AND the UI (toast/refresh/list-update)
4. Capture a screenshot of the SUCCESSFUL action result, not the loaded form

**The 12 flows:**

1. **Global catalog browsing as CEO** — see Hoya + Zeiss, no edit buttons
2. **Store activation** — activate 3 Hoya variants → verify `tenant_active_offerings` rows
3. **Pricing entry** — set ₪650 retail on one variant → verify `pricing_overlay` row
4. **PO creation** — create new PO with 3 line items → verify rows + status='sent'
5. **Goods receipt (full)** — receive the Hoya 'sent' PO → verify status transition + `stock_lot`/`stock_movement` rows
6. **Goods receipt (partial completion)** — receive remaining Zeiss qty → status='fully_received'
7. **Inventory view** — verify new Hoya stock from Flow 5 + ➖ adjustment (PIN-verified -2) → `stock_movement` row
8. **Private catalog browsing** — see "אופטיקה אורית" (seeded by previous session) → CRUD a new test brand "QA Test Brand"
9. **Clone-to-Private** — clone a Hoya brand → verify private copy with `cloned_from_id` reference + edit independently
10. **RLS isolation** — query as anon (only global), as Prizma context (0 demo-private rows), as demo context (full visibility)
11. **Contact-lenses category** — repeat Flows 1-4 in contact-lens nav (existing seed)
12. **Accessories category** — repeat Flows 1-4 in accessory nav (existing seed)

### 3.3 Data Preservation — MANDATORY

After all flows complete, **leave the seeded demo data INTACT**:
- All new Hoya + Zeiss brands/designs/variants (~40 variants)
- All demo activations, pricing, POs, receipts, stock
- The "QA Test Brand" created in Flow 8
- The cloned Hoya brand from Flow 9

Generate `_archive/m1-final-completion-2026-05-17/DEMO_DATA_MAP_UPDATED.md` with all new seed IDs + login URL + deep-links to each tab for Daniel's manual verification.

### 3.4 Autonomous Fix Loop

If any flow fails:
- Capture failure point + screenshot + DB state
- Diagnose within Phase 5 scope (i.e., the Hoya/Zeiss build or the flow infrastructure)
- Fix in next commit
- Re-run failed flow + all subsequent flows
- Document in EXECUTION_REPORT §"In-flight fixes"

If fix would require touching code outside M1 → log finding, don't block QA.

### 3.5 Phase 5 VFV Surfaces (the 12 flows themselves ARE the VFV)

Phase 5 closes 🟢 only if 12/12 flows PASS with USE-style verification + screenshots show successful actions. Any 🔴 → loop back to Executor in-flight.

---

## 4. Phase 3 — M1A FK Indexes (Priority 2)

Per original Brief §5. Apply 21+ partial FK indexes (scope may have grown due to Phase 1 schema additions — `cloned_from_id` columns added 3 indexes already; check for others).

No UI changes. Smoke gate only. Estimated 1-2 hours.

Re-run advisor probe `0001_unindexed_foreign_keys` post-migration — expect 0 findings in M1 scope.

---

## 5. Phase 2 — M1_CL_ACCESSORY_POLISH (Priority 3)

Per original Brief §4. Read FOREMAN_REVIEW.md of M1_CONTACT_LENSES_ACCESSORIES SPEC for the 5 polish items. Apply all 5.

Each polish item gets a smoke + targeted VFV (verify the specific user-observable concern is resolved).

Estimated 1-1.5 hours.

---

## 6. Phase 4-continuation — Apply Deferred Skill Entry (Priority 4)

The 213-line `2026-05-15_m1_close_ceremony_skill_updates.md` pending entry was deferred last night. Apply it now:
1. Read the entry
2. Apply each "File X — append to ..." instruction
3. Verify markers exist via grep
4. `git rm` the entry file

Verification: `_archive/architect-pending-entries/` is empty.

Estimated 30-60 minutes.

---

## 7. Iron Rule Compliance

Same as original Brief — unchanged. Iron Rules 1, 14, 15, 18, 19, 21, 22, 31, 32 all enforced.

---

## 8. Destructive Operations (Iron Rule 32)

Declared:

1. **INSERTs into Global catalog** — Hoya + Zeiss brands/designs/variants (`owner_tenant_id = NULL`) — authorized by Daniel for seed data
2. **INSERTs into demo tenant** — activations, pricing, POs, receipts, stock movements, "QA Test Brand"
3. **CREATE INDEX × ~21+** in Phase 3 — additive
4. **Polish ALTER/UPDATE statements** in Phase 2 — per FOREMAN_REVIEW guidance
5. **`git rm` of `2026-05-15_m1_close_ceremony_skill_updates.md`** after Phase 4-continuation
6. **`git tag` × 4** — one per Phase (pre-phase5, pre-phase3, pre-phase2, pre-phase4cont) + a master `pre-m1-continuation-2026-05-18`

**NOT authorized:**
- Any write to Prizma tenant — verify delta=0 after each Phase
- DROP of any table/column/policy/RPC/view
- Touching main branch
- Force-push, rebase, reset --hard outside Tier 5 emergency

---

## 9. Success Criteria

🟢 if:

1. **Phase 5 — 12/12 flows PASS with USE-style verification.** This is the headline.
2. Demo seeded data INTACT (`DEMO_DATA_MAP_UPDATED.md` exists with all new IDs)
3. **Prizma row-count delta = 0** verified 4 times (after each Phase)
4. Iron Rule 31 + 32 gates exit 0 every commit
5. Smoke 7/7 PASS at every Phase boundary
6. All commits pushed to develop
7. Morning summary written + Daniel's manual-verification checklist

🟡 if Phase 5 passes but Phases 3/2/4-cont deferred due to time budget — that's acceptable per §2 time-budget rule.

🔴 if Phase 5 fails or Prizma data touched.

---

## 10. Pre-Flight (mandatory before Phase 5 Commit 1)

1. **Concurrency guard** — only this CLI session active (Sentinel cron + Watcher + Desktop spawns OK)
2. **Smoke 7/7 PASS baseline**
3. **Localhost reachable** on both ports
4. **Prizma row-count snapshot** captured for delta verification
5. **Read EXECUTION_REPORT.md + FINDINGS.md** of M1_FINAL_NIGHT_PHASE_1_PRIVATE_CATALOG_UNIFIED — understand what Phase 1 actually delivered + what state the demo is in
6. **Verify the 3 private brands from last night exist on demo:**
   - "אופטיקה אורית — עדשות" (id bac58d89)
   - "אופטיקה אורית — עדשות מגע" (id 2506ca1d)
   - "אופטיקה אורית — אביזרים" (id 25c8dccc)
7. **`git tag pre-m1-continuation-2026-05-18`** before any commit

If any pre-flight reveals divergence → STOP, write finding, propose amendment.

---

## 11. Autonomous Decision Authority

Same as original Brief §13. Plus:

**Time-budget autonomy:**
- If Phase 5 takes longer than 3 hours, the Pipeline MAY skip Phase 2 (lowest-priority polish) to ensure Phase 3 + 4-continuation can complete
- If session approaches 4-hour mark, close at next Phase boundary regardless
- Always favor finishing the highest-priority remaining Phase over starting a lower-priority one

**Phase 5 specific:**
- Choose realistic SPH/CYL combinations for Hoya/Zeiss variants
- Decide whether to use existing demo suppliers or create Hoya/Zeiss-specific ones (recommend: existing)
- Choose retail-price markups (recommend: 1.5-2× wholesale)

**Background processes legitimate** per Brief §9.2 — Sentinel cron, Watcher, Desktop spawns, pending entries.

**Escalate ONLY for:**
- Prizma delta becomes non-zero — IMMEDIATE Tier 4 halt
- Pre-flight reveals fundamental state corruption
- Integrity gate fails repeatedly
- A QA flow surfaces data-corruption-class bug

---

## 12. Hebrew Morning Summary Template

```
🌅 בוקר טוב, דניאל.

ריצת ההמשך הסתיימה [🟢/🟡/🔴]. משך: [hh:mm].

שלב 5 (QA מקיף + זריעת Hoya+Zeiss): [N/12 flows PASS]
שלב 3 (אינדקסים): [status]
שלב 2 (ליטוש): [status]
שלב 4-המשך (סקיל): [status]

נתוני דמו חדשים מוכנים לבדיקה ידנית:
- Hoya: 4 דגמים, ~20 וריאנטים
- Zeiss: 4 דגמים, ~20 וריאנטים
- 3 הזמנות רכש (1 נשלחה, 1 חלקית, 1 הושלמה)
- מלאי + התראות מאוכלסים
- "QA Test Brand" + Hoya cloned-to-private נוצרו במהלך הבדיקות

מפת נתונים: _archive/m1-final-completion-2026-05-17/DEMO_DATA_MAP_UPDATED.md

מצב פריזמה: ללא נגיעה (delta = 0 על 25+ טבלאות, אומת 4 פעמים).

[אם דרושה פעולה ממך: שורה. אחרת: "אין פעולה דרושה — דמו מוכן לבדיקה ידנית"]
```

---

*End of Brief. Phase 5 first per Daniel directive on time-budget safety. Iron Rule 32 §Destructive Operations declared. VFV must USE not just inspect (Phase 1-FIX lesson applied). Background processes legitimate per §11.*
