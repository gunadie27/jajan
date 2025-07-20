
"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Expense, Outlet } from "@/lib/types"
import { CalendarIcon, List, Pencil, Trash2, X, Store } from "lucide-react"
import { DateRange } from "react-day-picker"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns"
import { getExpenses, getOutlets, updateExpense, deleteExpense } from "@/services/data-service"
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

import { ExpenseDialog } from "@/components/expense-dialog";

export default function ExpenseHistoryPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOutlet, setSelectedOutlet] = useState("all");
  const [date, setDate] = useState<DateRange | undefined>();
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // Untuk kasir, hanya ambil data dari outlet miliknya
        const outletId = user?.role === 'cashier' && user?.outletId ? user.outletId : undefined;
        
        const [fetchedExpenses, fetchedOutlets] = await Promise.all([
            getExpenses(outletId),
            getOutlets()
        ]);
        setExpenses(fetchedExpenses);
        setOutlets(fetchedOutlets);

        // Extract unique categories from fetched expenses
        const uniqueCategories = Array.from(new Set(fetchedExpenses.map(e => e.category)));
        setExpenseCategories(uniqueCategories.sort());
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [user]);

  // Set selectedOutlet untuk kasir setelah outlets loaded
  useEffect(() => {
    if (user?.role === 'cashier' && user?.outletId && outlets.length > 0) {
      const userOutlet = outlets.find(o => o.id === user.outletId);
      if (userOutlet) {
        setSelectedOutlet(userOutlet.id);
      }
    }
  }, [user, outlets]);

  const filteredExpenses = useMemo(() => {
    if (isLoading) return [];
    
    return expenses
      .filter((expense) => {
        // Filter by outlet
        const outletName = outlets.find(o => o.id === selectedOutlet)?.name;
        if (selectedOutlet !== "all" && expense.outlet !== outletName) {
          return false;
        }
        return true;
      })
      .filter((expense) => {
        // Filter by date
        if (!date?.from) return true;
        const expenseDate = new Date(expense.date);
        const fromDate = startOfDay(date.from);
        const toDate = date.to ? endOfDay(date.to) : endOfDay(date.from);
        return expenseDate >= fromDate && expenseDate <= toDate;
      })
      .filter((expense) => {
        // Filter by search term (description)
        if (!searchTerm) return true;
        const lowercasedTerm = searchTerm.toLowerCase();
        return expense.description.toLowerCase().includes(lowercasedTerm);
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, searchTerm, selectedOutlet, date, outlets, isLoading]);

  const setDatePreset = (preset: 'today' | 'this_week' | 'this_month') => {
      const now = new Date();
      if (preset === 'today') {
          setDate({ from: now, to: now });
      } else if (preset === 'this_week') {
          setDate({ from: startOfWeek(now), to: endOfWeek(now) });
      } else if (preset === 'this_month') {
          setDate({ from: startOfMonth(now), to: endOfMonth(now) });
      }
  }

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setIsExpenseFormOpen(true);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      await deleteExpense(expenseId);
      
      // Refresh data setelah delete
      const outletId = user?.role === 'cashier' && user?.outletId ? user.outletId : undefined;
      const [fetchedExpenses] = await Promise.all([
          getExpenses(outletId)
      ]);
      setExpenses(fetchedExpenses);
      
      toast({
        title: "Sukses",
        description: "Pengeluaran berhasil dihapus"
      });
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Gagal menghapus pengeluaran"
      });
    }
  };

  const handleSaveExpense = async () => {
    try {
      // Refresh data setelah edit
      const outletId = user?.role === 'cashier' && user?.outletId ? user.outletId : undefined;
      const [fetchedExpenses] = await Promise.all([
          getExpenses(outletId)
      ]);
      setExpenses(fetchedExpenses);
      
      toast({
        title: "Sukses",
        description: "Pengeluaran berhasil diperbarui"
      });
      setIsExpenseFormOpen(false);
      setEditingExpense(null);
    } catch (error) {
      console.error('Error saving expense:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Gagal menyimpan pengeluaran"
      });
    }
  };

  // Dapatkan nama outlet untuk kasir
  const userOutletName = user?.role === 'cashier' && user?.outletId 
    ? outlets.find(o => o.id === user.outletId)?.name 
    : null;

  return (
    <div className="flex flex-col gap-6 pb-4">
      {/* Header */}
      <div className="flex flex-col gap-1 mt-4 mb-2 px-2 sm:px-4">
        <div className="flex items-center justify-center gap-2">
          <List className="w-7 h-7 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold font-headline">Riwayat Pengeluaran</h1>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground text-center">Lihat dan filter semua pengeluaran yang telah tercatat.</p>
        
        {/* Informasi outlet untuk kasir */}
        {user?.role === 'cashier' && userOutletName && (
          <div className="flex items-center justify-center gap-2 mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <Store className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              Outlet: {userOutletName}
            </span>
          </div>
        )}
      </div>
      {/* Filter Section */}
      <div className="flex flex-wrap gap-2 items-center bg-[#F5F8FF] border border-border rounded-lg px-2 sm:px-4 py-2 mb-2">
        <Input
          placeholder="Cari deskripsi pengeluaran..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="rounded-lg shadow bg-white px-3 py-2 w-full sm:w-auto max-w-xs text-xs sm:text-sm"
        />
        {user?.role !== 'cashier' && (
        <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
          <SelectTrigger className="min-w-[120px] max-w-[160px] text-xs sm:text-sm">
            <SelectValue placeholder="Pilih Outlet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Outlet</SelectItem>
            {outlets.map(outlet => (
              <SelectItem key={outlet.id} value={outlet.id}>{outlet.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        )}
        <Button variant="outline" className="rounded-lg bg-white px-3 py-2 text-xs sm:text-sm whitespace-nowrap" onClick={() => setDatePreset('today')}>Hari ini</Button>
        <Button variant="outline" className="rounded-lg bg-white px-3 py-2 text-xs sm:text-sm whitespace-nowrap" onClick={() => setDatePreset('this_week')}>Minggu ini</Button>
        <Button variant="outline" className="rounded-lg bg-white px-3 py-2 text-xs sm:text-sm whitespace-nowrap" onClick={() => setDatePreset('this_month')}>Bulan ini</Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className="rounded-lg shadow bg-white flex items-center gap-2 px-3 py-2 text-xs sm:text-sm"
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
              {date?.from ? (
                date.to ? (
                  <>{format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}</>
                ) : (
                  format(date.from, "LLL dd, y")
                )
              ) : (
                <span>Pilih tanggal</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={setDate}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>
      {/* List Card di Mobile, Tabel di Desktop */}
      <div className="overflow-x-auto px-2 sm:px-4">
        <Table className="text-xs min-w-[700px]">
          <TableHeader className="sticky top-0 z-10 bg-[#F5F8FF]">
            <TableRow>
              <TableHead className="py-2 px-2 font-semibold text-xs">Tanggal</TableHead>
              <TableHead className="py-2 px-2 font-semibold text-xs">Outlet</TableHead>
              <TableHead className="py-2 px-2 font-semibold text-xs">Kategori</TableHead>
              <TableHead className="py-2 px-2 font-semibold text-xs">Deskripsi</TableHead>
              <TableHead className="py-2 px-2 font-semibold text-xs text-right">Nominal</TableHead>
              <TableHead className="py-2 px-2 font-semibold text-xs text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="ml-2">Memuat data...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Tidak ada pengeluaran ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              filteredExpenses.map((expense, idx) => (
                <TableRow key={expense.id} className={((idx % 2 === 0) ? "bg-white" : "bg-[#F5F8FF]") + " hover:bg-primary/5 transition-colors"}>
                  <TableCell className="py-2 px-2">{format(new Date(expense.date), "dd/MM/yyyy")}</TableCell>
                  <TableCell className="py-2 px-2">{expense.outlet}</TableCell>
                  <TableCell className="py-2 px-2">{expense.category}</TableCell>
                  <TableCell className="py-2 px-2">{expense.description}</TableCell>
                  <TableCell className="py-2 px-2 text-right font-bold text-primary">Rp{expense.amount.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="py-2 px-2 text-right">
                    <Button size="icon" variant="ghost" className="text-accent" onClick={() => handleEditExpense(expense)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDeleteExpense(expense.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {/* Dialog Edit Expense tetap ada */}
      <ExpenseDialog
        isOpen={isExpenseFormOpen}
        onOpenChange={setIsExpenseFormOpen}
        expense={editingExpense}
        onSaveSuccess={handleSaveExpense}
      />
    </div>
  );
}
