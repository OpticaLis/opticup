-- Migration 065: Insert /קופח-כללית/ page for Prizma tenant
-- WordPress parity: Kupat Cholim Clalit benefits guide page
-- Safe to re-run: ON CONFLICT DO UPDATE
-- Applied via Supabase MCP on 2026-04-15 (MODULE_3_CLOSEOUT SPEC)

INSERT INTO storefront_pages (
  tenant_id, slug, title, status, page_type, lang, updated_via,
  meta_title, meta_description, blocks
) VALUES (
  (SELECT id FROM tenants WHERE slug = 'prizma'),
  '/קופח-כללית/',
  'חברי כללית מושלם פלטינום? מגיע לכם משקפיים',
  'published',
  'guide',
  'he',
  'seed',
  'זכאות כללית מושלם פלטינום למשקפיים | אופטיקה פריזמה אשקלון',
  'חברי כללית מושלם פלטינום? מגיע לכם זכאות למשקפי ראייה לכל המשפחה. בדיקת ראייה, מסגרת ועדשות. אופטיקה פריזמה אשקלון.',
  '[{"id":"klalit-hero","type":"hero","data":{"title":"חברי כללית מושלם פלטינום?","subtitle":"מגיע לכם זכאות למשקפיים לכל המשפחה ילדים ומבוגרים!","cta_text":"שיחה עם נציג – בלחיצה אחת","cta_url":"https://wa.me/972533645404?text=היי, אני חבר/ת כללית מושלם פלטינום ומעוניין/ת לממש את הזכאות למשקפיים","cta_style":"gold"},"settings":{}},{"id":"klalit-benefits","type":"text","data":{"title":"מה בדיוק מגיע לכם במסגרת ההטבה?","body":"<ul><li>✓ זוג משקפי ראייה חדשים — מסגרת + עדשות לפי מרשם</li><li>✓ בדיקת ראייה מקיפה ע\"י אופטומטריסט מוסמך</li><li>✓ ברוב המקרים המשקפיים מוכנים תוך כ30 דקות</li><li>✓ 100% אחריות להסתגלות</li></ul>"},"settings":{"padding":"py-12 md:py-16"}},{"id":"klalit-cta","type":"cta","data":{"text":"בדקו זכאות עכשיו - אל תפספסו!","url":"https://wa.me/972533645404?text=היי, אני רוצה לבדוק את הזכאות שלי","style":"gold"},"settings":{"padding":"py-10 md:py-14"}}]'::jsonb
)
ON CONFLICT (tenant_id, slug, lang) DO UPDATE SET
  title = EXCLUDED.title, status = EXCLUDED.status, page_type = EXCLUDED.page_type,
  updated_via = EXCLUDED.updated_via, meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description, blocks = EXCLUDED.blocks,
  updated_at = now();
