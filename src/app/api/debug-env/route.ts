import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '❌ Not set',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Not set',
    DATABASE_URL: process.env.DATABASE_URL ? '✅ Set' : '❌ Not set',
    NODE_ENV: process.env.NODE_ENV || '❌ Not set',
    VERCEL_URL: process.env.VERCEL_URL || '❌ Not set',
    VERCEL_ENV: process.env.VERCEL_ENV || '❌ Not set'
  };

  return NextResponse.json({
    success: true,
    environment: envVars,
    timestamp: new Date().toISOString(),
    message: 'Environment variables check for QR code system'
  });
} 