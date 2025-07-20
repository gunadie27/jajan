import { NextRequest, NextResponse } from 'next/server';
import { addProduct } from '@/services/data-service';

export async function POST(request: NextRequest) {
  console.log('API /manajemenproduk dipanggil');
  try {
    const body = await request.json();
    // Sementara, user mock (ganti dengan session user jika sudah ada auth)
    const user = { role: 'owner', outletId: body.outletId };
    const result = await addProduct(body, user);
    return NextResponse.json({ success: true, product: result });
  } catch (error) {
    console.error('API /manajemenproduk error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
} 