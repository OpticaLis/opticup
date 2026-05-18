-- M1_FOUNDATION_CLOSE_CLEANUP_2026_05_17 Commit 3 (DB migration part)
-- Drops the 8-arg signature of m1_create_receipt_from_box. Both runtime
-- consumers (lens-inventory-main.js + lens-goods-receipt-close.js) migrated
-- to the 9-arg overload in commits 2 + 3 of this Pipeline.
--
-- No CASCADE needed — the function is called via PostgREST rpc(); no SQL
-- objects depend on it. Verified via exhaustive grep across js/ + modules/
-- + supabase/ before this migration.
--
-- Reversible by re-running the 8-arg CREATE from commit
-- modules/Module 1 - Inventory Management/docs/specs/M1_INVENTORY_DEBT_DECOUPLING/
-- (the last touch on this signature, 2026-05-17 morning).

DROP FUNCTION public.m1_create_receipt_from_box(uuid, uuid, text, jsonb, uuid, text, text, uuid);
