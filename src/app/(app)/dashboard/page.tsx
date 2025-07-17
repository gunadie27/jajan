
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, CartesianGrid, Bar } from 'recharts';
import { TrendingUp, ShoppingCart, DollarSign, Users, LayoutGrid, Calendar as CalendarIcon, TrendingDown, History, List } from 'lucide-react';
import { format, eachDayOfInterval, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { Transaction, User, Expense, Outlet } from '@/lib/types';
import { getTransactions, getUsers, getExpenses, getOutlets } from '@/services/data-service';
import { useAuth } from "@/hooks/use-auth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ExpenseDialog } from '@/components/expense-dialog';

export default function DashboardPage() {

  const { user, isLoading } = useAuth();
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [allOutlets, setAllOutlets] = useState<Outlet[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<string | undefined>(undefined);
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);

  useEffect(() => {
    if (isLoading || !user) return;

    const fetchData = async () => {
      const fetchedOutlets = await getOutlets();
      setAllOutlets(fetchedOutlets);

      // Set initial selectedOutlet if not already set
      if (!selectedOutlet && fetchedOutlets.length > 0 && user) {
        setSelectedOutlet(user.role === 'cashier' && user.outletId ? user.outletId : fetchedOutlets[0].id);
      }

      let transactions: Transaction[] = [];
      let expenses: Expense[] = [];

      let currentOutletId: string | undefined = undefined;
      if (user) {
        currentOutletId = user.role === 'cashier' && user.outletId ? user.outletId : selectedOutlet;
      }

      if (currentOutletId) {
        transactions = await getTransactions(currentOutletId);
        expenses = await getExpenses(currentOutletId);
      } else {
        transactions = await getTransactions();
        expenses = await getExpenses();
      }
      setAllTransactions(transactions);
      setAllExpenses(expenses);
    };
    fetchData();
  }, [user, selectedOutlet, isLoading]);

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((transaction) => {
      if (!date?.from) return false;
      const transactionDate = new Date(transaction.date);
      const fromDate = startOfDay(date.from);
      const toDate = date.to ? endOfDay(date.to) : endOfDay(date.from);
      return transactionDate >= fromDate && transactionDate <= toDate;
    });
  }, [date, allTransactions]);

  const salesData = useMemo(() => {
    if (!date?.from || !date.to) return [];
    
    const fromDate = startOfDay(date.from);
    const toDate = endOfDay(date.to);
    
    const intervals = eachDayOfInterval({ start: fromDate, end: toDate });

    return intervals.map(intervalStart => {
        const intervalEnd = endOfDay(intervalStart);
        
        const salesInInterval = filteredTransactions.filter(t => new Date(t.date) >= intervalStart && new Date(t.date) <= intervalEnd);
        const totalSales = salesInInterval.reduce((sum, t) => sum + t.total, 0);

        return {
            name: format(intervalStart, 'd MMM', { locale: idLocale }),
            totalSales: totalSales,
        };
    });
  }, [filteredTransactions, date]);
  
  const summaryStats = useMemo(() => {
    const totalSales = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalTransactions = filteredTransactions.length;
    const totalExpenses = allExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalSales - totalExpenses;
    const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;
    return { totalSales, totalTransactions, totalExpenses, netProfit, averageTransaction };
  }, [filteredTransactions, allExpenses]);

  const topProducts = useMemo(() => {
    const productSales = new Map<string, { name: string, quantity: number, total: number }>();
    filteredTransactions.forEach(transaction => {
      transaction.items.forEach(item => {
        const existing = productSales.get(item.product.id);
        if (existing) {
          existing.quantity += item.quantity;
          existing.total += item.variant.price * item.quantity;
        } else {
          productSales.set(item.product.id, {
            name: item.product.name,
            quantity: item.quantity,
            total: item.variant.price * item.quantity,
          });
        }
      });
    });
    return Array.from(productSales.values()).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [filteredTransactions]);

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 sm:mt-4 px-2 sm:px-0">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-7 h-7 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold font-headline">Dasbor</h1>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground sm:ml-4">
          {user?.role === 'cashier' ? 
            `Ringkasan aktivitas Anda di ${allOutlets.find(o => o.id === selectedOutlet)?.name || 'Outlet Tidak Ditemukan'} hari ini.` : 
            `Ringkasan bisnis Anda di ${allOutlets.find(o => o.id === selectedOutlet)?.name || 'Semua Outlet'} dari ${format(date?.from || new Date(), 'd MMM yyyy', { locale: idLocale })} sampai ${format(date?.to || new Date(), 'd MMM yyyy', { locale: idLocale })}.`
          }
        </p>
      </div>
      {/* Filter Section */}
      {user?.role !== 'cashier' && (
        <div className="flex flex-col gap-2 px-2 sm:px-0">
          <div className="flex gap-2 overflow-x-auto flex-nowrap hide-scrollbar pb-1">
            {user?.role === 'owner' && (
              <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                <SelectTrigger className="min-w-[120px] h-9 text-xs flex-shrink-0">
                  <SelectValue placeholder="Pilih Outlet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Outlet</SelectItem>
                  {allOutlets.map(outlet => (
                    <SelectItem key={outlet.id} value={outlet.id}>{outlet.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button className="rounded-full px-4 py-1.5 text-xs bg-primary text-white hover:bg-primary/90 min-w-[90px] flex-shrink-0" onClick={() => setDate({ from: startOfDay(new Date()), to: endOfDay(new Date()) })}>Hari Ini</Button>
            <Button className="rounded-full px-4 py-1.5 text-xs bg-primary text-white hover:bg-primary/90 min-w-[90px] flex-shrink-0" onClick={() => setDate({ from: startOfWeek(new Date()), to: endOfWeek(new Date()) })}>Minggu Ini</Button>
            <Button className="rounded-full px-4 py-1.5 text-xs bg-primary text-white hover:bg-primary/90 min-w-[90px] flex-shrink-0" onClick={() => setDate({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })}>Bulan Ini</Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-xs bg-background text-foreground hover:bg-primary/10 border border-primary/20 min-w-[120px] flex-shrink-0",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      <>{format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}</>
                    ) : (
                      format(date.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pilih Tanggal</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  // @ts-ignore
                  onSelect={(range: any) => {
                    if (range && range.from) {
                      setDate({ from: range.from, to: range.to });
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}
      {/* Kartu tombol menu utama kasir */}
      {user?.role === 'cashier' && (
        <>
          <div className="grid grid-cols-2 gap-3 px-2 sm:px-0 mt-2 mb-4">
            {/* Catat Pengeluaran */}
            <button
              onClick={() => setIsExpenseDialogOpen(true)}
              className="flex flex-col items-center justify-center rounded-xl bg-gradient-to-br from-red-200 via-white to-white dark:from-red-700/40 dark:via-background dark:to-background shadow-md p-3 hover:scale-105 active:scale-95 transition-all border-0"
            >
              <TrendingDown className="h-8 w-8 text-red-500 mb-1" />
              <span className="text-xs font-semibold text-red-700 dark:text-red-200">Catat Pengeluaran</span>
            </button>
            {/* Riwayat Transaksi */}
            <a
              href="/riwayattransaksi"
              className="flex flex-col items-center justify-center rounded-xl bg-gradient-to-br from-blue-200 via-white to-white dark:from-blue-700/40 dark:via-background dark:to-background shadow-md p-3 hover:scale-105 active:scale-95 transition-all border-0"
            >
              <History className="h-8 w-8 text-blue-500 mb-1" />
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-200">Riwayat Transaksi</span>
            </a>
          </div>
          <ExpenseDialog isOpen={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen} expense={null} onSaveSuccess={() => setIsExpenseDialogOpen(false)} />
        </>
      )}
      {/* Statistik Card */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 px-2 sm:px-0">
        {/* Total Penjualan */}
        <Card className="shadow-lg rounded-xl border-0 p-3 sm:p-4 flex flex-col justify-between bg-gradient-to-br from-blue-400/30 via-white to-white dark:from-blue-700/40 dark:via-background dark:to-background">
          <CardHeader className="flex flex-col items-center justify-center gap-2 pb-1">
            <div className="bg-blue-500/20 rounded-full p-2 mb-1"><TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-300" /></div>
            <CardTitle className="text-xs font-medium text-blue-900 dark:text-blue-200 text-center">Total Penjualan</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex flex-col items-center justify-center text-center">
            <div className="text-lg sm:text-2xl font-bold text-blue-900 dark:text-blue-200">Rp{summaryStats.totalSales.toLocaleString('id-ID')}</div>
          </CardContent>
        </Card>
        {/* Total Transaksi */}
        <Card className="shadow-lg rounded-xl border-0 p-3 sm:p-4 flex flex-col justify-between bg-gradient-to-br from-orange-300/40 via-white to-white dark:from-orange-600/40 dark:via-background dark:to-background">
          <CardHeader className="flex flex-col items-center justify-center gap-2 pb-1">
            <div className="bg-orange-400/20 rounded-full p-2 mb-1"><ShoppingCart className="h-5 w-5 text-orange-600 dark:text-orange-300" /></div>
            <CardTitle className="text-xs font-medium text-orange-900 dark:text-orange-200 text-center">Transaksi</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex flex-col items-center justify-center text-center">
            <div className="text-lg sm:text-2xl font-bold text-orange-900 dark:text-orange-200">{summaryStats.totalTransactions.toLocaleString('id-ID')}</div>
          </CardContent>
        </Card>
        {/* Laba Bersih */}
        <Card className="shadow-lg rounded-xl border-0 p-3 sm:p-4 flex flex-col justify-between bg-gradient-to-br from-green-300/40 via-white to-white dark:from-green-600/40 dark:via-background dark:to-background">
          <CardHeader className="flex flex-col items-center justify-center gap-2 pb-1">
            <div className="bg-green-400/20 rounded-full p-2 mb-1"><DollarSign className="h-5 w-5 text-green-600 dark:text-green-300" /></div>
            <CardTitle className="text-xs font-medium text-green-900 dark:text-green-200 text-center">Laba Bersih</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex flex-col items-center justify-center text-center">
            <div className="text-lg sm:text-2xl font-bold text-green-900 dark:text-green-200">Rp{summaryStats.netProfit.toLocaleString('id-ID')}</div>
          </CardContent>
        </Card>
        {/* Rata-rata Transaksi */}
        <Card className="shadow-lg rounded-xl border-0 p-3 sm:p-4 flex flex-col justify-between bg-gradient-to-br from-purple-300/40 via-white to-white dark:from-purple-600/40 dark:via-background dark:to-background">
          <CardHeader className="flex flex-col items-center justify-center gap-2 pb-1">
            <div className="bg-purple-400/20 rounded-full p-2 mb-1"><Users className="h-5 w-5 text-purple-600 dark:text-purple-300" /></div>
            <CardTitle className="text-xs font-medium text-purple-900 dark:text-purple-200 text-center">Rata-rata Transaksi</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex flex-col items-center justify-center text-center">
            <div className="text-lg sm:text-2xl font-bold text-purple-900 dark:text-purple-200">Rp{summaryStats.averageTransaction.toLocaleString('id-ID')}</div>
          </CardContent>
        </Card>
      </div>
      {/* Untuk kasir: tampilkan tabel pengeluaran hari ini */}
      {user?.role === 'cashier' && (
        <div className="mt-4 px-2 sm:px-0">
          <h2 className="font-semibold text-base mb-2 text-primary">Pengeluaran Hari Ini</h2>
          <div className="overflow-x-auto rounded-lg shadow border border-border bg-white dark:bg-background">
            <table className="min-w-full text-xs sm:text-sm">
              <thead className="bg-primary/10">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Waktu</th>
                  <th className="px-3 py-2 text-left font-semibold">Kategori</th>
                  <th className="px-3 py-2 text-left font-semibold">Deskripsi</th>
                  <th className="px-3 py-2 text-right font-semibold">Nominal</th>
                </tr>
              </thead>
              <tbody>
                {allExpenses.filter(e => {
                  const now = new Date();
                  const d = new Date(e.date);
                  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
                }).length === 0 ? (
                  <tr><td colSpan={4} className="text-center text-muted-foreground py-6">Tidak ada pengeluaran hari ini.</td></tr>
                ) : (
                  allExpenses.filter(e => {
                    const now = new Date();
                    const d = new Date(e.date);
                    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
                  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((e, i) => (
                    <tr key={e.id || i} className="border-t border-border">
                      <td className="px-3 py-2 whitespace-nowrap">{new Date(e.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{e.category}</td>
                      <td className="px-3 py-2">{e.description}</td>
                      <td className="px-3 py-2 text-right font-semibold text-red-600 dark:text-red-400">Rp{e.amount.toLocaleString('id-ID')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Chart & Top Products hanya untuk owner */}
      {user?.role === 'owner' && (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-7 px-2 sm:px-0">
          <Card className="lg:col-span-4 bg-background rounded-lg p-2 sm:p-6 shadow-sm border-0">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base sm:text-lg font-semibold text-primary">Tren Penjualan</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `Rp${Number(value) / 1000}k`} />
                      <Tooltip 
                          cursor={{fill: 'hsl(var(--muted))'}}
                          contentStyle={{backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)'}}
                          formatter={(value: number) => [`Rp${value.toLocaleString('id-ID')}`, 'Total Penjualan']}
                      />
                      <Bar dataKey="totalSales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="lg:col-span-3 bg-background rounded-lg p-2 sm:p-6 shadow-sm border-0">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base sm:text-lg font-semibold text-primary">Produk Terlaris</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {topProducts.map((product) => (
                  <li key={product.name} className="flex items-center py-3 gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.quantity} terjual</p>
                    </div>
                    <div className="font-semibold text-sm">Rp{product.total.toLocaleString('id-ID')}</div>
                  </li>
                ))}
                 {topProducts.length === 0 && (
                  <li className="text-center text-muted-foreground py-10">
                      Tidak ada data penjualan.
                  </li>
                 )}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Minimal DateRange type needed for this component
type DateRange = {
    from: Date;
    to?: Date;
}
