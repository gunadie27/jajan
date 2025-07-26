import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { memberId: string } }
) {
  try {
    const { memberId } = params;
    
    console.log('🔍 QR Redirect API called with memberId:', memberId);

    if (!memberId) {
      console.log('❌ Member ID tidak ditemukan');
      return new NextResponse('Member ID tidak ditemukan', { status: 400 });
    }

    // Redirect ke QR code asli di Supabase Storage
    const qrCodeUrl = `https://geqebteyoseuvcmpvimp.supabase.co/storage/v1/object/public/produkimg/QR%20Code/member-${memberId}.png`;
    
    console.log('🔄 Redirecting to:', qrCodeUrl);
    
    return NextResponse.redirect(qrCodeUrl);

  } catch (error) {
    console.error('❌ Error in QR redirect:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 