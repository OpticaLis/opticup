# Tier 1: Incoming Leads

- **Board ID:** 5088674481
- **URL:** https://prizma-optic.monday.com/boards/5088674481
- **Purpose:** First landing board for all incoming registrations from Facebook ads, WhatsApp referrals, and other sources. Contains raw leads before they are processed.
- **Views/Tabs:** Main table, MultiSale, SuperSale, Calendar, Build Vibe view
- **Active Group:** "Approved and Active" (173 items as of 2026-04-19)

## Columns

| Column | Type | Purpose |
|--------|------|---------|
| Full name | Text | Lead's full name (Hebrew) |
| People | People | Assigned person |
| Creation Date | Date | When the lead was created |
| Status | Status | Lead status (values: עברית = Hebrew labels with colored badges) |
| Phone Number | Phone | Israeli mobile (+972...) |
| Email | Email | Lead's email |
| Call Back | Checkbox/Date | Whether callback is needed |
| City | Text | City (e.g., tlv, ashkelon) |
| Notes | Long text | Automated notes — e.g., "הודעת הרשמה נפתחה נשלחה", "קטלוג המחירים נשלח", timestamps |
| Interests | Label | "SuperSale" or "MultiSale" — determines which campaign flow |
| DONE | Status | Completion status |
| Eye Exam | Status | Whether eye exam is needed (כן/לא) |
| Language | Label | עברית (Hebrew) — default language |
| Terms&Conditions | Status | Whether T&C were accepted (כן/לא) |
| Approval Date | Date | When the lead approved T&C |
| Waiting | Status | Stage tracking (Stage2, לא ידוע, etc.) |
| Category | Label | לא ידוע (unknown) — default |
| Ig | Text | Instagram handle |
| Marketing | Status | Marketing consent (he = Hebrew) |
| WhatsApp Name | Text | Name from WhatsApp |
| Source | Text | UTM source (fb, Referral) |
| Medium | Text | UTM medium (paid, WhatsApp) |
| Campaign | Text | UTM campaign (supersale, supersaletreview) |
| Content | Text | UTM content (ugc_name, treview) |
| Term | Text | UTM term (ugc1, ugc3, ugc4, review5) |
| Campaign ID | Text | Facebook campaign ID (120241393...) |
| MOVE | Status | For moving items between boards |

## Key Observations
- Leads are filtered by "Interests = SuperSale" in the SuperSale tab
- Most leads come from Facebook paid ads (source=fb, medium=paid)
- Campaign naming convention: `supersale` + variant (ugc_name, treview)
- Hebrew is the default/only language for current leads
- The board tracks UTM parameters for attribution
