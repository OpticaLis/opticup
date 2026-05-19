# FINDINGS — M4_CONFIG_PARITY_RUN_1

## F-1 — Demo-Prizma drift was modest (1+8) — under 10% threshold counting templates only

**Severity:** INFO
**Status:** RESOLVED (sync complete)

Pre-apply dry-run reported 1 INSERT + 8 UPDATES vs. QA report Appendix B baseline of 7 DIVERGED templates + 1 PRIZMA_ONLY = 8 expected template-level changes. Observed: 1 insert (matches PRIZMA_ONLY) + 7 template updates (matches DIVERGED) + 1 rule update (extra). 8 vs 7 templates = exact match. The +1 rule update brought total row ops to 9 vs 8 expected (12.5% over). Daniel authorized the bypass after confirming the rule update was a slug-rename, not a content drift.

**Lesson for future Sentinel Mission 11:** the 10% over-baseline rule needs context. A drift count that's marginally over can still be safe if the type of drift is innocuous (template rename, slug update). Recommend mission output classifies drift type before computing severity.

## F-2 — One Prizma-only template existed for 11 days without demo sync

**Severity:** LOW
**Status:** RESOLVED (synced)

`check_in_attendee_sms_he` was created on Prizma by Campaign Overseer in marathon 4.5 (~2026-05-08?) and never synced to demo. Before SPEC 1 + 2, there was no automated mechanism to catch this. With Iron Rule 33 + Mission 11 (once implemented), this latency drops to ≤24h.

## F-3 — Sync script doesn't print individual row-level diffs

**Severity:** LOW
**Status:** OPEN (UX enhancement, defer)

The diff print at `scripts/sync-prizma-config-to-demo.mjs:printDiff` shows counts + names but not actual body content differences. For a 7-template body update, the operator must trust the script's hash comparison rather than seeing what changed. Mitigation: pre-sync, the operator should compare bodies manually for HIGH-stakes templates. Enhancement candidate for `M4_CONFIG_SYNC_SCRIPT_REGRESSION_TEST` follow-up SPEC.

## F-4 — Smoke test 7/7 is necessary but not sufficient

**Severity:** INFO
**Status:** ACCEPTED

The smoke baseline (`npm run smoke`) verifies basic CRM lead create + reads. It does NOT trigger an automation rule on the updated templates. The first time a real status-change event fires on demo with one of the newly-synced templates, we'll learn whether the templates work end-to-end. SPEC 3's regression test will cover this gap explicitly.
