# Maujajan POS - README & Developer Guide

Selamat datang di proyek Maujajan POS! Dokumen ini berfungsi sebagai panduan utama untuk memahami, menjalankan, dan mengembangkan aplikasi ini. Dokumen ini dirancang agar dapat dipahami dengan baik oleh developer maupun tools AI seperti Gemini CLI.

## Daftar Isi
1.  [Visi & Tujuan Aplikasi](#1-visi--tujuan-aplikasi)
2.  [Arsitektur & Teknologi](#2-arsitektur--teknologi)
3.  [Struktur Proyek](#3-struktur-proyek)
4.  [Menjalankan Proyek Secara Lokal](#4-menjalankan-proyek-secara-lokal)
5.  **[Panduan Migrasi ke Database (Penting!)](#5-panduan-migrasi-ke-database-penting)**

---

## 1. Visi & Tujuan Aplikasi

**Maujajan POS** adalah sistem kasir modern yang dirancang untuk menyederhanakan dan mengotomatiskan operasi harian bisnis F&B. Aplikasi ini bertujuan untuk:
- **Mempercepat Proses Transaksi**: Mengurangi waktu tunggu pelanggan dengan antarmuka yang intuitif.
- **Menyediakan Data Real-time**: Memberikan data penjualan dan laba rugi yang akurat.
- **Menyederhanakan Manajemen**: Memudahkan pengelolaan produk, stok, dan harga.
- **Memberikan Kontrol Penuh**: Memberikan visibilitas penuh kepada pemilik bisnis melalui laporan yang komprehensif.

---

## 2. Arsitektur & Teknologi

Aplikasi ini dibangun menggunakan tumpukan teknologi modern yang dirancang untuk kecepatan, keandalan, dan skalabilitas.

- **Framework Utama:** **Next.js (React)**
  - Menggunakan **App Router** untuk rendering sisi server (SSR) yang optimal.
  - Memanfaatkan **Server Components** untuk mengurangi jumlah JavaScript yang dikirim ke klien.
- **Bahasa Pemrograman:** **TypeScript**
  - Menjamin keamanan tipe data di seluruh aplikasi, mengurangi *runtime error*.
- **Styling & UI Components:**
  - **Tailwind CSS:** Utility-first CSS framework untuk styling yang cepat dan konsisten.
  - **ShadCN UI:** Pustaka komponen yang aksesibel dan dapat disusun.
- **Keamanan Kata Sandi:**
  - **bcrypt**: Kata sandi pengguna di-hash menggunakan bcrypt, standar industri untuk keamanan.
- **Lapisan Akses Data (Data Access Layer):**
  - **Service Layer (`src/services/data-service.ts`)**: Ini adalah bagian krusial dari arsitektur kami. Semua logika untuk mengambil atau memanipulasi data (misalnya, `getProducts`, `addTransaction`) diisolasi dalam lapisan ini. Komponen UI **tidak pernah** mengakses sumber data secara langsung, melainkan memanggil fungsi-fungsi di dalam *service* ini.
  - **Sumber Data Saat Ini:** Saat ini, *service layer* mengambil data dari file statis (`src/lib/data.ts`) untuk mensimulasikan database.

---

## 3. Struktur Proyek

```
maujajan-pos/
├── prisma/                     # (Opsional) Muncul setelah inisialisasi Prisma
│   └── schema.prisma           # Skema database Anda
├── src/
│   ├── app/
│   │   ├── (app)/                # Rute yang memerlukan otentikasi (dashboard, pos, dll.)
│   │   │   ├── layout.tsx        # Layout utama dengan sidebar & header
│   │   │   └── page.tsx          # Halaman-halaman aplikasi
│   │   ├── layout.tsx            # Layout root
│   │   └── page.tsx              # Halaman login
│   ├── components/
│   │   ├── ui/                   # Komponen dasar dari ShadCN UI
│   │   └── app-logo.tsx          # Komponen-komponen kustom aplikasi
│   ├── hooks/
│   │   └── use-auth.tsx          # Custom hook untuk manajemen otentikasi
│   ├── lib/
│   │   ├── data.ts               # (HANYA UNTUK SIMULASI) Sumber data statis
│   │   ├── types.ts              # Definisi tipe TypeScript global
│   │   └── utils.ts              # Fungsi utilitas (e.g., cn)
│   ├── services/
│   │   └── data-service.ts       # (PENTING) Lapisan abstraksi data. Semua query ke DB akan ada di sini.
├── public/                       # Aset statis (gambar, ikon)
├── .env                          # (PENTING) File untuk menyimpan kredensial database
├── package.json                  # Dependensi proyek
└── README.md                     # Anda sedang membaca file ini
```

---

## 4. Menjalankan Proyek Secara Lokal

1.  **Install Dependensi**:
    ```bash
    npm install
    ```
2.  **Jalankan Server Development**:
    ```bash
    npm run dev
    ```
3.  Buka [http://localhost:9002](http://localhost:9002) di browser Anda.

---

## 5. Panduan Migrasi ke Database (Penting!)

Aplikasi ini sengaja dirancang agar mudah dihubungkan ke database backend seperti **PostgreSQL**. Kunci dari kemudahan ini adalah **Service Layer** (`src/services/data-service.ts`).

### Konsep Utama

Saat ini, komponen UI (misalnya, halaman Manajemen Produk) tidak tahu dari mana datanya berasal. Ia hanya memanggil fungsi seperti `getProducts()` dari `data-service`.

```typescript
// Contoh di dalam komponen UI:
import { getProducts } from '@/services/data-service';

const products = await getProducts(); // Komponen hanya tahu cara "meminta" data.
```

Saat ini, implementasi `getProducts` di dalam `data-service.ts` terlihat seperti ini:

```typescript
// src/services/data-service.ts (Saat Ini)
import { products } from '@/lib/data';

export async function getProducts(): Promise<Product[]> {
  // Mengambil data dari file statis
  return Promise.resolve(products);
}
```

### Langkah-langkah Migrasi ke PostgreSQL (dengan Prisma sebagai contoh)

Ketika Anda siap untuk menggunakan PostgreSQL, Anda **hanya perlu mengubah isi dari fungsi-fungsi di dalam `src/services/data-service.ts`**. Komponen UI Anda tidak perlu diubah sama sekali.

1.  **Siapkan Database dan File `.env`**:
    - Pastikan server PostgreSQL Anda berjalan.
    - Buat database dan user di PostgreSQL. Contoh: database `pos-app`, user `maujajan_user`.
    - Buat file `.env` di direktori utama proyek.
    - Isi file `.env` dengan URL koneksi database Anda.
      ```env
      DATABASE_URL="postgresql://<USER>:<PASSWORD>@<HOST>:<PORT>/<DATABASE_NAME>?schema=public"
      # Contoh:
      # DATABASE_URL="postgresql://maujajan_user:mysecretpassword@localhost:5432/pos-app?schema=public"
      ```

2.  **Setup Prisma (atau ORM pilihan Anda)**:
    - Install Prisma: `npm install prisma --save-dev`
    - Inisialisasi Prisma: `npx prisma init --datasource-provider postgresql` (Perintah ini akan membaca `.env` Anda).
    - Definisikan model data Anda di `prisma/schema.prisma` agar cocok dengan tipe di `src/lib/types.ts`.
    - Jalankan migrasi untuk membuat tabel di database: `npx prisma migrate dev --name init`

3.  **Ubah Implementasi Service Layer**:
    Ubah file `src/services/data-service.ts` untuk menggunakan Prisma Client.

    **Contoh Perubahan `getProducts`:**

    ```typescript
    // src/services/data-service.ts (Setelah Migrasi)

    // Hapus impor dari lib/data
    // import { products } from '@/lib/data';

    // Impor Prisma Client Anda
    import { PrismaClient } from '@prisma/client';
    import type { Product } from '@/lib/types'; // Pastikan tipe tetap diimpor
    const prisma = new PrismaClient();

    export async function getProducts(): Promise<Product[]> {
      // Ganti implementasi dengan query database
      const dbProducts = await prisma.product.findMany({
        include: {
          variants: true, // Asumsikan ada relasi di schema.prisma
        },
      });
      // Pastikan data yang dikembalikan cocok dengan tipe 'Product'
      return dbProducts as any; // Mungkin perlu penyesuaian tipe
    }
    
    // Lakukan hal yang sama untuk semua fungsi lain di file ini
    // (getTransactions, addUser, dll.)
    ```
    
    **Penting Mengenai Data Awal:**
    - Setelah terhubung ke database, data statis dari `src/lib/data.ts` tidak akan digunakan lagi.
    - Anda perlu mengisi data awal (seeding) langsung ke database Anda, terutama untuk pengguna (users) dan outlet. Anda bisa membuat script "seed" menggunakan Prisma untuk ini. Untuk login awal, pastikan Anda membuat data pengguna (misal: `owner@maujajan.com`) di tabel `User` dengan password yang sudah di-hash menggunakan **bcrypt**.

4.  **Hapus Data Statis**:
    Setelah semua fungsi di `data-service.ts` terhubung ke database dan Anda telah mengisi data awal, Anda dapat dengan aman menghapus file `src/lib/data.ts`.

Dengan mengikuti arsitektur ini, proses migrasi menjadi sangat jelas, cepat, dan minim risiko.
