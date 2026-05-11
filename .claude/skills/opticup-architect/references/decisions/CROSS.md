# Decisions Log — Cross-Module

Decisions that don't belong to a single module — workflow, process, communication style, etc.

> Per-module detail. Index summary in `../DECISIONS_LOG.md`.

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

