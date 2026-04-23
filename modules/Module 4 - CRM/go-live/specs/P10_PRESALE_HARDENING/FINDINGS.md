# FINDINGS — P10_PRESALE_HARDENING

> **Location:** `modules/Module 4 - CRM/go-live/specs/P10_PRESALE_HARDENING/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — Duplicate toast can point at a soft-deleted lead

- **Code:** `M4-BUG-P10-01`
- **Severity:** LOW
- **Discovered during:** Phase 1 Commit 1 design review, and specifically relevant to the demo after Phase 1 Commit 2 merged the `a16f6ba5` duplicate into `is_deleted=true`.
- **Location:** `modules/crm/crm-lead-actions.js:100-130` (`createManualLead`), especially the `23505` race-safety fallback SELECT at line ~121.
- **Description:** The pre-insert duplicate SELECT filters `.eq('is_deleted', false)`, so a soft-deleted lead won't block the insert. But the table's UNIQUE `(tenant_id, phone)` constraint does NOT know about `is_deleted` — it enforces the phone uniqueness across all rows. When a user tries to create a lead with a phone that only exists on a soft-deleted row, the INSERT fires, the UNIQUE fires as `23505`, my race-safety fallback runs `SELECT … WHERE phone=X LIMIT 1` (WITHOUT an `is_deleted` filter), and returns the soft-deleted lead. The user sees: "ליד עם מספר טלפון זה כבר קיים: <soft-deleted name>". That lead isn't visible anywhere in the UI, so the toast reads like a phantom duplicate.
- **Reproduction:**
  ```
  1. Soft-delete a lead with phone +972537XXXXXXX.
  2. In CRM, open "+ הוסף ליד", enter same phone.
  3. Toast: "ליד עם מספר טלפון זה כבר קיים: <soft-deleted-lead-name>"
  4. That lead is nowhere in the incoming or registered tables.
  ```
- **Expected vs Actual:**
  - Expected: either (a) allow re-creation because the old row is logically gone, or (b) surface a clearer message like "ליד זה נמחק בעבר — ניתן לשחזר אותו" with an "undo soft-delete" affordance.
  - Actual: user gets a confusing duplicate toast pointing at an invisible lead.
- **Suggested next action:** TECH_DEBT
- **Rationale for action:** Low-probability path (only triggered after an explicit soft-delete + re-create with same phone). Not a blocker for P7 cutover. A dedicated polish SPEC can choose between (a) and (b) with Daniel's input on UX preference.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — Supabase MCP `deploy_edge_function` needs explicit `import_map_path` on update

- **Code:** `M4-TOOL-P10-02`
- **Severity:** INFO
- **Discovered during:** Phase 3 Commit 5 (deploy of `send-message` v3).
- **Location:** Tooling quirk in the Supabase MCP server; not a file in this repo.
- **Description:** First call to `mcp__claude_ai_Supabase__deploy_edge_function` for `send-message` (an existing function) returned `InternalServerErrorException: Function deploy failed due to an internal error` with no other detail, even though the same `files` array (with `deno.json`) had succeeded for the new `unsubscribe` function minutes earlier. Retrying with `import_map_path: "deno.json"` explicitly worked immediately. The Supabase MCP response for the successful deploy still showed `"import_map": true` and inferred the path on its side, so the inference seems to work for create-first but not for update-existing.
- **Reproduction:**
  ```
  # Create new function — inference works:
  deploy_edge_function(name="foo", files=[{deno.json}, {index.ts}]) → success

  # Update existing function — inference FAILS:
  deploy_edge_function(name="foo", files=[{deno.json}, {index.ts}]) → InternalServerError

  # Update with explicit import_map_path — success:
  deploy_edge_function(name="foo", files=[...], import_map_path="deno.json") → success
  ```
- **Expected vs Actual:**
  - Expected: inference should work on update too, or the error message should say "missing import_map_path".
  - Actual: silent failure with opaque 500.
- **Suggested next action:** DISMISS (with note)
- **Rationale for action:** Not a project issue — it's a Supabase MCP server behavior. Best path is to document the workaround in the executor skill (see Proposal 1 in EXECUTION_REPORT §8) so the next SPEC doesn't hit the same wall.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — HMAC key = `SUPABASE_SERVICE_ROLE_KEY` has a rotation footgun

- **Code:** `M4-SEC-P10-03`
- **Severity:** MEDIUM
- **Discovered during:** Phase 3 Commit 4 design (unsubscribe EF token scheme).
- **Location:** `supabase/functions/unsubscribe/index.ts:20-21,70`, `supabase/functions/send-message/index.ts:19,99`.
- **Description:** Both EFs use `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")` as the HMAC key for signing + verifying unsubscribe tokens. This was the SPEC's explicit direction (§12.5 "Use `SUPABASE_SERVICE_ROLE_KEY` as the HMAC key... no new secrets needed"). However, if the service-role key is ever rotated (e.g., compromised, or as a scheduled rotation), every unsubscribe link sent out in the preceding 90 days (the TTL) silently stops working — the old signature won't verify against the new key. Users click a stale link, see "קישור לא תקין או שפג תוקפו", and don't know why.
- **Reproduction:** Rotate SUPABASE_SERVICE_ROLE_KEY → all previously-minted unsubscribe tokens fail HMAC verification → customers report broken links.
- **Expected vs Actual:**
  - Expected: unsubscribe tokens should survive routine key rotations, either by being signed with a dedicated key or by the EF accepting signatures from the old key for a grace window.
  - Actual: single shared key, no grace window, no key-version field in the token payload.
- **Suggested next action:** NEW_SPEC
- **Rationale for action:** Not urgent (service-role keys don't rotate often and there's no rotation planned), but worth fixing before Prizma starts sending real volume. The SPEC could introduce a dedicated `UNSUBSCRIBE_HMAC_KEY` secret + a `v` (version) field in the payload so the EF can migrate signatures on rotation. One small SPEC, maybe 2 commits.
- **Foreman override (filled by Foreman in review):** { }

---
