// modules/storefront/studio-block-schemas.js
// Block type form definitions for Studio editor (CMS-2)

const BLOCK_SCHEMAS = {

  hero: {
    label: 'Hero — באנר ראשי',
    icon: '🎬',
    fields: [
      { key: 'title', label: 'כותרת', type: 'text', required: true },
      { key: 'subtitle', label: 'תת כותרת', type: 'text' },
      { key: 'youtube_id', label: 'YouTube ID', type: 'text', placeholder: 'vHvX4zVcCls' },
      { key: 'image', label: 'תמונת רקע (אם אין וידאו)', type: 'image' },
      { key: 'overlay', label: 'שכבה כהה (0-1)', type: 'range', min: 0, max: 1, step: 0.05, default: 0.84 },
      { key: 'cta_text', label: 'טקסט כפתור', type: 'text' },
      { key: 'cta_url', label: 'קישור כפתור', type: 'url' },
      { key: 'cta_style', label: 'סגנון כפתור', type: 'select', options: [
        { value: 'gold', label: 'זהב' }, { value: 'primary', label: 'ראשי (שחור)' }
      ], default: 'gold' },
    ]
  },

  text: {
    label: 'טקסט חופשי',
    icon: '📝',
    fields: [
      { key: 'title', label: 'כותרת (אופציונלי)', type: 'text' },
      { key: 'body', label: 'תוכן (Markdown)', type: 'textarea', rows: 15, required: true },
      { key: 'alignment', label: 'יישור', type: 'select', options: [
        { value: 'right', label: 'ימין (RTL)' }, { value: 'center', label: 'מרכז' }, { value: 'left', label: 'שמאל' }
      ], default: 'right' },
    ]
  },

  gallery: {
    label: 'גלריית תמונות',
    icon: '🖼️',
    fields: [
      { key: 'style', label: 'סגנון', type: 'select', options: [
        { value: 'grid', label: 'רשת' }, { value: 'slider', label: 'סליידר' }
      ], default: 'grid' },
      { key: 'columns', label: 'עמודות (רשת)', type: 'select', options: [
        { value: 2, label: '2' }, { value: 3, label: '3' }, { value: 4, label: '4' }
      ], default: 3 },
      { key: 'images', label: 'תמונות', type: 'items', itemFields: [
        { key: 'src', label: 'קישור תמונה', type: 'image', required: true },
        { key: 'alt', label: 'טקסט חלופי', type: 'text', required: true },
        { key: 'caption', label: 'כיתוב', type: 'text' },
      ]},
    ]
  },

  video: {
    label: 'סרטוני YouTube',
    icon: '▶️',
    fields: [
      { key: 'section_title', label: 'כותרת מקטע', type: 'text' },
      { key: 'style', label: 'סגנון', type: 'select', options: [
        { value: 'standard', label: 'רגיל (16:9)' }, { value: 'shorts', label: 'Shorts (9:16)' }
      ], default: 'standard' },
      { key: 'videos', label: 'סרטונים', type: 'items', itemFields: [
        { key: 'youtube_id', label: 'YouTube ID', type: 'text', required: true },
        { key: 'title', label: 'כותרת', type: 'text' },
      ]},
    ]
  },

  products: {
    label: 'מוצרים',
    icon: '👓',
    fields: [
      { key: 'section_title', label: 'כותרת מקטע', type: 'text' },
      { key: 'filter', label: 'סינון', type: 'select', options: [
        { value: 'bestsellers', label: 'הנמכרים ביותר' }, { value: 'new', label: 'חדשים' }, { value: 'all', label: 'הכל' }
      ], default: 'bestsellers' },
      { key: 'limit', label: 'מקסימום מוצרים', type: 'number', default: 8 },
      { key: 'style', label: 'סגנון', type: 'select', options: [
        { value: 'carousel', label: 'קרוסלה' }, { value: 'grid', label: 'רשת' }
      ], default: 'carousel' },
      { key: 'show_more_url', label: 'קישור "הצג הכל"', type: 'url' },
    ]
  },

  cta: {
    label: 'כפתור CTA',
    icon: '🔘',
    fields: [
      { key: 'text', label: 'טקסט כפתור', type: 'text', required: true },
      { key: 'url', label: 'קישור', type: 'url', required: true },
      { key: 'description', label: 'טקסט מלווה', type: 'text' },
      { key: 'style', label: 'סגנון', type: 'select', options: [
        { value: 'gold', label: 'זהב' }, { value: 'primary', label: 'ראשי (שחור)' },
        { value: 'secondary', label: 'משני (לבן)' }, { value: 'outline', label: 'מסגרת בלבד' }
      ], default: 'gold' },
      { key: 'target', label: 'פתיחה', type: 'select', options: [
        { value: '_self', label: 'באותו חלון' }, { value: '_blank', label: 'בחלון חדש' }
      ], default: '_self' },
    ]
  },

  lead_form: {
    label: 'טופס לידים',
    icon: '📋',
    fields: [
      { key: 'title', label: 'כותרת טופס', type: 'text' },
      { key: 'submit_text', label: 'טקסט כפתור שליחה', type: 'text', default: 'שליחה' },
      { key: 'success_message', label: 'הודעת הצלחה', type: 'text', default: 'ההודעה נשלחה בהצלחה!' },
      { key: 'webhook_url', label: 'Webhook URL (Make.com)', type: 'url' },
      { key: 'fields', label: 'שדות טופס', type: 'items', itemFields: [
        { key: 'name', label: 'שם שדה (אנגלית)', type: 'text', required: true, placeholder: 'name / phone / email' },
        { key: 'label', label: 'תווית', type: 'text', required: true },
        { key: 'type', label: 'סוג', type: 'select', options: [
          { value: 'text', label: 'טקסט' }, { value: 'tel', label: 'טלפון' },
          { value: 'email', label: 'אימייל' }, { value: 'textarea', label: 'טקסט ארוך' }
        ]},
        { key: 'required', label: 'חובה', type: 'toggle' },
      ]},
    ]
  },

  faq: {
    label: 'שאלות ותשובות',
    icon: '❓',
    fields: [
      { key: 'section_title', label: 'כותרת מקטע', type: 'text' },
      { key: 'items', label: 'שאלות', type: 'items', itemFields: [
        { key: 'question', label: 'שאלה', type: 'text', required: true },
        { key: 'answer', label: 'תשובה (Markdown)', type: 'textarea', rows: 4 },
      ]},
    ]
  },

  contact: {
    label: 'צור קשר',
    icon: '📞',
    fields: [
      { key: 'section_title', label: 'כותרת', type: 'text' },
      { key: 'phone', label: 'טלפון', type: 'text' },
      { key: 'email', label: 'אימייל', type: 'text' },
      { key: 'address', label: 'כתובת', type: 'text' },
      { key: 'hours', label: 'שעות פתיחה', type: 'text' },
      { key: 'show_map', label: 'הצג מפה', type: 'toggle' },
      { key: 'map_embed_url', label: 'Google Maps Embed URL', type: 'url' },
      { key: 'show_form', label: 'הצג טופס', type: 'toggle' },
      { key: 'cta_text', label: 'טקסט CTA', type: 'text' },
      { key: 'cta_url', label: 'קישור CTA', type: 'url' },
    ]
  },

  banner: {
    label: 'באנר פרסומי',
    icon: '🏷️',
    fields: [
      { key: 'title', label: 'כותרת', type: 'text' },
      { key: 'text', label: 'טקסט', type: 'textarea', rows: 3 },
      { key: 'image', label: 'תמונה', type: 'image' },
      { key: 'cta_text', label: 'טקסט כפתור', type: 'text' },
      { key: 'cta_url', label: 'קישור כפתור', type: 'url' },
      { key: 'style', label: 'סגנון', type: 'select', options: [
        { value: 'full', label: 'רוחב מלא' }, { value: 'card', label: 'כרטיס' }, { value: 'slim', label: 'פס דק' }
      ], default: 'full' },
      { key: 'countdown_to', label: 'ספירה לאחור (תאריך ISO)', type: 'text', placeholder: '2026-06-30T23:59:59' },
    ]
  },

  columns: {
    label: 'עמודות',
    icon: '▦',
    fields: [
      { key: 'section_title', label: 'כותרת מקטע', type: 'text' },
      { key: 'layout', label: 'פריסה', type: 'select', options: [
        { value: 'equal', label: 'עמודות שוות' }, { value: 'image-text', label: 'תמונה + טקסט' },
        { value: 'text-image', label: 'טקסט + תמונה' }
      ], default: 'equal', required: true },
      { key: 'columns', label: 'מספר עמודות (לפריסה שווה)', type: 'select', options: [
        { value: 2, label: '2' }, { value: 3, label: '3' }, { value: 4, label: '4' }
      ], default: 4 },
      { key: 'items', label: 'פריטים', type: 'items', itemFields: [
        { key: 'icon', label: 'אייקון (emoji או URL)', type: 'text' },
        { key: 'image', label: 'תמונה', type: 'image' },
        { key: 'title', label: 'כותרת', type: 'text' },
        { key: 'text', label: 'טקסט', type: 'textarea', rows: 3 },
        { key: 'url', label: 'קישור', type: 'url' },
      ]},
    ]
  },

  steps: {
    label: 'שלבים ממוספרים',
    icon: '🔢',
    fields: [
      { key: 'section_title', label: 'כותרת מקטע', type: 'text' },
      { key: 'items', label: 'שלבים', type: 'items', itemFields: [
        { key: 'number', label: 'מספר', type: 'number', required: true },
        { key: 'title', label: 'כותרת', type: 'text', required: true },
        { key: 'description', label: 'תיאור', type: 'textarea', rows: 3 },
        { key: 'image', label: 'תמונה', type: 'image' },
        { key: 'youtube_id', label: 'YouTube ID', type: 'text' },
      ]},
    ]
  },

  brands: {
    label: 'מותגים',
    icon: '🏪',
    fields: [
      { key: 'section_title', label: 'כותרת מקטע', type: 'text' },
      { key: 'style', label: 'סגנון', type: 'select', options: [
        { value: 'carousel', label: 'קרוסלה' }, { value: 'grid', label: 'רשת' }
      ], default: 'carousel' },
      { key: 'limit', label: 'מקסימום מותגים', type: 'number' },
      { key: 'show_more_url', label: 'קישור "הצג הכל"', type: 'url' },
    ]
  },

  blog_carousel: {
    label: 'קרוסלת בלוג',
    icon: '📰',
    fields: [
      { key: 'section_title', label: 'כותרת מקטע', type: 'text' },
      { key: 'limit', label: 'מספר פוסטים', type: 'number', default: 4 },
      { key: 'style', label: 'סגנון', type: 'select', options: [
        { value: 'carousel', label: 'קרוסלה' }, { value: 'grid', label: 'רשת' }
      ], default: 'carousel' },
      { key: 'show_more_url', label: 'קישור "הצג הכל"', type: 'url' },
    ]
  },

};

