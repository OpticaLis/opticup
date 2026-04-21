# SuperSale Campaign — Agent Context Guide

> **Purpose:** This folder contains everything an AI agent needs to modify messages,
> create new events, or adjust the SuperSale campaign flow in a single prompt.
> Read this file first — it maps to all the detail files.

---

## 1. What is SuperSale?

SuperSale is a **recurring branded sales event** held at Prizma Optics (אופטיקה פריזמה),
32 Herzl St, Ashkelon. It's a half-day event (09:00–14:00, always Friday) where
pre-registered customers come to buy designer eyewear at discounted prices.

**Key stats (last 2 events):**
- Event #20 (Feb 2026): 57 registered → 41 confirmed → 22 attended → 21 purchased (₪35,125)
- Event #22 (Mar 2026): 87 registered → 69 confirmed → 32 attended → 31 purchased (₪39,460)
- **95–97% of attendees make a purchase.** The funnel challenge is getting confirmed people to show up.

**NOT to be confused with:** MultiSale (a separate, currently inactive campaign for multifocal fitting days). MultiSale shares the same boards and some Make scenarios but is a different campaign. Ignore it.

---

## 2. System Architecture

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Facebook Ads │    │ Monday.com   │    │   Make.com   │
│ (Lead source)│───▶│ (CRM/Boards) │◀──▶│ (Automation) │
└──────────────┘    └──────────────┘    └──────────────┘
                          │                     │
                    ┌─────┴─────┐         ┌─────┴─────┐
                    │ WhatsApp  │         │   Gmail    │
                    │(Green API)│         │(events@)   │
                    └───────────┘         └───────────┘
```

### Monday.com (CRM — boards)
Full docs: `monday/` folder

| Board | Board ID | Role |
|-------|----------|------|
| Tier 1: Incoming Leads | 5088674481 | Raw lead intake from ads |
| Tier 2: Master Board | 5088674569 | Central CRM — lead lifecycle |
| Tier 3: Event Attendees | 5088675039 | Per-event attendee list (emptied between events) |
| Events Management | 5088674576 | **Master event list** — stats, forms, coupons |
| Entrance - Scan QR | 5088675161 | Event day check-in |
| Events Record | 5090551300 | Permanent attendee archive (212 records) |
| CX & Ambassadors | 5089956646 | Post-event satisfaction surveys |
| Affiliates | 5089365477 | Raw Facebook lead database (853 leads) |

### Make.com (Automation — scenarios)
Full docs: `make/` folder

| Scenario | ID | Role | Modules |
|----------|-----|------|---------|
| 1A-S SuperSale אישור תקנון | 8247377 | **Entry point** — processes new registrations | 23 |
| 1B Send Emails/Register | 8338150 | Emails + move to Master Board | 34 |
| 1WA WhatsApp | 8464122 | Handle ALL incoming WhatsApp | 78 |
| 2 רישום משתתפים | — | Register attendees to event | 2 |
| 4 מספור האירוע | — | Event numbering | 3 |
| 5A פתיחת אירוע | — | **Open event + send mass messages** | 69 |
| 6 SuperSale + Manual | 8257339 | **Manage registrants** (largest: 223 modules) | 223 |
| 7 אישורי תקנון | — | T&C for non-approvers | 20 |
| 8 הודעות תזכורת | — | **Event reminder messages** | 59 |
| 9 סריקה בכניסה | — | QR entrance scan | 17 |
| 10A Entrance post-scan | 8454760 | Post-scan status updates | 16 |
| 10B CX Survey | 8457806 | Satisfaction survey sending | 12 |
| 0A Automations | 8501661 | Supplementary messages | 43 |
| 0B Attendees Acceptance | 8601355 | Process attendee acceptance | 9 |

**Make base URL:** `https://eu2.make.com/402680/scenarios/{ID}/edit`

---

## 3. Campaign Flow (Lifecycle)

### Phase 1: Lead Capture
```
Facebook Ad → Form submission → Webhook
  ↓
Scenario 1A-S: Creates lead in Tier 1, sends T&C via WhatsApp+SMS
  ↓
Scenario 1B: Sends welcome email, moves to Tier 2 (Master Board)
```

