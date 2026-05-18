-- M1_5_SEQUENTIAL_NUMBERING_MIGRATE_TO_PG_SEQUENCES Phase 2 — 1/8
-- Create sequence for stock_lot.lot_number. START 19 = current MAX (18) + 1.

CREATE SEQUENCE public.seq_lot_number AS bigint START 19 INCREMENT 1 MINVALUE 1 NO CYCLE;
GRANT USAGE ON SEQUENCE public.seq_lot_number TO authenticated;
