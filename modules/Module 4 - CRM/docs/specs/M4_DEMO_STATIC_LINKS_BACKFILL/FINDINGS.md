# FINDINGS — M4_DEMO_STATIC_LINKS_BACKFILL

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_DEMO_STATIC_LINKS_BACKFILL/FINDINGS.md`
> **Written by:** opticup-executor
> **Written on:** 2026-05-21

---

## F-01 — Pre-Pipeline integrity-gate ERROR on Daniel's untracked email-preview scratch [INFO]

**Severity:** INFO — repaired in-place per Iron Rule 31 recipe; no SPEC scope impact.

**Location:** `regopen_email_preview.html` (repo root, untracked at session start).

**Description:** At Executor First Action, `npm run verify:integrity` reported `1 violation`:

> `[null-bytes] regopen_email_preview.html — contains 9 NUL bytes (first at offset 13271) — Cowork-VM-style padding; repair by truncating content at offset 13271 and adding a trailing LF`

Investigation: file is Daniel's untracked working scratch — an HTML preview of an email he's drafting (matches the SPEC request §3 background context where Daniel is mid-change on `event_registration_open` email body). Last 9 bytes (offset 13271–13280) were pure Cowork-VM EOF NUL padding; HTML content ended cleanly at byte 13271 with `</html>\n`. No mid-content corruption.

**Action taken:** repaired in-place per Iron Rule 31's own recipe — truncated to byte 13271 and appended a single trailing LF. HTML content preserved 100%. File remains UNTRACKED (Daniel's scratch artifact, not staged for any commit in this SPEC). Post-repair integrity gate: `All clear — 18 files scanned`.

**Suggested next action:** none — repaired, integrity gate clean, SPEC unaffected. If Daniel intends to keep the file at repo root long-term, it should be archived to `_archive/scratch/` or `roles/campaign-overseer/briefs/` per CLAUDE.md §0.5 Root Discipline Rule (Category 1/2/3 enforcement). For now, the file is fine where it is.

**Rule 21 / Rule 31 status:** the repair was sanctioned by Iron Rule 31's documented recipe; no rule violation.

---

## F-02 — `short_links_code_unique` index is global, not tenant-scoped (Iron Rule 18 deviation) [MEDIUM, deferred]

**Severity:** MEDIUM (SaaS-litmus failure for tenant #3+; tenants 1+2 unaffected today).

**Location:** `public.short_links` — index `short_links_code_unique` (`CREATE UNIQUE INDEX short_links_code_unique ON public.short_links USING btree (code)`).

**Description:** During SPEC authoring's P-AR-02 live-DB probe, I confirmed that `short_links.code` carries a GLOBAL UNIQUE constraint (just on `code`), NOT tenant-scoped (`(tenant_id, code)`). This violates Iron Rule 18 ("UNIQUE constraints must include tenant_id"). Today's tenants happen not to collide (demo + prizma codes are randomly generated, near-collision-probability), but tenant #3 could collide when onboarding if their code generator produces a code already in use by another tenant.

This is a PRE-EXISTING deviation, NOT introduced by this SPEC. Already noted in `SPEC_TEMPLATE.md` Appendix A7 ("UNIQUE constraint must include tenant_id (Iron Rule 18) ... `short_links.code`") as a known item.

This SPEC's migration RESPECTS the global-unique reality — code generation loop verifies `NOT EXISTS (SELECT 1 FROM short_links WHERE code = v_new_code)` (global scope), not tenant-scoped. So no IR18 violation INTRODUCED here.

**Resolver impact:** the `resolve-link` EF (`supabase/functions/resolve-link/index.ts:227`) looks up by `.eq("code", code)` without tenant scoping. Fix would require either:
- Adding tenant scoping to the URL (`/r/{tenant_slug}/{code}` or `?t=<slug>&code=<X>`) and updating all message templates that emit `/r/<code>` URLs, OR
- Accepting the global-unique design as a deliberate cross-tenant lookup affordance and rephrasing IR18 to exclude this specific table.

**Suggested next action:** open a separate SPEC `M4_SHORT_LINKS_CODE_UNIQUE_TENANT_SCOPING` post-cutover (before tenant #3 onboarding). The SPEC needs to decide between the two fix shapes above, audit all callers (broadcast wizard, automation engine template-static substitution, resolve-link EF, short-links stats screen), and ship the migration + code updates as a coordinated change. Add to `TECH_DEBT.md` register with ID `M4-DEBT-SHORT-LINKS-CODE-IR18`.

---

## F-03 — Demo static_link infrastructure was never seeded to parity with prizma [LOW, fixed by this SPEC]

**Severity:** LOW — the root cause that prompted this SPEC; now resolved.

**Location:** `public.short_links` rows where `tenant_id = demo` and `link_type = 'template_static'`.

**Description:** Pre-SPEC state: demo had 2 `template_static` rows (`NCoQWzbd` takanon, `dsruWc1z` gamaf) while prizma had 4 (also stock + pricing-catalog). The 2 missing demo rows (stock + pricing-catalog) were never created — a per-tenant content parity gap. The Performance Analyst's diagnosis (`roles/campaign-overseer/analyses/2026-05-21_short_links_screen_visibility.md`) established that the CRM short-links stats screen is rendering correctly; the apparent "missing" rows simply did not exist on demo.

**Resolved by this SPEC.** Post-C1 state: demo has 4 `template_static` rows. Parity with prizma achieved for the SuperSale campaign static-link surface.

**Broader concern (NOT in scope for this SPEC):** there is no automated mechanism preventing future demo-vs-prizma drift on `link_type='template_static'` rows. Iron Rule 33 mandates demo-first for templates / rules / broadcasts (covered by `scripts/promote-config-to-prizma.mjs` + Sentinel Mission 11) but NOT for static-link infrastructure rows. The Analyst's recommendation 4.3 proposed extending Mission 11 to cover this.

**Suggested next action:** queue a separate SPEC `M4_STATIC_LINKS_IR33_PARITY_MONITOR` (LOW priority, deferred per Brief §7). For now, manual operator vigilance is the only guard.

---

## F-04 — Short-links stats screen has no UX cue that the static section ignores the filter bar [INFO]

**Severity:** INFO — UX clarity issue, no functional impact.

**Location:** `modules/crm/crm-short-links-tiles/template-static-card.js` line 28–32 (the section header).

**Description:** The "קישורים סטטיים (משותפים)" card uses `tenant_id + link_type + expires_at` as its only filter; it does NOT consume the global filter-bar state (`onlyWithClicks`, `days`, `linkTypeFilter`). Operators encountering the screen for the first time naturally assume the filter bar applies to all sections (broadcasts table + static card + drill-down). The Analyst's investigation showed Daniel himself initially hypothesized "default filters hide pricing-catalog" — a hypothesis the code reading refutes.

**Suggested next action:** open a separate SPEC `M4_SHORT_LINKS_STATIC_CARD_HELPER_TEXT` (LOW priority) to add a one-line caption under the section header: e.g., "מציג את כל קישורי התשתית הפעילים — אינו מושפע מהמסננים למטה". IR34 (UI VFV) applies at SPEC close. Daniel may choose to defer indefinitely if the gap is too narrow to justify the SPEC overhead — the gap will mostly close once the M4_SHORT_LINKS_CODE_UNIQUE_TENANT_SCOPING fix lands (F-02) and the campaign team builds a "+ create static link" UI affordance.

---

## F-05 — Migration filename template hint in `SPEC_TEMPLATE.md` §9 contradicts repo convention [LOW]

**Severity:** LOW — discoverable but cost ~30 seconds of confusion at executor start.

**Location:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §9 "Expected Final State" — paragraph "Migration file naming (when SPEC creates a SQL migration): use `YYYY_MM_DD_<spec_slug>_up.sql` for the forward migration + a paired `YYYY_MM_DD_<spec_slug>_down.sql`..."

**Description:** The repo's actual migration-file convention is `YYYYMMDDHHMMSS_<slug>.sql` (Supabase canonical — no underscores in the timestamp, no `_up`/`_down` pair, no separate down file — rollback SQL lives in `ROLLBACK.md` per template §6's separate rule). The 10 most recent migrations (e.g. `20260520040000_m4_message_queue_cleanup_cron.sql`) all use this form. The `_up.sql` hint is from an older 2026-04-29 convention that was superseded but the template paragraph wasn't updated.

**Suggested next action:** edit `SPEC_TEMPLATE.md` §9 to:
- Remove the `YYYY_MM_DD_<spec_slug>_up.sql` hint.
- State: "Use Supabase canonical migration naming `YYYYMMDDHHMMSS_<slug>.sql`. The `_down.sql` paired-file convention is DEPRECATED (since 2026-04-29) — rollback SQL belongs in `ROLLBACK.md` per template §6 doc-context rule, NOT in a separate `.sql` file."

This is a Foreman-skill improvement, not Executor-skill. Will surface in Foreman Proposal 1 in FOREMAN_REVIEW.md.

---

*5 findings logged. None blocks SPEC closure. F-01 self-resolved; F-02 + F-03 + F-04 + F-05 are deferred to separate SPECs or TECH_DEBT.*
