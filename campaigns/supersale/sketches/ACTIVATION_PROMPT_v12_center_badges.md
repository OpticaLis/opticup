You are in opticalis/opticup-storefront on branch develop. ONE small CSS fix to the existing
/supersale-launch/ page (src/pages/supersale-launch/index.astro + src/components/SupersaleLaunchCard.astro),
latest commit on develop.

PRE-FLIGHT
1. git branch -> develop. git status -> pre-existing WIP untouched; selective add by filename.

FIX
2. The card badges (the gold "קופון אישי בלבד" / "1+1 על מותגים נבחרים" / "הטבות אירוע בלעדיות" and the
   dark "לנרשמים מראש" pills on every card) — their TEXT is not centered (most visible on mobile).
   Make the text inside ALL badge pills centered (text-align:center; and if they use flex,
   justify-content:center; align-items:center). Applies to badges on all card types (fashion sun,
   fashion reading, luxury sun, luxury reading). Keep everything else identical — same colors, size,
   position, the two-badge left/right split on the image. Only the text alignment inside each pill.

UNCHANGED: layout, prices, cards, tabs, lightbox, FAQ, CTA, hero, everything else.

RULES: 25/26/27/28/32 (AA preserved). File <=350. Develop only. PREVIEW only.

VERIFY + DEPLOY
3. node scripts/full-test.mjs --no-build (must pass). Build.
4. Confirm badge text is centered (check both desktop and the mobile/narrow breakpoint).
5. Push develop, commit by explicit filenames. Report commit SHA. Clean git status.

STOP-ON-DEVIATION: build break, safety-net fail, unavoidable rule violation, anything needing main/prod.
