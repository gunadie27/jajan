
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, TrendingUp, TrendingDown, Wallet, Store } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { Transaction, Expense, Outlet } from '@/lib/types';
import { getTransactions, getExpenses, getOutlets } from '@/services/data-service';
import { useAuth } from "@/hooks/use-auth";

type DatePreset = 'today' | 'this_week' | 'this_month' | 'custom';

const presetLabels: Record<DatePreset, string> = {
    today: 'Hari ini',
    this_week: 'Minggu ini',
    this_month: 'Bulan ini',
    custom: 'Kustom'
};

function formatCurrency(value: number) {
    return `Rp${Math.round(value).toLocaleString('id-ID')}`;
}

export default function ProfitLossReportPage() {
  const { user } = useAuth();
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [selectedOutlet, setSelectedOutlet] = useState('all');
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>('this_month');
  const [isCustomPickerOpen, setIsCustomPickerOpen] = useState(false);
  
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [allOutlets, setAllOutlets] = useState<Outlet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // Untuk kasir, hanya ambil data dari outlet miliknya
        const outletId = user?.role === 'cashier' && user?.outletId ? user.outletId : undefined;
        
        const [transactions, expenses, outlets] = await Promise.all([
            getTransactions(outletId),
            getExpenses(outletId),
            getOutlets()
        ]);
        setAllTransactions(transactions);
        setAllExpenses(expenses);
        setAllOutlets(outlets);
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
    if (user?.role === 'cashier' && user?.outletId && allOutlets.length > 0) {
      const userOutlet = allOutlets.find(o => o.id === user.outletId);
      if (userOutlet) {
        setSelectedOutlet(userOutlet.id);
      }
    }
  }, [user, allOutlets]);

  useEffect(() => {
    const now = new Date();
    let newDate: DateRange | undefined;
    
    if (selectedPreset === 'custom') {
        setIsCustomPickerOpen(true);
        return; 
    }

    switch (selectedPreset) {
        case 'today':
            newDate = { from: startOfDay(now), to: endOfDay(now) };
            break;
        case 'this_week':
            newDate = { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
            break;
        case 'this_month':
            newDate = { from: startOfMonth(now), to: endOfMonth(now) };
            break;
    }
    setDate(newDate);
  }, [selectedPreset]);

  const handleCustomDateSelect = (newDate: DateRange | undefined) => {
    if (newDate) {
        setDate(newDate);
    }
    setIsCustomPickerOpen(false);
  }

  const {
    totalRevenue,
    totalCogs,
    grossProfit,
    totalExpenses,
    netProfit,
    expenseBreakdown
  } = useMemo(() => {
    if (isLoading) {
      return {
        totalRevenue: 0,
        totalCogs: 0,
        grossProfit: 0,
        totalExpenses: 0,
        netProfit: 0,
        expenseBreakdown: {}
      };
    }
    
    const fromDate = date?.from ? startOfDay(date.from) : null;
    const toDate = date?.to ? endOfDay(date.to) : null;

    const filteredTransactions = allTransactions.filter(t => {
        if (selectedOutlet !== 'all' && t.outlet !== allOutlets.find(o => o.id === selectedOutlet)?.name) return false;
        if (!fromDate || !toDate) return false;
        const transactionDate = new Date(t.date);
        return transactionDate >= fromDate && transactionDate <= toDate;
    });

    const filteredExpenses = allExpenses.filter(e => {
        if (selectedOutlet !== 'all' && e.outlet !== allOutlets.find(o => o.id === selectedOutlet)?.name) return false;
        if (!fromDate || !toDate) return false;
        const expenseDate = new Date(e.date);
        return expenseDate >= fromDate && expenseDate <= toDate;
    });

    const totalRevenue = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalCogs = filteredTransactions.reduce((sum, t) => 
        sum + t.items.reduce((itemSum, i) => itemSum + (i.variant.cogs * i.quantity), 0), 0);
    const grossProfit = totalRevenue - totalCogs;
    
    const expenseBreakdown = filteredExpenses.reduce((acc, e) => {
        if (!acc[e.category]) {
            acc[e.category] = 0;
        }
        acc[e.category] += e.amount;
        return acc;
    }, {} as Record<string, number>);

    const totalExpenses = Object.values(expenseBreakdown).reduce((sum, amount) => sum + amount, 0);
    const netProfit = grossProfit - totalExpenses;

    return { totalRevenue, totalCogs, grossProfit, totalExpenses, netProfit, expenseBreakdown };
  }, [date, selectedOutlet, allTransactions, allExpenses, allOutlets, isLoading]);

  const displayedDateRange = useMemo(() => {
    if (!date?.from) return "Pilih tanggal";
    if (selectedPreset !== 'custom') return presetLabels[selectedPreset];
    return `${format(date.from, "d MMM y", { locale: idLocale })} - ${format(date.to ?? date.from, "d MMM y", { locale: idLocale })}`;
  }, [date, selectedPreset]);

  // Dapatkan nama outlet untuk kasir
  const userOutletName = user?.role === 'cashier' && user?.outletId 
    ? allOutlets.find(o => o.id === user.outletId)?.name 
    : null;

  return (
    <div className="flex flex-col gap-6 pb-4">
      {/* Header */}
      <div className="flex flex-col gap-1 mt-4 mb-2 px-2 sm:px-4">
        <div className="flex items-center justify-center gap-2">
          <Wallet className="w-7 h-7 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold font-headline">Laporan Laba Rugi</h1>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground text-center">Analisis profitabilitas bisnis Anda.</p>
        
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
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-2 sm:px-4 pb-2 -mx-2 mb-2">
                <Dialog open={isCustomPickerOpen} onOpenChange={setIsCustomPickerOpen}>
                    <Select value={selectedPreset} onValueChange={(val: DatePreset) => setSelectedPreset(val)}>
            <SelectTrigger className="min-w-[120px] max-w-[180px] text-xs sm:text-sm">
                            <div className="flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                <SelectValue asChild>
                                    <span>{displayedDateRange}</span>
                                </SelectValue>
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">{presetLabels.today}</SelectItem>
                            <SelectItem value="this_week">{presetLabels.this_week}</SelectItem>
                            <SelectItem value="this_month">{presetLabels.this_month}</SelectItem>
                            <DialogTrigger asChild>
                                <SelectItem value="custom">{presetLabels.custom}</SelectItem>
                            </DialogTrigger>
                        </SelectContent>
                    </Select>
                    <DialogContent className="w-auto rounded-xl shadow-none border-0">
                         <DialogHeader>
                            <DialogTitle className="font-headline text-2xl">Pilih Rentang Tanggal</DialogTitle>
                            <DialogDescription>
                                Pilih rentang tanggal untuk laporan laba rugi.
                            </DialogDescription>
                        </DialogHeader>
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={handleCustomDateSelect}
                            numberOfMonths={2}
                        />
                    </DialogContent>
                </Dialog>
                {user?.role !== 'cashier' && (
                <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
          <SelectTrigger className="min-w-[120px] max-w-[180px] text-xs sm:text-sm">
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
            </div>
      {/* Card dan tabel lain tetap, sesuaikan style jika perlu */}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-none border-0 bg-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendapatan Kotor (Omzet)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
          </CardContent>
        </Card>
         <Card className="shadow-none border-0 bg-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Laba Kotor</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(grossProfit)}</div>
            <p className="text-xs text-muted-foreground">Setelah dikurangi HPP</p>
          </CardContent>
        </Card>
        <Card className="shadow-none border-0 bg-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Biaya Operasional</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
          </CardContent>
        </Card>
        <Card className="shadow-none border-0 bg-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Laba Bersih</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit < 0 ? 'text-destructive' : ''}`}>{formatCurrency(netProfit)}</div>
          </CardContent>
        </Card>
      </div>

       <Card className="shadow-none border-0 bg-background">
          <CardHeader>
            <CardTitle className="bg-blue-50 text-blue-700 font-semibold rounded-t-lg p-4">Rincian Laporan Laba Rugi</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <Table>
                <TableBody>
                    <TableRow className="hover:bg-blue-50/60 transition">
                        <TableCell className="font-medium">Pendapatan Penjualan</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right">{formatCurrency(totalRevenue)}</TableCell>
                    </TableRow>
                     <TableRow className="hover:bg-blue-50/60 transition">
                        <TableCell className="pl-8 text-muted-foreground">Harga Pokok Penjualan (HPP)</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right text-muted-foreground">({formatCurrency(totalCogs)})</TableCell>
                    </TableRow>
                     <TableRow className="font-bold bg-muted/50 hover:bg-blue-50/60 transition">
                        <TableCell>Laba Kotor</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right">{formatCurrency(grossProfit)}</TableCell>
                    </TableRow>
                     <TableRow className="hover:bg-blue-50/60 transition">
                        <TableCell className="font-medium pt-6">Biaya Operasional</TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                    </TableRow>
                    {Object.keys(expenseBreakdown).length > 0 ? (
                        Object.entries(expenseBreakdown).map(([category, amount]) => (
                            <TableRow key={category} className="hover:bg-blue-50/60 transition">
                                <TableCell className="pl-8 text-muted-foreground">{category}</TableCell>
                                <TableCell className="text-right text-muted-foreground">({formatCurrency(amount)})</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        ))
                     ) : (
                        <TableRow className="hover:bg-blue-50/60 transition">
                            <TableCell className="pl-8 text-muted-foreground">Tidak ada biaya operasional</TableCell>
                             <TableCell className="text-right text-muted-foreground">(Rp0)</TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                     )}
                    <TableRow className="hover:bg-blue-50/60 transition">
                        <TableCell className="pl-4 font-medium">Total Biaya Operasional</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right font-medium">({formatCurrency(totalExpenses)})</TableCell>
                    </TableRow>
                     <TableRow className="font-bold text-lg bg-muted/50 border-t-2 border-primary hover:bg-blue-50/60 transition">
                        <TableCell>Laba Bersih (Net Profit)</TableCell>
                        <TableCell></TableCell>
                        <TableCell className={`text-right ${netProfit < 0 ? 'text-destructive' : ''}`}>{formatCurrency(netProfit)}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>

    </div>
  );
}
