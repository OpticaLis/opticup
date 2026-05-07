# Main Strategic — Decisions Log

> **Purpose:** Record every meaningful interaction with Daniel — agreements + disagreements + reasons. After each module closes, harvest 1-2 lessons from this log into `SKILL.md`. After a pattern is validated 3 times, formalize it.

> **Read on bootstrap.** Append after every meaningful interaction.

---

## Entry Template

```
## YYYY-MM-DD — [topic in 5-8 words]

**Situation:** [1 sentence — what was being decided]
**My recommendation:** [what I proposed + the brief reasoning]
**Daniel's response:** agreed / corrected / partial
**Reason for [agreement/correction]:** [Daniel's why — ASK if not given]
**Lesson:** [what to do differently next time, if any]
```

---

# Initial Seed — From session 2026-05-06 (skill creation conversation)

## 2026-05-06 — Wrote SPEC instead of brief

**Situation:** After closing 8 strategic decisions on Master Plan, I proposed "to start drafting M5 SPEC".
**My recommendation:** Start the SPEC of Module 5 myself.
**Daniel's response:** Corrected.
**Reason for correction:** "ממתי אתה כותב SPECS? אתה האסטרטג הראשי. אתה זוכר מה התפקיד שלך?" — Main Strategic does NOT write SPECs. SPECs are Module Strategist territory.
**Lesson:** Catch myself before drafting acceptance criteria, success metrics, or phase plans. Hand-off via brief, never SPEC. Codified as Pattern P10 + anti-pattern in SKILL.md.

## 2026-05-06 — Verbose audit summary, multiple findings as bullet list

**Situation:** Reported audit results from front-end Access file with 4 numbered findings, each a long paragraph.
**My recommendation:** (implicit — reported deeply)
**Daniel's response:** Corrected.
**Reason for correction:** "אתה כותב יותר מידי! תכתוב בקצרה וענייני ותשתדל בלי טכני!!!!" — Daniel wants short, prose, non-technical.
**Lesson:** Default to prose, terse, no bullets unless strictly needed. Codified as Pattern P16 in SKILL.md.

## 2026-05-06 — Pivot from M5-only cutover to all-modules-then-bigbang

**Situation:** Proposed one-shot M5 customer migration vs ongoing Access sync.
**My recommendation:** One-shot for M5 alone (cleaner, no dual-source confusion).
**Daniel's response:** Corrected.
**Reason for correction:** "אני רוצה לבנות את כל המודולים ורק אז לעשות את המעבר. אין אפשרות אחרת. כל המודולים קשורים זה לזה." — modules are interconnected; partial cutover forces dual-source-of-truth.
**Lesson:** When proposing a migration mode, FIRST consider data interdependencies across modules. M5/M6/M7/M8/M9 share customer ↔ order ↔ exam ↔ payment relationships; partial cutover breaks them. Pattern: "if 2+ modules share an entity FK, they cutover together or not at all".

## 2026-05-06 — `cust_listb` migration scope guess

**Situation:** Audit found 156 customers in a separate B-table with different schema (mikud, fax, no Rx).
**My recommendation:** Hypothesized B2B customers; suggested keeping for migration with `is_business` flag or as separate table.
**Daniel's response:** Corrected.
**Reason for correction:** "זה לידים. תתעלם מהם. זאת מערכת זמנית שעשינו לקמפיינים מסויימים לפני שהם הופכים ללקוחות."
**Lesson:** Don't speculate on data purpose from schema alone — ASK before recommending. When schema is unusual, the next message should be "אתה זוכר מה זה?" not a hypothesis. Pattern: "data-shape ≠ data-purpose". Asked sample records, learned origin → corrected.

## 2026-05-06 — Migration scope: only customers with ≥1 order

**Situation:** Decision #4 in Master Plan was about pre-2021 history.
**My recommendation:** Skip pre-2021.
**Daniel's response:** Agreed AND expanded — also skip customers without any orders.
**Reason for expansion:** "לא צריך אותם. רק לקוחות עם מינימום הזמנה 1." Rules out 76% of `cust_list` (15,872 of 20,900) — leaner DB, less storage, less RLS overhead.
**Lesson:** Daniel will sometimes expand decisions beyond what was asked. Logged here so MASTER_LIVE_PLAN reflects the broader rule. Pattern: "agreement that adds scope = a new decision worth logging in full".

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

## 2026-05-06 — Languages day-1: HE+RU, recommendation expanded

**Situation:** Decision #8 — which languages must be live day-1.
**My recommendation:** HE + RU mandatory (1,592 + 578 orders), EN/ES later (5+1 orders).
**Daniel's response:** Corrected — also wants EN day-1.
**Reason for correction:** Not given explicitly; likely strategic positioning for the SaaS product (English = export potential, white-label, B2B).
**Lesson:** When SaaS-product strategy is in play, Daniel may take languages beyond what current usage shows. Pattern: "ask if SaaS positioning factors into the decision before recommending based on current data only".

## 2026-05-06 — Skill creation now vs after M5

**Situation:** Daniel asked if I have a skill that improves over time.
**My recommendation:** Build it after M5 closes ("the improvement will pay back over the remaining 8 modules").
**Daniel's response:** Corrected — build it NOW.
**Reason for correction:** "אפשר לבנות עכשיו כבר סקיל בשבילך שתשתמש בו והוא ידייק אותך... חשוב שזה יהיה באמת סקיל שיהיה אפשר להשתמש גם כאן וגם בלקאוד קוד".
**Lesson:** Daniel prioritizes precision-now over efficiency-later. When the cost is small (30-45 min) and the upside is "no more drift between sessions", build now. Pattern: "underestimate compounding effect of consistency from-day-1".

---

# Live Entries — append below

(Entries from 2026-05-07 onward go here, in reverse-chronological order.)
