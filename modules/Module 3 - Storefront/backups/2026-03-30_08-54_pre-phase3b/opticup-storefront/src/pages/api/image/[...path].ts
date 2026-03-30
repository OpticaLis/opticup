import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

export const GET: APIRoute = async ({ params }) => {
  const path = params.path;

  if (!path || !path.startsWith('frames/')) {
    return new Response('Forbidden', { status: 403 });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response('Server misconfigured', { status: 500 });
  }

  const sb = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await sb.storage
    .from('frame-images')
    .createSignedUrl(path, 3600); // 1 hour

  if (error || !data?.signedUrl) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: data.signedUrl,
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
};
