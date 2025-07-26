import { NextRequest, NextResponse } from 'next/server';
import { QRService } from '@/services/qr-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId, name, phone } = body;

    if (!memberId || !name || !phone) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: memberId, name, phone'
      }, { status: 400 });
    }

    console.log('🧪 Testing QR generation for:', { memberId, name, phone });

    const memberData = {
      memberId,
      name,
      phone
    };

    const qrUrl = await QRService.getOrGenerateMemberQR(memberData);

    return NextResponse.json({
      success: true,
      qrUrl,
      memberData,
      message: 'QR code generated successfully'
    });

  } catch (error) {
    console.error('❌ Error testing QR generation:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Failed to generate QR code'
    }, { status: 500 });
  }
} 