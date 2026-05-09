# Claude Code — Debug Task: Campaigns Screen Renders Blank Despite Data Present

> **Purpose:** Daniel's localhost campaigns screen renders empty. Code is on develop @ HEAD=80a2ff2 (verified up to date), DB has 7 rows in `v_crm_campaign_performance` for demo tenant, all 3 JS files loaded via `crm.html`, hard-refresh (Ctrl+Shift+R) didn't help. Find the actual cause and fix it. Verify the fix in a real browser using Chrome MCP.
> **Author:** opticup-strategic (Cowork session 2026-04-26 evening)
> **What's been ruled out:** stale code, missing files, wrong git branch, browser cache, missing script tags, view returning 0 rows.

---

## First Action — Continuation

- `git remote -v` is `opticalis/opticup`, branch is `develop`. ✅
- `git log -1` shows `80a2ff2`.
- localhost:3000 is running (Daniel hasn't restarted it).

If state diverges — STOP and report.

---

## Scope

DO:
- Use `mcp__Claude_in_Chrome__*` tools to load `http://localhost:3000/crm.html?t=demo` in a real browser.
- Read console errors, network responses, and DOM state.
- Identify the root cause from observed evidence (not speculation).
- Fix it (file edit), commit + push.
- Re-verify in the browser after the fix.

DO NOT:
- Speculate or attempt fixes without evidence from the browser.
- Modify files outside the scope of the actual bug (no opportunistic refactors).
- Touch the EF or Make scenario (they're working).
- Touch the DB.
- Bypass pre-commit hooks.

---

## Diagnostic Steps

### Step 1 — Load the page in Chrome MCP

```
mcp__Claude_in_Chrome__navigate to http://localhost:3000/crm.html?t=demo
```

Wait for page load to complete.

### Step 2 — Click the קמפיינים tab in the sidebar

Use `mcp__Claude_in_Chrome__find` or `mcp__Claude_in_Chrome__computer` to click the sidebar nav button with `data-tab="campaigns"`.

### Step 3 — Capture all evidence in parallel

For the campaigns tab, capture:

1. **Console messages:**
   - `mcp__Claude_in_Chrome__read_console_messages`
   - Look for ANY red errors (not just warnings).
   - Look specifically for: `ReferenceError`, `TypeError`, `Uncaught`, anything mentioning `CrmCampaigns`, `loadCampaigns`, or `v_crm_campaign_performance`.

2. **Network requests:**
   - `mcp__Claude_in_Chrome__read_network_requests`
   - Filter for any request mentioning `v_crm_campaign_performance` or `crm_facebook_campaigns`.
   - Capture: URL, status code, response body (or summary), headers.
   - Especially check: did the request fire at all? If not, the JS never tried to fetch.

3. **DOM state:**
   - `mcp__Claude_in_Chrome__read_page`
   - Read the `#tab-campaigns` section.
   - Is it empty? Does it contain the loading spinner? Does it contain the rendered KPI cards / table?
   - Is `display: none` set on it (i.e. tab not active)?

### Step 4 — Diagnose

Based on evidence, classify the failure as ONE of these:

**(A) Network request never fires.**
The JS that fetches data isn't running. Possible causes:
- Tab handler not wired (`crm-init.js` missing case).
- IIFE didn't execute (script load order issue).
- Function reference is undefined.

**(B) Network request fires but returns wrong data / errors.**
Possible causes:
- Wrong table/view name in query.
- RLS rejecting (would show 401/403).
- Wrong tenant context.
- View returns rows but wrong shape.

**(C) Data fetched correctly but render fails.**
Possible causes:
- Render function throws on null/undefined field.
- DOM manipulation targets wrong element.
- HTML template has syntax error.

**(D) Tab is hidden.**
The fetch + render runs, but the tab section has `display: none` or wrong tab is showing.

**(E) Other.**
Something not anticipated.

### Step 5 — Fix the root cause

Once classified, edit the relevant file. Be surgical — minimum change to fix.

Iron Rule reminders:
- Before editing, READ the file first (Rule §9 working rules: "Read before write").
- Check line counts after edit (Rule 12: ≤350).
- If editing more than 1 file, justify why.

### Step 6 — Verify the fix in Chrome MCP

Re-run Steps 1-3:
1. Navigate fresh (or reload).
2. Click קמפיינים tab.
3. Confirm:
   - No red errors in console.
   - Network request to `v_crm_campaign_performance` returns 200 with 7 rows.
   - DOM shows: 6 KPI cards + 7 campaign rows in the table.
4. Take a screenshot if helpful.

### Step 7 — Commit the fix

If the fix touched 1 file with a clear bug:
```bash
git add <single-file>
git diff --staged    # verify minimal change
git commit -m "fix(crm): <one-line bug description>"
git push origin develop
```

Pre-commit hooks must pass. Don't bypass.

If the fix is "no actual bug, just a config issue" (like a stale localhost server) — don't commit anything, just document the resolution in the report.

---

## Output Format

Return one consolidated message:

1. **Step 1-2:** Page loaded, tab clicked.
2. **Step 3 evidence:**
   - Console errors (verbatim, full text of red entries).
   - Network request to view: status, response shape.
   - DOM state of #tab-campaigns.
3. **Step 4 diagnosis:** classification (A/B/C/D/E) with evidence.
4. **Step 5 fix:** what file changed, what the change was, why it addresses the diagnosis.
5. **Step 6 verification:** post-fix evidence (no errors, network OK, DOM populated).
6. **Step 7:** commit hash + push, OR explanation of why no commit.
7. **End-of-task confirmation:** "Campaigns screen now renders 7 rows. Hand back to Daniel to verify in his own browser."

---

## Stop-on-Deviation

- Cannot reach localhost:3000 from Chrome MCP → STOP, report. Daniel may need to restart the server.
- Console reveals an error pointing to a file outside `modules/crm/` → STOP, report scope expansion before fixing.
- The fix would require modifying more than 1 file → STOP, present plan to Daniel.
- DB query in browser returns 0 rows when MCP confirmed 7 → tenant context mismatch; STOP, this is a different problem.
- Pre-commit hook fails → STOP, don't bypass.

---

## Time Estimate

10–20 minutes. Most of it is browser MCP roundtrips.

---

## Iron Rule Compliance

- **Rule 8 (no innerHTML with user input):** if fix involves rendering, use `escapeHtml` / `textContent`.
- **Rule 12 (≤350 lines):** check after edit.
- **Rule 23 (no secrets):** no secrets touched.
- **CLAUDE.md §9 (one concern per task):** if you find unrelated bugs, log them in the report — don't fix.

---

*End of prompt.*
