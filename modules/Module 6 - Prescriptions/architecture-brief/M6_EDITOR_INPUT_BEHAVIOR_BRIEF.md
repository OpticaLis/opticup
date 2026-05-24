# Brief — M6 Prescription Editor: Professional Input Behavior

> **Author:** opticup-architect (Cowork), 2026-05-24. **Module:** 6 (Prescriptions).
> **Trigger:** Daniel tested the live editor on demo (post-launch) and requested professional
> data-entry behavior — sign defaults, step granularity, unit symbols, clean edit-mode.
> **Why this matters:** an optometrist types dozens of refraction values per exam. Sign/unit
> normalization + 0.25 stepping is a real adoption requirement for pros, not cosmetics.
> **All rules below are Daniel-APPROVED** (decisions/M6.md 2026-05-24). The executor implements them
> as specified; the "additional UX" section (§4) is for Daniel's review, not pre-approved.

## 1. Scope

The per-eye REFRACTION inputs in the prescription editor (glasses + contacts), the per-eye ADD block,
and the relevant meta/secondary numeric fields. Code lives in `modules/prescriptions/`:
- `rx-param-table.js` (glasses 17-col table) + `rx-contacts-params.js` (contacts 14-col table) —
  inputs render with `data-eye` + `data-field`; a `change` listener already calls
  `window.RxEditor.autosaveField(...)`. Normalization hooks in at this commit point.
- `rx-add-block.js` (per-eye ADD: read/int/bif/mul) + the copy-R→L button already present.
- `rx-meta-grid.js` / `rx-secondary.js` numeric fields where a unit applies.

**Iron Rule 21:** do NOT duplicate sign/format logic across the 3 input-rendering files. Create ONE
shared formatter module (e.g. `modules/prescriptions/rx-field-format.js`) that exposes a
`formatField(fieldKey, rawValue)` + `stripForEdit(fieldKey, displayValue)` pair, and have all input
files call it. One source of truth for every rule below.

## 2. Normalization rules (Daniel-approved — implement exactly)

Apply on **field commit** = the user presses Enter OR moves to another field (blur). On commit:
normalize → write the formatted value back into the input → THEN autosave the normalized value.

| Field group | Default sign | Step | Format on commit | Example |
|---|---|---|---|---|
| SPH, CYL | MINUS | 0.25 | 2 decimals, leading sign | `5` → `-5.00`; `+5` → `+5.00`; `5.1` → snap nearest 0.25 → `-5.00` |
| ADD axes (READ/INT/BIF/MUL) | PLUS | 0.25 | 2 decimals, leading `+` | `1.5` → `+1.50` |
| AXIS, K-axis | — | 1 | integer 0–180 + `°` | `175` → `175°` |
| PRISM | — (value as typed) | 0.25 | 2 decimals + prism sign `△` | `4` → `4.00△` |
| PD-D/PD-N, BC, DIA, Pupil, axial-length | — | n/a | numeric + `mm` (1–2 dp) | `32` → `32mm`; `8.4` → `8.40mm` |
| K1, K2, K-avg | — | n/a | 2 decimals (per standard) | `7.5` → `7.50` |
| VAcc, VAsc, PH | — | n/a | preserve `6/x` format, NO suffix | `6/6` stays `6/6` |
| BASE | — | n/a | stays a picker (UP/DN/IN/OUT), unchanged | — |

Rules detail:
- **0.25 snapping:** SPH/CYL/ADD/PRISM snap to the nearest 0.25 on commit (clinical standard).
- **Default sign only applies when the user did NOT type a sign.** `5`→ default; `+5`/`-5` → respect
  the typed sign. Empty stays empty (placeholder `—`, never `-0.00`).
- **Momentary highlight when a sign is AUTO-applied** (Daniel-approved safety): when default-minus (or
  default-plus on ADD) is applied because the user typed an unsigned number, the field briefly flashes
  / the sign renders in an accent color for ~1s, so a fast typist who meant `+5` but got `-5.00` SEES
  it. No highlight when the user typed the sign explicitly.
- **Clean edit-mode:** on focus/entering a field, STRIP the display sign/unit (`-5.00` → `5.00` or
  `-5`; `175°` → `175`; `32mm` → `32`) so the user edits a clean number; re-apply formatting on commit.

## 3. Closure (hardened VFG gate — loaded state, mandatory)

Per Iron Rule 34 + the updated opticup-localhost-tester VFV gate (no empty-state screenshots):
- Verify in the LOADED editor (DRAFT open) on demo, BOTH glasses + contacts.
- Demonstrate each behavior with before/after evidence: type `5`+Enter in SPH → shows `-5.00` +
  highlight; type `+5` → `+5.00` no highlight; AXIS `175` → `175°`; PRISM `4` → `4.00△`; ADD `1.5` →
  `+1.50`; PD `32` → `32mm`; focus a formatted field → strips to clean number.
- Embed the loaded-state screenshots + the behavior table in TEST_REPORT.md AND FOREMAN_REVIEW.md.
- Confirm the normalized value is what gets autosaved to the DB (DB-write evidence), not the raw value.

## 4. Additional professional-UX proposals (FOR DANIEL'S REVIEW — not pre-approved)

The executor should NOT build these without Daniel's go-ahead; surface them in the morning summary as
options. The Architect recommends them based on optometry data-entry norms:
1. **Tab order = clinical flow** (R-row left→right then L-row), and Enter advances to the next field
   (not just commits) — keyboard-only entry, no mouse.
2. **Copy R→L for the whole refraction row** (not only ADD) — same eyes often symmetric; one button
   per the ADD pattern already shipped.
3. **Range-sanity soft-warning** (not blocking): SPH/CYL beyond ±20, AXIS outside 0–180, BC outside
   typical 8.0–9.5 → amber hint, still saveable (Daniel's "values out of range marked red" note in the
   mockup header already hints at this).
4. **Auto-fill VAcc default `6/6`** on new draft (most common), editable.
5. **"Transpose cyl" helper** (optometry: convert plus-cyl ↔ minus-cyl notation) — a small toggle for
   labs that work in the other convention. SaaS-clean: per-tenant default notation.

## 5. Anti-scope
- Do NOT touch the schema (all fields already exist + store numeric). This is display/input layer only.
- Do NOT change autosave/debounce architecture — only normalize the value before it reaches autosave.
- Do NOT build §4 items without Daniel's explicit approval.
