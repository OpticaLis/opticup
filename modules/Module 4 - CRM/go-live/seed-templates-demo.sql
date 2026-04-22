-- =============================================================================
-- P5_MESSAGE_CONTENT — Full SuperSale Template Seed (Demo Tenant)
-- SPEC: modules/Module 4 - CRM/go-live/specs/P5_MESSAGE_CONTENT/SPEC.md
-- Date: 2026-04-22
-- Tenant: demo (8d8cfa7e-ef58-49af-9702-a862d459cccb)
-- Content source: campaigns/supersale/FLOW.md + campaigns/supersale/messages/*.html
-- Variable format: %var% (Optic Up Edge Function `send-message`)
-- Supersedes: seed-message-templates.sql (old C1 4-template seed, format {{var}})
-- =============================================================================

BEGIN;

-- Clean slate for demo tenant templates (idempotent re-seed)
DELETE FROM crm_message_templates WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid;

-- lead_intake_new — SMS
INSERT INTO crm_message_templates (tenant_id, slug, name, channel, language, subject, body, is_active, created_at) VALUES (
  '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid,
  'lead_intake_new_sms_he',
  'ליד חדש — SMS',
  'sms',
  'he',
  NULL,
  $p5body$היי %name%,
נרשמת בהצלחה למערכת האירועים של אופטיקה פריזמה ✔️
מה עכשיו? ברגע שייפתח אירוע מכירות - תקבל/י הודעה עם קישור הרשמה (כל אירוע מוגבל ל-50 משתתפים).
שימו לב: בחלק מהאירועים, שריון המקום כרוך בדמי שריון המקוזזים מהקנייה.
פרטים מלאים נשלחו במייל.
צוות אופטיקה פריזמה 💛$p5body$,
  true,
  now()
);

-- lead_intake_new — Email
INSERT INTO crm_message_templates (tenant_id, slug, name, channel, language, subject, body, is_active, created_at) VALUES (
  '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid,
  'lead_intake_new_email_he',
  'ליד חדש — Email',
  'email',
  'he',
  $p5body$%name%, ההרשמה למערכת אירועי המכירות נקלטה בהצלחה,הנה מה שקורה הלאה ✔️$p5body$,
  $p5body$<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>נרשמת בהצלחה למערכת האירועים - אופטיקה פריזמה</title>
    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color:#000000; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        @media screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
            .mobile-btn { width: 100% !important; display: block !important; margin-bottom: 10px !important; }
            .step-table { width: 100% !important; }
        }
    </style>
</head>
<body style="margin:0; padding:0; background-color:#000000; direction:rtl;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#000000; background-image: radial-gradient(circle at 50% 0%, #1a1a1a 0%, #000000 70%);">
        <tr>
            <td align="center" style="padding: 20px 0 40px 0;">
                <!-- Main Container -->
                <table border="0" cellpadding="0" cellspacing="0" width="600" class="container" style="max-width:600px; background-color:#0a0a0a; border-radius:12px; overflow:hidden; border: 1px solid #222222; box-shadow: 0 10px 40px rgba(212, 175, 55, 0.15);">

                    <!-- Gold Top Bar -->
                    <tr>
                        <td height="4" style="background: linear-gradient(90deg, #000000 0%, #d4af37 50%, #000000 100%);"></td>
                    </tr>
                    <!-- Logo -->
                    <tr>
                        <td align="center" style="padding: 35px 0 15px 0;">
                            <p style="margin:0; color:#d4af37; font-size:24px; font-weight:bold; letter-spacing:4px; text-transform:uppercase; font-family: sans-serif;">PRIZMA OPTIC</p>
                            <p style="margin:5px 0 0 0; color:#666666; font-size:12px; letter-spacing:2px; text-transform:uppercase;">Luxury Eyewear Events</p>
                        </td>
                    </tr>
                    <!-- Main Content -->
                    <tr>
                        <td class="mobile-padding" style="padding: 20px 50px 40px 50px; text-align:right;">
                            <!-- Greeting -->
                            <h1 style="margin:0 0 20px 0; font-size:28px; font-weight:300; color:#ffffff;">
                                היי %name% 👋
                            </h1>

                            <p style="margin:0 0 25px 0; font-size:16px; line-height:1.7; color:#cccccc;">
                                נרשמת בהצלחה ל<strong style="color:#ffffff;">מערכת האירועים</strong> של אופטיקה פריזמה.
                                <br>
                                ברגע שייפתח אירוע מכירות חדש – תקבל/י הודעה עם קישור הרשמה ישירות לנייד.
                            </p>
                            <!-- ═══ PROCESS STEPS ═══ -->
                            <h3 style="margin:0 0 18px 0; font-size:18px; color:#d4af37; border-bottom: 1px solid #333333; display:inline-block; padding-bottom:5px;">
                                איך זה עובד?
                            </h3>
                            <!-- Step 1 - DONE -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:14px;">
                                <tr>
                                    <td width="36" valign="top" style="padding-top:2px;">
                                        <table border="0" cellpadding="0" cellspacing="0"><tr><td style="width:28px; height:28px; border-radius:50%; background-color:#1a3d1a; border:2px solid #25D366; text-align:center; line-height:28px; font-size:14px; color:#7CFC9A;">✓</td></tr></table>
                                    </td>
                                    <td style="padding-right:10px;">
                                        <p style="margin:0 0 3px 0; font-size:15px; font-weight:bold; color:#7CFC9A;">הרשמה למערכת ✓</p>
                                        <p style="margin:0; font-size:14px; line-height:1.6; color:#999999;">הפרטים שלך נקלטו. תקבל/י עדכונים על כל אירוע שנפתח.</p>
                                    </td>
                                </tr>
                            </table>
                            <!-- Step 2 -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:14px;">
                                <tr>
                                    <td width="36" valign="top" style="padding-top:2px;">
                                        <table border="0" cellpadding="0" cellspacing="0"><tr><td style="width:28px; height:28px; border-radius:50%; background-color:#0a0a0a; border:2px solid #d4af37; text-align:center; line-height:28px; font-size:13px; font-weight:bold; color:#d4af37;">2</td></tr></table>
                                    </td>
                                    <td style="padding-right:10px;">
                                        <p style="margin:0 0 3px 0; font-size:15px; font-weight:bold; color:#E8D48B;">הזמנה + קישור הרשמה לאירוע</p>
                                        <p style="margin:0; font-size:14px; line-height:1.6; color:#999999;">כשנפתח אירוע – תקבל/י SMS ומייל עם קישור הרשמה. כל אירוע מוגבל ל-50 משתתפים.</p>
                                    </td>
                                </tr>
                            </table>
                            <!-- Step 3 -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:14px;">
                                <tr>
                                    <td width="36" valign="top" style="padding-top:2px;">
                                        <table border="0" cellpadding="0" cellspacing="0"><tr><td style="width:28px; height:28px; border-radius:50%; background-color:#0a0a0a; border:2px solid #d4af37; text-align:center; line-height:28px; font-size:13px; font-weight:bold; color:#d4af37;">3</td></tr></table>
                                    </td>
                                    <td style="padding-right:10px;">
                                        <p style="margin:0 0 3px 0; font-size:15px; font-weight:bold; color:#E8D48B;">שריון מקום + קופון אישי</p>
                                        <p style="margin:0; font-size:14px; line-height:1.6; color:#999999;">לאחר ההרשמה לאירוע - בחלק מהאירועים נדרש שריון מקום באמצעות דמי שריון (המקוזזים במלואם מהקנייה). הקופון האישי יישלח אלייך לאחר השלמת השריון. <a href="https://prizma-optic.co.il/supersale-takanon/" style="color:#d4af37; text-decoration:underline;">פרטים בתקנון ›</a></p>
                                    </td>
                                </tr>
                            </table>
                            <!-- Step 4 -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:25px;">
                                <tr>
                                    <td width="36" valign="top" style="padding-top:2px;">
                                        <table border="0" cellpadding="0" cellspacing="0"><tr><td style="width:28px; height:28px; border-radius:50%; background-color:#0a0a0a; border:2px solid #d4af37; text-align:center; line-height:28px; font-size:13px; font-weight:bold; color:#d4af37;">4</td></tr></table>
                                    </td>
                                    <td style="padding-right:10px;">
                                        <p style="margin:0 0 3px 0; font-size:15px; font-weight:bold; color:#E8D48B;">מגיעים ונהנים</p>
                                        <p style="margin:0; font-size:14px; line-height:1.6; color:#999999;">מציגים את הקופון בסניף ונהנים מהמחירים המיוחדים של האירוע.</p>
                                    </td>
                                </tr>
                            </table>
                            <!-- ═══ YOUR DETAILS ═══ -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#161616; border-radius:8px; border:1px solid #333333; margin-bottom:20px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <p style="margin:0 0 10px 0; font-size:15px; font-weight:bold; color:#d4af37; border-bottom:1px solid #333333; padding-bottom:8px;">
                                            הפרטים שנקלטו במערכת:
                                        </p>
                                        <p style="margin:8px 0 4px 0; font-size:14px; color:#cccccc;">
                                            👤 <strong>שם:</strong> %name%
                                        </p>
                                        <p style="margin:4px 0 4px 0; font-size:14px; color:#cccccc; white-space: nowrap;">
                                            📱 <strong>טלפון:</strong> %phone%
                                        </p>
                                        <p style="margin:4px 0 0 0; font-size:14px; color:#cccccc; white-space: nowrap;">
                                            ✉️ <strong>אימייל:</strong> %email%
                                        </p>
                                        <p style="margin:14px 0 0 0; font-size:12px; color:#777777;">
                                            הקופון האישי יהיה צמוד לפרטים אלו בלבד. משהו לא מדויק?
                                            <a href="https://wa.me/972533645404?text=%D7%94%D7%99%D7%99%2C%20%D7%A0%D7%A8%D7%A9%D7%9E%D7%AA%D7%99%20%D7%9C%D7%90%D7%99%D7%A8%D7%95%D7%A2%D7%99%20%D7%94%D7%9E%D7%9B%D7%99%D7%A8%D7%95%D7%AA%20%D7%A9%D7%9C%D7%9B%D7%9D.%20%D7%A8%D7%90%D7%99%D7%AA%D7%99%20%D7%A9%D7%94%D7%9E%D7%99%D7%93%D7%A2%20%D7%A9%D7%A0%D7%A7%D7%9C%D7%98%20%D7%9C%D7%90%20%D7%A0%D7%9B%D7%95%D7%9F." style="color:#d4af37; text-decoration:underline;">עדכנו אותנו בוואטסאפ</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            <!-- ═══ IMPORTANT NOTICE ═══ -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#1a1200; border:1px solid #d4af37; border-radius:6px; margin-bottom:20px;">
                                <tr>
                                    <td style="padding: 15px;">
                                        <p style="margin:0 0 5px 0; font-size:15px; font-weight:bold; color:#E8D48B;">
                                            ⚡ חשוב לדעת
                                        </p>
                                        <p style="margin:0; font-size:14px; line-height:1.6; color:#cccccc;">
                                            קישור ההרשמה לאירוע עצמו יישלח <strong style="color:#ffffff;">במייל ובהודעת SMS</strong> בלבד.
                                            כדי לא לפספס – ודאו שמייל זה הגיע מ:
                                            <br>
                                            <strong style="color:#d4af37;">events@prizma-optic.co.il</strong>
                                        </p>
                                        <p style="margin:8px 0 0 0; font-size:13px; color:#999999;">
                                            לא מצאתם? בדקו בתיקיית "ספאם" או "קידומי מכירות".
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            <!-- ═══ LOCATION ═══ -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#161616; border: 1px solid #333333; border-radius: 6px; margin-bottom: 20px;">
                                <tr>
                                    <td style="padding: 18px; text-align:center;">
                                        <p style="margin:0 0 10px 0; font-size:15px; font-weight:bold; color:#ffffff;">
                                            📍 האירועים מתקיימים בסניף באשקלון
                                        </p>
                                        <p style="margin:0 0 12px 0; font-size:13px; color:#999999;">
                                            הרצל 32, אשקלון &nbsp;•&nbsp; יש חניה
                                        </p>
                                        <a href="https://waze.com/ul/hsv8s5h2c3" style="display:inline-block; padding:10px 25px; background-color:#1e1e1e; color:#d4af37; border: 1px solid #d4af37; text-decoration:none; border-radius:50px; font-weight:bold; font-size:14px;">
                                            🚗 נווט עם Waze
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin:0; font-size:13px; color:#777777;">
                                זמינים גם בטלפון: <a href="tel:086751313" style="color:#d4af37; text-decoration:none;">08-6751313</a>
                            </p>
                        </td>
                    </tr>
                    <!-- ═══ FOOTER CTA ═══ -->
                    <tr>
                        <td align="center" style="background-color:#111111; padding: 30px 40px; border-top: 1px solid #222222;">
                            <p style="margin:0 0 18px 0; font-size:15px; color:#ffffff;">
                                רוצים להציץ בינתיים במותגים ובמחירים?
                            </p>

                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <a href="https://wa.me/972533645404?text=%D7%94%D7%99%D7%99%2C%20%D7%A0%D7%A8%D7%A9%D7%9E%D7%AA%D7%99%20%D7%9C%D7%90%D7%99%D7%A8%D7%95%D7%A2%20%D7%94%D7%9E%D7%95%D7%AA%D7%92%D7%99%D7%9D%21%20%D7%90%D7%A9%D7%9E%D7%97%20%D7%9C%D7%A7%D7%91%D7%9C%20%D7%90%D7%AA%20%D7%A7%D7%98%D7%9C%D7%95%D7%92%20%D7%94%D7%9E%D7%97%D7%99%D7%A8%D7%99%D7%9D%20%D7%95%D7%94%D7%9E%D7%95%D7%AA%D7%92%D7%99%D7%9D." class="mobile-btn"
                                           style="background-color:#25D366; color:#ffffff; display:inline-block; font-family:sans-serif; font-size:15px; font-weight:bold; line-height:45px; text-align:center; text-decoration:none; width:220px; -webkit-text-size-adjust:none; border-radius:50px; margin: 5px;">
                                                💬 קטלוג מחירים בוואטסאפ
                                        </a>
                                        <a href="https://prizma-optic.co.il/brands/" class="mobile-btn"
                                           style="background-color:#1e1e1e; color:#d4af37; display:inline-block; font-family:sans-serif; font-size:14px; font-weight:bold; line-height:45px; text-align:center; text-decoration:none; width:160px; -webkit-text-size-adjust:none; border-radius:50px; margin: 5px; border: 1px solid #333333;">
                                                ✨ עמוד המותגים
                                        </a>
                                        <a href="https://www.instagram.com/optic_prizma" class="mobile-btn"
                                           style="background-color:#1e1e1e; color:#ffffff; display:inline-block; font-family:sans-serif; font-size:14px; font-weight:bold; line-height:45px; text-align:center; text-decoration:none; width:160px; -webkit-text-size-adjust:none; border-radius:50px; margin: 5px; border: 1px solid #333333;">
                                                📷 אינסטגרם
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin:25px 0 0 0; font-size:14px; color:#777777;">
                                נתראה באירוע 💛
                                <br>
                                <strong style="color:#d4af37;">צוות אופטיקה פריזמה</strong>
                            </p>
                        </td>
                    </tr>
                </table>

                <!-- ═══ COPYRIGHT ═══ -->
                <table border="0" cellpadding="0" cellspacing="0" width="600" class="container">
                    <tr>
                        <td align="center" style="padding: 20px 0; color:#555555; font-size:11px; line-height:1.6;">
                            © כל הזכויות שמורות לאופטיקה פריזמה | הרצל 32, אשקלון
                            <br>
                            הודעה זו נשלחה בעקבות הרשמה למערכת האירועים.
                            <br>
                            המחירים, המותגים וההטבות בכפוף לתנאי האירוע ולזמינות המלאי.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
$p5body$,
  true,
  now()
);

-- lead_intake_duplicate — SMS
INSERT INTO crm_message_templates (tenant_id, slug, name, channel, language, subject, body, is_active, created_at) VALUES (
  '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid,
  'lead_intake_duplicate_sms_he',
  'ליד כפול — SMS',
  'sms',
  'he',
  NULL,
  $p5body$*היי %name%* 👋
מספר הטלפון שהנך מנסה להרשם איתו, כבר רשום במערכת האירועים. ברגע שיפתח האירוע הקרוב, נשלח הודעה לטלפון ולמייל איתו נרשמת
נתראה בקרוב, צוות אופטיקה פריזמה 💛$p5body$,
  true,
  now()
);

-- lead_intake_duplicate — Email
INSERT INTO crm_message_templates (tenant_id, slug, name, channel, language, subject, body, is_active, created_at) VALUES (
  '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid,
  'lead_intake_duplicate_email_he',
  'ליד כפול — Email',
  'email',
  'he',
  $p5body$היי %name%, נרשמת למערכת האירועים בעבר!$p5body$,
  $p5body$<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>עדכון סטטוס הרשמה - אופטיקה פריזמה</title>
<style>
    /* Reset Styles */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color:#000000; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    /* Mobile Styles */
    @media screen and (max-width: 600px) {
        .container { width: 100% !important; }
        .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
        .event-box { padding: 20px !important; }
        .brand-col { width: 48% !important; display: inline-block !important; margin-bottom: 10px !important; box-sizing: border-box; }
        .btn { width: 100% !important; display: block !important; box-sizing: border-box; }
    }
