# Campaign Lead — Decisions Log

> **Purpose:** every meaningful Daniel ↔ Campaign Lead interaction captured. Read the most-recent 10 entries at bootstrap. When a pattern recurs 3 times → promote to a guidance bullet in `SKILL.md` via a Light Pipeline.
> **Owner:** `opticup-campaign-lead` skill.
> **Append-only.** Newest entries at the bottom.

## How to read this log

Each entry: situation → my recommendation → Daniel's response → outcome → lesson.

The log answers: "what did Daniel and I decide about campaign X 3 weeks ago and why?" without re-asking.

---

## Pattern Recurrence Tracker

When the same situation/response pair recurs:

| # of times seen | Action |
|---|---|
| 1 | Log entry only. |
| 2 | Add a line under "Recurring patterns (≤2 strikes — staging)" below. Flag, do not change SKILL yet. |
| **3** | **MUST PROMOTE before other work in the next session.** Edit `SKILL.md` to add the rule as a guidance bullet. Mark the trio of source entries with `[PROMOTED → SKILL §X]`. The promotion is the FIRST thing the next session does — acknowledged in the session-start ack line. Non-negotiable. |

This mirrors `opticup-architect/references/DECISIONS_LOG.md` and `opticup-strategic` SKILL's "3 reviews → must apply" rule. Non-overridable because the cost of NOT promoting is repeated Daniel time spent on the same correction.

### Recurring patterns (≤2 strikes — staging)

| Pattern (one line) | Strikes | Source entries |
|---|---|---|
| Asked Daniel a question (incl. small/binary) without a recommendation+reason | 1 | 2026-05-21 · email approval flow (icon/apply follow-up had no recommendation). Rule already in SKILL §Communication + memory feedback_always_recommend; reinforced SKILL with explicit "every question incl. binary" bullet 2026-05-21. |

---

## Entries

### 2026-05-21 · Swap stock→pricing link in registration-open msg + short-links screen visibility

**Situation:** Daniel wanted to replace the "stock page" link in the `event_registration_open` email + SMS with the pricing-catalog page (`supersalepricescatalog/`), renaming it "קטלוג המותגים והמחירים". Reason: last time he sent the stock link, registration didn't work well; pricing is one of the main things that changed since the last (pre-failure) run. He also asked to "add an ability to create static short links" which he thought he lacked. Separately, on seeing the short-links stats screen showing only 2 static links, he asked whether static links should appear there.

**My recommendation:**
1. On the link swap — I probed the DB (read-only) and found the static short link to the pricing page ALREADY EXISTS (`CEiBGCWj` → supersalepricescatalog). The email already had a 2-button "preview" block (stock + pricing); I recommended dropping the stock button and keeping a single pricing button. No new short link needed.
2. On the screen — I confirmed the static links exist in `short_links` but the screen hides them due to default filters ("רק עם קליקים" + 30 days). I recommended dispatching the Performance Analyst (read-only) to diagnose precisely before deciding on an Architect SPEC.

**Daniel's response:** Applied the SMS change himself; will apply the email change himself. Said "don't investigate historical things now — let's build the team's context from here forward." Approved dispatching the Analyst on the screen question.

**Outcome:** Wrote `roles/campaign-overseer/briefs/2026-05-21_SHORT_LINKS_SCREEN_VISIBILITY_BRIEF.md` (first brief in the folder). Did NOT write copy/Overseer briefs for the message change because Daniel chose to apply both edits himself.

**Lesson:** (1) Always probe the DB before assuming a "create new" task — the thing often already exists (the pricing short link AND the email pricing button were both already there). Saved a redundant create. (2) The short-links screen's "static links" appear per-tenant with distinct codes — a demo screenshot won't show prizma codes; that's by design, not a bug. (3) Daniel sometimes prefers to apply small config edits himself rather than route through the Overseer — offer the brief, but don't insist when he says he'll do it. (4) Daniel explicitly de-prioritized historical/root-cause analysis ("why did it fail last time") in favor of forward changes — respect that; don't push retrospective work he didn't ask for.

---

### 2026-05-21 · Rewrite email preview block to single pricing-catalog button

**Situation:** Continuing the same change — Daniel pasted the current `event_registration_open_email_he` HTML and asked me to rewrite the preview block ("הצצה לאירוע") so it points to the pricing catalog ("קטלוג המותגים והמחירים") for the new flow. He'll apply the email himself.

**My recommendation:** Collapse the 2-button row (stock + pricing) to a SINGLE pricing-catalog button, dropping the stock button, and rewrite the heading + intro to fit a pricing focus. Reason: leaving the stock button keeps drawing clicks to the page that caused the problem.

**Daniel's response:** Approved single-button (option א).

