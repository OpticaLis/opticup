# Step 4 (§3.4) — Pre/Post-state Snapshot

**SPEC:** `M4_WAITLIST_SYNC_PRIORITY_FIX`
**Date:** 2026-05-14 (server time 2026-05-13 ~12:25 UTC)
**Action:** Retroactive recycle of leads on closed/completed events with
attendee status in (`invited`,`attended`).
**Action SQL:** single CTE-driven UPDATE; pre-state captured atomically in
the WITH clause, post-state via RETURNING. (See SPEC §6 Rollback Plan; this
file is the per-row rollback artifact.)
**Rows affected:** 86 Prizma + 0 demo = **86**. Matches Criterion #10 and
matches `BASE_PRIZMA_RECYCLE_TARGETS` from SPEC §0.1.

## Distribution before/after

| Tenant | old_status            | new_status | Rows |
|--------|-----------------------|------------|------|
| prizma | confirmed             | waiting    | 2    |
| prizma | invited               | waiting    | 84   |
| demo   | (any in the predicate) | waiting    | 0    |
| **Total** |                    |            | **86** |

## Per-row pre/post (rollback artifact)

To revert any subset, run:
```sql
UPDATE crm_leads SET status = :old_status, updated_at = now()
 WHERE id = :lead_id AND tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
```

### prizma — old_status='confirmed' → new_status='waiting' (2 rows)

| lead_id |
|---------|
| 00fc3f84-fb49-4462-9267-81ba22d0b9aa |
| b1e08ce3-28f8-4746-a6d7-c7cc732fbdea |

### prizma — old_status='invited' → new_status='waiting' (84 rows)

