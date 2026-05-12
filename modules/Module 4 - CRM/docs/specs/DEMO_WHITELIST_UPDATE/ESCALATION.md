# ESCALATION — Email allowlist mechanism does not exist

> **Date:** 2026-05-11
> **Module:** 4 — CRM
> **From:** Full-Auto Pipeline (opticup-strategic acting as Foreman)
> **To:** Architect (`opticup-architect`) → Daniel
> **Brief reference:** `DEMO_WHITELIST_UPDATE_BRIEF.md` §6 Decision #5
> **Status:** OPEN — awaiting Architect decision

---

## 1. The gap

Diagnosis (see sibling `DIAGNOSIS.md`) confirmed there is **no email allowlist mechanism anywhere in the dispatch chain**:

- No `tenants.test_mode_email_allowlist` (or any `*_email_allowlist` / `*_email_whitelist`) column.
- No whitelist key in `tenants.ui_config` jsonb for either demo or Prizma.
- `send-message` Edge Function (v21) has zero email-side gating: SMS goes through `phoneAllowed()`, email goes straight to `writeDispatchAndSend` → Make webhook → email provider.

The C-001 SPEC (2026-05-03) explicitly deferred this to a post-cutover follow-up:

> "Email allowlist. The QA night-run flagged 'no email allowlist' as a separate MEDIUM finding — that's a different SPEC for post-cutover."
> — `C001_SEND_MESSAGE_PHONE_ALLOWLIST_REMOVAL/SPEC.md §10 (Out of scope)`

This SPEC is the trigger to act — Daniel's manual test cycle starts soon, and any email dispatch from demo currently has no envelope. Per the Brief, the SPEC does NOT auto-add a column or jsonb key — Architect chooses the path.

---

## 2. Concrete operational risk

If demo dispatches an email today (e.g., Daniel triggers an event-confirmation email to a test lead with a real-looking address), the email goes to whatever address is in `crm_leads.email` for that lead. There is no protection against:
- A test lead row accidentally seeded with a real address.
- A real-customer row accidentally hit by a test-mode automation.
- Daniel's own automation tinkering producing an email to a third party.

Blast radius is bounded (demo has very few leads), but non-zero. Today's SMS allowlist is a tight envelope; the email side is open.

---

## 3. Three options (Architect chooses)

### Option 1 — Add a dedicated column (mirrors SMS pattern)

```sql
ALTER TABLE tenants
  ADD COLUMN test_mode_email_allowlist JSONB NULL;

COMMENT ON COLUMN tenants.test_mode_email_allowlist IS
'When NULL: email to any address is allowed (production mode).
When NOT NULL: must be a JSONB array of email strings — only those addresses receive email, all others rejected with email_not_allowed (test mode).
Mirrors test_mode_sms_allowlist (added by C-001).';
```

Plus an EF refactor adding `emailAllowed()` mirroring `phoneAllowed()`, plus a gate before `writeDispatchAndSend` for the email channel.

**Pros:** symmetric with SMS pattern. Discoverable. Matches `tenants` column-level conventions.

**Cons:** schema change → migration → git-drift risk per TD-2. Touches the EF (which is well-tested ground but still a code change). Larger blast radius than option 2.

**Effort estimate:** Half-day SPEC. ~3 commits (migration + EF + tenant pre-population).

---

### Option 2 — Add a jsonb key to `ui_config` (RECOMMENDED — minimal disruption)

```sql
UPDATE tenants
SET ui_config = jsonb_set(
  ui_config,
  '{test_mode_email_allowlist}',
  '["danylis92@gmail.com", "daniel@prizma-optic.co.il", "alkimovich94@gmail.com"]'::jsonb
)
WHERE id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
```

Plus a 5-line EF helper that reads `tenant.ui_config?.test_mode_email_allowlist` (mirroring how the EF already reads `tenant.ui_config?.default_waze_url` per PRE_CUTOVER_QA_A B7), gated only when the key is present. Production-mode tenants (Prizma) simply don't have the key → email passes.

**Pros:** zero schema change. Same row UPDATE pattern as `default_waze_url`. EF change is minimal (~10 lines). Reversible by `jsonb_set` to remove the key.

**Cons:** less discoverable than a column (lives inside a generic config blob). Convention mismatch with SMS path (column for SMS, jsonb for email is asymmetric).

**Effort estimate:** Same-day SPEC. ~2 commits (EF + tenant pre-population).

**Why this is recommended:** Matches the Brief's preference for minimal disruption. Daniel can run his test cycle TODAY with the email envelope in place. If down the line we want symmetry with SMS, a future SPEC can promote the jsonb key to a column with zero data loss.

---

### Option 3 — Accept that email filtering is currently uncontrolled

Document the gap in `TECH_DEBT.md`, defer the decision to a future SPEC, and ship Daniel's test cycle with **the discipline that demo's `crm_leads.email` rows must be Daniel-owned addresses ONLY**.

**Pros:** zero code change, zero schema change. Lowest immediate cost.

**Cons:** relies on operator discipline (a single bad seed row hits a stranger's inbox). Carries the gap forward indefinitely. The Brief was triggered specifically to close this gap before the test cycle — Option 3 doesn't close it.

**Effort estimate:** zero now, full SPEC cost later when the gap is acted on.

---

## 4. Foreman recommendation

**Option 2** — minimal disruption, ships TODAY, reversible, matches an established jsonb pattern (`default_waze_url`). The asymmetry with SMS (column vs jsonb) is acceptable cost for the blast-radius reduction. Future SPEC can promote to column if needed.

If Daniel wants strict symmetry → Option 1.
If Daniel accepts operator-discipline only for the test cycle → Option 3 + tighten test-lead seeding.

---

## 5. What the next SPEC needs

Whichever option is chosen, the follow-up SPEC must:
1. Add the chosen mechanism to demo (single tenant for now — Prizma stays open per production-mode default).
2. Refactor `send-message` EF to gate the email channel symmetrically with the SMS channel — fail-CLOSED on lookup error or malformed JSON.
3. Add a curl smoke test against demo: allowed address → 200 + `ok:true`; non-allowed → 200 + `ok:false, error:'email_not_allowed'`.
4. Update `TECH_DEBT.md` if Option 3 is chosen (carry the gap forward).

---

## 6. Why this SPEC stops here

The Brief explicitly authorizes ONE escalation: "If the email whitelist mechanism doesn't exist → escalate, don't auto-create schema." Iron Rule 32 + the Continuous-Run Mandate both reinforce: a SPEC may always be MORE conservative than its Brief's destructive envelope; never less. The Brief allowed a 1-row UPDATE; the SPEC discovered no UPDATE is needed (SMS) AND no field exists to UPDATE (email). The pipeline closes here pending Architect's decision on the follow-up SPEC.

---

*End of ESCALATION. Awaiting Architect decision before next SPEC opens.*
