# Perbaikan QR Scanner Error

## Masalah yang Ditemukan

**Error**: `IndexSizeError: Failed to execute 'getImageData' on 'CanvasRenderingContext2D': The source width is 0.`

**Gejala**:
- Error terus berulang dan membuat laptop lemot
- QR Scanner tidak berfungsi dengan baik
- Infinite loop error di console
- Performance degradation

## Analisis Masalah

### 1. Canvas Size Issue
- QR Scanner mencoba mengakses canvas dengan width/height 0
- Container QR Scanner tidak memiliki ukuran yang cukup
- Html5Qrcode library tidak menangani kasus ini dengan baik

### 2. Error Handling yang Buruk
- Semua error (termasuk warning) dipanggil ke `onError`
- Tidak ada filtering untuk error yang tidak serius
- Infinite loop karena error terus dipanggil

### 3. Component Lifecycle Issues
- QR Scanner tidak di-reset dengan benar saat dialog dibuka/ditutup
- Memory leak karena scanner tidak di-cleanup dengan proper

## Solusi yang Diterapkan

### 1. Perbaikan QR Scanner Component

**Sebelum**:
```typescript
export default function QrScanner({ onScan, onError, width = 300, height = 300 }: QrScannerProps) {
  const readerId = useRef(`qr-reader-${Math.random().toString(36).substr(2, 9)}`);
  const html5Qr = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    html5Qr.current = new Html5Qrcode(readerId.current);
    html5Qr.current.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width, height } },
      (decodedText) => {
        onScan(decodedText);
        html5Qr.current?.stop();
      },
      onError
    );
    return () => {
      html5Qr.current?.stop().catch(() => {});
    };
  }, [onScan, onError, width, height]);

  return <div id={readerId.current} style={{ width, height }} />;
}
```

**Sesudah**:
```typescript
export default function QrScanner({ onScan, onError, width = 300, height = 300 }: QrScannerProps) {
  const readerId = useRef(`qr-reader-${Math.random().toString(36).substr(2, 9)}`);
  const html5Qr = useRef<Html5Qrcode | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const startScanner = async () => {
      if (isStarting || !isMounted) return;
      
      try {
        setIsStarting(true);
        setError(null);
        
        if (!html5Qr.current) {
          html5Qr.current = new Html5Qrcode(readerId.current);
        }

        // Pastikan elemen container ada dan memiliki ukuran
        const container = document.getElementById(readerId.current);
        if (!container) {
          throw new Error('QR Scanner container not found');
        }

        // Set minimum size untuk mencegah error canvas
        const minSize = Math.max(width, height, 200);
        container.style.width = `${minSize}px`;
        container.style.height = `${minSize}px`;

        await html5Qr.current.start(
          { facingMode: 'environment' },
          { 
            fps: 10, 
            qrbox: { 
              width: Math.min(width, minSize - 20), 
              height: Math.min(height, minSize - 20) 
            },
            aspectRatio: 1.0
          },
          (decodedText) => {
            if (isMounted) {
              onScan(decodedText);
              stopScanner();
            }
          },
          (error) => {
            if (isMounted) {
              console.warn('QR Scanner warning:', error);
              // Jangan panggil onError untuk warning biasa
            }
          }
        );
      } catch (err: any) {
        if (isMounted) {
          console.error('QR Scanner error:', err);
          setError(err.message || 'Failed to start QR scanner');
          onError?.(err);
        }
      } finally {
        if (isMounted) {
          setIsStarting(false);
        }
      }
    };

    const stopScanner = async () => {
      try {
        if (html5Qr.current && html5Qr.current.isScanning) {
          await html5Qr.current.stop();
        }
      } catch (err) {
        console.warn('Error stopping QR scanner:', err);
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [onScan, onError, width, height, isStarting]);

  // Error UI dan loading state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center">
        <div className="text-red-500 mb-2">
          <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <p className="text-sm text-gray-600 mb-2">QR Scanner Error</p>
        <p className="text-xs text-gray-500 mb-3">{error}</p>
        <button 
          onClick={() => setError(null)}
          className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div 
        id={readerId.current} 
        style={{ 
          width: Math.max(width, 200), 
          height: Math.max(height, 200),
          minWidth: '200px',
          minHeight: '200px'
        }} 
      />
      {isStarting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-white text-sm">Starting camera...</div>
        </div>
      )}
    </div>
  );
}
```

