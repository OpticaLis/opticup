// Storefront Settings — load/save WhatsApp, booking, notification settings
// Uses storefront_config table via T.STOREFRONT_CONFIG

async function loadStorefrontSettings() {
  showLoading('טוען הגדרות חנות...');
  try {
    const tid = getTenantId();
    const { data, error } = await sb.from(T.STOREFRONT_CONFIG)
      .select('whatsapp_number, booking_url, notification_method')
      .eq('tenant_id', tid)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      document.getElementById('sf-whatsapp').value = data.whatsapp_number || '';
      document.getElementById('sf-booking-url').value = data.booking_url || '';
      document.getElementById('sf-notify-method').value = data.notification_method || 'whatsapp';
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

  showLoading('שומר...');
  try {
    const tid = getTenantId();
    const updates = {
      whatsapp_number: whatsapp || null,
      booking_url: bookingUrl || null,
      notification_method: notifyMethod
    };

    const { error } = await sb.from(T.STOREFRONT_CONFIG)
      .update(updates)
      .eq('tenant_id', tid);

    if (error) throw error;
    toast('הגדרות חנות נשמרו בהצלחה', 's');
  } catch (e) {
    console.error('saveStorefrontSettings error:', e);
    toast('שגיאה בשמירת הגדרות', 'e');
  } finally {
    hideLoading();
  }
}
