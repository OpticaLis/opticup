(function () {
  'use strict';

  // Messaging configuration — reference values only.
  //
  // Since Architecture v3 (P3c+P4, 2026-04-22), the CRM no longer calls Make
  // directly — it invokes the `send-message` Edge Function, which forwards a
  // ready-to-send payload to Make. The Make webhook URL below is the upstream
  // target of that Edge Function (read from the `MAKE_SEND_MESSAGE_WEBHOOK_URL`
  // Supabase secret at runtime). It lives here as human-readable documentation
  // of which Make scenario receives the final send. Update BOTH this value and
  // the Supabase secret when the Make scenario is rebuilt.

  window.CrmMessagingConfig = {
    MAKE_SEND_WEBHOOK: 'https://hook.eu2.make.com/n7y5m7x9m9yn4uqo3ielqsobdn8s5nui'
  };
})();
