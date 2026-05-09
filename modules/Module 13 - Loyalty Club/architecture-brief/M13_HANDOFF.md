# M13 — Loyalty Club — Handoff לסשן הבא

**תאריך:** 2026-05-09
**מצב:** טרם התחיל. שלישי מתוך 3 שנותרו לפני LIVE (אחרי M11 ו-M12 שנסגרו היום).

---

## ההקשר אסטרטגי

נסגרו עד עכשיו (Architecture Briefs):
- ✅ M5 (Customers) v3
- ✅ M6 (Prescriptions) v2
- ✅ M7 (Orders) v1
- ✅ M8 (Payments) v1
- ✅ M11 (Reports) v1 — נסגר 2026-05-09
- ✅ **M12 (Communications) v1 — נסגר 2026-05-09 (היום)**
- ✅ M14 (Appointments) v1
- ✅ M15 (Queue) v1

נותרו לפני LIVE:
- **M13 — Loyalty Club** ← המודול הבא
- M9 — Lab/KDS (תלוי באודיט-שלישי)

ההמלצה לסדר: **M13 → M9**.

הסיבה ל-M13 ראשון:
- M13 תלוי בכל הליבה (M5/M7/M8) — וכולם כבר נסגרו ב-Briefs.
- M9 תלוי באודיט-שלישי שעדיין לא הושלם בעומק.
- M13 הוא מודול מודולרי-נקי (שכבה מעל הליבה) — קל יותר לבנות אחרי שכל החוזים מסביב לו ננעלו.

---

## הקשר שכבר ידוע על M13 (מ-Master Plan §4 + Launch Decisions Apr 28)

מ-`MASTER_LIVE_PLAN.md` §4 — דרישות שננעלו ל-LIVE:

- **חברות שנתית** (אופציונלי per-tenant) — Prizma אולי לא תגבה דמי-חבר; tenants אחרים אולי כן.
- **Tiers קונפיגורבילי** (Silver/Gold/Diamond — שמות + amounts per tenant). Pattern P19 (config table not enum).
- **צבירה rule per-tier** (e.g. "5% from every purchase as store credit").
- **Family pooling** (בני-משפחה צוברים יחד — נושא חדש שלא ב-OpticPlus, החלטה Apr 28).
- **Tier promotion auto-evaluated annually** (cron job).
- **Credit balance + redemption ב-M7** (M7 כבר תוכנן עם payment_method=loyalty_credit).
- **Coupons inside M7** (Launch Decision Apr 28 — קופונים הם חלק ממודול הזמנות).

---

## חוזים שננעלו עם M13 ב-Briefs קודמים

### מ-M5 (Customers) Brief:
- שדות `moadon`, `qhaver`, `kupon`, יתרות זיכוי קיימים בלקוח. M13 מנהל אותם.
- segments per tenant (Q25) — חברי-מועדון יכולים להיות segment.
- household_id (אם נצטרך family pooling) — נוסף ב-M5 או ב-M13?

### מ-M7 (Orders) Brief:
- payment_method=loyalty_credit נתמך ב-checkout — M7 קורא ל-M13 לבדוק יתרה + לחייב.
- Coupons inside M7 — M13 יוצר/מנפיק קופון, M7 שורף.
- "Thanks" message לקנייה ב-credit-only (אם payment ≥ ₪1) — M12 חוזה כבר נעול.

### מ-M8 (Payments) Brief:
- loyalty_credit הוא payment_method מסוג "internal-non-cash" — לא עובר POS.
- redemption events נרשמים ב-M8 audit trail כעסקאות-פנימיות.

### מ-M11 (Reports) Brief:
- M11 דורש מ-M13 view: `v_loyalty_for_reports` — חברים פעילים, יתרות, redemption rate, top spenders.

### מ-M12 (Communications) Brief — נסגר היום:
- M13 קורא ל-M12 send_message_by_template עבור: tier promotion, credit balance notification, club enrollment confirmation.
- קופונים יוצאים בהודעות = M13 יוצר את הקופון + השדה הקצר, M12 שולח את ההודעה עם variable `%coupon_code%`.

### מ-M4 (CRM) — קיים:
- "אישור-תקנון" של פריזמה כולל הצטרפות-מועדון אוטומטית — נושא לאישור / שינוי בתקופת M13.
- מועדון-קמפיין-סופרסייל = entity קיים שצריך למפות ל-M13.

---

## מחקר נדרש (קצר)

M13 דורש research-first (P23) באזורים מוגבלים:

1. **מועדוני-לקוחות בעולם האופטיקה** — מה תכניות-המועדון של רשתות אופטיקה גדולות (Specsavers, LensCrafters, אופטיקנה ישראל). מה הרכיבים הסטנדרטיים, מה עובד, מה לא.
2. **Family pooling — ארכיטקטורה ומשפט** — האם יש מגבלה משפטית בארץ על "צבירה משותפת"? איך פותרים את זה טכנית (household entity? linked customers?).
3. **Tier promotion algorithms** — annual / lifetime / sliding-window. מה היתרונות-חסרונות. מה רשתות אופטיקה עושות.
4. **Coupon mechanics** — single-use vs multi-use, expiry, transferability, fraud-prevention.

