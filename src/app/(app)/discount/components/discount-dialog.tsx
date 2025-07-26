'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { DiscountForm } from './discount-form';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

type Discount = any;

interface DiscountDialogProps {
  initialData?: Discount | null;
  onSave: (data: any) => void;
  isLoading: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DiscountDialog({ initialData, onSave, isLoading, isOpen, onOpenChange }: DiscountDialogProps) {
  const isMobile = useIsMobile();
  const title = initialData ? 'Edit Diskon' : 'Tambah Diskon Baru';
  const description = initialData
    ? 'Ubah detail aturan diskon di bawah ini.'
    : 'Buat aturan diskon baru untuk toko Anda.';
  const buttonText = initialData ? 'Update' : 'Simpan';
  const loadingText = initialData ? 'Memperbarui...' : 'Menyimpan...';

  const handleSubmit = (data: any) => {
    onSave(data);
  };

  // Konten modern, clean, mobile-first
  const content = (
    <div className="bg-white dark:bg-background p-6 sm:p-8 max-h-[80vh] overflow-y-auto rounded-2xl">
      <h2 className="text-2xl font-bold text-primary mb-2 font-headline">{title}</h2>
      <p className="text-base text-muted-foreground mb-6 font-sans">{description}</p>
      <DiscountForm initialData={initialData} onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="inset-x-4 bottom-8 max-w-md mx-auto rounded-2xl shadow-2xl border-0 p-0 bg-white dark:bg-background"
          style={{ maxHeight: '80vh' }}
        >
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full p-0 overflow-hidden rounded-2xl shadow-2xl border-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-2xl font-bold text-primary font-headline">{title}</DialogTitle>
          <DialogDescription className="text-base text-muted-foreground font-sans">{description}</DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6">
          <DiscountForm initialData={initialData} onSubmit={handleSubmit} isLoading={isLoading} />
        </div>
      </DialogContent>
    </Dialog>
  );
}