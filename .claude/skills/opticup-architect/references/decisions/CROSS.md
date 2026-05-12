# Decisions Log — Cross-Module

Decisions that don't belong to a single module — workflow, process, communication style, etc.

> Per-module detail. Index summary in `../DECISIONS_LOG.md`.

---

## 2026-05-12 — PRIZMA_CRM_BUGFIX_BACKPORT (Full-Auto Pipeline, single chat, Path A)


**Situation:** The bug fixed in demo on 2026-05-11 (E2E audit SPEC `M4_DEMO_E2E_FULL_AUDIT`) — two `crm_automation_rules` rows that auto-sent `event_invite_waiting_list` template to the wrong audience AND auto-attached recipients as `invited` — was still active in Prizma production. Daniel signed off on the backport brief; Architect handed off to Full-Auto Pipeline in a single Claude Code chat under continuous-run mandate with planned escalation only on structural mismatch.
**Pipeline decision:** **Path A** — Prizma's 2 target rows (`d2585fc4-…` registration_open + `c25feaf7-…` invite_waiting_list) matched demo's `PRE_FIX_RULE_SNAPSHOT.json` byte-for-byte structurally (recipient_type, post_action_attendee_upsert, preserved keys all identical). Applied the same data-only UPDATE pattern: `recipient_type` `cross_event_active_waitlist` → `leads_by_status`; added `recipient_status_filter=['waitlist']`; removed `post_action_attendee_upsert` key. Post-UPDATE md5s are byte-identical to demo's `POST_FIX_RULE_STATE.json` md5s.
**Verification:** Prizma's 14 non-target rules aggregate md5 unchanged. Demo's 2 fixed rules unchanged (zero regression on demo). EF `automation-engine` v8 `mode='evaluate'` dry-runs on Prizma for both rule-trigger conditions (`registration_open` + `invite_waiting_list`) produced 0 outbound messages, 0 attendee inserts, 0 queue writes. Specifically: 0 `crm_message_log` rows tied to any of the 4 dry-run `run_id`s. The fixed rules produced 0 plan_items (correct — Prizma has 0 `waitlist`-status leads currently).
**Pre-merge artifacts:** `READY-FOR-MAIN-MERGE.md` (PR title/body/compare URL), `ROLLBACK_SQL.md` (verbatim pre-state SQL one UPDATE per rule), `ARCHITECT_REVIEW_CHECKPOINT.md` (side-by-side Before/After diff + auto-classified 🟢 Clean verdict). Pre-write annotated git tag `pre-backport-prizma-event-invite-fix` on `bccbc1a`. Main-merge is Daniel-only via GitHub PR.
**Findings:** 2 INFO opened → TECH_DEBT — (i) `crm_automation_rules` has no `updated_at` column; (ii) the separate `event_registration_open` rule on Prizma resolves to 1999 plan_items on event open — worth a follow-up audience-audit SPEC. 2 INFO dismissed (column-name lookup, EF runs-table writes by design).
**Skill improvements harvested (4):**
- **opticup-strategic Author #1:** when a SPEC requires an EF dry-run as verification, read the EF source FIRST (`get_edge_function`) and pin exact field-value semantics in §3 Success Criteria. This SPEC's criterion #8 said `status='evaluated'` but EF source writes `'completed'` — verified via fallback check but criterion text was slightly off.
- **opticup-strategic Author #2:** Cross-Reference Check result should be re-stated in DIAGNOSIS.md for SPECs authored more than 24h before execution. Catches drift between SPEC date and run date.
- **opticup-executor #1:** EF dry-runs returning large `plan_items` arrays must use a per-rule `Group-Object` summary pattern. This SPEC's first EF call produced a 27MB tool result; the second call (with `Group-Object -Property rule_name`) summarized to 10 lines. The summary pattern is the right default.
- **opticup-executor #2:** codify the two-tier hash pattern explicitly — per-target-row md5 + aggregate-untouched md5 captured pre/post-write for any subset-update SPEC. The aggregate-untouched md5 is the only mechanical proof of zero collateral damage.
**Lesson:** This was the first SPEC where opticup-strategic ran BOTH Foreman authoring AND Executor execution AND Foreman review in a single chat under Full-Auto Pipeline mode. Path A/B branching with planned escalation worked cleanly when the structural-match criteria were precise. The two-tier hash pattern (also used by `DEMO_PARITY_REPLICATION` 2026-05-11) is now confirmed as a project standard for any "modify subset of rows in a tenanted table" SPEC.

---

## 2026-05-06 — Verbose audit summary, multiple findings as bullet list