</style>
</head>
<body style="margin:0; padding:0; background-color:#000000; direction:rtl;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#000000; background-image: radial-gradient(circle at 50% 0%, #1a1a1a 0%, #000000 70%);">
    <tr>
        <td align="center" style="padding: 20px 0 40px 0;">
            <table border="0" cellpadding="0" cellspacing="0" width="600" class="container" style="max-width:600px; background-color:#0a0a0a; border-radius:12px; overflow:hidden; border: 1px solid #222222; box-shadow: 0 10px 40px rgba(212, 175, 55, 0.15);">

                <tr>
                    <td height="4" style="background: linear-gradient(90deg, #000000 0%, #d4af37 50%, #000000 100%);"></td>
                </tr>
                <tr>
                    <td align="center" style="padding: 35px 0 15px 0;">
                        <p style="margin:0; color:#d4af37; font-size:24px; font-weight:bold; letter-spacing:4px; text-transform:uppercase; font-family: sans-serif;">PRIZMA OPTIC</p>
                        <p style="margin:5px 0 0 0; color:#666666; font-size:12px; letter-spacing:2px; text-transform:uppercase;">Luxury Eyewear Events</p>
                    </td>
                </tr>
                <tr>
                    <td class="mobile-padding" style="padding: 20px 50px 40px 50px; text-align:right;">
                        <h1 style="margin:0 0 20px 0; font-size:28px; font-weight:300; color:#ffffff;">
                            היי %name%,
                        </h1>
                        <p style="margin:0 0 25px 0; font-size:16px; line-height:1.7; color:#cccccc;">
                              אנו מודים על ההתעניינות המתמשכת באירועי המכירות שלנו! 👓
                            <br>
                            אנחנו שמחים לעדכן שהפרטים שלך <strong>כבר מעודכנים במערכת</strong>.
                        </p>
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#0a1a10; border: 1px solid #1e5d35; border-radius: 4px; margin-bottom: 30px;">
                            <tr>
                                <td style="padding: 20px; text-align:center;">
                                    <p style="margin:0; font-size:18px; color:#4ade80; font-weight:bold; letter-spacing: 0.5px;">
                                        ✅ הכל תקין!
                                    </p>
                                    <p style="margin:5px 0 0 0; font-size:14px; color:#cccccc;">
                                        האישור המקורי שלך כבר בתוקף, הרישום תקין לחלוטין ואין צורך בפעולה נוספת.
                                    </p>
                                </td>
                            </tr>
                        </table>
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#161616; border-right:4px solid #d4af37; border-radius:4px; margin-bottom:30px;">
                            <tr>
                                <td class="data-box" style="padding: 20px;">
                                    <p style="margin:0 0 15px 0; font-size:12px; text-transform:uppercase; letter-spacing:2px; color:#888888; border-bottom:1px solid #333333; padding-bottom:10px;">
                                        פרטי המנוי במערכת
                                    </p>

                                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                        <tr>
                                            <td width="30" valign="middle" style="padding-bottom:10px; font-size:16px;">📞</td>
                                            <td valign="middle" style="padding-bottom:10px; font-size:15px; color:#dddddd;">
                                                 %phone%
                                            </td>
                                        </tr>
                                        <tr>
                                            <td width="30" valign="middle" style="font-size:16px;">📧</td>
                                            <td valign="middle" style="font-size:15px; color:#dddddd;">
                                                 %email%
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                        <p style="margin:0 0 15px 0; font-size:16px; font-weight:bold; color:#ffffff;">
                            מה קורה ברגע שייפתח אירוע מולטיפוקל חדש?
                        </p>
                        <p style="margin:0 0 20px 0; font-size:15px; color:#bbbbbb;">
                            תקבל\י הודעה ראשונה (במייל וב-SMS) הכוללת:
                        </p>
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px;">
                            <tr>
                                <td width="40" style="padding:12px 0; font-size:20px; border-bottom:1px solid #222222;">📅</td>
                                <td style="padding:12px 0; font-size:15px; color:#cccccc; border-bottom:1px solid #222222;">תאריך ושעת האירוע</td>
                            </tr>
                            <tr>
                                <td width="40" style="padding:12px 0; font-size:20px; border-bottom:1px solid #222222;">🔗</td>
                                <td style="padding:12px 0; font-size:15px; color:#cccccc; border-bottom:1px solid #222222;">קישור להרשמה אישית</td>
                            </tr>
                            <tr>
                                <td width="40" style="padding:12px 0; font-size:20px;">🎫</td>
                                <td style="padding:12px 0; font-size:15px; color:#cccccc;">קוד קופון מיוחד (לאחר אישור הגעה)</td>
                            </tr>
                        </table>
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0;">
                            <tr>
                                <td style="border-top: 1px solid #222222;"></td>
                            </tr>
                        </table>
                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                                <td align="center">
                                    <p style="margin:0 0 15px 0; font-size:14px; color:#bbbbbb;">
                                        בינתיים, להצצה בקולקציות שלנו:
                                    </p>
                                    <a href="https://prizma-optic.co.il/" class="btn" style="display:inline-block; padding:12px 30px; background-color:transparent; color:#d4af37; border: 1px solid #d4af37; font-size:14px; font-weight:bold; text-decoration:none; border-radius:4px; letter-spacing:0.5px;">
                                        לאתר הבית והמותגים >
                                    </a>
                                </td>
                            </tr>
                        </table>
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 40px; border-top: 1px solid #222222;">
                            <tr>
                                <td style="padding-top: 20px;">
                                    <p style="margin:0; font-size:15px; color:#ffffff;">
                                        אנחנו כאן לכל שאלה,
                                    </p>
                                    <p style="margin:5px 0 0 0; font-size:15px; color:#d4af37; font-weight:bold;">
                                        צוות אופטיקה פריזמה
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" width="600" class="container">
                <tr>
                    <td align="center" style="padding: 20px 0; color:#555555; font-size:12px;">
                        © כל הזכויות שמורות לאופטיקה פריזמה
                        <br>
                        הודעה זו נשלחה אוטומטית ממערכת הניהול
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
$p5body$,
  true,
  now()
);

