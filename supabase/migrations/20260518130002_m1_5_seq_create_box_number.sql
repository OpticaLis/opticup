-- M1_5_SEQUENTIAL_NUMBERING_MIGRATE_TO_PG_SEQUENCES Phase 2 — 3/8
-- Create sequence for shipments.box_number. START 2 = current MAX (1) + 1.

CREATE SEQUENCE public.seq_box_number AS bigint START 2 INCREMENT 1 MINVALUE 1 NO CYCLE;
GRANT USAGE ON SEQUENCE public.seq_box_number TO authenticated;
