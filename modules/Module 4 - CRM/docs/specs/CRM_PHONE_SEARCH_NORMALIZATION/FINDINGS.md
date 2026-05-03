# FINDINGS — CRM_PHONE_SEARCH_NORMALIZATION

> Findings discovered during execution of this SPEC that are NOT inside its scope. One entry per finding. Severity: INFO / LOW / MEDIUM / HIGH / CRITICAL.
> Suggested next-action per entry: new SPEC stub / TECH_DEBT entry / dismiss.

---

## F1 — Activation prompt regression-criterion #4 used `0537`, which structurally cannot match

- **Severity:** INFO
- **Location:** `modules/Module 4 - CRM/docs/specs/CRM_PHONE_SEARCH_NORMALIZATION/ACTIVATION_PROMPT.md` Stage 1 acceptance-criterion #4 ("type `0537` (partial, 4 digits) → partial-phone search still works (substring of normalized OR raw)")
- **Description:** Phones are stored E.164 (`+972XXXXXXXXX`), so any 4-digit Israeli-local prefix beginning with `0` is structurally not a substring of the stored value, AND `CrmHelpers.normalizePhone` only normalizes inputs that match exactly `0XXXXXXXXX` (10 digits). Therefore `0537` never matches — neither pre-fix nor post-fix. Pre-fix: no match (raw substring fails). Post-fix: still no match (`normalizePhone('0537')` returns `null` because length≠10, and `0537` is not a raw substring either). The Foreman correctly re-stated this in SPEC §8 ("typing `0537` is not expected to produce a hit; it didn't before this fix either, because the leading `0` is not stored. This is acceptable — the SPEC fixes the full-10-digit case, not partials starting with `0`"), but the activation prompt itself still implies `0537` should match. If a future operator runs the prompt's literal acceptance-criterion list as a QA script, criterion #4 will appear to fail when it's actually working as designed.
- **Suggested next action:** Dismiss as a one-time prompt drafting nit; the SPEC already corrects it for execution. If the same activation-prompt template is reused for a follow-up phone-search SPEC (e.g., supplier portal, storefront), the author should cite the substring `537` (3 digits, valid raw substring of E.164) instead of `0537` (4 digits, structurally never matches).
- **Discovered during:** Foreman authoring (cross-checked against `CrmHelpers.normalizePhone` source at `modules/crm/crm-helpers.js:31`).

---

## Reverse-callsite report (per Auto-Engine SE-2 proposal — only when deletions are in scope)

**N/A** — this SPEC deletes no files, so the reverse-callsite proposal does not apply. Recorded explicitly so future audits can see the proposal was considered, not skipped.

---

## Cross-Reference Check evidence (Iron Rule 21, Step 1.5)

Recorded in SPEC §11. Greps run before edit:
- `grep -n "normalizePhone" modules/crm/crm-helpers.js` → 1 definition (`:31`), 1 export (`:194`).
- `grep -n "var sNorm" modules/crm/` → 0 hits.
- `grep -n "indexOf(sNorm)" modules/crm/` → 0 hits.

Result: 0 collisions / 1 reuse-target confirmed. No new helper authored.