const BLOCK_SETTINGS_SCHEMA = [
  { key: 'bg_color', label: 'צבע רקע', type: 'select', options: [
    { value: 'transparent', label: 'שקוף (ברירת מחדל)' }, { value: 'white', label: 'לבן' },
    { value: 'black', label: 'שחור' }, { value: 'gold', label: 'זהב' }, { value: 'gray', label: 'אפור' }
  ], default: 'transparent' },
  { key: 'padding', label: 'ריווח (Tailwind class)', type: 'text', placeholder: 'py-12 md:py-16' },
  { key: 'max_width', label: 'רוחב מקסימלי', type: 'select', options: [
    { value: 'standard', label: 'רגיל' }, { value: 'narrow', label: 'צר' },
    { value: 'wide', label: 'רחב' }, { value: 'full', label: 'מלא' }
  ], default: 'standard' },
  { key: 'hidden', label: 'הסתר בלוק', type: 'toggle' },
  { key: 'css_class', label: 'CSS class נוסף', type: 'text' },
];

function getBlockSchema(type) {
  return BLOCK_SCHEMAS[type] || null;
}

function getBlockTypeList() {
  return Object.entries(BLOCK_SCHEMAS).map(([type, schema]) => ({
    type, label: schema.label, icon: schema.icon,
  }));
}
