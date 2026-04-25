# FINDINGS — MANUAL_TERMS_APPROVAL

---

## F1 — `Modal.confirm`'s `confirmClass` semantics are inconsistent across callers — LOW

**Severity:** LOW
**Location:** `shared/js/modal-builder.js:159` —
`var confirmBtn = _btn('btn ' + (config.confirmClass || 'btn-primary'), …);`

**Description:** Existing callers split into two camps:
- `crm-queue-live.js:90` passes `'btn-danger'` — a CSS class that
  presumably extends the `.btn` base.
- This SPEC's caller (`crm-lead-actions.js:296`) passes
  `'bg-emerald-600 hover:bg-emerald-700'` — Tailwind utilities. They
  end up concatenated as `class="btn bg-emerald-600 hover:bg-emerald-700"`,
  which works because `.btn` (in `shared/css/`) defines padding/radius
  but not background, so Tailwind utilities cascade through.

The inconsistency works today by coincidence — if anyone adds a
`background` rule to the `.btn` class (or rewrites it to be
Tailwind-internal), the Tailwind callers will silently lose color.

**Suggested fix:** Pick a convention and document it in
`shared/js/modal-builder.js` doc-comment + `docs/CONVENTIONS.md`.
Either (a) `confirmClass` MUST be a `btn-*` companion class
defined in `shared/css/buttons.css`, OR (b) `confirmClass` accepts
arbitrary Tailwind utilities and the `.btn` base must remain
background-free. Today's working state suggests (b), but it's not
written down anywhere.

**Not urgent:** zero callers break right now.

---

## F2 — `terms_approved_at` is set client-side via `new Date().toISOString()` — INFO

**Severity:** INFO
**Location:** `crm-lead-actions.js:approveTermsManually` — the UPDATE
sends a client-clock ISO string for `terms_approved_at`.

**Description:** All other timestamp columns in the project (e.g.
`updated_at`, `created_at`, `last_seen_at`) follow the same pattern
of client-clock writes. There is no project-wide convention to
prefer `now()` server-side via an RPC for these fields. If the
client clock is skewed, the recorded approval timestamp drifts.

**Impact:** Negligible for an audit trail used for compliance — the
field is informational, not transactional. Daniel does not enforce
sub-second precision for terms approval.

**Suggested:** No action. Keeping consistency with
`crm.lead.resubscribed` and other lead-mutation paths, which also
write client clock for `updated_at` adjacent to the change. If a
future "all timestamps via RPC" SPEC happens, this caller is in
scope; until then, leave as-is.

---

## F3 — No UI mechanism for the inverse direction (revoke terms approval) — INFO

**Severity:** INFO
**Location:** N/A — non-existent UI.

**Description:** This SPEC adds the false → true direction for
`terms_approved`. There is no UI to flip true → false. In practice
this happens in three contexts:
1. A lead later requests revocation (rare, mostly verbal);
2. A bug or test data needs cleanup;
3. GDPR-style erasure flow (broader scope).

**Suggested:** Not in scope for this SPEC. If revocation becomes a
real workflow (Daniel mentions a customer asks "remove me from
your terms"), open a dedicated SPEC. The atomic UPDATE pattern
already exists; only the inverse button + activity-log action name
(`crm.lead.terms_revoked`) would need to be added.
