'use client';

import React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, CartesianGrid, Bar, AreaChart, Area, PieChart, Pie, Cell, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { CalendarIcon, TrendingUp, ShoppingCart, DollarSign, ArrowDown, ArrowUp, Filter as FilterIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format, differenceInDays, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfDay, endOfDay, endOfWeek, endOfMonth, startOfWeek, startOfMonth, getDay, getHours } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { OrderChannel, PaymentMethod, Transaction, Outlet, Product, OrderChannelFilter } from '@/lib/types';
import { getTransactions, getOutlets, getProducts, getOrderChannels } from '@/services/data-service';
import { useMediaQuery } from "@/hooks/use-mobile";
import { cn } from '@/lib/utils';


type GroupingOption = 'day' | 'week' | 'month';
type DatePreset = 'today' | 'this_week' | 'this_month' | 'custom';
type ProductPerformanceData = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
};
type SortConfig = {
  key: keyof ProductPerformanceData;
  direction: 'ascending' | 'descending';
};

const presetLabels: Record<DatePreset, string> = {
    today: 'Hari ini',
    this_week: 'Minggu ini',
    this_month: 'Bulan ini',
    custom: 'Kustom'
};

const paymentMethods: (PaymentMethod | 'all')[] = ['all', 'cash', 'qris', 'platform_balance'];

function formatCurrency(value: number) {
    return `Rp${Math.round(value).toLocaleString('id-ID')}`;
}

const dayLabels = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// Pie chart colors
const channelColors = ['#3F51B5', '#00B8D9', '#FFB300', '#FF7043', '#43A047', '#AB47BC'];

