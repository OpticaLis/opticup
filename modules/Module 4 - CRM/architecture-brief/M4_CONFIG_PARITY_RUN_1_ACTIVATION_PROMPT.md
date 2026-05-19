You are running a Full-Auto Pipeline SPEC for the Optic Up project. Read the Brief at:

`modules/Module 4 - CRM/architecture-brief/M4_CONFIG_PARITY_RUN_1_BRIEF.md`

Author the SPEC (`opticup-strategic` skill — Foreman role), then execute via Foreman → Executor → Reviewer → Localhost-Tester → Foreman close.

**Pre-conditions:**

1. `M4_CONFIG_SYNC_INFRASTRUCTURE` 🟢 closed on develop. The scripts at `scripts/sync-prizma-config-to-demo.mjs` and `scripts/promote-config-to-prizma.mjs` exist.
2. `git status` clean.
3. No active automation runs in last 5 min on demo or Prizma.
4. Pipeline lock claimed (`scripts/pipeline-coordination.mjs claim --spec-slug=M4_CONFIG_PARITY_RUN_1`).
5. Smoke 7/7 PASS pre.

If any pre-condition fails, STOP + Hebrew line to Daniel.

**The destructive op this SPEC executes:** running `sync-prizma-config-to-demo.mjs --allow-destructive` against the LIVE Supabase. This deletes diverged demo rows and overwrites them with Prizma's. This is pre-authorized via the Brief §4.

**Constraints:**

- ONLY demo tenant gets writes. Prizma is read-only the entire run.
- Pre + post JSON snapshots are MANDATORY in `_archive/m4-config-snapshots/`.
- Audit row in `crm_audit_log` or `platform_audit_log` is MANDATORY.
- Iron Rules 12/31/32 enforced.

**When done:**

> "M4_CONFIG_PARITY_RUN_1 🟢 נסגר. [N] commits. דמו עכשיו ראי לפריזמה: [X] templates זהים, [Y] rules זהים. snapshots ב-_archive/m4-config-snapshots/. SPEC הבא: M4_AUTOMATION_TEMPLATE_VARIABLE_RESOLVER_FIX."

Read the Brief and start.
