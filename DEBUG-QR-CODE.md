# Debug QR Code Member - Step by Step

## Langkah 1: Cek Environment Variables

Buka browser, akses:
```
http://localhost:3000/api/debug-env
```

Pastikan semua environment variables sudah terset:
- `NEXT_PUBLIC_SUPABASE_URL`: ✅ Set
- `SUPABASE_SERVICE_ROLE_KEY`: ✅ Set
- `DATABASE_URL`: ✅ Set

## Langkah 2: Test API QR Code

Buka browser console, jalankan:
```javascript
// Test generate QR code
fetch('/api/member-qr', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    memberId: 'test-123',
    name: 'Test Member',
    phone: '081234567890'
  })
}).then(r => r.json()).then(console.log)
```

## Langkah 3: Lakukan Transaksi Member

1. Buka aplikasi di browser
2. Login sebagai owner/cashier
3. Buka halaman POS
4. Scan QR member (atau pilih member dari list)
5. Tambahkan produk ke cart
6. Selesaikan transaksi
7. Kirim struk WhatsApp

## Langkah 4: Cek Console Logs

Buka Developer Tools → Console, cari log dengan emoji:
- 🔍 DEBUG - Transaction data
- 🔍 Looking for customer
- 📋 Customer found
- 🎫 Member ID
- 📤 Sending member data
- 📥 API Response status
- ✅ QR Code generated
- ✅ QR Code added to text

## Langkah 5: Cek Server Logs

Di terminal, cari log dengan prefix:
- 🔧 API: POST /api/member-qr called
- 📥 API: Received data
- 🔄 API: Calling QRService.getOrGenerateMemberQR
- 🔧 QRService: getOrGenerateMemberQR called
- 🔧 QRService: generateMemberQR called
- 📤 QRService: Uploading to Supabase
- ✅ QRService: Upload successful
- ✅ QRService: Public URL

## Kemungkinan Masalah & Solusi

### 1. Environment Variables Tidak Set
**Gejala:** Error "supabaseUrl is required"
**Solusi:** Set environment variables di `.env.local`

### 2. Customer Tidak Ditemukan
**Gejala:** Log "❌ Customer not found or not a member"
**Solusi:** Pastikan customer ada di database dengan `isMember: true`

### 3. Supabase Storage Error
**Gejala:** Error upload di QRService
**Solusi:** Cek bucket `produkimg` dan folder `QR Code` di Supabase

### 4. API Route Error
**Gejala:** Response status bukan 200
**Solusi:** Cek server logs untuk detail error

## Test Manual

Jika semua di atas sudah benar tapi QR code tetap tidak muncul, coba:

1. **Cek apakah transaksi memiliki discountName**
2. **Cek apakah customerName ada di transaksi**
3. **Cek apakah customer memiliki memberId**
4. **Cek apakah API call berhasil**

## Fallback Solution

Jika QR code tetap tidak bisa di-generate, bisa gunakan data member sebagai text:

```javascript
// Di generateReceiptText, ganti logic QR code dengan:
if (customer && customer.isMember) {
    const memberData = {
        memberId: customer.memberId,
        name: customer.name,
        phone: customer.phoneNumber
    };
    text += `Member Data: ${JSON.stringify(memberData)}\n\n`;
}
``` 