// supabase/functions/fetch-google-reviews/index.ts
// Edge Function: Fetch reviews from Google Places API
// CMS-7

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { google_place_id, google_api_key, tenant_id } = await req.json()

    if (!google_place_id) {
      return new Response(
        JSON.stringify({ error: 'google_place_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!google_api_key) {
      return new Response(
        JSON.stringify({ error: 'google_api_key is required. Set it in storefront_config.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch place details from Google Places API
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(google_place_id)}&fields=reviews,rating,user_ratings_total&key=${encodeURIComponent(google_api_key)}&language=he`

    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'OK') {
      return new Response(
        JSON.stringify({ error: `Google API error: ${data.status}`, details: data.error_message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = data.result || {}
    const reviews = (result.reviews || []).map((r: any) => ({
      author: r.author_name || 'Anonymous',
      rating: r.rating || 5,
      text: r.text || '',
      date: r.relative_time_description || '',
      google_review_id: `${google_place_id}_${r.author_name}_${r.time}`,
    }))

    return new Response(
      JSON.stringify({
        rating: result.rating || null,
        review_count: result.user_ratings_total || 0,
        reviews,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
