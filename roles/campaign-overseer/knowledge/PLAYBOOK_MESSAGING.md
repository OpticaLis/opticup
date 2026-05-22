# PLAYBOOK — Messaging Drafting Disciplines (SMS / Email / WhatsApp)

> **Synthesized 2026-05-22 from retiring `opticup-campaign-copywriter` skill disciplines.** Captures the operational HOW for drafting message bodies that respect channel limits, placeholder contract, brand tone, and worst-case substitution math.
> **Read when:** task in `CAMPAIGN_KB_MAP.md` row "Draft / refine a message body".
> **Authority surfaces:** [`KB_MESSAGING`](KB_MESSAGING.md) (template catalog + placeholder contract + IR35 boundary + channel rules) + `M4_INFRASTRUCTURE_CONTRACT.md` §1 (canonical variable list). This PLAYBOOK is the drafting layer; the KB/contract are the canon.

---

## 1. The four absolute rules

1. **Never invent a `%var_name%`.** Re-read `M4_INFRASTRUCTURE_CONTRACT.md` §1 every drafting session. If your draft "needs" a placeholder not in §1 — STOP. The resolver doesn't know it. The send would emit raw `%var_name%` to the customer. Either: (a) rephrase the copy to use existing placeholders, or (b) open an Architect SPEC request (Iron Rule 35).
2. **No raw URLs in SMS / email bodies.** Use `%registration_url%` / `%unsubscribe_url%` placeholders. SMS-gateway preview bots fire ~95% of clicks on bare URLs within 6 minutes (`feedback_clicks_are_not_actions`). Placeholders are resolved server-side at send time and bypass the bot-noise problem.
3. **No hardcoded business values** (prices, addresses, phones, tax rate, currency symbol, brand name) — Iron Rule 9. Use placeholders or tenant config. A literal "Prizma" string in a multi-tenant template breaks SaaS posture.
4. **Worst-case substitution char count is the only count that matters.** §3 below.

## 2. Channel-fit decision tree

| Channel | Soft cap | Hard cap | When to switch channel |
|---|---|---|---|
| SMS | 160 chars/segment (post-substitution) | 320 chars (2 segments) | **Above 320 → switch to Email or WhatsApp.** SMS gets expensive + low completion above 2 segments; some gateways 404 on >5-part Hebrew messages (lesson from P5_V2 cutover, 2026-04-29). |
| Email | Subject + body separate | No length cap | Use when content is informational, long, or needs HTML structure |
| WhatsApp | ≤500 chars recommended | No hard cap | Use for conversational tone, QR delivery, or when SMS is too long |

**Why 320 → switch channel:** SMS cost scales linearly with segments. Email is free. WhatsApp via Green-API is free. If a message naturally crosses 320 chars, the right answer is rarely "force a 3-segment SMS" — it's usually "this should have been an email all along."

## 3. Worst-case substitution char count (the most common silent failure)

Every SMS draft MUST be tested with substitution variables expanded to their **worst-case real values**, not their placeholder strings. Example:

- Placeholder text: `שלום %name%, נרשמת לאירוע %event_name% בתאריך %event_date%` = 47 chars.
- Worst-case substituted: `שלום אלכסנדרה דה-מיכאל-וורלמוב, נרשמת לאירוע אירוע המותגים סופרסייל 2026 בתאריך 15.06.2026` = 91 chars.

The placeholder version fits in one SMS segment. The worst-case version takes two segments — and the customer is charged for both. The draft "looked fine" because nobody substituted the variables.

