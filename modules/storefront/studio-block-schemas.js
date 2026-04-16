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
      { key: 'status_text', label: 'טקסט סטטוס (תג מעל הכותרת)', type: 'text', placeholder: 'ההרשמה פתוחה' },
      { key: 'status_bg', label: 'צבע תג סטטוס', type: 'select', options: [
        { value: 'gold', label: 'זהב' }, { value: 'green', label: 'ירוק' }, { value: 'red', label: 'אדום' }
      ], default: 'gold' },
      { key: 'title_size', label: 'גודל כותרת', type: 'select', options: [
        { value: 'normal', label: 'רגיל' }, { value: 'large', label: 'גדול' }, { value: 'huge', label: 'ענק' }
      ], default: 'normal' },
    ]
  },

  text: {
    label: 'טקסט חופשי',
    icon: '📝',
    fields: [
      { key: 'title', label: 'כותרת (אופציונלי)', type: 'text' },
      { key: 'body', label: 'תוכן', type: 'richtext', required: true },
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
      { key: 'selection_mode', label: 'בחירת מוצרים', type: 'select', options: [
        { value: 'filter', label: 'אוטומטי (לפי פילטר)' },
        { value: 'manual', label: 'ידני (בחירת מוצרים ספציפיים)' }
      ], default: 'filter' },
      { key: 'filter', label: 'סינון', type: 'select', showIf: 'filter', options: [
        { value: 'bestsellers', label: 'הנמכרים ביותר' }, { value: 'new', label: 'חדשים' }, { value: 'all', label: 'הכל' }
      ], default: 'bestsellers' },
      { key: 'limit', label: 'מקסימום מוצרים', type: 'number', showIf: 'filter', default: 8 },
      { key: 'selected_products', label: 'מוצרים נבחרים', type: 'product_picker', showIf: 'manual' },
      { key: 'style', label: 'סגנון', type: 'select', options: [
        { value: 'carousel', label: 'קרוסלה' }, { value: 'grid', label: 'רשת' }
      ], default: 'carousel' },
      { key: 'grid_columns_desktop', label: 'עמודות (דסקטופ)', type: 'select', options: [
        { value: 2, label: '2' }, { value: 3, label: '3' }, { value: 4, label: '4' }, { value: 5, label: '5' }
      ], default: 4 },
      { key: 'grid_columns_mobile', label: 'עמודות (מובייל)', type: 'select', options: [
        { value: 1, label: '1' }, { value: 2, label: '2' }
      ], default: 2 },
      { key: 'show_out_of_stock', label: 'הצג מוצרים שאזלו', type: 'toggle', default: false },
      { key: 'out_of_stock_warning', label: 'הצג תג "אזל" על מוצרים חסרים', type: 'toggle', default: true },
      { key: 'show_more_url', label: 'קישור "הצג הכל"', type: 'url' },
      { key: 'card_style', label: 'סגנון כרטיס', type: 'select', options: [
        { value: 'standard', label: 'רגיל' },
        { value: 'campaign', label: 'קמפיין (מחירים + תגים)' },
        { value: 'minimal', label: 'מינימלי (ללא מחירים)' },
      ], default: 'standard' },
      { key: 'show_price', label: 'הצג מחיר', type: 'toggle', default: true },
      { key: 'show_original_price', label: 'הצג מחיר מקורי (מחוק)', type: 'toggle', default: false },
      { key: 'show_image_gallery', label: 'גלריית תמונות (חצים)', type: 'toggle', default: false },
      { key: 'show_badges', label: 'הצג תגים', type: 'toggle', default: false },
      { key: 'default_badge_text', label: 'טקסט תג ברירת מחדל', type: 'text', placeholder: 'מבצע!' },
      { key: 'badge_bg_color', label: 'צבע תג', type: 'select', options: [
        { value: 'red', label: 'אדום' }, { value: 'gold', label: 'זהב' }, { value: 'black', label: 'שחור' }
      ], default: 'red' },
    ]
  },

  cta: {
    label: 'כפתור CTA',
    icon: '🔘',
    fields: [
      { key: 'text', label: 'טקסט כפתור', type: 'text', required: true },
      { key: 'action', label: 'פעולה', type: 'select', options: [
        { value: 'link', label: 'קישור לעמוד' },
        { value: 'popup_form', label: 'פתח טופס לידים (popup)' }
      ], default: 'link' },
      { key: 'url', label: 'קישור', type: 'url', showIf: 'link' },
      { key: 'description', label: 'טקסט מלווה', type: 'text' },
      { key: 'style', label: 'סגנון', type: 'select', options: [
        { value: 'gold', label: 'זהב' }, { value: 'primary', label: 'ראשי (שחור)' },
        { value: 'secondary', label: 'משני (לבן)' }, { value: 'outline', label: 'מסגרת בלבד' }
      ], default: 'gold' },
      { key: 'target', label: 'פתיחה', type: 'select', showIf: 'link', options: [
        { value: '_self', label: 'באותו חלון' }, { value: '_blank', label: 'בחלון חדש' }
      ], default: '_self' },
      { key: 'popup_form_title', label: 'כותרת טופס', type: 'text', showIf: 'popup_form' },
      { key: 'popup_form_fields', label: 'שדות טופס', type: 'items', showIf: 'popup_form', itemFields: [
        { key: 'name', label: 'שם שדה', type: 'text', required: true },
        { key: 'label', label: 'תווית', type: 'text', required: true },
        { key: 'type', label: 'סוג', type: 'select', options: [
          { value: 'text', label: 'טקסט' }, { value: 'tel', label: 'טלפון' },
          { value: 'email', label: 'אימייל' }, { value: 'textarea', label: 'טקסט ארוך' }
        ]},
        { key: 'required', label: 'חובה', type: 'toggle' }
      ]},
      { key: 'popup_submit_text', label: 'טקסט כפתור שליחה', type: 'text', showIf: 'popup_form', default: 'שליחה' },
      { key: 'popup_success_message', label: 'הודעת הצלחה', type: 'text', showIf: 'popup_form', default: 'תודה! ניצור קשר בקרוב' },
      { key: 'popup_webhook_url', label: 'Webhook URL', type: 'url', showIf: 'popup_form' },
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

  reviews: {
    label: 'ביקורות',
    icon: '⭐',
    fields: [
      { key: 'section_title', label: 'כותרת מקטע', type: 'text', default: 'מה הלקוחות אומרים' },
      { key: 'style', label: 'סגנון', type: 'select', options: [
        { value: 'carousel', label: 'קרוסלה' }, { value: 'grid', label: 'רשת' }
      ], default: 'carousel' },
      { key: 'show_rating_summary', label: 'הצג סיכום דירוג', type: 'toggle', default: true },
      { key: 'limit', label: 'מקסימום ביקורות', type: 'number' },
    ]
  },

  sticky_bar: {
    label: 'Sticky Bar',
    icon: '📌',
    fields: [
      { key: 'text', label: 'טקסט', type: 'text', required: true },
      { key: 'secondary_text', label: 'טקסט משני (צד שמאל)', type: 'text' },
      { key: 'cta_text', label: 'טקסט כפתור', type: 'text' },
      { key: 'cta_url', label: 'קישור כפתור', type: 'url' },
      { key: 'position', label: 'מיקום', type: 'select', options: [
        { value: 'top', label: 'למעלה' }, { value: 'bottom', label: 'למטה' }
      ], default: 'top', required: true },
      { key: 'bg_color', label: 'צבע רקע', type: 'select', options: [
        { value: 'black', label: 'שחור' }, { value: 'gold', label: 'זהב' }, { value: 'white', label: 'לבן' }
      ], default: 'black' },
      { key: 'text_color', label: 'צבע טקסט', type: 'select', options: [
        { value: 'white', label: 'לבן' }, { value: 'black', label: 'שחור' }
      ], default: 'white' },
      { key: 'dismissible', label: 'ניתן לסגירה', type: 'toggle', default: true },
      { key: 'show_countdown', label: 'ספירה לאחור', type: 'toggle', default: false },
      { key: 'countdown_to', label: 'תאריך סיום (ISO)', type: 'text', placeholder: '2026-12-31T23:59:59' },
    ]
  },

  trust_badges: {
    label: 'תגי אמון',
    icon: '🛡️',
    fields: [
      { key: 'section_title', label: 'כותרת', type: 'text' },
      { key: 'style', label: 'סגנון', type: 'select', options: [
        { value: 'row', label: 'שורה' }, { value: 'grid', label: 'רשת' }
      ], default: 'row' },
      { key: 'badges', label: 'תגים', type: 'items', itemFields: [
        { key: 'icon', label: 'אייקון (emoji)', type: 'text', required: true },
        { key: 'title', label: 'כותרת', type: 'text', required: true },
        { key: 'text', label: 'טקסט משני', type: 'text' },
      ]},
    ]
  },

  divider: {
    label: 'מפריד',
    icon: '➖',
    fields: [
      { key: 'style', label: 'סגנון', type: 'select', options: [
        { value: 'line', label: 'קו' }, { value: 'space', label: 'רווח' },
        { value: 'dots', label: 'נקודות' }, { value: 'wave', label: 'גל' }
      ], default: 'line' },
      { key: 'color', label: 'צבע (לקו)', type: 'select', options: [
        { value: 'gold', label: 'זהב' }, { value: 'gray', label: 'אפור' }, { value: 'black', label: 'שחור' }
      ], default: 'gold' },
      { key: 'height', label: 'גובה (לרווח)', type: 'text', placeholder: '60px', default: '60px' },
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

  // Luxury-boutique blocks (SPEC HOMEPAGE_HEADER_LUXURY_REDESIGN, 2026-04-16).
  // Advanced nested fields (primary_cta, secondary_cta, cards[], events[], brands[])
  // are currently authored via SQL migration — Studio shows top-level fields.

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