**Outcome:** Wrote `roles/campaign-overseer/briefs/2026-05-21_REGOPEN_EMAIL_PRICING_BLOCK_BRIEF.md` to the Copywriter. Did NOT write the HTML myself — routed it to the Copywriter per team flow (Lead briefs, Copywriter drafts).

**Lesson:** (1) The Copywriter skill has a "no raw URLs" anti-pattern (gateway bots) — but a STATIC catalog short link is the legitimate exception: it can't be a placeholder and the SMS already ships it. I had to explicitly carve out this exception in the brief so the Copywriter doesn't get blocked or try to substitute a placeholder. Worth remembering for future static-link briefs. (2) Resisted the temptation to just edit the HTML myself even though I had it in hand — the team flow is Lead-briefs → Copywriter-drafts. Doing the copy myself would collapse the role boundary the whole team architecture exists to maintain.

---

### 2026-05-21 · Analyst refuted my filter hypothesis → demo parity gap → Architect SPEC request

**Situation:** The Analyst returned findings on the short-links screen. My hypothesis (default filters hide static links) was REFUTED by code-read: the static-card section never reads the filter bar. The real cause: demo has only 2 of prizma's 4 `template_static` links — stock + pricing-catalog were never created on demo. This blocks Daniel's IR33 demo-first test of the registration-open message change (the /r/CEiBGCWj code doesn't exist on demo → 404).

**My recommendation:** Open a small Architect SPEC to backfill the 2 missing demo static links, so the message change can be tested on demo per the book. Asked Daniel whether he wanted to go by the book (demo-first) or had already tested on prizma directly.

**Daniel's response:** "תמשיך לפי הספר" — go by the book (demo-first).

**Outcome:** Verified the no-404 prerequisite myself (demo's existing static links already point at www.prizma-optic.co.il production pages, so backfilled demo links won't 404). Wrote `roles/campaign-overseer/briefs/2026-05-21_DEMO_STATIC_LINKS_BACKFILL_SPEC_REQUEST.md` to the Architect. This is a SPEC REQUEST, not a SPEC — the campaign team can't INSERT short_links infra rows (IR35).

**Lesson:** (1) When my own hypothesis seeds a brief, the specialist may refute it — and that's the system working. Don't anchor the brief so hard on the hypothesis that the specialist can't surface a different root cause. This brief's §7 stop-trigger ("if missing for a reason OTHER than filters, surface it") is exactly what let the Analyst correct me. Keep writing that escape hatch into briefs. (2) demo does NOT have its own storefront for these static marketing pages — it reuses prizma's production www pages. Useful infra fact for future demo-test reasoning. (3) The chain Lead→Analyst→(refute)→Architect-SPEC-request is the correct escalation path when an investigation lands in IR35 infrastructure territory; the Lead never does the INSERT itself.

---

### 2026-05-21 · Copy approved + visual preview rule + Overseer brief for email apply

**Situation:** Copywriter draft returned. I showed Daniel a visual preview of the new pricing block. Daniel approved heading + intro, then edited the intro himself (removed "המלא"). He also gave two standing instructions: (a) every question I ask must include my recommendation + reason; (b) he wants a real visual preview of any email/page change before approving.

**My recommendation:** Apply via Overseer demo-first per Iron Rule 33 (he'd said "by the book"), with the demo-static-links SPEC as a blocking prerequisite. Keep the eye header icon (complements the tag button icon).

**Daniel's response:** Approved the copy with the "המלא" removal. Approved eye icon implicitly (no objection). Approved preparing the Overseer brief. Confirmed both standing instructions.

**Outcome:** Locked approved copy in the copy-draft §1.0. Rendered visual preview (inline widget + full-email HTML file in workspace). Wrote `roles/campaign-overseer/briefs/2026-05-21_REGOPEN_EMAIL_APPLY_PRICING_BLOCK_OVERSEER_BRIEF.md` with the blocking dependency clearly stated. Updated SKILL §Communication with two explicit bullets (recommend-on-every-question incl. binary; visual-preview-before-approval) + added memory `feedback_visual_preview_before_approval`. Logged the missing-recommendation strike (1) in the Pattern Recurrence Tracker.

**Lesson:** (1) I rendered the email via an inline widget + a workspace HTML file because the sandbox has no headless browser and the desktop Chrome couldn't reach a file:// path cleanly. For future email previews: the workspace-HTML-file route (copy to C:\Users\User\opticup, present a computer:// link) is the reliable one; the inline widget is a good fast supplement for a single block but distorts dark-themed full emails (it forbids dark bg). (2) Caught my own earlier assumption: demo's email body ALREADY contains CEiBGCWj in text, but that code is a prizma short-link code — on demo it 404s because the demo short_links row doesn't exist. The template-body link text and the short_links table are two separate things; verify both. Flagged this precisely in the Overseer brief so the Overseer uses demo's OWN code, not prizma's.

---

*Maintained by `opticup-campaign-lead` skill. Bootstrap loads this file. Append only.*
