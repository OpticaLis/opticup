// catalog-auth.js — auth gate for lens-catalog-admin.html
// Verifies Supabase Auth session + is_platform_super_admin RPC.
// Reuses SUPABASE_URL + SUPABASE_ANON from window.supabase + js/shared.js conventions.

const SUPABASE_URL = 'https://tsxrrxzmdxaenlvocyit.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzeHJyeHptZHhhZW5sdm9jeWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIxNzIsImV4cCI6MjA4ODUzODE3Mn0.7Z_lrqHctUqm1offIvZxA17wCI4kRopFWgL1jCDJ9ZU';

// eslint-disable-next-line no-undef
export const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'optic_admin_auth' },
});

export async function gateAuthOrRedirect() {
  const gateEl = document.getElementById('auth-gate');
  const errorEl = document.getElementById('auth-gate-error');
  gateEl.style.display = 'flex';

  // Check Supabase Auth session
  const { data: { session }, error: sessErr } = await sb.auth.getSession();
  if (sessErr || !session) {
    document.getElementById('auth-gate-title').textContent = 'נדרשת התחברות';
    errorEl.textContent = 'לא נמצא סשן Supabase Auth פעיל. התחבר דרך Platform Admin תחילה.';
    return false;
  }

  // Check is_platform_super_admin (server-side RPC)
  const { data: isAdmin, error: rpcErr } = await sb.rpc('is_platform_super_admin');
  if (rpcErr) {
    errorEl.textContent = 'שגיאה בבדיקת הרשאות: ' + rpcErr.message;
    return false;
  }
  if (isAdmin !== true) {
    document.getElementById('auth-gate-title').textContent = 'אין הרשאה';
    errorEl.textContent = 'הדף זמין רק לחברי צוות Optic Up עם הרשאת Platform Super Admin. החשבון הנוכחי אינו במצב זה.';
    return false;
  }

  gateEl.style.display = 'none';
  return true;
}
