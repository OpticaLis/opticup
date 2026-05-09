# פרומפט הפעלה — עדכון opticup-strategic SKILL.md

> העתק את כל מה שמתחת לקו ל-Claude Code על המכונה שלך.

---

טען את הסקיל `opticup-strategic` והחל את 5 השיפורים הבאים על `.claude/skills/opticup-strategic/SKILL.md`. כל שינוי הוא find/replace מדויק. בסוף — commit אחד.

---

## שינוי 1 — Step 1.5e (הוספת hook-counter discrepancy)

**מקור:** FOREMAN_REVIEW של M1_DEBT_VAT_FALLBACK_GUARD (2026-04-26), Proposal 1.

**מצא את הבלוק הזה (סוף Step 1.5e):**

```
Rationale: this lesson was flagged in 3 consecutive FOREMAN_REVIEWs
(M4_ATTENDEE_PAYMENT_UI, M4_EVENT_DAY_PARITY_FIX, M4_ATTENDEE_PAYMENT_AUTOMATION
on 2026-04-25) before being codified here. Per §"Self-Improvement Mandate",
3 consecutive same-finding triggers a mandatory skill update.
```

**הוסף אחריו (לא להחליף — להוסיף את הבלוק הזה אחרי):**

```

**Hook-counter discrepancy (added 2026-04-26 from M1_DEBT_VAT_FALLBACK_GUARD
review, Proposal 1):** when a file is at hard cap (within 1 line of 350),
`wc -l` is NOT enough. The pre-commit `rule-12-file-size` hook measures with
`content.split('\n').length` which can return a value 1 higher than `wc -l`
due to trailing-newline counting. The SPEC author MUST also run a Node
one-liner to capture the hook's measure:

    node -e "console.log(require('fs').readFileSync('<path>','utf8').split('\n').length)"

If `split('\n').length` reports 350 while `wc -l` reports 349, the file is
EFFECTIVELY at-cap and any addition will trip the hook. The SPEC must either
prescribe a deletable line in §8 to gain headroom OR mark the callsite as
deferred to a future shrink SPEC. Skipping this check forces the executor to
revert mid-SPEC. Caught by the receipt-po-compare.js:343 callsite during
M1_DEBT_VAT_FALLBACK_GUARD execution (1 of 8 callsites had to be deferred).
```

---

## שינוי 2 — Step 1.5g (הוספת rule-21-orphans pre-staging simulation)

**מקור:** FOREMAN_REVIEW של M1_DEBT_VAT_FALLBACK_GUARD (2026-04-26), Proposal 2.

**מצא את הבלוק הזה (סוף Step 1.5g):**

```
The `rule-21-orphans` pre-commit hook is IIFE-blind and will block co-staged
commits with shared helper names regardless of scoping. Catching this at
SPEC-author time saves the executor a mid-execution debug round-trip.
```

**הוסף אחריו (לא להחליף — להוסיף את הבלוק הזה אחרי):**

```

**Pre-staging hook simulation (added 2026-04-26 from M1_DEBT_VAT_FALLBACK_GUARD
review, Proposal 2):** in addition to the visual header inspection above,
when SPEC plans 2+ JS file edits in one commit the SPEC author MUST simulate
the rule-21-orphans hook against the planned staged set. Run the hook script
manually against the file list:

    node scripts/checks/rule-21-orphans.mjs <file1.js> <file2.js> [...]

If it reports any pre-existing collision, the SPEC must either:
- (a) authorize a specific file-prefix rename in §8 Expected Final State, OR
- (b) split the work into separate commits in §9 Commit Plan.

This is the pre-execution counterpart to (a)/(b) above — the visual
inspection catches obvious shared identifiers, the simulation catches
non-obvious ones (regex-flagged false positives that still block the
commit). M1_DEBT_VAT_FALLBACK_GUARD hit a pre-existing `supplierId`
collision (ai-batch-ocr ↔ debt-doc-new) that visual inspection missed; the
executor had to split commits mid-SPEC. The simulation would have caught it.
```

---

## שינוי 3 — Step 1.5i חדש (console probe ל-helpers עם פלט גלוי)

