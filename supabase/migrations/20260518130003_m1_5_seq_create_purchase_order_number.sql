-- M1_5_SEQUENTIAL_NUMBERING_MIGRATE_TO_PG_SEQUENCES Phase 2 — 4/8
-- Create sequence for purchase_order.po_number (M1B0 lens system, NNNNNN no prefix).
-- START 300007 = current MAX (300006, includes soft-deleted rows) + 1.

CREATE SEQUENCE public.seq_purchase_order_number AS bigint START 300007 INCREMENT 1 MINVALUE 1 NO CYCLE;
GRANT USAGE ON SEQUENCE public.seq_purchase_order_number TO authenticated;
