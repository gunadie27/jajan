# Changelog & Dokumentasi Perbaikan - 26 Juli 2025

## 1. QR Code Member & Shortlink
- Implementasi custom shortlink QR code member: `/qr/[memberId]` (bisa diubah ke `/q/`, `/m/`, dll)
- Link QR code di struk WhatsApp kini rapi: `https://app.maujajan.id/qr/[memberId]`
- Next.js API route & page route untuk redirect ke QR code Supabase
- Fallback ke Supabase Edge Function jika belum deploy custom route
- Fix environment variable Supabase (`SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_URL`)
- Robust inisialisasi Supabase client (server & client)
- Fix error build: "supabaseUrl is required"
- Fix TypeScript: install `@types/qrcode` & hapus opsi `type: 'image/png'` di `QRCode.toBuffer`

## 2. Diskon Member & UX
- Jika member sudah pakai diskon hari ini, transaksi tetap bisa lanjut TANPA diskon (UX friendly)
- Kasir dapat notifikasi: "Member sudah menggunakan diskon hari ini. Transaksi tetap bisa dilanjutkan tanpa diskon member."
- Nama & nomor WhatsApp tetap otomatis terisi setelah scan QR member
- Tidak ada blokir transaksi hanya karena diskon sudah habis

## 3. WhatsApp Struk & Diskon
- Struk WhatsApp menampilkan:
  - Subtotal sebelum diskon
  - Detail diskon (nama, persentase, jumlah)
  - Total setelah diskon
  - QR code member (jika member)
- Penanganan diskon produk tertentu & diskon global
- Penanganan transaksi campuran (produk diskon & non-diskon)

## 4. API & Deployment
- Debug API route: `/api/debug-env` untuk cek environment variables di production
- Test API QR code: `/api/test-qr` untuk test QR code generation di production
- Build local & production sudah include semua API routes
- Checklist deployment: pastikan env, domain, dan build sukses

## 5. Lain-lain
- Fix warning TypeScript: deklarasi manual jika perlu
- Penjelasan & edukasi alur QR, diskon, dan shortlink ke user
- Semua perbaikan didokumentasikan secara proaktif

---

**Status:**
- Semua bug utama hari ini sudah teratasi
- UX transaksi member & diskon sudah optimal
- QR code member & shortlink sudah production ready
- Dokumentasi & changelog sudah lengkap

---

**Catatan:**
- Jika ada bug baru, cukup update changelog ini
- Untuk deployment production, pastikan env & domain sudah benar
- Untuk custom shortlink, bisa ganti route sesuai branding 