-- event_will_open_tomorrow — SMS
INSERT INTO crm_message_templates (tenant_id, slug, name, channel, language, subject, body, is_active, created_at) VALUES (
  '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid,
  'event_will_open_tomorrow_sms_he',
  'אירוע נפתח מחר — SMS',
  'sms',
  'he',
  NULL,
  $p5body$עדכון מערכת - אירועי המכירות.

ההרשמה לאירוע הקרוב אליו נרשמת תיפתח מחר.

לידיעתך:
על מנת לשמור על איכות השירות וחוויית הקנייה, מספר המשתתפים באירוע הקרוב מוגבל ל־50 משתתפים.

עם פתיחת ההרשמה תישלח הודעה נוספת.
הפרטים המלאים נשלחו במייל.

להסרה:
%unsubscribe_url%$p5body$,
  true,
  now()
);

-- event_will_open_tomorrow — Email
INSERT INTO crm_message_templates (tenant_id, slug, name, channel, language, subject, body, is_active, created_at) VALUES (
  '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid,
  'event_will_open_tomorrow_email_he',
  'אירוע נפתח מחר — Email',
  'email',
  'he',
  $p5body$פתיחת הרשמה לאירוע המכירות - עדכון$p5body$,
  $p5body$<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>עדכון לקראת פתיחת הרשמה - אירוע המכירות</title>
    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            background-color:#000000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        @media screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
        }
    </style>
</head>
<body style="margin:0; padding:0; background-color:#000000; direction:rtl;">

<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#000000; background-image: radial-gradient(circle at 50% 0%, #1a1a1a 0%, #000000 70%);">
    <tr>
        <td align="center" style="padding: 40px 0;">

            <table border="0" cellpadding="0" cellspacing="0" width="600" class="container" style="max-width:600px; background-color:#0a0a0a; border-radius:12px; overflow:hidden; border: 1px solid #222222; box-shadow: 0 10px 40px rgba(212, 175, 55, 0.1);">

                <!-- Gold Top Line -->
                <tr>
                    <td height="4" style="background: linear-gradient(90deg, #000000 0%, #d4af37 50%, #000000 100%);"></td>
                </tr>

                <!-- Header -->
                <tr>
                    <td align="center" style="padding: 40px 0 20px 0;">
                        <p style="margin:0; color:#d4af37; font-size:24px; font-weight:bold; letter-spacing:4px; text-transform:uppercase;">
                            PRIZMA OPTIC
                        </p>
                        <p style="margin:5px 0 0 0; color:#666666; font-size:12px; letter-spacing:2px; text-transform:uppercase;">
                            Luxury Eyewear Events
                        </p>
                    </td>
                </tr>

                <!-- Content -->
                <tr>
                    <td class="mobile-padding" style="padding: 20px 50px 40px 50px; text-align:right;">

                        <h1 style="margin:0 0 20px 0; font-size:26px; font-weight:300; color:#ffffff;">
                            שלום %name%,
                        </h1>

                        <p style="margin:0 0 22px 0; font-size:16px; line-height:1.7; color:#cccccc;">
                            מחר תיפתח ההרשמה ל- %event_name%.
                        </p>

                        <p style="margin:0 0 22px 0; font-size:15px; line-height:1.7; color:#bbbbbb;">
                            אירוע מכירה ייעודי, הנערך בזמנים מוגדרים בלבד,
                            עם תנאים שנקבעים במיוחד במימוש קוד הקופון שנשלח לנרשמים מראש.
                        </p>

                        <!-- Info Box -->
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#111111; border: 1px solid #333333; border-radius: 8px; margin-bottom: 28px;">
                            <tr>
                                <td style="padding: 22px; border-right: 4px solid #d4af37;">
                                    <p style="margin:0; font-size:15px; line-height:1.6; color:#dddddd;">
                                        על מנת לשמור על רמת שירות וחוויית קנייה גבוהה,
                                        מספר המשתתפים באירוע הקרוב מוגבל ל־
                                        <strong style="color:#d4af37;">50 משתתפים</strong>.
                                    </p>
                                </td>
                            </tr>
                        </table>

                        <p style="margin:0 0 28px 0; font-size:14px; line-height:1.6; color:#999999;">
                            עם פתיחת ההרשמה תישלח הודעה נוספת עם קישור ייעודי לרישום.
                            אין צורך לבצע שום פעולה בשלב זה.
                        </p>

                        <!-- Links -->
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 6px;">
                            <tr>
                                <td align="center" style="padding: 6px 0 0 0;">
                                    <p style="margin:0 0 14px 0; font-size:14px; color:#bbbbbb; letter-spacing:0.2px;">
                                        למידע נוסף:
                                    </p>

                                    <!-- Buttons Row -->
                                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto;">
                                        <tr>
                                            <!-- Event Page -->
                                            <td align="center" style="padding: 0 6px 10px 6px;">
                                                <a href="https://prizma-optic.co.il/supersale/" class="btn" style="display:inline-block; padding:12px 16px; background:#0f0f0f; color:#d4af37; border: 1px solid rgba(212,175,55,0.55); font-size:13px; font-weight:700; text-decoration:none; border-radius:999px; letter-spacing:0.3px; box-shadow: 0 6px 18px rgba(0,0,0,0.35);">
                                                    <span style="font-size:14px; line-height:1;">✨</span>&nbsp;עמוד האירוע
                                                </a>
                                            </td>

                                            <!-- Website -->
                                            <td align="center" style="padding: 0 6px 10px 6px;">
                                                <a href="https://prizma-optic.co.il/" class="btn" style="display:inline-block; padding:12px 16px; background:#0f0f0f; color:#d4af37; border: 1px solid rgba(212,175,55,0.55); font-size:13px; font-weight:700; text-decoration:none; border-radius:999px; letter-spacing:0.3px; box-shadow: 0 6px 18px rgba(0,0,0,0.35);">
                                                    <span style="font-size:14px; line-height:1;">🌐</span>&nbsp;אתר
                                                </a>
                                            </td>

                                            <!-- Instagram -->
                                            <td align="center" style="padding: 0 6px 10px 6px;">
                                                <a href="https://www.instagram.com/optic_prizma" class="btn" style="display:inline-block; padding:12px 16px; background:#0f0f0f; color:#d4af37; border: 1px solid rgba(212,175,55,0.55); font-size:13px; font-weight:700; text-decoration:none; border-radius:999px; letter-spacing:0.3px; box-shadow: 0 6px 18px rgba(0,0,0,0.35);">
                                                    <span style="font-size:14px; line-height:1;">📸</span>&nbsp;אינסטגרם
                                                </a>
                                            </td>
                                        </tr>
                                    </table>

                        <!-- Sign Off -->
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 40px; border-top: 1px solid #222222;">
                            <tr>
                                <td style="padding-top: 20px;">
                                    <p style="margin:0; font-size:15px; color:#ffffff;">
                                        בברכה,
                                    </p>
                                    <p style="margin:5px 0 0 0; font-size:15px; color:#d4af37; font-weight:bold;">
                                        צוות אופטיקה פריזמה
                                    </p>
                                </td>
                            </tr>
                        </table>

                    </td>
                </tr>

                <!-- Unsubscribe Block -->
                <tr>
                    <td>
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 22px;">
                            <tr>
                                <td align="center" style="padding: 18px 20px; color:#777777; font-size:12px; line-height:1.6;">
                                    <p style="margin:0 0 6px 0;">
                                        קיבלת את המייל הזה כחלק מרשימת עדכוני אירועי המכירות של אופטיקה פריזמה.
                                    </p>
                                    <p style="margin:0 0 10px 0;">
                                        אם אינך מעוניין לקבל מאיתנו עדכונים שוטפים והזמנות לאירועים עתידיים, ניתן להסיר את עצמך בלחיצה:
                                    </p>

                                    <a href="%unsubscribe_url%"
                                       style="color:#d4af37; text-decoration:underline; font-weight:600;">
                                        להסרה מרשימת התפוצה
                                    </a>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <!-- END Unsubscribe Block -->

            </table>

            <!-- Footer -->
            <table border="0" cellpadding="0" cellspacing="0" width="600" class="container">
                <tr>
                    <td align="center" style="padding: 20px 0; color:#555555; font-size:12px;">
                        © כל הזכויות שמורות לאופטיקה פריזמה<br>
                        הודעה זו נשלחה אוטומטית ממערכת ניהול האירועים
                    </td>
                </tr>
            </table>

        </td>
    </tr>
</table>

</body>
</html>
$p5body$,
  true,
  now()
);

-- event_registration_open — SMS
INSERT INTO crm_message_templates (tenant_id, slug, name, channel, language, subject, body, is_active, created_at) VALUES (
  '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid,
  'event_registration_open_sms_he',
  'הרשמה נפתחה — SMS',
  'sms',
  'he',
  NULL,
  $p5body$%name%, נפתחה ההרשמה ל-%event_name% שיתקיים ב-%event_date%.

הטבות האירוע מוגבלות ל-50 נרשמים בלבד - מומלץ לשריין מקום כעת לפני המעבר לרשימת המתנה.

💛 שימו לב: שריון המקום כרוך בדמי שריון של 50 ₪, שמקוזזים מהקנייה ביום האירוע (או מוחזרים בביטול עד 48 שעות לפני).

להרשמה: %registration_url%
להסרה: %unsubscribe_url%$p5body$,
  true,
  now()
);

