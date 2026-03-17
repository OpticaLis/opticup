-- =============================================================================
-- Module 1.5 — Shared Components Refactor — DB Schema
-- =============================================================================
-- This file tracks all DB changes made by Module 1.5.
-- Updated after every phase that modifies the database.
-- =============================================================================

-- Phase 1: Per-tenant theming via ui_config JSONB on tenants table
-- Executed: 2026-03-16
-- Purpose: Allows each tenant to override CSS Variables via DB config.
--          loadTenantTheme() reads this column and injects values into :root.
--          Default {} means variables.css defaults apply (zero visual change).
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS ui_config JSONB DEFAULT '{}';

-- ui_config structure:
-- {
--   "--color-primary": "#1a56db",
--   "--color-primary-hover": "#1e429f",
--   "--font-family": "Rubik, sans-serif"
-- }
-- Keys must start with "--" (enforced by theme-loader.js, not DB constraint).
-- Empty {} = use variables.css defaults (current Prizma design).
-- No RLS change needed — tenants table already has tenant isolation policy.
-- No index needed — one row per tenant, not searchable.
