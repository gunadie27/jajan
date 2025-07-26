# Cart Persistence dengan localStorage

## Masalah Sebelumnya

Ketika aplikasi di-refresh atau reload, cart (keranjang belanja) akan hilang dan kasir harus mengulangi lagi proses penambahan produk. Ini sangat tidak efisien dan mengganggu workflow kasir.

## Solusi yang Diterapkan

### 1. localStorage Implementation

Cart sekarang disimpan di `localStorage` browser dengan key `maujajan_cart`:

```typescript
// Menyimpan cart ke localStorage
const saveCartToStorage = useCallback((cart: OrderItem[]) => {
  try {
    const cartData = {
      items: cart,
      timestamp: Date.now(),
      userId: user?.id || 'anonymous'
    };
    localStorage.setItem('maujajan_cart', JSON.stringify(cartData));
  } catch (error) {
    console.error('Error saving cart to localStorage:', error);
  }
}, [user?.id]);

// Memuat cart dari localStorage
const loadCartFromStorage = useCallback(() => {
  try {
    const cartData = localStorage.getItem('maujajan_cart');
    if (cartData) {
      const parsed = JSON.parse(cartData);
      // Cek apakah cart masih valid (dibuat dalam 24 jam terakhir)
      const isExpired = Date.now() - parsed.timestamp > 24 * 60 * 60 * 1000;
      if (!isExpired && parsed.userId === (user?.id || 'anonymous')) {
        return parsed.items;
      } else {
        // Hapus cart yang expired atau bukan milik user ini
        localStorage.removeItem('maujajan_cart');
      }
    }
  } catch (error) {
    console.error('Error loading cart from localStorage:', error);
    localStorage.removeItem('maujajan_cart');
  }
  return [];
}, [user?.id]);
```

### 2. Hook Initialization Order

**Penting**: Hook harus diinisialisasi dalam urutan yang benar untuk menghindari error "Cannot access before initialization":

```typescript
export default function POSPage() {
  // 1. Hooks harus dipanggil terlebih dahulu
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const { hasActiveSession } = useCashierSession();
  const customerStore = useCustomerStore();
  const { fetchCustomers } = customerStore;

  // 2. Kemudian baru useCallback yang menggunakan user
  const saveCartToStorage = useCallback((cart: OrderItem[]) => {
    // ... implementation
  }, [user?.id]);

  const loadCartFromStorage = useCallback(() => {
    // ... implementation
  }, [user?.id]);

  // 3. State initialization
  const [order, setOrder] = useState<OrderItem[]>([]);
  // ... other states
}
```

### 3. Lazy Loading Cart

Cart dimuat dari localStorage setelah user tersedia:

```typescript
// Muat cart dari localStorage setelah user tersedia
useEffect(() => {
  if (user && order.length === 0) {
    const savedCart = loadCartFromStorage();
    if (savedCart.length > 0) {
      setOrder(savedCart);
    }
  }
}, [user, loadCartFromStorage, order.length]);
```

### 4. Auto-Save Cart

Cart otomatis tersimpan setiap kali ada perubahan:

```typescript
// Simpan cart ke localStorage setiap kali order berubah
useEffect(() => {
  if (order.length > 0) {
    saveCartToStorage(order);
  } else {
    // Hapus cart dari localStorage jika kosong
    localStorage.removeItem('maujajan_cart');
  }
}, [order, saveCartToStorage]);
```

### 5. Clear Cart Functionality

Ditambahkan fungsi untuk membersihkan cart secara manual:

```typescript
// Fungsi untuk membersihkan cart
const clearCart = () => {
  setOrder([]);
  setAppliedDiscount(null);
  setCurrentMember(null);
  localStorage.removeItem('maujajan_cart');
  toast({
    title: "Cart Dikosongkan",
    description: "Semua item telah dihapus dari keranjang",
  });
};
```

### 6. Auto-Clear setelah Transaksi

Cart otomatis dibersihkan setelah transaksi berhasil:

```typescript
// Setelah transaksi berhasil
setOrder([]);
setAppliedDiscount(null);
setCurrentMember(null);
// ... other resets

// Bersihkan cart dari localStorage setelah transaksi berhasil
localStorage.removeItem('maujajan_cart');
```

## Fitur Keamanan

### 1. Expiration Time
Cart akan otomatis expired setelah 24 jam untuk mencegah data lama yang tidak relevan.

### 2. User-Specific
Cart hanya bisa diakses oleh user yang membuatnya (berdasarkan `user.id`).

### 3. Error Handling
Jika ada error saat membaca/menulis localStorage, cart akan di-reset ke default.

### 4. Validation
Cart yang tidak valid atau corrupt akan otomatis dihapus.

## UI Improvements

### 1. Clear Cart Button
Ditambahkan tombol "Kosongkan" di:
- Header (mobile & desktop)
- Sidebar keranjang (desktop)
- Dialog keranjang (mobile)

### 2. Visual Feedback
- Toast notification saat cart dikosongkan
- Tombol hanya muncul jika ada item di cart
- Icon trash untuk indikasi visual

## Struktur Data localStorage

```json
{
  "items": [
    {
      "product": {
        "id": "product-id",
        "name": "Nama Produk",
        "imageUrl": "url-gambar",
        "categoryId": "category-id"
      },
      "variant": {
        "id": "variant-id",
        "name": "Nama Varian",
        "price": 10000,
        "stock": 50,
        "trackStock": true
      },
      "quantity": 2,
      "price": 10000
    }
  ],
  "timestamp": 1703123456789,
  "userId": "user-id"
}
```

## Troubleshooting

### Error: "Cannot access 'user' before initialization"

**Penyebab**: Hook `useAuth()` dipanggil setelah `useCallback` yang menggunakan `user`.

**Solusi**: 
1. Pindahkan semua hooks ke bagian atas komponen
2. Pastikan urutan: hooks → useCallback → useState → useEffect
3. Gunakan lazy loading untuk cart initialization

```typescript
// ✅ Benar
export default function POSPage() {
  const { user } = useAuth(); // Hook pertama
  
  const saveCartToStorage = useCallback(() => {
    // Bisa menggunakan user
  }, [user?.id]); // useCallback kedua
  
  const [order, setOrder] = useState([]); // useState ketiga
  
  useEffect(() => {
    // useEffect keempat
  }, [user]);
}

// ❌ Salah
export default function POSPage() {
  const saveCartToStorage = useCallback(() => {
    // Error: user belum diinisialisasi
  }, [user?.id]);
  
  const { user } = useAuth(); // Hook dipanggil setelah useCallback
}
```

## Keuntungan

1. **Persistensi**: Cart tidak hilang saat refresh/reload
2. **User Experience**: Kasir tidak perlu mengulangi penambahan produk
3. **Efisiensi**: Workflow transaksi lebih cepat
4. **Keamanan**: Data cart aman dan user-specific
5. **Maintenance**: Auto-cleanup untuk data lama
6. **Flexibility**: Bisa dikosongkan manual jika diperlukan

## Testing

Untuk memverifikasi fitur berfungsi:
1. **Tambahkan produk** ke cart
2. **Refresh halaman** (F5)
3. **Cart seharusnya masih ada** dengan produk yang sama
4. **Lakukan transaksi**
5. **Cart seharusnya kosong** setelah transaksi berhasil
6. **Refresh lagi**, cart seharusnya tetap kosong 