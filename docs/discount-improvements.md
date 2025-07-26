# Perbaikan Fitur Diskon

## Masalah yang Diperbaiki

### 1. Error DialogContent Accessibility
**Error**: `DialogContent` requires a `DialogTitle` for the component to be accessible for screen reader users.

**Lokasi**: `src/app/(app)/discount/components/discount-dialog.tsx`

**Penyebab**: `DialogTitle` menggunakan class `sr-only` (screen reader only) yang tersembunyi secara visual.

**Solusi**: 
```typescript
// Sebelum (Error)
<DialogContent className="max-w-md w-full p-0 overflow-hidden rounded-2xl shadow-2xl border-0">
  <DialogTitle className="sr-only">{title}</DialogTitle>
  {content}
</DialogContent>

// Sesudah (Benar)
<DialogContent className="max-w-md w-full p-0 overflow-hidden rounded-2xl shadow-2xl border-0">
  <DialogHeader className="px-6 pt-6 pb-0">
    <DialogTitle className="text-2xl font-bold text-primary font-headline">{title}</DialogTitle>
    <DialogDescription className="text-base text-muted-foreground font-sans">{description}</DialogDescription>
  </DialogHeader>
  <div className="px-6 pb-6">
    <DiscountForm initialData={initialData} onSubmit={handleSubmit} isLoading={isLoading} />
  </div>
</DialogContent>
```

### 2. Penambahan Field Tanggal Mulai dan Berakhir

**Permintaan**: Menambahkan field tanggal mulai dan berakhir untuk program diskon.

**Implementasi**:

#### A. Schema Validasi (Zod)
```typescript
const formSchema = z.object({
  name: z.string().min(3, 'Nama promo minimal 3 karakter'),
  isActive: z.boolean().default(true),
  validFrom: z.date({
    required_error: "Tanggal mulai harus diisi",
  }),
  validUntil: z.date({
    required_error: "Tanggal berakhir harus diisi",
  }),
  // ... field lainnya
}).refine((data) => data.validUntil > data.validFrom, {
  message: "Tanggal berakhir harus setelah tanggal mulai",
  path: ["validUntil"],
});
```

#### B. Form Fields
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <FormField
    control={form.control}
    name="validFrom"
    render={({ field }) => (
      <FormItem className="flex flex-col">
        <FormLabel>Tanggal Mulai</FormLabel>
        <Popover>
          <PopoverTrigger asChild>
            <FormControl>
              <Button variant={"outline"} className="w-full pl-3 text-left font-normal">
                {field.value ? format(field.value, "PPP") : <span>Pilih tanggal mulai</span>}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </FormControl>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={field.value}
              onSelect={field.onChange}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <FormMessage />
      </FormItem>
    )}
  />

  <FormField
    control={form.control}
    name="validUntil"
    render={({ field }) => (
      <FormItem className="flex flex-col">
        <FormLabel>Tanggal Berakhir</FormLabel>
        <Popover>
          <PopoverTrigger asChild>
            <FormControl>
              <Button variant={"outline"} className="w-full pl-3 text-left font-normal">
                {field.value ? format(field.value, "PPP") : <span>Pilih tanggal berakhir</span>}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </FormControl>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={field.value}
              onSelect={field.onChange}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <FormMessage />
      </FormItem>
    )}
  />
</div>
```

#### C. Default Values
```typescript
defaultValues: initialData || {
  name: '',
  isActive: true,
  validFrom: new Date(),
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 hari dari sekarang
  discountType: 'PERCENTAGE',
  appliesTo: 'ALL',
  minPurchase: 0,
  scope: 'ENTIRE_ORDER',
}
```

### 3. Penghapusan Subtotal Simulasi

**Permintaan**: Menghapus field subtotal simulasi yang tidak diperlukan.

**Perubahan**:
- Menghapus state `simSubtotal`
- Menghapus kalkulasi preview diskon
- Menghapus input field subtotal simulasi
- Menghapus komponen preview hasil diskon

```typescript
// Dihapus
const [simSubtotal, setSimSubtotal] = useState<number>(100000);

// Dihapus
let preview = null;
if (simSubtotal && discountValue) {
  // ... kalkulasi preview
}

