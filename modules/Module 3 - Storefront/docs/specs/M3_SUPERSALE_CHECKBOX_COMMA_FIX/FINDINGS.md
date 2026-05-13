# FINDINGS — M3_SUPERSALE_CHECKBOX_COMMA_FIX

> **Location:** `modules/Module 3 - Storefront/docs/specs/M3_SUPERSALE_CHECKBOX_COMMA_FIX/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — RU TERMS checkbox label contains an internal comma; will still render 3 checkboxes on `/ru/supersale/` after this SPEC

- **Code:** `M3-DATA-23`
- **Severity:** MEDIUM
- **Discovered during:** Post-update verification SELECT inside the same transaction as the 3 UPDATEs.
- **Location:** `storefront_pages` row where `lang='ru' AND slug='/supersale/' AND tenant_id=prizma`, inside `blocks[1].data.html` `checkboxes="..."` attribute. Verbatim TERMS label text (RU):
  ```
  Я подтверждаю, что прочитал/а и согласился/ась с {link:/supersale-takanon/}правилами мероприятия и политикой залога{/link}
  ```
  The comma between `подтверждаю` and `что прочитал/а` is grammatically correct Russian (appositive subordinate clause introducer) — it is NOT a stylistic comma I introduced.
- **Description:** The shortcode parser at `src/lib/shortcodes/lead-form.ts:parseCheckboxes()` (line 40) uses `str.split(',')` to delimit checkbox labels in the `checkboxes=` attribute. After this SPEC's fix, the RU value contains 2 commas: (1) the pre-existing TERMS-internal one above, (2) the legitimate separator between TERMS and MARKETING (`{/link}!,Присылайте`). The parser sees 3 segments → renders 3 checkboxes. Daniel's original 2026-05-13 screenshot was HE-only — the RU pre-existing fragmentation was not on his radar at SPEC-author time.
- **Reproduction:**
  ```sql
  SELECT
    array_length(string_to_array(
      substring(blocks->1->'data'->>'html' from 'checkboxes\s*=\s*"([^"]*)"'),
      ','
    ), 1) AS comma_count_plus_1
  FROM storefront_pages
  WHERE slug='/supersale/' AND lang='ru' AND tenant_id=(SELECT id FROM tenants WHERE slug='prizma');
  -- Returns 3 → 2 commas → 3 checkboxes will render.
  ```
- **Expected vs Actual:**
  - Expected (SPEC §3 #7): RU renders EXACTLY 2 checkboxes.
  - Actual: RU renders 3 checkboxes (TERMS-orphan: `Я подтверждаю`; TERMS-required: `что прочитал/а ... залога *`; MARKETING: `Присылайте мне ... политика конфиденциальности`).
- **Suggested next action:** NEW_SPEC — `M3_SUPERSALE_RU_TERMS_COMMA_FIX`. Same Level-2 UPDATE pattern as this SPEC. **The Foreman must choose between 3 fix-options:**
  1. **(a) Em-dash swap** — replace the inner comma with ` — ` (same approach as this SPEC's marketing label). Russian-native acceptability needs verification — em-dash for an appositive subordinate clause is grammatically unusual in Russian (Hebrew/English tolerate em-dash here easily; Russian convention uses comma + что-clause). **Recommended only after a Russian-native pair-of-eyes confirms.**
  2. **(b) Rephrase** — restructure to remove the appositive entirely, e.g. `Я прочитал/а и согласился/ась с {link:/supersale-takanon/}правилами мероприятия и политикой залога{/link}` (drop the `подтверждаю, что` introducer). Cleaner grammatically; preserves legal meaning ("I read and agreed").
  3. **(c) Ship the parser fix instead** — see M3-DEBT-23 below. Then no CMS content has to dodge commas. Higher upfront cost but eliminates the recurrence vector.
- **Rationale for action:** Either (a) or (b) is a <30-min SPEC matching exactly this one's pattern. (c) is the right structural fix but is ~2 hrs; it would obsolete this category of work entirely.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — `parseCheckboxes()` uses raw `str.split(',')` with no escape mechanism — any future CMS content with an inner comma will silently fragment

- **Code:** `M3-DEBT-23`
- **Severity:** MEDIUM
- **Discovered during:** Root-cause analysis after seeing the RU TERMS comma cause a fragmentation that REC-SITE-022 + REC-SITE-023 had not anticipated.
- **Location:** `opticup-storefront/src/lib/shortcodes/lead-form.ts:40-48`:
  ```ts
  function parseCheckboxes(str: string): CheckboxDef[] {
    if (!str) return [];
    return str.split(',').map(c => {     // ← raw split, no escape
      const trimmed = c.trim();
      const required = trimmed.endsWith('!');
      const label = required ? trimmed.slice(0, -1) : trimmed;
      return { label, required };
    });
  }
  ```
- **Description:** The `[lead_form checkboxes="A,B,C"]` shortcode parameter is comma-delimited with NO escape mechanism. Any inner comma — whether legitimately grammatical (Russian appositive, Hebrew long-form sentences, English compound clauses) or stylistic — silently fragments the checkbox. Failure mode is invisible at SPEC-author time and only surfaces when looking at the rendered form. The bug count here is 2 in a single page (`/supersale/`): the REC-SITE-022 marketing-label comma I introduced, AND the pre-existing RU TERMS comma. Future authors of CMS shortcode content will likely hit this again.
- **Reproduction:** Add ANY shortcode label with an inner comma and observe the rendered form. Example: `[lead_form checkboxes="Hello, world,Second box"]` renders 3 checkboxes (`Hello`, `world`, `Second box`) instead of 2.
- **Expected vs Actual:**
  - Expected: parser supports an escape so labels can contain literal commas. Common patterns: backslash-escape (`\,`), JSON-array shape (`checkboxes='[...]'`), or a non-keyboard separator (`|` or `;`).
  - Actual: no escape; comma-fragmentation is silent and depends on CMS-author awareness.
- **Suggested next action:** NEW_SPEC — `M3_SHORTCODE_CHECKBOXES_ESCAPE`. ~2 hrs. Three concrete approaches, in order of disruption (Foreman picks):
  1. **Backslash escape** — `str.split(/(?<!\\),/).map(c => c.replace(/\\,/g, ','))`. Backward-compatible (existing content unchanged). ~10 lines of code + tests.
  2. **JSON-array attribute** — accept either `checkboxes="A,B"` (legacy) OR `checkboxes='["A","B"]'` (new). Backward-compatible. ~15 lines + per-attr type detection.
  3. **Pipe separator** — `checkboxes="A|B"`. Requires migrating existing CMS content (3 langs × N pages). NOT backward-compatible.
- **Rationale for action:** Once shipped, no future SPEC needs to dodge commas in checkbox labels. M3-DATA-23 above becomes moot. Pays for itself across multi-language UX writing where natural-language commas are unavoidable.
- **Foreman override (filled by Foreman in review):** { }

---
