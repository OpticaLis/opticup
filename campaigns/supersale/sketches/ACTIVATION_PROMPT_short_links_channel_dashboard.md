You are the Optic Up Foreman (opticup-strategic skill). Author a SPEC for an ERP UI feature, then hand it to the Executor pipeline. Full context is in campaigns/supersale/sketches/BRIEF_short_links_channel_dashboard.md — read it first, in full.

GOAL (two linked upgrades to the short-links screen, M4/CRM area of the ERP):
(A) Per-channel click view: campaign manager sees clicks per campaign wave, defaulting to a compact TOTAL-per-wave row, with a channel filter (הכל / SMS / מייל, extensible to WhatsApp) to break it down by channel.
(B) Channel-aware "create short link" flow: the "+ קישור קצר חדש" dialog lets the operator choose SMS-only, email-only, or BOTH — "both" creates the matched S/E pair pointing to the same target_url in one action. The form auto-generates convention-compliant codes; the operator never hand-types codes.

KEY FACTS (verified live 2026-05-24, do not re-derive):
- LOCKED convention: a short-link code STARTS with the channel letter — S=SMS, E=email, W=WhatsApp (FIRST char, not last). Live examples on Prizma: SSLpw1 (sms), ESLpw1 (email), SSLpw2, ESLpw2; demo uses distinct codes SSLdw1/ESLdw1/SSLdw2/ESLdw2. The short_links.label column tags each as {purpose}_{channel} (e.g. supersale_launch_wave1_sms).
- Grouping key for the view = the logical link (shared part of the code after the channel letter, or label minus _sms/_email). Channel = the leading letter.
- short_links.click_count is auto-incremented by resolve-link EF per redirect (proven). For headline numbers, click_count per code is sufficient. Richer ledgers (short_link_clicks, crm_lead_touchpoints) exist but are OUT OF SCOPE.
- resolve-link looks up WHERE code=$1 with .maybeSingle() → codes MUST be globally distinct; demo and prizma use different codes for the same logical link. The create-flow (B) must collision-check each generated code against the FULL short_links table before insert, and scope to the current tenant.
- DO NOT touch the resolve-link EF or the counting logic. View part (A) is read-only. Create part (B) writes new short_links rows only (no edits to existing rows, no schema change to short_links itself beyond using existing columns).
- Links that don't follow the convention (legacy per-lead links, no channel letter) must still display, in an "אחר/ללא ערוץ" bucket — never hidden.

RULES IN FORCE: ERP repo opticalis/opticup, branch develop, Iron Rules 1-23 + 31-35. This touches browser JS/HTML so Iron Rule 34 applies — closure REQUIRES Chrome MCP evidence (screenshot of default view + screenshot after the SMS filter + screenshot of the create-dialog with the channel choice + runtime trace + DB-query evidence the displayed totals equal SUM(click_count) grouped by wave/channel, AND that "create both" produced exactly two correctly-coded rows) AND the Visual-Fidelity Gate region table in TEST_REPORT.md + FOREMAN_REVIEW.md. Reads via existing helpers/Views (Rule 7/13); writes via shared helpers (Rule 7) with tenant_id (Rule 22); any new aggregation View needs tenant_id + RLS (Rules 14/15/17). Surgical edits.

DESTRUCTIVE OPERATIONS: declare None — additive display logic + additive create-rows + (optionally) one new tenant-scoped aggregation View. No deletes/renames/drops/main.

DEPENDENCY: this SPEC depends on M4_SHORT_LINKS_CHANNEL_SPLIT (the data/convention SPEC) — author/sequence this one AFTER that one lands so the convention is fully in place.

OUTPUT: write the SPEC to modules/Module 4 - CRM/docs/specs/{SPEC_SLUG}/SPEC.md per the folder-per-SPEC protocol (list the specs dir first to avoid a duplicate slug + harvest the 3 most recent FOREMAN_REVIEW proposals). Suggested slug: M4_SHORT_LINKS_CHANNEL_DASHBOARD. Then produce the Executor ACTIVATION_PROMPT as its own copy-pasteable file. Do NOT execute the build yourself — Foreman authors, the pipeline builds.
