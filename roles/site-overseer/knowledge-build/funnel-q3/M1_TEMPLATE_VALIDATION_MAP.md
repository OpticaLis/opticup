# M1 — Template Validation Map (P2.3 Pre-Flight)

> **Mission:** Map every validation surface that guards `crm_message_templates` output, classify gaps,
> and recommend whether validation should live in EF only, DB only, or both — so the FUNNEL Phase 2.3
> SPEC author can skip the discovery step and jump straight to design.
>
> **Read-only knowledge build.** Generated 2026-05-15 night, branch `claude/overnight-knowledge-build-2026-05-15`.
> All measurements are live SELECT-only against `tsxrrxzmdxaenlvocyit` (prizma-optic).

---

## 1. TL;DR (one-page)

1. **Inventory:** 70 logical template rows on prod (38 demo + 32 prizma). All `language='he'`, two channels (`sms`, `email`). **Zero `whatsapp` rows are active** despite the column accepting it.
2. **Placeholder universe:** 15 distinct `%lowercase_var%` names appear across all active templates, plus the `payment_url_<fee>` family. Every name in that universe is auto-injected by `send-message` EF, EXCEPT `payment_url_*` which is guarded separately.
3. **`required_variables` column** (added 2026-04-30 by `2026_04_30_message_template_required_vars_up.sql`) is **empty for every row** — and that is **correct**, not a gap. The parser-driven backfill subtracts the auto-fill + auto-inject set; nothing remains.
4. **Validation runs at three layers today**:
   - **Layer A — `send-message` EF dispatch path** (4 gates: `required_variables` check, `scanForPaymentUrlMismatch`, `scanForUnsubstitutedPlaceholders`, allowlist).
   - **Layer B — `automation-engine` pre-enqueue** (1 gate: `validateTemplateOutput` — added 2026-05-14 by `M4_TEMPLATE_VALIDATION_UNIFIED`).
   - **Layer C — DB** (NONE; column is JSONB free-form, by design).
5. **Layer D missing — UI editor** (`modules/crm/crm-messaging-templates-editor.js`): no client-side gate. An author can save a template containing `%foo_that_will_never_resolve%` without warning.
6. **Real-world evidence the gate fires:** on 2026-05-13 there were **758 rejected SMS sends** on prizma due to `%registration_url%` not resolving. All were raw-body sends with `event_id IS NULL`, so `injectAutoUrls` never built the URL. Universal scanner correctly fail-CLOSED them. **The validation works** — but the upstream UI that accepted the bad body does not.
7. **Recommendation:** Layer A (EF dispatch) stays canonical. Add Layer D (UI lint) as the P2.3 deliverable, not Layer C (DB CHECK). Rationale + design below.

---

## 2. Inventory — every row in `crm_message_templates`

Source query: `SELECT … FROM crm_message_templates ORDER BY tenant_slug, channel, slug` executed 2026-05-15.

### 2.1 Counts

| Tenant | Channel | Active | Inactive | Total |
|---|---|---:|---:|---:|
| demo   | email | 17 | 3 | 20 |
| demo   | sms   | 16 | 3 | 19 |
| prizma | email | 13 | 1 | 14 |
| prizma | sms   | 17 | 1 | 18 |
| **All** | **All** | **63** | **8** | **71** |

(Inactive set includes 4 `qa_*_test_*` rows that exist on demo only — safe to delete in a future cleanup.)

### 2.2 WhatsApp gap

`channel` column accepts `'whatsapp'` per the CRM Settings UI (`modules/crm/crm-messaging-templates.js` `CHANNELS = ['sms','whatsapp','email']`). **Zero rows actually have `channel='whatsapp'`.** All WhatsApp send-paths are stubbed today. Phase 2.3 should explicitly note: validation gates don't need a WhatsApp branch yet.

### 2.3 Distinct slugs per tenant

Demo defines 20 base slugs (`{slug}_{channel}_{language}` collapsed). Prizma defines 18, all overlapping with demo's set EXCEPT:
- Prizma `check_in_attendee_sms_he` ↔ demo `check_in_event_sms_he` (rename drift)
- Demo has `check_in_event_email_he` with no prizma counterpart
- Demo has 4 `qa_*` test templates (no prizma counterpart, intentional)

