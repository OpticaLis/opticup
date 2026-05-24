# BRIEF — Channel-split ALL shared short links (S=SMS / E=email convention)

**Author:** Events-Operations (Cowork) · **For:** Claude Code via the SPEC pipeline (Foreman authors SPEC → Executor builds demo-first → Reviewer → Localhost-Tester) · 2026-05-24
**Companion:** ACTIVATION_PROMPT_channel_split_all_short_links.md
**Type:** Data + template-config change across M4 messaging (both tenants). Iron Rule 33 (demo-first) + Iron Rule 34 (any browser-consumed change verified) apply.

---

## Objective

Make every campaign short link **channel-attributable**, so we can measure whether SMS or email drives more clicks — for ALL templated short links, not just the supersale-launch ones already done. Apply the locked convention: a short-link `code` STARTS with the channel letter — `S`=SMS, `E`=email (future `W`=WhatsApp).

## Background — the convention (locked by Daniel 2026-05-24)

- Code STARTS with channel letter. Example already live: `SSLpw1` (SMS, supersale launch wave 1) + `ESLpw1` (email). The resolver (`resolve-link` EF) increments `short_links.click_count` per code, so one row per channel = per-channel measurement.
- **CRITICAL: codes must be GLOBALLY DISTINCT.** `resolve-link` does `WHERE code=$1` with `.maybeSingle()`, which ERRORS on duplicate → the link 404s. Demo and Prizma must use DIFFERENT codes for the same logical link. (This already bit us once.)
- One `short_links` row per (tenant, logical-link, channel). Use the `label` column to tag, e.g. `pricing_catalog_email` / `pricing_catalog_sms`.

## The work — exactly what needs splitting (verified live 2026-05-24)

There are 16 static short links; 11 templates reference them across 18 rows. **3 codes are currently shared across BOTH email and SMS templates and must be split per channel:**

| Current code | Purpose | Template refs | Action |
|---|---|---|---|
| `CEiBGCWj` | pricing/brand catalog | 6 (email+sms, both tenants) | create channel pair, repoint refs |
| `5CBy1Do4` | event stock page | 3 (email+sms) | create channel pair, repoint refs |
| `f9Avttrn` | takanon (terms) | 4 (email+sms) | create channel pair, repoint refs |

(`KvSzd3Zz` is email-only today, and the `SSL*/ESL*` supersale-launch codes are already channel-split — leave them, but if `KvSzd3Zz` is ALSO used on SMS anywhere, split it too. Verify during the SPEC.)

For each shared code, on EACH tenant:
1. Create two new `short_links` rows (same `target_url`, `link_type='template_static'`, `expires_at` 2099, `label` = `{purpose}_{channel}`), with globally-distinct codes following the convention — e.g. for the pricing catalog: prizma `ECATp`/`SCATp`, demo `ECATd`/`SCATd` (pick clear, collision-checked codes; verify free against ALL existing codes before insert).
2. In every EMAIL template that referenced the old shared code → repoint to the new `E…` code (that tenant's).
3. In every SMS template that referenced the old shared code → repoint to the new `S…` code (that tenant's).
4. Keep the OLD code row alive (don't delete) until verified, then it can be retired in a follow-up — old printed/forwarded links must keep resolving. (Recommend: leave old rows in place; they just stop accruing new template refs.)

Demo-first: do demo tenant first, verify a click on each new code increments the right row, then Prizma.

## Constraints / rules

- ERP repo `opticalis/opticup`, branch `develop`. Iron Rules 1-23 + 31-35.
- Iron Rule 33: demo first, then promote to Prizma (use `scripts/promote-config-to-prizma.mjs` for the template body changes, or the SPEC's own audited path).
- Iron Rule 34: templates are browser-consumed (rendered in email/SMS). Verify each repointed link RESOLVES (curl/Chrome) and that a click increments the correct per-channel `click_count` row. Provide DB-query evidence.
- Do NOT modify `resolve-link` EF or the click-counting logic. This is data + template-body work only.
- Codes globally distinct — collision-check every new code against the full `short_links` table before insert.
- No deletes of existing short-link rows in this SPEC (retirement is a separate follow-up).

## Expected deliverables / verification evidence

- New channel-split `short_links` rows on both tenants for the 3 shared codes (+ `KvSzd3Zz` if it's dual-channel).
- Every email/SMS template repointed to its channel code; zero templates still referencing the old shared code on the "wrong" channel.
- Resolve test (curl or Chrome) for each new code → 200 to the right target; DB query showing each test click landed on the correct per-channel row.
- A measurement query: per logical-link, SMS clicks vs email clicks.
- Clean repo at close. EXECUTION_REPORT + FINDINGS + FOREMAN_REVIEW.

## Note for Foreman

This pairs naturally with the separate `M4_SHORT_LINKS_CHANNEL_DASHBOARD` BRIEF (the screen that displays per-channel totals). They can be sequenced: data/convention first (this SPEC), dashboard second. Mention the dependency.
