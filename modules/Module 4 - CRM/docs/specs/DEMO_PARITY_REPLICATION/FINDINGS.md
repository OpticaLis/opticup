# FINDINGS — DEMO_PARITY_REPLICATION

> **Location:** `modules/Module 4 - CRM/docs/specs/DEMO_PARITY_REPLICATION/FINDINGS.md`
> **Written by:** opticup-executor
> **SPEC:** `modules/Module 4 - CRM/docs/specs/DEMO_PARITY_REPLICATION/SPEC.md`
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — Reverse drift: Prizma's `document_types` is under-seeded vs demo

- **Code:** `M4-REVERSE-DRIFT-01`
- **Severity:** MEDIUM
- **Discovered during:** Phase 3 — `document_types` replication step
- **Location:** table `document_types`
- **Description:** Replication scope assumed Prizma is the canonical source of behavioral truth. For `document_types` the opposite is true: Prizma has 1 row, demo has 7 rows with the standard Israeli-optical-store document codes (`invoice`, `receipt`, `credit_note`, `debit_note`, `delivery_note`, `proforma` — plus the one demo shares with Prizma). The 6 demo-only codes are not QA test data — they look like a legitimately-seeded canonical set that someone added to demo but never propagated to Prizma. Optically this is "demo orphans"; functionally this is Prizma being under-seeded.
- **Reproduction:**
  ```sql
  SELECT code, name_he, is_system FROM document_types
  WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
  UNION ALL
  SELECT 'DEMO ORPHAN: ' || code, name_he, is_system FROM document_types d
  WHERE d.tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
    AND NOT EXISTS (SELECT 1 FROM document_types p
                    WHERE p.tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
                      AND p.code = d.code);
  ```
- **Expected vs Actual:**
  - Expected: Prizma (production) has the full document_types catalog; demo (test) is a subset.
  - Actual: Prizma has 1 code; demo has 7 — reversed.
- **Suggested next action:** **NEW_SPEC** — write a Phase 2 follow-up SPEC `M4_PRIZMA_BEHAVIORAL_BACKFILL` that goes the OTHER direction: replicates demo's `document_types` (and `payment_methods` per Finding 2) BACK to Prizma. Daniel must approve direction reversal explicitly — Prizma is production and writes need an order-of-magnitude more caution than this SPEC's writes to demo.
- **Rationale for action:** This is a meaningful gap in Prizma's seed data. Document types drive accounting flows and customer-facing receipt rendering. Production running on a 1-type config is risky; demo running on a 7-type config exercises code paths that production can't.
- **Foreman override:** { }

---

### Finding 2 — Reverse drift: Prizma's `payment_methods` is empty

- **Code:** `M4-REVERSE-DRIFT-02`
- **Severity:** MEDIUM
- **Discovered during:** Phase 3 — `payment_methods` no-op step (Prizma=0 → skipped)
- **Location:** table `payment_methods`
- **Description:** Same pattern as Finding 1. Prizma has 0 rows in `payment_methods`. Demo has 4 (`cash`, `check`, `credit_card`, `transfer`). The 4 demo rows look like the canonical payment-method catalog any optical store would want. Prizma running on 0 payment methods means any code path that reads from this table sees an empty set on production — silently degrading payment-flow features.
- **Reproduction:**
  ```sql
  SELECT count(*) FROM payment_methods WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
  -- → 0
  SELECT code, name_he, is_system FROM payment_methods WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
  -- → 4 rows: cash, check, credit_card, transfer
  ```
- **Expected vs Actual:**
  - Expected: Production has the full payment_methods catalog.
  - Actual: Production is empty; demo has the catalog.
- **Suggested next action:** **NEW_SPEC** — fold into `M4_PRIZMA_BEHAVIORAL_BACKFILL` alongside Finding 1.
- **Rationale for action:** Same as Finding 1 — Prizma production is running with config gaps that demo has filled.
- **Foreman override:** { }

---

### Finding 3 — QA-test orphan rows in demo (crm_automation_rules)

- **Code:** `M4-DEMO-QA-CRUFT-01`
- **Severity:** LOW
- **Discovered during:** Phase 4 — demo orphan enumeration
- **Location:** table `crm_automation_rules` (6 rows in demo tenant)
- **Description:** Demo has 6 automation rules with names matching `qa_*test*` or `QA TEST RULE` pattern — leftovers from prior Foreman QA validation runs:
  - `QA TEST RULE — qa_redesign_test`
  - `qa_redesign_test_rule_events`
  - `qa_round1_test_rule_attendees`
  - `qa_round1_test_rule_events`
  - `qa_round1_test_rule_incoming`
  - `qa_round1_test_rule_tier2`
