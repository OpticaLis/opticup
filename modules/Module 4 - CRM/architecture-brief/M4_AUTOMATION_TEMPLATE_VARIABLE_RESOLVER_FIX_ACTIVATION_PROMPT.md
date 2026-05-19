You are running a Full-Auto Pipeline SPEC for the Optic Up project. Read the Brief at:

`modules/Module 4 - CRM/architecture-brief/M4_AUTOMATION_TEMPLATE_VARIABLE_RESOLVER_FIX_BRIEF.md`

Author the SPEC (Foreman role), then execute via Foreman → Executor → Reviewer → Localhost-Tester → Foreman close.

**Pre-conditions:**

1. `M4_CONFIG_PARITY_RUN_1` 🟢 closed.
2. `git status` clean.
3. Pipeline lock claimed.
4. Smoke 7/7 PASS.

**Touch points:**

- `supabase/functions/automation-engine/` — extend the variable resolver.
- `tests/smoke/automation-resolver-test.mjs` — new regression test.
- EF redeploy.

**Constraints:**

- Reuse `B8_DAY_OF_WEEK_TIMEZONE_FIX` day-of-week logic byte-for-byte.
- Currency symbol from `tenants.ui_config.currency` — never hardcoded (Iron Rule 9).
- Test phone allowlist only for demo smoke (`0537889878` / `0503348349`).
- §4 Destructive Operations: `None.` declared.
- Iron Rules 12/31/32 enforced.

**When done:**

> "M4_AUTOMATION_TEMPLATE_VARIABLE_RESOLVER_FIX 🟢 נסגר. [N] commits. EF v[X] deployed. רגרסיה ירוקה. שינוי סטטוס באירוע #28 → status='sent'. SPEC הבא: M4_STATUS_CHANGE_MODAL_GATE_FIX."

Read the Brief and start.
