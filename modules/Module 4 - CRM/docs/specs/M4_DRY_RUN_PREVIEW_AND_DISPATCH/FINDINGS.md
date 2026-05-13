# FINDINGS — M4_DRY_RUN_PREVIEW_AND_DISPATCH

Generated 2026-05-14. Findings raised during overnight Full Auto Pipeline run.
All severities follow the project convention (INFO / LOW / MEDIUM / HIGH / CRITICAL).

---

## F1 (LOW) — Demo email allowlist superset re-observed (pre-existing)

**Location:** `tenants.ui_config.test_mode_email_allowlist` for demo tenant `8d8cfa7e-...`.

**Observation:** Demo's email allowlist contains 3 entries — the 2 Brief-listed (`daniel@prizma-optic.co.il`, `alkimovich94@gmail.com`) plus 1 extra (`danylis92@gmail.com`). The SMS allowlist is an exact match with the Brief (`+972537889878`, `+972503348349`, `+972507168471`).

**Why it's LOW, not HIGH:** This is a SUPERSET — the safety net is wider than the Brief's recipient policy, not narrower. The dangerous failure mode (Daniel's address missing from the allowlist → safety net blocks legitimate test sends) is NOT present. The extra entry is Daniel-shaped (`danylis92` = Daniel + 1992).

**Already documented:** `modules/Module 4 - CRM/escalations/2026-05-14T00-15Z_LEGACY_DISPATCH_DECOMMISSION_ALLOWLIST_SUPERSET.md` — same classification, same mitigation. Pipeline applied the same discipline this run: SMS test plans address only the 3 Brief-listed phones; no test emails were sent during this run.

**Suggested next action:** Daniel's morning review chooses (a) keep the live allowlist (extra entry is Daniel-owned, harmless to the Pipeline) and update future Briefs to reflect the 3-entry list, OR (b) issue `UPDATE tenants SET ui_config = jsonb_set(...)` to drop the extra entry. Either keeps this SPEC's results valid. **Recommended: (a).**

---

## F2 (INFO) — `crm_message_log.template_slug` is the full slug, not the base

**Location:** `supabase/functions/automation-engine/preview.ts:fetchLastMessages` — returns `template_slug` as stored in `crm_message_log` (e.g., `event_registration_open_sms_he`), not the base (`event_registration_open`).

**Why it matters:** The UI display in the body-expand panel (Phase 7 §3.10) shows `📩 הודעה אחרונה: <date> — <slug>`. The slug shown will be the channel+language-suffixed form, not the base. Operators may find this verbose / less recognizable than the base slug they see in the rule editor.

**Why I didn't fix:** The send-message EF stamps the full slug into the log at dispatch time, which is correct for delivery audit. Trimming the `_${channel}_${language}` suffix at read time in `preview.ts` would require knowing the channel+language pair to strip — easy but the slug shape isn't a guaranteed contract.

**Suggested next action:** Open a small SPEC `M4_PREVIEW_HISTORY_SLUG_DISPLAY` (~10 min) to either (a) strip the suffix in `preview.ts` when the suffix is recognized, OR (b) display both the human-readable rule_name (looked up from `crm_automation_rules`) and the slug. Option (b) is richer but adds a join.

---

## F3 (INFO) — Phase 5 (test-send to first 3) effectively untested on demo

**Location:** `modules/crm/crm-confirm-send-v2.js` `handleTestSend` + supporting machinery.

**Observation:** The demo tenant currently has only 3 active (`is_deleted=false AND unsubscribed_at IS NULL`) leads (P55 Daniel Secondary, איליה טסט, דניאל טסט). For most active automation rules, the resolved recipient list returns 1 or 2 of these — but the rule's recipient_type filter narrows further. The `event_status_change → registration_open` rule resolves only 1 (P55) in Phase 2 smoke. With <3 visible-checked recipients, the test-send button is disabled.

**Why I didn't fix:** Demo data shape is outside this SPEC's scope. Implementation tested via direct EF call (Phase 8 Smoke A) with `recipient_subset` of 1 — proving the EF path works for arbitrary subsets.

**Suggested next action:** When demo is seeded with more leads (per `M4_DEMO_SEED` or similar future SPEC), Daniel manually exercises the test-send button by triggering a rule that resolves ≥3 demo recipients (e.g., a future `waiting → invited` flow on a seeded campaign). For now, **Pipeline's go/no-go is GREEN** on the test-send code path — only the operator-driven UX smoke is deferred.

---

## F4 (INFO) — Body-preview's email view shows HTML source, not rendered HTML

**Location:** `crm-confirm-send-v2-render.js:renderExpandedBody` (the email block).

**Observation:** When operator expands a recipient's body preview, the email channel shows the full HTML source escaped inside a `<pre>` (read-only, no rendering). This is **by design** (Iron Rule 8 — never trust authored template HTML to render unsanitized client-side, even if the EF substituted server-side). The operator's primary inspection goal is verifying variable substitution, not previewing visual layout.

**Implication:** If Daniel wants visual preview later, that's an out-of-scope future SPEC. Pattern: a same-origin sandboxed iframe with the email HTML written via `srcdoc` — safe for rendering. Out of scope here.

**Suggested next action:** Defer to a `M4_EMAIL_PREVIEW_SANDBOX_IFRAME` SPEC if Daniel asks for rendered preview. Document the current behavior in the morning summary so Daniel knows the design intent before reviewing.

---

## F5 (INFO) — Cancel toast does not auto-refresh K/M counts after pg_cron drain

**Location:** `modules/crm/crm-broadcast-cancel.js:cancelByRunId`.

**Observation:** The cancel helper returns `{cancelled, alreadyProcessed, total}` at click time. The toast renders these counts and auto-dismisses after 6s. If the pg_cron drains additional rows between the cancel click and the dismiss, the displayed `alreadyProcessed` count is the snapshot at click time — not live.

**Why it's INFO not LOW:** The displayed number is correct at the moment of cancel. If the operator wants the latest count, they can query `crm_message_queue` directly. The toast's purpose is "did the cancel work?", not a live monitoring widget.

**Suggested next action:** No action recommended. If a future SPEC wants live counts, swap the toast for a Modal that polls `crm_message_queue` every 5 seconds until counts stabilize. Out of scope for this SPEC.

---

## F6 (INFO) — `automation-engine` MCP deploy succeeded; no fallback needed

**Location:** Phase 2 deploy via MCP `deploy_edge_function`.

**Observation:** Brief §4.8 anticipated the OPEN-021 `InternalServerError` pattern that has bitten multiple prior runs (5+ recurrences across April-May 2026). This run's deploy was clean — v14 → v15 in a single call. `DEPLOY_FALLBACK_NEEDED.md` was NOT written. `verify_jwt=true` preserved.

**Note worth recording:** The MCP deploy intermittency observed previously may have been resolved server-side. Future Briefs may want to soften the language around OPEN-021 ("if it fires" rather than "OPEN-021 pattern persists"). Carry this forward as a sentinel-of-resolution datapoint.

---

*End of FINDINGS.md.*
