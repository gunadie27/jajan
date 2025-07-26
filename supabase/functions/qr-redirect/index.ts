import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const memberId = url.pathname.split('/').pop() // Ambil memberId dari path

    if (!memberId) {
      return new Response('Member ID tidak ditemukan', { 
        status: 400,
        headers: corsHeaders 
      })
    }

    // Redirect ke QR code asli di Supabase Storage
    const qrCodeUrl = `https://geqebteyoseuvcmpvimp.supabase.co/storage/v1/object/public/produkimg/QR%20Code/member-${memberId}.png`
    
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': qrCodeUrl
      }
    })

  } catch (error) {
    return new Response(`Error: ${error.message}`, { 
      status: 500,
      headers: corsHeaders 
    })
  }
}) 