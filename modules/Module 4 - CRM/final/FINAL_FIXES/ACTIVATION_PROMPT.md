# Activation Prompt — FINAL_FIXES

## For Claude Code (local machine, Windows desktop)

---

```
Execute the SPEC at modules/Module 4 - CRM/final/FINAL_FIXES/SPEC.md

This is the LAST code SPEC before merge to main. 8 tracks: 3 critical fixes, 5 smaller fixes.

Key context:
- Demo tenant slug=demo, PIN=12345
- Test phones: +972537889878, +972503348349
- Test email: danylis92@gmail.com
- Track D was REMOVED — UTMs are correct as-is, do NOT touch lead-intake
- After commit 2, deploy event-register Edge Function ONLY:
    npx supabase functions deploy event-register --project-ref tsxrrxzmdxaenlvocyit
- Verify Track B by submitting the public registration form on demo and checking crm_message_log for 2 new rows with status=sent
- Track H is SQL only on demo tenant, not a repo commit
- r.html goes in the REPO ROOT (next to index.html), not inside modules/

Read the FINAL_QA_AUDIT reports first for full context:
  modules/Module 4 - CRM/final/FINAL_QA_AUDIT/QA_TEST_REPORT.md
  modules/Module 4 - CRM/final/FINAL_QA_AUDIT/FINDINGS.md
  modules/Module 4 - CRM/final/FINAL_QA_AUDIT/RECOMMENDATIONS.md

Write deliverables to modules/Module 4 - CRM/final/FINAL_FIXES/
```

---
