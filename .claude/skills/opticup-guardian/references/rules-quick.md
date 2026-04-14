# Optic Up — 30 Rules Quick Reference

Quick-scan version. For full explanations, see SKILL.md or CLAUDE.md.

## Iron Rules (1–13)

| # | Rule | One-Line Check |
|---|---|---|
| 1 | Atomic quantity changes | Using RPC with `quantity = quantity + x`? PIN verified? |
| 2 | writeLog() on changes | Every quantity/price change calls writeLog()? |
| 3 | Soft delete only | Using `is_deleted` flag? Permanent delete has double PIN? |
| 4 | Barcode format sacred | Format is BBDDDDD? Not touching barcode logic? |
| 5 | FIELD_MAP complete | New DB field added to FIELD_MAP in shared.js? |
| 6 | index.html in root | Not moving index.html? |
| 7 | API abstraction | Using shared.js helpers, not sb.from() directly? |
| 8 | Security & sanitization | No innerHTML with user input? Using escapeHtml()/textContent? |
| 9 | No hardcoded values | Tenant name/address/tax/logo from config/DB, not literals? |
| 10 | Name collision check | Ran grep before creating/renaming global function? |
| 11 | Sequential via RPC | Using atomic RPC with FOR UPDATE, not SELECT MAX+1? |
| 12 | File size ≤350 lines | File under 300 (target) / 350 (absolute max)? |
| 13 | Views-only external | Storefront/suppliers reading from Views+RPC only? |

## SaaS Rules (14–20)

| # | Rule | One-Line Check |
|---|---|---|
| 14 | tenant_id everywhere | New table has `tenant_id UUID NOT NULL REFERENCES tenants(id)`? |
| 15 | RLS everywhere | Two policies: service_bypass + tenant_isolation with JWT claims? |
| 16 | Module contracts | Calling contract functions only, not reaching into other modules' tables? |
| 17 | Views for external | Planned what external parties need to see? |
| 18 | UNIQUE includes tenant | UNIQUE constraint is `(field, tenant_id)` not just `(field)`? |
| 19 | Tables not enums | Configurable values in tables, not hardcoded enums? |
| 20 | SaaS litmus test | Would a second tenant in a different country work with zero code changes? |

## Hygiene Rules (21–23)

| # | Rule | One-Line Check |
|---|---|---|
| 21 | No orphans/duplicates | Searched for existing similar thing before creating new? |
| 22 | Defense-in-depth | tenant_id in writes AND selects (even with RLS)? |
| 23 | No secrets in code | No passwords/keys/tokens in .js, .md, or git history? |

## Storefront Rules (24–30) — opticup-storefront repo ONLY

| # | Rule | One-Line Check |
|---|---|---|
| 24 | Views/RPCs only | No direct table access from storefront? |
| 25 | Image proxy | All images through /api/image/[...path].ts? |
| 26 | Transparent backgrounds | Product images on bg-white containers? |
| 27 | RTL-first | Using logical CSS (inline-start/end), never left/right? |
| 28 | Mobile-first | Tested narrowest breakpoint first? |
| 29 | View Modification Protocol | Following declared protocol before modifying Views? |
| 30 | Safety Net testing | Running safety-net scripts before commit? |

## Pre-Commit Hooks Enforce Automatically

Rules checked by hooks (safety net even if agent forgets):
- Rule 12: File size limit
- Rule 14: tenant_id presence
- Rule 15: RLS presence
- Rule 18: UNIQUE constraint scope
- Rule 21: No orphans
- Rule 23: No secrets

## Red-List SQL Keywords (auto-escalate to Daniel)

`DROP` · `TRUNCATE` · `ALTER POLICY` · `DISABLE RLS` · `GRANT` · `REVOKE`