### Phase 2: Event Creation
```
Daniel creates event in Events Management board:
  - Set Event ID (next: 24)
  - Set date (always Friday), time (09:00-14:00)
  - Set address: הרצל 32, אשקלון
  - Set Interests = SuperSale
  - Set Status = "Registration Open", Event Opening = "Open"
  - Set Coupon: Supersale{MM}{YY} (e.g., Supersale0526)
  ↓
Scenario 4: Assigns event number
  ↓
Scenario 5A: Opens event, sends "registration open" messages to all leads
```

### Phase 3: Registration & Reminders
```
Leads register via form:
  https://forms.monday.com/forms/d6f3ec64c578eb54e6c6ee3e194615de?r=euc1&Interest=SuperSale&event_id={EVENT_ID}
  ↓
Scenario 6: Processes registrations, confirmations, manual actions
  ↓
Scenario 7: T&C follow-up for non-approvers
  ↓
Scenario 8: Sends reminder messages (day before, morning of)
  ↓
Scenario 2: Moves confirmed leads to Tier 3
```

### Phase 4: Event Day
```
Attendees arrive at store
  ↓
Scenario 9: QR scan at entrance → Entrance board
  ↓
Scenario 10A: Updates attendance status, triggers post-scan actions
  ↓
Monday Calculation Workflows:
  - Event Registers Calculation → increments Total Registered
  - Confirmation Approved → increments Total Confirmed
  - Event Attended Calculation → increments Total Attended
  - Event Purchase Calculation → updates revenue
```

### Phase 5: Post-Event
```
Scenario 10B: Sends CX satisfaction survey
  ↓
CX & Ambassadors board: Collects ratings + reviews
  ↓
Events Record board: Archives all attendee data permanently
```

---

## 4. Quick Tasks — How To

### Create a New SuperSale Event
1. Go to Events Management board (5088674576)
2. Add new row with:
   - Event ID: **24** (next available)
   - Event name: `אירוע המותגים {month} {year}` (Hebrew)
   - Date: Pick a Friday
   - Available Time: `09:00 - 14:00`
   - Address: `הרצל 32, אשקלון`
   - Interests: `SuperSale`
   - Event Status: `Registration Open`
   - Event Opening: `Open`
   - Coupon: `Supersale{MM}{YY}` (e.g., `Supersale0526`)
3. Form link auto-generates:
   `https://forms.monday.com/forms/d6f3ec64c578eb54e6c6ee3e194615de?r=euc1&Interest=SuperSale&event_id=24`

### Change Message Copy
Messages are embedded INSIDE Make scenarios as module content. To change them:
1. Identify which phase the message belongs to (see §3)
2. Open the relevant scenario in Make
3. Find the messaging module (GREEN API for WhatsApp, Global SMS, or Gmail)
4. Edit the template text inside the module
5. **IMPORTANT:** Many scenarios have Router splits for SuperSale vs MultiSale — only edit the SuperSale path

**Key message touchpoints:**
- **Registration confirmation:** Scenario 1A-S (initial T&C message)
- **Welcome email:** Scenario 1B (email content)
- **Event opened notification:** Scenario 5A (mass message to all leads)
- **Registration confirmation for event:** Scenario 6
- **Event reminders:** Scenario 8 (day-before + morning-of)
- **Post-event CX survey:** Scenario 10B

### Close/Archive an Event
1. In Events Management: Set Event Status → `Completed`, Event Opening → `Closed`
2. Tier 3 board will be emptied (records move to Events Record)
3. Update Tier 2 statuses as needed

---

## 5. Key Identifiers

| What | Value |
|------|-------|
| Monday Workspace | Main workspace (default) |
| Make Organization | 1405609 |
| Make Team | 402680 |
| Make Zone | eu2.make.com |
| Email Account | events@prizma-optic.co.il (Gmail) |
| WhatsApp | Green API integration |
| SMS | Global SMS |
| Event Location | הרצל 32, אשקלון |
| Event Timing | Fridays, 09:00–14:00 |
| Next Event ID | 24 |
| Form ID (SuperSale) | d6f3ec64c578eb54e6c6ee3e194615de |

