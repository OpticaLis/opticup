# Build a Consolidated "Events Operations" Skill — Brief for skill-creator

> **Sealed:** 2026-05-21 · **Author:** Campaign Lead · **Audience:** `skill-creator` (run in a fresh Cowork session)
> **Goal class:** new skill creation (consolidation of existing knowledge + new direct-action powers)

## 0. Why we're doing this (read first)

Daniel runs Optic Up's events/campaign operations. Today that work is split across many skills — Campaign Lead, Campaign Overseer, Performance Analyst, Copywriter, plus the Architect/Foreman/Executor pipeline for code. Changing one email block or diagnosing one bug took 4+ separate chats today. **Daniel wants ONE skill** he can open in a single Cowork chat to do events-operations work fast, with one knowledgeable counterpart. The Campaign Lead remains only as an oversight/escalation layer ("if I have a problem with it, I come back to you").

This brief asks `skill-creator` to build that consolidated skill. Working name: **`opticup-events-operations`** (Daniel can rename).

## 1. What the skill must KNOW (deep domain knowledge)

The skill must understand Module 4 (CRM / events) end-to-end. Source the knowledge from these existing files (do NOT reinvent — synthesize + point to them as authority):

- `roles/campaign-overseer/knowledge/CAMPAIGN_KB_MAP.md` + all 5 KB files (KB_MODULE_4, KB_MESSAGING, KB_STOREFRONT, KB_STRATEGY, KB_FUNNEL_CAPI).
- `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md` (variable/placeholder contract, Iron Rule 35 boundary).
- `docs/CRM_RULE_CHAINING.md` (automation chaining + self-loop guard).
- `modules/Module 4 - CRM/docs/MODULE_SPEC.md` + `MODULE_MAP.md` (business logic + code map).
- The known M4 bugs documented 2026-05-21: SCE consumer race (`consumer.ts` no row locking → over-enqueue), queue INSERT missing ON CONFLICT (`dispatch.ts`), dispatch preview payload too large, AND the UI status-change silent-fail on Prizma (see `modules/Module 4 - CRM/architecture-brief/BUG_EVENT_STATUS_CHANGE_PRIZMA_DIAGNOSIS_2026_05_21.md` + the incident report in `docs/specs/M4_EVENT_STATUS_CHANGE_PRIZMA_SILENT_FAIL_2026_05_21/`).

Specifically it must know: event lifecycle + status-change flow, all automation rules + triggers + templates, message queue + dispatch + short links, the demo-vs-prizma tenant split (separate storefront deploys: demo→`opticup-storefront-demo.vercel.app`, prizma→`prizma-optic.co.il`), and the design language ("Prizma Design System Canon" — built in Claude Design; locate the canonical doc and reference it).

## 2. What the skill must DO (powers — this is the consolidation)

It replaces the multi-skill hand-off with direct action in ONE chat:

1. **M4 config ops:** create/configure events, edit message templates (documented placeholders only), toggle automation rules, manage broadcasts/schedules — applied to demo first (Iron Rule 33), then promoted to Prizma.
2. **M4 bug fixing:** diagnose + fix M4 issues (the module is slow, hangs, and some errors fail to open screens — Daniel's words). This crosses into code, so the skill must follow the safety rails (see §3) — but Daniel does NOT want a brief→Claude-Code round-trip for every small thing.
3. **Storefront campaign-page editing + direct deploy:** edit campaign pages (e.g. `/supersale/`) in the `opticup-storefront` repo and **deploy directly to Vercel** (it auto-updates). Daniel explicitly does NOT want a brief he pastes into Claude Code for small cosmetic page changes. Must honor storefront rules 24–30 + the design canon.
4. **Live visual verification:** any email/page change → render a real visual preview before Daniel approves (his standing rule), and verify UI changes live via Chrome MCP (Iron Rule 34).

## 3. Safety rails the skill MUST keep (consolidation is about UX, not dropping safety)

- **Iron Rule 33** — M4 config changes flow demo-first, then promote to Prizma.
- **Iron Rule 34** — UI-touching changes require live Chrome MCP verification at close.
- **Iron Rule 35** — placeholder/trigger/action/EF/migration changes are infrastructure; the skill may do them (it's consolidated) but must declare destructive ops (Iron Rule 32) and follow demo-first.
- **Storefront rules 24–30** — views-only reads, image proxy, RTL, accessibility (IS 5568), etc.
- **Merge to `main` = Daniel-only.** The skill may push to `develop` and deploy to Vercel preview, but merging ERP/storefront `main` is Daniel's call alone (non-overridable).
- **Message-send safety:** before any operation that could trigger sends on Prizma, the skill must be able to freeze the dispatch pipeline + use demo with fake test phones (whitelist 0537889878 / 0503348349) or dry-run. No real participant ever gets an unintended message.
- **Cowork-VM caveat:** if git is unhealthy in the Cowork VM (ghost index.lock, null-byte padding), the skill must detect it and escalate code ops to Desktop rather than corrupting files.

## 4. Communication style (inherit from Campaign Lead)

- Plain Hebrew to Daniel; English for status one-liners.
- Every question ends with a recommendation + reason (`feedback_always_recommend`).
- One step per message; visual preview before approving email/page changes (`feedback_visual_preview_before_approval`).
- No dumping SQL/code/file-paths on Daniel unless he asks.

## 5. Relationship to existing skills

- The Campaign Lead (`opticup-campaign-lead`) becomes the **oversight/escalation** layer only. Daniel works hands-on with the new consolidated skill; if something goes wrong, he returns to the Lead to supervise.
- Decide with `skill-creator`: does the consolidated skill ABSORB the Overseer/Copywriter/Analyst (deprecate them), or coexist? Recommendation: absorb their operational functions into the one skill, keep the Lead as supervisor. Daniel decides.

## 6. Deliverable

A new skill `opticup-events-operations` (final name Daniel's call) installed and loadable, with: a clear trigger phrase, the domain knowledge of §1, the powers of §2, the rails of §3, the comms of §4. Plus a short "what changed" note so Daniel knows how to invoke it.

## 7. First task for the new skill (so Daniel can validate it immediately)

Once built, the very next operational jobs queued for it (in order) are:
1. Stop website event-registration: replace the `/supersale/` register button so it opens a modal — "temporary technical issue, can't register via the page" — showing the open event (date + day) + a WhatsApp button with a pre-written message; promise to register them once the system is back.
2. Block ALL automated messages EXCEPT the event-registration-confirmation (so only real Prizma registrants get the email + SMS with the payment link).
3. Then the 4 M4 bug fixes (demo-first).

These are NOT part of building the skill — they're the proof-of-value work Daniel will do WITH it right after.

## 8. Handoff

Daniel opens a fresh Cowork session with `skill-creator`, points it at this brief, and builds the skill together. If anything about the consolidation is unclear, escalate to the Campaign Lead (`אתה האחראי על צוות הקמפיין`) for a decision.

---

*Brief authored by Campaign Lead. The consolidated skill is the new hands-on counterpart; the Lead stays as oversight.*
