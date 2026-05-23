# BRIEF — SuperSale launch v6: fix remote/lab answers + takanon link + "taste" up top

**Author:** Events-Operations (Cowork) · **For:** Claude Code in opticup-storefront · 2026-05-22
**Companion:** ACTIVATION_PROMPT_launch_landing_v6_remote_fix.md
**Edits:** existing /supersale-launch/ (index.astro), latest commit 1dcf40d on develop.

---

## Three fixes

**(1) FACTUAL FIX — the two "remote / lab" FAQ answers were wrong.**
At the brand EVENTS we do NOT do in-store framing/cutting on the spot. Correct framing: at the event
you can have an EYE EXAM done, and the finished glasses are delivered to your HOME via our delivery
service (typically ~2–3 days). The customer does NOT walk out of the event with the glasses.
Rewrite BOTH answers to this truth:

Q: "אני צריך משקפי ראייה ומגיע מרחוק, האם אצטרך לחזור אליכם פעם נוספת?"
A (new): "לא צריך. אם דרושים לכם משקפי ראייה - אפשר לעשות אצלנו בדיקת ראייה כבר באירוע, ואת המשקפיים
המוכנים נשלח לכם עד הבית דרך שירות המשלוחים שלנו, בדרך כלל תוך 2-3 ימים. כך שגם אם הגעתם מרחוק, אתם
לא צריכים לחזור שוב."

Q: "אני גר רחוק מאשקלון - איך זה עובד מבחינת הגעה ומשלוח?"
A (new): "פשוט מאוד. מגיעים לאירוע בסניף הרצל 32 אשקלון, בוחרים, ואם צריך - עושים בדיקת ראייה במקום.
את המשקפיים המוכנים נשלח אליכם עד הבית דרך שירות המשלוחים שלנו (בדרך כלל תוך 2-3 ימים). נציג יתאם את
הפרטים והעלות לפי היעד."

**(2) LINK FIX — inside the "מה מיוחד באירועי המותגים שלכם?" answer**, the phrase "בכפוף לתקנון" must
be a LINK to /supersale-takanon/ (currently plain text). (The hero pledge's "בכפוף לתקנון" already
links; make this one match.)

**(3) "TASTE" cue near the top — subtle, do NOT overload.**
The "this is only a taste / much more at the event" cue currently appears only at the bottom of each
tab. Add a SUBTLE version near the top WITHOUT adding bulk — the hero already has a subtitle + chip.
Preferred: weave it into the existing hero area as a small, muted micro-line (e.g. tiny text near the
date chip) or a short clause — your call on the cleanest placement. Keep it light; don't add a whole
new block or a second paragraph. Suggested micro-copy: "הצצה מהמבחר - באירוע יחכה לכם הרבה יותר".

## Unchanged
Everything else (tabs, cards 56/56/32/32, sub-toggles, lightbox, gold-highlight FAQ, pricing, CTA).

## Constraints
Iron Rules 25/26/27/28/32. File ≤350 (currently 330). Develop only, preview only. full-test must pass.
Pre-existing WIP untouched.

## Deliverables + verify
- Both remote-answers rewritten (no "15–90 min in-store" claim; eye-exam-at-event + home-delivery 2–3 days).
- "בכפוף לתקנון" in the brand-event answer links to /supersale-takanon/.
- subtle taste-cue near top, not bulky.
- full-test passes; build clean; push develop; report commit SHA (I fetch preview). Clean git status.

## Stop-on-deviation
Build break, safety-net fail, unavoidable rule violation, anything needing main/prod.