-- event_registration_open — Email
INSERT INTO crm_message_templates (tenant_id, slug, name, channel, language, subject, body, is_active, created_at) VALUES (
  '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid,
  'event_registration_open_email_he',
  'הרשמה נפתחה — Email',
  'email',
  'he',
  $p5body$ההרשמה נפתחה: %event_name% - כל הפרטים 👇$p5body$,
  $p5body$<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>עדכון הרשמה לאירוע המותגים - אופטיקה פריזמה</title>
    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color:#000000; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }

        @media screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
            .event-box { padding: 20px !important; }
            .btn-main { width: 100% !important; display: block !important; box-sizing: border-box; }
        }
    </style>
</head>
<body style="margin:0; padding:0; background-color:#000000; direction:rtl;">

<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#000000; background-image: radial-gradient(circle at 50% 0%, #1a1a1a 0%, #000000 70%);">
    <tr>
        <td align="center" style="padding: 40px 0;">

            <table border="0" cellpadding="0" cellspacing="0" width="600" class="container" style="max-width:600px; background-color:#0a0a0a; border-radius:12px; overflow:hidden; border: 1px solid #222222; box-shadow: 0 10px 40px rgba(212, 175, 55, 0.1);">

                <tr>
                    <td height="4" style="background: linear-gradient(90deg, #000000 0%, #d4af37 50%, #000000 100%);"></td>
                </tr>

                <tr>
                    <td align="center" style="padding: 40px 0 20px 0;">
                        <p style="margin:0; color:#d4af37; font-size:24px; font-weight:bold; letter-spacing:4px; text-transform:uppercase; font-family: sans-serif;">PRIZMA OPTIC</p>
                        <p style="margin:5px 0 0 0; color:#666666; font-size:12px; letter-spacing:2px; text-transform:uppercase;">Luxury Eyewear Events</p>
                    </td>
                </tr>

                <tr>
                    <td class="mobile-padding" style="padding: 20px 50px 40px 50px; text-align:right;">

                        <h1 style="margin:0 0 15px 0; font-size:28px; font-weight:300; color:#ffffff; text-align:center;">
                            היי %name%, ההרשמה נפתחה 🕶️
                        </h1>

                        <p style="margin:0 0 25px 0; font-size:16px; line-height:1.7; color:#cccccc; text-align:center;">
                            ניתן להירשם כעת ל-<strong>%event_name%</strong>. <br>
                            כדי שנוכל להעניק לכל משתתף/ת שירות אישי ומקצועי, <br>
                            הרכישה בהטבות האירוע תתאפשר ל-50 מוזמנים בלבד שאושרו במערכת וקיבלו קופון אישי.
                        </p>

                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#111111; border: 1px solid #333333; border-radius: 8px; margin-bottom: 30px;">
                            <tr>
                                <td class="event-box" style="padding: 25px; border-right: 4px solid #d4af37;">
                                    <p style="margin:0 0 5px 0; font-size:12px; color:#d4af37; text-transform:uppercase; letter-spacing:1px;">
                                        פרטי האירוע
                                    </p>
                                    <p style="margin:0 0 15px 0; font-size:22px; font-weight:bold; color:#ffffff;">
                                        %event_name%
                                    </p>
                                    <table border="0" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td width="30" style="font-size:18px; padding-bottom:10px;">📅</td>
                                            <td style="font-size:16px; color:#ffffff; padding-bottom:10px;"><strong>יום שישי, %event_date%</strong></td>
                                        </tr>
                                        <tr>
                                            <td width="30" style="font-size:18px; padding-bottom:10px;">⏰</td>
                                            <td style="font-size:16px; color:#cccccc; padding-bottom:10px;">שעות הפעילות: %event_time%</td>
                                        </tr>
                                        <tr>
                                            <td width="30" style="font-size:18px;">📍</td>
                                            <td style="font-size:16px; color:#cccccc;">הרצל 32, אשקלון (יש חניה במקום)</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>

                       <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 35px; background-color: #161616; border-radius: 8px; border: 1px solid #222222;">
    <tr>
        <td style="padding: 20px;">
            <h3 style="margin:0 0 10px 0; font-size:16px; color:#d4af37;">מידע חשוב בנושא הרישום:</h3>
            <p style="margin:0 0 12px 0; color:#dddddd; font-size:14px; line-height:1.6;">
                • <strong>מומלץ להירשם כמה שיותר מוקדם:</strong> המערכת קולטת 50 משתתפים לאירוע. במידה והמכסה תתמלא, שאר הנרשמים יועברו אוטומטית לרשימת המתנה.
            </p>
            <p style="margin:0 0 12px 0; color:#dddddd; font-size:14px; line-height:1.6;">
                • <strong>שריון מקום באירוע:</strong> ההשתתפות באירוע כרוכה בדמי שריון מקום בסך <strong style="color:#E8D48B;">50 ₪</strong>, המקוזזים במלואם מהקנייה ביום האירוע (או מוחזרים בביטול עד 48 שעות לפני). <a href="https://prizma-optic.co.il/supersale-takanon/" style="color:#d4af37; text-decoration:underline;">פרטים בתקנון</a>.
            </p>
            <p style="margin:0; color:#aaaaaa; font-size:13px; line-height:1.5; font-style: italic;">
                *לידיעתכם: גם במידה והועברתם לרשימת ההמתנה, זה לא סופי ויכול להיות שניצור איתכם קשר במקרה של ביטולים.
            </p>
        </td>
    </tr>
</table>

                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                                <td align="center">
                                    <a href="%registration_url%" class="btn-main" style="display:inline-block; padding:20px 45px; background-color:#d4af37; color:#000000; font-size:17px; font-weight:bold; text-decoration:none; border-radius:4px; text-transform:uppercase; letter-spacing:0.5px; box-shadow: 0 8px 25px rgba(212, 175, 55, 0.2);">
                                        מעבר לטופס רישום לאירוע
                                    </a>
                                </td>
                            </tr>
                        </table>

                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 40px 0;">
                            <tr>
                                <td style="border-top: 1px solid #222222;"></td>
                            </tr>
                        </table>

                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                                <td align="center">
                                    <table border="0" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td style="padding: 0 8px;">
                                                <a href="https://prizma-optic.co.il/supersale/" style="display:inline-block; padding:10px 18px; background-color:transparent; color:#d4af37; border: 1px solid #d4af37; font-size:13px; font-weight:bold; text-decoration:none; border-radius:4px;">✨ עמוד האירוע</a>
                                            </td>
                                            <td style="padding: 0 8px;">
                                                <a href="https://www.instagram.com/optic_prizma/" style="display:inline-block; padding:10px 18px; background-color:transparent; color:#ffffff; border: 1px solid #444444; font-size:13px; font-weight:bold; text-decoration:none; border-radius:4px;">📸 אינסטגרם</a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>

                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 40px; border-top: 1px solid #222222;">
                            <tr>
                                <td style="padding-top: 20px;">
                                    <p style="margin:0; font-size:15px; color:#ffffff;">בברכה,</p>
                                    <p style="margin:5px 0 0 0; font-size:15px; color:#d4af37; font-weight:bold;">צוות אופטיקה פריזמה</p>
                                </td>
                            </tr>
                        </table>

                    </td>
                </tr>

                <tr>
                    <td align="center" style="padding: 18px 20px; border-top: 1px solid #111111; color:#555555; font-size:12px; line-height:1.6;">
                        <p style="margin:0 0 10px 0;">המייל נשלח אליך בעקבות הרשמתך למערכת עדכוני האירועים של אופטיקה פריזמה.</p>
                        <a href="%unsubscribe_url%" style="color:#666666; text-decoration:underline;">הסרה מרשימת התפוצה</a>
                    </td>
                </tr>

            </table>

            <table border="0" cellpadding="0" cellspacing="0" width="600" class="container">
                <tr>
                    <td align="center" style="padding: 20px 0; color:#444444; font-size:11px; line-height:1.6;">
                        © כל הזכויות שמורות לאופטיקה פריזמה | הרצל 32, אשקלון <br>
                        ההטבות מיועדות לנרשמים מראש בלבד. ההשתתפות בכפוף לאישור סופי וזמינות המלאי.
                    </td>
                </tr>
            </table>

        </td>
    </tr>
</table>

</body>
</html>$p5body$,
  true,
  now()
);

-- event_invite_new — SMS
INSERT INTO crm_message_templates (tenant_id, slug, name, channel, language, subject, body, is_active, created_at) VALUES (
  '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid,
  'event_invite_new_sms_he',
  'הזמנה לחדשים — SMS',
  'sms',
  'he',
  NULL,
  $p5body$אופטיקה פריזמה: ברוכים הבאים!
%name%, בדיוק הצטרפת ויש אירוע פתוח לרישום: %event_name% ב-%event_date%.

שימו לב: פתיחת ההרשמה אינה מבטיחה מקום. לאחר הרישום בקישור, נעדכן אם שוריין לכם מקום ב-50 הראשונים או שהועברתם לרשימת המתנה.

כ-3 ימים לפני האירוע ניצור קשר לווידוא הגעה ושליחת קופון ההטבות.

להרשמה ובדיקת סטטוס: %registration_url%

להסרה: %unsubscribe_url%$p5body$,
  true,
  now()
);

-- event_invite_new — Email
INSERT INTO crm_message_templates (tenant_id, slug, name, channel, language, subject, body, is_active, created_at) VALUES (
  '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid,
  'event_invite_new_email_he',
  'הזמנה לחדשים — Email',
  'email',
  'he',
  $p5body$ההרשמה פתוחה: %event_name% - נא אשרו הגעה$p5body$,
  $p5body$<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>הצטרפת בזמן הנכון - אופטיקה פריזמה</title>
    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color:#000000; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }

        @media screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
            .event-box { padding: 20px !important; }
            .btn { width: 100% !important; display: block !important; box-sizing: border-box; }
            .gift-img-cell { display: block !important; width: 100% !important; text-align: center !important; padding-left: 0 !important; padding-bottom: 15px !important; }
            .gift-text-cell { display: block !important; width: 100% !important; text-align: center !important; }
        }
    </style>
</head>
<body style="margin:0; padding:0; background-color:#000000; direction:rtl;">

