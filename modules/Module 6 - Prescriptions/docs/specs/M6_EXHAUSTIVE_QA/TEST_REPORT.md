# M6 Exhaustive QA — Test Report

**Date:** 2026-05-25 | **Tenant:** demo | **Executor:** Pipeline (Claude Code)

## Test Matrix

### Entry Paths
| # | Scenario | Result | Notes |
|---|---|---|---|
| T1 | Direct URL with prescription_id (glasses) | PASS | Loads prescription e64c8e84, status=draft, exam_id auto-created |
| T2 | Stage strip visible on direct URL | PASS | 4 stages, final active |
| T13 | New visit via "+" button | PASS | Creates exam + final-stage prescription |
| T30 | Empty customer (S2B Test, 0 prescriptions) | PASS | Sidebar "no visits", center "select or create", no errors |

### Stage Flow
| # | Scenario | Result | Notes |
|---|---|---|---|
| T13 | Stage strip renders after new visit | PASS | 4 stages, final active, strip visible |
| T14 | Add objective stage | PASS | Same exam_id, exam_type=objective, data entry works |
| T15 | Add subjective stage | PASS | Same exam_id, exam_type=subjective |
| T16 | Copy-from-previous (objective->subjective) | PASS | Eye values copied correctly |
| T17 | Click-switch between stages | PASS | Final->objective->final, correct data each time |
| T18 | Sidebar shows ONE row for multi-stage visit | PASS | 1 sidebar row, 3 filled stages, 1 dimmed |

### Input Behavior
| # | Scenario | Result | Notes |
|---|---|---|---|
| T9a | PD whole-number: 32 -> 32mm | PASS | **FIXED** (was 32.00mm) |
| T9b | PD decimal: 30.5 -> 30.5mm | PASS | |
| T9c | K1 2dp: 7.5 -> 7.50 | PASS | |
| T9d | SPH default minus: 2.5 -> -2.50 | PASS | |
| T9e | SPH explicit plus: +3 -> +3.00 | PASS | |
| T9f | AXIS: 175 -> 175deg | PASS | |
| T9g | PRISM: 1.5 -> 1.50tri | PASS | |
| T9h | ADD default plus: 2 -> +2.00 | PASS | |
| T9i | VA preserved: 6/6 -> 6/6 | PASS | |
| T10 | AXIS > 180 clamped: 200 -> 180deg | PASS | |
| T11 | Empty field focus: no stray "-" | PASS | |
| T12 | Clean edit strips units: 32mm -> 32 on focus | PASS | |
| T27a | BC 1dp: 8.4 -> 8.4mm | PASS | **FIXED** (was 8.40mm) |
| T27b | DIA 1dp: 14.2 -> 14.2mm | PASS | **FIXED** (was 14.20mm) |
| T27c | POWER default minus: 3 -> -3.00 | PASS | |
| T27d | OR default minus: 0.25 -> -0.25 | PASS | |

### State Machine
| # | Scenario | Result | Notes |
|---|---|---|---|
| T19 | DRAFT -> COMMITTED | PASS | Status flipped, prescription_number=6 assigned |
| T20 | Recall axes generated | PASS | 5 axes rendered (next_exam, HF_validity, Rx_validity, dispensing, treatment) |
| T21 | Committed = read-only | PASS | Fields disabled |
| T22 | Print strip enabled after commit | PASS | 6 buttons enabled |
| T23 | Clone produces new draft | PASS | New draft c5f0f14c created with copied values |

### Contacts View
| # | Scenario | Result | Notes |
|---|---|---|---|
| T24 | Toggle to contacts | PASS | Sidebar updates to contacts history |
| T25 | Create contacts visit | PASS | Exam + prescription created, strip visible |
| T26 | CL parameter table (14 cols) | PASS | POWER, CYL, AXIS, ADD, BC, DIA, VA, K, OR all present |
| T27 | BC/DIA 1dp polish | PASS | 8.4mm, 14.2mm |
| T28 | CL secondary fields | PASS | Manufacturer, model, material, water%, Dk/L, tint all present |
| T29 | Toggle back to glasses | PASS | Kind switches, sidebar updates |

### Pickers + Metadata
| # | Scenario | Result | Notes |
|---|---|---|---|
| T3 | Exam-type picker (5 options) | PASS | blank + final/old/subjective/objective |
| T4 | Prescription-type picker (9 UUID options) | PASS | Loaded from prescription_types table |
| T5 | LTR numeric direction | PASS | dir=ltr on all numeric inputs |

### Layout + Console
| # | Scenario | Result | Notes |
|---|---|---|---|
| T7 | Zero console errors | PASS | All paths clean |
| T8 | No horizontal overflow (1920px) | PASS | scrollWidth <= 1920 |

## Bugs Found + Fixed

| # | Bug | Root Cause | Fix | Commit |
|---|---|---|---|---|
| B1 | PD shows 32.00mm instead of 32mm | Fixed 2dp for all MM_FIELDS | PD_FIELDS 0dp-when-integer, 1dp-when-decimal | a94346b |
| B2 | BC shows 8.40mm instead of 8.4mm | Fixed 2dp for all MM_FIELDS | BDIA_FIELDS always 1dp | a94346b |
| B3 | exam_type not loading from view | v_prescription_full_for_editor missing exam_type column | Added pg.exam_type to view (appended at end) | QA migration |

## Screenshots (committed)

| File | Shows |
|---|---|
| `qa-glasses-loaded-input.jpeg` | Glasses editor loaded with formatted values (SPH -2.50, AXIS 175deg, PD 32mm, PRISM 1.50tri, ADD +2.00) + stage strip visible |
| `qa-contacts-loaded.jpeg` | Contacts editor loaded with CL fields (BC 8.4mm, DIA 14.2mm, POWER -3.00, OR -0.25) |

## QA Data Left on Demo (for Daniel's inspection)

- **S2A Test** (`7ffd4529`): 1 visit (exam `b87b394a`) with 4 stages (final=committed #6, objective=draft, subjective=draft, clone=draft). Demonstrates the full multi-Rx model.
- **Daniel's customer** (`65c872c1`): 1 visit (exam `7b7dd0c4`) with all 4 stage types (old/objective/subjective/final). Stage strip test data.
- **S2A Test contacts**: 1 contacts visit with CL data (BC/DIA/POWER values set).

## DB Evidence

```
S2A Test exam b87b394a:
  5a284d52: exam_type=final,     status=committed, prescription_number=6
  76fdfe47: exam_type=objective,  status=draft
  6bb67a30: exam_type=subjective, status=draft
  c5f0f14c: exam_type=null,      status=draft (clone)
All 4 share ONE exam_id. Sidebar shows 1 row.
```
