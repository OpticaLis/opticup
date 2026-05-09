# Site Overseer — LEARNINGS

> **Purpose:** Append-only log of methodology lessons learned during Site Overseer
> work. Each entry codifies a rule that should be applied to all future audits
> so a past failure cannot recur.
> **Scope:** Site Overseer only. Project-wide lessons go to `docs/LEARNINGS.md`.
> **Created:** 2026-05-08 (during M3_WP_SUBDOMAINS_REDIRECT execution).

---

## Format

```
### L-SITE-NNN — short-name (YYYY-MM-DD)

- **Trigger incident:** What went wrong (with SPEC reference).
- **Lesson:** The rule, stated as an imperative.
- **How to apply:** Concrete check or step that operationalises the rule.
- **Cost of skipping:** What happens if a future audit skips this step.
```

---

## Entries

### L-SITE-001 — subdomain enumeration before audit scope (2026-05-08)

- **Trigger incident:** `M3_SITE_COMPREHENSIVE_REVIEW` (executed 2026-05-07) audited
  `https://prizma-optic.co.il` (canonical apex + `www`) but did NOT enumerate or
  inspect the legacy WordPress subdomains `ru.prizma-optic.co.il` and
  `en.prizma-optic.co.il`. Both were live, indexed in Google, and rendered
  contradictory content (old phone `053-434-7265`, old prices, stale legal text).
  ~1,675 indexed URLs of customer-rendered content went uninvestigated. Daniel
  flagged the gap on 2026-05-07. The follow-up SPEC `M3_WP_SUBDOMAINS_REDIRECT`
  caught this — but only because Daniel manually noticed the subdomains, not
  because the audit harness enumerated them.
- **Lesson:** Every Site Overseer Mode A discovery scan MUST start with a DNS
  subdomain enumeration of the canonical apex domain BEFORE defining audit
  scope. The audit covers the apex + every subdomain that resolves and serves
  HTTP, not just the marketing canonical (`www.`).
- **How to apply:**
  1. Resolve `dig +short NS <apex>` to find the authoritative DNS server.
  2. Probe a deterministic list of common subdomain candidates:
     `www`, `app`, `api`, `cdn`, `mail`, `webmail`, `cp`, `cpanel`, `cp2`,
     `ftp`, `mx`, `mx1`, `mx2`, `staging`, `dev`, `test`, `old`,
     and every two-letter ISO 639-1 language code (`he`, `en`, `ru`, `ar`,
     `fr`, `es`, `de`, `it`, `pt`, `nl`, `pl`, `tr`, `zh`, `ja`).
  3. For each that resolves, probe `https://{sub}.{apex}/` and
     `https://{sub}.{apex}/sitemap_index.xml` or `/sitemap.xml`.
  4. Any subdomain that returns 200 is in scope for the audit, regardless
     of whether the project owner remembers it.
  5. Log every probed subdomain (resolved or not, 200 or not) in the
     audit's discovery report so the next audit can verify nothing was
     dropped.
- **Cost of skipping:** Indexed legacy content keeps duplicating the canonical
  site for SEO purposes (duplicate-content penalty), keeps rendering stale
  customer-facing data (wrong phone, wrong prices), and keeps existing
  in Google's index for months after the migration — silently undermining
  the new site even as the team believes the migration is complete. In the
  M3_SITE_COMPREHENSIVE_REVIEW case this gap masked 1,675 URLs and 60+ days
  of post-migration customer harm.

---

*End of LEARNINGS.md.*
