# FINDINGS — M4_FB_CAPI_SUPPRESSION_GATE

## F-01 (resolved) — FB CAPI GDPR hole closed
**Severity:** RESOLVED (was HIGH per `M4_SUPPRESSION_LIST` FINDINGS F-02).
**Resolution:** 2-layer gate at `fb-capi-dispatch/index.ts` Step 2.5 + queue-status enum extension. 3 live smoke tests prove correct behavior with explicit Meta-call evidence.

## F-02 (RESOLVED at execution time) — CHECK constraint blocker on `crm_capi_dispatch_queue.status`
**Severity:** MEDIUM (would have caused silent UPDATE failure post-EF deploy).
**What:** original constraint accepted 6 values: `queued, sent, failed, skipped_no_token, no_match, permanent_error`. My EF code emits `skipped_suppressed` — would have violated CHECK + bubbled as an exception during `updateQueueRow`, leaving the queue row in `queued` state and potentially re-trying forever.
**Resolution:** ALTER CHECK constraint to include `skipped_suppressed` BEFORE the EF redeploy was tested. Discovered via pre-flight `pg_get_constraintdef` probe during smoke setup.

## F-03 (INFO) — Demo has FB CAPI token configured
**Severity:** INFO.
**What:** the Normal smoke lead dispatched a real (synthetic) event to Meta because demo's `storefront_config.analytics.fb_capi_token` is set. The hashed payload included `em=sha256(capi_smoke_normal@demo.opticalis.test)`. No real PII; safe. Documented for awareness if future demo tests want to skip Meta entirely (option: temporarily NULL the token).

## F-04 (Sprint 4 candidate) — Add a `[fb-capi-gate] pass queue=...` log on the control path too
**Severity:** LOW (observability).
**What:** today the EF logs `[fb-capi-gate] skip queue=... reason=...` for blocked cases but is silent for allowed cases. Adding a symmetric `[fb-capi-gate] pass queue=...` log line would make GDPR audits easier (proving the gate was evaluated for every dispatch). Defer until needed.

---
*End of findings.*
