'use client';

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();
  
  return (
    <div className="flex flex-1 items-center justify-center p-4 bg-background">
      <div className="text-center max-w-xs mx-auto">
        <h1 className="text-5xl sm:text-6xl font-extrabold mb-2 text-primary">404</h1>
        <h2 className="text-xl sm:text-2xl font-semibold mb-4">Halaman Tidak Ditemukan</h2>
        <p className="text-muted-foreground mb-6 text-sm sm:text-base">
          Maaf, halaman yang Anda cari tidak tersedia atau sudah dipindahkan.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => router.back()}
          >
            Kembali
          </Button>
          <Button
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => router.push('/dashboard')}
          >
            Ke Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