**Worst-case real values to test against** (HE, 2026-05-21 data):
- `%name%` — longest live Prizma name is `אלכסנדרה דה-מיכאל-וורלמוב` (24 chars). Default to 25 chars as worst-case.
- `%event_name%` — longest live name is `אירוע המותגים סופרסייל 2026` (27 chars). Default to 30.
- `%event_date%` — fixed format `DD.MM.YYYY` = 10 chars.
- `%event_time%` — fixed format `HH:MM:SS` = 8 chars.
- `%event_location%` — variable; longest Prizma address ~50 chars.
- `%event_day_of_week%` — Hebrew weekday max 5 chars (`חמישי`).
- `%event_deposit_amount%` — integer, max 4 chars expected (`100`+`₪` won't be `₪`-prefixed in our system; just digits).
- `%event_max_attendees%` — integer, max 3 chars (`50`, `100`).
- `%registration_url%` — `prizma-optic.co.il/r/XXXXXXXX` = 30 chars worst-case after short-link encoding.
- `%unsubscribe_url%` — `prizma-optic.co.il/unsubscribe?token=...` = ~60 chars.

Run the substitution mentally (or write a tiny check), THEN count. Aim for ≤160 chars worst-case for 1 segment; ≤320 for 2 segments.

## 4. Multilingual scaffolding (HE / EN / RU)

All live Prizma templates are `language='he'`. The placeholder contract is language-agnostic — the same `%name%` resolves to the lead's stored name regardless of channel/language. If a future campaign needs EN or RU variants:

- Create separate template rows per language (`<base>_<channel>_<lang>` slugs).
- Substitution count differs by language: Hebrew is generally denser per char than Russian (Cyrillic), English shorter for the same meaning.
- For SMS specifically: RU often blows the 160-char cap because Cyrillic forces 70 chars/segment encoding (UCS-2) instead of 160 (GSM-7). Each non-Latin char counts as ~2.3× a Latin char.

This is forward-looking; no live multi-language work today. Capture if a campaign brief calls for it.

## 5. Brand tone (Prizma) — locked conventions

Inherited from the V2 Email Rebuild + SMS Rebuild (2026-04-28, see [Historical Context in `EVENTS_OPS_DECISIONS_LOG.md`](../../events-operations/EVENTS_OPS_DECISIONS_LOG.md#v2-email-rebuild--started-2026-04-28) for full provenance):

- Campaign customer-facing name: **"אירוע המותגים"** (NEVER "אירוע המכירות", "SuperSale", "קולקציות").
- Tone: warm, family-feel, never pushy. No exclamation marks except genuine excitement. No "MEGA SALE" pressure language.
- Person: gender-neutral plural ("אתם" / "אליכם" / "תקבלו"). Shop is "אנחנו".
- Emoji in **email:** zero (canon §6.4) — Heroicons SVG only.
- Emoji in **SMS:** functional only (✔️ ✅ 📅 ⏰ 📍 🚗 📧 💛). Decorative forbidden (🎉 🥳 🔥 🎁 💎 ⭐ 😍 🥰 ❤️). SMS has no Heroicons substitute.
- Dash style: short hyphen `-` only. Em-dash `—` and en-dash `–` forbidden in customer copy.
- Wordmark: hardcoded text "PRIZMA OPTIC" + "Luxury Eyewear Events" (not image, not tenant variables — locked decision 2026-04-28, revisits when tenant 2 onboards).
- **Preserve blank-line structure** from approved templates (Pattern P8) — each blank line is a soft section break the customer relies on. Don't compress.

## 6. Tone-continuity discipline (skim prior approved drafts)

Before drafting a new template body, skim the 2 most recent approved drafts in `campaigns/<campaign>/MESSAGES_V2/` or the campaign's MESSAGES UPDATE folder. The tone is set by 9 lifecycle templates + 11 SMS variants + 4 manual-move templates (V2 inventory). New drafts that diverge feel "off" to Daniel even if technically correct.

Pattern catalogue (P1–P12, full text in `campaigns/supersale/MESSAGES_V2/COPY_DECISIONS_LOG.md` if present):
- **P8** — Preserve blank-line structure in SMS.
- **P9** — Don't use `%name%` in system-wide notifications (only personal/conversational genres).
- **P10** — Hardcoded "50" anywhere is a SaaS bug; use `%event_max_attendees%` (no "כ" prefix — cap is fixed per event).
- **P11** — Don't lengthen short status messages (T6 lesson: preserve legacy brevity).
- **P12** — Loud-failure pattern for new SaaS-config variables (`%payment_url_50%` → JSONB key check at send time).

## 7. Validation gates (already wired in EF)

| Gate | When | What happens |
|---|---|---|
| `validateTemplateOutput(composedBody)` | Pre-enqueue, in `automation-engine prepareRulePlan` | Failure → `crm_message_log status='rejected'` + `crm_automation_rules.last_error` populated. Queue row NEVER inserted. |
| `validateTemplateOutput` again | At dispatch, in `send-message` | Defense-in-depth. Failure → `crm_message_log status='failed'` with error class. |
| Phone allowlist | Layer 2, `dispatch-queue` | Defense-in-depth against `tenants.test_mode_sms_allowlist`. Only whitelist phones for tests on demo. |

If a template is `rejected` at the pre-enqueue gate, the most common cause is an unsubstituted placeholder (e.g. `%new_var%` not in the resolver). The fix is NEVER to bypass the gate — it's to use placeholders the resolver knows about, or open an IR35 SPEC.

## 8. Anti-patterns — do not

- Do NOT invent placeholders. Re-read §1.
- Do NOT change `template_slug` / `channel` / `language` on existing templates (structural — Architect SPEC).
- Do NOT modify rules on Prizma directly; demo-first via `scripts/promote-config-to-prizma.mjs`.
- Do NOT include raw URLs in SMS bodies (use `%registration_url%` / `%unsubscribe_url%`).
- Do NOT hardcode prices / addresses / phones / brand name (Iron Rule 9).
- Do NOT skip the worst-case substitution char-count check — §3.
- Do NOT use em-dash `—` or en-dash `–` in customer copy — short hyphen `-` only.
- Do NOT use decorative emoji in SMS (only functional set listed in §5).
- Do NOT use any emoji in email — Heroicons SVG only.

---

*PLAYBOOK_MESSAGING v1, 2026-05-22. Synthesized from `opticup-campaign-copywriter` SKILL.md disciplines + V2 rebuild patterns + Prizma brand canon. Refresh trigger: any new placeholder added to `M4_INFRASTRUCTURE_CONTRACT.md` §1, any new Daniel-editorial pattern locked, any channel-rule change.*
