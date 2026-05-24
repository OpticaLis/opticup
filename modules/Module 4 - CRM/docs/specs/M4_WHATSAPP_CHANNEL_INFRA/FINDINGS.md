# FINDINGS: M4_WHATSAPP_CHANNEL_INFRA

**Date:** 2026-05-24

---

## 1. Dialog360 dispatch is architecturally clean

The new WhatsApp dispatch path (`dialog360.ts`) slots into the existing `writeDispatchAndSend` flow cleanly — the branch point is a single `if (p.channel === "whatsapp")` BEFORE the Make webhook call. SMS/email code is untouched. This validates the M12 Brief's Pattern 2 design (Make is one-way; WhatsApp is direct).

## 2. Template-message format differs from SMS/email

WhatsApp sends do NOT use the CRM template body directly. They reference a pre-approved Meta template by name + pass positional `{{1}}` parameters. The CRM template body field serves only as a display reference in the template editor. This is a fundamental architectural difference from SMS/email (which substitute `%name%` vars into the body text).

The var mapping is currently hardcoded in index.ts (`name → {{1}}, event_name → {{2}}, event_date → {{3}}`). When more templates are approved with different var orders, this will need a per-template var-mapping config — noted as a follow-up.

## 3. WCATp storefront routing issue

The `WCATp` short link resolves correctly when called via the Supabase resolve-link EF directly (302 → target). However, the storefront's `/r/WCATp` route returns 404 — likely a Vercel edge cache that hasn't seen this code yet. `WCATd` (same creation pattern) resolves correctly through the full chain. A storefront redeploy should clear this. Not a blocker for WhatsApp dispatch — templates can use the full Supabase EF URL if needed.

## 4. EF deployment gate

All 3 Edge Functions (send-message, dispatch-queue, whatsapp-inbound) require Daniel CLI deployment per OPEN-021 (Supabase MCP `deploy_edge_function` is unreliable). This is a known workflow constraint, not a new finding. The `whatsapp-inbound` EF needs `--no-verify-jwt` since Dialog360 webhooks don't carry a Supabase JWT.

## 5. Daily cap uses crm_message_log count

The WhatsApp daily cap check queries `crm_message_log WHERE channel='whatsapp' AND status='sent' AND created_at >= today`. This is a COUNT query on a growing table — acceptable at current volume but may need an index `(channel, status, created_at)` at scale (tracked in M4_SCALE_READINESS SPEC 3: screen query audit).

## 6. Channel convention complete

With WCATd/WCATp, the W-prefix convention is now live alongside E (email) and S (SMS). The full short-link channel convention:

| Prefix | Channel | Example codes |
|---|---|---|
| E | email | ECATp, ESLpw1 |
| S | SMS | SCATp, SSLpw1 |
| W | WhatsApp | WCATp, WCATd |
