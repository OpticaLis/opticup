# Tier 3: Event Attendees

- **Board ID:** 5088675039
- **URL:** https://prizma-optic.monday.com/boards/5088675039
- **Purpose:** Tracks actual event attendees. Leads are moved here when they register for a specific event. Gets populated before each event and emptied/archived after.
- **Views/Tabs:** Main table, Form Super, Quick Super, Form Multi, Quick Multi, Form Rus, Doc, Calendar, Build Vibe view
- **Automations:** 16 active automations
- **State:** Empty between events (0 items as of 2026-04-19)

## Groups

| Group | Purpose |
|-------|---------|
| New | Newly registered attendees |
| Quick Registration | Quick/walk-in registrations |
| Dups | Duplicate registrations |
| NI | Not Interested |

## Columns

| Column | Type | Purpose |
|--------|------|---------|
| Full name | Text | Attendee name |
| Created | Date | Registration date |
| Phone Number | Phone | Contact number |
| Email | Email | Contact email |
| Last Comment | Text | Last note/comment |
| Status | Status | Attendance status (see Status Values below) |
| Client's Notes | Text | Notes from client |
| Scheduled T... | Date | Scheduled time |
| City | Text | City |
| Event ID | Text | Which event they're attending |
| Interests | Label | SuperSale / MultiSale |
| Send Messages | Status | Message sending status |
| Optic Summary | Text | Optical summary/prescription |
| Item ID | Text | Monday item ID reference |
| Purchase Amount | Number | How much they purchased |

## Status Values (10 statuses, confirmed 2026-04-20)

| סטטוס | צבע | משמעות | איך מגיעים |
|-------|------|--------|------------|
| חדש | ירוק | נרשם דרך קישור הרשמה | אוטומטי — ברגע שנכנס לבורד דרך לינק ההרשמה |
| רשימת המתנה | חום | עבר את המכסה (50) | אוטומטי — נכנס לבורד כשהמכסה כבר מלאה |
| כבר נרשם | אפור | כפילות — אותו טלפון כבר רשום לאירוע | אוטומטי — זיהוי כפילות |
| רישום מהיר | חום כהה | נרשם במקום דרך סריקת QR של נציגים | אוטומטי — QR quick registration flow |
| אירוע נסגר | ירוק כהה | ניסה להירשם לאירוע סגור | אוטומטי — אירוע כבר לא פתוח |
| נרשם ידנית | חום כהה | נרשם ידנית דרך Master Board | אוטומטי — מסלול B של Scenario 2 |
| ביטל | אדום | ביטל את ההרשמה | ידני — דניאל משנה סטטוס |
| אישר | ירוק | שילם פיקדון (50₪) | אוטומטי — אחרי תשלום פיקדון (Scenario 0B) |
| הגיע | ורוד | הגיע לאירוע וסרק QR בכניסה | אוטומטי — סריקת QR ביום האירוע (Scenario 9) |
| לא הגיע | ורוד כהה | לא הגיע לאירוע | ידני — מיותר בעיקרון, לא תורם |

## Key Observations
- Board is empty between events — populated dynamically when event approaches
- Has separate form views for SuperSale vs MultiSale, and a Russian form (Form Rus)
- "Quick Super" and "Quick Multi" are for on-site quick registration
- 16 automations suggest heavy automated flow (status changes, messages, board moves)
- Purchase Amount tracked per attendee for ROI calculation
