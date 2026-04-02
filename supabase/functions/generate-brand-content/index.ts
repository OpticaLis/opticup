/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const CLAUDE_MODEL = "claude-sonnet-4-20250514";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonRes(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { brand_name, tenant_id, prompt, current_content } = await req.json();

    if (!brand_name || !tenant_id) {
      return jsonRes({ error: "Missing brand_name or tenant_id", success: false }, 400);
    }

    if (!ANTHROPIC_API_KEY) {
      return jsonRes({ error: "ANTHROPIC_API_KEY not configured", success: false }, 500);
    }

    const styleGuide = `
# Brand Content Guide — Optic Up

## Structure
- Tagline: 1 sentence in Hebrew about the brand essence
- Description Part 1 (3 paragraphs): Brand heritage, design philosophy, what makes it special
- Description Part 2 (3 paragraphs): Why buy at Prizma — general service description, no specific commitments
- SEO Title format: "משקפי {brand Hebrew} {brand English} — משקפי שמש ומסגרות ראייה | אופטיקה פריזמה"
- SEO Description: ~155 chars with brand keywords

## Rules
- Professional but warm Hebrew tone
- Must include: "משקפי {brand}", "משקפי שמש של {brand}", "מסגרות ראייה של {brand}"
- No prices, no competitor comparisons, no specific commitments or promises
- Last 3 paragraphs about Prizma service — general, warm, professional
- Each paragraph wrapped in <p> tags

## Approved Example: Gucci
Tagline: "יוקרה איטלקית מפירנצה מאז 1921."

Part 1:
<p>מותג משקפי גוצ'י Gucci הוא חלק בלתי נפרד מהמורשת האיטלקית של בית האופנה שנוסד בשנת 1921 בפירנצה על ידי גוצ'יו גוצ'י. מאז הקמתו, הפך Gucci לאחד מבתי האופנה המזוהים ביותר בעולם עם איכות, עיצוב נועז וסטייל עילית. קולקציית המשקפיים של גוצ'י משקפת את אותה תפיסה אסתטית – שילוב בין מסורת איטלקית עשירה לבין חדשנות עיצובית ויצירתית.</p>
<p>במהלך השנים נבנו קולקציות המשקפיים של Gucci Eyewear סביב רעיונות של זהות, אופנה ואומנות. המותג מתאפיין ביכולת יוצאת דופן לחדש תוך שמירה על שורשיו: אלמנטים המזוהים עם בית האופנה – כמו פסי הירוק־אדום הקלאסיים, לוגו GG המוזהב ודגמים בהשראת עולם הרטרו – משתלבים בקולקציות מודרניות עם חומרים מתקדמים כמו אצטט, טיטניום ומתכת קלה.</p>
<p>העיצוב של משקפי גוצ'י Gucci נודע בשילוב בין דרמה, אלגנטיות ויצירתיות, והוא מייצג את ה־DNA של בית האופנה: אקספרסיביות, יוקרה ופרשנות עכשווית למושג "קלאסי".</p>

Part 2:
<p>באופטיקה פריזמה תמצאו מבחר רחב של משקפי גוצ'י Gucci — משקפי שמש של גוצ'י לנשים ולגברים, מסגרות ראייה של גוצ'י בכל הסגנונות, ודגמים ייחודיים מהקולקציות העדכניות ביותר של Gucci Eyewear.</p>
<p>אנחנו מאמינים שבחירת משקפי גוצ'י היא חוויה — לא רק קנייה. לכן אנחנו מציעים ייעוץ מקצועי, התאמה אישית של המסגרת, ואפשרות להתקנת עדשות מותאמות במעבדה שלנו.</p>
<p>כשאתם בוחרים משקפי גוצ'י Gucci באופטיקה פריזמה, אתם נהנים משילוב של מותג יוקרה עולמי עם שירות אישי ומקצועי שמלווה אתכם מהבחירה ועד ההתאמה הסופית.</p>
`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: prompt && current_content
              ? `${styleGuide}

---

Brand: ${brand_name}

Current content:
- Tagline: ${current_content.tagline || '(empty)'}
- Description Part 1: ${current_content.description1 || '(empty)'}
- Description Part 2: ${current_content.description2 || '(empty)'}
- SEO Title: ${current_content.seo_title || '(empty)'}
- SEO Description: ${current_content.seo_description || '(empty)'}

User instruction: ${prompt}

Modify the content according to the user's instruction. Return ONLY a JSON object (no markdown, no backticks) with ALL fields, even those not changed:
{
  "tagline": "...",
  "description1": "...",
  "description2": "...",
  "seo_title": "...",
  "seo_description": "..."
}
Keep HTML <p> tags in descriptions. Follow the style guide.`
              : `${styleGuide}

---

Generate brand page content for: ${brand_name}

Return ONLY a JSON object (no markdown, no backticks) with these fields:
{
  "tagline": "one sentence tagline in Hebrew",
  "description1": "<p>paragraph 1</p><p>paragraph 2</p><p>paragraph 3</p>",
  "description2": "<p>paragraph about Prizma 1</p><p>paragraph about Prizma 2</p><p>paragraph about Prizma 3</p>",
  "seo_title": "משקפי {Hebrew name} {English name} — משקפי שמש ומסגרות ראייה | אופטיקה פריזמה",
  "seo_description": "155 chars max SEO description with brand keywords"
}

Follow the style guide EXACTLY. Match the Gucci example tone and structure. Use REAL facts about ${brand_name} — founding year, country, design philosophy, signature elements. The Part 2 (description2) must be about why buy at Prizma, adapted with the brand name.`,
          },
        ],
      }),
    });

    const aiResponse = await response.json();
    const contentText = aiResponse.content?.[0]?.text || "";

    let parsed;
    try {
      const cleanJson = contentText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      parsed = JSON.parse(cleanJson);
    } catch (_e) {
      return jsonRes(
        { error: "Failed to parse AI response", raw: contentText, success: false },
        500
      );
    }

    // Log the generation to brand_content_log
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: brand } = await supabaseAdmin
      .from("brands")
      .select("id")
      .ilike("name", `%${brand_name}%`)
      .eq("tenant_id", tenant_id)
      .single();

    if (brand) {
      const fields = ["tagline", "description1", "description2", "seo_title", "seo_description"];
      const fieldMap: Record<string, string> = {
        tagline: "brand_description_short",
        description1: "brand_description_part1",
        description2: "brand_description_part2",
        seo_title: "seo_title",
        seo_description: "seo_description",
      };

      for (const field of fields) {
        await supabaseAdmin.from("brand_content_log").insert({
          tenant_id,
          brand_id: brand.id,
          field_name: fieldMap[field] || field,
          ai_generated: parsed[field],
          status: "generated",
        });
      }
    }

    return jsonRes({ success: true, ...parsed });
  } catch (error) {
    return jsonRes({ error: (error as Error).message, success: false }, 500);
  }
});
