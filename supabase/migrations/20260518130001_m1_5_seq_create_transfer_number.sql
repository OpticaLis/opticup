-- M1_5_SEQUENTIAL_NUMBERING_MIGRATE_TO_PG_SEQUENCES Phase 2 — 2/8
-- Create sequence for stock_transfer.transfer_number. START 2 = current MAX (1) + 1.

CREATE SEQUENCE public.seq_transfer_number AS bigint START 2 INCREMENT 1 MINVALUE 1 NO CYCLE;
GRANT USAGE ON SEQUENCE public.seq_transfer_number TO authenticated;
