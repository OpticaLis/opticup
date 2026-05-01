# DELETED_INVENTORY — P35

> Audit trail of every row + file deleted during P35. Per SPEC §9, this is the rollback evidence: if any of these need to come back, the data here is enough to reconstruct or re-upload.

---

## 12 broken WP rows deleted from `media_library` (Step 1)

All 12 had `created_at = 2026-04-17 07:47:16.271684+00`, `tenant_id = 6ad0781b-37f0-47a9-92e3-be9ed1477e1c`, `folder='models'`, `uploaded_by='migration-20260417'`, `mime_type='image/webp'`, `file_size=NULL`. All `storage_path` pointed to `https://prizma-optic.co.il/wp-content/uploads/2025/09/<filename>.jpg` — the WordPress site is gone (DNS cut to Astro), files are unrecoverable. All `filename` had a stray `\"` suffix.

| id | filename | storage_path |
|---|---|---|
| `80b2636f-de83-4d66-b4e6-756801e00541` | Dior-1.jpg" | https://prizma-optic.co.il/wp-content/uploads/2025/09/Dior-1.jpg |
| `5520252b-db16-4346-8874-7e9b62f87946` | UltraDiorO-S1U.jpg" | https://prizma-optic.co.il/wp-content/uploads/2025/09/UltraDiorO-S1U.jpg |
| `ea3a03ee-a651-4e93-ac8f-51f7163fceab` | Fendi-FE50007u-A.jpg" | https://prizma-optic.co.il/wp-content/uploads/2025/09/Fendi-FE50007u-A.jpg |
| `69799ea2-56b2-4dae-a223-f1d50d37ba20` | Fendi-FE50007u-B.jpg" | https://prizma-optic.co.il/wp-content/uploads/2025/09/Fendi-FE50007u-B.jpg |
| `b504916c-7de5-41ab-8ec3-f8d994faceb0` | Fendi-FE50009U.jpg" | https://prizma-optic.co.il/wp-content/uploads/2025/09/Fendi-FE50009U.jpg |
| `a91ee1e8-cf99-4092-b7f1-7180b7bff889` | Gucci-GG10922OA.jpg" | https://prizma-optic.co.il/wp-content/uploads/2025/09/Gucci-GG10922OA.jpg |
| `d2994700-338c-4a73-97ff-70e003fca48f` | Gucci-GG1208O.jpg" | https://prizma-optic.co.il/wp-content/uploads/2025/09/Gucci-GG1208O.jpg |
| `97fc8f1e-5b10-4cf2-b4f9-db19ab42f263` | Gucci-GG1313O.jpg" | https://prizma-optic.co.il/wp-content/uploads/2025/09/Gucci-GG1313O.jpg |
| `c9ae999b-f634-4519-975c-bd73b24369c8` | Gucci-opt.jpg" | https://prizma-optic.co.il/wp-content/uploads/2025/09/Gucci-opt.jpg |
| `429bb3eb-4bb8-45e5-9032-6a3251bb451a` | IMG_2053-scaled-e1757379040329.jpg" | https://prizma-optic.co.il/wp-content/uploads/2025/09/IMG_2053-scaled-e1757379040329.jpg |
| `dacd0b0c-ea39-4801-bfa6-04454dfc7b3e` | IMG_2054-scaled-e1757379269162.jpg" | https://prizma-optic.co.il/wp-content/uploads/2025/09/IMG_2054-scaled-e1757379269162.jpg |
| `2b5da418-a9fc-40b5-b71f-cc8c158d3e67` | IMG_2107-scaled-e1757379219226.jpg" | https://prizma-optic.co.il/wp-content/uploads/2025/09/IMG_2107-scaled-e1757379219226.jpg |

**Restore SQL (if Daniel finds local copies of these files later):**

```sql
-- After uploading the file to media-library/<new-path>:
INSERT INTO media_library
  (tenant_id, filename, original_filename, storage_path, mime_type, file_size, folder, uploaded_by)
VALUES
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c'::uuid,
   '<filename>', '<original_filename>', '<new-storage-path>',
   '<mime>', <size>, 'models', 'restore-post-p35');
```

