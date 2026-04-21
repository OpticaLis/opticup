# Make Scenarios Overview — SuperSale Campaign

All scenarios live in Make (eu2.make.com), Organization ID 1405609, Team 402680.

## Scenario Index (All Active)

| # | Scenario Name | Ops | Data | Folder | Modules | SuperSale Relevant? |
|---|---------------|-----|------|--------|---------|---------------------|
| 0A | Automations board - הודעות משלימות | 0 | 0 | Events Flow | 43 | ✅ Shared |
| 0B | Attendees Acceptance | 663 | 1.7 MB | Events Flow | 9 | ✅ Shared |
| 10A | Entrance סטטוס פעולות סיום - אחרי סריקת ברקוד | 213 | 499 KB | Event Closing Flow | 16 | ✅ Shared |
| 10B | סיום תהליך - טופס שביעות רצון | 30 | 71.6 KB | Event Closing Flow | 12 | ✅ Shared |
| 1A-M | MultiSale אישור התקנון ראשוני מולטי טופס | 18 | 3.7 KB | Events Flow | 47 | ❌ MultiSale only |
| 1A-S | **SuperSale אישור תקנון ראשוני סופרסייל** | 3914 | 1.6 MB | Events Flow | 23 | ⭐ CORE |
| 1B | Send Emails/Register Master Boards | 54 | 161.8 KB | Events Flow | 34 | ✅ Shared |
| 1WA | WhatsApp - ניהול וואטספ נכנסות | 3280 | 2.7 MB | WhatsApp | 78 | ✅ Shared |
| 2 | רישום משתתפים לאירוע | 1734 | 2.5 MB | Events Flow | 2 | ✅ Shared |
| 4 | מספור האירוע | 20 | 50.1 KB | Events Flow | 3 | ✅ Shared |
| 5A | **פתיחת אירוע ושליחת הודעות** | 735 | 2.6 MB | Events Flow | 69 | ⭐ CORE |
| 6 | **SuperSale + Manual ניהול נרשמי האירוע** | 2445 | 48.7 KB | Events Flow | 223 | ⭐ CORE |
| 7 | אישורי תקנון לנרשמי האירוע שלא אישרו בעבר | 0 | 0 | Events Flow | 20 | ✅ Shared |
| 8 | **הודעות תזכורת לאירוע** | 864 | 1.3 MB | Events Flow | 59 | ⭐ CORE |
| 9 | סריקה בכניסה | 2615 | 11.6 KB | Events Flow | 17 | ✅ Shared |
| FB1 | Facebook ADS Integration Insights | 528 | 3.7 MB | Ads & Money Mgmt | 1 | 🔵 Ads |
| FB2 | Facebook ADS יצירת מודעות חדשות | 9 | 0 | Ads & Money Mgmt | — | 🔵 Ads |
| FB3 | Facebook ADS ניקוי מודעות לא פעילות | 60 | 1.3 MB | Ads & Money Mgmt | — | 🔵 Ads |
| UN | Unsubscribe הורדה מרשימת התפוצה | 54 | 128.7 KB | Unsubscribe Email | 16 | ✅ Shared |

**Legend:** ⭐ CORE = directly SuperSale specific, ✅ Shared = used by both campaigns, 🔵 Ads = ad management

## Campaign Flow Order (SuperSale)

The scenarios run in this logical order during a campaign lifecycle:

### Phase 1: Lead Capture & Registration
```
Facebook Ad clicked → Landing page → Form submitted
    ↓
1A-S) SuperSale אישור תקנון ראשוני סופרסייל
    - Webhook receives form data
    - Creates lead in Tier 1 (Incoming Leads board)
    - Sends T&C approval WhatsApp/SMS
    - Routes: SuperSale vs MultiSale
    ↓
1B) Send Emails/Register Master Boards
    - Sends welcome email
    - Moves approved lead to Tier 2 (Master Board)
    - Updates lead status
```

