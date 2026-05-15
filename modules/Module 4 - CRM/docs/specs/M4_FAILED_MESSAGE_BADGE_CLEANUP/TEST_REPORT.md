# TEST_REPORT — M4_FAILED_MESSAGE_BADGE_CLEANUP

**Date:** 2026-05-15 06:30 UTC
**Tester:** opticup-localhost-tester (skill)
**Repo:** opticalis/opticup, branch `develop`, HEAD `1cd40c3`
**Status:** 🟢 GREEN

---

## 1. Servers

| Server | URL | Status | Latency |
|---|---|---|---|
| ERP | http://localhost:3000 | 200 | 212 ms |
| Storefront | http://localhost:4321 | 200 | 2.16 s |

Both up before test run; `scripts/start-local.ps1` not invoked.

---

## 2. Baseline (`tests/smoke/baseline.test.mjs`)

**7/7 PASS, 0 failed.**

```
Tenant: 8d8cfa7e-ef58-49af-9702-a862d459cccb (demo)

  PASS  1. PIN login returns JWT with tenant_id=demo  (982ms)
  PASS  2. Create CRM lead succeeds (M4)  (146ms)
  PASS  3. Read inventory count for demo tenant (M1)  (152ms)
  PASS  4. Storefront homepage returns 200  (1337ms)
  PASS  5. Storefront /supersale lead-form page returns 200  (872ms)
  PASS  6. Cross-module: lead from test-2 visible via crm_leads SELECT  (124ms)
  PASS  7. No 5xx on critical pages (HEAD only)  (1047ms)
```

Notable observations:
- **Test 2 (Create CRM lead)** PASS — the create-lead flow still works on demo despite the `crm_message_log` schema additions (3 new NULL-able columns) made by this SPEC's migration. Backward compat preserved (existing INSERTs work; new columns default to NULL).
- **Test 7 (no 5xx)** PASS — the new `<script src="modules/crm/crm-failed-messages-modal.js">` tag in `crm.html` does not introduce a 4xx/5xx (the file is correctly served at 200; verified at `http://localhost:3000/modules/crm/crm-failed-messages-modal.js` via the Test-7 HEAD sweep).
- Pre-baseline comparison: prior most-recent green TEST_REPORT (`M4_TEMPLATE_VALIDATION_UNIFIED` 2026-05-14) also reported 7/7 PASS. Net delta: 0 regressions; 0 new failures. Per `M4_BROADCAST_ID_PROPAGATION/FOREMAN_REVIEW.md` AP#2, the "pre-baseline" half of SPEC §3 criterion 15 is satisfied structurally (prior SPEC's green report). The "post-baseline" half is this report.

---

## 3. SPEC-specific (`tests/smoke/M4_FAILED_MESSAGE_BADGE_CLEANUP.test.mjs`)

n/a — no spec-specific test file authored. The SPEC's success criteria were all covered by:
- Executor's direct SQL/RPC tests (criteria 4, 5, 8, 9, 10, 11, 12, 13, 14, 17) — see EXECUTION_REPORT.md §2.
- Reviewer's independent live-DB re-verification (same criteria) — see REVIEW.md §2.
- This LH-Tester pass (criteria 15, 16, 19) — see §2 above + §4 below.

---

## 4. UI smoke (Chrome DevTools MCP, light pass)

LH-Tester v1 per `opticup-localhost-tester/SKILL.md` scopes UI to: "Page returns 200; no obvious JS error in console; runtime globals are registered."

| Check | Result |
|---|---|
| Navigate to `http://localhost:3000/crm.html?t=demo` | Redirected to `index.html?t=demo` (PIN-auth gate — expected) |
| Page loads with title `אופטיקה דמו (בדיקה) — Optic Up` | ✅ |
| Console errors after load | 0 errors. 1 known WARN about multiple GoTrueClient instances (pre-existing, unrelated to this SPEC). |
| `<script src="modules/crm/crm-failed-messages-modal.js">` reachable | ✅ (verified via Test 7 HEAD sweep + visual check of `crm.html:380`) |
| Globals on login page (pre-PIN) | `Modal`, `Toast`, `hasPermission` registered. CRM globals not yet loaded — expected (CRM scripts are deferred until the CRM page is reached post-PIN). |

**Manual click-through (PIN login → לידים tab → click chip → modal opens → ack → verify "מטופל" tag):** DEFERRED to Daniel per LH-Tester v1 boundary. The skill docs state: "Using browser tools (Chrome DevTools MCP) for v1 — Playwright belongs in v2 once we accept the install footprint." The Optic Up PIN form uses a custom dialer-style entry (not a single `input[type=password]`), so an automated PIN login is out of v1 scope.

**Recommendation to Daniel** for the manual walkthrough (≤ 2 min):
1. Open http://app.opticalis.co.il/?t=demo (or localhost equivalent) → PIN 12345.
2. Navigate to לידים tab. Verify the "📩 הודעות כושלות (11)" chip is visible (11 unique demo leads have pre-existing failures — same number as before this SPEC).
3. Click the chip → modal should open listing the failures.
4. Open any one lead's detail → "הודעות" tab → no acknowledged rows yet on demo, so no "מטופל" tag (that's expected). To see the tag: ack one failure via the modal, then re-open that lead's detail.
5. On Prizma (`?t=prizma`): the chip count should be **"📩 הודעות כושלות (2)"** post-cleanup (down from 760 pre-SPEC). Open any of the 758 cleared leads → "הודעות" tab → the failed message rows should now show the green "מטופל · {timestamp} · מערכת" tag.

---

## 5. Integrity gate

```
$ npm run verify:integrity
All clear — 118 files scanned in 13ms (Iron Rule 31 gate)
```

Exit 0. Criterion 16 PASS.

---

## 6. Failures

None.

---

## 7. Hand-off

**🟢 GREEN — handing back to Foreman (opticup-strategic) for FOREMAN_REVIEW.md.**

All reports written: SPEC.md, ROLLBACK.md, migrations/01_failed_message_ack.sql, EXECUTION_REPORT.md, FINDINGS.md, REVIEW.md, this TEST_REPORT.md. Commits e419e89 → 1cd40c3 pushed to `origin/develop`. SPEC is ready for closure.

**Hebrew status line:** ✓ Smoke 7/7 PASS (M4_FAILED_MESSAGE_BADGE_CLEANUP).

End of TEST_REPORT.
