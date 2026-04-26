# FINDINGS — M4_CAMPAIGNS_MAKE_BODY_FIX_V3

> One entry per finding. Severity: INFO / LOW / MEDIUM / HIGH / CRITICAL.
> Findings are NOT fixed in this SPEC. Each entry suggests a next action.

---

## Finding 1 — Data Structure 573694 is now orphaned (LOW, cleanup-pending)

**Severity:** LOW (no impact on operation; latent debt).

**Location:** Make team 402680, Data Structure
`optic_up_facebook_campaigns_sync_body` (id 573694).

**What:** Created in V1 attempt (failed), reused in V2 attempt (failed),
unused in V3 (succeeded). No Make scenario currently references this DS.
Daniel decided to keep it post-V2 in case it would be useful in V3 or
beyond. V3 didn't use it. Safe to delete.

**Suggested next action:** Separate cleanup SPEC `M4_DELETE_UNUSED_DATA_STRUCTURE`
or include in next maintenance batch. `mcp__make__data-structures_delete`
with id 573694 will do it. Verify no other Make scenario references it
first via the metadata search.

---

## Finding 2 — Cron schedule is preserved but scenario is deactivated (INFO)

**Severity:** INFO.

**Location:** Make scenario `9126542`.

**What:** SPEC §8 says "schedule wiring (cron). Daniel sets schedule
manually after smoke test passes." Current state: `scheduling.type =
indefinitely`, `scheduling.interval = 14400` (every 4 hours). But
`isActive: false`. So nothing runs on autopilot until Daniel explicitly
activates.

**Suggested next action:** Daniel needs to flip activation. The first
production run will consume:
- 1 op for List Campaigns
- N ops for Insights (N = active campaigns, currently 7)
- N ops for HTTP (one POST per campaign)
- Total per run: 1 + N + N = ~15 ops
- Per day at 4-hour interval: 6 runs × 15 = 90 ops/day

That's well within the team's daily ops budget (10000/month plan, ~333/day).

---

## Finding 3 — Iteration pattern multiplies HTTP-module ops by N (INFO)

**Severity:** INFO (cost transparency for future architecture decisions).

**Location:** All Make scenarios using the iteration pattern documented
in `modules/Module 4 - CRM/docs/make-patterns/README.md`.

**What:** Compared to a hypothetical batched-array POST (1 HTTP per run),
the iteration pattern uses N HTTP ops (1 per item). For `9126542`'s 7
active campaigns, this is +6 ops/run. At 6 runs/day, that's +36 ops/day
vs batched. Trade-off accepted because batched broke for 3 SPECs straight.

**Suggested next action:** None for this scenario. Note for future scenarios:
if N is high (e.g., 100+ items), the iteration cost grows. At ~3000+
items/day total ops cost would push toward the 10000 monthly plan ceiling.
For high-cardinality cases, evaluate alternatives (Make Custom App,
Supabase queue + scheduled processor, etc.).

---

## Finding 4 — Demo tenant Facebook account is Prizma's, not Demo's (INFO, expected)

**Severity:** INFO (documented behavior, not a bug).

**Location:** Make scenario `9126542` Module 1 (`facebook-ads-cm:listCampaigns`)
points at Facebook ad account `act_270898661673629` (Prizma Optics).
Module 4 (HTTP) sends `tenant_slug: "demo"`. So Prizma's Facebook
campaigns land in the demo tenant's `crm_facebook_campaigns` table.

**What:** Intentional. SPEC §9 notes this. Demo tenant = test data,
Prizma tenant = production data, but Daniel's only Facebook ad account
is the Prizma one. So demo gets Prizma's campaign data for testing
purposes.

**Suggested next action:** When P7 (production cutover) lands, change
`tenant_slug` in the Make scenario body from `"demo"` to `"prizma"`
(or whatever Prizma's slug is). Document this in the README's "common
gotchas" section in a follow-up edit.

---

## Finding 5 — `event_type` heuristic is in Make's mapper, not the EF (INFO)

**Severity:** INFO (architectural observation).

**Location:** Make scenario `9126542` Module 3 (HTTP) `mapper.data`
template, the `event_type` field.

**What:** The campaign's event_type is derived from the campaign name
via `if(contains(name; "SuperSale"); "SuperSale"; if(contains(name;
"MultiSale"); "MultiSale"; ""))`. This logic lives in the Make scenario,
not the EF. If new event types get added (e.g. "BlackFriday"), the
Make scenario must be edited — the EF is unaware.

**Suggested next action:** None for now. Worth mentioning in a future
SPEC if/when the event_type taxonomy expands. Could move the heuristic
into the EF as a server-side normalization step, eliminating the
client-side branching.

---

*End of FINDINGS.*