**מקור:** FOREMAN_REVIEW של M1_5_SAAS_FORMAT_MONEY (2026-04-26), Proposal 1.

**מצא את הבלוק הזה (סוף Step 1.5h, ממש לפני "### Step 2 — Create the SPEC Folder"):**

```
This is the layer that prevents "we got to Module 20 and didn't know which
fields we'd already used." Skipping it at author time puts the burden on the
executor's Step 1.5 which may catch it later, but by then the SPEC is already
dispatched and rework is expensive.

### Step 2 — Create the SPEC Folder
```

**החלף ל:**

```
This is the layer that prevents "we got to Module 20 and didn't know which
fields we'd already used." Skipping it at author time puts the burden on the
executor's Step 1.5 which may catch it later, but by then the SPEC is already
dispatched and rework is expensive.

#### Step 1.5i — Console probe for observable helpers (from M1_5_SAAS_FORMAT_MONEY review)

When the SPEC introduces or replaces a function whose output format is
**observable** (currency formatting, date formatting, phone formatting,
URL building, anything a user or downstream consumer sees character-for-
character), the SPEC author MUST run a 30-second browser console probe of
the **proposed** implementation against the **current** implementation
to verify byte-equivalence in the default-tenant case BEFORE drafting §8.

Example probe (paste into DevTools console):

    // LEGACY
    const legacy = (n) => '₪' + n.toLocaleString('he-IL');
    // PROPOSED (from §8.1)
    const proposed = (n) => new Intl.NumberFormat('he-IL', {style:'currency', currency:'ILS'}).format(n);
    [1234, -1234, 0, 1234.56].forEach(n => {
      console.log({n, legacy: legacy(n), proposed: proposed(n), match: legacy(n) === proposed(n)});
    });

If ANY case shows `match: false`, the §8 sample code is wrong — redesign
BEFORE dispatching to executor. Document the probe (or reference the test
case) in §11 Lessons Already Incorporated.

Rationale: in M1_5_SAAS_FORMAT_MONEY the §8.1 sample (full
`Intl.NumberFormat` with currency style) would have produced
`'‏1,234 ‏₪'` (LRM-padded space-separated) instead of the
legacy `'₪1,234'` (concat). 99 callsites would have rendered
differently. The §5 stop trigger caught it post-execution and forced a
redesign mid-SPEC; the console probe would have caught it pre-execution and
saved a round-trip. For less battle-hardened SPECs (no explicit §5 trigger),
the probe IS the safety net.

Applies to: any helper whose surface format is observable. Examples:
`formatMoney`, `formatPhone`, `formatDate`, `getCustomDomain`, `buildShortUrl`.
Does NOT apply to: helpers whose output is consumed only by other code paths
(e.g., `getTenantId`, `getVatRate` — both return raw values, not formatted
strings).

### Step 2 — Create the SPEC Folder
```

---

## שינוי 4 — החלפת "Daniel — Communication Rules" בנוסח חדש ומלא

**מצא את הבלוק הזה:**

```
## Daniel — Communication Rules

Daniel is the project owner. He communicates in Hebrew. He is here for
**strategic decisions only**. Reports to Daniel must contain:
- What was accomplished (one sentence, high level)
- Current status (where we are in the roadmap)
- Next strategic question, if there is one

**Never include:** section numbers, file names, line counts, SQL snippets,
manual action specifics, or technical implementation details.

**One question at a time.** Never batch multiple questions. Ask one, wait for
the answer, then ask the next.
```

**החלף ל:**