**Situation:** Reported audit results from front-end Access file with 4 numbered findings, each a long paragraph.
**My recommendation:** (implicit — reported deeply)
**Daniel's response:** Corrected.
**Reason for correction:** "אתה כותב יותר מידי! תכתוב בקצרה וענייני ותשתדל בלי טכני!!!!" — Daniel wants short, prose, non-technical.
**Lesson:** Default to prose, terse, no bullets unless strictly needed. Codified as Pattern P16 in SKILL.md.


## 2026-05-06 — `cust_listb` migration scope guess


**Situation:** Audit found 156 customers in a separate B-table with different schema (mikud, fax, no Rx).
**My recommendation:** Hypothesized B2B customers; suggested keeping for migration with `is_business` flag or as separate table.
**Daniel's response:** Corrected.
**Reason for correction:** "זה לידים. תתעלם מהם. זאת מערכת זמנית שעשינו לקמפיינים מסויימים לפני שהם הופכים ללקוחות."
**Lesson:** Don't speculate on data purpose from schema alone — ASK before recommending. When schema is unusual, the next message should be "אתה זוכר מה זה?" not a hypothesis. Pattern: "data-shape ≠ data-purpose". Asked sample records, learned origin → corrected.


## 2026-05-06 — Send Claude Code on Windows for Access audit


**Situation:** Daniel asked if Cowork could read the Access `.accdb` directly.
**My recommendation:** Send to Claude Code on Windows (native Access, faster, less encoding issues with Hebrew).
**Daniel's response:** Agreed.
**Reason for agreement:** Implicit — Daniel had already noted Cowork's limitations earlier in the project.
**Lesson:** When tool capability differs sharply between environments (e.g., Windows-native Office formats), default to the right environment without 4-option-menu. Pattern P9 (refer down, don't solve down) applies up the stack too — send work to the environment that owns it.


## 2026-05-06 — Light vs deep audit calibration on lab file


**Situation:** Daniel sent the third file (lab `.accdb`) but said "this file is not so relevant."
**My recommendation:** Light audit, target 100-200 lines, structure + logic only, skip deep statistics.
**Daniel's response:** Implicitly agreed (proceeded).
**Reason for agreement:** Daniel's directive "the data isn't needed — the logic in OpticUp will be different anyway" maps directly to "we're informing not copying".
**Lesson:** Listen for Daniel's "relevance signals" — they should map directly to audit depth. "Not so relevant" = light audit. "Critical" = deep. Pattern P12 codified in SKILL.md.


## 2026-05-11 — Demo Whitelist Update — SMS no-op verified, email gap escalated


**Situation:** Brief authorized 1-2 single-row UPDATEs on demo's `tenants` row to populate SMS + Email allowlists with Daniel's 3 phones / 3 emails before his manual test cycle on the new demo storefront.
**My recommendation (Foreman, Full-Auto Pipeline):** Run diagnostic first per Brief §3. Result drove the SPEC into a narrower envelope than the Brief authorized: (a) SMS — demo's `test_mode_sms_allowlist` already contained exactly the 3 phones in E.164 (mandated by C-001); no UPDATE needed. (b) Email — no allowlist mechanism exists anywhere (no column, no `ui_config` jsonb key, no `send-message` EF logic). Wrote `ESCALATION.md` with 3 options for Architect; recommended Option 2 (jsonb in `ui_config`, minimal disruption, ships TODAY).
**Daniel's response:** Pending — escalation surfaces this for the Architect-to-Daniel decision loop. The next SPEC will be authored against Daniel's choice of Option 1 / 2 / 3.
**Reason:** Brief §6 Decision #5 explicitly: "If email whitelist mechanism doesn't exist → escalate, don't auto-create schema." Pipeline obeyed.
**Lesson 1 (SPEC envelope can narrow vs Brief):** A SPEC's §6.5 Destructive Operations envelope is bounded ABOVE by the Brief but may always be NARROWER. Performing a no-effect UPDATE just to satisfy the Brief literally is wrong — it bumps `updated_at` and creates a phantom audit event. Codify in opticup-strategic SKILL §"SPEC Authoring Protocol" (Author Proposal #1 in this SPEC's FOREMAN_REVIEW).
**Lesson 2 (ESCALATION.md is a first-class SPEC artifact):** When a Brief authorizes a planned escalation and the diagnostic phase triggers it, write a dedicated `ESCALATION.md` inside the SPEC folder (not in `escalations/`). It contains the gap + 2-3 options + Foreman recommendation. FINDINGS.md gets a one-line cross-reference. Codify in opticup-executor SKILL §"folder-per-SPEC retrospective protocol" (Executor Proposal #2 in this SPEC's FOREMAN_REVIEW).

