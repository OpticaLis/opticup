# Optic Up

> **פלטפורמת SaaS multi-tenant לרשתות וחנויות אופטיקה.**
> כל חנות מקבלת ERP פנימי + אתר ממותג (storefront), שניהם קוראים מאותו Supabase.

---

## תיאור

**Optic Up** הוא פרויקט דו-repo שמספק לחנויות אופטיקה ישראליות מערכת ניהול פנימית (ERP) ואתר ציבורי ממותג (Storefront). הכל multi-tenant מהיום הראשון — `tenant_id + RLS` על כל טבלה, ללא יוצאים מן הכלל.

**Founding tenant:** אופטיקה פריזמה (production). **Test tenant:** אופטיקה דמו (QA).
**האפליקציה לא מיועדת לפריזמה בלבד** — כל החלטת בנייה נבחנת במבחן "האם חנות שנייה שאנחנו עדיין לא מכירים תוכל להשתמש בזה ללא שינוי קוד?"

---

## שני repos, Supabase אחד

| Repo | תפקיד | Stack | Deploy |
|---|---|---|---|
| **`opticalis/opticup`** (כאן) | ERP פנימי לעובדי חנות + Platform Admin + Storefront Studio | Vanilla JS · HTML per module · CSS Variables · **ללא build step** | GitHub Pages → `https://app.opticalis.co.il/` |
| **`opticalis/opticup-storefront`** (repo נפרד) | אתר ציבורי ללקוח הקצה | Astro 6 · TypeScript · Tailwind CSS 4 | Vercel |

**שניהם קוראים מאותו Supabase.** ה-Storefront קורא אך ורק דרך Views + RPC (ראה Iron Rule 13 ב-`CLAUDE.md` ו-Rule 24 ב-`opticup-storefront/CLAUDE.md`). **תיקיית הקוד של ה-Storefront לא חיה ב-repo הזה** — רק ה-Studio (ניהול תוכן) ב-`modules/storefront/`.

**Supabase:** `https://tsxrrxzmdxaenlvocyit.supabase.co`

---

## סטטוס מודולים — אפריל 2026

| # | מודול | סטטוס |
|---|---|---|
| 1 | Inventory Management — מלאי, ברקודים, PO, קבלות, ספירות, משלוחים | ✅ Complete |
| 1.5 | Shared Components — shared helpers, RLS, roles/permissions, clone-tenant | ✅ Complete |
| 2 | Platform Admin — plans, limits, provisioning, tenant management | ✅ Complete |
| 3 | Storefront — הקוד ב-`opticup-storefront`, Studio admin ב-repo הזה | 🟡 In Phase B remediation (חסום על Module 3.1) |
| **3.1** | **Project Reconstruction — תיעוד, MASTER_ROADMAP, artifacts** | 🟡 **Active** (2026-04-11) |
| 4–22 | מודולים עתידיים (CRM, הזמנות, תשלומים, מעבדה, …) | ⬜ לא התחילו |

לפירוט מלא של הפאזות והתלויות ראה `MASTER_ROADMAP.md` (חלק 6 → חלק 11).

---

## Iron Rules — חוקת הפרויקט

- **חוקים 1–23** — ב-`CLAUDE.md` של repo זה: Iron Rules (13), SaaS Rules (7), Hygiene Rules (3). מחייבים את כל עבודת ה-ERP + Studio + Platform Admin.
- **חוקים 24–30** — ב-`opticup-storefront/CLAUDE.md`: Storefront-scoped (Views-only, image proxy, RTL-first, mobile-first, View Modification Protocol, Safety Net).

חוקי ברזל קריטיים: `tenant_id + RLS` על כל טבלה, soft-delete בלבד, PIN על כל שינוי כמות דרך RPC אטומי, ברקודים בפורמט `BBDDDDD`, ללא secrets בקוד.

---

## איך מתחילים

1. **עובדים על ה-ERP?** קרא את `CLAUDE.md` ו-`modules/Module X - [Name]/docs/SESSION_CONTEXT.md` של המודול שעליו אתה עובד.
2. **פותחים צ'אט אסטרטגי ראשי?** הדבק את `STRATEGIC_CHAT_ONBOARDING.md` ואת `MASTER_ROADMAP.md` כהודעות ראשונות.
3. **פותחים צ'אט אסטרטגי של מודול?** השתמש ב-`docs/Templates/UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md`.
4. **רוצים להבין את הפרויקט "מלמעלה"?** `MASTER_ROADMAP.md` הוא "מוח הפרויקט" — 22 מודולים, סדר בנייה, תלויות, החלטות, DB map.
5. **עובדים על ה-Storefront?** עבור ל-repo `opticalis/opticup-storefront` ולחוקה שלו (`CLAUDE.md` משלו, חוקים 24–30).

---

## קישורים

- **אפליקציה (ERP):** https://app.opticalis.co.il/
- **Supabase:** https://tsxrrxzmdxaenlvocyit.supabase.co
- **Repo ERP:** https://github.com/OpticaLis/opticup
- **Repo Storefront:** https://github.com/OpticaLis/opticup-storefront

---

*עודכן לאחרונה: 2026-04-11 (Module 3.1 Phase 3A).*
