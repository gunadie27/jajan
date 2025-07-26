# Troubleshooting QR Code Member

## Masalah: QR Code Tidak Muncul di Struk WhatsApp

### 1. Cek Environment Variables

Pastikan file `.env.local` berisi:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Cek Supabase Storage

Pastikan bucket `produkimg` sudah ada dan folder `QR Code` sudah dibuat:
- Bucket: `produkimg`
- Folder: `QR Code`
- Permissions: Public read access

### 3. Debug Steps

#### A. Cek Console Browser
Buka Developer Tools → Console, lalu lakukan transaksi member. Akan muncul log:
```
🔍 Looking for customer: [nama_customer]
📋 Customer found: [data_customer]
🎫 Member ID: [member_id]
✅ QR Code generated: [qr_url]
```

#### B. Test API Manual
Buka browser, akses:
```
http://localhost:3000/api/member-qr?memberId=test
```
Seharusnya return error 400 (karena memberId tidak valid).

#### C. Test Generate QR Code
```javascript
// Di browser console
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

### 4. Kemungkinan Masalah

#### A. Customer Tidak Ditemukan
- Pastikan customer ada di database
- Pastikan `customerName` di transaction sesuai dengan `phoneNumber` di database
- Cek apakah customer memiliki `isMember: true` dan `memberId`

#### B. Supabase Connection Error
- Cek environment variables
- Cek network connectivity
- Cek Supabase project status

#### C. Storage Permission Error
- Cek bucket permissions
- Cek service role key permissions
- Cek folder structure

### 5. Log Debug

Tambahkan log ini di `generateReceiptText`:
```javascript
console.log('Transaction:', transaction);
console.log('Customer Name:', transaction?.customerName);
console.log('Discount Name:', transaction?.discountName);
```

### 6. Test Manual

1. Buat transaksi dengan member
2. Scan QR member di POS
3. Selesaikan transaksi
4. Kirim struk WhatsApp
5. Cek apakah QR code URL muncul

### 7. Fallback Solution

Jika QR code tetap tidak muncul, bisa gunakan data member sebagai text:
```javascript
if (customer && customer.isMember) {
    const memberData = {
        memberId: customer.memberId,
        name: customer.name,
        phone: customer.phoneNumber
    };
    text += `Member Data: ${JSON.stringify(memberData)}\n\n`;
}
``` 