**Drift item for P2.3 SPEC:** the `check_in_event` ↔ `check_in_attendee` rename is silent — neither tenant errors when the other's slug is referenced. Recommend including a "slug drift detector" query in the Phase 2.3 health dashboard.

---

## 3. Placeholder universe — every `%var%` actually used

Source: `regexp_matches(body||subject, '%([a-z][a-z0-9_]*)%', 'g')` (matches Layer A's universal scanner regex exactly).

| Placeholder | # templates using | Auto-injected? | Notes |
|---|---:|---|---|
| `name`                  | 67 | YES (`injectLeadVariables` → `crm_leads.full_name`) | Most-used placeholder. |
| `unsubscribe_url`       | 62 | YES (`injectAutoUrls` → `buildUnsubscribeUrl`) | Per-recipient short link. |
| `event_name`            | 43 | YES (`injectEventVariables` → `crm_events.name`) | Needs `event_id`. |
| `event_date`            | 42 | YES (`injectEventVariables` → DD/MM/YYYY) | Needs `event_id`. |
| `event_time`            | 24 | YES (`injectEventVariables` → `HH:MM - HH:MM`) | Needs `event_id`. |
| `event_day_of_week`     | 24 | YES (Hebrew weekday computed) | Needs `event_id`. |
| `event_max_attendees`   | 20 | YES (`crm_events.max_capacity`) | Needs `event_id`. |
| `event_deposit_amount`  | 14 | YES (`crm_events.booking_fee`) | Needs `event_id`. |
| `registration_url`      | 12 | YES (`injectAutoUrls` → `buildRegistrationUrl`) | **Needs `event_id`.** Gap source — see §5. |
| `phone`                 |  8 | YES (`injectLeadVariables`; `withDisplayPhone` reformats) | E.164 → local 0XXX for display. |
| `email`                 |  6 | YES (`injectLeadVariables`) | |
| `payment_url_50`        |  6 | NO (handled via `scanForPaymentUrlMismatch`, **always loud 422**) | Only `_50` is used today. |
| `coupon_code`           |  2 | YES (`injectEventVariables` → `crm_events.coupon_code`) | Added by P33 Fix A 2026-05-13. |
| `event_location`        |  2 | YES (`injectEventVariables` → `crm_events.location_address`) | |
| `lead_id`               |  2 | YES (`injectLeadVariables`) | |
| `waze_url`              |  0 | YES (event row → `tenants.ui_config.default_waze_url` cascade) | Wired by PRE_CUTOVER_QA_A B7; no template uses it yet. |

**Conclusion:** The universe is 15 names + the `payment_url_*` family. The auto-inject set covers all 15. The migration backfill that left `required_variables=[]` is correct: nothing requires caller-supplied vars.

### 3.1 Spurious "placeholders" in the data

Some templates contain literal sequences like `%20%`, `%2C%`, `%D7%`, `%9B%`. These are URL-encoded bytes inside `wa.me` click-to-chat URLs (Hebrew characters encode as `%D7%XX`). The lowercase-first-char regex `%[a-z][a-z0-9_]*%` correctly skips them — confirmed by `scanForUnsubstitutedPlaceholders` (see `supabase/functions/_shared/template-validation.ts:57`).

No action needed; the regex was designed for exactly this case.

---

## 4. Validation surface map

### 4.1 Layer A — `send-message` EF dispatch path

File: `supabase/functions/send-message/index.ts` (332 lines).

```
POST → parse body → validate channel/required IDs
  → injectLeadVariables (unconditional, fills name/phone/email/lead_id)
  → suppression gate (unsubscribed → 200 with rejected log row)
  → injectAutoUrls (unsubscribe_url + registration_url IF event_id)
  → injectEventVariables (IF event_id; fills event_*, coupon_code, waze_url, payment_url_<fee>)
  → withDisplayPhone (E.164 → 0XXX for display only)
  → resolve template via slug OR use raw body
       ↓
  ┌── if template ──┐
  │ GATE 1: required_variables check
  │   Reads tpl.required_variables (jsonb[]); for each key NOT in displayVars
  │   or empty-string → 400 missing_required_variable + failed log row.
  │   Today: every template has []; gate never fires in practice.
  └─────────────────┘
       ↓
  substituteVariables(body, displayVars)         ← /%(\w+)%/g, leave-as-is if missing
       ↓
  GATE 2: scanForPaymentUrlMismatch(finalBody)
    If %payment_url_(\d+)% survived → 422 payment_link_missing_or_mismatch:N
       ↓
  GATE 3: scanForUnsubstitutedPlaceholders(finalBody + subject)
    Any %lowercase% left → 400 unsubstituted_placeholder: comma-list
       ↓
  GATE 4: allowlist (channel-specific, fail-CLOSED)
    test_mode_sms_allowlist (column) or test_mode_email_allowlist (ui_config)
       ↓
  writeDispatchAndSend → pending log → Make webhook → sent|failed
```

**Strengths:**
- Defense-in-depth: payment scan + universal scan back each other up.
- Both scans live in `_shared/template-validation.ts` (M4_TEMPLATE_VALIDATION_UNIFIED 2026-05-14); future EFs that compose template output reuse them.
- Loud-failure pattern (P12, locked 2026-04-28): "עדיף לא לשלוח מאשר לשלוח שבור". Customer never sees half-rendered text.

**Behavior under raw-body sends (no `template_slug`):**
- Gate 1 (required_variables) is **skipped** — there's no template to read from.
- Gates 2 + 3 still fire on the raw body. **This is what caught the 2026-05-13 incident.**

### 4.2 Layer B — `automation-engine` pre-enqueue

File: `supabase/functions/automation-engine/prepare-plan.ts` (line 194).

```
For each lead × channel in a rule's plan:
  compose body via substituteVars(tpl.body, vars)
    → validateTemplateOutput(composedBody)   ← unified call from _shared
       ok=false → insert rejected row to crm_message_log AND skip enqueue
                  (NEVER reaches crm_message_queue → dispatch-queue → send-message)
       ok=true  → push to items[] for queue insert
```

**Strengths:**
- Doomed messages never consume queue rows or webhook quota.
- Rule's `last_error` column accumulates the missing-var set for operator visibility (UI hook in `modules/crm/crm-automation-engine.js`).
- Same `_shared` scanner as Layer A — by construction, behavior is bit-identical.

**Limitation:**
- **Subject is not scanned at plan-time** (comment lines 190-193). The dispatch-queue path freezes only the body onto the queue row; send-message re-runs subject substitution at dispatch with fresh vars. So Layer A is the only line of defense for subjects.

### 4.3 Layer C — DB

Migration `2026_04_30_message_template_required_vars_up.sql` adds `required_variables JSONB NOT NULL DEFAULT '[]'::jsonb`. Migration comment explicitly chose **no CHECK constraint**:
> "NOT NULL DEFAULT '[]'; no CHECK constraint; idempotent."

Rationale (inferable from migration + system design): templates are author-editable arbitrary text; a constraint that validates "every placeholder is in the auto-inject set" would either be brittle (hard to express in CHECK) or require a function — both add ops friction without preventing the only realistic bug class (typos in placeholder names).

**Verdict: this is a deliberate, correct design decision. P2.3 should NOT add a CHECK constraint.**

### 4.4 Layer D — UI editor (MISSING)

File: `modules/crm/crm-messaging-templates-editor.js` (155 lines, `saveLogicalTemplate`).

The save handler validates:
- Name is non-empty.
- At least one channel exists.
- Each enabled channel has non-empty body.
- Slug is provided (derived or manual).

It does **NOT** validate:
- Placeholders in body/subject are spelled correctly.
- Placeholders that need a binding context (e.g. `%registration_url%` → requires `event_id` at send-time) match an automation-rule context.
- `%payment_url_<N>%` corresponds to an entry in `tenants.payment_links`.

There IS a preview function (`crm-messaging-templates.js:232` `substitute`) that fills 10 demo values for the right-pane preview, but it does NOT warn on unknown placeholders — it just leaves them as-is.

---

## 5. Real-world evidence — what fires today

Source: 30-day aggregation of `crm_message_log` where `status IN ('failed','rejected')`.

| Day | Error kind | Count | Notes |
|---|---|---:|---|
| 2026-05-13 | `unsubstituted_placeholder` | **759** | 758 prizma SMS, 1 demo "nonsense" test |
| 2026-05-12 | `unsubstituted_placeholder` | 7 | spike pre-incident, likely test |
| 2026-05-07 | `template_not_found` | 1 | typo in slug |
| 2026-05-06 | `template_not_found` | 1 | |
| 2026-04-26 | `template_not_found` | 1 | |

### 5.1 The 2026-05-13 incident — root cause

All 758 prizma rows share signature:
- `channel='sms'`
- `template_id IS NULL` (raw-body send, not slug-based)
- `event_id IS NULL`, `broadcast_id IS NULL`, `run_id IS NULL`
- `error_message = 'unsubstituted_placeholder: registration_url'`
- 19-minute burst (06:13:02 → 06:32:07)

**Diagnosis:** Operator composed a one-off SMS broadcast on prizma with a body containing `%registration_url%`. Because no `event_id` was passed, `injectAutoUrls` skipped registration_url generation (it's gated on `if (eventId)`). Universal scanner correctly fail-CLOSED all 758 sends BEFORE the SMS vendor was hit.

**Outcome:** Zero customers received broken text. Operator likely saw 758 toasts and contacted Daniel. (No FOREMAN_REVIEW under this slug in `modules/Module 4 - CRM/docs/specs/` — confirm separately.)

### 5.2 What this proves

- **Layer A (universal scanner) works as designed.** It is the safety net.
- **Layer D (UI gate) is the leak.** The operator was not warned at compose-time that `%registration_url%` cannot resolve in an event-less SMS.
- **Layer B (pre-enqueue) was bypassed** because raw-body sends don't go through automation-engine.

---

## 6. Gap classification — for the P2.3 SPEC

| # | Gap | Severity | Existing layer | Recommended new layer |
|---|---|---|---|---|
| G1 | UI editor accepts placeholders that can never resolve (typos, event-gated vars in non-event templates) | Medium — fails loudly later, but wastes operator time | A (catches at send) | **D (UI lint, real-time)** |
| G2 | Raw-body broadcasts (event-send-message + ad-hoc) accept placeholders that need binding context | High — operator confusion, 758 wasted sends recently | A (catches at send) | **D (compose-modal lint with context awareness)** |
| G3 | Subject not scanned by Layer B (pre-enqueue) | Low — Layer A still catches at dispatch | A | (none; current Layer A coverage sufficient) |
| G4 | Slug drift between tenants (demo `check_in_event` ↔ prizma `check_in_attendee`) | Low — affects rename hygiene | — | Phase 2.3 health dashboard query |
| G5 | WhatsApp channel value accepted but no templates exist; ambiguous whether to error or silently skip | Low — pre-emptive | — | UI: disable WhatsApp toggle until WhatsApp send-path lands |
| G6 | No template version history; edits are destructive | Out of P2.3 scope | — | Defer to a future template-versioning SPEC |
| G7 | `qa_*` test templates clutter the demo template list (4 inactive rows) | Trivial | — | Cleanup migration: `UPDATE … SET is_active=false WHERE slug LIKE 'qa_%'` already done; consider hard-delete after Daniel approves |

---

## 7. Recommendation — where validation belongs

**EF only (Layer A) stays canonical.** Reasons:
- Defense-in-depth requires the dispatch-time gate (Iron Rule 22). No upstream gate can be trusted to catch every entry point.
- Already unified in `_shared/template-validation.ts`.
- Loud-failure pattern (P12) is established and produces structured `crm_message_log` rows for observability.

**Add Layer D (UI lint).** Reasons:
- Eliminates the 2026-05-13 class of operator-induced bad sends.
- Composes naturally in the existing editor — the substitute() preview already knows the demo-value map.
- Cheap: ~50 LOC client-side, no DB changes.

**Do NOT add Layer C (DB CHECK).** Reasons:
- Migration's deliberate design decision (no CHECK).
- Placeholder semantics change as `injectAutoUrls`/`injectEventVariables` evolve; a CHECK would lag the code and produce false negatives.
- DB-level enforcement adds no value over EF-level enforcement; both run in the request path.

---

## 8. SPEC stub — P2.3 `M4_TEMPLATE_VALIDATION_UI_LINT`

> This is a stub for the FUNNEL Phase 2.3 SPEC author to harvest. Final SPEC to be authored by `opticup-strategic` per the Authority Matrix.

**Goal:** Add real-time placeholder linting to the CRM template editor + raw-body compose modal, so authors are warned at compose-time about placeholders that can never resolve at send-time.

**Scope (in):**
- `modules/crm/crm-messaging-templates-editor.js` — add `lintBody(text)` that returns array of warnings:
  - `unknown_placeholder` (not in auto-inject set, not `payment_url_<digits>`)
  - `event_only_placeholder_in_non_event_template` (template slug doesn't start with `event_*` but uses `%event_*%` or `%registration_url%`)
  - `payment_url_no_link` (cross-ref `tenants.payment_links`)
- `modules/crm/crm-event-send-message.js` — same lint applied to raw textarea, with the wrinkle that `%event_*%` is OK here (event_id is bound).
- New module: `modules/crm/crm-template-lint.js` — pure functions, single source of truth for known placeholders (mirrors `_shared/template-validation.ts` regex).
- Optional: keyboard shortcut to insert `%name%` etc. from a dropdown to eliminate typos at source.

**Scope (out):**
- DB CHECK constraint (per §4.3).
- Template versioning / history (out-of-scope per §6 G6).
- WhatsApp templates (per §5 G5 — defer until channel is live).
- Subject scanning at Layer B (per §6 G3 — current coverage sufficient).

**Risk:**
- Lint must be permissive — false positives slow authors. Default to warning, not blocking. Save still proceeds even with warnings (Layer A is the binding gate).
- Auto-inject list lives in two places (EF + new JS module). Either de-dup via shared JSON or accept the duplication with a comment pointing to the canonical EF location.

**Estimated effort:** 2-3 hours (small; mostly UI plumbing + 1 pure function).

**Touched files:** 3 new/edited; 0 migrations; 0 EF changes.

**Smoke test:**
- Edit `event_invite_new_sms_he`, change `%registration_url%` to `%registratin_url%`, save. Expect warning toast + red squiggle in editor.
- Compose ad-hoc SMS broadcast with `%registration_url%` in textarea, no event bound. Expect warning at compose, click "send anyway" should still let Layer A catch it.

---

## 9. Auxiliary findings (parking lot, not in P2.3)

| Item | Where | Owner |
|---|---|---|
| Slug-rename drift between tenants (`check_in_event` ↔ `check_in_attendee`) | crm_message_templates | Phase 2.3 dashboard query |
| Demo `qa_*` test templates persist inactive; consider hard-delete | crm_message_templates | One-off cleanup PR |
| `event_coupon_delivery_sms_he` has `placeholders_in_body=NULL` (body is empty of `%var%`) — verify intentional | crm_message_templates | Phase 2.3 review |
| `waze_url` placeholder wired by PRE_CUTOVER_QA_A B7 but unused in any template — verify needed | event-variables.ts:137 | Strategy review |
| `event_will_open_tomorrow_sms_he` references `%event_max_attendees%` and `%unsubscribe_url%` only — no `%event_name%` despite the slug suggesting otherwise | crm_message_templates | Content audit |

---

## 10. Source data — for reproducibility

All queries are SELECT-only and reproducible by running the following on `tsxrrxzmdxaenlvocyit`:

```sql
-- §2 inventory
SELECT t.slug, t.channel, t.is_active, ten.slug AS tenant
FROM crm_message_templates t JOIN tenants ten ON ten.id = t.tenant_id
ORDER BY ten.slug, t.channel, t.slug;

-- §3 placeholder universe
WITH parsed AS (
  SELECT t.id::text AS tpl_id, t.slug, t.is_active, m[1] AS placeholder
  FROM crm_message_templates t,
       regexp_matches(COALESCE(t.body,'')||' '||COALESCE(t.subject,''),
                      '%([a-z][a-z0-9_]*)%','g') AS m
)
SELECT placeholder, COUNT(DISTINCT tpl_id) AS n_templates_using
FROM parsed GROUP BY placeholder ORDER BY placeholder;

-- §5 historical failure aggregation
SELECT date_trunc('day', created_at)::date AS day,
       error_message, COUNT(*) AS n
FROM crm_message_log
WHERE status IN ('failed','rejected')
  AND created_at > NOW() - INTERVAL '30 days'
  AND error_message ~ '^(unsubstituted_placeholder|payment_link|missing_required_variable|template_not_found)'
GROUP BY 1,2 ORDER BY 1 DESC, 3 DESC;
```

Output measured 2026-05-15 23:30 IDT.

---

*End of M1. Companion: tomorrow's P2.3 SPEC author drafts `M4_TEMPLATE_VALIDATION_UI_LINT` from §8.*
