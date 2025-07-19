"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import type { Expense, Outlet } from "@/lib/types";
import { getOutlets, getExpenses, addExpense, updateExpense } from "@/services/data-service";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

const initialExpenseFormState: Omit<Expense, 'id'> = {
  date: new Date(),
  amount: 0,
  description: '',
  category: '',
  outlet: '',
};

export function ExpenseDialog({
  isOpen,
  onOpenChange,
  expense,
  onSaveSuccess,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  expense: Expense | null;
  onSaveSuccess?: () => void;
}) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Omit<Expense, 'id'> & { isNewCategory?: boolean }>(
    expense ? { ...expense, id: undefined } as any : initialExpenseFormState
  );
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && !expense) {
      setFormData(initialExpenseFormState);
    } 
    else if (isOpen && expense) {
      const isNew = !expenseCategories.includes(expense.category);
      setFormData({ ...expense, isNewCategory: isNew });
    }
  }, [isOpen, expense, expenseCategories]);

  useEffect(() => {
    if (isOpen) {
      async function fetchData() {
        const [fetchedOutlets, fetchedExpenses] = await Promise.all([
          getOutlets(),
          getExpenses()
        ]);
        setOutlets(fetchedOutlets);
        const uniqueCategories = Array.from(new Set(fetchedExpenses.map(e => e.category)));
        setExpenseCategories(uniqueCategories.sort());
        // Jika kasir, set outlet otomatis
        if (user?.role === 'cashier' && user.outletId) {
          const outletObj = fetchedOutlets.find(o => o.id === user.outletId);
          setFormData(prev => ({ ...prev, outlet: outletObj ? outletObj.name : '' }));
        }
      }
      fetchData();
    }
  }, [isOpen, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Tambahkan fungsi format currency
  function formatCurrency(value: number | string) {
    const num = typeof value === 'string' ? Number(value.replace(/\D/g, '')) : value;
    return num.toLocaleString('id-ID');
  }

  // Ubah handleAmountChange agar menerima input currency
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const numValue = Number(rawValue);
    setFormData(prev => ({ ...prev, amount: isNaN(numValue) ? 0 : numValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category) {
      toast({ variant: "destructive", title: "Error", description: "Kategori tidak boleh kosong." });
      return;
    }
    if (!formData.outlet) {
      toast({ variant: "destructive", title: "Error", description: "Outlet tidak boleh kosong." });
      return;
    }

    try {
      if (expense) {
        await updateExpense(expense.id, formData);
        toast({ title: "Sukses", description: "Pengeluaran berhasil diperbarui" });
      } else {
        if (!user) {
          toast({ variant: "destructive", title: "Error", description: "User tidak ditemukan. Silakan login ulang." });
          return;
        }
        await addExpense(formData, user);
        toast({ title: "Sukses", description: "Pengeluaran berhasil ditambahkan" });
      }
      onSaveSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving expense:', error);
      toast({ variant: "destructive", title: "Error", description: "Gagal menyimpan pengeluaran" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[95vw] sm:max-w-[360px] w-full p-3 sm:p-5 rounded-2xl border-0 shadow-xl bg-gradient-to-br from-blue-50 via-white to-purple-100 !overflow-visible max-h-[95vh] overflow-y-auto"
        style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)' }}
      >
        <DialogHeader>
          <DialogTitle className="font-headline text-lg sm:text-xl font-bold text-primary drop-shadow-sm">
            {expense ? 'Edit Pengeluaran' : 'Tambah Pengeluaran Baru'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            Isi detail pengeluaran di bawah ini.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 py-1 text-xs sm:text-sm">
          <div className="grid grid-cols-4 items-center gap-2 sm:gap-4">
            <Label htmlFor="date" className="text-right text-xs sm:text-sm">Tanggal</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "col-span-3 justify-start text-left font-normal rounded-lg px-3 py-1.5 text-xs sm:text-sm",
                    !formData.date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date ? format(formData.date, "PPP") : <span>Pilih tanggal</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => setFormData(prev => ({ ...prev, date: date || new Date() }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-4 items-center gap-2 sm:gap-4">
            <Label htmlFor="amount" className="text-right text-xs sm:text-sm">Jumlah</Label>
            <Input
              id="amount"
              name="amount"
              type="text"
              inputMode="numeric"
              value={formatCurrency(formData.amount)}
              onChange={handleAmountChange}
              className="col-span-3 rounded-lg px-3 py-1.5 text-xs sm:text-sm"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-2 sm:gap-4">
            <Label htmlFor="description" className="text-right text-xs sm:text-sm">Deskripsi</Label>
            <Input id="description" name="description" value={formData.description} onChange={handleInputChange} className="col-span-3 rounded-lg px-3 py-1.5 text-xs sm:text-sm" required />
          </div>
          <div className="grid grid-cols-4 items-center gap-2 sm:gap-4">
            <Label htmlFor="category" className="text-right text-xs sm:text-sm">Kategori</Label>
            <Select
              value={formData.isNewCategory ? "new-category" : (formData.category ?? '')}
              onValueChange={(value) => {
                if (value === "new-category") {
                  setFormData(prev => ({ ...prev, category: "", isNewCategory: true }));
                } else {
                  setFormData(prev => ({ ...prev, category: value, isNewCategory: false }));
                }
              }}
            >
              <SelectTrigger className="col-span-3 rounded-lg px-3 py-1.5 text-xs sm:text-sm">
                <SelectValue placeholder="Pilih Kategori" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
                {user?.role !== 'cashier' && (
                  <SelectItem value="new-category">+ Tambah Kategori Baru...</SelectItem>
                )}
              </SelectContent>
            </Select>
            {formData.isNewCategory && user?.role !== 'cashier' && (
              <Input
                id="new-category-name"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                placeholder="Masukkan nama kategori baru"
                className="col-span-4 rounded-lg px-3 py-1.5 text-xs sm:text-sm mt-2"
                required
              />
            )}
          </div>
          {/* Outlet field: hanya tampil untuk owner */}
          {user?.role === 'owner' && (
          <div className="grid grid-cols-4 items-center gap-2 sm:gap-4">
            <Label htmlFor="outlet" className="text-right text-xs sm:text-sm">Outlet</Label>
            <Select
              value={formData.outlet ?? ''}
              onValueChange={(value) => setFormData(prev => ({ ...prev, outlet: value }))}
            >
              <SelectTrigger className="col-span-3 rounded-lg px-3 py-1.5 text-xs sm:text-sm">
                <SelectValue placeholder="Pilih Outlet" />
              </SelectTrigger>
              <SelectContent>
                {outlets.map(outlet => (
                  <SelectItem key={outlet.id} value={outlet.name}>{outlet.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          )}
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} className="rounded-lg px-4 text-xs sm:text-sm">Batal</Button>
            <Button type="submit" variant="popup">Simpan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}