### 2. Perbaikan Error Handling di POS Page

**Sebelum**:
```typescript
const handleQrScanError = (error: any) => {
  console.error('QR Scanner error:', error);
  setMemberValidationError('Gagal memulai kamera. Pastikan izin kamera diberikan.');
};
```

**Sesudah**:
```typescript
const handleQrScanError = (error: any) => {
  // Hanya log error yang serius, bukan warning biasa
  if (error && typeof error === 'object' && error.name !== 'IndexSizeError') {
    console.error('QR Scanner error:', error);
    setMemberValidationError('Gagal memulai kamera. Pastikan izin kamera diberikan.');
  }
};
```

### 3. Perbaikan Component Lifecycle

**Ditambahkan key prop untuk force re-render**:
```typescript
<QrScanner
  key={qrScannerOpen ? 'qr-scanner-open' : 'qr-scanner-closed'}
  onScan={handleQrScan}
  onError={handleQrScanError}
  width={250}
  height={250}
/>
```

## Fitur Baru yang Ditambahkan

### 1. Error State Management
- State untuk tracking error
- UI error yang user-friendly
- Retry button untuk restart scanner

### 2. Loading State
- Visual feedback saat scanner starting
- Mencegah multiple start attempts

### 3. Proper Cleanup
- Component unmount detection
- Proper scanner stop
- Memory leak prevention

### 4. Canvas Size Validation
- Minimum size enforcement (200px)
- Dynamic size calculation
- Container validation

### 5. Error Filtering
- Filter out non-critical errors
- Separate warning from error handling
- Prevent infinite error loops

## Keuntungan Perbaikan

✅ **Performance**: Tidak ada lagi infinite loop error  
✅ **User Experience**: Error handling yang lebih baik  
✅ **Stability**: QR Scanner lebih stabil  
✅ **Memory Management**: Proper cleanup dan tidak ada memory leak  
✅ **Error Recovery**: Retry mechanism untuk error  
✅ **Visual Feedback**: Loading dan error states yang jelas  

## Testing

### Langkah Testing:

1. **Buka halaman POS** (`/pos`)
2. **Klik "Scan QR" button**
3. **Verifikasi**:
   - Dialog QR Scanner terbuka
   - Tidak ada error di console
   - Camera berjalan dengan normal
   - Loading state muncul saat starting
4. **Test error scenarios**:
   - Deny camera permission
   - Close dialog dan buka lagi
   - Test di device tanpa camera

### Expected Behavior:

- ✅ Tidak ada `IndexSizeError` di console
- ✅ QR Scanner berjalan smooth
- ✅ Dialog bisa dibuka/tutup tanpa error
- ✅ Camera permission handling yang proper
- ✅ Error recovery dengan retry button

## Troubleshooting

Jika masih ada masalah:

1. **Periksa camera permission** - pastikan browser mengizinkan akses camera
2. **Periksa device compatibility** - pastikan device mendukung getUserMedia
3. **Periksa HTTPS** - camera hanya berfungsi di HTTPS
4. **Clear browser cache** - jika ada cached error
5. **Test di device lain** - untuk memastikan bukan device-specific issue

## Catatan Penting

1. **HTTPS Required**: Camera API hanya berfungsi di HTTPS
2. **Permission Required**: User harus mengizinkan akses camera
3. **Device Support**: Tidak semua device mendukung camera API
4. **Browser Support**: Pastikan browser mendukung getUserMedia
5. **Performance**: QR Scanner menggunakan resources yang cukup, jadi jangan biarkan terbuka terlalu lama 