```
## Daniel — Communication Pattern (mandatory)

Daniel is project owner, NOT a developer. He needs strategic clarity, not
technical detail.

**THE PATTERN — every interaction follows this shape:**

1. State the situation in plain Hebrew — 1-2 sentences max. No file paths,
   no hashes, no §-numbers, no commit IDs in the body.
2. Give 2-4 options when there's a choice to make. Each option = 1 line + a
   one-sentence "why" or "downside".
3. Make a recommendation clearly with reasoning. "המלצה שלי: X. הסיבה: Y."
4. Ask one specific question that ends in `?` — never list multiple questions.
5. Wait for answer. Don't proceed without it.

**NEVER:**
- Lists of file names (e.g., "3 files at outputs/X, Y, Z").
- Commit hashes in body text. (Hashes go in artifacts/handoffs, not in
  conversation.)
- "§3 criterion 7" style references.
- Multiple questions in one message.
- Status reports without recommendation. ("Here's what happened, what do
  you want to do?" is wrong. Right: "Here's what happened. I recommend X.
  Yes?").

**WHEN PRESENTING SPEC FOR APPROVAL — translate to plain Hebrew BEFORE
asking for approval. Use this structure:**
- "מה ה-SPEC הזה עושה" (1 paragraph, no jargon)
- "מה לא משתנה" (reassurance about safety)
- "סיכון" (one line)
- "זמן" (one line)
- "מאשר?"

Reference: see `M4_ATTENDEE_PAYMENT_AUTOMATION` strategic-chat dialog
(2026-04-25).
```

---

## שינוי 5 — סעיף חדש "The Workflow Dance" אחרי שינוי 4

**מצא את הבלוק הזה (זה שאתה הרגע יצרת בשינוי 4):**

```
Reference: see `M4_ATTENDEE_PAYMENT_AUTOMATION` strategic-chat dialog
(2026-04-25).
```

**החלף ל (מוסיף את כל סעיף Workflow Dance אחריו):**

```
Reference: see `M4_ATTENDEE_PAYMENT_AUTOMATION` strategic-chat dialog
(2026-04-25).

## The Workflow Dance (how every SPEC closes)

This is the proven cadence from the 2026-04-25 session (7 SPECs closed):

**Step 1 — Strategic conversation:** Foreman asks 1-4 strategic questions to
understand intent. ONE question at a time. After each answer, save the
decision and move to next question.

**Step 2 — SPEC author:** Foreman writes SPEC.md following all
§1.5e/f/g/h/i checks.

**Step 3 — Plain-Hebrew translation:** Before asking for approval, present
the SPEC's intent in plain Hebrew. NEVER ask "approved?" without the
translation.

**Step 4 — Activation prompt:** After Daniel approves, write
`activation_prompt_*.md` to outputs. Daniel hand-carries to Claude Code.

**Step 5 — Wait for EXECUTOR DONE.** Don't ask Daniel for status updates.

**Step 6 — QA handoff:** Write `foreman_qa_handoff_*.md` to outputs. Daniel
hand-carries to Claude Code (Cowork-VM cannot reach localhost).

**Step 7 — Wait for QA results.**

**Step 8 — FOREMAN_REVIEW:** Read all artifacts. Write FOREMAN_REVIEW.md
including 2 strategic + 2 executor improvement proposals. Verdict: 🟢/🟡/🔴.

**Step 9 — Hand-off message to Daniel:** "🟢 SPEC X closed. תעביר לקלאוד
קוד: [git add + commit message]. מה הכיוון הבא?"

**NEVER:**
- Skip the plain-Hebrew translation before approval.
- Wait for Daniel to ask for the activation prompt — write it proactively
  after his "כן".
- Try to commit/push from Cowork (see "Cowork Environment Constraints").
- Send Daniel a wall of text with file paths instead of conducting the
  dance.
```

---

## אימות אחרי כל ה-5 שינויים

הרץ:

    grep -E "^####? Step 1\.5[a-z]" .claude/skills/opticup-strategic/SKILL.md

צריך להחזיר 5 שורות (e, f, g, h, i בסדר הזה).

ועוד:

    grep -E "^## (Daniel|The Workflow Dance)" .claude/skills/opticup-strategic/SKILL.md

צריך להחזיר 2 שורות:
- `## Daniel — Communication Pattern (mandatory)`
- `## The Workflow Dance (how every SPEC closes)`

---

## Commit

```
git add .claude/skills/opticup-strategic/SKILL.md
git commit -m "chore(skills): add 5 improvements to opticup-strategic — 2026-04-26

3 from overnight FOREMAN_REVIEWs (Step 1.5e hook-counter, Step 1.5g
rule-21 sim, Step 1.5i console probe) + 2 from Daniel directive
(Communication Pattern rewrite, Workflow Dance section)."
git push origin develop
```

---

*End of prompt.*
