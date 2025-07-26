# Format ID Transaksi Baru

## Format Lama (Terlalu Panjang)
```
0a8ae6d9-db64-4f00-8ffc-47f2665c9589
```

## Format Baru (Simpel & Mudah Dibaca)
```
YYMMDD-OUTLET-URUT
```

### Contoh Format Baru:

#### 1. Transaksi Pertama di Outlet "Maujajan Coffee" pada 25 Januari 2025:
```
250125-MC-001
```
- `250125` = 25 Januari 2025
- `MC` = Maujajan Coffee (huruf pertama tiap kata)
- `001` = Transaksi ke-1 hari itu

#### 2. Transaksi Kedua di Outlet "Warung Pak Haji" pada 25 Januari 2025:
```
250125-WPH-002
```
- `250125` = 25 Januari 2025
- `WPH` = Warung Pak Haji (huruf pertama tiap kata)
- `002` = Transaksi ke-2 hari itu

#### 3. Transaksi Pertama di Outlet "Toko Sejahtera" pada 26 Januari 2025:
```
260126-TS-001
```
- `260126` = 26 Januari 2025
- `TS` = Toko Sejahtera (huruf pertama tiap kata)
- `001` = Transaksi ke-1 hari itu

## Komponen Format:

### 1. Tanggal (YYMMDD)
- `YY` = Tahun (2 digit terakhir)
- `MM` = Bulan (2 digit, 01-12)
- `DD` = Tanggal (2 digit, 01-31)

### 2. Kode Outlet (OUTLET)
- Mengambil huruf pertama dari setiap kata nama outlet
- Maksimal 4 karakter
- Contoh:
  - "Maujajan Coffee" → "MC"
  - "Warung Pak Haji" → "WPH"
  - "Toko Sejahtera" → "TS"
  - "Cafe Bintang Lima" → "CBL"

### 3. Nomor Urut (URUT)
- Nomor urut transaksi pada hari tersebut untuk outlet tersebut
- Format 3 digit dengan padding 0
- Reset setiap hari
- Contoh: 001, 002, 003, dst.

## Keuntungan Format Baru:

1. **Mudah Dibaca**: Format yang intuitif dan mudah dipahami
2. **Informasi Lengkap**: Mengandung tanggal, outlet, dan urutan
3. **Pendek**: Hanya 12-15 karakter vs 36 karakter UUID
4. **User-Friendly**: Cocok untuk dikirim via WhatsApp
5. **Unik**: Kombinasi tanggal + outlet + urutan menjamin keunikan
6. **Sortable**: Bisa diurutkan secara alfanumerik

## Implementasi:

Format ini diimplementasikan di `src/services/data-service.ts` pada fungsi `addTransaction()`:

```typescript
// Generate kode outlet otomatis dari nama outlet
const outletCode = outletRecord.name.split(' ').map(k => k[0]).join('').toUpperCase().slice(0, 4);

// Format tanggal
const trxDate = date ? new Date(date) : new Date();
const yy = String(trxDate.getFullYear()).slice(-2);
const mm = String(trxDate.getMonth() + 1).padStart(2, '0');
const dd = String(trxDate.getDate()).padStart(2, '0');
const dateStr = `${yy}${mm}${dd}`;

// Hitung nomor urut
const trxCount = await prisma.transaction.count({
    where: {
        outletId: outletRecord.id,
        date: {
            gte: new Date(`${trxDate.getFullYear()}-${mm}-${dd}T00:00:00.000Z`),
            lt: new Date(`${trxDate.getFullYear()}-${mm}-${dd}T23:59:59.999Z`)
        }
    }
});

// Format ID transaksi
const urut = String(trxCount + 1).padStart(3, '0');
const transactionNumber = `${dateStr}-${outletCode}-${urut}`;
```

## Retry Logic:

Sistem memiliki retry logic untuk menangani race condition jika ada transaksi bersamaan:

```typescript
let retryCount = 0;
const maxRetries = 5;

while (retryCount < maxRetries) {
    try {
        // Hitung ulang nomor urut
        const trxCount = await prisma.transaction.count({...});
        const urut = String(trxCount + 1).padStart(3, '0');
        const transactionNumber = `${dateStr}-${outletCode}-${urut}`;
        
        // Buat transaksi
        const newTransaction = await prisma.transaction.create({...});
        return newTransaction;
    } catch (error: any) {
        if (error.code === 'P2002' && error.meta?.target?.includes('transactionNumber')) {
            // Unique constraint violation, retry
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 100));
        } else {
            throw error;
        }
    }
}
``` 