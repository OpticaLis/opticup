# Activation Prompt — FINAL_QA_AUDIT

## For Claude Code (local machine, Windows desktop)

Copy-paste this into Claude Code:

---

```
Load opticup-executor skill, then execute the SPEC at:
modules/Module 4 - CRM/final/FINAL_QA_AUDIT/SPEC.md

This is a READ-ONLY QA audit + investigation SPEC. You do NOT write code.
You test every flow, record results, and write two reports.

Key points:
- Demo tenant only (slug=demo, PIN=12345)
- Test phones: +972537889878, +972503348349
- Test email: danylis92@gmail.com
- You CAN create/delete test data on demo — restore baseline at the end
- You CANNOT modify source code, run DDL, or touch Prizma data
- Test on localhost:3000/crm.html?t=demo (use chrome-devtools MCP if available)
- For Edge Function tests, use curl against the live Supabase endpoint
- Think independently about edge cases and variations beyond what the SPEC lists
- The goal is to find EVERYTHING that needs fixing before merge to main
- Pay special attention to the registration URL issue (§4) — investigate the
  token approach thoroughly
- Think like an event manager (Shir) who needs to run events independently —
  what would confuse her? What's missing? What breaks?

Write your deliverables to:
  modules/Module 4 - CRM/final/FINAL_QA_AUDIT/QA_TEST_REPORT.md
  modules/Module 4 - CRM/final/FINAL_QA_AUDIT/RECOMMENDATIONS.md
  modules/Module 4 - CRM/final/FINAL_QA_AUDIT/EXECUTION_REPORT.md
  modules/Module 4 - CRM/final/FINAL_QA_AUDIT/FINDINGS.md
```

---