### Phase 2: Event Creation & Opening
```
4) מספור האירוע (Event Numbering)
    - Assigns sequential Event ID
    - Creates event row in Events Management board
    ↓
5A) פתיחת אירוע ושליחת הודעות (Open Event & Send Messages)
    - Sends "event opened" messages to all leads
    - Sends price catalog
    - Triggers registration flow
    ↓
6) SuperSale + Manual ניהול נרשמי האירוע (Manage Event Registrants)
    - MASSIVE scenario (223 modules!)
    - Handles registrations, confirmations, manual actions
    - Routes SuperSale attendees through confirmation flow
```

### Phase 3: Pre-Event Communication
```
7) אישורי תקנון לנרשמי האירוע שלא אישרו בעבר (T&C for non-approvers)
    - Sends T&C to registrants who haven't approved yet
    ↓
8) הודעות תזכורת לאירוע (Event Reminders)
    - Sends reminder messages before event
    - "Event tomorrow" notifications
    - Day-of reminders
    ↓
2) רישום משתתפים לאירוע (Register Participants)
    - Moves confirmed leads to Tier 3 (Event Attendees)
    ↓
0B) Attendees Acceptance
    - Processes attendee acceptance
```

### Phase 4: Event Day
```
9) סריקה בכניסה (Entrance Scan)
    - QR code scanning at entrance
    - Updates Entrance - Scan QR board
    ↓
10A) Entrance - סטטוס פעולות סיום (Post-Scan Actions)
    - Updates attendance status
    - Triggers post-scan workflows
```

### Phase 5: Post-Event
```
10B) סיום תהליך - טופס שביעות רצון (CX Survey)
    - Sends satisfaction survey
    - Creates entry in CX & Ambassadors board
    ↓
0A) Automations board - הודעות משלימות (Supplementary Messages)
    - Follow-up messages
    - Post-event communications
```

### Always Running
```
1WA) WhatsApp - ניהול וואטספ נכנסות (WhatsApp Management)
    - Handles ALL incoming WhatsApp messages
    - Routes to appropriate flow based on content
    - 78 modules — the most complex single scenario
    
UN) Unsubscribe
    - Handles email unsubscribe requests
```

## Folder Structure

| Folder | Purpose | Scenarios |
|--------|---------|-----------|
| **Events Flow** | Core campaign flow from registration to event | 13 scenarios |
| **Event Closing Flow** | Post-event: entrance processing + CX survey | 2 scenarios |
| **WhatsApp** | Incoming WhatsApp message handling | 1 scenario |
| **Ads & Money Management** | Facebook ad automation | 3+ scenarios |
| **Unsubscribe Email** | Email opt-out handling | 1 scenario |
| ***מתאים לשני האירועים*** | Shared between both campaigns | 1 scenario |

## Key Connections

| Service | Used For |
|---------|----------|
| Monday.com | All board operations (read/write/update items) |
| Google Sheets | Data logging and reporting |
| Gmail (events@prizma-optic.co.il) | Email sending |
| WhatsApp (Green API / 360dialog) | WhatsApp messaging |
| Facebook | Ad management, lead capture |
| Webhooks | Scenario-to-scenario communication |

## Scenario URLs

| Scenario | Edit URL |
|----------|----------|
| 0A | https://eu2.make.com/402680/scenarios/8501661/edit |
| 0B | https://eu2.make.com/402680/scenarios/8601355/edit |
| 10A | https://eu2.make.com/402680/scenarios/8454760/edit |
| 10B | https://eu2.make.com/402680/scenarios/8457806/edit |
| 1A-S | https://eu2.make.com/402680/scenarios/8247377/edit |
| 1B | https://eu2.make.com/402680/scenarios/8338150/edit |
| 1WA | https://eu2.make.com/402680/scenarios/8464122/edit |
| 6 | https://eu2.make.com/402680/scenarios/8257339/edit |