export default function SalesReportPage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [selectedOutlet, setSelectedOutlet] = useState('all');
  const [selectedChannel, setSelectedChannel] = useState<OrderChannel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | 'all'>('all');
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>('this_month');
  const [isCustomPickerOpen, setIsCustomPickerOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'grossProfit', direction: 'descending' });
  
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allOutlets, setAllOutlets] = useState<Outlet[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [orderChannels, setOrderChannelsState] = useState<OrderChannel[]>([]);
  const [productCategories, setProductCategories] = useState<string[]>(['all']);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [tempSelectedOutlet, setTempSelectedOutlet] = useState(selectedOutlet);
  const [tempSelectedCategory, setTempSelectedCategory] = useState(selectedCategory);
  const [tempSelectedPaymentMethod, setTempSelectedPaymentMethod] = useState(selectedPaymentMethod);

  // Terapkan filter dari popover
  const applyPopoverFilter = () => {
    setSelectedOutlet(tempSelectedOutlet);
    setSelectedCategory(tempSelectedCategory);
    setSelectedPaymentMethod(tempSelectedPaymentMethod);
    setFilterPopoverOpen(false);
  };
  const resetPopoverFilter = () => {
    setTempSelectedOutlet('all');
    setTempSelectedCategory('all');
    setTempSelectedPaymentMethod('all');
  };

  useEffect(() => {
    async function fetchData() {
        const [transactions, outlets, products, channels] = await Promise.all([
            getTransactions(),
            getOutlets(),
            getProducts(),
            getOrderChannels(),
        ]);
        setAllTransactions(transactions);
        setAllOutlets(outlets);
        setAllProducts(products);
        setOrderChannelsState(channels);
        setProductCategories(['all', ...new Set(products.map(p => p.category))]);
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedPreset === 'custom') {
      setIsCustomPickerOpen(true);
      return;
    }

    const now = new Date();
    let newDate: DateRange | undefined;

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

  // == Start of Memoized Calculations ==
  const filteredTransactionsForSales = useMemo(() => {
    return allTransactions.filter((transaction) => {
      // Outlet Filter
      if (selectedOutlet !== 'all' && transaction.outlet !== allOutlets.find(o => o.id === selectedOutlet)?.name) {
        return false;
      }
       // Date Filter
      if (!date?.from) return false;
      const transactionDate = new Date(transaction.date);
      const fromDate = startOfDay(date.from);
      const toDate = date.to ? endOfDay(date.to) : endOfDay(date.from);
      if (transactionDate < fromDate || transactionDate > toDate) {
          return false;
      }
      // Channel Filter
      if (selectedChannel.length > 0) {
        if (!selectedChannel.includes(transaction.orderChannel)) {
          return false;
        }
      }
      // Payment Method Filter
      if (selectedPaymentMethod !== 'all' && transaction.paymentMethod !== selectedPaymentMethod) {
          return false;
      }
      // Category Filter
      if (selectedCategory !== 'all' && !transaction.items.some(item => item.product.category === selectedCategory)) {
          return false;
      }

      return true;
    });
  }, [date, selectedOutlet, selectedCategory, selectedPaymentMethod, selectedChannel, allTransactions, allOutlets]);

  const salesSummaryData = useMemo(() => {
    if (!date?.from || !date.to) return [];
    
    const fromDate = startOfDay(date.from);
    const toDate = endOfDay(date.to);
    const daysDifference = differenceInDays(toDate, fromDate);

    let grouping: GroupingOption;
    if (daysDifference <= 7) grouping = 'day';
    else if (daysDifference <= 90) grouping = 'week';
    else grouping = 'month';
    
    let intervalGenerator;
    let formatLabel: (d: Date) => string;

    switch (grouping) {
      case 'week':
        intervalGenerator = (interval: {start: Date, end: Date}) => eachWeekOfInterval(interval, { weekStartsOn: 1 });
        formatLabel = (d) => `W${format(d, 'w', { locale: idLocale })}`;
        break;
      case 'month':
        intervalGenerator = eachMonthOfInterval;
        formatLabel = (d) => format(d, 'MMM yyyy', { locale: idLocale });
        break;
      case 'day':
      default:
        intervalGenerator = eachDayOfInterval;
        formatLabel = (d) => format(d, 'd MMM', { locale: idLocale });
        break;
    }
    
    const intervals = intervalGenerator({ start: fromDate, end: toDate });

    return intervals.map(intervalStart => {
        let intervalEnd: Date;
        if(grouping === 'week') intervalEnd = endOfWeek(intervalStart, { weekStartsOn: 1 });
        else if (grouping === 'month') intervalEnd = endOfMonth(intervalStart);
        else intervalEnd = endOfDay(intervalStart);
        
        const salesInInterval = filteredTransactionsForSales.filter(t => new Date(t.date) >= intervalStart && new Date(t.date) <= intervalEnd);
        const totalSales = salesInInterval.reduce((sum, t) => sum + t.total, 0);

        return {
            name: formatLabel(intervalStart),
            totalSales: totalSales,
        };
    });
  }, [filteredTransactionsForSales, date]);
  
  const summaryStats = useMemo(() => {
    const totalSales = filteredTransactionsForSales.reduce((sum, t) => sum + t.total, 0);
    const totalTransactions = filteredTransactionsForSales.length;
    const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;
    return { totalSales, totalTransactions, averageTransaction };
  }, [filteredTransactionsForSales]);

  // Data produk terlaris (top 5)
  const topProducts = useMemo(() => {
    const productSales = new Map<string, { name: string; quantity: number; total: number }>();
    filteredTransactionsForSales.forEach(transaction => {
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
  }, [filteredTransactionsForSales]);

  // Data pie chart channel
  const channelPieData = useMemo(() => {
    const channelMap: Record<string, { name: string; value: number }> = {};
    filteredTransactionsForSales.forEach(t => {
      const ch = t.orderChannel || 'Lainnya';
      if (!channelMap[ch]) channelMap[ch] = { name: ch, value: 0 };
      channelMap[ch].value += t.total;
    });
    return Object.values(channelMap);
  }, [filteredTransactionsForSales]);

  const productPerformanceData = useMemo(() => {
    const fromDate = date?.from ? startOfDay(date.from) : null;
    const toDate = date?.to ? endOfDay(date.to) : null;

    const filteredTransactions = allTransactions.filter(t => {
        if (selectedOutlet !== 'all' && t.outlet !== allOutlets.find(o => o.id === selectedOutlet)?.name) return false;
        if (!fromDate || !toDate) return false;
        const transactionDate = new Date(t.date);
        return transactionDate >= fromDate && transactionDate <= toDate;
    });

    const productPerformance = new Map<string, ProductPerformanceData>();

    filteredTransactions.forEach(transaction => {
      transaction.items.forEach(item => {
        if (selectedCategory !== 'all' && item.product.category !== selectedCategory) return;
        
        const key = item.variant.id;
        const existing = productPerformance.get(key);
        
        const revenue = item.variant.price * item.quantity;
        const cogs = item.variant.cogs * item.quantity;

        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += revenue;
          existing.cogs += cogs;
          existing.grossProfit += (revenue - cogs);
        } else {
          productPerformance.set(key, {
            id: key,
            name: `${item.product.name} (${item.variant.name})`,
            category: item.product.category,
            quantity: item.quantity,
            revenue: revenue,
            cogs: cogs,
            grossProfit: revenue - cogs,
          });
        }
      });
    });
    return Array.from(productPerformance.values());
  }, [date, selectedOutlet, selectedCategory, allTransactions, allOutlets]);

  const sortedPerformanceData = useMemo(() => {
    let sortableItems = [...productPerformanceData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [productPerformanceData, sortConfig]);

  const timeAnalysisTransactions = useMemo(() => {
    return allTransactions.filter((transaction) => {
      if (selectedOutlet !== 'all' && transaction.outlet !== allOutlets.find(o => o.id === selectedOutlet)?.name) return false;
      if (!date?.from) return false;
      const transactionDate = new Date(transaction.date);
      const fromDate = startOfDay(date.from);
      const toDate = date.to ? endOfDay(date.to) : endOfDay(date.from);
      return transactionDate >= fromDate && transactionDate <= toDate;
    });
  }, [date, selectedOutlet, allTransactions, allOutlets]);
  
  const salesByHour = useMemo(() => {
    const data = Array.from({ length: 24 }, (_, i) => ({ hour: `${i.toString().padStart(2, '0')}:00`, totalSales: 0, transactions: 0 }));
    timeAnalysisTransactions.forEach(t => {
        const hour = getHours(new Date(t.date));
        data[hour].totalSales += t.total;
        data[hour].transactions += 1;
    });
    return data;
  }, [timeAnalysisTransactions]);

  const salesByDay = useMemo(() => {
    const data = dayLabels.map(day => ({ day, totalSales: 0, transactions: 0 }));
    timeAnalysisTransactions.forEach(t => {
        const dayIndex = getDay(new Date(t.date));
        data[dayIndex].totalSales += t.total;
        data[dayIndex].transactions += 1;
    });
    return data;
  }, [timeAnalysisTransactions]);
  // == End of Memoized Calculations ==

  const requestSort = (key: keyof ProductPerformanceData) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const displayedDateRange = useMemo(() => {
    if (!date?.from) return "Pilih tanggal";
    if (selectedPreset !== 'custom' || !date.to) return presetLabels[selectedPreset];
    return `${format(date.from, "d MMM y", { locale: idLocale })} - ${format(date.to, "d MMM y", { locale: idLocale })}`;
  }, [date, selectedPreset]);
  
  const SortableHeader = ({ columnKey, label }: { columnKey: keyof ProductPerformanceData, label: string }) => {
    const isSorted = sortConfig.key === columnKey;
    const Icon = sortConfig.direction === 'ascending' ? ArrowUp : ArrowDown;
    return (
        <TableHead>
            <Button variant="ghost" onClick={() => requestSort(columnKey)} className="px-0">
                {label}
                {isSorted && <Icon className="ml-2 h-4 w-4" />}
            </Button>
        </TableHead>
    );
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const datePresets = [
    { key: 'today', label: 'Hari Ini', range: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
    { key: 'yesterday', label: 'Kemarin', range: () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return { from: startOfDay(d), to: endOfDay(d) };
    } },
    { key: '7days', label: '7 Hari Terakhir', range: () => {
      const d = new Date();
      const from = new Date();
      from.setDate(d.getDate() - 6);
      return { from: startOfDay(from), to: endOfDay(d) };
    } },
    { key: '30days', label: '30 Hari Terakhir', range: () => {
      const d = new Date();
      const from = new Date();
      from.setDate(d.getDate() - 29);
      return { from: startOfDay(from), to: endOfDay(d) };
    } },
    { key: 'custom', label: 'Custom', range: null },
  ];
  const [datePreset, setDatePreset] = useState('30days');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [tempCustomDate, setTempCustomDate] = useState<DateRange | undefined>(date);
  const [customPopoverOpen, setCustomPopoverOpen] = useState(false);

  // Handler untuk preset
  const handleDatePreset = (key: string) => {
    setDatePreset(key);
    setShowCustomDate(key === 'custom');
    if (key !== 'custom') {
      const preset = datePresets.find(p => p.key === key);
      if (preset && preset.range) setDate(preset.range());
      setCustomPopoverOpen(false);
    } else {
      setTempCustomDate(date);
      setCustomPopoverOpen(true);
    }
  };
  const handleApplyCustomDate = () => {
    setDate(tempCustomDate);
    setCustomPopoverOpen(false);
  };
  const handleCancelCustomDate = () => {
    setCustomPopoverOpen(false);
  };

  return (
    <div className="flex flex-col gap-6 pb-4">
      {/* Header */}
      <div className="flex flex-col gap-1 mt-4 mb-2 px-2 sm:px-4">
        <div className="flex items-center justify-center gap-2">
          <TrendingUp className="w-7 h-7 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold font-headline">Laporan Penjualan</h1>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground text-center">Analisis performa penjualan bisnis Anda secara komprehensif.</p>
      </div>
      {/* Filter Section */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-2 sm:px-4 pb-2 -mx-2 items-center">
        {/* Tombol Filter Popover */}
        <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2 min-w-[140px] h-10 px-4 text-xs sm:text-sm">
              <FilterIcon className="h-4 w-4" />
              Filter
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4" align="start">
            <div className="flex flex-col gap-3">
              <div>
                <Label className="text-xs mb-1">Merchant/Outlet</Label>
                <Select value={tempSelectedOutlet} onValueChange={setTempSelectedOutlet}>
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Pilih Outlet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Outlet</SelectItem>
                    {allOutlets.map(outlet => (
                      <SelectItem key={outlet.id} value={outlet.id}>{outlet.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1">Kategori</Label>
                <Select value={tempSelectedCategory} onValueChange={setTempSelectedCategory}>
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {productCategories.map(category => (
                      <SelectItem key={category} value={category}>{category === 'all' ? 'Semua Kategori' : category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1">Metode Bayar</Label>
                <Select value={tempSelectedPaymentMethod} onValueChange={setTempSelectedPaymentMethod}>
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Metode Bayar" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(method => (
                      <SelectItem key={method} value={method}>{method === 'all' ? 'Semua Metode' : method}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 mt-2">
                <Button size="sm" className="flex-1" onClick={applyPopoverFilter}>Terapkan</Button>
                <Button size="sm" variant="secondary" className="flex-1" onClick={resetPopoverFilter}>Reset</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        {/* Filter tanggal tetap di luar */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className="rounded-lg shadow bg-white flex items-center gap-2 min-w-[140px] h-10 px-4 text-xs sm:text-sm"
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
          <PopoverContent className="w-72 p-3" align="end">
            <div className="flex flex-col gap-2">
              {datePresets.map(preset => (
                <Button
                  key={preset.key}
                  variant={datePreset === preset.key ? 'default' : 'ghost'}
                  size="sm"
                  className="justify-start w-full text-left"
                  onClick={() => handleDatePreset(preset.key)}
                >
                  {preset.label}
                </Button>
              ))}
              {showCustomDate && customPopoverOpen && (
                <div className="mt-2 flex flex-col gap-2 items-center">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={tempCustomDate?.from}
                    selected={tempCustomDate}
                    onSelect={setTempCustomDate}
                    numberOfMonths={1}
                  />
                  <div className="flex gap-2 w-full mt-2">
                    <Button size="sm" className="flex-1" onClick={handleApplyCustomDate} disabled={!tempCustomDate?.from || !tempCustomDate?.to}>Terapkan</Button>
                    <Button size="sm" variant="secondary" className="flex-1" onClick={handleCancelCustomDate}>Batal</Button>
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {/* Card Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-2 sm:px-0">
        {/* Total Penjualan */}
        <Card className="flex flex-col items-center justify-center gap-2 p-4 bg-gradient-to-br from-primary/10 via-white to-accent/10 shadow-lg border-0 rounded-xl">
          <TrendingUp className="w-7 h-7 text-primary" />
          <div className="text-base sm:text-lg font-bold">Total Penjualan</div>
          <div className="text-2xl font-extrabold text-primary">{formatCurrency(summaryStats.totalSales)}</div>
        </Card>
        {/* Tambahkan card summary lain sesuai kebutuhan */}
      </div>
      {/* Pie Chart Penjualan per Channel */}
      <Card className="bg-white rounded-xl shadow-lg border-0 p-4 sm:p-6 flex flex-col gap-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg font-bold">Distribusi Penjualan per Channel</CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex flex-col items-center justify-center">
          {channelPieData.length === 0 ? (
            <div className="text-muted-foreground text-center py-8">Tidak ada data penjualan.</div>
          ) : (
            <PieChart width={320} height={220}>
              <Pie
                data={channelPieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {channelPieData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={channelColors[idx % channelColors.length]} />
                ))}
              </Pie>
              <Legend />
              <RechartsTooltip formatter={v => `Rp${Number(v).toLocaleString('id-ID')}`} />
            </PieChart>
          )}
        </CardContent>
      </Card>
      {/* Produk Terlaris */}
      <Card className="bg-white rounded-xl shadow-lg border-0 p-4 sm:p-6 flex flex-col gap-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg font-bold">Produk Terlaris</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {topProducts.length === 0 ? (
            <div className="text-muted-foreground text-center py-8">Tidak ada data produk terlaris.</div>
          ) : (
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr>
                  <th className="text-left font-semibold pb-2">Produk</th>
                  <th className="text-right font-semibold pb-2">Qty</th>
                  <th className="text-right font-semibold pb-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-2 pr-2">{p.name}</td>
                    <td className="py-2 text-right">{p.quantity}</td>
                    <td className="py-2 text-right font-semibold">Rp{p.total.toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      {/* Grafik Penjualan */}
      <Card className="bg-white rounded-xl shadow-lg border-0 p-4 sm:p-6 flex flex-col gap-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg font-bold">Grafik Penjualan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full h-48 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesSummaryData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `Rp${v / 1000}k`} />
                <Tooltip formatter={(value: number) => `Rp${value.toLocaleString('id-ID')}`} />
                <Bar dataKey="totalSales" fill="#3F51B5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      {/* Tabel/List Performa Produk */}
      {isMobile ? (
        <div className="flex flex-col gap-3 px-2 sm:px-0">
          {/* Contoh list card produk, sesuaikan dengan data performa produk */}
          {/* topProducts.map(product => ( ... )) */}
        </div>
      ) : (
        <Card className="rounded-xl !border-0 border-0 !shadow-none shadow-none p-6">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow className="bg-[#F5F8FF]">
                  <TableHead className="py-3 px-4 font-semibold">Produk</TableHead>
                  <TableHead className="py-3 px-4 font-semibold">Kategori</TableHead>
                    <TableHead className="py-3 px-4 font-semibold">Qty</TableHead>
                  <TableHead className="py-3 px-4 font-semibold">Pendapatan</TableHead>
                  <TableHead className="py-3 px-4 font-semibold">Laba Kotor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {/* topProducts.map(product => ( ... )) */}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
}