זמן משוער: 30-40 דקות מחקר. פחות מ-M12 כי אין vendor-integrations חיצוניות.

**פחות קריטי מ-M12** — M13 לא דורש WhatsApp / Meta / vendor-API research. רוב ההחלטות הן עיצוב-עסקי, לא בחירת-vendor.

---

## הוראת-Daniel לתחילת הסשן הבא

**הצעד הראשון:** Pattern P23 — research-first. שלח subagent עם 4 אזורי-מחקר (לעיל), חכה ל-digest, ואז פתח דיון אסטרטגי.

**אחר-כך:** flow רגיל לפי הפרוטוקול שעבד ב-M5/M6/M7/M8/M11/M12/M14/M15:
1. גוש 1 — ישויות (חברות, tier, נקודות, קופון, redemption, family).
2. גוש 2 — חוזים מול מודולים אחרים (M5 yields customer, M7 charges credit, M8 records, M11 reports, M12 sends).
3. גוש 3 — דפוסי-עיצוב (tier-promotion-rules engine, coupon issuance, family-pooling, expiration policy) + סיכונים.
4. סקיצות (לפחות 3: כרטיס-מועדון של לקוח, מסך-תפעול של מנהל-מועדון, מסך-redemption בקופה).
5. כתיבת `M13_LOYALTY_BRIEF.md`.
6. עדכון Master Plan + DECISIONS_LOG.
7. כתיבת `M9_HANDOFF.md` (תלוי באודיט-שלישי — ייתכן ויידחה).

---

## איך לפתוח את הסשן הבא (TL;DR)

הדבק את זה בתיבה של Cowork:

```
אתה ה-Main Strategic של פרוייקט Optic Up. ממשיכים מ-M13_HANDOFF.md.
```

זה מספיק. הסקיל ייטען אוטומטית, יקרא את MASTER_LIVE_PLAN + DECISIONS_LOG (כולל הלקחים החדשים מ-M12) + MEMORY + CLAUDE.md + ה-handoff הזה.

---

## קישורים מרכזיים

- **Master Plan:** `_archive/launch-plan-versions/MASTER_LIVE_PLAN_v1.md` (§4 — דרישות M13)
- **Briefs קודמים:** כל אחד ב-`modules/Module N - Name/architecture-brief/`
- **DECISIONS_LOG:** `.claude/skills/opticup-main-strategic/references/DECISIONS_LOG.md` (כולל 13 החלטות חדשות מ-2026-05-09)
- **SKILL:** `.claude/skills/opticup-main-strategic/SKILL.md`

---

## מה לא בסקופ של M13

- **Marketing-campaigns engine** — שייך ל-M4 / M12 / future Marketing Hub.
- **AI-recommendation לחברי-מועדון** ("הזמן עכשיו, חבר!") — deferred.
- **Multi-tenant cross-tenant pooling** (חבר ברשת-A מקבל הטבה ברשת-B) — לא בסקופ, אולי בעתיד עבור multi-brand-tenant.
- **Gamification (badges, leaderboards)** — deferred.
- **Referral program** ("הבא חבר") — deferred (יכול להיכנס בעתיד כסקופ נפרד).

---

## הערה לעצמי לסשן הבא

**Lessons מ-M12 (חדשים — לא נכנסו עוד ל-SKILL.md):**

1. **לא לזרום** — Daniel תיקן אותי 4 פעמים ב-M12. הכי חשוב: כשהוא שואל שאלת-הבהרה, **לעצור ולחשוב על המטרה** לפני להציע פתרון.
2. **לבדוק vendors קיימים לפני להמליץ החלפה** — קרה פעמיים ב-M12 (SMS, Email). ל-M13: לפני שאני ממליץ "rule engine X" / "coupon library Y" — לבדוק מה כבר קיים בפריזמה.
3. **Hybrid models > pure-flexibility OR pure-control** — ב-M13 יהיה קריטי. tier-promotion, family-pooling — לכל אחד יש "ברירת-מחדל פלטפורמה + override של tenant".
4. **Single sentence from Daniel can reshape scope** — M12 קיבל את ה-Inbox מ-משפט אחד. ל-M13 בטוח יהיו "what about" שאלות — לא לנעול scope לפני שהן עולות.
5. **Sketch the feature, not the host screen** — אם M13 נכנס לכרטיס-לקוח, לסקיצה רק את ה-tab החדש.
6. **Lock infrastructure, defer UX** — אם יש צד משפטי (privacy / consent for family pooling) — לנעול את ה-infra, לדחות את ה-UX.

**Modularity-passover (NEW process step מ-M11+M12):** לפני כתיבת Brief, לעבור passover על כל ההחלטות הנעולות ולחפש נקודות-חולשה ל-future-proofing. ב-M11 מצאתי 5. ב-M12 מצאתי 3 (tier upgrade slot, multi-tenant config, AI slot). ב-M13 — כנראה דומה.

---

*נוצר 2026-05-09 בסיום סשן M12. הסשן הבא מתחיל עם research-first protocol → גוש 1.*
