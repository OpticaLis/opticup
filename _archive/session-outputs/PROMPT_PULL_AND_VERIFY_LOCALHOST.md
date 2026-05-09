# Claude Code — Atomic Task: Pull develop on this machine + verify campaigns screen code

> **Purpose:** The localhost server on Daniel's Windows desktop appears to be running stale code — the campaigns screen renders empty despite DB having 7 rows and recent develop commits. Verify the local working tree matches origin/develop, pull if needed, and inspect the campaigns screen code to confirm it's intact.
> **Author:** opticup-strategic (Cowork session 2026-04-26 evening)

---

## First Action — Session Start (CLAUDE.md §1)

Continuation. Confirm:
- `git remote -v` is `opticalis/opticup`. ✅
- Current branch should be `develop`.
- This is running on Daniel's 🖥️ Windows desktop where localhost:3000 lives.

---

## Steps

### Step 1 — Capture current state

```bash
git status
git log --oneline -5
git rev-parse HEAD
```

Report what you see. If `git status` is clean, proceed. If dirty in unexpected ways — STOP and report.

### Step 2 — Compare to origin

```bash
git fetch origin develop
git log --oneline HEAD..origin/develop
```

Expected: ZERO commits between local HEAD and origin/develop (i.e. the output should be empty), if the local machine is up to date.

If there are commits listed — local is behind. Proceed to Step 3.

If empty — the local IS up to date and the issue is elsewhere; jump to Step 5.

### Step 3 — Pull develop

```bash
git pull origin develop
```

Expected: a clean fast-forward pull. Confirm by:
```bash
git log --oneline -5
```

Top commit should now be `80a2ff2 docs(spec): FOREMAN_REVIEW for M4_CAMPAIGNS_MAKE_BODY_FIX_V3 (verdict: 🟢 CLOSED — pipeline operational)` or newer.

If pull fails with conflicts — STOP and report. Don't try to resolve automatically.

### Step 4 — Confirm campaigns screen files exist

```bash
ls -la modules/crm/crm-campaigns.js
ls -la modules/crm/crm-campaigns-detail.js
ls -la modules/crm/crm-unit-economics-modal.js
wc -l modules/crm/crm-campaigns.js
```

Expected: all 3 files exist, `crm-campaigns.js` is around 250 lines.

### Step 5 — Inspect the screen code briefly

Read the first 50 lines of `modules/crm/crm-campaigns.js`. Verify:
- It defines a `window.CrmCampaigns` (or similar global) namespace.
- It has a function that fetches from `v_crm_campaign_performance` view via `sb.from(...)` or `DB.fetchAll(...)`.
- It has a `loadCampaigns()` or `init()` or similar entry point.

Report what the entry point looks like.

### Step 6 — Confirm crm.html has the campaigns nav entry + scripts

```bash
grep -n "campaigns" crm.html
```

Expected: at least 4 matches:
- 1 line for the sidebar nav button.
- 1 line for the panel container (a div with `id="campaigns-panel"` or similar).
- 3 lines for the script tags (crm-campaigns.js, crm-campaigns-detail.js, crm-unit-economics-modal.js).

If grep finds <4 matches — there's a missing wire-up. STOP and report.

### Step 7 — Confirm the view returns data

Use `mcp__supabase__execute_sql`:

```sql
SELECT COUNT(*) FROM v_crm_campaign_performance
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
```

Expected: 7 rows (matching the 7 active campaigns the Make scenario populated).

Then sample one row:

```sql
SELECT campaign_uuid, name, status, total_spend, leads_num, buyers_num, gross_profit
FROM v_crm_campaign_performance
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
LIMIT 3;
```

Expected: 3 rows with real data (Hebrew names, numeric values).

If view returns 0 rows but `crm_facebook_campaigns` has 7 — STOP and report. The view definition may have a tenant-id filter issue.

If view returns 7 rows with data — the data pipeline is fine. The issue is purely on the frontend (caching / not pulled / authentication).

---

## Output Format

Return one consolidated message:

1. **Step 1:** current HEAD + git status.
2. **Step 2:** how many commits behind origin/develop (zero or more).
3. **Step 3 (if needed):** pull result, new HEAD.
4. **Step 4:** file existence + line counts.
5. **Step 5:** brief description of `crm-campaigns.js` entry point.
6. **Step 6:** `grep` results for "campaigns" in `crm.html`.
7. **Step 7:** view row counts + sample.
8. **Diagnosis:** one of:
   - "Local was behind; pulled; localhost should now show data after Daniel hard-refreshes browser (Ctrl+Shift+R)."
   - "Local was already up to date; data is in DB and view works; suspect browser cache or authentication. Daniel should: (a) hard refresh, (b) check that the tenant slug in URL is `demo`."
   - "View returns 0 rows despite DB having data — view tenant filter may be broken. New finding."
   - Other (describe).

---

## Stop-on-Deviation

- `git pull` produces conflicts → STOP, don't auto-resolve.
- View returns 0 rows when DB has data → STOP, this is a new bug.
- Any of the campaigns JS files missing → STOP, something deleted them.
- Anything modifies state in unexpected files → STOP.

---

## Time Estimate

5–8 minutes. Pure diagnosis + maybe one pull.

---

## Iron Rule Compliance

Read-only diagnosis (Step 7's SQL is SELECT only). Optional one `git pull` (which is the standard First Action protocol step anyway). No commits, no file modifications, no DB writes.

---

*End of prompt.*
