You are in opticalis/opticup (ERP repo) with Supabase DB access. Fix a truncated email file, create
two SuperSale "launch teaser" CRM templates in DEMO, then promote them to PRIZMA byte-identical.
Full context: campaigns/supersale/sketches/BRIEF_create_promote_launch_templates.md — read it first.
Demo-first per Iron Rule 33. Do NOT send anything, do NOT create broadcasts.

PRE-FLIGHT
1. git branch -> develop. git status -> leave pre-existing WIP untouched; selective add by filename.

STEP 0 — FIX the truncated email file
campaigns/supersale/messages/sunday_launch_email.html is truncated (ends mid-document near </tr>,
NOT ending in </html>). Re-add the missing tail: the COPYRIGHT block + closing
</table></td></tr></table></body></html> (see the brief for the exact intended tail). Verify valid
HTML, ends </html>, 0 NUL bytes, balanced tables. Commit the fix by explicit filename on develop.

STEP 1 — create 2 templates in DEMO (tenant 8d8cfa7e-ef58-49af-9702-a862d459cccb), language he,
is_active true, required_variables '[]'::jsonb, show_in_automations true. Read bodies from the repo —
do NOT retype HTML. Use dollar-quoting / parameterized insert (no manual quote escaping). Idempotent:
if a slug exists, UPDATE to match instead of duplicating.
  (A) SMS slug `supersale_launch_teaser_sms_he` (likely already created in a prior step — verify;
      update body only if it differs). subject NULL, body exactly per the brief.
  (B) EMAIL slug `supersale_launch_teaser_email_he`, channel email,
      subject "%name%, הצצה בלעדית למחירי הדגמים שיחכו לכם באירוע הקרוב",
      name "סופרסייל - הצצה לאירוע (גל 1) — Email",
      body = full FIXED contents of campaigns/supersale/messages/sunday_launch_email.html.

STEP 2 — verify on demo: both slugs present, channel/subject correct, body length matches file,
0 NUL bytes, only the 7 approved placeholders present (%name%, %event_name%, %event_date%,
%event_day_of_week%, %event_time%, %registration_url%, %unsubscribe_url%).

STEP 3 — promote DEMO -> PRIZMA (tenant 6ad0781b-37f0-47a9-92e3-be9ed1477e1c) per Iron Rule 33:
use scripts/promote-config-to-prizma.mjs if it supports templates; else replicate the exact 2 rows
into prizma with prizma's tenant_id, byte-identical body/subject/slug/flags. Audit-log if the script does.

STEP 4 — verify parity: demo vs prizma, same 2 slugs, md5(body) identical, subject identical. Report hashes.

CONSTRAINTS: Iron Rule 33 (demo-first->promote), Iron Rule 35 (no new placeholders). No send, no
broadcast. Develop only for the file fix. Never main.

REPORT: demo slugs+lengths, prizma slugs+lengths, md5 parity result, file-fix commit SHA.

STOP-ON-DEVIATION: new placeholder needed, any send/broadcast, parity mismatch you can't resolve,
anything touching main — stop and report.
