# M4_PRE_NIGHT_COMPREHENSIVE_AUDIT — Activation Prompt

Paste into a fresh Claude Code session (or the existing one — single-skill audit, no Pipeline conflict).

---

```
Run M4_PRE_NIGHT_COMPREHENSIVE_AUDIT — read-only audit before tonight's planned changes.

Brief: modules/Module 4 - CRM/architecture-brief/M4_PRE_NIGHT_COMPREHENSIVE_AUDIT_BRIEF.md

SINGLE-SKILL: opticup-localhost-tester is the lead. NO Foreman, NO Executor, NO Reviewer. NO code changes whatsoever.

MODEL: Sonnet (claude-sonnet-4-20250514). Mechanical read-only work across 9 missions.

THE 9 MISSIONS (do in order; skip-not-stop per Brief §6 D2):

1. Resend-button pre-flight — probe crm_message_log + crm_message_queue schema, identify existing retry mechanisms (Iron Rule 21), enumerate failure taxonomy.

2. Skill Harvest pre-flight — list all queued P-AUTHOR-N + P-EXEC-N proposals from today's FOREMAN_REVIEWs + 5 patterns A-E. Confirm none already in SKILL.md.

3. M4 regression baseline — Chrome MCP on demo (whitelist phones 0537889878 + 0503348349):
   - Lead intake (HE/EN/RU storefront forms)
   - Manual lead create CRM UI
   - Lead status walk (actual demo taxonomy from crm_statuses)
   - Event create + status walk
   - Attendee registration (3 paths)
   - Attendee status flips
   - CAPI dispatch verification (CompleteRegistration + EventAttended + Purchase)
   - Purchase amount entry
   - Broadcast wizard DRAFT only (no send)
   - Template editor lint (P2.3 Layer D)
   - Unsubscribe flow
   - Soft-delete + restore
   - Dispatch queue health (read-only)
   - Funnel Health Dashboard load
   - Weekly Brief panel load
   - Short-links tab (all 4 components, post-redesign state)

4. Cross-Module ripple analysis — trace messaging path button → DB → cron → EF → SMS provider → log. Identify Sentinel monitoring rules that might be affected.

5. Pixel infrastructure pre-flight — map storefront_config.analytics.pixel_events + facebook_pixel_id + fb_capi_token + dual-pixel firing support. Read fb-capi-dispatch EF source. Document expected schema changes for dual-pixel.

6. Database health snapshot — pg_size_pretty on M4 tables, get_advisors, slow queries, index usage.

7. Production state safety check — Prizma in-flight broadcast? Other Pipeline running? Clean working tree? Last 6 commits documented?

8. Sentinel + Guardian state — docs/guardian/GUARDIAN_ALERTS.md + Sentinel mission outputs + outstanding Foreman backlog.

9. Executive summary — 1-page output. For each planned night-run deliverable (Resend button + Skill Harvest + comprehensive M4 sweep), assign 🟢/🟡/🔴 with reasoning. Top 3-5 "things to know before night-run."

10. Campaign Team Skill Design — design the 6-role campaign team Daniel approved (Copywriter, CRM Manager, Storefront Designer, Performance Analyst, QA/Tester, Audience Strategist).
    - Read existing roles/campaign-overseer/ + roles/site-overseer/ + roles/admin/ if exists.
    - Map current coverage vs the 6-role target. Where do existing roles already cover one of the 6? Where are gaps?
    - For each of the 6 roles propose:
      - Skill name (e.g., opticup-campaign-copywriter)
      - Trigger phrases in Hebrew + English
      - Primary domain (what it owns)
      - Boundary (what it does NOT touch — Iron Rule 35 style)
      - Existing memory files / decision logs it consumes
      - Handoff format to other roles
      - Authority boundary (read-only / read+config / read+config+code)
    - Identify which roles should be NEW skill files and which can extend an existing skill.
    - Sketch the handoff flow: e.g., Performance Analyst spots low CTR → Copywriter rewrites → QA validates → CRM Manager schedules.
    - Output: roles/_design/CAMPAIGN_TEAM_SKILLS_DESIGN.md (~300 lines, comprehensive).
    - This is design only — no skill files actually created. Tomorrow morning a separate SPEC will implement the chosen design.

OUTPUT LOCATION:
- All files under _archive/pre-night-audit-2026-05-20/
- AUDIT_REPORT.md (Mission 9 — primary output for Daniel)
- MISSION_01-08.md (detail backup)
- screenshots/ subfolder

EXECUTION RULES:
- READ-ONLY everywhere except test-lead writes on demo (whitelist phones, max 50 leads, cleanup at end).
- Cross-Module Safety Audit §4 BINDING. NO writes outside _archive/pre-night-audit-2026-05-20/.
- NO EF deploys. NO schema changes. NO Prizma writes.
- Skip-not-stop per Brief §6 D2: individual mission blockers do NOT halt the chain.
- Hard-stop only on §8 stop-triggers (write outside scope, budget overflow, EF deploy, IR31 fail).
- Quality over speed. No artificial time cap.

STOP TRIGGERS (over Brief §8):
- Any write to production (Prizma) data.
- More than 50 test leads created.
- EF deploy attempted.
- Schema change attempted.
- Push to main attempted.

CLOSURE:
1. AUDIT_REPORT.md exists with all 9 mission sections.
2. ≥ 14/16 Mission 3 scenarios PASS.
3. Mission 9 has explicit 🟢/🟡/🔴 verdict per night-run deliverable.
4. Test leads cleaned up (count < 50).
5. Smoke 8/8 PASS post-audit (baseline unchanged).
6. Single commit on develop: `docs(audit): M4 pre-night comprehensive audit — 9 missions, [X] findings`.
7. Push to origin/develop.
8. Surface a short English status line per user memory feedback_daniel_comms.

Daniel will return later. He reads AUDIT_REPORT.md first, then I (Architect) author the night-run Brief based on findings.
```

---

*End of Activation Prompt.*
