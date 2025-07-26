import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QrScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: any) => void;
  width?: number;
  height?: number;
}

export default function QrScanner({ onScan, onError, width = 300, height = 300 }: QrScannerProps) {
  const readerId = useRef(`qr-reader-${Math.random().toString(36).substr(2, 9)}`);
  const html5Qr = useRef<Html5Qrcode | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // Tahap 1: Set mounted setelah div benar-benar ada di DOM
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Tahap 2: Baru inisialisasi scanner setelah mounted
  useEffect(() => {
    if (!mounted) return;
    let isMounted = true;
    
    const startScanner = async () => {
      if (isStarting || !isMounted || isRunning) return;
      try {
        setIsStarting(true);
        setError(null);
        if (!html5Qr.current) {
          html5Qr.current = new Html5Qrcode(readerId.current);
        }
        const container = document.getElementById(readerId.current);
        if (!container) {
          throw new Error('QR Scanner container not found');
        }
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
            }
          }
        );
        setIsRunning(true);
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
        setIsRunning(false);
      } catch (err) {
        console.warn('Error stopping QR scanner:', err);
        setIsRunning(false);
      }
    };

    startScanner();
    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [mounted]); // Hanya bergantung pada mounted, bukan semua props

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
          onClick={() => {
            setError(null);
            setIsRunning(false);
            setIsStarting(false);
          }}
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