# Tier 2: Master Board

- **Board ID:** 5088674569
- **URL:** https://prizma-optic.monday.com/boards/5088674569
- **Purpose:** Central CRM board for all processed leads. Contains the full lifecycle from invitation through purchase. This is where messaging status and event participation are tracked.
- **Views/Tabs:** Main table, MultiSale, SuperSale, Calendar, Build Vibe view
- **Automations:** 14 active automations

## Groups

| Group | Count | Description |
|-------|-------|-------------|
| All Leads | 656 | Active leads in the funnel (Total Revenue: ₪68,785) |
| Purchased – No more messages | 1 | Completed purchases, no further outreach |
| Not Interested | 52 | Leads who opted out (Total Revenue: ₪5,710) |

## Columns

| Column | Type | Purpose |
|--------|------|---------|
| Full name | Text | Lead's full name |
| Creation date | Date | When lead entered this board |
| Status | Status | Current funnel stage: "הוזמן לאירוע" (invited to event), "ממתין לאירוע" (waiting for event) |
| Last Comment | Text | Last automated comment/note |
| Phone Number | Phone | Israeli mobile |
| Email | Email | Lead's email |
| Call Back | Checkbox | Callback needed |
| Notes | Long text | Automated messages log — timestamps of: "הודעת הרשמה נפתחה נשלחה", "קטלוג המחירים נשלח", "הודעת אירוע נפתח מחר נשלחה", "נרשם שוב" |
| Interests | Label | SuperSale / MultiSale |
| Event Number (for direct register) | Text | Which event the lead registered for |
| Email Messages | Status | "Send" — whether email was sent |
| Eye Exam | Status | כן/לא — whether eye exam is needed |
| City | Text | Lead's city |
| Total Revenue | Number | Revenue from this lead (₪) |
| Events Attended | Number | How many events attended |
| Terms&Conditions | Status | T&C accepted |

## Key Observations
- This board is the SOURCE OF TRUTH for lead status
- Status progression: (new) → הוזמן לאירוע → ממתין לאירוע → (event) → purchased
- Notes column stores automated message history with timestamps
- Messages tracked: registration opened, price catalog sent, event tomorrow reminder, re-registration
- Revenue tracking per lead across all events
- 14 Monday automations run on this board (likely status changes, notifications, board moves)
