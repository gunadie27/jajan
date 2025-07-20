
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type { CashierSession, Transaction, Expense, Outlet } from '@/lib/types';
import { Box, CheckCircle, AlertTriangle } from 'lucide-react';
import { getTransactions, getExpenses, getOutlets, addCashierSession, updateCashierSession, getCashierSessions } from '@/services/data-service';

function formatCurrency(value: number | undefined) {
    if (value === undefined) return 'Rp -';
    return `Rp${value.toLocaleString('id-ID')}`;
}

export default function CashDrawerPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [sessions, setSessions] = useState<CashierSession[]>([]);
    const [openSessionDialog, setOpenSessionDialog] = useState(false);
    const [closeSessionDialog, setCloseSessionDialog] = useState(false);
    const [initialCash, setInitialCash] = useState(0);
    const [finalCash, setFinalCash] = useState(0);
    const [formattedFinalCash, setFormattedFinalCash] = useState('');
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
    const [allOutlets, setAllOutlets] = useState<Outlet[]>([]);

    const fetchData = async () => {
        if (user) {
            // Untuk kasir, hanya ambil data dari outlet miliknya
            const outletId = user.role === 'cashier' && user.outletId ? user.outletId : undefined;
            
            const [transactions, expenses, outlets, cashierSessions] = await Promise.all([
                getTransactions(outletId),
                getExpenses(outletId),
                getOutlets(),
                getCashierSessions(outletId)
            ]);
            
            setAllTransactions(transactions);
            setAllExpenses(expenses);
            setAllOutlets(outlets);
            setSessions(cashierSessions);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    // Refresh data setiap 10 detik untuk real-time updates
    useEffect(() => {
        if (!user) return;
        
        const interval = setInterval(() => {
            fetchData();
        }, 10000);

        return () => clearInterval(interval);
    }, [user]);


    const activeSession = useMemo(() => sessions.find(s => s.userId === user?.id && s.status === 'active'), [sessions, user]);

    const sessionData = useMemo(() => {
        if (!activeSession) return null;

        // Filter transaksi dan pengeluaran berdasarkan outlet kasir
        const sessionTransactions = allTransactions.filter(t => {
            const isInSession = new Date(t.date) >= new Date(activeSession.startTime);
            const isCorrectOutlet = user?.role === 'cashier' ? t.outlet === activeSession.outletName : true;
            return isInSession && isCorrectOutlet;
        });
        
        const sessionExpenses = allExpenses.filter(e => {
            const isInSession = new Date(e.date) >= new Date(activeSession.startTime);
            const isCorrectOutlet = user?.role === 'cashier' ? e.outlet === activeSession.outletName : true;
            return isInSession && isCorrectOutlet;
        });

        // Breakdown berdasarkan metode pembayaran
        const cashSales = sessionTransactions.reduce((sum, t) => {
            return t.paymentMethod === 'cash' ? sum + t.total : sum;
        }, 0);
        
        const qrisSales = sessionTransactions.reduce((sum, t) => {
            return t.paymentMethod === 'qris' ? sum + t.total : sum;
        }, 0);
        
        const platformSales = sessionTransactions.reduce((sum, t) => {
            return t.paymentMethod === 'platform_balance' ? sum + t.total : sum;
        }, 0);
        
        const totalSales = sessionTransactions.reduce((sum, t) => sum + t.total, 0);
        const totalExpenses = sessionExpenses.reduce((sum, e) => sum + e.amount, 0);

        // Uang tunai seharusnya = modal awal + penjualan tunai - pengeluaran
        const calculatedCash = activeSession.initialCash + cashSales - totalExpenses;
        const difference = finalCash - calculatedCash;

        return {
            cashSales,
            qrisSales,
            platformSales,
            totalSales,
            totalExpenses,
            calculatedCash,
            difference,
            transactionCount: sessionTransactions.length,
            expenseCount: sessionExpenses.length
        };
    }, [activeSession, finalCash, allTransactions, allExpenses, user]);


    const handleOpenSession = async () => {
        if (!user) return;

        const outlet = allOutlets.find(o => o.id === user.outletId);
        
        const newSessionData: Omit<CashierSession, 'id' | 'transactions' | 'expenses'> = {
            userId: user.id,
            userName: user.name,
            outletId: user.outletId || 'unknown',
            outletName: outlet?.name || 'Outlet Tidak Dikenal',
            startTime: new Date(),
            initialCash: initialCash,
            status: 'active',
        };
        const newSession = await addCashierSession(newSessionData);
        
        // Refresh data setelah buka sesi
        await fetchData();
        
        setOpenSessionDialog(false);
        setInitialCash(0);
        toast({
            title: "Sesi Kasir Dibuka",
            description: `Modal awal ${formatCurrency(newSession.initialCash)} telah dicatat.`
        });
    };

    const handleCloseSession = async () => {
        if (!activeSession || !sessionData) return;

        const updatedSessionData: Partial<CashierSession> = {
            endTime: new Date(),
            status: 'closed',
            finalCash: finalCash,
            calculatedCash: sessionData.calculatedCash,
            difference: sessionData.difference,
        };

        const updatedSession = await updateCashierSession(activeSession.id, updatedSessionData);

        // Refresh data setelah tutup sesi
        await fetchData();

        setCloseSessionDialog(false);
        setFinalCash(0);
        setFormattedFinalCash('');
        toast({
            title: "Sesi Kasir Ditutup",
            description: "Ringkasan sesi telah disimpan."
        });
    };
    
    const pageTitle = activeSession ? `Sesi Aktif - ${activeSession.outletName}` : "Tidak Ada Sesi Aktif";
    const pageDescription = activeSession ? `Dimulai pada ${new Date(activeSession.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} oleh ${activeSession.userName}` : "Buka sesi kasir untuk mulai mencatat transaksi.";

    return (
        <div className="flex flex-col gap-6 pb-4">
            {/* Header */}
            <div className="flex flex-col gap-1 mt-4 mb-2 px-2 sm:px-4">
                <div className="flex items-center justify-center gap-2">
                    <Box className="w-7 h-7 text-primary" />
                    <h1 className="text-xl sm:text-2xl font-bold font-headline">{pageTitle}</h1>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground text-center">{pageDescription}</p>
            </div>
            {/* Tombol Buka/Tutup Sesi */}
            <div className="flex justify-end px-2 sm:px-4 mb-2">
                {!activeSession ? (
                     <Dialog open={openSessionDialog} onOpenChange={setOpenSessionDialog}>
                        <DialogTrigger asChild>
                            <Button className="bg-primary text-white hover:bg-primary/90 rounded-lg px-4 py-2 text-xs sm:text-sm">Buka Sesi Kasir</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Buka Sesi Kasir</DialogTitle>
                                <DialogDescription>Masukkan jumlah uang tunai awal (modal) di laci kasir.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-2 py-4">
                                <Label htmlFor="initial-cash">Modal Awal (Rp)</Label>
                                <Input
                                    id="initial-cash"
                                    type="text"
                                    inputMode="numeric"
                                    value={initialCash ? initialCash.toLocaleString('id-ID') : ''}
                                    onChange={(e) => {
                                      const raw = e.target.value.replace(/[^\d]/g, '');
                                      setInitialCash(Number(raw));
                                    }}
                                    placeholder="e.g. 500.000"
                                />
                            </div>
                            <DialogFooter>
                                <DialogClose asChild><Button variant="secondary">Batal</Button></DialogClose>
                                <Button onClick={handleOpenSession}>Mulai Sesi</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                ) : (
                    <Dialog open={closeSessionDialog} onOpenChange={setCloseSessionDialog}>
                        <DialogTrigger asChild>
                            <Button variant="destructive" className="rounded-lg px-4 py-2 text-xs sm:text-sm">Tutup Sesi Kasir</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Tutup Sesi Kasir</DialogTitle>
                                <DialogDescription>Hitung uang tunai aktual di laci untuk rekonsiliasi.</DialogDescription>
                            </DialogHeader>
                             {sessionData && (
                                <div className="space-y-4 py-4">
                                    <Card className="bg-muted/50">
                                        <CardContent className="p-4 space-y-3">
                                            <div className="text-sm font-semibold text-primary mb-2">Ringkasan Sesi ({sessionData.transactionCount} transaksi)</div>
                                            
                                            {/* Total Transaksi */}
                                            <div className="flex justify-between"><span className="text-muted-foreground">Total Transaksi</span> <span className="font-medium">{formatCurrency(sessionData.totalSales)}</span></div>
                                            
                                            {/* Breakdown Detail */}
                                            <div className="pl-4 space-y-1">
                                                <div className="flex justify-between text-sm"><span className="text-muted-foreground">• Tunai</span> <span>{formatCurrency(sessionData.cashSales)}</span></div>
                                                <div className="flex justify-between text-sm"><span className="text-muted-foreground">• QRIS</span> <span>{formatCurrency(sessionData.qrisSales)}</span></div>
                                                <div className="flex justify-between text-sm"><span className="text-muted-foreground">• Platform</span> <span>{formatCurrency(sessionData.platformSales)}</span></div>
                                            </div>
                                            
                                            {/* Pengeluaran */}
                                            <div className="border-t pt-2">
                                                <div className="flex justify-between"><span className="text-muted-foreground">Total Pengeluaran</span> <span className="text-red-600">-{formatCurrency(sessionData.totalExpenses)}</span></div>
                                            </div>
                                            
                                            {/* Uang Tunai Seharusnya */}
                                            <div className="border-t pt-2">
                                                <div className="flex justify-between"><span className="text-muted-foreground">Modal Awal</span> <span>{formatCurrency(activeSession.initialCash)}</span></div>
                                                <div className="flex justify-between"><span className="text-muted-foreground">(+) Penjualan Tunai</span> <span className="text-green-600">+{formatCurrency(sessionData.cashSales)}</span></div>
                                                <div className="flex justify-between"><span className="text-muted-foreground">(-) Pengeluaran</span> <span className="text-red-600">-{formatCurrency(sessionData.totalExpenses)}</span></div>
                                                <div className="flex justify-between font-bold pt-1 border-t"><span>Uang Tunai Seharusnya</span> <span className="text-blue-700">{formatCurrency(sessionData.calculatedCash)}</span></div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    
                                    <div className="space-y-2">
                                        <Label htmlFor="final-cash">Uang Tunai Aktual di Laci (Rp)</Label>
                                        <Input
                                            id="final-cash"
                                            type="text"
                                            inputMode="numeric"
                                            value={formattedFinalCash}
                                            onChange={(e) => {
                                                const rawValue = e.target.value.replace(/[^\d]/g, '');
                                                const numValue = Number(rawValue);
                                                setFinalCash(numValue);
                                                setFormattedFinalCash(numValue.toLocaleString('id-ID'));
                                            }}
                                            placeholder="Masukkan jumlah hitungan manual"
                                        />
                                    </div>
                                    
                                    {finalCash > 0 && (
                                        <Card className={sessionData.difference === 0 ? 'border-green-500' : 'border-destructive'}>
                                            <CardContent className="p-3">
                                                <div className="flex items-center gap-2">
                                                    {sessionData.difference === 0 ? (
                                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                                    ) : (
                                                        <AlertTriangle className="h-5 w-5 text-destructive" />
                                                    )}
                                                    <div className="flex-1 flex justify-between font-bold">
                                                        <span>Selisih</span>
                                                        <span className={sessionData.difference === 0 ? 'text-green-500' : 'text-destructive'}>
                                                          {formatCurrency(sessionData.difference)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            )}
                            <DialogFooter>
                                <DialogClose asChild><Button variant="secondary">Batal</Button></DialogClose>
                                <Button onClick={handleCloseSession} variant="destructive" disabled={finalCash === 0}>Konfirmasi & Tutup Sesi</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
            {/* Card/CardContent dan tabel lain tetap, sesuaikan style jika perlu */}
             <Card>
                <CardHeader>
                    <CardTitle>Riwayat Sesi Kasir</CardTitle>
                    <CardDescription>Daftar sesi yang telah selesai hari ini.</CardDescription>
                </CardHeader>
                <CardContent>
                    {sessions.filter(s => s.status === 'closed').length > 0 ? (
                        <div className="space-y-4">
                        {sessions.filter(s => s.status === 'closed').sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()).map(s => (
                            <Card key={s.id}>
                                <CardContent className="p-4 grid grid-cols-3 gap-4">
                                     <div>
                                        <p className="font-semibold">{s.userName}</p>
                                        <p className="text-sm text-muted-foreground">{s.outletName}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Waktu</p>
                                        <p className="font-medium">{new Date(s.startTime).toLocaleTimeString('id-ID')} - {s.endTime ? new Date(s.endTime).toLocaleTimeString('id-ID') : ''}</p>
                                    </div>
                                    <div>
                                         <p className="text-sm text-muted-foreground">Selisih</p>
                                         <p className={`font-bold ${s.difference === 0 ? '' : 'text-destructive'}`}>{formatCurrency(s.difference)}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        </div>
                    ) : (
                         <div className="text-center py-10 text-muted-foreground">
                            Belum ada sesi yang ditutup hari ini.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