- **Reproduction:**
  ```sql
  SELECT name FROM crm_automation_rules
  WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
    AND (name ILIKE '%qa%test%' OR name LIKE 'QA %');
  ```
- **Expected vs Actual:**
  - Expected: Demo's rules match a "clean test tenant" baseline.
  - Actual: 6 leftover QA-generated rules clutter demo's rule list.
- **Suggested next action:** **TECH_DEBT** — log to `TECH_DEBT.md` under "demo seed-data hygiene". Daniel can clean up at his discretion (single DELETE with explicit WHERE on the QA naming pattern, guarded by demo tenant_id). Not blocking, low-risk to keep, easy to clean.
- **Rationale for action:** Doesn't affect Prizma. Doesn't affect demo's test cycle (these rules' triggers don't fire for normal flows). Cosmetic.
- **Foreman override:** { }

---

### Finding 4 — QA-test orphan rows in demo (crm_message_templates)

- **Code:** `M4-DEMO-QA-CRUFT-02`
- **Severity:** LOW
- **Discovered during:** Phase 4 — demo orphan enumeration
- **Location:** table `crm_message_templates` (4 rows in demo tenant)
- **Description:** Demo has 4 message templates with `qa_*test*` slug prefixes — same QA-validation-leftover pattern as Finding 3:
  - `qa_redesign_test_email_he` / `qa_redesign_test_sms_he`
  - `qa_round1_test_template_email_he` / `qa_round1_test_template_sms_he`
- **Reproduction:**
  ```sql
  SELECT slug, channel, language FROM crm_message_templates
  WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
    AND slug ILIKE 'qa_%test%';
  ```
- **Suggested next action:** **TECH_DEBT** — fold into the same cleanup task as Finding 3.
- **Rationale for action:** Same as Finding 3.
- **Foreman override:** { }

---

### Finding 5 — `crm_automation_rules` had pre-state DIFFER but 0/0 writes

- **Code:** `M4-PARITY-INFO-01`
- **Severity:** INFO
- **Discovered during:** Phase 3 — `crm_automation_rules` step
- **Location:** N/A — methodological observation
- **Description:** Pre-snapshot showed Prizma hash ≠ demo hash for this table (DIFFER → expected writes). Phase 3 actually did 0 INSERTs and 0 UPDATEs. The hash differed because demo has 6 orphan rules (Finding 3) added to the same row-set, but every one of Prizma's 16 rule names already existed in demo with identical content. The pre-state full-set hash captured the orphans; the post-state matched-business-key hash correctly proved parity on shared rows.
- **Suggested next action:** **DISMISS** as informational. The two-tier hashing approach (full-set hash for pre/post drift detection + matched-key hash for parity proof) correctly handled this case. No SPEC change needed.
- **Rationale for action:** The methodology worked. Documenting this case so future executors don't get confused when a pre-state DIFFER table runs with 0 writes — that's the expected outcome when the only differences are orphan rows.
- **Foreman override:** { }

---

### Finding 6 — Two-tier hash approach is a reusable pattern for tenant-parity proofs

- **Code:** `M4-PARITY-INFO-02`
- **Severity:** INFO
- **Discovered during:** Phase 4 — design of verification queries
- **Location:** N/A — methodological observation
- **Description:** The SPEC asked for "demo content hash for matching business keys = Prizma's" (criterion 7). The naive approach — compute one hash per tenant's full row set and compare — fails when either side has orphan rows. The correct approach used here:
  1. **Full-set hash** (per tenant) — informational, captures total drift including orphans.
  2. **Matched-business-key hash** (per tenant, computed over rows whose business key exists in BOTH) — this is what proves cross-tenant parity on shared config.
  Both should be reported in the closure report; the matched-key version is what determines pass/fail.
- **Suggested next action:** **NEW_SPEC** candidate for an executor SKILL.md proposal: codify the two-tier hash pattern under a new "Tenant-Parity Replication" section. Already mirrored in §9 Proposal 1 of EXECUTION_REPORT.md.
- **Rationale for action:** Will be used again whenever a third (or fourth) tenant onboards. Saves the next executor from reinventing the verification approach.
- **Foreman override:** { }

---
