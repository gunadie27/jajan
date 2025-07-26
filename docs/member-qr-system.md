# Member QR Code System

## Overview
Sistem QR code untuk member yang memungkinkan validasi member melalui QR code dan pengiriman QR code member via WhatsApp.

## Key Features
- ✅ Generate QR code member otomatis
- ✅ Validasi member harian (1x sehari)
- ✅ Integrasi dengan WhatsApp receipt
- ✅ Penyimpanan QR code di Supabase Storage
- ✅ Auto-fill data member di WhatsApp dialog

## Workflow
1. **Member Scan QR** → Validasi member di POS
2. **Transaksi Selesai** → Generate QR code member (jika belum ada)
3. **Kirim Struk WhatsApp** → QR code member otomatis ditambahkan ke struk
4. **Member Terima Struk** → Link QR code untuk scan berikutnya

## Technical Components

### QRService (src/services/qr-service.ts)
- Generate QR code dari data member
- Upload ke Supabase Storage bucket "produkimg" folder "QR Code"
- Retrieve QR code URL yang sudah ada

### Data Service Functions
```typescript
// Validasi penggunaan diskon harian
canMemberUseDiscount(memberId: string): Promise<boolean>

// Update penggunaan diskon member
updateMemberDiscountUsage(memberId: string): Promise<void>
```

### API Routes
- `POST /api/member-qr` - Generate dan upload QR code
- `GET /api/member-qr` - Retrieve QR code URL yang sudah ada

## Database Schema Changes
```prisma
model Customer {
  // ... existing fields
  lastDiscountDate     DateTime?     // Tanggal terakhir menggunakan diskon member
  // ...
}
```

## Supabase Configuration
- **Bucket:** `produkimg`
- **Folder:** `QR Code`
- **File naming:** `member-{memberId}.png`
- **Public URL format:** `https://[supabase-url]/storage/v1/object/public/produkimg/QR%20Code/member-{memberId}.png`

## Example Usage
1. Member scan QR code di POS
2. System validasi member dan diskon harian
3. Transaksi selesai, QR code otomatis tergenerate
4. Struk WhatsApp dikirim dengan link QR code member
5. Member bisa scan QR code dari struk untuk transaksi berikutnya

## Security
- QR code hanya bisa digunakan 1x sehari per member
- Validasi member berdasarkan memberId di database
- QR code disimpan di Supabase dengan public access untuk sharing

## Troubleshooting

### QR Code Tidak Muncul di Struk WhatsApp
**Root Cause:** `currentMember` di-reset menjadi `null` sebelum `generateReceiptText` dipanggil.

**Fix Applied:**
1. Hapus `setCurrentMember(null)` dari `handleCloseWhatsAppDialog`
2. Pindahkan reset `currentMember` ke `handleWhatsAppConfirm` setelah transaksi selesai
3. Pastikan `currentMember` tetap terisi saat `generateReceiptText` dipanggil

**Test Steps:**
1. Scan QR member di POS
2. Lakukan transaksi
3. Kirim struk WhatsApp
4. Cek log browser: `currentMember` harus terisi (bukan `null`)
5. Cek struk WhatsApp: link QR code harus muncul

### API Test
```bash
# Test generate QR code
curl -X POST http://localhost:3000/api/member-qr \
  -H "Content-Type: application/json" \
  -d '{"memberId":"test-123","name":"Test Member","phone":"081234567890"}'
```

### Environment Variables Required
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Recent Fixes (Latest)
- **Fix currentMember State Management:** Mencegah `currentMember` di-reset sebelum QR code generation
- **Backend API Verification:** API `/api/member-qr` sudah terbukti berfungsi dan generate QR code di Supabase
- **Frontend Integration:** WhatsAppDialog menerima `currentMember` prop dengan benar
- **Error Handling:** Improved error handling untuk QR code generation dan API calls 