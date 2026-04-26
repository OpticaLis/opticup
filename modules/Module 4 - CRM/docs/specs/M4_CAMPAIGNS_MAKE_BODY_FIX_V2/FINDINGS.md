# FINDINGS — M4_CAMPAIGNS_MAKE_BODY_FIX_V2

> One entry per finding. Severity: INFO / LOW / MEDIUM / HIGH / CRITICAL.
> Findings are NOT fixed in this SPEC. Each entry suggests a next action.

---

## Finding 1 — `{{N.json}}` substitution into `mapper.data` produces empty wire body (HIGH)

**Severity:** HIGH (this is the new trap the toy-test hadn't surfaced;
blocks any V3 attempt that uses CreateJSON via `{{<id>.json}}` reference).

**Location:** Make scenario `9126542`, HTTP module's `mapper.data` field
when set to a bare `{{5.json}}` substitution referring to a `json:CreateJSON`
upstream module.

**What happened (Rung 2 of this SPEC):** Configured the scenario as 1→2→3→
5(CreateJSON, DS 573694, mapper binds tenant_slug, shared_secret, campaigns)
→ 4(HTTP, `mapper.data = "{{5.json}}"`, `mapper.body = ""`). Make execution
ran cleanly (status=1, 13 ops, 195s duration, transfer 82926 bytes per
Make's counter). **EF logs show NO request received between 12:47Z and
12:52Z** — the HTTP module's wire body was empty. Same failure shape as
toy Configurations A and B (where bare `{{1.json}}` in `mapper.body` also
produced empty wire body).

**The completed picture of the trap:**
- `mapper.body` with anything = wire body empty (toy A, B, C confirmed).
- `mapper.data` with hardcoded literal JSON = wire body sent (toy D).
- `mapper.data` with template containing `{{3.array}}` substitution = wire
  body sent (this SPEC's Rung 1; EF returned 400 because the array
  serialization isn't strict JSON, but the request DID arrive).
- `mapper.data` with bare `{{5.json}}` referencing CreateJSON output =
  wire body empty (this SPEC's Rung 2). New finding.

**Possible root causes** (not investigated; for V3 SPEC author):
1. `json:CreateJSON`'s output property isn't named `.json`. Try
   `{{5.value}}`, `{{5.output}}`, `{{5}}`.
2. `mapper.data` requires substitutions to be embedded in surrounding
   literal text (like `{{5.json}}` inside `{ "wrap": {{5.json}} }`) —
   bare-substitution variants are silently treated as empty. Toy Config B
   tested this for `mapper.body` and it still produced empty; not yet
   tested for `mapper.data`.
3. `mapper.data` interprets a bare `{{}}` reference differently than a
   compound template — possibly evaluating it as a buffer rather than as
   a string-with-substitutions.
4. The CreateJSON module isn't actually producing output usable by the
   downstream HTTP module — possibly because of how the array binding
   from `{{3.array}}` to the DS's `campaigns` field interacts.

**Suggested next action:** New investigation SPEC before V3 — toy-test
specifically `mapper.data = "{{N.json}}"` and `mapper.data = "{ \"x\":
{{N.json}} }"` to disambiguate. Then write V3 with confirmed-working
syntax. ~5-8 Make ops cost; cheap experiment. Could also test
`{{N.value}}` and `{{N.output}}` references in the same toy.

---

## Finding 2 — Rung 1 confirmed `{{3.array}}` interpolates as Make's proprietary array syntax (MEDIUM)

**Severity:** MEDIUM (confirms the original V1 hypothesis after
investigation cycle; informs V3 design).

**Location:** Make HTTP module v3, `mapper.data` field with template
containing `{{3.array}}` referring to a `BasicAggregator` output.

**What happened:** Rung 1 set `mapper.data = "{...campaigns: {{3.array}}}"`.
Make sent the request to the EF (12:44:47Z, 1 entry in EF logs). EF
returned HTTP 400 "Invalid JSON body". The wire body was non-empty (EF
recorded the request) but not strict JSON. Most likely Make's array
serialization wraps each item with `[N]:` index syntax (e.g.
`[{"name":[1]: "X"}]`) which JS `JSON.parse` rejects.

**Suggested next action:** Confirms why direct `{{N.array}}` interpolation
into a raw HTTP body has never worked for this scenario — even with the
correct field name. The V3 SPEC must transform the array into strict JSON
before referencing it (CreateJSON, or pre-stringify, or build manually
inside the aggregator output, or some other approach). The exact mechanism
is currently unknown — see Finding 1.

---

## Finding 3 — Iterated SPEC (V1 → V2 → V3?) is hitting diminishing returns without per-execution wire-body inspection (MEDIUM)

**Severity:** MEDIUM (process / tooling).

**Location:** opticup-executor + opticup-strategic skills, iteration
between SPECs.

**What happened:** The Make → Optic Up Edge Function fix has now consumed
3 SPECs (M4_CAMPAIGNS_MAKE_BODY_FIX V1, the toy-test investigation, and
this V2). Each SPEC ate ~30 minutes + curl-/Make-/Supabase-MCP calls and
~25 Make ops. The fundamental blocker each time has been the SAME: we
cannot directly observe what bytes Make is sending on the wire. Make's UI
reports success regardless of empty body. EF logs show the bytes that
arrived — but only AFTER they arrived, with no module-level breakdown.

**Suggested next action:** Before V3, either:
- (a) Set up a permanent webhook.site (or self-hosted equivalent) endpoint
  the executor can route to during smoke tests for any Make-related fix,
  to inspect wire bodies directly. Document the route in
  `modules/Module 4 - CRM/docs/make-patterns/README.md` (when it exists).
- (b) Instrument the EF (`facebook-campaigns-sync`) to log the raw body
  bytes it received (not just the parsed JSON, since parse fails). Add a
  debug-mode flag controlled by `body.debug = true` so it's opt-in.
- (c) Both. Most robust.

Doing this now will save the next 1-3 SPEC cycles.

---

## Finding 4 — DS 573694 has been used in 2 failed attempts and 0 successes (LOW, INFO)

**Severity:** LOW (informational; not a bug, just a note).

**Location:** Make team 402680, Data Structure 573694
(`optic_up_facebook_campaigns_sync_body`).

**What:** Created in V1 attempt (also failed). Reused in V2 Rung 2 (this
SPEC, also failed). Daniel decided to keep it post-V1 per "reusable;
orphaned but harmless." Still applies — we may need it for V3.

**Suggested next action:** Delete only when V3 confirms whether CreateJSON
+ DS pattern is the right approach or not. If V3 succeeds without
CreateJSON, delete then.

---

## Finding 5 — DB tables remain empty for demo tenant (INFO)

**Severity:** INFO.

**Location:** `crm_facebook_campaigns` and `crm_ad_spend`, tenant_id
`8d8cfa7e-ef58-49af-9702-a862d459cccb`.

**What:** Both tables have 0 rows. Same as before V2 — neither Rung
populated them.

**Suggested next action:** None until V3 succeeds.

---

*End of FINDINGS.*
