import { NextRequest, NextResponse } from 'next/server';
import { QRService, type MemberQRData } from '@/services/qr-service';
import { getCustomerByPhone } from '@/services/data-service';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 API: POST /api/member-qr called');
    
    const { memberId, name, phone } = await request.json();
    console.log('📥 API: Received data:', { memberId, name, phone });

    if (!memberId || !name) {
      console.log('❌ API: Missing required fields');
      return NextResponse.json(
        { error: 'memberId dan name diperlukan' },
        { status: 400 }
      );
    }

    const memberData: MemberQRData = {
      memberId,
      name,
      phone
    };

    console.log('🔄 API: Calling QRService.getOrGenerateMemberQR');
    
    // Generate atau dapatkan QR code URL
    const qrUrl = await QRService.getOrGenerateMemberQR(memberData);
    
    console.log('✅ API: QR URL generated:', qrUrl);

    return NextResponse.json({ 
      success: true, 
      qrUrl,
      memberData 
    });

  } catch (error) {
    console.error('❌ API: Error generating member QR:', error);
    return NextResponse.json(
      { error: 'Gagal generate QR code member', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { error: 'memberId diperlukan' },
        { status: 400 }
      );
    }

    // Dapatkan URL QR code yang sudah ada
    const qrUrl = await QRService.getMemberQRUrl(memberId);

    if (!qrUrl) {
      return NextResponse.json(
        { error: 'QR code member tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      qrUrl 
    });

  } catch (error) {
    console.error('Error getting member QR:', error);
    return NextResponse.json(
      { error: 'Gagal mendapatkan QR code member' },
      { status: 500 }
    );
  }
} 