<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#000000; background-image: radial-gradient(circle at 50% 0%, #1a1a1a 0%, #000000 70%);">
    <tr>
        <td align="center" style="padding: 40px 0;">

            <table border="0" cellpadding="0" cellspacing="0" width="600" class="container" style="max-width:600px; background-color:#0a0a0a; border-radius:12px; overflow:hidden; border: 1px solid #222222; box-shadow: 0 10px 40px rgba(212, 175, 55, 0.1);">

                <tr>
                    <td height="4" style="background: linear-gradient(90deg, #000000 0%, #d4af37 50%, #000000 100%);"></td>
                </tr>

                <tr>
                    <td align="center" style="padding: 40px 0 20px 0;">
                        <p style="margin:0; color:#d4af37; font-size:24px; font-weight:bold; letter-spacing:4px; text-transform:uppercase; font-family: sans-serif;">PRIZMA OPTIC</p>
                        <p style="margin:5px 0 0 0; color:#666666; font-size:12px; letter-spacing:2px; text-transform:uppercase;">Luxury Eyewear Events</p>
                    </td>
                </tr>

                <tr>
                    <td class="mobile-padding" style="padding: 20px 50px 40px 50px; text-align:right;">

                        <h1 style="margin:0 0 20px 0; font-size:28px; font-weight:300; color:#ffffff; text-align:center;">
                            הצטרפת בזמן הנכון, %name% 👋
                        </h1>

                        <p style="margin:0 0 30px 0; font-size:16px; line-height:1.7; color:#cccccc; text-align:center;">
                            בדיוק כשנרשמת למערכת, מצאנו עבורך אירוע מכירות פתוח לרישום מיידי!<br>
                            זה הזמן לבדוק זכאות להטבות האירוע הקרוב.
                        </p>

                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#111111; border: 1px solid #333333; border-radius: 8px; margin-bottom: 35px;">
                            <tr>
                                <td class="event-box" style="padding: 25px; border-right: 4px solid #d4af37;">
                                    <p style="margin:0 0 5px 0; font-size:12px; color:#d4af37; text-transform:uppercase; letter-spacing:1px;">
                                        האירוע הפתוח כעת
                                    </p>
                                    <p style="margin:0 0 10px 0; font-size:22px; font-weight:bold; color:#ffffff;">
                                        %event_name%
                                    </p>
                                    <table border="0" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td width="30" style="font-size:18px; padding-bottom:10px;">📅</td>
                                            <td style="font-size:16px; color:#ffffff; padding-bottom:10px;"><strong>יום שישי, %event_date%</strong></td>
                                        </tr>
                                        <tr>
                                            <td width="30" style="font-size:18px; padding-bottom:10px;">⏰</td>
                                            <td style="font-size:16px; color:#cccccc; padding-bottom:10px;">שעות הפעילות: %event_time%</td>
                                        </tr>
                                        <tr>
                                            <td width="30" style="font-size:18px;">📍</td>
                                            <td style="font-size:16px; color:#cccccc;">הרצל 32, אשקלון (יש חניה במקום)</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>

                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #161616; border-radius: 8px; border: 1px solid #222222; margin-bottom: 35px;">
                            <tr>
                                <td style="padding: 22px;">
                                    <h3 style="margin:0 0 12px 0; font-size:16px; color:#d4af37;">תהליך שריון המקום:</h3>
                                    <p style="margin:0 0 12px 0; color:#dddddd; font-size:14px; line-height:1.6;">
                                        1. <strong>רישום ראשוני:</strong> מלאו את הפרטים בקישור מטה. שימו לב: מכיוון שהאירוע כבר פתוח, המערכת תבדוק את זמינות המקום.
                                    </p>
                                    <p style="margin:0 0 12px 0; color:#dddddd; font-size:14px; line-height:1.6;">
                                        2. <strong>עדכון סטטוס:</strong> מיד לאחר הרישום, נעדכן אם שוריין לכם מקום ב-50 הראשונים או שהועברתם לרשימת המתנה.
                                    </p>
                                    <p style="margin:0 0 12px 0; color:#dddddd; font-size:14px; line-height:1.6;">
                                        3. <strong>ווידוא הגעה:</strong> כ-3 ימים לפני האירוע, נציג שלנו יבצע שיחת אימות מול הנרשמים שאושרו לצורך שליחת הקופון האישי.
                                    </p>
                                </td>
                            </tr>
                        </table>

                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                                <td align="center">
                                    <a href="%registration_url%" class="btn" style="display:inline-block; padding:18px 50px; background-color:#d4af37; color:#000000; font-size:17px; font-weight:bold; text-decoration:none; border-radius:4px; text-transform:uppercase; letter-spacing:0.5px; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.4);">
                                        בדיקת זכאות ורישום לאירוע
                                    </a>
                                </td>
                            </tr>
                        </table>

                        <p style="margin:15px 0 0 0; text-align:center; font-size:13px; color:#666666; line-height: 1.5;">
                            *מימוש הטבות האירוע (כולל מחירי אירוע והתחייבות למחיר) מותנה באישור סופי וקבלת קופון אישי.
                        </p>

                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 40px 0;">
                            <tr>
                                <td style="border-top: 1px solid #222222;"></td>
                            </tr>
                        </table>

                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#111111; border: 1px solid #333333; border-radius: 8px; margin-bottom: 30px;">
                            <tr>
                                <td style="padding: 20px;">
                                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                        <tr>
                                            <td width="110" valign="middle" class="gift-img-cell" style="padding-left: 20px;">
                                                <img src="https://prizma-optic.co.il/wp-content/uploads/2025/12/Box-Prizma-2-300x300.png" width="110" height="auto" style="display:block; border-radius:4px; border:1px solid #333;" alt="Gift Box">
                                            </td>
                                            <td valign="middle" class="gift-text-cell">
                                                <p style="margin:0 0 5px 0; font-size:16px; font-weight:bold; color:#ffffff;">
                                                    קונים מתנה? 🎁
                                                </p>
                                                <p style="margin:0; font-size:14px; color:#bbbbbb; line-height:1.5;">
                                                    עדכנו אותנו במעמד הקנייה ונדאג לאריזת מתנה יוקרתית ופתק החלפה.
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>

                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                                <td align="center">
                                    <table border="0" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td style="padding: 0 8px;">
                                                <a href="https://prizma-optic.co.il/supersale/" style="display:inline-block; padding:10px 18px; background-color:transparent; color:#d4af37; border: 1px solid #d4af37; font-size:13px; font-weight:bold; text-decoration:none; border-radius:4px;">✨ עמוד האירוע</a>
                                            </td>
                                            <td style="padding: 0 8px;">
                                                <a href="https://www.instagram.com/optic_prizma/" style="display:inline-block; padding:10px 18px; background-color:transparent; color:#ffffff; border: 1px solid #444444; font-size:13px; font-weight:bold; text-decoration:none; border-radius:4px;">📸 אינסטגרם</a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>

                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 40px; border-top: 1px solid #222222;">
                            <tr>
                                <td style="padding-top: 20px;">
                                    <p style="margin:0; font-size:15px; color:#ffffff;">בברכה,</p>
                                    <p style="margin:5px 0 0 0; font-size:15px; color:#d4af37; font-weight:bold;">צוות אופטיקה פריזמה</p>
                                </td>
                            </tr>
                        </table>

                    </td>
                </tr>

                <tr>
                    <td align="center" style="padding: 18px 20px; border-top: 1px solid #111111; color:#555555; font-size:12px; line-height:1.6;">
                        <p style="margin:0 0 10px 0;">המייל נשלח אליך בעקבות הרשמתך למערכת אירועי ה-VIP של אופטיקה פריזמה.</p>
                        <a href="%unsubscribe_url%" style="color:#666666; text-decoration:underline;">הסרה מרשימת התפוצה</a>
                    </td>
                </tr>

            </table>

            <table border="0" cellpadding="0" cellspacing="0" width="600" class="container">
                <tr>
                    <td align="center" style="padding: 20px 0; color:#555555; font-size:11px; line-height:1.6;">
                        © כל הזכויות שמורות לאופטיקה פריזמה | הרצל 32, אשקלון <br>
                        ההשתתפות מותנית באישור סופי וזמינות המלאי.
                    </td>
                </tr>
            </table>

        </td>
    </tr>
</table>

</body>
</html>$p5body$,
  true,
  now()
);

-- event_closed — SMS
INSERT INTO crm_message_templates (tenant_id, slug, name, channel, language, subject, body, is_active, created_at) VALUES (
  '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid,
  'event_closed_sms_he',
  'הרשמה נסגרה — SMS',
  'sms',
  'he',
  NULL,
  $p5body$היי %name%,
כל המקומות ל־%event_name% הקרוב נתפסו וההרשמה נסגרה.

ברגע שמתפנה מקום או נפתח אירוע נוסף - תקבל עדכון.

להסרה:
%unsubscribe_url%$p5body$,
  true,
  now()
);

-- event_closed — Email
INSERT INTO crm_message_templates (tenant_id, slug, name, channel, language, subject, body, is_active, created_at) VALUES (
  '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid,
  'event_closed_email_he',
  'הרשמה נסגרה — Email',
  'email',
  'he',
  $p5body$אירוע המכירות - ההרשמה נסגרה$p5body$,
  $p5body$<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>עדכון חשוב - ההרשמה נסגרה</title>
    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            background-color:#000000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        @media screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
        }
    </style>
</head>
<body style="margin:0; padding:0; background-color:#000000; direction:rtl;">