// Dihapus
<div className="mb-4">
  <label className="block text-sm font-medium text-primary mb-1">Subtotal Simulasi</label>
  <input type="number" value={simSubtotal} onChange={e => setSimSubtotal(Number(e.target.value))} />
  {preview}
</div>
```

### 4. Perbaikan Tampilan DiscountCard

**Perubahan**: Menampilkan rentang tanggal mulai dan berakhir.

```typescript
// Sebelum
<div className="flex items-center gap-1 text-xs text-muted-foreground">
  <Calendar className="w-3 h-3" />
  {discount.validUntil
    ? `Berakhir ${format(new Date(discount.validUntil), 'dd MMM yyyy')}`
    : 'Tanpa Batas Waktu'}
</div>

// Sesudah
<div className="flex items-center gap-1 text-xs text-muted-foreground">
  <Calendar className="w-3 h-3" />
  {discount.validFrom && discount.validUntil ? (
    <span>
      {format(new Date(discount.validFrom), 'dd MMM yyyy')} - {format(new Date(discount.validUntil), 'dd MMM yyyy')}
    </span>
  ) : (
    <span>Tanpa Batas Waktu</span>
  )}
</div>
```

## Database Schema

Schema database sudah mendukung field tanggal:

```prisma
model DiscountRule {
  id            String           @id @default(uuid())
  name          String
  isActive      Boolean          @default(true)
  discountType  DiscountType
  discountValue Float
  maxDiscountAmount Float?
  appliesTo     DiscountAudience
  minPurchase   Float?
  bundledProductIds String[]
  validFrom     DateTime?        // Tanggal mulai
  validUntil    DateTime?        // Tanggal berakhir
  scope         DiscountScope
  productId     String?
  product       Product?
  categoryId    Int?
  category      ProductCategory?
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt
}
```

## Data Service

Data service sudah mendukung field tanggal:

```typescript
export async function addDiscount(data: any, currentUser: { role: string }): Promise<any> {
  const { name, isActive, discountType, discountValue, appliesTo, minPurchase, validFrom, validUntil, scope, productId, categoryId } = data;
  
  const newDiscount = await prisma.discountRule.create({
    data: {
      name,
      isActive,
      discountType,
      discountValue,
      appliesTo,
      minPurchase,
      validFrom,        // ✅ Sudah didukung
      validUntil,       // ✅ Sudah didukung
      scope,
      productId,
      categoryId: categoryIdNum,
    }
  });

  return newDiscount;
}
```

## Fitur Baru

### 1. Validasi Tanggal
- Tanggal berakhir harus setelah tanggal mulai
- Tanggal tidak boleh di masa lalu
- Format tanggal yang user-friendly

### 2. UI/UX Improvements
- Layout responsive (grid 2 kolom di desktop, 1 kolom di mobile)
- Calendar picker yang intuitif
- Validasi real-time
- Error messages yang jelas

### 3. Accessibility
- DialogTitle yang visible untuk screen readers
- Proper ARIA labels
- Keyboard navigation support

## Testing

Untuk memverifikasi perbaikan:

1. **Buka halaman diskon** (`/discount`)
2. **Klik "Tambah Diskon Baru"**
3. **Verifikasi field tanggal**:
   - Field "Tanggal Mulai" dan "Tanggal Berakhir" muncul
   - Calendar picker berfungsi
   - Validasi tanggal berakhir > tanggal mulai
4. **Verifikasi tidak ada subtotal simulasi**
5. **Simpan diskon**
6. **Verifikasi tampilan di card**:
   - Rentang tanggal ditampilkan dengan format "dd MMM yyyy - dd MMM yyyy"
   - Tidak ada error accessibility di console

## Keuntungan

✅ **Accessibility**: Dialog sekarang accessible untuk screen readers  
✅ **User Experience**: Field tanggal yang intuitif dan user-friendly  
✅ **Data Integrity**: Validasi tanggal yang ketat  
✅ **Clean UI**: Menghapus fitur yang tidak diperlukan  
✅ **Responsive**: Layout yang responsif di semua device  
✅ **Validation**: Real-time validation dengan error messages yang jelas 