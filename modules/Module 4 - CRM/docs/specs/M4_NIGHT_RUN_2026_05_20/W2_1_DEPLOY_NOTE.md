# W2.1 Deploy Note — Manual EF Deploy Required

**SPEC:** M4_NIGHT_RUN_2026_05_20
**Wave:** W2.1 — dispatch-queue advisory-lock + retry
**State at end of night-run:**

| Layer | State |
|---|---|
| Migration `20260520030000_m4_dispatch_lock.sql` | ✅ Applied to Prizma DB via Supabase MCP — `m4_dispatch_lock` table exists with row `id=1`, both nullable columns. RLS canonical 2-policy pair in place. |
| Lock-claim/release logic | ✅ DB-verified: tick-A acquires → tick-B 0-rows-returned (lock-skip works) → tick-A releases → state back to NULL/NULL. |
| EF code at `supabase/functions/dispatch-queue/index.ts` | ✅ Updated in repo (345 lines, under IR12 cap). Advisory lock + retry-with-backoff + catch-block retries fix all implemented. |
| EF deploy via Supabase MCP | ❌ FAILED 2x with `InternalServerErrorException — Function deploy failed due to an internal error` (known OPEN-021 issue; recurs intermittently — see SESSION_CONTEXT history for `M4_FB_CAPI_HYBRID_DEDUPLICATION` + `M4_BROADCAST_ID_PROPAGATION`). |
| Live dispatch-queue EF version on Prizma | ⚠️ Still pre-W2.1 — currently runs WITHOUT advisory lock + WITHOUT retry-with-backoff. The band-aid `batchSize=15` from `M4_SMS_RATE_LIMIT_HOTFIX_2026_05_20` is still in place; SMS dispatch continues to work, but the 4×-overlap rate-limit bug class remains possible. |

## What needs to happen in the morning

```powershell
# From a Claude Code Windows session (not Cowork):
cd C:\Users\User\opticup-night-0520
supabase functions deploy dispatch-queue --no-verify-jwt
```

(`--no-verify-jwt` matches the existing config; verify_jwt=false because the function is called from pg_cron via pg_net.)

After deploy:
1. Watch the next pg_cron tick (every minute on the `dispatch_queue` cron job, currently active).
2. Confirm `m4_dispatch_lock` table shows a non-NULL `locked_until` for ~few seconds during a tick.
3. Confirm `crm_message_queue` continues to drain — no rows stuck in `processing` for >2 minutes.
4. If queue stalls → revert the EF deploy (`supabase functions deploy` from `_archive/<pre-night-snapshot>/` or `git checkout HEAD~1 -- supabase/functions/dispatch-queue/index.ts && supabase functions deploy dispatch-queue --no-verify-jwt`).

## What the deploy buys us

1. **Advisory lock** — at most ONE dispatch-queue invocation processes the queue at a time. Eliminates the 4×-overlap rate-limit bug class structurally (the `batchSize=15` band-aid becomes belt-and-suspenders).
2. **Retry-with-backoff** — transient failures (Make webhook 4xx/5xx, timeouts, rate_limits, network errors, exceptions) auto-retry with exponential backoff (1m → 2m → 4m → 8m → 16m), then mark permanently failed after MAX_RETRIES=5.
3. **catch-block retries++** — F-M08-1-hinted bug: the previous `catch` block didn't increment `retries`, so network exceptions silently re-attempted forever without surfacing in the retry counter. Fixed.

## What's deferred to a follow-up SPEC

Nothing — W2.1 is feature-complete at the code level. The only gap is the deploy itself, which is infrastructure flakiness, not a design gap.

## Stop-trigger check

The night-run brief stop-trigger for W2.1 was: "advisory lock causes dispatch to stall (queue not draining) → revert W2.1, keep batchSize=15 band-aid, flag." This trigger CANNOT fire tonight because the EF deploy didn't succeed — Prizma's live dispatch is still running the pre-W2.1 code, so no behavior change has reached production. The risk is fully contained in the unmerged develop branch + the unapplied EF deploy.
