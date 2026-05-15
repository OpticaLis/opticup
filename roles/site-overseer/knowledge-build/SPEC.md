# SPEC — SITE_OVERSEER_KNOWLEDGE_BUILD_FUNNEL

> **Location:** `roles/site-overseer/knowledge-build/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, Site Overseer hat)
> **Authored on:** 2026-05-14
> **Mode:** PURE DIAGNOSTIC / KNOWLEDGE MAPPING — NO FIXES, NO WRITES, NO DEPLOYS
> **Output destination:** `roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md`

---

## 1. Goal

Produce a comprehensive, evidence-based knowledge map of how the Optic Up marketing/CRM funnel is actually wired today. The Site Overseer's existing SKILL.md has gaps that caused incorrect conclusions on 2026-05-14 (specifically: misreading UTM semantics, conflating broadcast registration with event registration, missing the actual data flow between lead intake → automation rules → broadcasts → event attendees → pixel).

This SPEC outputs a single `KNOWLEDGE_MAP.md` that — after Daniel verifies findings one question at a time — will be merged into `SITE_OVERSEER_SKILL.md` so future Site Overseer sessions don't repeat the same architectural confusion.

---

## 2. Background & Motivation

On 2026-05-14, Site Overseer attempted to diagnose why event #24 received only 12 registrations vs. baseline 56-90. The investigation produced 3 different wrong conclusions in a row:

1. First wrong conclusion: "1170 broadcasts queued but never sent" (the broadcasts DID send; `crm_broadcasts.total_sent=0` is a bookkeeping artifact, not reality).
2. Second wrong conclusion: "The funnel converted 7.8% — that's the real baseline" (the diagnostic report's framing was wrong; it conflated `crm_leads.status='invited'` with "people who tried to register").
3. Third wrong conclusion: "UTMs on the 13 registered attendees prove they came from FB, not from the broadcast" — but UTMs are written at LEAD CREATION time (when someone first joined the event system, possibly a year ago), NOT at event-registration time. The UTM tells you the lead's original source, not the source of their event-24 registration.

Each wrong conclusion came from missing structural knowledge. The fix is not to be more careful — the fix is to MAP THE ARCHITECTURE so it can be referenced instead of inferred.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected | Verify |
|---|-----------|---------|--------|
| 1 | Read-only mode | 0 writes; 1 commit at end with the knowledge map only | `git log` |
| 2 | `KNOWLEDGE_MAP.md` exists | File present at the SPEC folder | `ls` |
| 3 | Map covers all 10 layers (see §4) | All 10 sections present | structural check |
| 4 | Each claim cites code or DB evidence | Every "X works like Y" statement has a file path or table reference | review pass |
| 5 | Distinguishes "what's measured" from "what isn't" | A dedicated section labels every funnel stage as MEASURED / UNMEASURED / PARTIAL | section presence |
| 6 | Identifies the 5 most impactful tracking/measurement gaps | Section "Top 5 Tracking Gaps" with evidence per gap | section presence |
| 7 | Produces ranked open questions for Daniel | At least 8 questions, each answerable with one sentence | section presence |
| 8 | Single commit | 1 commit | `git log` |

---

## 4. The 10 Layers to Map

The executor must produce one section per layer. Each section answers: "What is it? Where does it live? How is it wired? What's measured? What's NOT measured?"

### Layer 1 — Lead Acquisition (top of funnel)
- All entry points: every form, every URL that creates a `crm_leads` row
- Map: source page → API endpoint → Edge Function → DB write
- Specifically: `/supersale/`, `/quick-register/`, any homepage form, any other tenant-facing form
- Document: which fields are captured, which are optional, what defaults are applied

### Layer 2 — UTM & Attribution
- When are UTMs captured? (browser session → form → Edge Function → DB)
- Where do they live? (`crm_leads.utm_*` columns — first-touch only)
- What happens on second registration of the same phone? (deduplication — do UTMs update or stay?)
- Critical: distinguish "lead's original source" (what UTMs measure) vs "what action they're taking now" (which UTMs do NOT measure)

### Layer 3 — Automation Rules
- Table: `crm_automation_rules` (or equivalent)
- What triggers fire? (lead created, lead status change, event status change, broadcast sent)
- What actions are taken? (send message, upsert attendee row, status change, etc.)
- Specifically: the `event_invite_new` rule vs. the `event_registration_open` rule — what does each one DO

### Layer 4 — Event System
- `crm_events` table structure
- Event statuses and transitions (draft → planning → registration_open → live → closed → completed)
- Capacity logic (`max_capacity`, `max_coupons`, `extra_coupons`)
- `crm_event_attendees` and how rows get created (form submission, automation rule, manual, Monday-import)
- `attendee.status` values and what each means (`invited`, `registered`, `confirmed`, `attended`, `waiting_list`, etc.)

### Layer 5 — Broadcasts
- `crm_broadcasts` table — what fields, what statuses
- Send flow: ERP UI → `crm_broadcasts` row → Edge Function / Make → SMS/email gateway
- **Critical:** where is the ACTUAL log of "did this send to this phone"? `crm_message_log`? `crm_automation_runs`? Make scenario history? Both?
- `total_sent` accuracy — does the system update it from Make callbacks, or is it always 0?

### Layer 6 — Message Templates
- `crm_message_templates` table structure
- Variable substitution: `%name%`, `%event_name%`, `%registration_url%`, etc.
- How is `%registration_url%` generated? Per-lead unique token? Generic?
- Per-recipient unsubscribe URLs — how generated, tracked

### Layer 7 — Click Tracking & Short URLs
- The `r.html` short-link redirector at `/r/<code>`
- `short_links` table or equivalent — what's logged when?
- prizmaoptic.short.gy (external) — separate tracking system; what does it log?
- **Critical gap:** are SMS clicks tracked at all? Email clicks? At which layer?

### Layer 8 — Form Submission
- The full lifecycle from "user clicks submit" to "lead in DB + attendee row created"
- `lead-intake` Edge Function flow (synchronous write + background dispatch as of 2026-05-14)
- The pre-fill mechanism: how a known lead arriving via `%registration_url%` gets their form pre-populated
- When does `crm_event_attendees` row get created vs `crm_leads` row vs both

### Layer 9 — Pixel & Conversion Tracking
- Pixel ID `304574492100180`
- Where is it loaded? Which pages? Consent-gated how?
- Event mapping: `PageView`, `Lead`, etc. — defined where? (`storefront_config.analytics.pixel_events`)
- The match-quality side: what does the pixel know about each user? (cookies only? email? phone?)
- Server-side / CAPI: is there ANY server-side conversion API integration today, or is it browser-only?

### Layer 10 — Make Scenarios
- Which scenarios exist? (lead-intake handler, send-message dispatcher, others)
- What does each one DO? What does it WRITE BACK to Supabase?
- Where do scenario execution logs live? (Make internal only? Mirrored to DB?)
- What's the difference between "Make scenario succeeded" and "user received the message"

---

## 5. Stop-on-Deviation Triggers

- If any layer cannot be reliably mapped from code/DB (e.g. Make scenarios that the executor cannot inspect) → document the gap explicitly, don't guess
- If two pieces of evidence contradict → list both, mark UNRESOLVED, add to the questions-for-Daniel list
- Any temptation to write/fix/update anything → STOP. This is mapping only.

---

## 6. Rollback Plan

`git revert {HASH}` removes the knowledge map. Zero state change.

---

## 7. Destructive Operations

**None.** Pure read-only.

---

## 8. Out of Scope

- Building the Layer-1-to-4 improvements (CAPI, match-quality, Custom Conversions, etc.) — that's a separate SPEC after the map is verified
- Fixing the event-24 funnel — separate SPEC after the map is verified
- Updating SITE_OVERSEER_SKILL.md directly — the merge happens after Daniel verifies each layer's findings
- Re-running the event-24 diagnostic — the diagnostic was wrong because of missing knowledge; this SPEC produces that knowledge so the next diagnostic can be right

---

## 9. Expected Final State

### New files in this SPEC folder
- `KNOWLEDGE_MAP.md` — the main deliverable; one section per layer; evidence-cited
- `EXECUTION_REPORT.md` — standard
- `FINDINGS.md` — if any meta-findings

### DB state
**Unchanged.** Zero writes.

### Docs updated
Only files inside this SPEC folder. NO SKILL.md edit yet — that follows verification with Daniel.

---

## 10. Commit Plan

**Single ERP commit:**
- Files: `KNOWLEDGE_MAP.md` + `EXECUTION_REPORT.md` + `FINDINGS.md`
- Message:
  ```
  docs(site-overseer): build knowledge map of CRM + funnel architecture

  Read-only mapping of 10 layers: lead acquisition, UTM/attribution,
  automation rules, events, broadcasts, templates, click tracking,
  form submission, pixel/conversion, Make scenarios. Output to be
  reviewed with Daniel one layer at a time before merging into the
  Site Overseer SKILL.

  Refs: SPEC SITE_OVERSEER_KNOWLEDGE_BUILD_FUNNEL
  ```

---

## 11. Dependencies / Preconditions

- ERP repo on `develop`, scope-clean
- Supabase MCP Level-1 read access
- Read access to deployed Edge Functions via `get_edge_function`

---

## 12. Lessons Already Incorporated

- Three wrong conclusions today (2026-05-14) prove that inference without grounded architecture knowledge is unreliable. The fix is the map, not the inference.
- Read-only-first principle (every diagnostic SPEC since M3_SITE_COMPREHENSIVE_REVIEW) — APPLIED.

---

*End of SPEC.*
