
"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import type { Transaction, OrderChannel, Outlet } from "@/lib/types"
import { CalendarIcon, History } from "lucide-react"
import { DateRange } from "react-day-picker"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns"
import { getTransactions, getOutlets, getOrderChannels } from "@/services/data-service"
import { useMediaQuery } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";

export default function TransactionHistoryPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [orderChannels, setOrderChannels] = useState<OrderChannel[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOutlet, setSelectedOutlet] = useState("all");
  const [selectedChannel, setSelectedChannel] = useState<"all" | OrderChannel>("all");
  const [date, setDate] = useState<DateRange | undefined>();

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  useEffect(() => {
    async function fetchData() {
        const [fetchedTransactions, fetchedOutlets, fetchedChannels] = await Promise.all([
            getTransactions(),
            getOutlets(),
            getOrderChannels()
        ]);
        setTransactions(fetchedTransactions);
        setOutlets(fetchedOutlets);
        setOrderChannels(fetchedChannels);
    }
    fetchData();
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((transaction) => {
        // Filter by outlet
        const outletName = outlets.find(o => o.id === selectedOutlet)?.name;
        if (selectedOutlet !== "all" && transaction.outlet !== outletName) {
          return false;
        }
         // Filter by channel
        if (selectedChannel !== "all" && transaction.orderChannel !== selectedChannel) {
          return false;
        }
        return true;
      })
      .filter((transaction) => {
        // Filter by date
        if (!date?.from) return true;
        const transactionDate = new Date(transaction.date);
        const fromDate = startOfDay(date.from);
        const toDate = date.to ? endOfDay(date.to) : endOfDay(date.from);
        return transactionDate >= fromDate && transactionDate <= toDate;
      })
      .filter((transaction) => {
        // Filter by search term (ID or product name)
        if (!searchTerm) return true;
        const lowercasedTerm = searchTerm.toLowerCase();
        const matchesId = transaction.id.toLowerCase().includes(lowercasedTerm);
        const matchesProduct = transaction.items.some(item => 
          item.product.name.toLowerCase().includes(lowercasedTerm)
        );
        return matchesId || matchesProduct;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, selectedOutlet, selectedChannel, date, outlets]);
  
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

  const getBadgeVariant = (channel: string) => {
    if (channel === 'store') return "secondary";
    return "default";
  }

  const formatPaymentMethod = (method: string) => {
      if (method === 'platform_balance') return 'Saldo Platform';
      return method;
  }

  return (
    <div className="flex flex-col gap-6 pb-4">
      {/* Header */}
      <div className="flex flex-col gap-1 mt-4 mb-2 px-2 sm:px-4">
        <div className="flex items-center justify-center gap-2">
          <History className="w-7 h-7 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold font-headline">Riwayat Transaksi</h1>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground text-center">Lihat dan filter semua transaksi yang telah tercatat.</p>
      </div>
      {/* Filter Section */}
      <div className="flex flex-wrap gap-2 items-center bg-[#F5F8FF] border border-border rounded-lg px-2 sm:px-4 py-2 mb-2">
        <Input
          placeholder="Cari ID transaksi atau nama produk..."
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
        <Select value={selectedChannel} onValueChange={(val) => setSelectedChannel(val as any)}>
          <SelectTrigger className="min-w-[120px] max-w-[160px] text-xs sm:text-sm">
            <SelectValue placeholder="Pilih Saluran" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Saluran</SelectItem>
            {orderChannels.map(channel => (
              <SelectItem key={channel} value={channel} className="capitalize">{channel}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                <TableHead className="py-2 px-2 font-semibold text-xs">ID</TableHead>
                <TableHead className="py-2 px-2 font-semibold text-xs">Tanggal</TableHead>
                <TableHead className="py-2 px-2 font-semibold text-xs">Outlet</TableHead>
                <TableHead className="py-2 px-2 font-semibold text-xs">Saluran</TableHead>
                <TableHead className="py-2 px-2 font-semibold text-xs">Metode</TableHead>
                <TableHead className="py-2 px-2 font-semibold text-xs text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Tidak ada transaksi ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((transaction, idx) => (
                  <TableRow key={transaction.id} className={((idx % 2 === 0) ? "bg-white" : "bg-[#F5F8FF]") + " hover:bg-primary/5 transition-colors"}>
                    <TableCell className="py-2 px-2 font-mono text-[11px]">{transaction.transactionNumber || transaction.id}</TableCell>
                    <TableCell className="py-2 px-2">{format(new Date(transaction.date), "dd/MM/yyyy HH:mm")}</TableCell>
                    <TableCell className="py-2 px-2">{transaction.outlet}</TableCell>
                    <TableCell className="py-2 px-2 capitalize">{transaction.orderChannel}</TableCell>
                    <TableCell className="py-2 px-2">{formatPaymentMethod(transaction.paymentMethod)}</TableCell>
                    <TableCell className="py-2 px-2 text-right font-semibold text-primary">Rp{transaction.total.toLocaleString('id-ID')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
    </div>
  );
}
