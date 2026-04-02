// Storefront Settings — load/save WhatsApp, booking, notification, analytics, branding
// Uses storefront_config table via T.STOREFRONT_CONFIG

async function loadStorefrontSettings() {
  showLoading('טוען הגדרות חנות...');
  try {
    const tid = getTenantId();
    const { data, error } = await sb.from(T.STOREFRONT_CONFIG)
      .select('whatsapp_number, booking_url, notification_method, analytics, custom_domain, hero_title, hero_subtitle, favicon_url, og_image_url')
      .eq('tenant_id', tid)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      // WhatsApp / Booking / Notifications
      document.getElementById('sf-whatsapp').value = data.whatsapp_number || '';
      document.getElementById('sf-booking-url').value = data.booking_url || '';
      document.getElementById('sf-notify-method').value = data.notification_method || 'whatsapp';

      // Analytics (JSONB)
      const a = data.analytics || {};
      document.getElementById('sf-gtm-id').value = a.gtm_id || '';
      document.getElementById('sf-ga-id').value = a.ga_id || '';
      document.getElementById('sf-fb-pixel').value = a.facebook_pixel_id || '';
      document.getElementById('sf-tiktok-pixel').value = a.tiktok_pixel_id || '';
      document.getElementById('sf-hotjar-id').value = a.hotjar_id || '';
      document.getElementById('sf-fb-capi').value = a.fb_capi_token || '';
      document.getElementById('sf-google-mp').value = a.google_mp_secret || '';

      // Branding & Domain
      document.getElementById('sf-custom-domain').value = data.custom_domain || '';
      document.getElementById('sf-hero-title').value = data.hero_title || '';
      document.getElementById('sf-hero-subtitle').value = data.hero_subtitle || '';
      document.getElementById('sf-favicon-url').value = data.favicon_url || '';
      document.getElementById('sf-og-image-url').value = data.og_image_url || '';
    }
  } catch (e) {
    console.error('loadStorefrontSettings error:', e);
    toast('שגיאה בטעינת הגדרות חנות', 'e');
  } finally {
    hideLoading();
  }
}

async function saveStorefrontSettings() {
  const whatsapp = document.getElementById('sf-whatsapp').value.trim();
  const bookingUrl = document.getElementById('sf-booking-url').value.trim();
  const notifyMethod = document.getElementById('sf-notify-method').value;

  // Validate phone format (Israeli: 05X...)
  if (whatsapp && !/^05\d[\-]?\d{7}$/.test(whatsapp)) {
    toast('מספר WhatsApp לא תקין (05X-XXXXXXX)', 'e');
    return;
  }

  // Validate URL format
  if (bookingUrl && !bookingUrl.startsWith('http')) {
    toast('כתובת תורים חייבת להתחיל ב-http', 'e');
    return;
  }

  // Build analytics JSONB
  const analytics = {};
  const gtmId = document.getElementById('sf-gtm-id').value.trim();
  const gaId = document.getElementById('sf-ga-id').value.trim();
  const fbPixel = document.getElementById('sf-fb-pixel').value.trim();
  const tiktokPixel = document.getElementById('sf-tiktok-pixel').value.trim();
  const hotjarId = document.getElementById('sf-hotjar-id').value.trim();
  const fbCapi = document.getElementById('sf-fb-capi').value.trim();
  const googleMp = document.getElementById('sf-google-mp').value.trim();

  if (gtmId) analytics.gtm_id = gtmId;
  if (gaId) analytics.ga_id = gaId;
  if (fbPixel) analytics.facebook_pixel_id = fbPixel;
  if (tiktokPixel) analytics.tiktok_pixel_id = tiktokPixel;
  if (hotjarId) analytics.hotjar_id = hotjarId;
  if (fbCapi) analytics.fb_capi_token = fbCapi;
  if (googleMp) analytics.google_mp_secret = googleMp;

  // Branding fields
  const customDomain = document.getElementById('sf-custom-domain').value.trim();
  const heroTitle = document.getElementById('sf-hero-title').value.trim();
  const heroSubtitle = document.getElementById('sf-hero-subtitle').value.trim();
  const faviconUrl = document.getElementById('sf-favicon-url').value.trim();
  const ogImageUrl = document.getElementById('sf-og-image-url').value.trim();

  showLoading('שומר...');
  try {
    const tid = getTenantId();
    const updates = {
      whatsapp_number: whatsapp || null,
      booking_url: bookingUrl || null,
      notification_method: notifyMethod,
      analytics: analytics,
      custom_domain: customDomain || null,
      hero_title: heroTitle || null,
      hero_subtitle: heroSubtitle || null,
      favicon_url: faviconUrl || null,
      og_image_url: ogImageUrl || null
    };

    const { data, error } = await sb.from(T.STOREFRONT_CONFIG)
      .update(updates)
      .eq('tenant_id', tid)
      .select('tenant_id')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Update returned no rows — check RLS policies');
    toast('הגדרות חנות נשמרו בהצלחה', 's');
  } catch (e) {
    console.error('saveStorefrontSettings error:', e);
    toast('שגיאה בשמירת הגדרות', 'e');
  } finally {
    hideLoading();
  }
}
