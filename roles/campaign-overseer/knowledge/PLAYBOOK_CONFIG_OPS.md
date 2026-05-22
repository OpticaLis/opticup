# PLAYBOOK — M4 Config Operations (Templates / Rules / Broadcasts)

> **Synthesized 2026-05-22 from retiring `opticup-campaign-overseer` skill disciplines.** Captures the operational HOW for editing `crm_message_templates`, `crm_automation_rules`, `crm_broadcasts`, `crm_statuses`, `crm_field_visibility`, `crm_tags`.
> **Read when:** task in `CAMPAIGN_KB_MAP.md` row "M4 config op" — applying template wording, toggling rules, scheduling broadcasts.
> **Authority surfaces:** [`KB_MESSAGING`](KB_MESSAGING.md) §1 (IR35 boundary table) + [`KB_MODULE_4`](KB_MODULE_4.md) §2 (write-paths) + `M4_INFRASTRUCTURE_CONTRACT.md`. This PLAYBOOK is the operational layer; the KBs/contract are the canon.

---

## 1. The four rules before every config write

1. **L-001 — Verify infrastructure + test data before claiming "tested."** For every template/rule edit, list the dependencies it needs live (`%var%` resolver, `recipient_type`, `trigger_type`, EF version) and confirm each on the target environment (demo first, then Prizma). A test that depends on un-shipped infra produces false signal, not validation. Rule of thumb: if changing a template introduces or relies on a new variable, the resolver MUST be deployed FIRST or the substitution will silently emit raw `%var%` strings to recipients.

2. **L-003 — Verify ground truth before trusting any docs/HANDOFF.** Before acting on a claim of state (an old HANDOFF, an old brief, a memory entry from weeks ago), check at least 2 of: (a) git state (`git log` on relevant paths), (b) filesystem state (SPEC folder contents — SPEC.md / EXECUTION_REPORT.md / FINDINGS.md / FOREMAN_REVIEW.md), (c) external system (Supabase EF version, Vercel deploy, GitHub Pages commit, Make scenario activity timestamps), (d) DB state (live SELECT count + sample). If the doc and ground truth disagree — external system wins. Update the doc in the same response.

3. **L-004 — Probe schema BEFORE writing a SPEC/edit that depends on a column existing.** Run `information_schema.columns` / `pg_get_functiondef` / `\d table` probes BEFORE editing. A SPEC or migration that lies about the schema is a broken artifact. Example: REC-010 (restore-deleted-event) was originally written against a non-existent `crm_event_attendees.updated_at` column — Foreman scope-correction caught this only because of L-004 probing.

4. **State-as-you-go.** After every meaningful action — template applied, rule toggled, broadcast scheduled, finding captured — IMMEDIATELY update the relevant log. Never batch updates "for later" (L-003 lesson: batched updates fail to land when the session crashes).

## 2. Demo-first promote flow (Iron Rule 33) — the operational sequence

Every M4 config change (templates / rules / statuses / field-visibility / tags) MUST follow this exact order:

1. **Edit on demo** via DB or the UI (CRM admin). If the change adds/extends an existing placeholder usage, confirm `M4_INFRASTRUCTURE_CONTRACT.md` §1 already lists that placeholder.
2. **Test send on demo** to whitelist phones ONLY (`0537889878` + `0503348349` — per memory `feedback_test_data_phones`). Verify substitution produced no raw `%var%` strings in `crm_message_log` for the test rows.
3. **Verify outcome** end-to-end (the lead status updated correctly, the queue row produced a `sent` log, no rejection class fired).
4. **Promote to Prizma** via `scripts/promote-config-to-prizma.mjs` (single-row, audit-logged). Do NOT edit Prizma directly except in declared in-chat emergencies authorized by Daniel.
5. **Confirm on Prizma** with a no-recipient probe (read-only check that the row landed as expected, no live send).

Iron Rule 33 enforcement: Sentinel Mission 11 audits demo-vs-Prizma config-row counts + sample-hash drift daily, with a 24h grace window for legitimate mid-SPEC divergence. Skipping the flow trips the next day's alert.

## 3. IR35 escalation — when to STOP and open an Architect SPEC

You may NOT do any of the following inside the consolidated skill — they require an Architect SPEC:

