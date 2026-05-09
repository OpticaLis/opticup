# Main Strategic — Decisions Log (Index)

> **Purpose:** Single source of truth for all strategic decisions made with Daniel.
> **Structure:** This file = INDEX (lightweight, loaded on bootstrap). Per-module detail = `decisions/<MODULE>.md`.
> **When to update:** After EVERY meaningful interaction (in-flight, not session-end). Append a 1-line entry here + full detail in the module file.
> **Module Close Ceremony:** When a module's Architecture Brief is sealed, harvest 1-2 lessons from its `decisions/<MODULE>.md` → update `SKILL.md` if pattern recurs.

---

## How to read this index

Each row: `date` · `module` · 1-sentence summary · → link to detail.

Format for full entries (in `decisions/<MODULE>.md`): situation → my recommendation → Daniel's response → reason → lesson.

---

## Cross-Module decisions (workflow, process, communication style)

→ Full detail: [`decisions/CROSS.md`](decisions/CROSS.md)

| # | Date | Topic | One-liner |
|---|---|---|---|
| 1 | 2026-05-06 | Wrote SPEC instead of brief | I conflated Module Strategist's job with mine; Daniel corrected the role boundary. |
| 2 | 2026-05-06 | Verbose audit summary | Bullet-list overload in chat; learned to compress to 3-line P22 format. |
| 3 | 2026-05-06 | STRICT 3-line format (P22) | Replaced P20 with hard-coded chat format rules. |
| 4 | 2026-05-06 | Daniel does not want technical detail in chat | Confirmed: tables/fields/RPC names = file content, NOT chat content. |

---

## M5 — Customers

→ Full detail: [`decisions/M5.md`](decisions/M5.md)

| # | Date | Topic | One-liner |
|---|---|---|---|
| 1 | 2026-05-06 | Pivot from M5-only cutover to all-modules-then-bigbang | Strategic redirection — single big-bang vs phased. |
| 2 | 2026-05-06 | `cust_listb` migration scope | Confirmed: don't migrate (campaign leads, not customers). |
| 3 | 2026-05-06 | Migration scope: only customers with ≥1 order | 20,900 → 5,028 customers (76% reduction). |
| 4 | 2026-05-06 | Languages day-1: HE+RU+EN, ES later | Per Q15 launch decision. |
| 5 | 2026-05-06 | Asked field-level questions on data already in audit | Lesson P18 — Brief is structure, audit is fields. |
| 6 | 2026-05-06 | Consent model: 4 independent flags + active-only re-subscription | Predecessor to per-channel consent (M12 evolved this). |
| 7 | 2026-05-06 | MAJOR: Lead↔Customer boundary collapsed | Single entity with `lifecycle_stage` — Pattern P21 born. |
| 8 | 2026-05-06 | M5 households: skeleton entity, optional FK | Pattern P17 — foundation-first. |
| 9 | 2026-05-06 | M5 entity split: customer vs loyalty_member | Two-entity decision (loyalty member is separate concept). |
| 10 | 2026-05-07 | M5 Customer Card screen (5 tabs design) | Eye Care merged glasses+contacts; "Update" tab removed. |
| 11 | 2026-05-07 | M5 Customer Card revision | Queue + tab renames + Prescriptions module separation. |
| 12 | 2026-05-07 | M5 customers-list: 3 sketches → Split Workspace approved | Layout decision. |
| 13 | 2026-05-07 | M5 customers-list: Activity-first columns + tenant-config | Per-tenant column set + dual-mode search. |
| 14 | 2026-05-07 | M5 customers-list: row-click + actions + sort/density | Composite client number. |

---

## M6 — Prescriptions / Eye Exams

→ Full detail: [`decisions/M6.md`](decisions/M6.md)

| # | Date | Topic | One-liner |
|---|---|---|---|
| 1 | 2026-05-06 | M6 state-machines: explicit, not boolean | Cross-module pattern — state enum > boolean. |
| 2 | 2026-05-06 | M6 prescription_glasses vs prescription_contacts | TWO entities, not one with discriminator. |
| 3 | 2026-05-06 | M6 split: eye_exams (act) vs prescriptions (output) | Separate entities — different lifecycles. |

---

## M7 — Orders

→ Full detail: [`decisions/M7.md`](decisions/M7.md)

| # | Date | Topic | One-liner |
|---|---|---|---|
| 1 | 2026-05-07 | M7 messaging flow + sub-order ID format | Three-table model (orders / sub_orders / sub_order_items). |
| 2 | 2026-05-07 | "Thanks" is order-level, not sub-order-level | Daniel correction. |
| 3 | 2026-05-07 | M7 print forms protocol + Outside Framing | Form #1 of 5. |
| 4 | 2026-05-07 | M7 Form #2: Order Inspection | Internal lab basket form; tear-off receipt removed (cashier territory). |
| 5 | 2026-05-07 | M7 Form #3: Frame Reservation | Reservation = state on sub-order, not new type. Inventory deducts immediately. |
| 6 | 2026-05-07 | M7 Form #4: Task Form | Per sub-order; 3 signers; resolution block at bottom. |
| 7 | 2026-05-07 | M7 Form #5: Repair Form | `is_repair=true` flag; Internal+Outside print modes. |
| 8 | 2026-05-07 | M7 forms consistency pass + 5 fixes | Locked: 4 sub-order types only; 7-day reservation default; manual convert-to-order. |
| 9 | 2026-05-07 | M7 Architecture Brief CLOSED | 17 locked decisions; 3-table model. |

