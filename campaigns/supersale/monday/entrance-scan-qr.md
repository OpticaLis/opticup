# Entrance - Scan QR

- **Board ID:** 5088675161
- **URL:** https://prizma-optic.monday.com/boards/5088675161
- **Purpose:** Event day check-in board. Attendees scan a QR code at entry, which creates/updates a row here. Tracks who entered, when, and post-purchase actions.
- **Views/Tabs:** Main table, Build Vibe view, Table
- **Automations:** 4 active automations

## Groups

| Group | Count | Description |
|-------|-------|-------------|
| New | 0 | Fresh scans waiting to be processed |
| Processed | 66 | Scans that have been handled |

## Columns

| Column | Type | Purpose |
|--------|------|---------|
| סריקת ברקוד | Text | Barcode scan data (attendee identifier) |
| שעת כניסה | Date/Time | Entry timestamp |
| אישור כניסה | Status | Entry approval (green = approved) |
| שם המשתתף | Text | Participant name (auto-filled from attendee data) |
| צריך בדיקת ראייה? | Status | Whether attendee needs an eye exam |
| הודעת מערכת | Text | System message / automated notes |
| סוג אירוע | Label | Event type (SuperSale / MultiSale) |
| *פעולות סיום - אחרי תשלום* | Status | End-of-event actions after payment |
| Phone Number | Phone | Contact number |

## Key Observations
- Used on event day for real-time check-in via QR code scanning
- 66 historical processed entries across all past events
- "New" group is empty between events (same pattern as Tier 3)
- Automations likely: auto-fill name from Tier 3, update attendance status, trigger post-payment flow
- Links to Tier 3 board for cross-referencing attendee data