## 27 backup files deleted from Storage (Step 2)

Storage path prefix: `media/6ad0781b-37f0-47a9-92e3-be9ed1477e1c/products-backup-2026-04-26/`. Created `2026-04-27 03:14:30 - 03:15:13 UTC` by `scripts/compress-product-images.mjs` during SPEC `A1_PRODUCT_IMAGE_COMPRESSION`'s pre-compression backup step. SPEC §2.3 said 25; live had 27 (delta within threshold).

Total ~65.2 MB freed.

| filename | size_bytes |
|---|---|
| Bottega_Veneta_11_1776437478129.webp | 3,423,604 |
| Bottega_Veneta_12_1776437481377.webp | 1,965,950 |
| Cazal_11_1776437445344.webp | 3,237,422 |
| Dior_11_1776437467844.webp | 3,454,746 |
| Dior_12_1776437471750.webp | 3,130,264 |
| Fendi_11_1776437462227.webp | 2,195,132 |
| Fendi_12_1776437464774.webp | 910,566 |
| Fred_11_1776437438033.webp | 3,433,838 |
| Gotti_11_1776437452209.webp | 2,424,306 |
| Gucci_11_1776437474892.webp | 1,824,672 |
| Henry_Jullien_11_1776437501689.webp | 2,381,102 |
| Henry_Jullien_12_1776437441821.webp | 3,346,464 |
| Hublot_11_1776437504168.webp | 1,092,750 |
| Hublot_12_1776437507100.webp | 590,108 |
| Hublot_13_1776437510474.webp | 1,958,786 |
| John_Dalia_12_1776437449162.webp | 2,666,930 |
| KameManNen_11_1776437514341.webp | 2,731,858 |
| Porsche_Design_11_1776437483892.webp | 1,795,918 |
| Prada_11_1776437494968.webp | 1,723,494 |
| Serengeti_11_1776437487257.webp | 3,237,254 |
| Serengeti_12_1776437491229.webp | 3,552,248 |
| Swarovski_11_1776437455482.webp | 2,594,892 |
| Swarovski_12_1776437459092.webp | 2,624,760 |
| Tejesta_100_1776486123217.webp | 1,537,710 |
| Yohji_yamamoto_11_1776437429451.webp | 2,542,004 |
| Yohji_Yamamoto_12_1776437433699.webp | 5,352,550 |
| Yohji_Yamamoto_13_1776437498725.webp | 2,656,590 |
| **Total** | **68,385,918** ≈ **65.2 MB** |

**Recovery:** irreversible from app side. Supabase Storage retention is 7-day on Pro+ tiers — verify project tier for emergency recovery. The compressed counterparts at `media/{tenant}/products/<uuid>.webp` remain intact as the production images.

## 4 null-tenant duplicate files deleted from Storage (Step 4b)

The underscore-named duplicates of the 4 logo pairs. Path prefix: `media/null/general/`. Created `2026-04-06 12:57:47-48 UTC`. Each file is byte-identical to its dash-named counterpart that was kept (and relocated — see RECOVERED_INVENTORY.md).

| filename | size_bytes | dash-named counterpart kept |
|---|---|---|
| Hoya_Logo_1775480266266.webp | 17,134 | Hoya-Logo_1775480603134.webp |
| Leica_logo_1775480265196.svg | 76,833 | Leica-logo_1775480602105.svg |
| Rodenstock_Logo_1775480266650.webp | 9,608 | Rodenstock-Logo_1775480603712.webp |
| Zeiss_logo_svg_1775480267079.webp | 7,756 | Zeiss-logo_svg_1775480604205.webp |

**Recovery:** the kept dash-named copy is byte-identical, so any reference to the underscore version can be redirected to the dash version. No data lost.

## Grand totals

- **DB rows deleted:** 12 (all from media_library, all with broken https:// storage_path)
- **Storage files deleted:** 31 (27 backup + 4 null-tenant duplicates)
- **Storage bytes freed:** ~65.3 MB
- **Files moved (not deleted):** 4 (null-tenant dash-named copies relocated to correct tenant prefix; counted as recovered, not deleted)
