-- P31 ROLLBACK — drops the required_variables column added by the up.sql.
-- Per SPEC §9: clean reversal; templates revert to having no contract metadata.
-- The EF will need to be redeployed with validation removed before this is safe.

ALTER TABLE public.crm_message_templates DROP COLUMN IF EXISTS required_variables;
