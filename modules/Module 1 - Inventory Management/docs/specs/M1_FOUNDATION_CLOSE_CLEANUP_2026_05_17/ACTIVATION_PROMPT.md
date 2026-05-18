# ACTIVATION_PROMPT — M1_FOUNDATION_CLOSE_CLEANUP_2026_05_17

**Paste into Claude Code session on Daniel's Windows desktop.** Same session that closed SPEC 4a or new — both ok.

---

You are **opticup-executor**. Execute the SPEC at:

```
modules/Module 1 - Inventory Management/docs/specs/M1_FOUNDATION_CLOSE_CLEANUP_2026_05_17/SPEC.md
```

This is the Foundation-close cleanup mini-SPEC. Estimated ~1h. Resolves F-2 (RPC overload) + F-4 (stub removal) from SPEC 4a FOREMAN_REVIEW. F-5 (sell-price placeholder) explicitly out of scope — deferred to SPEC 5.

## Bootstrap

1. Load skill `opticup-executor`. First Action.
2. Pre-Action Collision Check:
   ```powershell
   node scripts/pipeline-coordination.mjs claim --spec-slug M1_FOUNDATION_CLOSE_CLEANUP_2026_05_17 --files-owned-globs "supabase/migrations/**,modules/inventory/**,modules/Module 1 - Inventory Management/**,inventory.html,js/lens-inventory-*" --branch develop
   ```

## Critical pre-flight (before Commit 1)

Per SPEC §5 + §6 stop-triggers — **grep exhaustively for consumers of `m1_create_receipt_from_box` 8-arg signature**:

```powershell
cd C:\Users\User\opticup
Select-String -Path "js\*.js","modules\**\*.js","supabase\functions\**\*.ts" -Pattern "m1_create_receipt_from_box" -SimpleMatch
```

Expected: 1 hit (`lens-inventory-quick-receipt-bridge.js` from SPEC 4a). If you find 2+ → STOP, escalate, propose wrapper option per §5.

## Execute SPEC

Read SPEC.md in full. 4-commit plan:

1. **Commit 1 — DB migration:** Create 9-arg RPC `m1_create_receipt_from_box` with new `p_has_no_invoice BOOLEAN` param. Apply via Supabase MCP `apply_migration`. Run `get_advisors` after — must be clean.

2. **Commit 2 — JS refactor:** Edit the single consumer to call 9-arg RPC directly with `p_has_no_invoice` parameter. Remove the 2-step UPDATE workaround that follows the RPC call. Verify file stays under Iron Rule 12 350-line cap.

3. **Commit 3 — Stub + manifest cleanup:** `rm modules/inventory/lens-inventory-quick-scan.js`. Remove its reference from loader-manifest (likely `modules/inventory/lens-inventory-init.js` or `inventory.html` script tag — grep to find).

4. **Commit 3.5 (within Commit 3 or after JS verification):** DROP the old 8-arg signature via migration. Verify no consumers remain.

5. **Commit 4 — Closeout:** EXECUTION_REPORT.md + FINDINGS.md + update Module 1 SESSION_CONTEXT + CHANGELOG. Tier C VFV must pass (open drawer, check "אין תעודה", submit, verify DB row has `has_no_invoice=TRUE` without 2-step UPDATE).

## Tier C VFV is MANDATORY (SPEC §8)

Don't skip this. The cleanup must prove the new path works end-to-end:
- Chrome MCP: navigate localhost:3000/inventory.html → demo tenant → lens tab → open Quick Receipt drawer
- Stage 1 item, check "אין תעודה" checkbox, fill supplier
- Submit
- Supabase MCP query: `SELECT id, has_no_invoice, created_at FROM purchase_receipt ORDER BY created_at DESC LIMIT 1`
- Expected: 1 row, `has_no_invoice=TRUE`, recent timestamp
- Soft-delete the row: `UPDATE purchase_receipt SET is_deleted=TRUE WHERE id = '<the_id>'` per Iron Rule 3
- Save 2 screenshots to SPEC folder `screenshots/`

## No time budget

Per parent Brief.

## Closeout

1. EXECUTION_REPORT.md + FINDINGS.md (FINDINGS should note: F-2 + F-4 RESOLVED; F-5 still deferred to SPEC 5)
2. Update Module 1 SESSION_CONTEXT + CHANGELOG
3. Update GLOBAL_MAP if RPC signature changed (it did — add note)
4. Commit + push to origin/develop
5. Release coordination lock
6. Notify Daniel: cleanup result, screenshots saved, Foundation Phase 100% complete

After this Pipeline closes 🟢, Cowork-Architect:
- Writes brief FOREMAN_REVIEW.md
- Authorizes Groups A/B/C dispatch (6 screen rebuilds in parallel worktrees, ~10-14h wall clock)

**Bounded Autonomy. Stop only on deviation.**
