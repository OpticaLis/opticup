-- 2026-05-11_design_tokens_neutral_defaults.sql
-- Phase 1 of Design System initiative.
-- SPEC: modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_TOKENS_FOUNDATION/SPEC.md
--
-- Forward: write Prizma's current Indigo identity into tenants.ui_config so the
-- platform-default swap to neutral slate (in shared/css/variables.css, same commit
-- range) leaves Prizma rendering unchanged.
--
-- Demo tenant is intentionally untouched.
-- Empty ui_config = use variables.css defaults (which are now neutral slate).

UPDATE tenants
SET ui_config = COALESCE(ui_config, '{}'::jsonb)
              || jsonb_build_object(
                   '--color-primary',       '#4f46e5',
                   '--color-primary-hover', '#4338ca',
                   '--color-primary-light', '#eef2ff',
                   '--color-primary-dark',  '#3730a3'
                 )
WHERE slug = 'prizma';

-- Verification (executor pastes result into EXECUTION_REPORT §2):
-- SELECT slug, ui_config FROM tenants WHERE slug IN ('prizma','demo') ORDER BY slug;

-- ROLLBACK (commented — Prizma had ZERO --color-* keys at baseline 2026-05-11):
-- UPDATE tenants
-- SET ui_config = ui_config - '--color-primary' - '--color-primary-hover'
--               - '--color-primary-light' - '--color-primary-dark'
-- WHERE slug = 'prizma';
