# Scenario 1A-S: SuperSale אישור תקנון ראשוני סופרסייל

- **Scenario ID:** 8247377
- **URL:** https://eu2.make.com/402680/scenarios/8247377/edit
- **Status:** Active
- **Trigger:** Instant (Webhook)
- **Usage (7 days):** 1024 credits, 423 KB data
- **Total ops:** 3914
- **Folder:** Events Flow
- **Module count:** 23

## Purpose
This is the PRIMARY ENTRY POINT for all SuperSale leads. When someone submits the SuperSale registration form (Monday Forms), this scenario processes them end-to-end.

## Flow Structure

```
Webhook (form submission)
  ↓
Tools (parse/transform data)
  ↓
Router ──────────────────────────────────┐
  │                                      │
  ├─ SuperSale path                      ├─ MultiSale path (skip)
  │                                      │
  ↓                                      
monday.com → Create item in Tier 1       
  ↓                                      
Router (check conditions)
  ├─ New lead path:
  │   ├─ monday.com → Update Affiliates board (5089365477)
  │   ├─ monday.com → Update item status
  │   ├─ Global SMS → Send SMS
  │   ├─ Gmail → Send welcome email  
  │   └─ monday.com → Update with message log
  │
  ├─ Duplicate lead path:
  │   ├─ monday.com → Mark as duplicate
  │   └─ Global SMS → Send "already registered" SMS
  │
  └─ Error path:
      ├─ Global SMS → Send error notification
      └─ Gmail → Error email to events@prizma-optic.co.il
```

## Services Used

| Service | Purpose |
|---------|---------|
| Webhooks | Receives form submission data |
| Tools | Data parsing and transformation |
| monday.com (legacy) | Creates/updates items on Tier 1, Affiliates boards |
| GREEN API for WhatsApp | Sends WhatsApp messages |
| Global SMS | Sends SMS messages |
| Gmail | Sends emails via events@prizma-optic.co.il |

## Connected Boards

| Board | Action |
|-------|--------|
| Tier 1: Incoming Leads (5088674481) | Creates new lead item |
| Affiliates (5089365477) | Updates affiliate/UTM tracking |

## Key Details
- Runs on every form submission (Instant trigger via Webhook)
- Has router that splits SuperSale vs MultiSale (ignore MultiSale path)
- Checks for duplicate leads before processing
- Sends initial T&C/welcome message via WhatsApp AND SMS
- Logs sent messages in the Notes column on Monday
- Active and running frequently (multiple runs per day on April 19, 2026)
