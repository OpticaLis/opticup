You are the Optic Up Foreman (opticup-strategic skill). Author a SPEC, then hand it to the Executor pipeline. Full context: campaigns/supersale/sketches/BRIEF_channel_split_all_short_links.md — read it first, in full.

GOAL: Make every templated campaign short link channel-attributable so we can measure SMS-vs-email clicks. Apply the locked convention: short-link code STARTS with the channel letter (S=SMS, E=email, future W=WhatsApp). The supersale-launch links are already split (SSLpw1/ESLpw1/SSLpw2/ESLpw2). This SPEC covers the REST.

KEY FACTS (verified live 2026-05-24, do not re-derive — but DO re-verify counts before mutating):
- short_links.click_count is auto-incremented per code by resolve-link EF. One row per channel = per-channel measurement. DO NOT touch resolve-link or the counting logic.
- resolve-link does WHERE code=$1 with .maybeSingle() → codes MUST be globally distinct. Demo and Prizma use DIFFERENT codes for the same logical link. Collision-check every new code against the entire short_links table before insert.
- 3 codes are currently shared across BOTH email and SMS templates and MUST be split: CEiBGCWj (pricing catalog, 6 refs), 5CBy1Do4 (stock, 3 refs), f9Avttrn (takanon, 4 refs). Also check KvSzd3Zz — split it too IF it is used on SMS anywhere (currently email-only).
- For each shared code, on EACH tenant: create an E-code + an S-code (same target_url, link_type='template_static', expires_at 2099, label='{purpose}_{channel}'), then repoint every EMAIL template ref → E-code and every SMS template ref → S-code. Keep the OLD row alive (no deletes — retirement is a separate follow-up) so forwarded/printed old links keep resolving.

RULES IN FORCE: ERP repo opticalis/opticup, branch develop, Iron Rules 1-23 + 31-35. Iron Rule 33 demo-first then promote to Prizma. Iron Rule 34 — templates are browser-consumed: verify each repointed link RESOLVES (curl/Chrome 200 to the right target) AND that a click increments the correct per-channel click_count row; provide DB-query evidence + the Visual-Fidelity considerations where a rendered email/SMS is involved. Surgical edits.

DESTRUCTIVE OPERATIONS: declare it explicitly. This SPEC should be ADDITIVE (new short_links rows + template body repoints). NO deletes of existing short_links rows. No drops/renames/main. If the Executor finds it needs to delete a row, STOP and escalate.

OUTPUT: write the SPEC to modules/Module 4 - CRM/docs/specs/{SPEC_SLUG}/SPEC.md per the folder-per-SPEC protocol (list the specs dir first to avoid a duplicate slug + harvest the 3 most recent FOREMAN_REVIEW proposals). Suggested slug: M4_SHORT_LINKS_CHANNEL_SPLIT. Note the dependency/sequence with M4_SHORT_LINKS_CHANNEL_DASHBOARD (data/convention first, dashboard second). Then produce the Executor ACTIVATION_PROMPT as its own copy-pasteable file. Do NOT execute the build yourself — Foreman authors, the pipeline builds.
