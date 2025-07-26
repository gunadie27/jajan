import { redirect } from 'next/navigation';

export default function QRRedirectPage({ params }: { params: { memberId: string } }) {
  const { memberId } = params;
  
  // Redirect ke QR code asli di Supabase Storage
  const qrCodeUrl = `https://geqebteyoseuvcmpvimp.supabase.co/storage/v1/object/public/produkimg/QR%20Code/member-${memberId}.png`;
  
  redirect(qrCodeUrl);
} 