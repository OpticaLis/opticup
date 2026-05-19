# FOREMAN_REVIEW — M3_DEMO_WEBHOOK_SCRUB

**SPEC:** `modules/Module 3 - Storefront/docs/specs/M3_DEMO_WEBHOOK_SCRUB/SPEC.md`
**Foreman:** opticup-strategic (acting as Site Overseer)
**Date written:** 2026-05-18
**Closure status:** 🟡 PARTIAL (8/9) — **accepted as final close.** Remaining defect (F-1 meta_title) explicitly deferred per Daniel directive 2026-05-18.

---

## 1. Summary judgment

The Executor delivered exactly what was authorized. The 3 declared destructive ops (webhook scrub + email rewrite + seo flip) all landed cleanly with expected row counts. The 1 failing criterion (rendered `<title>` still says פריזמה) is a Foreman SPEC-authoring defect — I asserted "Astro reads `<title>` from `storefront_config.seo.title`" without curl-probing the rendered HTML to confirm. The actual source is per-page `storefront_pages.meta_title`. The Executor caught this post-write and held Rule 32, refusing to UPDATE meta_title (not in §4 declared list).

**Daniel decision 2026-05-18:** demo storefront is "good enough" for M4 form-flow testing. The 3 deliverables that matter to him work:
1. ✅ supersale form lands in demo M4 (no prizma webhook leak)
2. ✅ legal pages don't expose prizma support emails
3. ✅ visual rendering: header + hero + sections + images all render

The cosmetic `<title>` defect is **explicitly deferred** — no follow-up SPEC. If/when demo goes public-facing, a future SPEC can sweep meta_title + meta_description across 48 pages.

**Net assessment:** Executor 9/10. Foreman 6/10 — same authoring discipline gap as the predecessor SPEC (assumption-without-probe). Two SPECs in a row I missed a render-source mapping. This is the pattern to fix.

---

## 2. Foreman self-scoring

| Criterion | Score | Reason |
|---|---|---|
| (a) Scope clarity | 9/10 | 3 distinct deliverables, each scoped to specific column + tenant. Out-of-Scope §8 explicit. |
| (b) Pre-flight depth | 7/10 | §3 included counts + bytes inspection + prizma-untouched sanity. But no rendered-HTML curl probe to verify the `<title>` source mapping — the gap that caused the partial. |
| (c) Destructive-Ops declaration (Rule 32) | 7/10 | Better than predecessor — 3 ops declared including UPDATE on blocks. But missed declaring UPDATE on meta_title/meta_description/title which turned out to be needed for SC #7. |
| (d) replace() pattern correctness | 9/10 | Hex-dump probe in §2 + escape-aware `E'\\"...\\"'` patterns. This time the patterns worked. Predecessor's lesson absorbed. |
| (e) Source-of-truth mapping | 3/10 | The single largest defect. SPEC §2 F-3 stated "The `<title>` tag the storefront emits is built from `seo.title`." This was unverified — should have run `curl https://opticup-storefront-demo.vercel.app/ \| grep -A0 '<title>'` BEFORE authoring §4. Would have shown that `seo.title` doesn't render anywhere. |
| (f) Snapshot/rollback | 9/10 | BACKUPS/ committed pre-write. Robust. |
| (g) Verification coverage | 7/10 | §5 had 5 curl assertions including prizma-untouched check. But check B (`webhook_url=""` literal grep) assumed Astro renders the attribute literally — Astro processes it server-side and emits JS. Surface-form vs. semantic-form confusion. |
| (h) Documentation hygiene | 9/10 | EXECUTION_REPORT + FINDINGS + BACKUPS all in folder. References to predecessor SPEC + Daniel's deferral decision. |

**Composite:** **7.5/10**. Improvement from predecessor's 5.8. The pattern-discipline (jsonb-text escape) improved; the new gap (render-source confirmation) is the next thing to fix.

---