---

## 6. File Index

| File | What's Inside |
|------|---------------|
| `monday/tier1-incoming-leads.md` | Tier 1 board — raw lead intake, UTM tracking |
| `monday/tier2-master-board.md` | Tier 2 board — central CRM, 656 leads |
| `monday/tier3-event-attendees.md` | Tier 3 board — per-event attendees (transient) |
| `monday/events-management.md` | **Events board** — event history, stats, form URLs |
| `monday/entrance-scan-qr.md` | QR check-in board for event day |
| `monday/events-record-attendees.md` | Permanent attendee archive (212 records) |
| `monday/cx-ambassadors.md` | Post-event CX surveys and ratings |
| `monday/affiliates.md` | Raw Facebook lead database (853 leads) |
| `monday/calculation-workflows.md` | Monday automation workflows (5 workflows) |
| `monday/supersale-2411-legacy.md` | Legacy board from first SuperSale (Nov 2024) |
| `make/scenarios-overview.md` | All 20 Make scenarios with flow diagram |
| `make/scenario-1a-supersale.md` | Detailed: main entry scenario |
| `make/scenario-6-supersale-manual.md` | **Scenario 6 — full documentation** (7 flows + Russian, approved April 2026) |
| `make/scenario-7-terms-approval.md` | Scenario 7 — T&C gate (current + new approach: mandatory approval at registration) |
| `make/scenario-8-event-reminders.md` | Scenario 8 — reminders + **Messaging Hub concept** (triggers + broadcast) |
| `make/scenario-9-10a-event-day.md` | Scenarios 9+10A+10B — entrance scan, post-scan, CX survey + **Event Day Module concept** |
| `make/scenario-1wa-whatsapp.md` | Scenario 1WA — WhatsApp incoming (catalog + QR quick registration) |
| `make/scenario-5a-open-event.md` | **Scenario 5A — CORE** open event + mass messaging (SMS+Email to all leads) |
| `make/scenario-1b-send-emails.md` | Scenario 1B — T&C confirmation emails + event registration links (HE+RU) |
| `make/scenario-2-register-attendees.md` | Scenario 2 — register attendees (auto/manual), Facebook audience sync |
| `make/scenario-0b-attendees-acceptance.md` | Scenario 0B — attendee confirmation webhook (capacity validation) |
| `make/scenario-4-event-numbering.md` | Scenario 4 — auto-assign event number + form link |
| `make/scenario-un-unsubscribe.md` | Scenario UN — unsubscribe flow (email/item_id/phone paths) |
| `make/scenario-0a-automations.md` | Scenario 0A — supplementary messages (reminder waves, built but 0 ops) |

---

## 7. Important Notes for Agents

1. **SuperSale ONLY.** MultiSale is a separate campaign. It shares boards and some scenarios but is currently inactive. Always filter by `Interests = SuperSale`.

2. **Messages live in Make, not Monday.** The actual message text (WhatsApp, SMS, email) is embedded inside Make scenario modules. To see or change copy, you must open the scenario in Make and inspect the relevant module.

3. **Monday boards are the skeleton.** They hold data structure, lead status, and event metadata. The flow/logic lives in Make scenarios.

4. **Calculation Workflows are Monday automations, not Make scenarios.** They auto-update the Events Management board counters when statuses change on Tier 3.

5. **Event IDs are sequential.** Last used: 23. Next: 24.

6. **Coupon naming:** `Supersale{MM}{YY}` (e.g., `Supersale0526` for May 2026).

7. **Form URL is fixed** — only the `event_id` parameter changes per event.

8. **Hebrew is default.** All board content, messages, and forms are in Hebrew. Some Russian-speaking leads exist (Russian form views available).

9. **Scenario 6 is MASSIVE** (223 modules). It's the brain of the campaign — handles registration management, confirmations, and manual actions. Edit with caution.

10. **The WhatsApp scenario (1WA) handles ALL incoming messages** across both campaigns. It's the most actively used scenario (3280 ops, 78 modules).
