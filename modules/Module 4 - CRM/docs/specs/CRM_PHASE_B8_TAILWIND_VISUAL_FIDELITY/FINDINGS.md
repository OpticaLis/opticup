# FINDINGS — CRM_PHASE_B8_TAILWIND_VISUAL_FIDELITY

> **Executor:** opticup-executor
> **Run date:** 2026-04-21
> **Scope:** Findings logged during B8 execution that are OUT OF SCOPE for B8 itself but should be tracked.

---

## M4-TOOL-02 (LOW) — `rule-21-orphans` hook keeps flagging IIFE-local helpers

- **Location:** pre-commit hook (`scripts/verify.mjs` or equivalent orphan detector)
- **Observed during:** Commits 3, 6 of B8 — flagged 10+ false-positive "orphans" across these pairs:
  - `toast` defined in `crm-messaging-templates.js`, `crm-messaging-broadcast.js`, `crm-messaging-rules.js`, `crm-event-day-manage.js`, `crm-event-day-schedule.js`
  - `logWrite` defined in 3 messaging files
  - `initials` defined in `crm-leads-views.js`, `crm-leads-detail.js`
  - `formatTime` defined in `crm-event-day-checkin.js`, `crm-event-day-schedule.js`
  - `doCheckIn` defined in `crm-event-day-checkin.js`, `crm-event-day-schedule.js`
  - `updateLocal` / `updateLocalAttendee` defined in `crm-event-day-checkin.js`, `crm-event-day-manage.js`
  - `logActivity` defined in 3 event-day files
- **Description:** The detector flags any function name that appears in >1 file as a duplicate, but these are all IIFE-local (scoped inside `(function () { … })()` — not attached to `window`). They are intentional per-file helpers, not orphans. Hook is informational (doesn't block commits), but it generates noise that makes real orphans harder to spot. Same root cause as B3 `TOOL-DEBT-01` and M4-TOOL-01.
- **Severity:** LOW
- **Suggested next action:** TECH_DEBT entry — improve `rule-21-orphans` detector to skip function declarations inside IIFEs, or exempt helper names < 10 chars, or require the function to also be assigned to `window` / be in global scope to count as a potential orphan. Alternative: accept the noise and whitelist the common helper names (`toast`, `logWrite`, `formatTime`, `initials`, `logActivity`, `updateLocal`, `doCheckIn`).

---

## M4-UX-04 (LOW) — `font-heebo` token defined in Tailwind config but never applied to elements

- **Location:** `crm.html` lines 18–30 (`tailwind.config.theme.extend.fontFamily.heebo`); `modules/crm/*.js` (no `font-heebo` class used anywhere)
- **Description:** The SPEC §10.1 sample config added `fontFamily: { heebo: ['Heebo', 'sans-serif'] }`. This registers a `font-heebo` Tailwind utility. I did not apply it to any element in the render functions because `body.crm-page { font-family: 'Heebo', sans-serif; }` in `css/crm.css` already sets Heebo as the base font and Tailwind preflight doesn't override body font on this page. Net effect: the token is harmless but unused.
- **Severity:** LOW (cosmetic — does not affect rendering)
- **Suggested next action:** Either (a) in a future maintenance SPEC, prune the `fontFamily.heebo` entry from the Tailwind config as dead code, or (b) apply `font-heebo` explicitly on `.crm-content` and let Tailwind own the font stack for CRM inner elements for consistency. Dismiss if Daniel is happy with the current result.

---

## M4-TECH-02 (LOW) — Tailwind CDN runs JIT in-browser; could be extracted to static CSS

- **Location:** `crm.html` line 17: `<script src="https://cdn.tailwindcss.com?plugins=forms"></script>`
- **Description:** The Tailwind CDN ships ~15KB gzipped and runs a JIT compiler in the browser that generates CSS on-the-fly for every utility class it sees in the DOM. For Prizma's internal ERP use case this is fine (staff, trusted network, pages open for hours). But if the CRM is ever exposed to high-latency users, or if Daniel wants faster first-paint, the generated CSS can be extracted into a static file at build time (Tailwind CLI: `npx tailwindcss -o crm-tailwind.css --content crm.html,modules/crm/*.js`).
- **Severity:** LOW (performance optimization, not correctness)
- **Suggested next action:** New SPEC when/if first-paint performance becomes an issue. Includes: set up a one-shot build script (not a watch mode — respects "no build step" in CLAUDE.md §3), extract the CSS into `css/crm-tailwind.css`, swap the CDN `<script>` tag for a `<link rel="stylesheet">`. Defer until there's a real perf complaint.

---

## M4-UX-05 (INFO) — Some admin-only (`data-admin-only`) markers preserved but not re-wrapped in Tailwind

- **Location:** `modules/crm/crm-events-tab.js` line for `<th class="... data-admin-only>הכנסות</th>` and similar in `crm-event-day-manage.js`
- **Description:** The `data-admin-only` attribute is used by `css/crm.css` `.crm-role-team [data-admin-only] { display: none !important; }` to hide revenue from team role. I preserved every `data-admin-only` marker from B7. In a few places (e.g., `crm-events-tab.js` revenue `<th>` and `<td>`), the `data-admin-only` lives in the Tailwind-class-wrapped element — works correctly because `data-*` attributes are orthogonal to Tailwind classes. No action needed; just flagging for awareness during visual QA.
- **Severity:** INFO
- **Suggested next action:** None — flag preserved correctly. Dismiss.

---

## M4-CSS-01 (LOW) — 3 CSS files now contain < 20% of their B7 content; consider consolidation

- **Location:** `css/crm-components.css` (76 lines), `css/crm-screens.css` (98 lines), `css/crm-visual.css` (20 lines)
- **Description:** After B8 reduced these files aggressively (−327, −200, −227 lines respectively), they all fit comfortably into the 300-line soft target and could conceivably merge into a single `css/crm.css` addendum or a single `css/crm-shell.css`. Three separate files was appropriate when each held distinct component categories; now the split boundary is fuzzy.
- **Severity:** LOW (aesthetic / maintenance organization)
- **Suggested next action:** Defer a consolidation SPEC until after Daniel's visual QA. If QA passes and there are no regressions, a future cleanup SPEC can merge the 3 files into 1 shell CSS totaling ~194 lines. Dismiss if file-per-category split is preferred for future extensibility (e.g., when dark theme is adopted, adding a `crm-dark.css` would be natural alongside the existing split).
