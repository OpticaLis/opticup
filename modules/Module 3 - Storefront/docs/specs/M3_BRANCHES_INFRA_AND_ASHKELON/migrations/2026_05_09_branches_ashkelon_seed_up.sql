-- Migration: 2026_05_09_branches_ashkelon_seed_up
-- SPEC: M3_BRANCHES_INFRA_AND_ASHKELON §2 (Daniel-provided data)
-- Purpose: seed prizma's first branch — Ashkelon (פריזמה אשקלון).
-- L-PROJECT-002 compliance: hours + gallery use jsonb_build_array, not
--   text-replace.

INSERT INTO public.tenant_branches (
  tenant_id, slug, display_order,
  name_he, name_en, name_ru,
  street_he, street_en, street_ru,
  city_he, city_en, city_ru,
  postal_code, country_code,
  region_he, region_en, region_ru,
  phone, whatsapp_e164,
  latitude, longitude,
  hours,
  google_business_url, waze_url,
  intro_he,
  gallery,
  status, updated_by
)
VALUES (
  '6ad0781b-37f0-47a9-92e3-be9ed1477e1c',
  'ashkelon',
  10,
  'אופטיקה פריזמה אשקלון',
  'Prizma Optic Ashkelon',
  'Оптика Призма Ашкелон',
  'הרצל 32',
  'Herzl 32',
  'Герцль 32',
  'אשקלון',
  'Ashkelon',
  'Ашкелон',
  '7860131',
  'IL',
  'מחוז דרום',
  'Southern District',
  'Южный округ',
  '053-364-5404',
  '+972533645404',
  31.668800,
  34.574300,
  -- Schema.org openingHoursSpecification — multi-entry per day for breaks.
  -- Sunday: 09:00-13:00 + 16:00-19:00 (afternoon break)
  -- Monday: 09:00-13:00 + 16:00-19:00
  -- Tuesday: 09:00-13:00 ONLY (no afternoon)
  -- Wednesday: 09:00-13:00 + 16:00-19:00
  -- Thursday: 09:00-13:00 + 16:00-19:00
  -- Friday: 09:00-13:00
  -- Saturday: closed
  jsonb_build_array(
    jsonb_build_object('day','Sunday',   'opens','09:00','closes','13:00'),
    jsonb_build_object('day','Sunday',   'opens','16:00','closes','19:00'),
    jsonb_build_object('day','Monday',   'opens','09:00','closes','13:00'),
    jsonb_build_object('day','Monday',   'opens','16:00','closes','19:00'),
    jsonb_build_object('day','Tuesday',  'opens','09:00','closes','13:00'),
    jsonb_build_object('day','Wednesday','opens','09:00','closes','13:00'),
    jsonb_build_object('day','Wednesday','opens','16:00','closes','19:00'),
    jsonb_build_object('day','Thursday', 'opens','09:00','closes','13:00'),
    jsonb_build_object('day','Thursday', 'opens','16:00','closes','19:00'),
    jsonb_build_object('day','Friday',   'opens','09:00','closes','13:00')
  ),
  'https://share.google/hul3Tg8QJ8pvRp8RW',
  'https://waze.com/ul?ll=31.6688,34.5743&navigate=yes',
  'בסניף הרצל 32 באשקלון תמצאו את אותה הקפדה של אופטיקה פריזמה — קולקציות נבחרות, מעבדה במקום ובדיקות ראייה מקצועיות.',
  jsonb_build_array(
    '/api/image/media/6ad0781b-37f0-47a9-92e3-be9ed1477e1c/general/IMG-20241230-WA0094_1775230229252.webp',
    '/api/image/media/6ad0781b-37f0-47a9-92e3-be9ed1477e1c/general/IMG-20241230-WA0096_1775230678239.webp',
    '/api/image/media/6ad0781b-37f0-47a9-92e3-be9ed1477e1c/general/IMG-20241230-WA0078_1775230673868.webp',
    '/api/image/media/6ad0781b-37f0-47a9-92e3-be9ed1477e1c/general/IMG-20241230-WA0069_1775230670721.webp'
  ),
  'published',
  'M3_BRANCHES_INFRA_AND_ASHKELON'
);
