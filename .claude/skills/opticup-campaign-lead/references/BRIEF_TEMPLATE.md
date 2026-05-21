# Campaign Lead — Brief Template

> Use this template when writing a brief to a specialist (Analyst / Copywriter / Retrospective) or to the Campaign Overseer.
> Save the brief at `roles/campaign-overseer/briefs/{YYYY-MM-DD}_{SLUG}_BRIEF.md` (cross-campaign) or `campaigns/<campaign>/briefs/{YYYY-MM-DD}_{SLUG}_BRIEF.md` (campaign-scoped).
> Keep briefs short. A specialist should be able to start work after reading once.

---

# {BRIEF_TITLE} — Brief

> **Sealed:** YYYY-MM-DD · **Author:** Campaign Lead · **Audience:** {`opticup-campaign-performance-analyst` | `opticup-campaign-copywriter` | `opticup-campaign-retrospective` | `opticup-campaign-overseer`}
> **Risk class:** {LOW | MEDIUM} (campaign briefs are LOW unless they imply config application)

## 1. Goal (one line)

What the specialist should deliver, in one sentence.

## 2. Background (3–5 sentences)

Why we are doing this now. Cite source files the specialist must read:
- `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md` §X (always for Copywriter)
- `roles/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md` (live state)
- Prior analysis / retrospective files (if any)
- Memory entries (e.g., `feedback_clicks_are_not_actions`)

## 3. Constraints

- **Iron Rule 35 boundary** — restate the limit for this brief (e.g., "no new placeholders allowed; if X is needed, escalate to Architect SPEC").
- **Campaign-specific limits** — whitelist phones for test sends, demo-first per Iron Rule 33, no-PII-in-output, etc.
- **Authority mode** — restate the specialist's mode (READ-ONLY / RECOMMEND-ONLY / etc.).

## 4. Scope — what to touch

| Surface | Access |
|---|---|
| (table of files / DB tables / docs the specialist may read or write) | |

## 5. Scope — what NOT to touch

| Surface | Confirmed NOT touched |
|---|---|
| (table of out-of-scope surfaces — including any production write the specialist must NOT do) | |

## 6. Deliverable

Exact path + shape of the artifact. Examples:
- Analyst → `roles/campaign-overseer/analyses/{YYYY-MM-DD}_{SLUG}.md` with metric table + diagnosis + ranked next actions.
- Copywriter → draft template body in a `.md` doc with HE/EN/RU variants if applicable.
- Retrospective → `roles/campaign-overseer/retrospectives/{event-slug}-{date}.md`.
- Overseer → applies the named config change to demo first, verifies, then promotes to Prizma per Iron Rule 33.

## 7. Stop triggers

When the specialist should STOP and write back to the Campaign Lead instead of proceeding:
- Iron Rule 35 violation needed → escalate to Architect SPEC.
- Authority-mode mismatch (e.g., Analyst would need to write to DB).
- Genuinely new decision not covered by this brief.
- Data the specialist needs is missing or contradictory.

## 8. Cross-references

- `references/CAMPAIGN_LEAD_DECISIONS_LOG.md` — prior similar decisions (cite entry # if applicable).
- Prior briefs that produced relevant artifacts.
- Iron Rule 35 in `CLAUDE.md`.

## 9. Handoff

When the specialist completes:
1. Specialist writes the artifact to the path in §6.
2. Specialist updates `roles/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md` IF the artifact affects the live state Campaign Overseer consumes.
3. Specialist emits a one-line English status to Daniel.
4. Daniel re-engages Campaign Lead (`אתה האחראי על צוות הקמפיין`) — Lead reads the artifact, translates to plain Hebrew, asks the next strategic question.

---

*Brief authored by Campaign Lead. Specialist starts work after one read.*
