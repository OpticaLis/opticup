# Events Management

- **Board ID:** 5088674576
- **URL:** https://prizma-optic.monday.com/boards/5088674576
- **Purpose:** Master list of ALL events (both MultiSale and SuperSale). Each row is one event with its stats, status, form link, and results.
- **Views/Tabs:** Main table, Form, Build Vibe view
- **Automations:** 14 active automations

## Columns

| Column | Type | Purpose |
|--------|------|---------|
| Event name | Text | Name of the event (Hebrew) |
| Event ID | Number | Sequential ID used in form URLs and Make scenarios |
| Event Date | Date | Date of the event |
| Available Time | Text | Time range (e.g., "09:00 - 19:00" or "09:00 - 14:00") |
| Event Status | Status | Completed / Closed / Registration Open |
| Event Opening | Status | Open / Closed — whether registration is accepting |
| Form Link | URL | Monday Forms registration URL |
| Interests | Label | MultiSale / SuperSale — which campaign |
| Total Registered | Number | How many people registered |
| Total Confirmed | Number | How many confirmed attendance |
| Total Attended | Number | How many actually showed up |
| Total Purchases | Number | How many made a purchase |
| Total Purchased vol. | Currency | Total revenue from event (₪) |
| Address | Text | Event location |
| Coupon | Text | Coupon code for the event |

## SuperSale Events History

| ID | Name | Date | Registered | Confirmed | Attended | Purchases | Revenue | Status |
|----|------|------|-----------|-----------|----------|-----------|---------|--------|
| 20 | אירוע המכירות פברואר 26 | Fri, Feb 20 | 57 | 41 | 22 | 21 | ₪35,125 | Completed |
| 22 | אירוע המותגים מרץ 2026 | Fri, Mar 27 | 87 | 69 | 32 | 31 | ₪39,460 | Completed |
| 23 | אירוע מותגים אפריל 2026 - טסט | Fri, Apr 17 | 0 | 0 | — | — | — | Registration Open |

## MultiSale Events History

| ID | Name | Date | Registered | Confirmed | Attended | Purchases | Revenue | Status |
|----|------|------|-----------|-----------|----------|-----------|---------|--------|
| 13 | יום התאמת מולטיפוקל ינואר 2026 | Wed, Jan 21 | 10 | 7 | 4 | — | ₪19,380 | Completed |
| 14 | יום התאמת מולטיפוקל | Mon, Jan 26 | 10 | 7 | 4 | — | ₪15,245 | Completed |
| 15 | יום התאמת משקפי מולטיפוקל | Thu, Jan 29 | 5 | 5 | 4 | — | ₪9,610 | Completed |
| 16 | יום התאמת מולטיפוקל | Thu, Feb 5 | 7 | 5 | 2 | 2 | ₪11,670 | Completed |
| 17 | יום התאמת מולטיפוקל | Mon, Feb 9 | 3 | 3 | 2 | 1 | ₪4,780 | Completed |
| 18 | יום התאמת מולטיפוקל | Wed, Feb 11 | 5 | 3 | 1 | 1 | ₪4,550 | Completed |
| 19 | יום התאמת מולטיפוקל | Mon, Feb 16 | 0 | 0 | — | — | — | Closed |
| 21 | יום התאמת מולטיפוקל | Thu, Feb 19 | 3 | 1 | — | — | — | Completed |

## Key Patterns

### SuperSale Form URL Pattern
```
https://forms.monday.com/forms/d6f3ec64c578eb54e6c6ee3e194615de?r=euc1&Interest=SuperSale&event_id={EVENT_ID}
```

### MultiSale Form URL Pattern
```
https://forms.monday.com/forms/91e5f286be4714a2e0ae564e96486404?r=euc1&event_id={EVENT_ID}
```

### Coupon Naming
- MultiSale events: `01MultiSale26`, `02MultiSale26` (month+type+year)
- SuperSale events: `02SuperSale26`, `SuperSale22`, `Supersale0426` (varies)

### Event Location
All events at: **הרצל 32, אשקלון** (32 Herzl St, Ashkelon)

### Event Timing
- MultiSale: Full day (09:00-19:00) or half day (09:00-14:00)
- SuperSale: Half day only (09:00-14:00), always on Friday

### Performance Summary (all events)
- Total Registered: 187
- Total Confirmed: 141
- Total Attended: 71
- Total Purchases: 56
- Total Revenue: ₪139,820

### SuperSale Conversion Funnel
- Event #20 (Feb): 57 registered → 41 confirmed (72%) → 22 attended (54%) → 21 purchased (95%)
- Event #22 (Mar): 87 registered → 69 confirmed (79%) → 32 attended (46%) → 31 purchased (97%)
- **Key insight:** Almost everyone who attends, purchases. The challenge is getting confirmed people to show up.

### Creating a New Event
To create a new SuperSale event:
1. Add a new row to this board
2. Set Event ID (next: 24)
3. Set date, time, address
4. Set Interests = SuperSale
5. Set Event Status = "Registration Open" and Event Opening = "Open"
6. The Form Link uses a fixed form ID with the event_id parameter
7. Set a Coupon code following the pattern: `Supersale{MM}{YY}`