## 3. Executor scoring — Foreman concurrence

The Executor's self-scoring (from EXECUTION_REPORT §8 — implicit in commit summary):
- Adherence to SPEC: 8/10 (auto-fixed D-2 + D-3 within intent; held Rule 32 on F-1)
- Iron Rules: 9/10
- Commit hygiene: 9/10
- Documentation: 9/10

**Foreman concurs.** The Executor delivered exactly what was authorized and stopped at the right boundary. The decision to edit the SPEC's `## 4. Destructive Operations (Iron Rule 32 — declared list)` heading → `## 4. Destructive Operations` (because the destructive-ops-declared.mjs hook regex didn't match the parenthetical) is a tactical fix within owned scope. Documented in commit. No issue.

---

## 4. Specific accountability — Foreman authoring mistakes (this SPEC)

### Mistake #1 (carried over from predecessor's pattern) — Assumption without rendered-HTML probe

**What I should have done:** before writing §4 Step 4 (UPDATE on `storefront_config.seo`), I should have run `curl https://opticup-storefront-demo.vercel.app/ -o /tmp/check.html && grep -E '<title>|<meta name="description"' /tmp/check.html` to see WHERE the current rendered values come from. Then matched those source strings against the DB.

**Why I missed it:** I extrapolated from predecessor SPEC's verification subagent comment ("`<title>` says אופטיקה פריזמה") that the rendered title traced to `storefront_config.seo.title`. That was a guess presented as a fact. The actual chain is: `storefront_pages.meta_title` (per slug/lang) → `<title>` tag. The `storefront_config.seo.title` is a fallback / homepage-only default at best.

**Cost:** 1 success criterion failed → 🟡 PARTIAL → 30-min potential follow-up SPEC (now deferred by Daniel).

**Fix forward:** Proposal A below — codify "verify render-source via curl before authoring UPDATE on display-rendered columns."

### Mistake #2 — Verification recipe surface-form confusion

**What:** §5 check B grep'd for literal `webhook_url="..."` in rendered HTML. Astro processes the form block server-side; the literal text never reaches the browser. The semantic outcome (the webhook URL doesn't appear anywhere in the rendered page) IS satisfied by check A.

**Why I missed it:** I thought of `webhook_url` as an HTML attribute that survives to the rendered page. It's actually a shortcode parameter consumed at build/render time.

**Cost:** misleading "🟡" classification for what was actually a semantic-success. Captured in FINDINGS F-2 as "MEDIUM severity, spirit-satisfied."

**Fix forward:** Proposal B below — "verification asserts the SEMANTIC outcome, not the literal source form."

---

## 5. What went RIGHT

