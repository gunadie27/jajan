import { useEffect, useRef } from 'react';
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