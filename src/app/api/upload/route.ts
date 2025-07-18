
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server'
import { join } from 'path'
import { z } from 'zod'
import sharp from 'sharp'

const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const allowedOrigins = ['https://app.namadomain.com', 'http://localhost:3000'];

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  if (!allowedOrigins.includes(origin)) {
    return new NextResponse('CORS Forbidden', { status: 403 });
  }
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-user-role',
    },
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  if (!allowedOrigins.includes(origin)) {
    console.warn('CORS Forbidden upload attempt from', origin);
    return NextResponse.json({ success: false, error: 'CORS Forbidden' }, { status: 403 });
  }
  // Cek role user (hanya owner yang boleh upload)
  const userRole = request.headers.get('x-user-role');
  if (userRole !== 'owner') {
    console.warn('Forbidden upload attempt by non-owner');
    return NextResponse.json({ success: false, error: 'Forbidden: Only owner can upload' }, { status: 403 });
  }

  const data = await request.formData()
  const file: File | null = data.get('file') as unknown as File

  if (!file) {
    console.warn('No file uploaded');
    return NextResponse.json({ success: false, error: 'No file uploaded' })
  }

  // Validasi tipe file
  if (!allowedTypes.includes(file.type)) {
    console.warn('File type not allowed:', file.type);
    return NextResponse.json({ success: false, error: 'File type not allowed' }, { status: 400 });
  }

  // Validasi ukuran file
  if (file.size > MAX_SIZE) {
    console.warn('File too large:', file.size);
    return NextResponse.json({ success: false, error: 'File too large (max 2MB)' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Kompresi gambar dengan sharp
  let compressedBuffer: Buffer;
  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    let sharpInstance = sharp(buffer).resize({ width: 800, withoutEnlargement: true });
    if (ext === 'jpg' || ext === 'jpeg') {
      sharpInstance = sharpInstance.jpeg({ quality: 80 });
    } else if (ext === 'png') {
      sharpInstance = sharpInstance.png({ quality: 80 });
    } else if (ext === 'webp') {
      sharpInstance = sharpInstance.webp({ quality: 80 });
    }
    compressedBuffer = await sharpInstance.toBuffer();
  } catch (err) {
    console.error('Image compression failed', err);
    return NextResponse.json({ success: false, error: 'Image compression failed' }, { status: 500 });
  }

  // Rename file ke nama acak
  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
  // Upload ke Supabase Storage
  try {
    const { data, error } = await supabase.storage
      .from('produkimg')
      .upload(filename, compressedBuffer, {
        contentType: file.type,
        upsert: false,
      });
    if (error) {
      console.error('Supabase upload error:', error.message);
      return NextResponse.json({ success: false, error: 'Supabase upload failed: ' + error.message }, { status: 500 });
    }
    // Ambil public URL
    const { data: publicUrlData } = supabase.storage.from('produkimg').getPublicUrl(filename);
    return new NextResponse(JSON.stringify({ success: true, path: publicUrlData.publicUrl }), {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': origin,
      },
    });
  } catch (err) {
    console.error('Supabase upload exception:', err);
    return NextResponse.json({ success: false, error: 'Supabase upload exception' }, { status: 500 });
  }
}
