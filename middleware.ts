import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const blockedBots = [
  'Googlebot', 'Bingbot', 'Slurp', 'DuckDuckBot', 'Baiduspider', 'YandexBot', 'Sogou', 'Exabot', 'facebot', 'ia_archiver', 'AhrefsBot', 'SemrushBot', 'MJ12bot', 'DotBot', 'PetalBot'
];

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  if (blockedBots.some(bot => userAgent.includes(bot))) {
    return new NextResponse('Blocked', { status: 403 });
  }
  return NextResponse.next();
} 