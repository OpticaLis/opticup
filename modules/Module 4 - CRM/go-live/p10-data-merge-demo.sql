-- P10_PRESALE_HARDENING Commit 2 — demo data merge + normalization
-- Executed on 2026-04-23 against tenant 8d8cfa7e-ef58-49af-9702-a862d459cccb.
-- Documented for SPEC §6 rollback plan.
--
-- Before:
--   f49d4d8e-6fb0-4b1e-9e95-48353e792ec2  P55 דנה כהן            +972537889878   waiting         p5_5_seed (2 notes)
--   efc0bd54-c6ed-4430-9552-018935a7ebbc  P55 Daniel Secondary   +972503348349   confirmed       p5_5_seed (0 notes)
--   a16f6ba5-fec6-4ce0-b016-672094798c39  דניאל טסט              0537889878      pending_terms   manual     (0 notes)
--
-- After:
--   f49d4d8e...  kept, +972537889878, 3 notes (added merge audit note)
--   efc0bd54...  unchanged
--   a16f6ba5...  soft-deleted (is_deleted=true) — latent duplicate that would collide with f49d4d8e after normalization
--
-- Rollback: set is_deleted=false on a16f6ba5 and revert phone to '0537889878'. Do NOT reactivate without first
-- moving the canonical phone off f49d4d8e — UNIQUE (tenant_id, phone) would fire otherwise.

-- 1) Audit note on survivor documenting the merge
INSERT INTO crm_lead_notes (tenant_id, lead_id, content)
VALUES ('8d8cfa7e-ef58-49af-9702-a862d459cccb',
        'f49d4d8e-6fb0-4b1e-9e95-48353e792ec2',
        'P10 merge: soft-deleted duplicate lead a16f6ba5-fec6-4ce0-b016-672094798c39 (דניאל טסט, phone 0537889878 = same canonical +972537889878).');

-- 2) Soft-delete the losing lead
UPDATE crm_leads
SET is_deleted = true, updated_at = now()
WHERE id = 'a16f6ba5-fec6-4ce0-b016-672094798c39'
  AND tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';

-- 3) Normalize any remaining 0XXXXXXXXX phones to E.164 on demo
--    (Idempotent — matched 0 rows on 2026-04-23 because the only 0... row
--     was already soft-deleted in step 2; kept as a safety net.)
UPDATE crm_leads
SET phone = '+972' || substring(phone from 2), updated_at = now()
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND phone LIKE '0%'
  AND length(phone) = 10
  AND is_deleted = false;