| Trigger | Why |
|---|---|
| Add a new `%var_name%` placeholder | Resolver in `prepare-plan.ts` + `send-message` EF must be extended; raw `%var%` strings go to customers without it |
| Add a new `trigger_type` slug | `crm_trigger_type_registry` row + DB trigger function + `automation-engine` consumer handling |
| Add a new `action_type` value | `automation-engine` switch statement extension |
| Modify EF code (`automation-engine`, `send-message`, `dispatch-queue`, `fb-capi-dispatch`, `lead-intake`, `resolve-link`, `unsubscribe`, etc.) | Code change, not config |
| Modify DB triggers, migrations, RLS policies, materialized views | Schema/security |
| Modify SCE-producer functions (`event_status_change_event_fn`, `lead_status_change_event_fn`, `attendee_status_change_event_fn`) | Same risk class as new trigger |

**When you hit one of these mid-task:** STOP, write a one-line English status to Daniel ("Need Architect SPEC to extend X — stopping here"), open the SPEC request as a brief at `modules/Module 4 - CRM/architecture-brief/{YYYY-MM-DD}_{SLUG}_BRIEF.md`. Do not silently extend.

## 4. Operator-facing recovery surfaces (W1.1 + DELETE/RESTORE)

The consolidated skill operates these surfaces; know they exist before "fixing" what looks like a stuck message:

- **Resend Failed Messages button** (W1.1, 2026-05-20): per-row "שלח שוב" on the messaging log + queue surfaces; only fires for `resendable` error class (see `KB_MESSAGING §9` for classification). Resend INSERTs new `crm_message_queue` row with `run_id=NULL` to avoid `uq_crm_message_queue_idem` clash; writes `crm_audit_log` entry `action='crm.message.resend'`. NEVER updates the original log row.
- **Acknowledge Failed Messages** (`M4_FAILED_MESSAGE_BADGE_CLEANUP`, 2026-05-15): `acknowledge_failed_messages` RPC + per-lead × badge + bulk modal. Use this for known-resolved failures (e.g., the 758 historical Prizma `unsubstituted_placeholder` rows acked at the M4 cascade fix).
- **Delete-empty-event** (REC-009, DELETE_EMPTY_EVENT SPEC, 2026-05-04): gated on `SUM(purchase_amount)=0`; cascades soft-delete to attendees + cancels pending queue rows.
- **Restore deleted event** (REC-010, RESTORE_DELETED_EVENT_UI SPEC, 2026-05-04): Approach B — replays attendee_ids captured in the audit-log details. Pre-2026-05-04 audit rows restore event-only by design.

## 5. Message-send safety pattern (apply when any Prizma send is possible)

Before any op that could trigger Prizma sends (broadcast schedule, rule enable, status change, etc.):

1. Confirm no rows in `queued` / `processing` for the target audience.
2. **Freeze the pipeline** — cron off / rules off / `is_active=false` on the relevant template-rule pair.
3. Work on demo with fake test phones (`0537889878` + `0503348349`) or dry-run.
4. Deploy to Prizma WITH the pipeline still frozen.
5. Verify with a no-recipient probe.
6. Unfreeze.

At every moment either the valve is closed or you're on demo with fake phones. Zero practical chance a real participant gets an unintended message.

## 6. Anti-patterns — do not

- Do NOT edit Prizma directly when demo would suffice (Iron Rule 33). Direct-Prizma edits require Daniel's explicit in-chat go-ahead and a same-session demo-parity follow-up.
- Do NOT skip the `%var%` substitution char-count check post-substitution (see [`PLAYBOOK_MESSAGING`](PLAYBOOK_MESSAGING.md) §3).
- Do NOT trust a memory or old HANDOFF claim that names a specific function/column/flag — probe first (L-003 + L-004).
- Do NOT extend infrastructure (new placeholder / trigger / action / EF) inline — open an Architect SPEC (§3).
- Do NOT bypass `scripts/promote-config-to-prizma.mjs` for demo → Prizma promotion (it audit-logs each row; direct UPDATE on Prizma bypasses the audit trail).
- Do NOT propose anomaly-cleanup actions without L-005 Rule A (live-flow check — see `roles/campaign-overseer/LEARNINGS.md`).

---

*PLAYBOOK_CONFIG_OPS v1, 2026-05-22. Synthesized from `opticup-campaign-overseer` SKILL.md disciplines + LEARNINGS L-001/L-003/L-004 + Iron Rules 33/35. Refresh trigger: any new operator-facing recovery surface shipped, any change to the demo-first flow, any IR35 boundary clarification.*