<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#000000; background-image: radial-gradient(circle at 50% 0%, #1a1a1a 0%, #000000 70%);">
    <tr>
        <td align="center" style="padding: 40px 0;">

            <table border="0" cellpadding="0" cellspacing="0" width="600" class="container" style="max-width:600px; background-color:#0a0a0a; border-radius:12px; overflow:hidden; border: 1px solid #222222; box-shadow: 0 10px 40px rgba(212, 175, 55, 0.10);">

                <!-- Gold Top Line -->
                <tr>
                    <td height="4" style="background: linear-gradient(90deg, #000000 0%, #d4af37 50%, #000000 100%);"></td>
                </tr>

                <!-- Header -->
                <tr>
                    <td align="center" style="padding: 40px 0 20px 0;">
                        <p style="margin:0; color:#d4af37; font-size:24px; font-weight:bold; letter-spacing:4px; text-transform:uppercase;">
                            PRIZMA OPTIC
                        </p>
                        <p style="margin:5px 0 0 0; color:#666666; font-size:12px; letter-spacing:2px; text-transform:uppercase;">
                            Luxury Eyewear Events
                        </p>
                    </td>
                </tr>

                <!-- Content -->
                <tr>
                    <td class="mobile-padding" style="padding: 20px 50px 40px 50px; text-align:right;">

                        <h1 style="margin:0 0 18px 0; font-size:26px; font-weight:300; color:#ffffff;">
                            שלום %name%,
                        </h1>

                        <p style="margin:0 0 14px 0; font-size:16px; line-height:1.7; color:#cccccc;">
                            עדכון קצר לגבי <strong style="color:#ffffff;">%event_name%</strong>:
                        </p>

                        <p style="margin:0 0 22px 0; font-size:15px; line-height:1.7; color:#bbbbbb;">
                            ההרשמה נסגרה לאחר שכל המקומות לאירוע הקרוב נתפסו.
                            אנחנו מקפידים על מספר משתתפים מוגבל כדי לשמור על חוויית קנייה ושירות ברמה הגבוהה ביותר.
                        </p>

                        <!-- Info Box -->
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#111111; border: 1px solid #333333; border-radius: 8px; margin-bottom: 22px;">
                            <tr>
                                <td style="padding: 22px; border-right: 4px solid #d4af37;">
                                    <p style="margin:0 0 6px 0; font-size:12px; color:#d4af37; letter-spacing:1px; text-transform:uppercase;">
                                        מה זה אומר עבורך
                                    </p>
                                    <p style="margin:0; font-size:15px; line-height:1.65; color:#dddddd;">
                                        <strong style="color:#ffffff;">נכנסת לרשימת ההמתנה.</strong><br>
                                        ברגע שמתפנה מקום או נפתח אירוע נוסף - תקבל עדכון.
                                    </p>
                                </td>
                            </tr>
                        </table>

                        <p style="margin:0 0 22px 0; font-size:14px; line-height:1.7; color:#999999;">
                            אין צורך לבצע שום פעולה בשלב זה.
                            אם ייפתח מקום, נשלח אליך הודעה עם קישור לאישור הגעה.
                        </p>

                        <!-- Soft Brand Reinforcement -->
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#0f0f0f; border: 1px solid #222222; border-radius: 8px; margin-bottom: 26px;">

                        </table>

                        <!-- Links -->
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 6px;">
                            <tr>
                                <td align="center" style="padding: 6px 0 0 0;">
                                    <p style="margin:0 0 14px 0; font-size:14px; color:#bbbbbb; letter-spacing:0.2px;">
                                        בינתיים אפשר להתרשם מהמותגים:
                                    </p>

                                    <!-- Buttons Row (Email-safe, table-based) -->
                                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto;">
                                        <tr>
                                            <!-- Event Page -->
                                            <td align="center" style="padding: 0 6px 10px 6px;">
                                                <a href="https://prizma-optic.co.il/supersale/" class="btn" style="display:inline-block; padding:12px 16px; background:#0f0f0f; color:#d4af37; border: 1px solid rgba(212,175,55,0.55); font-size:13px; font-weight:700; text-decoration:none; border-radius:999px; letter-spacing:0.3px; box-shadow: 0 6px 18px rgba(0,0,0,0.35);">
                                                    <span style="font-size:14px; line-height:1;">✨</span>&nbsp;עמוד האירוע
                                                </a>
                                            </td>

                                            <!-- Website -->
                                            <td align="center" style="padding: 0 6px 10px 6px;">
                                                <a href="https://prizma-optic.co.il/" class="btn" style="display:inline-block; padding:12px 16px; background:#0f0f0f; color:#d4af37; border: 1px solid rgba(212,175,55,0.55); font-size:13px; font-weight:700; text-decoration:none; border-radius:999px; letter-spacing:0.3px; box-shadow: 0 6px 18px rgba(0,0,0,0.35);">
                                                    <span style="font-size:14px; line-height:1;">🌐</span>&nbsp;אתר
                                                </a>
                                            </td>

                                            <!-- Instagram -->
                                            <td align="center" style="padding: 0 6px 10px 6px;">
                                                <a href="https://www.instagram.com/optic_prizma" class="btn" style="display:inline-block; padding:12px 16px; background:#0f0f0f; color:#d4af37; border: 1px solid rgba(212,175,55,0.55); font-size:13px; font-weight:700; text-decoration:none; border-radius:999px; letter-spacing:0.3px; box-shadow: 0 6px 18px rgba(0,0,0,0.35);">
                                                    <span style="font-size:14px; line-height:1;">📸</span>&nbsp;אינסטגרם
                                                </a>
                                            </td>
                                        </tr>
                                    </table>

                                    <!-- Sign Off -->
                                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 40px; border-top: 1px solid #222222;">
                                        <tr>
                                            <td style="padding-top: 20px;">
                                                <p style="margin:0; font-size:15px; color:#ffffff;">
                                                    בברכה,
                                                </p>
                                                <p style="margin:5px 0 0 0; font-size:15px; color:#d4af37; font-weight:bold;">
                                                    צוות אופטיקה פריזמה
                                                </p>
                                            </td>
                                        </tr>
                                    </table>

                                </td>
                            </tr>
                        </table>

                    </td>
                </tr>

                    <!-- Unsubscribe Block (ADDED HERE) -->
                    <tr>
                        <td align="center" style="padding: 18px 20px; color:#777777; font-size:12px; line-height:1.6;">
                            <p style="margin:0 0 6px 0;">
                                קיבלת את המייל הזה כחלק מרשימת עדכוני אירועי המכירות של אופטיקה פריזמה.
                            </p>
                            <p style="margin:0 0 10px 0;">
                                אם אינך מעוניין לקבל מאיתנו עדכונים שוטפים והזמנות לאירועים עתידיים, ניתן להסיר את עצמך בלחיצה:
                            </p>

                            <a href="%unsubscribe_url%"
                               style="color:#d4af37; text-decoration:underline; font-weight:600;">
                                להסרה מרשימת התפוצה
                            </a>
                        </td>
                    </tr>
                    <!-- END Unsubscribe Block -->


            </table>

            <!-- Footer -->
            <table border="0" cellpadding="0" cellspacing="0" width="600" class="container">
                <tr>
                    <td align="center" style="padding: 20px 0; color:#555555; font-size:12px;">
                        © כל הזכויות שמורות לאופטיקה פריזמה<br>
                        הודעה זו נשלחה אוטומטית ממערכת ניהול האירועים
                    </td>
                </tr>
            </table>

        </td>
    </tr>
</table>

</body>
</html>$p5body$,
  true,
  now()
);

-- event_waiting_list — SMS
INSERT INTO crm_message_templates (tenant_id, slug, name, channel, language, subject, body, is_active, created_at) VALUES (
  '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid,
  'event_waiting_list_sms_he',
  'רשימת המתנה — SMS',
  'sms',
  'he',
  NULL,
  $p5body$%name%, עדכון בנוגע ל-%event_name% ב-%event_date%.

מכסת הרישום הראשונית לאירוע הושלמה, אולם ניתן עדיין להצטרף לרשימת המתנה. שלב התיאום הסופי מול הנרשמים יתקיים כ-3 ימים לפני האירוע, ועשוי לפנות מקומות על בסיס עדכונים ברשימת המוזמנים.

להרשמה ובדיקת זכאות: %registration_url%

להסרה: %unsubscribe_url%$p5body$,
  true,
  now()
);

-- event_waiting_list — Email
INSERT INTO crm_message_templates (tenant_id, slug, name, channel, language, subject, body, is_active, created_at) VALUES (
  '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid,
  'event_waiting_list_email_he',
  'רשימת המתנה — Email',
  'email',
  'he',
  $p5body$עדכון סטטוס רישום: אירוע המותגים %event_name% הגיע למכסה הראשונית$p5body$,
  $p5body$<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>עדכון רישום - אופטיקה פריזמה</title>
    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color:#000000; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }

        @media screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
            .event-box { padding: 25px 20px !important; }
            .btn { width: 100% !important; display: block !important; box-sizing: border-box; }
        }
    </style>
</head>
<body style="margin:0; padding:0; background-color:#000000; direction:rtl;">

<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#000000; background-image: radial-gradient(circle at 50% 0%, #1a1a1a 0%, #000000 70%);">
    <tr>
        <td align="center" style="padding: 40px 0;">

            <table border="0" cellpadding="0" cellspacing="0" width="600" class="container" style="max-width:600px; background-color:#0a0a0a; border-radius:12px; overflow:hidden; border: 1px solid #222222; box-shadow: 0 10px 40px rgba(212, 175, 55, 0.1);">

                <tr>
                    <td height="4" style="background: linear-gradient(90deg, #000000 0%, #d4af37 50%, #000000 100%);"></td>
                </tr>

                <tr>
                    <td align="center" style="padding: 40px 0 25px 0;">
                        <p style="margin:0; color:#d4af37; font-size:24px; font-weight:bold; letter-spacing:4px; text-transform:uppercase;">PRIZMA OPTIC</p>
                        <p style="margin:5px 0 0 0; color:#666666; font-size:12px; letter-spacing:2px; text-transform:uppercase;">Luxury Eyewear Events</p>
                    </td>
                </tr>

                <tr>
                    <td class="mobile-padding" style="padding: 20px 50px 40px 50px; text-align:right;">

                        <h1 style="margin:0 0 25px 0; font-size:28px; font-weight:300; color:#ffffff; text-align:center;">
                            שלום %name%,
                        </h1>

                        <p style="margin:0 0 35px 0; font-size:16px; line-height:1.7; color:#cccccc; text-align:center;">
                            אנו מעדכנים כי מכסת הרישום הראשונית עבור האירוע <strong>%event_name%</strong> בתאריך %event_date% הושלמה במלואה.
                        </p>

                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#111111; border: 1px solid #333333; border-radius: 8px; margin-bottom: 35px;">
                            <tr>
                                <td style="padding: 25px; border-right: 4px solid #d4af37;">
                                    <h3 style="margin:0 0 12px 0; font-size:17px; color:#d4af37;">שריון מקום על בסיס מקום פנוי</h3>
                                    <p style="margin:0 0 15px 0; color:#dddddd; font-size:14px; line-height:1.6;">
                                        על מנת לשמור על רמת שירות VIP, אנו מגבילים את מספר המשתתפים ל-50 בכל אירוע. יחד עם זאת, ניתן עדיין להצטרף לרשימת ההמתנה המנוהלת שלנו.
                                    </p>
                                    <p style="margin:0 0 15px 0; color:#dddddd; font-size:14px; line-height:1.6;">
                                        <strong>שלב התיאום הסופי:</strong> כ-3 ימים לפני האירוע, נבצע אימות הגעה מול הנרשמים.
                                    </p>
                                    <p style="margin:0; color:#dddddd; font-size:14px; line-height:1.6;">
                                        במידה ויתפנו מקומות לאור ביטולים או עדכונים ברשימה, נפתח את הזכאות להטבות עבור הממתינים לפי סדר הרישום.
                                    </p>
                                </td>
                            </tr>
                        </table>

                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                                <td align="center">
                                    <a href="%registration_url%" class="btn" style="display:inline-block; padding:18px 45px; background-color:#d4af37; color:#000000; font-size:16px; font-weight:bold; text-decoration:none; border-radius:4px; text-transform:uppercase; letter-spacing:0.5px; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.2);">
                                        להרשמה ובדיקת זכאות
                                    </a>
                                </td>
                            </tr>
                        </table>

                        <p style="margin:20px 0 0 0; text-align:center; font-size:13px; color:#777777;">
                            *מימוש הטבות האירוע (מחירי אירוע והתחייבות למחיר) מותנה באישור הגעה סופי וקבלת קופון אישי.
                        </p>

                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 40px; border-top: 1px solid #222222;">
                            <tr>
                                <td style="padding-top: 25px; text-align:right;">
                                    <p style="margin:0; font-size:15px; color:#ffffff;">בברכה,</p>
                                    <p style="margin:5px 0 0 0; font-size:15px; color:#d4af37; font-weight:bold;">צוות אופטיקה פריזמה</p>
                                </td>
                            </tr>
                        </table>

                    </td>
                </tr>

                <tr>
                    <td align="center" style="padding: 20px; color:#555555; font-size:12px; border-top: 1px solid #1a1a1a;">
                        <a href="%unsubscribe_url%" style="color:#666666; text-decoration:underline;">להסרה מרשימת התפוצה</a>
                    </td>
                </tr>

            </table>

            <table border="0" cellpadding="0" cellspacing="0" width="600" class="container">
                <tr>
                    <td align="center" style="padding: 20px 0; color:#444444; font-size:11px; line-height:1.6;">
                        © כל הזכויות שמורות לאופטיקה פריזמה | הרצל 32, אשקלון <br>
                        ההשתתפות בכפוף לאישור סופי וזמינות המלאי ביום האירוע.
                    </td>
                </tr>
            </table>

        </td>
    </tr>
