# M12 — Communications — Handoff לסשן הבא

**תאריך:** 2026-05-09
**מצב:** טרם התחיל. שני מתוך 4 שנותרו לפני LIVE (אחרי M11 שנסגר היום).

---

## ההקשר אסטרטגי

נסגרו עד עכשיו (Architecture Briefs):
- ✅ M5 (Customers) v3
- ✅ M6 (Prescriptions) v2
- ✅ M7 (Orders) v1
- ✅ M8 (Payments) v1
- ✅ M11 (Reports) v1 — **נסגר 2026-05-09**
- ✅ M14 (Appointments) v1
- ✅ M15 (Queue) v1

נותרו לפני LIVE:
- **M12 — Communications** ← המודול הבא
- M13 — Loyalty Club
- M9 — Lab/KDS (תלוי באודיט-שלישי)

ההמלצה לסדר: M12 → M13 → M9.

הסיבה ל-M12 ראשון:
- WhatsApp הוא **קריטי ביום-1** (Master Plan §6 risk #1: "WhatsApp לא פעיל ביום-1 → רגרסיה חמורה").
- M14 (Appointments) ננעל עם דרישת-תזכורות שיוצאות דרך M12 (Pattern 10: M14 בעלים-של-fact, M12 בעלים-של-rule).
- M5/M6/M7/M8 כל אחד דורש מ-M12 שירות-שליחת-תבניות (welcome, follow-up, recall, payment-confirmation).
- M11 (Reports) דורש מ-M12 שירות-שליחה-של-דוח (deferred ל-post-LIVE, אבל החוזה צריך להיות מתועד).

---

## הקשר שכבר ידוע על M12 (מ-Master Plan §4)

מ-`MASTER_LIVE_PLAN.md` — דרישות שננעלו ל-LIVE:

- **WhatsApp Business API פעיל ביום-1** — קריטי, אסור פספס.
- **17 תבניות מ-`doc_title`** ב-OpticPlus → חילוץ + הזרמה ל-`crm_message_templates`.
- משתנים בתבניות (placeholders): שם לקוח, מס' הזמנה, תאריך, תאריך-מסירה.
- SMS (כבר ב-M4 — להרחיב לתבניות).
- Email (queue ב-`tb_email` → Edge Function).
- 3 cadences: bdika (recall), insurance window (`cleandate`), invoice follow-up (`insdate`).
- preview+confirm gate (Daniel directive — auto-memory).

---

## חוזים שננעלו עם M12 ב-Briefs קודמים

### מ-M14 (Appointments) Brief:
- M14 בעלים-של-fact ("appointment exists, at time T, for resource R"). M12 בעלים-של-rule (מתי לשלוח, איזה ערוץ, איזו תבנית).
- Resource-level reminders: כל אופטומטריסט מקבל הודעה לעצמו כשנקבע אצלו תור.
- Cancellation auto-message עם **suppress-checkbox** (default-on).
- Reschedule = DELETE + CREATE → 2 events ל-M12.
- Manage-appointment-link בהודעות (token-based, single-use).

### מ-M15 (Queue) Brief:
- Queue ביום-1 = internal-only. Public-display (TV, customer SMS updates, QR-link) — **deferred** ל-M12 לאחר LIVE.

### מ-M7 (Orders) Brief §4:
- "Thanks" message: state=active AND payment≥1.
- Manage-order link בהודעות (לא רק "תודה").
- Outside-Repair = redacted message (privacy).
- Form templates with placeholders.

### מ-M8 (Payments) Brief:
- Deferred-check banner alert ביום-clearing → לא הודעה ללקוח, אלא ל-staff.
- Payment confirmation auto-message לאחר checkout (אם state=active+payment≥1).

### מ-M6 (Prescriptions) Brief:
- Recall engine = M6 owns. ה-trigger יוצא ל-M12 שאחראי על השליחה.
- Multi-axis recall (Launch Decision #4 Apr 27).

### מ-M5 (Customers) Brief:
- Active marketing consent טופס (Launch Decision #3 Apr 27).
- Birthday auto-message — deferred (כתוב במפורש שם).

### מ-M11 (Reports) Brief — **נסגר היום**:
- תזמון-דוח באימייל (אימייל-יומי, חודשי) = **deferred** ל-post-LIVE. כשיגיע — דורש שירות-שליחה מ-M12.

### מ-M4 (CRM) — קיים:
- 3 SMS templates כבר עובדים בפרודקשן. Migration to M12 generic-engine.

---

## מחקר נדרש (קצר — עם כמה אזורים תרגישים)

M12 דורש research-first (P23) כי:
- **WhatsApp Business API** = vendor-specific. Meta-Cloud-API vs 360dialog vs Twilio vs Vonage. הבדלים עצומים (cost, message-types, template-approval).
- **תקנות-מסר-יוצא בארץ** — חוק התקשורת (בזק ושידורים), הסכמה-מודעת, opt-out, רישום-בפנקס-המסרים-המסחריים.
- **תבניות-WhatsApp דורשות אישור-Meta** — תהליך 24-48h, יש קטגוריות (utility/marketing/auth) עם מגבלות שונות.
- **SMS providers בארץ** — Inforu, SmartSMS, Vonage, AWS-SNS. הבדלי-מחיר, הבדלי-תכונות.

**מומלץ subagent עם 3-4 אזורי-מחקר:**
1. **WhatsApp Business API** — Meta vs 360dialog vs Twilio. Costs, templates, multi-tenant tenancy, session-vs-template, מהירות-onboarding.
2. **תקנות בארץ** — חוק התקשורת, מי-חייב-להיות-רשום, opt-out mechanism, fines.
3. **SMS providers בארץ** — דירוג + מחירים + מי-קל-להשתלב-מולם.
4. **3rd-party email-as-a-service** — SendGrid, AWS SES, Postmark, Resend (כבר היה דיון על זה בעבר). מומלץ pile-deferral והכרעה רק אחרי שיש דרישה.

זמן משוער: 30-45 דקות מחקר. Daniel באופן מפורש ביקש research-first ל-M8 — אותו דפוס יעבוד ל-M12.

---

## הוראת-Daniel לתחילת הסשן הבא

**הצעד הראשון:** Pattern P23 — research-first. שלח subagent עם 3-4 אזורי-מחקר (לעיל), חכה ל-digest, ואז פתח דיון אסטרטגי.

**אחר-כך:** flow רגיל לפי הפרוטוקול שעבד ב-M5/M6/M7/M8/M11/M14/M15:
1. גוש 1 — ישויות (איזה יחידות-תקשורת, אילו תבניות, מה ה-engine).
2. גוש 2 — חוזים מול מודולים אחרים (מי שולח אילו events ל-M12).
3. גוש 3 — דפוסי-עיצוב (template-engine, placeholders, opt-out, audit) + סיכונים.
4. סקיצות (לפחות 3: ניהול-תבניות, היסטוריית-שליחות, ערוץ-קונפיגורציה).
5. כתיבת `M12_COMMUNICATIONS_BRIEF.md`.
6. עדכון Master Plan + DECISIONS_LOG.
7. כתיבת `M13_HANDOFF.md`.

---

## איך לפתוח את הסשן הבא (TL;DR)

הדבק את זה בתיבה של Cowork:

```
אתה ה-Main Strategic של פרוייקט Optic Up. ממשיכים מ-M12_HANDOFF.md.
```

זה מספיק. הסקיל ייטען אוטומטית, יקרא את MASTER_LIVE_PLAN + DECISIONS_LOG + MEMORY + CLAUDE.md + ה-handoff הזה.

---

## קישורים מרכזיים

- **Master Plan:** `__LAUNCH_PLAN_DRAFT__/MASTER_LIVE_PLAN.md` (§4 — דרישות M12)
- **Briefs קודמים:** `__LAUNCH_PLAN_DRAFT__/architecture-briefs/M5 - Customers/`, `M6 - Prescriptions/`, `M7 - Orders/`, `M8 - Payments/`, `M11 - Reports/`, `M14 - Appointments/`, `M15 - Queue/`
- **DECISIONS_LOG:** `.claude/skills/opticup-main-strategic/references/DECISIONS_LOG.md`
- **SKILL:** `.claude/skills/opticup-main-strategic/SKILL.md`

---

## מה לא בסקופ של M12

- **Marketing-campaigns engine** (Mailchimp-like UI) — שייך ל-Marketing Hub עתידי, לא ב-M12 day-1.
- **AI-תוכן-אוטומטי** (AI שכותב הודעות) — deferred. ביום-1 רק שליחה.
- **Inbox-מאוחד** (לקרוא תגובות לקוחות במקום אחד) — deferred ל-CRM v2.
- **A/B testing על תבניות** — deferred.
- **SMS-broadcast 1000+ recipients** — POST-1 backlog item, לא ב-M12 day-1.

---

## הערה לעצמי לסשן הבא

**P24 (NEW lesson from M11):** "Strategic-feeling" questions אינן אסטרטגיות. המבחן: האם זו החלטה שדורשת ערך-עסקי-של-Daniel או החלטה-טכנית שיש לה תשובה-ידועה. ב-M12 תהיה הרבה משיכה לשאול ביצועים/concurrency/queue-design — זה שלי, לא של Daniel.

**Modularity-passover (NEW process step):** לפני כתיבת Brief, לעבור passover על כל ההחלטות הנעולות ולחפש נקודות-חולשה ל-future-proofing. ב-M11 מצאתי 5. ב-M12 — כנראה דומה (template engine extensibility, channel pluggability, event-source neutrality).

---

*נוצר 2026-05-09 בסיום סשן M11. הסשן הבא מתחיל עם research-first protocol → גוש 1.*