---

## M8 — Payments

→ Full detail: [`decisions/M8.md`](decisions/M8.md)

| # | Date | Topic | One-liner |
|---|---|---|---|
| 1 | 2026-05-09 | M8 Architecture Brief CLOSED | 9+ locked: עוסק-מורשה, ERP-orchestrating-POS, Provider Adapter Pattern. |

---

## M11 — Reports

→ Full detail: [`decisions/M11.md`](decisions/M11.md)

| # | Date | Topic | One-liner |
|---|---|---|---|
| 1 | 2026-05-09 | M11 Architecture Brief CLOSED | 22 locked + 5 modularity reinforcements; view-layer not data-owner. |

---

## M12 — Communications

→ Full detail: [`decisions/M12.md`](decisions/M12.md)

| # | Date | Topic | One-liner |
|---|---|---|---|
| 1 | 2026-05-09 | WhatsApp BSP = 360dialog | Best price/feature for Israeli mid-volume multi-tenant. |
| 2 | 2026-05-09 | WhatsApp Coexistence Mode (Daniel correction) | Staff phone app + API in parallel. |
| 3 | 2026-05-09 | Number +972 53-434-7265 connection state audit | State D (WABA exists, never completed); Coexistence + WABA migration path. |
| 4 | 2026-05-09 | Edge Function direct → 360dialog (NOT through Make) | Two-way webhooks need direct DB access. |
| 5 | 2026-05-09 | SMS = GLOBAL SMS stays (Daniel correction) | Default = keep working vendor. |
| 6 | 2026-05-09 | Email = Gmail through Make stays (Daniel correction) | Defer Resend to post-LIVE. |
| 7 | 2026-05-09 | Channel architecture = `channel_configs` table | Per-tenant + per-module routing. |
| 8 | 2026-05-09 | Hybrid channel ownership (Daniel-originated) | Platform-default + tenant-override = SaaS-clean + revenue tier. |
| 9 | 2026-05-09 | WhatsApp Inbox + AI slot (Daniel-originated) | Day-1 build; AI = data fields + UI strip reserved. |
| 10 | 2026-05-09 | Inbox UX research (SmartSend + 6 leaders) | 3-pane RTL convergence. |
| 11 | 2026-05-09 | Tab pollution in customer-card mockup (Daniel correction) | Sketch the feature, not the host screen. |
| 12 | 2026-05-09 | Consent: 3 separate flags + audit log + transactional/marketing split | Legal hard requirement, not optional. |
| 13 | 2026-05-09 | DECISIONS_LOG documentation (Daniel-prompted self-correction) | Log in flight, not session-end. |
| 14 | 2026-05-09 | M12 Architecture Brief CLOSED | 15 locked decisions; 8 entities + 2 reserved for AI. |

---

## Pattern Recurrence Tracker (3-strike rule)

When a pattern surfaces in 3 or more independent decisions across modules, formalize it as a `Pattern Pn` in `SKILL.md`. Patterns currently tracked:

| Pattern candidate | Instances seen | Status |
|---|---|---|
| **Don't flow with everything Daniel says** | M7 (Frame Reservation), M8 (settlement mode mid-correction), M12 (channel admin split correction) | ✅ 3 strikes — promoted to **P24** |
| **Verify existing vendor before recommending switch** | M8 (Linet vs Z Credit), M12 (SMS vs Inforu), M12 (Email vs Resend) | ✅ 3 strikes — promoted to **P25** |
| **Hybrid model > pure flexibility OR pure control** | M5 (active marketing consent), M8 (settlement mode tenant-config), M12 (channel ownership) | ✅ 3 strikes — promoted to **P26** |
| **Sketch the feature, not the host screen** | M5 (customer card), M12 (customer history mockup) | ⚠️ 2 strikes — watch for 3rd in M13 |
| **Lock infrastructure, defer UX** | M5 (consent), M12 (consent UX) | ⚠️ 2 strikes — watch for 3rd in M13 |
| **Research subagents are 6-12 months stale** | M12 (WhatsApp Coexistence not in initial research) | 🆕 1 strike — watch |
| **Read-only mode promise for Chrome MCP** | M12 (Meta Business audit) | 🆕 1 strike — watch |
| **Make = one-way, Edge Function = two-way** | M12 (WhatsApp routing decision) | 🆕 1 strike — watch |

---

## Module Close Ceremony — Mandatory Process

When a module's Architecture Brief is sealed:

1. Read the module's full `decisions/<MODULE>.md` file end-to-end.
2. Identify 1-2 lessons that should be promoted to `SKILL.md` (recurring patterns or major insights).
3. Update `SKILL.md` with the new patterns, dated, with link back to source decisions.
4. Update this index file with module-close summary line.
5. Verify the `Pattern Recurrence Tracker` table above — promote any 3-strike candidates.

**Last Module Close ceremonies performed:**
- **M12 — 2026-05-09** — promoted P24, P25, P26 to SKILL.md.

**Modules pending Module Close Ceremony retroactively** (skipped at the time):
- M5, M6, M7, M8, M11 — these closed without ceremony. Catch-up sweep done 2026-05-09 (this index).

---

*Maintained by `opticup-main-strategic` skill. Bootstrap loads this index file only. Module-detail files loaded on demand when working in that module.*
