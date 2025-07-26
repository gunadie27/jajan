'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { getDiscounts, addDiscount, updateDiscount, deleteDiscount } from '@/services/data-service';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { DiscountDialog } from './components/discount-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DiscountCard } from './components/discount-card';

export default function ManageDiscountsPage() {
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [discountToDelete, setDiscountToDelete] = useState<string | null>(null);
  const [editingDiscount, setEditingDiscount] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (user && user.role !== 'owner') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const loadDiscounts = async () => {
    try {
      setIsLoading(true);
      const data = await getDiscounts();
      setDiscounts(data);
    } catch (error) {
      console.error('Failed to fetch discounts:', error);
      toast({ title: 'Error', description: 'Gagal memuat data diskon.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'owner') {
      loadDiscounts();
    }
  }, [user]);

  const handleSave = async (data: any) => {
    setIsSubmitting(true);
    try {
      if (data.id) {
        await updateDiscount(data.id, data, user);
        toast({ title: 'Sukses', description: 'Data diskon berhasil diperbarui.' });
      } else {
        await addDiscount(data, user);
        toast({ title: 'Sukses', description: 'Diskon baru berhasil ditambahkan.' });
      }
      await loadDiscounts();
    } catch (error) {
      console.error('Failed to save discount:', error);
      toast({ title: 'Error', description: 'Gagal menyimpan data diskon.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNew = () => {
    setEditingDiscount(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (discount: any) => {
    setEditingDiscount(discount);
    setIsDialogOpen(true);
  };

  const handleDelete = (discountId: string) => {
    setDiscountToDelete(discountId);
  };

  const confirmDelete = async () => {
    if (!discountToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDiscount(discountToDelete, user);
      toast({ title: 'Sukses', description: 'Diskon berhasil dihapus.' });
      await loadDiscounts();
      setDiscountToDelete(null);
    } catch (error) {
      console.error('Failed to delete discount:', error);
      toast({ title: 'Error', description: 'Gagal menghapus diskon.', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user || user.role !== 'owner') {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Anda tidak memiliki akses ke halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      <PageHeader
        title="Manajemen Diskon"
        description="Kelola semua aturan diskon dan promosi untuk toko Anda."
      />

      <div className="flex justify-end">
        <Button
          onClick={handleAddNew}
          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:brightness-110 shadow-md"
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Tambah Diskon
        </Button>
      </div>

      <DiscountDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        initialData={editingDiscount}
        onSave={handleSave}
        isLoading={isSubmitting}
      />

      <AlertDialog open={!!discountToDelete} onOpenChange={() => setDiscountToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin ingin menghapus?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus diskon secara permanen dari server.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isLoading ? (
        <p className="text-center py-10 text-muted-foreground">Memuat data diskon...</p>
      ) : discounts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {discounts.map((discount) => (
            <DiscountCard
              key={discount.id}
              discount={discount}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 text-muted-foreground">
          <p className="font-semibold">Belum ada diskon</p>
          <p className="text-sm">Klik "Tambah Diskon" untuk membuat promo pertama Anda.</p>
        </div>
      )}
    </div>
  );
}