</table>

</body>
</html>$p5body$,
  true,
  now()
);

-- event_2_3d_before — SMS
INSERT INTO crm_message_templates (tenant_id, slug, name, channel, language, subject, body, is_active, created_at) VALUES (
  '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid,
  'event_2_3d_before_sms_he',
  '2-3 ימים לפני האירוע — SMS',
  'sms',
  'he',
  NULL,
  $p5body$היי %name% 👋

האירוע שלנו ב-%event_date% מתקרב - מחכים לראות אותך!

המקום שלך שמור והקופון האישי כבר אצלך במייל. כל מה שצריך זה להגיע עם הקופון לסניף בהרצל 32, אשקלון.

חלו שינויים בתכניות? אין בעיה - אפשר לבטל עד 48 שעות לפני האירוע (טלפון או וואטסאפ) ולקבל החזר מלא של דמי השריון. ככה נוכל להעניק את המקום למישהו מרשימת ההמתנה.

נתראה בקרוב 💛
צוות אופטיקה פריזמה

להסרה: %unsubscribe_url%$p5body$,
  true,
  now()
);

-- event_2_3d_before — Email
INSERT INTO crm_message_templates (tenant_id, slug, name, channel, language, subject, body, is_active, created_at) VALUES (
  '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid,
  'event_2_3d_before_email_he',
  '2-3 ימים לפני האירוע — Email',
  'email',
  'he',
  $p5body$%name%, האירוע מתקרב - הכל מוכן 💛$p5body$,
  $p5body$<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>תזכורת לאירוע - אופטיקה פריזמה</title>
    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color:#000000; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }

        @media screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
            .event-box { padding: 20px !important; }
            .btn { width: 100% !important; display: block !important; box-sizing: border-box; }
        }
    </style>
</head>
<body style="margin:0; padding:0; background-color:#000000; direction:rtl;">

<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#000000; background-image: radial-gradient(circle at 50% 0%, #1a1a1a 0%, #000000 70%);">
    <tr>
        <td align="center" style="padding: 40px 0;">

            <table border="0" cellpadding="0" cellspacing="0" width="600" class="container" style="max-width:600px; background-color:#0a0a0a; border-radius:12px; overflow:hidden; border: 1px solid #222222; box-shadow: 0 10px 40px rgba(212, 175, 55, 0.1);">

                <tr>
                    <td height="4" style="background: linear-gradient(90deg, #000000 0%, #d4af37 50%, #000000 100%);"></td>
                </tr>

                <tr>
                    <td align="center" style="padding: 40px 0 20px 0;">
                        <p style="margin:0; color:#d4af37; font-size:24px; font-weight:bold; letter-spacing:4px; text-transform:uppercase; font-family: sans-serif;">PRIZMA OPTIC</p>
                        <p style="margin:5px 0 0 0; color:#666666; font-size:12px; letter-spacing:2px; text-transform:uppercase;">Luxury Eyewear Events</p>
                    </td>
                </tr>

                <tr>
                    <td class="mobile-padding" style="padding: 20px 50px 40px 50px; text-align:right;">

                        <h1 style="margin:0 0 20px 0; font-size:28px; font-weight:300; color:#ffffff; text-align:center;">
                            היי %name% 👋
                        </h1>

                        <p style="margin:0 0 30px 0; font-size:16px; line-height:1.7; color:#cccccc; text-align:center;">
                            האירוע שלנו בתאריך <strong style="color:#E8D48B;">%event_date%</strong> מתקרב — מחכים לראות אותך! 💛
                        </p>

                        <!-- ═══ READY TO GO BOX ═══ -->
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#0d1a0d; border: 1px solid #25D366; border-radius: 8px; margin-bottom: 30px;">
                            <tr>
                                <td class="event-box" style="padding: 25px; text-align:center;">
                                    <p style="margin:0 0 12px 0; font-size:18px; font-weight:bold; color:#7CFC9A;">
                                        ✓ הכל מוכן לאירוע
                                    </p>
                                    <p style="margin:0; font-size:15px; color:#cccccc; line-height:1.7;">
                                        המקום שלך <strong style="color:#ffffff;">שוריין בהצלחה</strong><br>
                                        הקופון האישי שלך <strong style="color:#ffffff;">כבר נשלח אלייך למייל</strong><br>
                                        כל מה שצריך זה להגיע עם הקופון לסניף ביום האירוע
                                    </p>
                                </td>
                            </tr>
                        </table>

                        <!-- ═══ EVENT DETAILS ═══ -->
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#111111; border: 1px solid #333333; border-radius: 8px; margin-bottom: 25px;">
                            <tr>
                                <td style="padding: 20px; border-right: 4px solid #d4af37;">
                                    <p style="margin:0 0 10px 0; font-size:12px; color:#d4af37; text-transform:uppercase; letter-spacing:1px;">
                                        תזכורת — פרטי האירוע
                                    </p>
                                    <table border="0" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td width="25" style="font-size:16px; padding-bottom:8px;">📅</td>
                                            <td style="font-size:16px; color:#cccccc; padding-bottom:8px;">%event_date%</td>
                                        </tr>
                                        <tr>
                                            <td width="25" style="font-size:16px; padding-bottom:8px;">⏰</td>
                                            <td style="font-size:16px; color:#cccccc; padding-bottom:8px;">שעות הפעילות: %event_time%</td>
                                        </tr>
                                        <tr>
                                            <td width="25" style="font-size:16px;">📍</td>
                                            <td style="font-size:16px; color:#cccccc;">הרצל 32, אשקלון (יש חניה במקום)</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>

                        <div style="text-align:center; margin-bottom: 30px;">
                            <a href="https://waze.com/ul/hsv8s5h2c3" style="display:inline-block; padding:10px 25px; background-color:#1e1e1e; color:#d4af37; border: 1px solid #d4af37; text-decoration:none; border-radius:50px; font-weight:bold; font-size:14px;">
                                🚗 נווט עם Waze
                            </a>
                        </div>

                        <!-- ═══ CANCELLATION POLICY (warm tone) ═══ -->
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px; border: 1px solid #333333; border-radius: 8px;">
                            <tr>
                                <td style="padding: 20px; background-color: #111111;">
                                    <p style="margin:0 0 10px 0; font-size:15px; font-weight:bold; color:#ffffff;">
                                        חלו שינויים בתכניות?
                                    </p>
                                    <p style="margin:0 0 10px 0; font-size:14px; color:#bbbbbb; line-height:1.7;">
                                        אין בעיה — אפשר לבטל את ההגעה <strong style="color:#7CFC9A;">עד 48 שעות לפני האירוע</strong> ולקבל החזר מלא של דמי שריון המקום.
                                    </p>
                                    <p style="margin:0; font-size:13px; color:#999999; line-height:1.6;">
                                        ככה נוכל להעניק את המקום למישהו מרשימת ההמתנה. תודה מראש על העדכון 💛
                                    </p>
                                    <p style="margin:14px 0 0 0; font-size:13px; color:#cccccc;">
                                        📞 <a href="tel:086751313" style="color:#d4af37; text-decoration:none;">08-6751313</a> &nbsp;|&nbsp;
                                        💬 <a href="https://wa.me/972533645404" style="color:#d4af37; text-decoration:none;">וואטסאפ 053-3645404</a>
                                    </p>
                                </td>
                            </tr>
                        </table>

                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #222222;">
                            <tr>
                                <td style="padding-top: 20px; text-align:right;">
                                    <p style="margin:0; font-size:15px; color:#ffffff;">נתראה בקרוב 💛</p>
                                    <p style="margin:5px 0 0 0; font-size:15px; color:#d4af37; font-weight:bold;">צוות אופטיקה פריזמה</p>
                                </td>
                            </tr>
                        </table>

                    </td>
                </tr>

                <tr>
                    <td align="center" style="padding: 18px 20px; color:#777777; font-size:12px; line-height:1.6; border-top: 1px solid #1a1a1a;">
                        <a href="%unsubscribe_url%" style="color:#d4af37; text-decoration:underline; font-weight:600;">להסרה מרשימת התפוצה</a>
                    </td>
                </tr>

            </table>

            <table border="0" cellpadding="0" cellspacing="0" width="600" class="container">
                <tr>
                    <td align="center" style="padding: 20px 0; color:#555555; font-size:11px; line-height:1.6;">
                        © כל הזכויות שמורות לאופטיקה פריזמה | הרצל 32, אשקלון <br>
                        המחירים וההטבות בכפוף לתנאי האירוע וזמינות המלאי.
                    </td>
                </tr>
            </table>

        </td>
    </tr>
</table>

</body>
</html>$p5body$,
  true,
  now()
);

-- event_day — SMS
INSERT INTO crm_message_templates (tenant_id, slug, name, channel, language, subject, body, is_active, created_at) VALUES (
  '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid,
  'event_day_sms_he',
  'יום האירוע — SMS',
  'sms',
  'he',
  NULL,
  $p5body$בוקר טוב %name%, היום זה קורה ☀️
מחכים לך ב- %event_time% | הרצל 32, אשקלון (יש חניה)

🚗 לניווט מהיר עם וייז: https://waze.com/ul/hsv8s5h2c3

נתראה!
צוות אופטיקה פריזמה 💛

להסרה:
%unsubscribe_url%$p5body$,
  true,
  now()
);

-- event_day — Email
INSERT INTO crm_message_templates (tenant_id, slug, name, channel, language, subject, body, is_active, created_at) VALUES (
  '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid,
  'event_day_email_he',
  'יום האירוע — Email',
  'email',
  'he',
  $p5body$%name%, היום זה קורה: מחכים לך באופטיקה פריזמה.$p5body$,
  $p5body$<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>היום זה קורה - אופטיקה פריזמה</title>
    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color:#000000; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }

        @media screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
            .btn { width: 100% !important; display: block !important; box-sizing: border-box; }
        }
    </style>
</head>
<body style="margin:0; padding:0; background-color:#000000; direction:rtl;">

