/**
 * Translation Field Maps (Edge Function copy)
 *
 * Copied from src/lib/translation-field-maps.ts — Edge Functions
 * can't import from the Astro project.
 *
 * Keep in sync with the source file when adding new block types.
 */

/** Block type -> top-level translatable field paths in block.data */
export const TRANSLATABLE_FIELDS: Record<string, string[]> = {
  hero: ['title', 'subtitle', 'cta_text', 'status_text'],
  text: ['body', 'title'],
  gallery: [],
  video: ['section_title', 'subtitle'],
  products: ['section_title', 'default_badge_text'],
  cta: ['text', 'description', 'popup_form_title', 'popup_submit_text', 'popup_success_message'],
  lead_form: ['title', 'submit_text', 'success_message'],
  faq: ['section_title'],
  contact: ['section_title', 'banner_title', 'banner_subtitle', 'address', 'hours', 'cta_text'],
  banner: ['title', 'text', 'cta_text'],
  columns: ['section_title'],
  steps: ['section_title'],
  brands: ['section_title'],
  blog_carousel: ['section_title'],
  reviews: ['section_title'],
  sticky_bar: ['text', 'secondary_text', 'cta_text'],
  trust_badges: ['section_title'],
  divider: [],
  custom: ['html'],
  campaign_tiers: ['title', 'subtitle', 'cta_text', 'cta_whatsapp_message', 'disclaimer_text'],
  campaign_cards: ['title', 'subtitle', 'cta_text', 'cta_whatsapp_message', 'disclaimer_text', 'price_override_text'],
};

/** Block type -> array field -> translatable fields inside each array item */
export const TRANSLATABLE_ARRAY_FIELDS: Record<string, Record<string, string[]>> = {
  gallery: { images: ['alt', 'caption'] },
  video: { videos: ['title'] },
  faq: { items: ['question', 'answer'] },
  steps: { items: ['title', 'description'] },
  columns: { items: ['title', 'text'] },
  trust_badges: { badges: ['title', 'text'] },
  cta: { popup_form_fields: ['label'] },
  lead_form: { fields: ['label', 'placeholder'] },
  contact: { form_fields: ['label', 'placeholder'] },
  campaign_tiers: { tiers: ['badge_text', 'price_label', 'brands_secondary_label', 'bottom_badge_text', 'cta_text'] },
  campaign_cards: { products: ['badge_start', 'badge_end'] },
};

/** Shortcode type -> attributes that contain translatable text */
export const SHORTCODE_TRANSLATABLE_ATTRS: Record<string, string[]> = {
  lead_form: ['title', 'button_text', 'success_message'],
  cta: ['text', 'form_title', 'form_submit_text'],
  whatsapp: ['text', 'message'],
  products: [],
  reviews: [],
  contact_form: ['title', 'button_text', 'success_message'],
};

/** String array fields inside block arrays (each element translatable) */
export const TRANSLATABLE_STRING_ARRAY_FIELDS: Record<string, Record<string, string>> = {
  campaign_tiers: { 'tiers.features': 'features' },
};
