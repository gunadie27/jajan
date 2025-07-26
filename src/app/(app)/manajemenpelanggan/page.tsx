
"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Contact, MoreHorizontal, Edit, Trash2, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Customer, Transaction, Outlet } from "@/lib/types"
import * as dataService from "@/services/data-service"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useCustomerStore } from '@/store/customerStore';

export default function ManageCustomersPage() {
  const customers = useCustomerStore(state => state.customers);
  const fetchCustomers = useCustomerStore(state => state.fetchCustomers);
  const updateCustomer = useCustomerStore(state => state.updateCustomer);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        await fetchCustomers();
        const tx = await dataService.getTransactions();
        setAllTransactions(tx);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Gagal mengambil data pelanggan"
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [router, toast]);

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsFormOpen(true);
  };

  const handleSaveCustomer = async (customerData: Omit<Customer, 'id'>) => {
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, customerData);
        toast({
          title: "Pelanggan Diperbarui",
          description: "Data pelanggan berhasil diperbarui.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Gagal Menyimpan Pelanggan",
          description: "Operasi tidak didukung: Menambah pelanggan baru dari sini.",
        });
      }
      setIsFormOpen(false);
      setEditingCustomer(null);
      const fetchedTransactions = await dataService.getTransactions();
      setAllTransactions(fetchedTransactions);
    } catch (error) {
      console.error("Error saving customer:", error);
      toast({
        variant: "destructive",
        title: "Gagal Menyimpan Pelanggan",
        description: "Terjadi kesalahan saat menyimpan data pelanggan.",
      });
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      await dataService.deleteCustomer(customerId);
      await fetchCustomers();
      toast({
        title: "Pelanggan Dihapus",
        description: "Data pelanggan berhasil dihapus.",
      });
      const fetchedTransactions = await dataService.getTransactions();
      setAllTransactions(fetchedTransactions);
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast({
        variant: "destructive",
        title: "Gagal Menghapus Pelanggan",
        description: "Terjadi kesalahan saat menghapus pelanggan.",
      });
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers
      .filter((customer: Customer) => {
        // Search filter
        if (searchTerm) {
          const lowercasedTerm = searchTerm.toLowerCase();
          const matchesName = customer.name.toLowerCase().includes(lowercasedTerm);
          const matchesPhone = customer.phoneNumber.includes(lowercasedTerm);
          if (!matchesName && !matchesPhone) return false;
        }
        
        return true;
      })
      .sort((a: Customer, b: Customer) => new Date(b.lastTransactionDate).getTime() - new Date(a.lastTransactionDate).getTime());
  }, [customers, searchTerm]);

  const getCustomerStats = (customer: Customer) => {
    const customerTransactions = allTransactions.filter(t => t.customerId === customer.id);
    const totalSpent = customerTransactions.reduce((sum, t) => sum + t.total, 0);
    const transactionCount = customerTransactions.length;
    return { totalSpent, transactionCount };
  }

  return (
    <div className="flex flex-col gap-6 pb-4">
      {/* Header */}
      <div className="flex flex-col gap-1 mt-4 mb-2 px-2 sm:px-4">
        <div className="flex items-center justify-center gap-2">
          <Contact className="w-7 h-7 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold font-headline">Manajemen Pelanggan</h1>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground text-center">Lihat dan kelola data pelanggan Anda.</p>
      </div>
      {/* Filter/Search Section */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-2 sm:px-4 pb-2 -mx-2 mb-2">
        <Input
          placeholder="Cari nama atau nomor HP..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="rounded-lg shadow bg-white px-3 py-2 w-full md:w-auto max-w-sm text-xs sm:text-sm"
        />

      </div>
      {/* Tabel Pelanggan Section */}
      <Card className="rounded-xl !border-0 border-0 !shadow-none shadow-none p-2 sm:p-4 md:p-6 w-full">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="text-xs">
              <TableHeader className="sticky top-0 z-10 bg-[#F5F8FF]">
                <TableRow>
                  <TableHead className="py-2 px-2 font-semibold text-xs">Nama Pelanggan</TableHead>
                  <TableHead className="py-2 px-2 font-semibold text-xs">Nomor WhatsApp</TableHead>
                  <TableHead className="py-2 px-2 font-semibold text-xs">Status Member</TableHead>
                  <TableHead className="py-2 px-2 font-semibold text-xs">Kunjungan Terakhir</TableHead>
                  <TableHead className="py-2 px-2 font-semibold text-xs">Total Transaksi</TableHead>
                  <TableHead className="py-2 px-2 font-semibold text-xs text-right">Total Belanja</TableHead>
                  <TableHead className="py-2 px-2 font-semibold text-xs text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        <span className="text-sm text-muted-foreground">Memuat data pelanggan...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      Tidak ada pelanggan yang ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer: Customer, idx: number) => {
                    const stats = getCustomerStats(customer);
                    return (
                      <TableRow key={customer.id} className={((idx % 2 === 0) ? "bg-white" : "bg-[#F5F8FF]") + " hover:bg-primary/5 transition-colors"}>
                        <TableCell className="py-2 px-2 font-medium text-xs">{customer.name}</TableCell>
                        <TableCell className="py-2 px-2 text-xs">{customer.phoneNumber}</TableCell>
                        <TableCell className="py-2 px-2 text-xs">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Member
                          </span>
                        </TableCell>
                        <TableCell className="py-2 px-2 text-xs">{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(customer.lastTransactionDate))}</TableCell>
                        <TableCell className="py-2 px-2 text-xs">{stats.transactionCount} kali</TableCell>
                        <TableCell className="py-2 px-2 text-right font-medium text-xs">Rp{stats.totalSpent.toLocaleString("id-ID")}</TableCell>
                        <TableCell className="py-2 px-2 text-right text-xs">
                          <Button size="icon" variant="ghost" className="rounded-full hover:bg-primary/10 text-primary" onClick={() => handleEditCustomer(customer)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="rounded-full hover:bg-red-100 text-red-500 ml-2" onClick={() => handleDeleteCustomer(customer.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {/* Dialog/form pelanggan tetap, sesuaikan style jika perlu */}
      {isFormOpen && (
        <CustomerForm
          customer={editingCustomer}
          onSave={handleSaveCustomer}
          onCancel={() => {
            setIsFormOpen(false);
            setEditingCustomer(null);
          }}
        />
      )}
    </div>
  );
}

function CustomerForm({
  customer,
  onSave,
  onCancel,
}: {
  customer: Customer | null;
  onSave: (customer: Omit<Customer, 'id'>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<Omit<Customer, 'id'> | null>(customer);

  useEffect(() => {
    setFormData(customer);
  }, [customer]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => (prev ? { ...prev, [name]: value } : null));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      onSave(formData);
    }
  };

  if (!formData) return null; // Should not happen if customer is passed correctly

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Edit Pelanggan</DialogTitle>
          <DialogDescription>
            Edit detail pelanggan di bawah ini.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nama
            </Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phoneNumber" className="text-right">
              Nomor WA
            </Label>
            <Input
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              className="col-span-3"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onCancel}>Batal</Button>
            <Button type="submit">Simpan Perubahan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
