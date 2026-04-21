# Events Record (Attendees)

- **Board ID:** 5090551300
- **URL:** https://prizma-optic.monday.com/boards/5090551300
- **Purpose:** Historical archive of ALL event attendees across all events. Unlike Tier 3 (which is emptied between events), this board retains every attendee record permanently. Contains full lead details, attendance status, purchase amounts, optical summaries, and scheduled times.
- **Views/Tabs:** Main table, Form Super, Form Rus, Form Multi, Doc, Calendar, 21.1.25, 26.1.25, Build Vibe view
- **Automations:** None
- **Total Records:** 212 attendees

## Columns

| Column | Type | Purpose |
|--------|------|---------|
| Full name | Text | Attendee name |
| Created | Date | Registration date |
| Phone Number | Phone | Contact number (+972...) |
| Email | Email | Contact email |
| Last Comment | Text | Last note/comment |
| Status | Status | Attendance outcome: הגיע (attended), לא הגיע (didn't show), ביטל (cancelled), כבר נרשם (already registered), הגיע ולא קנה (attended, didn't buy), אירוע נסגר (event closed) |
| Client's Notes | Long text | Client notes, often in Russian for Russian-speaking clients |
| Scheduled Time | Date/Time | Scheduled appointment time at event |
| Purchase Amount | Currency | Amount purchased (₪) |
| City | Text | Attendee's city (אשקלון, רחובות, גבעתיים, etc.) |
| Event ID | Text | Which event (13, 14, 15, etc.) |
| Interests | Label | SuperSale / MultiSale |
| Send Messages | Status | Message status: "קוד קופון" (coupon code sent), "הרשמה אושרה אוט'" (registration auto-approved) |
| Language | Label | עברית (Hebrew) / רוסית (Russian) |
| Optic Summary | Long text | Detailed optical questionnaire summary with emoji formatting |

## Status Values

| Hebrew | English | Meaning |
|--------|---------|---------|
| הגיע | Attended | Came to the event |
| לא הגיע | No-show | Registered but didn't come |
| ביטל | Cancelled | Cancelled registration |
| כבר נרשם | Already registered | Duplicate registration attempt |
| הגיע ולא קנה | Attended, no purchase | Came but didn't buy |
| אירוע נסגר | Event closed | Event was closed when they tried to register |

## Optic Summary Format
The optical summary follows a structured emoji format:
```
📋 סיכום שאלון התאמה:
-----------------------
👓 פתרון נוכחי: [current solution]
⚠️ קושי עיקרי: [main difficulty]
💼 עיסוק: [occupation]
💊 רקע רפואי: [medical background]
🔄 ניסיון מולטיפוקל: [multifocal experience]
📱 זמן מסך: [screen time]
🌙 נהיגת לילה: [night driving difficulty]
```

## Key Observations
- This is the PERMANENT RECORD — Tier 3 is transient, this board is the archive
- Has date-specific views (21.1.25, 26.1.25) for reviewing specific event days
- Contains both Hebrew and Russian-speaking attendees
- Separate form views for SuperSale, MultiSale, and Russian registrations
- Purchase amounts visible per attendee for historical analysis
- Optical questionnaire data is pre-processed into a formatted summary