| lead_id |
|---------|
| 04c0d330-747c-4259-9c0e-7ad74598a520 |
| 06b2daf5-2416-47f8-804a-f747b4bc5edd |
| 13966905-ce80-4660-aa41-1fe82c8cae2d |
| 1397a45a-5d01-4fe3-ac1c-03a4c870cb09 |
| 155b7612-cf45-4dac-8c24-d330584555b7 |
| 16deb071-2b44-42db-8bd5-60af4a87a2c5 |
| 1822b184-31db-4e51-aa21-139f39402e4f |
| 19da711f-67ad-4a28-bd12-23e9504cafff |
| 1c2bc928-90e0-4906-9552-bc664950ea5d |
| 1e9eeaa4-e890-4e58-8d18-d4ea1c9424bd |
| 21889e9a-c62d-4b53-ac6f-aebdfa5d31ed |
| 26acf907-b0fc-4018-9331-63bacf427c2d |
| 279633aa-34a7-4859-895d-769b20a21e27 |
| 2a107ed0-68c9-433b-a331-b71c6ac8c402 |
| 2ace6368-510e-4e1e-a2f3-3bf4a78b99c5 |
| 2e5f0ca3-d10b-418c-9ca6-86c6bec3ce61 |
| 2fd72e2e-0157-4585-a54d-011d456fe6c1 |
| 31cc358f-bcd0-4785-8e7d-aef8b5e91c42 |
| 3480e9b4-42a9-4375-b2e8-e9a4e669e942 |
| 40541faf-71a5-4345-a448-8158b86917e5 |
| 4648415f-37a4-403c-994f-826e3b8d761c |
| 4770c510-a6ba-4d04-9bae-729ce0b6821c |
| 4972918b-efba-4a43-a442-aa818203ff9a |
| 4d079d2e-124a-4241-b693-8f4fd5bfa45f |
| 4db53c9f-a26b-44f3-8daf-ba4f8f67bbd9 |
| 4e285482-06c9-4257-b257-cf39b7f90933 |
| 4fce675d-6eaf-44fe-965f-0a92e829a5fa |
| 50b0a875-c337-4bc8-96ae-5f093670f7f2 |
| 53b9531d-2c42-453c-80c5-fbe2b5335e9f |
| 5535bfec-5974-4036-b9ff-216cb92ddc17 |
| 575a4541-eb51-4f05-bf03-269bbe763918 |
| 5b0083c0-6ace-4bab-9889-f621f9821509 |
| 5bba9056-bb0a-47aa-8dc1-ae533ec28783 |
| 60221d98-59d9-4594-ad45-f141cd41eca5 |
| 604870b5-3f03-4ca5-b23f-2b6cb50233c3 |
| 641b3851-dbe6-4c4e-aad9-129c435368e5 |
| 6545de33-76f1-455c-9bb2-e6bd3edda4dd |
| 67a8a09f-396a-4663-8e1b-c962cdb95ce5 |
| 68301266-65d7-4556-b39f-5c5f3fdeb409 |
| 71db439d-e3e4-4e11-b69c-2acf4859b674 |
| 77a240ec-bc44-4a22-93f3-12705271c555 |
| 7929bbc8-a9c5-4d8b-a64c-4ad9979231f0 |
| 7ccbafcc-8cef-41b4-85dc-64a0c2acb78b |
| 7fe1ece5-4d1d-4e4d-8ff4-6593ed800ea5 |
| 8052bcb0-0cab-45c3-aa16-8f5b0827da25 |
| 81f4de9e-20dc-491b-a77a-5d47863df315 |
| 837516b1-54ee-4124-85e1-b1e310c9eba1 |
| 85b1f0ad-6ab9-4697-a1c0-d5d2eba73947 |
| 873bc31c-b74c-4707-9d53-7c7a3d9f570f |
| 8c76a8b1-084c-4b91-b71a-84bf67c0ed46 |
| 8e7be6a4-af0e-4038-82db-8f2a26a80a8f |
| 96cf25a0-6977-4bee-9982-f642c03a56e3 |
| 980e8ee8-7383-4d54-8a36-94272a128d96 |
| 98618c00-8c71-463c-87bd-13e927668931 |
| 9b6c1ccd-b8ae-4feb-9a3a-cff0841733b4 |
| 9d4c36ec-9d37-478c-b34f-78b2e878a7fa |
| 9f9d20b7-607d-4e49-b566-50d97ceba536 |
| 9ff3eb7f-ace7-45d8-92c0-9ae65e546046 |
| a2fd6181-8c87-4580-bcd4-14a30a26dd69 |
| a41c3602-2556-4581-8a92-575df2315145 |
| a7cafd9e-0976-4038-96eb-f9974bd402ec |
| a84ae4b7-e741-488e-8fd6-ed7b23385a14 |
| ac894eb7-b671-450d-96a1-786fd75950cf |
| ad06a0f6-0c7b-4403-b81e-b2bc0c6efcec |
| ad789f01-74d0-436d-bd5f-af0c8bd32617 |
| b23103e1-fde5-40b1-86f2-2c028f90c6cd |
| b3e489bd-a675-48ab-aa64-a34140e198d3 |
| b46fb48a-3017-4750-8179-f14bc0b2548e |
| b48227b2-d7e6-4189-accd-abaed6c5ea34 |
| b893f2db-c6c5-4c06-9947-888bd4d14335 |
| bba88646-c366-4ea7-a221-afaa5958c886 |
| bf5d976b-4edf-486d-9c54-1fadf426f28a |
| cf33fac0-9e3e-4224-bb90-8e441e1fea77 |
| d1763e0a-7bbf-4e42-a8e5-6faea34f493c |
| d55f8097-cf90-45eb-8c71-1aa505f5b2fb |
| e25decf8-c938-468b-985d-ae5c95d5cc2e |
| e6ba039e-e617-4bd4-9505-354b945eae79 |
| f1a47b13-40ef-42e3-8d6c-a1400dd34b63 |
| f2557f2f-098d-43cd-91a1-2f70ac4fb5e6 |
| f26c624d-6a60-4c1e-b03d-c96964556cec |
| f3344181-a936-4b47-8594-99611e1dd96e |
| f40bedd1-b93e-4055-bf98-1d188fd36db5 |
| fbcc0482-f2e3-443a-b2c2-8f1c1768fbde |
| fdcc7f58-b867-4999-bb8f-c730bdad13c3 |

## Verification (post-state)

- **Criterion #10 (rowcount):** 86 = `BASE_PRIZMA_RECYCLE_TARGETS` (86) +
  `BASE_DEMO_RECYCLE_TARGETS` (0). ✓
- **Criterion #11 (no stale leads remain):** to be confirmed in the
  EXECUTION_REPORT § post-Step-4 query.