<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#000000; background-image: radial-gradient(circle at 50% 0%, #1a1a1a 0%, #000000 70%);">
    <tr>
        <td align="center" style="padding: 40px 0;">

            <table border="0" cellpadding="0" cellspacing="0" width="600" class="container" style="max-width:600px; background-color:#0a0a0a; border-radius:12px; overflow:hidden; border: 1px solid #222222; box-shadow: 0 10px 40px rgba(212, 175, 55, 0.1);">

                <tr>
                    <td height="4" style="background: linear-gradient(90deg, #000000 0%, #d4af37 50%, #000000 100%);"></td>
                </tr>

                <tr>
                    <td align="center" style="padding: 35px 0 20px 0;">
                        <p style="margin:0; color:#d4af37; font-size:24px; font-weight:bold; letter-spacing:4px; text-transform:uppercase;">PRIZMA OPTIC</p>
                        <p style="margin:5px 0 0 0; color:#666666; font-size:12px; letter-spacing:2px; text-transform:uppercase;">Luxury Eyewear Events</p>
                    </td>
                </tr>

                <tr>
                    <td class="mobile-padding" style="padding: 20px 50px 40px 50px; text-align:center;">

                        <h1 style="margin:0 0 15px 0; font-size:32px; font-weight:300; color:#ffffff;">
                            בוקר טוב %name%, היום זה קורה ☀️
                        </h1>

                        <p style="margin:0 0 30px 0; font-size:17px; line-height:1.7; color:#cccccc;">
                            הצוות שלנו ערוך ומחכה לך עם הקולקציות החדשות <br>
                            וכל הטבות האירוע המיוחדות ששוריינו עבורך.
                        </p>

                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#111111; border: 1px solid #333333; border-radius: 8px; margin-bottom: 30px;">
                            <tr>
                                <td style="padding: 25px; text-align:right; border-right: 4px solid #d4af37;">
                                    <table border="0" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td width="35" style="font-size:20px; padding-bottom:12px;">⏰</td>
                                            <td style="font-size:16px; color:#ffffff; padding-bottom:12px;"><strong>שעות האירוע: %event_time%</strong></td>
                                        </tr>
                                        <tr>
                                            <td width="35" style="font-size:20px; padding-bottom:12px;">📍</td>
                                            <td style="font-size:16px; color:#cccccc; padding-bottom:12px;">הרצל 32, אשקלון</td>
                                        </tr>
                                        <tr>
                                            <td width="35" style="font-size:20px;">🅿️</td>
                                            <td style="font-size:16px; color:#cccccc;">חניה בשפע צמוד לסניף</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>

                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px;">
                            <tr>
                                <td align="center">
                                    <a href="https://waze.com/ul/hsv8s5h2c3" class="btn" style="display:inline-block; padding:18px 55px; background-color:#d4af37; color:#000000; font-size:17px; font-weight:bold; text-decoration:none; border-radius:4px; text-transform:uppercase; letter-spacing:0.5px; box-shadow: 0 5px 20px rgba(212, 175, 55, 0.3);">
                                        🚗 נווט עכשיו עם Waze
                                    </a>
                                </td>
                            </tr>
                        </table>

                        <p style="margin:0 0 35px 0; font-size:14px; color:#888888; line-height:1.6;">
                            לתשומת לבך: המכירה מתבצעת על בסיס מלאי קיים. <br>
                            בשל המכסה המוגבלת של 50 קופונים בלבד, מומלץ להגיע בשעות המוקדמות כדי להבטיח בחירה מתוך המגוון המלא.
                        </p>

                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #222222;">
                            <tr>
                                <td style="padding-top: 25px; text-align:center;">
                                    <p style="margin:0; font-size:15px; color:#ffffff;">מחכים לך,</p>
                                    <p style="margin:5px 0 0 0; font-size:16px; color:#d4af37; font-weight:bold;">צוות אופטיקה פריזמה</p>
                                </td>
                            </tr>
                        </table>

                    </td>
                </tr>

                <tr>
                    <td align="center" style="padding: 20px; color:#555555; font-size:11px; border-top: 1px solid #1a1a1a;">
                        <a href="%unsubscribe_url%" style="color:#666666; text-decoration:underline;">להסרה מרשימת התפוצה</a>
                    </td>
                </tr>

            </table>

            <table border="0" cellpadding="0" cellspacing="0" width="600" class="container">
                <tr>
                    <td align="center" style="padding: 20px 0; color:#444444; font-size:11px; line-height:1.6;">
                        © כל הזכויות שמורות לאופטיקה פריזמה | הרצל 32, אשקלון <br>
                        מימוש ההטבות מותנה בהצגת הקופון האישי בסניף.
                    </td>
                </tr>
            </table>

        </td>
    </tr>
</table>

</body>
</html>$p5body$,
  true,
  now()
);

-- event_invite_waiting_list — SMS
INSERT INTO crm_message_templates (tenant_id, slug, name, channel, language, subject, body, is_active, created_at) VALUES (
  '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid,
  'event_invite_waiting_list_sms_he',
  'הזמנה מרשימת המתנה — SMS',
  'sms',
  'he',
  NULL,
  $p5body$%name%, לאור הביקוש נפתח מועד נוסף לאירוע המותגים.

נא לשים לב לפרטי המועד החדש:
📅 בתאריך: %event_date% | ⏰ שעות הפעילות: %event_time%

המכסה מוגבלת ל-50 המאשרים הראשונים. אם המועד אינו מתאים לך, אין צורך לבצע פעולה - מקומך ברשימת ההמתנה יישמר לעדכונים עתידיים במידה ויתפנה מקום בתאריך אליו נרשמת.

לאישור הגעה ושריון מקום: %registration_url%

להסרה: %unsubscribe_url%$p5body$,
  true,
  now()
);

-- event_invite_waiting_list — Email
INSERT INTO crm_message_templates (tenant_id, slug, name, channel, language, subject, body, is_active, created_at) VALUES (
  '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid,
  'event_invite_waiting_list_email_he',
  'הזמנה מרשימת המתנה — Email',
  'email',
  'he',
  $p5body$עדכון חשוב: נפתח מועד נוסף לאירוע המותגים של אופטיקה פריזמה$p5body$,
  $p5body$<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>תאריך נוסף לאירוע - אופטיקה פריזמה</title>
    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color:#000000; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }

        @media screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
            .btn { width: 100% !important; display: block !important; box-sizing: border-box; }
        }
    </style>
</head>
<body style="margin:0; padding:0; background-color:#000000; direction:rtl;">

<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#000000; background-image: radial-gradient(circle at 50% 0%, #1a1a1a 0%, #000000 70%);">
    <tr>
        <td align="center" style="padding: 40px 0;">

            <table border="0" cellpadding="0" cellspacing="0" width="600" class="container" style="max-width:600px; background-color:#0a0a0a; border-radius:12px; overflow:hidden; border: 1px solid #222222;">

                <tr>
                    <td height="4" style="background: linear-gradient(90deg, #000000 0%, #d4af37 50%, #000000 100%);"></td>
                </tr>

                <tr>
                    <td align="center" style="padding: 40px 0 25px 0;">
                        <p style="margin:0; color:#d4af37; font-size:24px; font-weight:bold; letter-spacing:4px;">PRIZMA OPTIC</p>
                        <p style="margin:5px 0 0 0; color:#666666; font-size:12px; letter-spacing:2px; text-transform:uppercase;">Luxury Eyewear Events</p>
                    </td>
                </tr>

                <tr>
                    <td class="mobile-padding" style="padding: 0 50px 40px 50px; text-align:right;">

                        <h1 style="margin:0 0 15px 0; font-size:26px; font-weight:300; color:#ffffff; text-align:center;">
                            היי %name%,
                        </h1>
                        <p style="margin:0 0 30px 0; font-size:16px; line-height:1.6; color:#cccccc; text-align:center;">
                            ראינו שיש עדיין רשימת המתנה ארוכה לאירוע המותגים הקרוב, אז החלטנו לפתוח תאריך נוסף כדי שתוכלו להגיע וליהנות מהמחירים המיוחדים שלנו.
                        </p>

                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#111111; border: 1px solid #333333; border-radius: 8px; margin-bottom: 30px;">
                            <tr>
                                <td style="padding: 25px; text-align:center;">
                                    <p style="margin:0 0 10px 0; font-size:14px; color:#d4af37; font-weight:bold;">שימו לב, זהו מועד חדש:</p>
                                    <p style="margin:0; font-size:20px; color:#ffffff; font-weight:bold;">
                                        יום שישי, ה-%event_date%
                                    </p>
                                    <p style="margin:5px 0 0 0; font-size:16px; color:#cccccc;">
                                        שעות הפעילות: %event_time%
                                    </p>
                                </td>
                            </tr>
                        </table>

                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px;">
                            <tr>
                                <td style="padding: 0; text-align:right;">
                                    <p style="margin:0 0 15px 0; font-size:15px; color:#bbbbbb; line-height:1.6;">
                                        גם לתאריך הזה הקצינו <strong>50 קופונים בלבד</strong>, והם יחולקו לראשונים שיאשרו הגעה בקישור כאן למטה.
                                    </p>
                                    <p style="margin:0; font-size:15px; color:#bbbbbb; line-height:1.6;">
                                        <strong>מה קורה אם התאריך החדש לא מתאים לכם?</strong> <br>
                                        הכל טוב. אין צורך לעשות כלום – המקום שלכם ברשימת ההמתנה המקורית נשמר בדיוק כמו שהוא, למקרה שיתפנה מקום בתאריך אליו נרשמתם בהתחלה.
                                    </p>
                                </td>
                            </tr>
                        </table>

                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 40px;">
                            <tr>
                                <td align="center">
                                    <a href="%registration_url%" class="btn" style="display:inline-block; padding:18px 50px; background-color:#d4af37; color:#000000; font-size:16px; font-weight:bold; text-decoration:none; border-radius:4px;">
                                        לאישור הגעה במועד החדש
                                    </a>
                                </td>
                            </tr>
                        </table>

                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #222222;">
                            <tr>
                                <td style="padding-top: 25px; text-align:right;">
                                    <p style="margin:0; font-size:15px; color:#ffffff;">נתראה,</p>
                                    <p style="margin:5px 0 0 0; font-size:15px; color:#d4af37; font-weight:bold;">צוות אופטיקה פריזמה</p>
                                </td>
                            </tr>
                        </table>

                    </td>
                </tr>

                <tr>
                    <td align="center" style="padding: 20px; color:#555555; font-size:11px; border-top: 1px solid #1a1a1a;">
                        <a href="%unsubscribe_url%" style="color:#666666; text-decoration:underline;">להסרה מרשימת התפוצה</a>
                    </td>
                </tr>

            </table>

            <table border="0" cellpadding="0" cellspacing="0" width="600" class="container">
                <tr>
                    <td align="center" style="padding: 20px 0; color:#444444; font-size:11px; line-height:1.6;">
                        © כל הזכויות שמורות לאופטיקה פריזמה | הרצל 32, אשקלון <br>
                        ההטבות והמחירים בכפוף לתנאי התקנון וזמינות המלאי.
                    </td>
                </tr>
            </table>

        </td>
    </tr>
</table>

</body>
</html>$p5body$,
  true,
  now()
);

COMMIT;

-- Verification queries (run post-commit):
--   SELECT count(*) FROM crm_message_templates WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid AND is_active = true; -- expect 20
--   SELECT slug, channel FROM crm_message_templates WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid AND body LIKE '%{{%'; -- expect 0 rows