1. **Tenant-id locking.** All UPDATEs included demo UUID literal in WHERE. Prizma verified untouched (criterion #8 + #9 ✅).
2. **Escape-aware patterns.** Hex-dump probe in §2 → `E'\\"...\\"'` patterns → 0 affected_rows mismatches. Predecessor's lesson absorbed.
3. **Snapshot-first.** BACKUPS/demo_blocks_pre.json + demo_seo_pre.json committed before any write.
4. **Email rewrite precision.** 3 separate UPDATEs (service@/nayedet@/events@) instead of 1 broad `@prizma-optic.co.il` replace. Exact totals matched expectations (24 + 3 + 2 = 29 affected rows, 29 demo@ now present). No collateral damage.
5. **Real-time SPEC-defect handling.** The Executor edited `## 4. Destructive Operations (Iron Rule 32 — declared list)` heading to `## 4. Destructive Operations` when the destructive-ops-declared.mjs hook regex rejected the parenthetical. Within owned scope per §5, documented in commit. Better than failing the hook.
6. **PARTIAL discipline.** Held Rule 32 on F-1 even though the fix was 4 lines of SQL. The next SPEC could have legitimately authorized it — but the Executor doesn't get to grant itself authority. Correct.

---

## 6. Cross-check against project memory

| Source | Rule | Compliance | Note |
|---|---|---|---|
| `feedback_no_polish_by_validation` | "MUST escalate, MUST NOT silent green-close" | ✅ | Closed 🟡 PARTIAL with explicit F-1 failure documented. |
| `feedback_never_propose_wind_down` | Stopping is Daniel-only | ✅ | Executor continued through closure. Daniel made the deferral call on the open finding. |
| `feedback_always_recommend` | Options must end with recommendation | ✅ | Foreman recommended "מסלול 1 — לסיים פה" before Daniel decided. |
| `feedback_always_saas_clean` | Recommend SaaS-clean by default | N/A | This SPEC is data-cleanup of a specific tenant — SaaS-clean already (tenant_id-locked). |
| Iron Rule 32 | Declared destructive list non-overridable | ✅ | Held even when fix was trivial. |
| `feedback_finish_the_sequence` | Chain dispatches | ✅ | Foreman authored and dispatched SPEC the moment predecessor closed. Daniel didn't have to ask. |
| `feedback_audit_real_world_check` | Classify findings by live harm | ✅ | F-1 = "demo title cosmetic" classified correctly as deferrable (not blocking M4 testing). |

---

## 7. Skill-improvement proposals — opticup-strategic (self-improvement)

Per opticup-strategic SKILL's "self-improving" mandate.

### Proposal A — "Render-source confirmation probe" added to SPEC §3 pre-flight

**Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` (or equivalent), in "Step 0 — Pre-flight checks." Add:

> **For any SPEC that UPDATEs a column expected to drive rendered HTML output:**
> Before declaring the UPDATE in §4, run:
> ```bash
> curl -sL <production_url> -o /tmp/preflight.html
> grep -nE '<title>|<meta name="description"|<meta property="og:title"' /tmp/preflight.html
> ```
> Then SELECT the candidate column(s) from the DB and visually MATCH the rendered values against DB values. If they don't match exactly, the column you're about to UPDATE is NOT the render source. Find the actual source before §4.
>
> **Reference:** `M3_DEMO_WEBHOOK_SCRUB` SPEC §2 F-3 incorrectly identified `storefront_config.seo.title` as the `<title>` source. Actual source is `storefront_pages.meta_title` per slug/lang. Cost: 🟡 PARTIAL close, 1 deferred follow-up.

**Rationale:** This is the second SPEC in a row where I assumed a render-source mapping without verifying it. The hex-dump probe (Proposal A from predecessor SPEC) handles BYTE-form correctness. This new probe handles COLUMN-source correctness. Together they cover the 2 most common "looks right but doesn't render" failure modes.

### Proposal B — "Spirit-satisfied" sub-category in 🟡 PARTIAL closure

**Where:** opticup-strategic SKILL.md, in the "SPEC closure status" section. Add:

> **🟡 PARTIAL closures can be sub-classified:**
> - **🟡 PARTIAL (data-defect):** A success criterion failed because the data isn't right. Example: webhook still present after intended scrub. Requires follow-up SPEC.
> - **🟡 PARTIAL (verification-defect, spirit-satisfied):** A success criterion failed because the verification recipe was wrong, but the underlying business outcome IS achieved. Example: M3_DEMO_WEBHOOK_SCRUB §5 check B (literal `webhook_url=""` grep) failed because Astro processes the form server-side; check A (`grep -c jewyavndaly` returns 0) confirms the SaaS-isolation goal IS satisfied. No follow-up SPEC needed; just update the verification recipe in the SKILL for future SPECs.
>
> The FOREMAN_REVIEW must distinguish which kind. The "spirit-satisfied" sub-class avoids creating follow-up SPECs for verification-recipe bugs.

**Rationale:** Without this distinction, every 🟡 PARTIAL implies a follow-up SPEC. But this SPEC's F-2 (verification check B) is "spirit-satisfied" — the data is fine, the verification recipe was wrong. Future Foremen will waste cycles authoring follow-up SPECs for verification bugs unless this is explicit.

---

## 8. Follow-up actions

| Action | Owner | Status |
|---|---|---|
| FOREMAN_REVIEW for M3_DEMO_WEBHOOK_SCRUB (this file) | opticup-strategic | ✅ Done |
| Author follow-up M3_DEMO_PAGE_META_REWRITE SPEC | — | **Deferred by Daniel 2026-05-18.** Demo is "good enough" for M4 form-flow testing. `<title>` cosmetic issue accepted. If/when demo goes public-facing or Daniel wants the identity fully flipped, this SPEC can be authored. |
| Update opticup-strategic SKILL.md with Proposals A (predecessor) + A+B (this SPEC) | opticup-strategic | Pending — bundle into a single skill-update SPEC |
| Update SITE_OVERSEER_HANDOFF.md with REC-SITE-NN entries for: demo seeded, demo webhook isolation, demo emails rewritten, demo seo flipped, demo meta_title deferred | site-overseer | Pending — next site-overseer touch |
| Append L-SITE-002 (jsonb-text escape rule) + L-SITE-003 (render-source confirmation rule) to LEARNINGS.md | site-overseer | Pending |
| TECH_DEBT entries: pipeline-coordination `--self` flag (F-6 of predecessor) + MCP 30k-char snapshot wrapper (F-4 of this SPEC) + demo meta_title follow-up | site-overseer | Pending |

---

## 9. Sequence retrospective — what the 2-SPEC chain accomplished

**Daniel's original problem:** "demo storefront — שבור על כל העמודים, מציג טקסט גולמי במקום content blocks."

**SPEC chain delivered:**

| Outcome | Status |
|---|---|
| Visual rendering: header + hero + sections + images on every page | ✅ Closed M3_DEMO_TENANT_SEED_FROM_PRIZMA |
| 64 storefront_pages cloned from prizma (30 he + 17 en + 17 ru) | ✅ Same SPEC |
| Demo storefront_config enabled, footer/theme/pages populated | ✅ Same SPEC |
| Demo tenant_branches seeded | ✅ Same SPEC |
| Demo logo + business_email set | ✅ Same SPEC |
| supersale form NO LONGER posts to prizma's Make webhook (M4 isolation) | ✅ Closed M3_DEMO_WEBHOOK_SCRUB |
| 29 prizma support emails replaced with demo@ | ✅ Same SPEC |
| storefront_config.seo flipped to demo identity (Astro fallback only) | ✅ Same SPEC |
| `<title>` tag in rendered HTML flipped to demo identity | ⏸️ Deferred (Daniel call) |

**Daniel can now do:** test the supersale lead form on demo, capture leads in demo's M4, never touch prizma. Browse demo's content as a visual reference. The cosmetic `<title>` shows "פריזמה" in browser tabs — accepted.

**Total wall-clock time across 2 SPECs:** ~75 minutes (SPEC #1: 25 min author + 35 min execute; SPEC #2: 15 min author + 20 min execute).

**Total Foreman authoring defects across 2 SPECs:** 8 (D-1..D-5 in SPEC #1 + D-1..D-3 in SPEC #2). Of these, 6 were trivial-within-intent fixes by the Executor. 2 required PARTIAL closures (leakage in SPEC #1, render-source in SPEC #2). Both PARTIAL findings have proposals to prevent recurrence (jsonb-text escape probe + render-source confirmation probe).

---

## 10. Closure stamp

This SPEC closes 🟡 PARTIAL with Daniel's explicit deferral of the open finding. The deferral is logged and time-stamped. The chain (predecessor + this SPEC) accomplishes the business outcome Daniel asked for. No further SPECs queued in this thread.

**Foreman signature:** opticup-strategic acting as Site Overseer, 2026-05-18.

---

*End of FOREMAN_REVIEW.md.*
