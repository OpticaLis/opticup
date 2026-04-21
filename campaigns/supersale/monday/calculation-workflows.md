# Calculation Workflows (Monday Automations)

These are NOT boards — they are Monday workflow automations that update the Events Management board counters automatically.

---

## 1. Event Registers Calculation

- **ID:** 5088516968
- **URL:** https://prizma-optic.monday.com/custom_objects/5088516968
- **Status:** Active (last run: Apr 13, 2026)
- **Trigger:** When status changes to "Approved" on Tier 3 board
- **Flow:**
  1. When status → Approved
  2. Get item data (Item ID from step 1)
  3. Check if group matches ("New" +1 or "Quick Registration" +1)
  4. **Found path:** Find matching item by Event ID → Set number +1 (increments Total Registered on Events Management) → Send email via events@prizma-optic.co.il
  5. **Found path (alt):** Find matching item by Phone Number → Change status to "אישר הגעה" (confirmed attendance) → Send email via events@prizma-optic.co.il
- **Purpose:** When a new attendee is approved in Tier 3, increment the registration counter on the Events Management board and update their confirmation status

---

## 2. Event Attended Calculation

- **ID:** 5088578962
- **URL:** https://prizma-optic.monday.com/custom_objects/5088578962
- **Status:** Active (no recent runs)
- **Trigger:** When status changes to "הגיע" (attended) — green status
- **Flow:**
  1. When status → הגיע (attended)
  2. Get item data (Item ID from step 1)
  3. Find matching item by Event ID
  4. **Found:** Set number to 1 (increments Total Attended on Events Management)
  5. Send email via events@prizma-optic.co.il
- **Purpose:** When someone is marked as "attended" at the event, increment the attendance counter on Events Management

---

## 3. Event Purchase Calculation

- **ID:** 5088599424
- **URL:** https://prizma-optic.monday.com/custom_objects/5088599424
- **Status:** Active (no recent runs)
- **Trigger:** When Purchase Amount column changes
- **Flow:**
  1. When column changes: Purchase Amount
  2. Get item data (Item ID from step 1)
  3. If number meets condition (Purchase Amount > 0)
  4. **Yes → Found by Event ID:** Set number to Purchase Amount (updates Total Purchased vol. on Events Management) → Send email
  5. **Yes → Found by Phone Number:** Set number to 1 (increments Total Purchases counter) → Find by Phone Number → Set Purchase Amount → Send email
- **Purpose:** When a purchase amount is entered for an attendee, update both the purchase count and revenue on Events Management board, and update the lead's record in Master Board

---

## 4. Confirmation Approved

- **ID:** 5091963744
- **URL:** https://prizma-optic.monday.com/custom_objects/5091963744
- **Status:** Active (last run: Apr 11, 2026)
- **Trigger:** When status changes to "אישר" (confirmed)
- **Flow:**
  1. When status → אישר (confirmed)
  2. Get item data (Item ID from step 1)
  3. Find matching item by Event ID
  4. **Found:** Set number +1 (increments Total Confirmed on Events Management)
  5. Send email via events@prizma-optic.co.il
- **Purpose:** When an attendee confirms they're coming, increment the confirmation counter on Events Management

---

## 5. Tier 3 Attendees Confirmation (INACTIVE)

- **ID:** 5091182567
- **URL:** https://prizma-optic.monday.com/custom_objects/5091182567
- **Status:** Inactive (never run)
- **Trigger:** When form is submitted on Tier 3: Event Attendees board
- **Flow:**
  1. When form submitted → Board: Tier 3: Event Attendees
  2. Change status → "חדש" (new)
  3. Change status → "Private/Deleted"
- **Purpose:** Appears to be a deprecated/unused workflow for processing form submissions on Tier 3

---

## Email Account

All three workflows send notification emails via: **events@prizma-optic.co.il** (Gmail)

## How They Connect

```
Tier 3: Event Attendees
  ├── Status → "Approved"     → Event Registers Calculation → Events Management (Total Registered +1)
  ├── Status → "אישר"          → Confirmation Approved       → Events Management (Total Confirmed +1)
  ├── Status → "הגיע"          → Event Attended Calculation  → Events Management (Total Attended +1)
  └── Purchase Amount changed → Event Purchase Calculation  → Events Management (Total Purchases +1, Revenue updated)
```
