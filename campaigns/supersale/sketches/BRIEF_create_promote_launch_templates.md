# BRIEF — Fix email file, create 2 SuperSale launch templates in DEMO, promote to PRIZMA

**Author:** Events-Operations (Cowork) · **For:** Claude Code (has Supabase DB access + project repo) · 2026-05-22
**Companion:** ACTIVATION_PROMPT_create_promote_launch_templates.md

---

## Why this is going to Claude Code (not done in Cowork)
The email body is ~16KB HTML. Inserting it via hand-built SQL from Cowork hit escaping/truncation
artifacts, and the source file itself got truncated by the Cowork VM (it does NOT end with </html>).
Claude Code has direct DB access + reads the file cleanly — the safe path for a large, escaping-
sensitive DB write. Demo-first then promote per Iron Rule 33.

## Step 0 — FIX the truncated email file FIRST
`campaigns/supersale/messages/sunday_launch_email.html` is truncated — it ends mid-document around
`</tr>` and is MISSING the closing tags. Repair it so it ends correctly:
after the last content `</tr>`, it needs the COPYRIGHT block (it was in the design) then the proper
closes. The intended tail (re-add if missing):
```
        </table>
        <table border="0" cellpadding="0" cellspacing="0" width="600" class="container">
          <tr>
            <td align="center" style="padding: 20px 0; color:#666666; font-size:11px; line-height:1.6;">
              © כל הזכויות שמורות לאופטיקה פריזמה | הרצל 32, אשקלון
              <br>
              ההטבות מיועדות לנרשמים מראש בלבד. ההשתתפות בכפוף לאישור סופי וזמינות המלאי.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```
Verify the file is valid HTML, ends with </html>, has 0 NUL bytes, balanced tables. Commit the fix
(explicit filename) on develop.

## Step 1 — create TWO templates in DEMO (tenant 8d8cfa7e-ef58-49af-9702-a862d459cccb)
Read the bodies from the repo, do not retype the HTML. Both language='he', is_active=true,
required_variables='[]'::jsonb, show_in_automations=true.

NOTE: the SMS template already exists in demo from a prior step:
slug `supersale_launch_teaser_sms_he` (verify it's present; if so, leave it / update body only if
it differs from below). If missing, create it.

(A) SMS — slug `supersale_launch_teaser_sms_he`, channel sms, subject NULL, body EXACTLY:
```
%name%, הצצה בלעדית למחירי הדגמים שיחכו לכם באירוע הקרוב 👀

מבחר רחב מבתי האופנה הגדולים, החל מ-400 ₪, מחכה לכם ליום %event_day_of_week% %event_date%:

👉 https://prizma-optic.co.il/supersale-launch/


להסרה: %unsubscribe_url%
```

(B) EMAIL — slug `supersale_launch_teaser_email_he`, channel email,
subject `%name%, הצצה בלעדית למחירי הדגמים שיחכו לכם באירוע הקרוב`,
body = the FULL fixed contents of campaigns/supersale/messages/sunday_launch_email.html (read the file).
name (template name): "סופרסייל - הצצה לאירוע (גל 1) — Email".

Use dollar-quoting or parameterized insert — no fragile manual single-quote escaping. Idempotent:
if a slug already exists in demo, UPDATE its body/subject to match rather than duplicating.

## Step 2 — verify on demo
Confirm both templates exist in demo, channel/subject correct, body length matches the file, 0 NUL
bytes, placeholders intact (%name%, %event_name%, %event_date%, %event_day_of_week%, %event_time%,
%registration_url%, %unsubscribe_url%). No other tokens.

## Step 3 — promote to PRIZMA (tenant 6ad0781b-37f0-47a9-92e3-be9ed1477e1c)
Per Iron Rule 33, promote demo→prizma using the project's promotion path
(scripts/promote-config-to-prizma.mjs if it supports templates; otherwise replicate the exact same
two rows into prizma with prizma's tenant_id, byte-identical body/subject/slug/flags). The two
templates MUST be byte-identical between demo and prizma (Daniel: "if it works in demo it works in
prizma — same exactly"). Audit-log the promotion if the script does so.

## Step 4 — verify parity
Confirm demo and prizma have the same 2 slugs with identical body hashes (md5(body) match) +
identical subject. Report the hashes.

## Constraints
Iron Rule 33 (demo-first → promote). Iron Rule 35 (no new placeholders — all 7 are pre-approved/
existing). Do NOT send anything. Do NOT create broadcasts. Develop branch only for the file fix.
Report counts + hashes.

## Deliverables
- Fixed email HTML file (ends </html>, committed).
- 2 templates in demo + same 2 in prizma, byte-identical, verified by md5 parity.
- Report: demo slugs + lengths, prizma slugs + lengths, md5 parity result, commit SHA of the file fix.

## Stop-on-deviation
Any new placeholder needed, any send/broadcast, any parity mismatch you can't resolve, anything
touching main — stop and report.
