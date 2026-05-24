# FINDINGS: M4_SHORT_LINKS_CHANNEL_DASHBOARD

**Date:** 2026-05-24

---

## 1. Channel-grouped view works end-to-end

The grouping logic correctly handles all three cases:
- **Paired links** (both `_email` + `_sms` labels): merged into one row showing total + breakdown.
- **Single-channel links** (only one of the pair exists): shown as a group row with the available channel's count.
- **Non-convention links** (no `_email`/`_sms` suffix): shown individually with "(אחר)" tag. 4 such links exist on demo (legacy orphaned codes from before the channel split).

## 2. "Both" create flow produces correct convention codes

The `crm_create_channeled_short_link` RPC generates codes with channel letter as first character (`E`/`S`) + 7-char random suffix. Global collision check works correctly. The "both" mode in the UI calls the RPC twice sequentially — if the first call succeeds but the second fails, one orphan row could remain. This is acceptable: the operator can retry, and the orphan is a valid resolvable link.

## 3. Edit/delete removed from grouped view

The old per-code edit/delete buttons were removed since the grouped view abstracts individual codes. Individual link management (edit target_url, delete) can be done via:
- The existing `crm_update_static_short_link` / `crm_delete_static_short_link` RPCs (SQL or admin tooling)
- A future ungrouped detail view if needed

This is a deliberate trade-off: the grouped view prioritizes reading (analytics), not per-code mutation. If per-code management becomes needed, it can be added back as a drilldown action on the grouped row.

## 4. DB totals verification

| Group | Total | SMS | Email |
|---|---:|---:|---:|
| pricing_catalog | 2 | 1 | 1 |
| stock_page | 2 | 1 | 1 |
| supersale_launch_wave1 | 0 | 0 | 0 |
| supersale_launch_wave2 | 0 | 0 | 0 |
| takanon | 2 | 1 | 1 |

All totals match what the UI displays. Click counts of 1 per channel are from the M4_SHORT_LINKS_CHANNEL_SPLIT verification curls (not real user traffic).

## 5. Existing RPC preserved

`crm_create_static_short_link` is unchanged. The new `crm_create_channeled_short_link` is additive. The UI create dialog now calls the new RPC exclusively, but any external callers of the old RPC are unaffected.
