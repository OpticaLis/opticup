-- M4_HARDCODED_PRIZMA_REMOVAL — rollback
-- Reverts prizma's seeded values back to NULL/minimal. Demo values stay
-- (test data, not blocking on rollback).

BEGIN;

UPDATE public.tenants
   SET business_phone   = NULL,
       business_address = NULL,
       ui_config = ui_config
                 - 'whatsapp_phone_e164'
                 - 'support_phone_display'
                 - 'storefront_url'
                 - 'brand'
 WHERE slug = 'prizma';

COMMIT;
