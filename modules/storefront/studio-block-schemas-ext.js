// modules/storefront/studio-block-schemas-ext.js
// Part 2: Extended block types (campaign-related and luxury blocks)
// Must be loaded AFTER studio-block-schemas.js

Object.assign(BLOCK_SCHEMAS, {

  custom: {
    label: 'בלוק מותאם אישית (HTML+CSS)',
    icon: '🎨',
    fields: [
      { key: 'html', label: 'קוד HTML + CSS', type: 'code', rows: 20,
        placeholder: '<style>\n  .my-section { background: #000; color: #fff; padding: 4rem 2rem; }\n</style>\n<div class="my-section">\n  <h1>כותרת</h1>\n  <p>תוכן</p>\n</div>' },
      { key: 'youtube_bg', label: 'וידאו YouTube ברקע (ID)', type: 'text', placeholder: 'vHvX4zVcCls' },
      { key: 'image_bg', label: 'תמונת רקע (URL)', type: 'image' },
      { key: 'overlay', label: 'שכבה כהה (0-1)', type: 'range', min: 0, max: 1, step: 0.05, default: 0 },
    ]
  },

  hero_luxury: {
    label: 'Hero יוקרה (וידאו + 2 CTA)',
    icon: '✨',
    fields: [
      { key: 'eyebrow', label: 'טקסט עליון (uppercase label)', type: 'text', placeholder: 'קולקציית בוטיק יוקרתית' },
      { key: 'title', label: 'כותרת ראשית', type: 'text', required: true },
      { key: 'subtitle', label: 'תת כותרת', type: 'textarea', rows: 3 },
      { key: 'video_youtube_id', label: 'YouTube ID לרקע', type: 'text', placeholder: 'vHvX4zVcCls' },
      { key: 'image', label: 'תמונת רקע (אם אין וידאו)', type: 'image' },
      { key: 'overlay', label: 'שכבה כהה (0-1)', type: 'range', min: 0, max: 1, step: 0.05, default: 0.65 },
      { key: 'primary_cta_text', label: 'CTA ראשי — טקסט', type: 'text' },
      { key: 'primary_cta_url', label: 'CTA ראשי — קישור', type: 'url' },
      { key: 'secondary_cta_text', label: 'CTA משני — טקסט', type: 'text' },
      { key: 'secondary_cta_url', label: 'CTA משני — קישור', type: 'url' },
    ]
  },

  brand_strip: {
    label: 'רצועת מותגים',
    icon: '🏷️',
    fields: [
      { key: 'section_title', label: 'כותרת מקטע', type: 'text' },
      { key: 'style', label: 'סגנון', type: 'select', options: [
        { value: 'carousel', label: 'קרוסלה' }, { value: 'row', label: 'שורה גולשת' }
      ], default: 'carousel' },
      { key: 'brands', label: 'מותגים', type: 'items', itemFields: [
        { key: 'slug', label: 'Slug מותג', type: 'text', required: true },
        { key: 'name', label: 'שם תצוגה', type: 'text', required: true },
        { key: 'logo_url', label: 'URL לוגו (אופציונלי — אחרת נטען מהמותג)', type: 'text' },
        { key: 'href', label: 'קישור (אופציונלי)', type: 'url' },
      ]},
    ]
  },

  tier1_spotlight: {
    label: 'מותגי פלאגשיפ (Tier-1)',
    icon: '⭐',
    fields: [
      { key: 'section_title', label: 'כותרת מקטע', type: 'text' },
      { key: 'subtitle', label: 'תת כותרת', type: 'textarea', rows: 2 },
      { key: 'cards', label: 'כרטיסי מותג', type: 'items', itemFields: [
        { key: 'brand_slug', label: 'Slug מותג', type: 'text', required: true },
        { key: 'brand_name', label: 'שם תצוגה (אופציונלי — אחרת מה-DB)', type: 'text' },
        { key: 'tagline', label: 'טקסט קצר מתחת ללוגו', type: 'text' },
        { key: 'image_url', label: 'תמונת רקע (אופציונלי — אחרת hero_image)', type: 'text' },
        { key: 'logo_url', label: 'לוגו (אופציונלי — אחרת מה-DB)', type: 'text' },
        { key: 'video_youtube_id', label: 'YouTube ID (אופציונלי)', type: 'text' },
        { key: 'href', label: 'קישור (אופציונלי)', type: 'url' },
      ]},
    ]
  },

  story_teaser: {
    label: 'טיזר הסיפור שלנו',
    icon: '📖',
    fields: [
      { key: 'eyebrow', label: 'טקסט עליון', type: 'text', placeholder: '40 שנה' },
      { key: 'title', label: 'כותרת', type: 'text', required: true },
      { key: 'body', label: 'גוף (Markdown / HTML קצר)', type: 'richtext' },
      { key: 'image', label: 'תמונה', type: 'image' },
      { key: 'layout', label: 'פריסה', type: 'select', options: [
        { value: 'image-end', label: 'תמונה בסוף' }, { value: 'image-start', label: 'תמונה בהתחלה' }
      ], default: 'image-end' },
      { key: 'cta_text', label: 'CTA — טקסט', type: 'text' },
      { key: 'cta_url', label: 'CTA — קישור', type: 'url' },
    ]
  },

  tier2_grid: {
    label: 'רשת Tier-2',
    icon: '◽',
    fields: [
      { key: 'section_title', label: 'כותרת מקטע', type: 'text' },
      { key: 'subtitle', label: 'תת כותרת', type: 'textarea', rows: 2 },
      { key: 'style', label: 'סגנון', type: 'select', options: [
        { value: 'grid', label: 'רשת' }, { value: 'carousel', label: 'קרוסלה אוטומטית' }
      ], default: 'grid' },
      { key: 'columns_desktop', label: 'עמודות דסקטופ (במצב רשת)', type: 'select', options: [
        { value: 3, label: '3' }, { value: 4, label: '4' }, { value: 5, label: '5' }, { value: 6, label: '6' }
      ], default: 6 },
      { key: 'brands', label: 'מותגים', type: 'items', itemFields: [
        { key: 'slug', label: 'Slug מותג', type: 'text', required: true },
        { key: 'name', label: 'שם תצוגה', type: 'text', required: true },
        { key: 'logo_url', label: 'URL לוגו (אופציונלי)', type: 'text' },
        { key: 'href', label: 'קישור (אופציונלי)', type: 'url' },
      ]},
    ]
  },

  events_showcase: {
    label: 'אירועים וסרטונים',
    icon: '🎬',
    fields: [
      { key: 'section_title', label: 'כותרת מקטע', type: 'text' },
      { key: 'subtitle', label: 'תת כותרת', type: 'textarea', rows: 2 },
      { key: 'events', label: 'אירועים', type: 'items', itemFields: [
        { key: 'youtube_id', label: 'YouTube ID', type: 'text', required: true },
        { key: 'title', label: 'כותרת', type: 'text' },
        { key: 'description', label: 'תיאור', type: 'textarea', rows: 2 },
        { key: 'aspect_ratio', label: 'יחס', type: 'select', options: [
          { value: '9/16', label: 'Shorts (9:16)' }, { value: '16/9', label: 'רגיל (16:9)' }
        ], default: '9/16' },
        { key: 'autoplay_muted', label: 'הפעלה אוטומטית (מושתק)', type: 'toggle' },
      ]},
    ]
  },

  optometry_teaser: {
    label: 'טיזר אופטומטריה',
    icon: '👁️',
    fields: [
      { key: 'eyebrow', label: 'טקסט עליון', type: 'text', placeholder: 'צוות אופטומטרי' },
      { key: 'title', label: 'כותרת', type: 'text', required: true },
      { key: 'body', label: 'גוף', type: 'richtext' },
      { key: 'image', label: 'תמונה', type: 'image' },
      { key: 'bullet_points', label: 'נקודות (שורה לכל אחת)', type: 'textarea_list' },
      { key: 'layout', label: 'פריסה', type: 'select', options: [
        { value: 'image-start', label: 'תמונה בהתחלה' }, { value: 'image-end', label: 'תמונה בסוף' }
      ], default: 'image-start' },
      { key: 'cta_text', label: 'CTA — טקסט', type: 'text' },
      { key: 'cta_url', label: 'CTA — קישור', type: 'url' },
    ]
  },

  visit_us: {
    label: 'בקרו אותנו',
    icon: '📍',
    fields: [
      { key: 'section_title', label: 'כותרת מקטע', type: 'text' },
      { key: 'subtitle', label: 'תת כותרת', type: 'textarea', rows: 2 },
      { key: 'address', label: 'כתובת', type: 'text' },
      { key: 'phone', label: 'טלפון', type: 'text' },
      { key: 'hours', label: 'שעות פתיחה (\\n בין שורות)', type: 'textarea', rows: 3 },
      { key: 'map_embed_url', label: 'Google Maps Embed URL', type: 'url' },
      { key: 'primary_cta_text', label: 'CTA ראשי — טקסט', type: 'text' },
      { key: 'primary_cta_url', label: 'CTA ראשי — קישור', type: 'url' },
      { key: 'secondary_cta_text', label: 'CTA משני — טקסט', type: 'text' },
      { key: 'secondary_cta_url', label: 'CTA משני — קישור', type: 'url' },
    ]
  },

  campaign_cards: {
    label: 'כרטיסיות קמפיין',
    icon: '🎯',
    fields: [
      { key: 'title', label: 'כותרת מקטע', type: 'text' },
      { key: 'subtitle', label: 'תת כותרת', type: 'text' },
      { key: 'products', label: 'מוצרים', type: 'items', itemFields: [
        { key: 'barcode', label: 'ברקוד', type: 'text', required: true },
        { key: 'campaign_price', label: 'מחיר קמפיין', type: 'number', required: true },
        { key: 'original_price', label: 'מחיר מקורי (מחוק)', type: 'number' },
        { key: 'badge_start', label: 'תג ימין (VIP / חדש / 1+1)', type: 'text' },
        { key: 'badge_end', label: 'תג שמאל', type: 'text' },
        { key: 'price_override', label: 'הסתר מחיר (מוצר יוקרה)', type: 'checkbox' },
      ]},
      { key: 'cta_text', label: 'טקסט כפתור CTA', type: 'text', default: 'לבירור בוואטסאפ' },
      { key: 'cta_action', label: 'פעולת CTA', type: 'select', options: [
        { value: 'whatsapp', label: 'וואטסאפ' },
        { value: 'link', label: 'קישור' },
        { value: 'popup', label: 'טופס popup' }
      ], default: 'whatsapp' },
      { key: 'cta_link', label: 'קישור CTA', type: 'url', showIf: 'link' },
      { key: 'cta_whatsapp_message', label: 'הודעת וואטסאפ ({product_name} = שם מוצר)', type: 'text',
        default: 'היי, אשמח לברר לגבי {product_name} מהקמפיין' },
      { key: 'columns_desktop', label: 'עמודות (דסקטופ)', type: 'select', options: [
        { value: 2, label: '2' }, { value: 3, label: '3' }, { value: 4, label: '4' }
      ], default: 4 },
      { key: 'columns_mobile', label: 'עמודות (מובייל)', type: 'select', options: [
        { value: 1, label: '1' }, { value: 2, label: '2' }
      ], default: 2 },
      { key: 'default_badge_start', label: 'תג ברירת מחדל (ימין)', type: 'text', placeholder: 'עם קופון' },
      { key: 'default_badge_end', label: 'תג ברירת מחדל (שמאל)', type: 'text' },
      { key: 'disclaimer_text', label: 'טקסט הבהרה (מתחת למחיר)', type: 'text', placeholder: '*בהצגת קופון אישי בלבד' },
      { key: 'price_override_mode', label: 'הסתר מחירים (ברירת מחדל לכל המוצרים)', type: 'toggle', default: false },
      { key: 'price_override_text', label: 'טקסט במקום מחיר', type: 'text', default: 'מחיר מיוחד לאירוע הקרוב' },
      { key: 'theme', label: 'ערכת נושא', type: 'select', options: [
        { value: 'light', label: 'בהיר (רקע לבן)' }, { value: 'dark', label: 'כהה (רקע שחור)' }
      ], default: 'light' },
    ]
  },

  campaign_tiers: {
    label: 'מחירון קמפיין — כרטיסי רמות',
    icon: '💰',
    fields: [
      { key: 'title', label: 'כותרת', type: 'text' },
      { key: 'title_decoration', label: 'קישוט כותרת', type: 'select', options: [
        { value: 'none', label: 'ללא' }, { value: 'line', label: 'קו' }, { value: 'dots', label: 'נקודות' }
      ], default: 'none' },
      { key: 'subtitle', label: 'תת כותרת', type: 'text' },
      { key: 'tiers', label: 'רמות מחיר', type: 'items', itemFields: [
        { key: 'id', label: 'מזהה', type: 'text', required: true },
        { key: 'badge_text', label: 'תגית עליונה', type: 'text', placeholder: 'PREMIUM / קטגוריה 1' },
        { key: 'badge_style', label: 'סגנון תגית', type: 'select', options: [
          { value: 'gold', label: 'זהב מלא' }, { value: 'outline', label: 'מסגרת בלבד' }
        ], default: 'gold' },
        { key: 'price', label: 'מחיר', type: 'number', required: true },
        { key: 'price_color', label: 'צבע מחיר', type: 'select', options: [
          { value: 'white', label: 'לבן' }, { value: 'gold', label: 'זהב' }
        ], default: 'white' },
        { key: 'original_price', label: 'מחיר מקורי (קו חוצה)', type: 'number' },
        { key: 'currency', label: 'סמל מטבע', type: 'text', default: '₪' },
        { key: 'price_label', label: 'תווית מחיר', type: 'text', placeholder: 'לזוג משקפיים' },
        { key: 'brands_primary', label: 'מותגים (שורה לכל מותג)', type: 'textarea_list' },
        { key: 'brands_primary_color', label: 'צבע מותגים', type: 'select', options: [
          { value: 'white', label: 'לבן' }, { value: 'gold', label: 'זהב' }
        ], default: 'white' },
        { key: 'brands_secondary', label: 'מותגים נוספים (קולקציות חדשות)', type: 'textarea_list' },
        { key: 'brands_secondary_color', label: 'צבע מותגים נוספים', type: 'select', options: [
          { value: 'white', label: 'לבן' }, { value: 'gold', label: 'זהב' }
        ], default: 'gold' },
        { key: 'brands_secondary_label', label: 'כותרת לפני מותגים נוספים', type: 'text', placeholder: 'קולקציות חדשות' },
        { key: 'brands_display', label: 'תצוגת מותגים', type: 'select', options: [
          { value: 'text', label: 'טקסט (נקודות)' }, { value: 'chips', label: 'צ\'יפים' }, { value: 'hidden', label: 'מוסתר' }
        ], default: 'text' },
        { key: 'features', label: 'תכונות (שורה לכל אחת)', type: 'textarea_list' },
        { key: 'highlighted', label: 'כרטיס מודגש (מסגרת זהב)', type: 'checkbox' },
        { key: 'bottom_badge_text', label: 'תגית תחתונה', type: 'text', placeholder: 'פרטים בקרוב' },
        { key: 'bottom_badge_style', label: 'סגנון תגית תחתונה', type: 'select', options: [
          { value: 'gold', label: 'זהב מלא' }, { value: 'outline', label: 'מסגרת בלבד' }
        ], default: 'gold' },
        { key: 'cta_text', label: 'טקסט כפתור (דריסת ברירת מחדל)', type: 'text' },
        { key: 'cta_enabled', label: 'הצג כפתור CTA', type: 'checkbox', default: true },
      ]},
      { key: 'cta_text', label: 'טקסט כפתור (ברירת מחדל)', type: 'text', default: 'לפרטים בוואטסאפ' },
      { key: 'cta_action', label: 'פעולת כפתור', type: 'select', options: [
        { value: 'whatsapp', label: 'וואטסאפ' }, { value: 'link', label: 'קישור' }, { value: 'popup', label: 'טופס פופאפ' }
      ], default: 'whatsapp' },
      { key: 'cta_link', label: 'קישור כפתור (אם link)', type: 'url' },
      { key: 'cta_whatsapp_message', label: 'הודעת וואטסאפ', type: 'text' },
      { key: 'columns_desktop', label: 'עמודות דסקטופ', type: 'select', options: [
        { value: 2, label: '2' }, { value: 3, label: '3' }, { value: 4, label: '4' }
      ], default: 4 },
      { key: 'columns_mobile', label: 'עמודות מובייל', type: 'select', options: [
        { value: 1, label: '1' }, { value: 2, label: '2' }
      ], default: 1 },
      { key: 'theme', label: 'ערכת נושא', type: 'select', options: [
        { value: 'light', label: 'בהיר' }, { value: 'dark', label: 'כהה' }
      ], default: 'dark' },
      { key: 'card_bg', label: 'רקע כרטיס (CSS)', type: 'text', placeholder: 'linear-gradient(to bottom, #1a1a1a, #111)' },
      { key: 'disclaimer_text', label: 'טקסט הבהרה', type: 'text' },
    ]
  },

});

var BLOCK_SETTINGS_SCHEMA = [
  { key: 'bg_color', label: 'צבע רקע', type: 'select', options: [
    { value: 'transparent', label: 'שקוף (ברירת מחדל)' }, { value: 'white', label: 'לבן' },
    { value: 'black', label: 'שחור' }, { value: 'gold', label: 'זהב' }, { value: 'gray', label: 'אפור' }
  ], default: 'transparent' },
  { key: 'padding', 