טען את `opticup-strategic` (Foreman). אתה כותב SPEC חדש בלבד, לא מבצע אותו.

**הקשר:** דניאל אישר את ה-Full Auto pipeline 2026-05-11. ה-pain point המרכזי: היום כל SPEC דורש 5 צ'אטים נפרדים של Claude Code עם 5 activation prompts. הוא רוצה pipeline אחד שרץ end-to-end בצ'אט יחיד, עם skill chaining בין השלבים.

**ה-Brief נמצא ב:**
`modules/Module 1.5 - Shared Components/architecture-brief/FULL_AUTO_BRIEF.md`

קרא אותו במלואו, ואז כתוב SPEC יחיד ב:
`modules/Module 1.5 - Shared Components/docs/specs/M1_5_FULL_AUTO_PIPELINE/SPEC.md`

ה-SPEC חייב לכלול:

1. **§1 Goal** — pipeline אוטומטי בצ'אט אחד שמחליף את 5 הצ'אטים הנוכחיים.

2. **§2 Background** — הסבר את ה-pain point של 5 הצ'אטים + מצב נוכחי של 5 הסקילים + AGENT_CHAIN_PROTOCOL.md.

3. **§3 Success Criteria מדידים (לפחות 18):**
   - 5 קבצי SKILL.md מעודכנים עם §Pipeline Hand-off
   - Iron Rule 32 בתוך CLAUDE.md §6
   - `scripts/checks/destructive-ops-declared.mjs` קיים ועובד
   - `scripts/verify.mjs` כולל את הצ'ק החדש
   - תיקיית `modules/Module N/escalations/` קיימת (לפחות בכמה מודולים)
   - Backups discipline מעודכן ב-CLAUDE.md §9
   - SKILL.md של opticup-executor כולל backup logic מפורש
   - Pipeline mode detection ב-opticup-strategic
   - Test SPEC ראשון (doc-only) רץ end-to-end בצ'אט אחד
   - Test SPEC שני (code change קטן) רץ end-to-end
   - אין `--no-verify` בקוד החדש
   - אין צורך לפתוח צ'אט שני אחרי שה-pipeline התחיל
   - Status lines בעברית מופיעות בין שלבים
   - Escalation template נכון בכל קובץ escalation
   - Iron Rule 31 + Iron Rule 32 שניהם enforced ב-pre-commit
   - `npm run verify:integrity` exit 0
   - `npm run smoke` 7/7 PASS
   - Foreman SKILL כולל §Pipeline Closure (last phase) שמסכם בעברית לדניאל

4. **§4 Destructive Operations** — חובה. הצהר כל פעולה מחיקה/refactor כבד.

5. **§5 Autonomy Envelope** — full-auto mode. עצירה רק על escalation אמיתי.

6. **§6 Stop-Triggers (מצומצמים):**
   - Skill loading failure (אחרי retry אחד)
   - Iron Rule 31 או 32 violation
   - שאלה אסטרטגית שלא נסגרה ב-Brief
   - Test SPEC נכשל

7. **§7 Out of Scope:**
   - Cross-repo parallelism (נושא של Repo Split)
   - Cowork↔Claude Code automation (Daniel = הגשר)
   - Auto-rollback בכישלון בדיקה
   - Migration של SPECs ישנים

8. **§8 Expected Final State** — ראה Brief §4 deliverables.

9. **§9 Commit Plan — 3 phases:**
   - Commits 1-3: Phase 1 foundation (Iron Rule 32, backups, escalation infra)
   - Commits 4-7: Phase 2 chaining (5 SKILL.md updates + status lines)
   - Commits 8-10: Phase 3 verification (2 test SPECs + adjustments)
   - Commit 11: docs + EXECUTION_REPORT + FINDINGS + retrospective

10. **§10 Anti-Patterns:**
    - אסור פעילות מקבילית של 2+ סקילים באותו צ'אט
    - אסור Architect כשלב ב-pipeline
    - אסור Architect-self-load (רק דניאל יכול לטעון את Architect ב-Cowork)
    - אסור `--no-verify` בכל מקרה
    - אסור הצהרת "no destructive ops" אם ה-SPEC כן מכיל
    - אסור לדלג על FOREMAN_REVIEW בסוף

11. **§11 Reference Files** — ה-Brief + 5 SKILL.md + CLAUDE.md + AGENT_CHAIN_PROTOCOL.md.

12. **§12 Pre-Merge Checklist** — verification phase מסומן הכי חמור: 2 test SPECs חייבים לרוץ ירוק לפני שזה נסגר.

**הערה חשובה לגבי כתיבת ה-SPEC עצמו:** אתה כותב SPEC לפלטפורמה שתשנה את אופן העבודה שלך. זה SPEC רגיש. בנה את ה-success criteria מאוד דווקני. מה שלא מדיד = לא נכנס.

**הערה לגבי ה-test SPECs (Phase 3):**
- Test SPEC #1: שינוי docs-only — לדוגמה, עדכון של README של scripts/. ריצה אמורה לעבור 5 שלבים בצ'אט אחד.
- Test SPEC #2: שינוי קוד קטן — לדוגמה, הוספת comment ל-shared/js/. ריצה אמורה לעבור 5 שלבים בצ'אט אחד, כולל smoke test.

**מה אתה לא עושה:**
- אל תפעיל את ה-Executor
- אל תפצל ל-3 SPECs (זה SPEC יחיד עם 3 phases פנימיים)
- אל תכתוב את הקוד של `destructive-ops-declared.mjs` כאן (זה ב-Executor)
- אל תוסיף activation prompts לדניאל (הם נעלמים אחרי ה-SPEC הזה)

**מה אתה כן עושה:**
- כותב את ה-SPEC כך שיהיה מובן ל-Executor שעובד תחת Continuous-Run Mandate
- Commit + push ל-develop
- חוזר לדניאל ב-Cowork עם הודעה אחת בעברית: "SPEC Full Auto מוכן. דניאל מפעיל Executor בצ'אט אחד וזה הצ'אט האחרון שיצטרך לפתוח."

התחל.
