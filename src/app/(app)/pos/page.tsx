
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Input } from "@/components/ui/input";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import type { OrderItem, Product, ProductVariant, Transaction, Customer, OrderChannel, PaymentMethod, PlatformSettings, Outlet, DiscountRule } from "@/lib/types";
import { X, Plus, Minus, CreditCard, ScanLine, CheckCircle, Printer, ClipboardList, ShoppingBag, Send, Handshake, Store, Utensils, Bike, ShoppingCart, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Receipt } from "@/components/receipt";
import { 
    getProducts, 
    getCustomers, 
    getTransactions, 
    getPlatformSettings, 
    getOutlets,
    getDiscounts,
    updateProductStock,
    addTransaction,
    addCustomer,
    updateCustomer,
    updateTransaction
} from "@/services/data-service";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useCustomerStore } from '@/store/customerStore';
import { getCustomerByPhone } from '@/services/data-service';
import { useCashierSession } from "@/hooks/use-cashier-session";
import { SessionWarning } from "@/components/session-warning";
import QrScanner from "@/components/qr-scanner";

// Tipe untuk diskon yang diaplikasikan
type AppliedDiscount = {
  name: string;
  amount: number;
  ruleId: string;
};

function getVariantPriceForChannel(variant: ProductVariant, channel: OrderChannel, markup: number): number {
    if (channel === 'store') {
        return variant.price;
    }
    const markedUpPrice = variant.price * (1 + markup / 100);
    // Round to nearest 500 for cleaner pricing, can be adjusted
    return Math.round(markedUpPrice / 500) * 500;
}

function SelectVariantDialog({ 
    product, 
    onAddToCart,
    children,
    orderChannel,
    markup
} : {
    product: Product;
    onAddToCart: (product: Product, variant: ProductVariant, price: number) => void;
    children: React.ReactNode;
    orderChannel: OrderChannel;
    markup: number;
}) {
    const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(product.variants[0]);
    const [isOpen, setIsOpen] = useState(false);

    const handleSelectVariant = (variantId: string) => {
        const variant = product.variants.find(v => v.id === variantId);
        if (variant) {
            setSelectedVariant(variant);
        }
    }

    const handleConfirm = () => {
        const price = getVariantPriceForChannel(selectedVariant, orderChannel, markup);
        onAddToCart(product, selectedVariant, price);
        setIsOpen(false);
    }
    
    const isVariantDisabled = (variant: ProductVariant) => {
      return variant.trackStock && variant.stock <= 0;
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild onClick={() => setIsOpen(true)}>{children}</DialogTrigger>
            <DialogContent
              className="max-w-[95vw] sm:max-w-[360px] w-full p-3 sm:p-5 rounded-2xl border-0 shadow-xl bg-gradient-to-br from-blue-50 via-white to-purple-100 !overflow-visible max-h-[95vh] overflow-y-auto"
              style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)' }}
            >
                <DialogHeader>
                    <DialogTitle className="font-headline text-lg sm:text-xl font-bold text-primary drop-shadow-sm">{product.name}</DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                        Pilih varian untuk ditambahkan ke pesanan.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex gap-4 items-start">
                    <Image
                        src={product.imageUrl}
                        alt={product.name}
                        width={100}
                        height={100}
                        className="rounded-md object-cover h-24 w-24"
                    />
                    <div className="space-y-2 flex-1">
                        <Select onValueChange={handleSelectVariant} defaultValue={selectedVariant.id}>
                            <SelectTrigger className="rounded-lg px-3 py-1.5 text-xs sm:text-sm">
                                <SelectValue placeholder="Pilih Varian" />
                            </SelectTrigger>
                            <SelectContent>
                                {product.variants.map(variant => (
                                    <SelectItem key={variant.id} value={variant.id} disabled={isVariantDisabled(variant)}>
                                        {variant.name} - Rp{getVariantPriceForChannel(variant, orderChannel, markup).toLocaleString('id-ID')}
                                        {isVariantDisabled(variant) && " (Stok Habis)"}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter className="gap-2 pt-2">
                    <Button variant="secondary" onClick={() => setIsOpen(false)} className="rounded-lg px-4 text-xs sm:text-sm">Batal</Button>
                    <Button onClick={handleConfirm} disabled={isVariantDisabled(selectedVariant)} variant="popup">Tambah ke Pesanan</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function WhatsAppDialog({
    isOpen,
    transaction,
    onClose,
    onConfirm
} : {
    isOpen: boolean,
    transaction: Transaction | null,
    onClose: () => void,
    onConfirm: (name: string, phone: string) => void
}) {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
      if (!isOpen) {
        document.body.scrollTop = 0;
        document.body.style.zoom = "1";
        setName("");
        setPhone("");
        setError("");
        setLoading(false);
      }
    }, [isOpen]);

    const generateReceiptText = (customerName: string) => {
        let text = `*Struk Digital - Maujajan POS*\n\n`;
        text += `Yth. ${customerName || 'Pelanggan'}\n\n`;
        text += `ID Transaksi: ${transaction?.transactionNumber || transaction?.id || '-'}\n`;
        text += `Tanggal: ${transaction ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(transaction.date)) : '-'}\n`;
        text += `Outlet: ${transaction?.outlet || '-'}\n`;
        if (transaction?.discountName) {
            text += `Member: ${customerName || 'Pelanggan'}\n`;
        }
        text += `--------------------------------\n`;
        transaction?.items.forEach(item => {
            text += `${item.product.name} (${item.variant.name})\n`;
            text += `${item.quantity} x Rp${item.price.toLocaleString('id-ID')} = Rp${(Number(item.quantity) * Number(item.price)).toLocaleString('id-ID')}\n`;
        });
        text += `--------------------------------\n`;
        const subtotal = (transaction?.total ?? 0) + (transaction?.discountAmount ?? 0);
        text += `Subtotal: Rp${subtotal.toLocaleString('id-ID')}\n`;
        if (transaction?.discountName && transaction?.discountAmount) {
            text += `Diskon: ${transaction.discountName} -Rp${transaction.discountAmount.toLocaleString('id-ID')}\n`;
        }
        text += `*Total: Rp${(transaction?.total ?? 0).toLocaleString('id-ID')}*\n\n`;
        if (transaction?.discountName) {
            const memberId = `member_${transaction.customerId?.replace(/-/g, '')}`;
            const qrData = JSON.stringify({ memberId, name: customerName || 'Pelanggan' });
            text += `QR Member: ${qrData}\n\n`;
        }
        text += `Terima kasih telah berkunjung!`;
        return encodeURIComponent(text);
    }
    
    const handleSend = () => {
        if (!transaction) return;
        if (!phone || phone.length < 8) {
          setError("Nomor WhatsApp wajib diisi dan minimal 8 digit.");
          return;
        }
        setLoading(true);
        setError("");
        onConfirm(name, phone);
        const receiptText = generateReceiptText(name);
        const whatsappUrl = `https://wa.me/${phone.startsWith('0') ? '62' + phone.substring(1) : phone}?text=${receiptText}`;
        window.open(whatsappUrl, '_blank');
        setTimeout(() => {
          setLoading(false);
          onClose();
        }, 800); // beri jeda agar UX smooth
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
              className="w-full max-w-xs sm:max-w-sm p-4 sm:p-6 rounded-2xl border-0 shadow-xl bg-gradient-to-br from-blue-50 via-white to-purple-100 max-h-[90vh] overflow-y-auto"
              style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)' }}
            >
                <DialogHeader>
                    <DialogTitle className="text-center font-headline text-lg sm:text-xl font-bold text-primary drop-shadow-sm">Kirim Struk WhatsApp</DialogTitle>
                    <DialogDescription className="text-center text-xs sm:text-sm text-muted-foreground mb-2">Masukkan nomor WhatsApp untuk mengirim struk digital. Nama opsional.</DialogDescription>
                </DialogHeader>
                {transaction ? (
                  <div className="space-y-4 py-2">
                      <div className="space-y-2">
                          <Label htmlFor="customer-name" className="text-xs">Nama Pelanggan (Opsional)</Label>
                          <Input id="customer-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Masukkan nama pelanggan" style={{ fontSize: 16, height: 44 }} className="rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="customer-phone" className="text-xs">Nomor WhatsApp <span className="text-destructive">*</span></Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500">
                              <svg width="22" height="22" viewBox="0 0 32 32" fill="currentColor"><path d="M16 3C9.373 3 4 8.373 4 15c0 2.637.86 5.08 2.48 7.13L4.09 28.36a1 1 0 0 0 1.25 1.25l6.23-2.39A12.93 12.93 0 0 0 16 27c6.627 0 12-5.373 12-12S22.627 3 16 3zm0 22c-1.77 0-3.5-.36-5.1-1.07a1 1 0 0 0-.77-.04l-4.47 1.72 1.72-4.47a1 1 0 0 0-.04-.77A10.97 10.97 0 0 1 6 15c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10zm5.29-7.29-2.5-2.5a1 1 0 0 0-1.42 0l-1.29 1.3a7.97 7.97 0 0 1-3.29-3.29l1.3-1.29a1 1 0 0 0 0-1.42l-2.5-2.5a1 1 0 0 0-1.42 0c-.36.36-.93 1.01-1.01 1.7-.13 1.13.23 2.5 1.09 4.01.85 1.5 2.13 3.13 4.01 4.01 1.51.86 2.88 1.22 4.01 1.09.69-.08 1.34-.65 1.7-1.01a1 1 0 0 0 0-1.42z"/></svg>
                            </span>
                            <Input id="customer-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 081234567890" required style={{ fontSize: 16, height: 44, paddingLeft: 40 }} className="rounded-lg px-3 py-2 text-sm pl-10" inputMode="numeric" />
                          </div>
                          {error && <div className="text-xs text-destructive mt-1">{error}</div>}
                      </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">Tidak ada transaksi.</div>
                )}
                <DialogFooter className="flex flex-col gap-2 pt-2">
                    <Button variant="secondary" onClick={onClose} className="w-full rounded-lg text-sm py-2">Batal</Button>
                    <Button onClick={handleSend} disabled={!phone || !transaction || loading} className="w-full rounded-lg text-sm py-2 bg-green-600 hover:bg-green-700 text-white font-bold flex items-center justify-center gap-2">
                        {loading ? (
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <>
                                <Send className="mr-2 h-4 w-4" />
                                Kirim & Simpan
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function PaymentSuccessDialog({ 
    isOpen, 
    onOpenChange, 
    lastTransaction, 
    onPrint,
    onSendWhatsApp
} : {
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    lastTransaction: Transaction | null,
    onPrint: () => void,
    onSendWhatsApp: () => void,
}) {
    if (!lastTransaction) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent
              className="w-full max-w-xs sm:max-w-sm p-4 sm:p-6 rounded-2xl border-0 shadow-xl bg-gradient-to-br from-green-50 via-white to-blue-100 max-h-[90vh] overflow-y-auto"
              style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)' }}
            >
                <DialogHeader>
                    <div className="flex flex-col items-center gap-2 mb-2">
                        <CheckCircle className="h-16 w-16 text-green-500 mb-1" />
                        <DialogTitle className="text-center font-headline text-xl sm:text-2xl font-bold text-green-700 drop-shadow-sm">Transaksi Berhasil!</DialogTitle>
                    </div>
                    <DialogDescription className="text-center text-xs sm:text-sm text-muted-foreground mb-2">
                        Transaksi berhasil dicatat.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center text-center gap-2 py-2">
                    <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">Rp{(lastTransaction.total ?? 0).toLocaleString('id-ID')}</div>
                    {lastTransaction.discountName && (
                        <div className="text-xs text-green-600 mb-1">
                            Member: {lastTransaction.customerName}
                        </div>
                    )}
                    {lastTransaction.discountName && lastTransaction.discountAmount && (
                        <div className="text-xs text-green-600 mb-1">
                            Diskon: {lastTransaction.discountName} -Rp{lastTransaction.discountAmount.toLocaleString('id-ID')}
                        </div>
                    )}
                    <div className="text-xs text-muted-foreground mb-2">Terima kasih telah bertransaksi!</div>
                    <div className="w-full space-y-2 mt-2">
                        <Button onClick={onSendWhatsApp} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-sm py-3 flex items-center justify-center gap-2">
                           <svg width='22' height='22' viewBox='0 0 32 32' fill='currentColor' className='mr-2'><path d="M16 3C9.373 3 4 8.373 4 15c0 2.637.86 5.08 2.48 7.13L4.09 28.36a1 1 0 0 0 1.25 1.25l6.23-2.39A12.93 12.93 0 0 0 16 27c6.627 0 12-5.373 12-12S22.627 3 16 3zm0 22c-1.77 0-3.5-.36-5.1-1.07a1 1 0 0 0-.77-.04l-4.47 1.72 1.72-4.47a1 1 0 0 0-.04-.77A10.97 10.97 0 0 1 6 15c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10zm5.29-7.29-2.5-2.5a1 1 0 0 0-1.42 0l-1.29 1.3a7.97 7.97 0 0 1-3.29-3.29l1.3-1.29a1 1 0 0 0 0-1.42l-2.5-2.5a1 1 0 0 0-1.42 0c-.36.36-.93 1.01-1.01 1.7-.13 1.13.23 2.5 1.09 4.01.85 1.5 2.13 3.13 4.01 4.01 1.51.86 2.88 1.22 4.01 1.09.69-.08 1.34-.65 1.7-1.01a1 1 0 0 0 0-1.42z"/></svg>
                           Kirim Struk via WhatsApp
                        </Button>
                        <Button onClick={onPrint} className="w-full rounded-lg text-sm py-3 flex items-center justify-center gap-2" variant="outline">
                            <Printer className="mr-2 h-5 w-5" />
                            Cetak Struk Fisik
                        </Button>
                    </div>
                </div>
                <DialogFooter className="pt-2">
                     <Button variant="secondary" className="w-full rounded-lg text-sm py-2 hover:bg-primary/10 transition-colors" onClick={() => onOpenChange(false)}>Tutup</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const orderChannelOptions = {
    'store': { label: "Toko Fisik", icon: Store },
    'GoFood': { label: "GoFood", icon: Utensils },
    'GrabFood': { label: "GrabFood", icon: Bike },
    'ShopeeFood': { label: "ShopeeFood", icon: ShoppingCart },
};

const paymentMethodOptions = {
    'cash': { label: 'Tunai', icon: CreditCard, available_for: ['store', 'GoFood', 'GrabFood', 'ShopeeFood']},
    'qris': { label: 'QRIS', icon: ScanLine, available_for: ['store']},
    'platform_balance': { label: 'Saldo Platform', icon: Handshake, available_for: ['GoFood', 'GrabFood', 'ShopeeFood']},
};

export default function POSPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const { hasActiveSession } = useCashierSession();
  const customerStore = useCustomerStore();
  const { fetchCustomers } = customerStore;

  // Fungsi untuk menyimpan cart ke localStorage
  const saveCartToStorage = useCallback((cart: OrderItem[]) => {
    try {
      const cartData = {
        items: cart,
        timestamp: Date.now(),
        userId: user?.id || 'anonymous'
      };
      localStorage.setItem('maujajan_cart', JSON.stringify(cartData));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [user?.id]);

  // Fungsi untuk memuat cart dari localStorage
  const loadCartFromStorage = useCallback(() => {
    try {
      const cartData = localStorage.getItem('maujajan_cart');
      if (cartData) {
        const parsed = JSON.parse(cartData);
        // Cek apakah cart masih valid (dibuat dalam 24 jam terakhir)
        const isExpired = Date.now() - parsed.timestamp > 24 * 60 * 60 * 1000;
        if (!isExpired && parsed.userId === (user?.id || 'anonymous')) {
          return parsed.items;
        } else {
          // Hapus cart yang expired atau bukan milik user ini
          localStorage.removeItem('maujajan_cart');
        }
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      localStorage.removeItem('maujajan_cart');
    }
    return [];
  }, [user?.id]);

  // State untuk cart dengan localStorage
  const [order, setOrder] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeDiscounts, setActiveDiscounts] = useState<DiscountRule[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({});
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentSuccessDialogOpen, setPaymentSuccessDialogOpen] = useState(false);
  const [whatsAppDialogOpen, setWhatsAppDialogOpen] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [cashReceived, setCashReceived] = useState(0);
  const [formattedCashReceived, setFormattedCashReceived] = useState('');
  const [searchTerm, setSearchTerm] = useState("");
  const [orderChannel, setOrderChannel] = useState<OrderChannel>('store');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  // const isMobile = useIsMobile(); // (opsional, jika ingin dipakai untuk deteksi mobile di komponen)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // State baru untuk diskon
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);
  
  // State untuk member dan QR scanner
  const [currentMember, setCurrentMember] = useState<Customer | null>(null);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [memberValidationError, setMemberValidationError] = useState<string>('');

  // Fungsi untuk kalkulasi total, dipindahkan ke atas agar bisa dipakai di banyak tempat
  const calculateTotal = useCallback((currentOrder: OrderItem[]) => {
    return currentOrder.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, []);

  const total = calculateTotal(order);
  
  // Muat cart dari localStorage setelah user tersedia
  useEffect(() => {
    if (user && order.length === 0) {
      const savedCart = loadCartFromStorage();
      if (savedCart.length > 0) {
        setOrder(savedCart);
      }
    }
  }, [user, loadCartFromStorage, order.length]);
  
  // Simpan cart ke localStorage setiap kali order berubah
  useEffect(() => {
    if (order.length > 0) {
      saveCartToStorage(order);
    } else {
      // Hapus cart dari localStorage jika kosong
      localStorage.removeItem('maujajan_cart');
    }
  }, [order, saveCartToStorage]);
  
  const calculateDiscount = useCallback(() => {
    const isMember = !!currentMember; // Gunakan currentMember untuk validasi member
    let bestDiscount: AppliedDiscount | null = null;
    let maxDiscountAmount = 0;

    for (const rule of activeDiscounts) {
      let currentDiscountAmount = 0;

      // 1. Cek audiens
      const isAudienceMatch =
        (rule.appliesTo === 'ALL') ||
        (rule.appliesTo === 'MEMBER_ONLY' && isMember) ||
        (rule.appliesTo === 'NON_MEMBER_ONLY' && !isMember);
      if (!isAudienceMatch) continue;

      // 2. Cek minimum pembelian
      if (rule.minPurchase && total < rule.minPurchase) continue;

      // 3. Cek expired
      if (rule.validUntil && new Date(rule.validUntil) < new Date()) continue;

      // 4. Cek bundling produk (jika ada)
      if (rule.bundledProductIds && rule.bundledProductIds.length > 0) {
        const allBundledInCart = rule.bundledProductIds.every(pid =>
          order.some(item => item.product.id === pid)
        );
        if (!allBundledInCart) continue;
      }
      
      // 5. Kalkulasi berdasarkan cakupan
      if (rule.scope === 'ENTIRE_ORDER') {
        if (rule.discountType === 'PERCENTAGE') {
          currentDiscountAmount = total * (rule.discountValue / 100);
          // Terapkan maksimal potongan jika ada
          if (rule.maxDiscountAmount && currentDiscountAmount > rule.maxDiscountAmount) {
            currentDiscountAmount = rule.maxDiscountAmount;
          }
        } else {
          currentDiscountAmount = rule.discountValue;
        }
      } else if (rule.scope === 'SPECIFIC_PRODUCT' && rule.productId) {
        const item = order.find(i => i.product.id === rule.productId);
        if (item) {
          const itemTotal = item.price * item.quantity;
          if (rule.discountType === 'PERCENTAGE') {
            currentDiscountAmount = itemTotal * (rule.discountValue / 100);
            if (rule.maxDiscountAmount && currentDiscountAmount > rule.maxDiscountAmount) {
              currentDiscountAmount = rule.maxDiscountAmount;
            }
          } else {
            currentDiscountAmount = Math.min(rule.discountValue, itemTotal);
          }
        }
      } else if (rule.scope === 'SPECIFIC_CATEGORY' && rule.categoryId) {
        const itemsInCategory = order.filter(i => String(i.product.categoryId) === String(rule.categoryId));
        if (itemsInCategory.length > 0) {
          const categoryTotal = itemsInCategory.reduce((sum, i) => sum + i.price * i.quantity, 0);
          if (rule.discountType === 'PERCENTAGE') {
            currentDiscountAmount = categoryTotal * (rule.discountValue / 100);
            if (rule.maxDiscountAmount && currentDiscountAmount > rule.maxDiscountAmount) {
              currentDiscountAmount = rule.maxDiscountAmount;
            }
          } else {
            currentDiscountAmount = Math.min(rule.discountValue, categoryTotal);
          }
        }
      }
      
      // 6. Bandingkan dan pilih diskon terbaik
      if (currentDiscountAmount > maxDiscountAmount) {
        maxDiscountAmount = currentDiscountAmount;
        bestDiscount = {
          name: rule.name,
          amount: maxDiscountAmount,
          ruleId: rule.id,
        };
      }
    }

    setAppliedDiscount(bestDiscount);
  }, [order, currentMember, activeDiscounts, total]);

  // Panggil kalkulasi setiap kali order atau customer berubah
  useEffect(() => {
    calculateDiscount();
  }, [calculateDiscount]);

  const finalTotal = total - (appliedDiscount?.amount || 0);

  const handleCashReceivedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^\d]/g, ''); // Remove non-digits
    const numValue = Number(rawValue);
    setCashReceived(numValue);
    setFormattedCashReceived(numValue.toLocaleString('id-ID'));
  };

  useEffect(() => {
    if (isInitialized) return; // Prevent multiple fetches
    
    async function fetchData() {
      try {
        setIsLoading(true);
        const [productsData, outletsData, platformSettingsData, discountsData] = await Promise.all([
            getProducts(),
          getOutlets(),
            getPlatformSettings(),
          getDiscounts()
        ]);
        setProducts(productsData);
        await fetchCustomers(); // Menggunakan customer store
        setOutlets(outletsData);
        setPlatformSettings(platformSettingsData);
        setActiveDiscounts(discountsData.filter(d => d.isActive));
        setIsInitialized(true);

      } catch (error) {
        console.error('Error fetching initial data:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Gagal memuat data produk"
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [fetchCustomers, isInitialized]);

  // Update customers state when customerStore changes
  useEffect(() => {
    setCustomers(customerStore.customers);
  }, [customerStore.customers]);

  const currentMarkup = platformSettings[orderChannel as keyof typeof platformSettings]?.markup || 0;

  const addToOrder = (product: Product, variant: ProductVariant, price: number) => {
    if (variant.trackStock && variant.stock <= 0) {
        toast({
            variant: "destructive",
            title: "Stok Habis",
            description: `Stok untuk ${product.name} (${variant.name}) telah habis.`,
        });
        return;
    }
    setOrder((prevOrder) => {
      const existingItem = prevOrder.find((item) => item.variant.id === variant.id);
      if (existingItem) {
        return prevOrder.map((item) =>
          item.variant.id === variant.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevOrder, { product, variant, quantity: 1, price: price }];
    });
  };
  
  const handleProductClick = (product: Product, variant?: ProductVariant) => {
      const price = getVariantPriceForChannel(variant || product.variants[0], orderChannel, currentMarkup);
      if (variant) {
        addToOrder(product, variant, price);
        return;
      }
      if (product.variants.length === 1) {
          addToOrder(product, product.variants[0], price);
      } else {
          // The SelectVariantDialog will handle adding to cart
      }
  };

  const updateQuantity = (variantId: string, newQuantity: number) => {
    setOrder((prevOrder) => {
      if (newQuantity <= 0) {
        return prevOrder.filter((item) => item.variant.id !== variantId);
      }
      return prevOrder.map((item) =>
        item.variant.id === variantId ? { ...item, quantity: newQuantity } : item
      );
    });
  };

  const handlePayment = async (customerId?: string, customerName?: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User tidak ditemukan"
      });
      return;
    }

    // Validasi member untuk diskon member-only
    if (appliedDiscount && appliedDiscount.name.includes('Member') && !currentMember) {
      toast({
        variant: "destructive",
        title: "Validasi Member Diperlukan",
        description: "Silakan scan QR member terlebih dahulu untuk menggunakan diskon member."
      });
      return;
    }

    setIsProcessingPayment(true);

    const newTransactionData: Omit<Transaction, 'id'> = {
        items: order,
        total: finalTotal,
        date: new Date(),
        outlet: user?.role === 'cashier' && user?.outletId 
          ? outlets.find(o => o.id === user.outletId)?.name || "Default Outlet"
          : outlets.length > 0 ? outlets[0].name : "Default Outlet", 
        orderChannel: orderChannel,
        paymentMethod: paymentMethod,
        cashReceived: paymentMethod === 'cash' ? cashReceived : undefined,
        change: paymentMethod === 'cash' && cashReceived > finalTotal ? cashReceived - finalTotal : undefined,
        customerId: currentMember?.id || customerId,
        customerName: currentMember?.name || customerName,
        discountName: appliedDiscount?.name,
        discountAmount: appliedDiscount?.amount,
    }

    let isStockAvailable = true;
    for (const item of order) {
        if (!item.variant.trackStock) continue;

        const productInState = products.find(p => p.id === item.product.id);
        const variantInState = productInState?.variants.find(v => v.id === item.variant.id);
        
        if (!variantInState || variantInState.stock < item.quantity) {
             toast({
                variant: "destructive",
                title: "Stok Tidak Cukup",
                description: `Stok ${item.product.name} (${item.variant.name}) tidak mencukupi.`,
            });
            isStockAvailable = false;
            break;
        }
    }

    if (!isStockAvailable) {
        setIsProcessingPayment(false);
        return; 
    }
    
    try {
      // Deduct stock
      for (const item of order) {
          if (item.variant.trackStock) {
              await updateProductStock(item.product.id, item.variant.id, -item.quantity);
          }
      }
      // Refresh local product state
      const updatedProducts = await getProducts();
      setProducts(updatedProducts);

      // Add transaction
      const newTransaction = await addTransaction(newTransactionData, user);
      setLastTransaction(newTransaction);
      
      setOrder([]);
      setCashReceived(0);
      setFormattedCashReceived('');
      setAppliedDiscount(null); // Reset diskon
      setCurrentMember(null); // Reset member
      setPaymentDialogOpen(false);
      setPaymentSuccessDialogOpen(true);
      setOrderChannel('store');
      setPaymentMethod('cash');
      setIsProcessingPayment(false);
      
      // Bersihkan cart dari localStorage setelah transaksi berhasil
      localStorage.removeItem('maujajan_cart');
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Gagal memproses pembayaran"
      });
      setIsProcessingPayment(false);
    }
  };

  const handlePrintReceipt = () => {
      window.print();
  }

  const handleOpenWhatsAppDialog = () => {
    setPaymentSuccessDialogOpen(false);
    setWhatsAppDialogOpen(true);
  }
  
  const handleWhatsAppConfirm = async (name: string, phone: string) => {
    if (!lastTransaction || !user) return;

    let customerId;
    let existingCustomer = customers.find(c => c.phoneNumber === phone);
    
    try {
      if (existingCustomer) {
          console.log("Existing customer found:", existingCustomer);
          console.log("Last transaction total:", lastTransaction?.total);
          const updatedCustomerData: Partial<Omit<Customer, 'id'>> = {
              lastTransactionDate: new Date(),
              totalSpent: existingCustomer.totalSpent + (lastTransaction?.total || 0),
              transactionIds: [...existingCustomer.transactionIds, String(lastTransaction.id)],
          };
          console.log("Data to update customer with:", updatedCustomerData);
          const updatedCustomer = await updateCustomer(existingCustomer.id, updatedCustomerData);
          console.log("Updated customer from DB:", updatedCustomer);
          await fetchCustomers(); // Refresh global state
          customerId = updatedCustomer.id;
          // router.refresh(); // Hapus untuk mencegah re-render yang tidak perlu
      } else {
          const newCustomerData: Omit<Customer, 'id'> = {
              name: name,
              phoneNumber: phone,
              firstTransactionDate: new Date(),
              lastTransactionDate: new Date(),
              totalSpent: lastTransaction?.total || 0,
              transactionIds: lastTransaction ? [String(lastTransaction.id)] : [],
          };
          const newCustomer = await addCustomer(newCustomerData);
          await fetchCustomers(); // Refresh global state
          customerId = newCustomer.id;
          // router.refresh(); // Hapus untuk mencegah re-render yang tidak perlu
      }
      
      // Update the transaction in the database so it is linked to the customer
      // This ensures customer analytics (total belanja, total transaksi) are correct
      if (lastTransaction && customerId) {
        if (typeof updateTransaction === 'function') {
          await updateTransaction(lastTransaction.id, {
            customerId: customerId,
            customerName: name || undefined,
          });
        } else {
          // TODO: Implement updateTransaction in data-service if not available
        }
      }
      // Update local state for receipt
      const updatedTransaction = { ...lastTransaction, customerId: customerId, customerName: name || undefined };
      setLastTransaction(updatedTransaction);
    } catch (error) {
      console.error('Error saving customer data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Gagal menyimpan data pelanggan"
      });
    }
  }

  const handleCloseWhatsAppDialog = () => {
    setWhatsAppDialogOpen(false);
  }

  // Fungsi untuk handle QR scan
  const handleQrScan = (decodedText: string) => {
    try {
      const memberData = JSON.parse(decodedText);
      if (memberData.memberId && memberData.name) {
        // Cari member berdasarkan memberId
        const member = customers.find(c => c.memberId === memberData.memberId);
        if (member) {
          setCurrentMember(member);
          setQrScannerOpen(false);
          setMemberValidationError('');
          toast({
            title: "Member Divalidasi",
            description: `Selamat datang, ${member.name}!`,
          });
        } else {
          setMemberValidationError('Member tidak ditemukan dalam database.');
        }
      } else {
        setMemberValidationError('QR code tidak valid.');
      }
    } catch (error) {
      setMemberValidationError('QR code tidak valid atau rusak.');
    }
  };

  const handleQrScanError = (error: any) => {
    // Hanya log error yang serius, bukan warning biasa
    if (error && typeof error === 'object' && error.name !== 'IndexSizeError') {
      console.error('QR Scanner error:', error);
      setMemberValidationError('Gagal memulai kamera. Pastikan izin kamera diberikan.');
    }
  };

  const handleRemoveMember = () => {
    setCurrentMember(null);
    setAppliedDiscount(null); // Reset diskon karena member dihapus
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const isProductDisabled = (product: Product) => {
    return product.variants.every(v => v.trackStock && v.stock <= 0);
  }
  
  const availablePaymentMethods = Object.entries(paymentMethodOptions)
    .filter(([, options]) => options.available_for.includes(orderChannel))
    .map(([key]) => key as PaymentMethod);

  // Reset payment method if it's not available for the current channel
  useEffect(() => {
    if (!availablePaymentMethods.includes(paymentMethod)) {
        setPaymentMethod(availablePaymentMethods[0]);
    }
  }, [orderChannel, paymentMethod, availablePaymentMethods]);

  // Recalculate order prices when channel changes
  useEffect(() => {
    if (order.length > 0) { // Hanya update jika ada item di order
      setOrder(currentOrder => {
        const newMarkup = platformSettings[orderChannel as keyof typeof platformSettings]?.markup || 0;
        return currentOrder.map(item => ({
          ...item,
          price: getVariantPriceForChannel(item.variant, orderChannel, newMarkup),
        }))
      })
    }
  }, [orderChannel, platformSettings, order.length]);
  
  const totalForDialog = calculateTotal(order);
  const changeForDialog = cashReceived > finalTotal ? cashReceived - finalTotal : 0;

  // Tambahkan state untuk modal pesanan mobile
  const [mobileOrderOpen, setMobileOrderOpen] = useState(false);
  // 2. Tambahkan state untuk bottom sheet keranjang di mobile
  const [cartOpen, setCartOpen] = useState(false);

  // Helper: assign gradient bg by index
  const productGradients = [
    "from-blue-200/60 via-white to-white dark:from-blue-700/40 dark:via-background dark:to-background",
    "from-green-200/60 via-white to-white dark:from-green-700/40 dark:via-background dark:to-background",
    "from-orange-200/60 via-white to-white dark:from-orange-700/40 dark:via-background dark:to-background",
    "from-purple-200/60 via-white to-white dark:from-purple-700/40 dark:via-background dark:to-background",
  ];
  // Helper: check if product is in cart
  const isProductInCart = (product: Product) => order.some(item => item.product.id === product.id);

  // Fungsi untuk membersihkan cart
  const clearCart = () => {
    setOrder([]);
    setAppliedDiscount(null);
    setCurrentMember(null);
    localStorage.removeItem('maujajan_cart');
    toast({
      title: "Cart Dikosongkan",
      description: "Semua item telah dihapus dari keranjang",
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-28">
      {/* Header & Search */}
      <div className="sticky top-0 z-20 bg-background/95 px-2 pt-2 pb-1 flex flex-col gap-1 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">Transaksi Baru</h1>
            {order.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearCart}
                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Kosongkan
              </Button>
            )}
          </div>
          {/* Floating cart button for mobile */}
          <div className="md:hidden">
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <ShoppingCart className="h-6 w-6" />
                  {order.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-white rounded-full text-xs px-1.5 py-0.5">{order.length}</span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[70vh] p-0 rounded-t-2xl border-0 shadow-xl bg-gradient-to-br from-blue-50 via-white to-purple-100 !overflow-visible w-full">
                {/* Keranjang di mobile */}
          <div className="px-4 pt-4 pb-2">
            <DialogHeader className="border-b pb-2">
              <div className="flex items-center justify-between">
                <DialogTitle className="font-headline flex items-center gap-2 text-lg text-primary drop-shadow-sm">
                  <ClipboardList className="h-6 w-6" />
                  Pesanan
                </DialogTitle>
                {order.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearCart}
                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 h-6 px-2"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Kosongkan
                  </Button>
                )}
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto pt-2 pb-4 max-h-[50vh]">
              {order.length === 0 ? (
                <div className="flex items-center justify-center h-full min-h-[100px]">
                  <p className="text-center text-muted-foreground py-10">Belum ada pesanan</p>
                </div>
              ) : (
                <div className="space-y-4 px-1">
                  {order.map((item) => (
                    <div key={item.variant.id} className="flex items-start">
                      <Image src={item.product.imageUrl} alt={item.product.name} width={48} height={48} className="rounded-md mr-4 h-12 w-12 object-cover" />
                      <div className="flex-1">
                        <p className="font-semibold text-xs sm:text-sm">{item.product.name} <span className="text-xs text-muted-foreground">({item.variant.name})</span></p>
                        <p className="text-xs text-muted-foreground">Rp{item.price.toLocaleString("id-ID")}</p>
                        <div className="flex items-center mt-1">
                          <Button variant="outline" size="icon" className="h-6 w-6 text-xs" onClick={() => updateQuantity(item.variant.id, item.quantity - 1)}><Minus className="h-3 w-3"/></Button>
                          <span className="w-8 text-center text-xs sm:text-sm">{item.quantity}</span>
                          <Button variant="outline" size="icon" className="h-6 w-6 text-xs" onClick={() => updateQuantity(item.variant.id, item.quantity + 1)}><Plus className="h-3 w-3"/></Button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-xs sm:text-sm">Rp{(item.price * item.quantity).toLocaleString("id-ID")}</p>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive mt-1" onClick={() => updateQuantity(item.variant.id, 0)}><X className="h-4 w-4"/></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
          <div className="px-4 pb-4 pt-2 border-t bg-transparent sticky bottom-0">
            {/* Member Status */}
            {currentMember ? (
              <div className="w-full flex justify-between items-center text-sm mb-2 p-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-700 font-medium">Member: {currentMember.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={handleRemoveMember}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-1 text-green-600 text-xs">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Tervalidasi
                </div>
              </div>
            ) : (
              <div className="w-full flex items-center text-sm mb-2 p-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2">
                  <span className="text-blue-600 font-medium">Member</span>
                  <span className="text-xs text-blue-500">Scan QR di pembayaran untuk diskon</span>
                </div>
              </div>
            )}
            {appliedDiscount && (
              <div className="w-full flex justify-between text-sm mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-green-600 font-medium">Diskon: {appliedDiscount.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 text-red-500 hover:text-red-700"
                    onClick={() => setAppliedDiscount(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <span className="text-green-600 font-medium">-Rp{appliedDiscount.amount.toLocaleString("id-ID")}</span>
              </div>
            )}
            <div className="w-full flex justify-between text-base font-bold mb-4">
              <span>Total</span>
              <span>Rp{finalTotal.toLocaleString("id-ID")}</span>
            </div>
            <Button
              className="w-full bg-gradient-to-r from-primary to-purple-500 text-white hover:bg-primary/90 rounded-lg py-3 text-base font-bold shadow-md"
              size="lg"
              disabled={order.length === 0}
              onClick={() => {
                setCartOpen(false);
                setPaymentDialogOpen(true);
              }}
            >
              Bayar
            </Button>
          </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        <Input
          type="text"
          placeholder="Cari produk..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full rounded-lg"
        />
      </div>
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Produk grid */}
        <div className="flex-1 p-2 grid grid-cols-3 gap-2 sm:gap-4">
          {isLoading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground text-center">Memuat produk...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground py-12">Tidak ada produk ditemukan.</div>
          ) : (
            filteredProducts.map((product, idx) => {
              const inCart = isProductInCart(product);
              const disabled = isProductDisabled(product);
              return (
                <div key={product.id} className="flex flex-col items-center justify-start w-full max-w-[170px] mx-auto p-1">
                  <div className={`relative flex justify-center items-center mb-2 ${inCart ? 'ring-4 ring-primary/60' : ''} rounded-xl transition-all duration-150`}
                    style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.04)' }}>
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      width={96}
                      height={96}
                      className="rounded-lg object-cover h-24 w-24 bg-white"
                      priority={idx < 2}
                    />
                    {disabled && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg z-20">
                        <span className="text-white font-bold text-lg">Stok Habis</span>
                      </div>
                    )}
                  </div>
                  <div className="w-full flex flex-col items-center justify-center min-h-[90px]">
                    <p className="font-bold text-sm text-center text-foreground line-clamp-2 mb-1">{product.name}</p>
                    <p className="font-semibold text-primary text-base mb-1">Rp{product.variants[0].price.toLocaleString('id-ID')}</p>
                    {product.variants.length === 1 ? (
                      <Button className="w-auto px-4 mx-auto rounded-full bg-primary text-white hover:bg-primary/90 font-bold text-xs py-0.5 mt-0.5" size="sm"
                        onClick={e => {
                          e.stopPropagation();
                          handleProductClick(product, product.variants[0]);
                        }}
                        disabled={disabled}
                      >
                        Tambah
                      </Button>
                    ) : (
                      <SelectVariantDialog
                        product={product}
                        onAddToCart={addToOrder}
                        orderChannel={orderChannel}
                        markup={currentMarkup}
                      >
                        <Button className="w-auto px-4 mx-auto rounded-full bg-primary text-white hover:bg-primary/90 font-bold text-xs py-0.5 mt-0.5" size="sm" disabled={disabled}>
                          Pilih Varian
                        </Button>
                      </SelectVariantDialog>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        {/* Sidebar keranjang di desktop */}
        <div className="hidden md:flex flex-col w-[380px] max-w-full border-l border-border bg-gradient-to-br from-white via-blue-50 to-purple-50 shadow-2xl z-30 h-full">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-primary text-base">Keranjang</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Total: {order.length} item</span>
                {order.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearCart}
                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 h-6 px-2"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Kosongkan
                  </Button>
                )}
              </div>
            </div>
            <div className="pt-4 pb-2 flex-1 overflow-y-auto max-h-[calc(100vh-200px)]">
              {order.length === 0 ? (
                <div className="flex items-center justify-center h-full min-h-[100px]">
                  <p className="text-center text-muted-foreground py-10">Belum ada pesanan</p>
                </div>
              ) : (
                <div className="space-y-4 px-1">
                  {order.map((item) => (
                    <div key={item.variant.id} className="flex items-start">
                      <Image src={item.product.imageUrl} alt={item.product.name} width={48} height={48} className="rounded-md mr-4 h-12 w-12 object-cover" />
                      <div className="flex-1">
                        <p className="font-semibold text-xs sm:text-sm">{item.product.name} <span className="text-xs text-muted-foreground">({item.variant.name})</span></p>
                        <p className="text-xs text-muted-foreground">Rp{item.price.toLocaleString('id-ID')}</p>
                        <div className="flex items-center mt-1">
                          <Button variant="outline" size="icon" className="h-6 w-6 text-xs" onClick={() => updateQuantity(item.variant.id, item.quantity - 1)}><Minus className="h-3 w-3"/></Button>
                          <span className="w-8 text-center text-xs sm:text-sm">{item.quantity}</span>
                          <Button variant="outline" size="icon" className="h-6 w-6 text-xs" onClick={() => updateQuantity(item.variant.id, item.quantity + 1)}><Plus className="h-3 w-3"/></Button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-xs sm:text-sm">Rp{(item.price * item.quantity).toLocaleString('id-ID')}</p>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive mt-1" onClick={() => updateQuantity(item.variant.id, 0)}><X className="h-4 w-4"/></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="pb-4 pt-2 border-t bg-transparent">
              {/* Member Status */}
              {currentMember ? (
                <div className="w-full flex justify-between items-center text-sm mb-2 p-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-700 font-medium">Member: {currentMember.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={handleRemoveMember}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-1 text-green-600 text-xs">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Tervalidasi
                  </div>
                </div>
              ) : (
                <div className="w-full flex items-center text-sm mb-2 p-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 font-medium">Member</span>
                    <span className="text-xs text-blue-500">Scan QR di pembayaran untuk diskon</span>
                  </div>
                </div>
              )}
              {appliedDiscount && (
                <div className="w-full flex justify-between text-sm mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 font-medium">Diskon: {appliedDiscount.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 text-red-500 hover:text-red-700"
                      onClick={() => setAppliedDiscount(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="text-green-600 font-medium">-Rp{appliedDiscount.amount.toLocaleString("id-ID")}</span>
                </div>
              )}
              <div className="w-full flex justify-between text-base font-bold mb-4">
                <span>Total</span>
                <span>Rp{finalTotal.toLocaleString('id-ID')}</span>
              </div>
              <Button
                className="w-full bg-gradient-to-r from-primary to-purple-500 text-white hover:bg-primary/90 rounded-lg py-3 text-base font-bold shadow-md"
                size="lg"
                disabled={order.length === 0}
                onClick={() => {
                  setCartOpen(false);
                  setPaymentDialogOpen(true);
                }}
              >
                Bayar
              </Button>
            </div>
          </div>
        </div>
      </div>
      {/* Sticky bottom bar for total & bayar */}
      <div className="fixed left-0 right-0 bottom-16 z-40 md:hidden px-2 pointer-events-auto">
        <div className="w-full max-w-md mx-auto bg-gradient-to-br from-white via-blue-50 to-purple-50 rounded-2xl shadow-2xl flex items-center justify-between px-2 py-1 gap-1 border-t border-border mb-2 transition-all duration-300" style={{minHeight: 40, boxShadow: '0 8px 32px 0 rgba(31,38,135,0.18)', marginBottom: 8}}>
                      <div className="flex items-center gap-2 flex-1">
              <span className="bg-primary/10 rounded-full p-2 flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </span>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground font-medium">Total</span>
                <span className="text-xl font-bold text-primary leading-tight">Rp{finalTotal.toLocaleString("id-ID")}</span>
                {currentMember && (
                  <span className="text-xs text-green-600 font-medium">Member: {currentMember.name}</span>
                )}
                {appliedDiscount && (
                  <span className="text-xs text-green-600 font-medium">Diskon: {appliedDiscount.name}</span>
                )}
                <span className="text-xs text-muted-foreground">{order.length} item</span>
              </div>
            </div>
          <Button
            variant="popup"
            size="lg"
            className="flex items-center gap-2 px-4 py-2 text-base font-bold"
            disabled={order.length === 0}
            onClick={() => setCartOpen(true)}
          >
            Bayar
            <span className="inline-block"><svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M13 5l7 7-7 7M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
          </Button>
        </div>
      </div>
      {/* Dialog pembayaran, sukses, WhatsApp, dsb tetap ada */}
      {/* Dialog Pembayaran */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent
          className="w-full max-w-xs sm:max-w-sm p-3 sm:p-5 rounded-2xl border-0 shadow-xl bg-gradient-to-br from-blue-50 via-white to-purple-100 max-h-[90vh] overflow-y-auto"
          style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)' }}
        >
          <DialogHeader>
            <DialogTitle className="font-headline text-lg sm:text-xl font-bold text-primary drop-shadow-sm">Pembayaran</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">Pilih channel order, metode pembayaran, dan konfirmasi transaksi.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1 text-xs sm:text-sm">
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Channel Order</Label>
              <div className="flex gap-3 flex-wrap">
                {Object.entries(orderChannelOptions).map(([key, option]) => {
                  const Icon = option.icon;
                  return (
                    <label key={key} className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-muted/50 cursor-pointer data-[state=checked]:bg-primary/10 data-[state=checked]:border-primary transition-all">
                      <input
                        type="radio"
                        name="orderChannel"
                        value={key}
                        checked={orderChannel === key}
                        onChange={() => setOrderChannel(key as OrderChannel)}
                        className="accent-primary"
                      />
                      <Icon className="h-5 w-5" />
                      <span className="font-medium text-xs sm:text-sm">{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            {/* Member Status */}
            {currentMember ? (
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">Status Member</Label>
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <div className="flex flex-col">
                      <span className="text-green-700 font-medium text-xs sm:text-sm">{currentMember.name}</span>
                      <span className="text-green-600 text-xs">Member Tervalidasi</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={handleRemoveMember}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">Member</Label>
                <Button
                  variant="outline"
                  className="w-full text-xs sm:text-sm bg-gradient-to-r from-blue-50 to-purple-50 border-blue-300 text-blue-600 hover:bg-blue-100"
                  onClick={() => setQrScannerOpen(true)}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V6a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1zm12 0h2a1 1 0 001-1V6a1 1 0 00-1-1h-2a1 1 0 00-1 1v1a1 1 0 001 1zM5 20h2a1 1 0 001-1v-1a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1z" />
                  </svg>
                  Scan QR Member untuk diskon
                </Button>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Metode Pembayaran</Label>
              <div className="flex gap-3 flex-wrap">
                {availablePaymentMethods.map((method) => {
                  const Option = paymentMethodOptions[method];
                  const Icon = Option.icon;
                  return (
                    <label key={method} className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-muted/50 cursor-pointer data-[state=checked]:bg-primary/10 data-[state=checked]:border-primary transition-all">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method}
                        checked={paymentMethod === method}
                        onChange={() => setPaymentMethod(method)}
                        className="accent-primary"
                      />
                      <Icon className="h-5 w-5" />
                      <span className="font-medium text-xs sm:text-sm">{Option.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            {paymentMethod === 'cash' && (
              <div className="space-y-2">
                <Label htmlFor="cash-received" className="text-xs sm:text-sm">Uang Diterima</Label>
                <Input
                  id="cash-received"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={formattedCashReceived}
                  onChange={handleCashReceivedChange}
                  placeholder="Masukkan nominal uang diterima"
                  className="rounded-lg px-3 py-1.5 text-xs sm:text-sm"
                  style={{ fontSize: 16 }}
                />
                <div className="flex justify-between text-xs sm:text-sm mt-1">
                  <span>Kembalian</span>
                  <span className={changeForDialog < 0 ? 'text-destructive' : 'font-bold'}>
                    Rp{changeForDialog.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            )}
            {appliedDiscount && (
              <div className="flex justify-between text-xs sm:text-sm pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-green-600 font-medium">Diskon: {appliedDiscount.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 text-red-500 hover:text-red-700"
                    onClick={() => setAppliedDiscount(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <span className="text-green-600 font-medium">-Rp{appliedDiscount.amount.toLocaleString('id-ID')}</span>
              </div>
            )}
            <div className="flex justify-between text-xs sm:text-sm font-semibold pt-2">
              <span>Total</span>
              <span>Rp{finalTotal.toLocaleString('id-ID')}</span>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="secondary" onClick={() => setPaymentDialogOpen(false)} className="rounded-lg px-4 text-xs sm:text-sm">Batal</Button>
            <Button
              onClick={() => handlePayment()}
              className="rounded-lg px-4 text-xs sm:text-sm bg-gradient-to-r from-primary to-purple-500 shadow-md flex items-center justify-center gap-2"
              disabled={paymentMethod === 'cash' && cashReceived < finalTotal || isProcessingPayment}
            >
              {isProcessingPayment ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Memproses pembayaran...
                </>
              ) : (
                'Konfirmasi & Bayar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <PaymentSuccessDialog 
          isOpen={paymentSuccessDialogOpen}
          onOpenChange={setPaymentSuccessDialogOpen}
          lastTransaction={lastTransaction}
          onPrint={handlePrintReceipt}
          onSendWhatsApp={handleOpenWhatsAppDialog}
      />
      
      <WhatsAppDialog
        isOpen={whatsAppDialogOpen}
        transaction={lastTransaction}
        onClose={handleCloseWhatsAppDialog}
        onConfirm={handleWhatsAppConfirm}
      />

      {/* Dialog QR Scanner untuk Member */}
      <Dialog open={qrScannerOpen} onOpenChange={setQrScannerOpen}>
        <DialogContent
          className="w-full max-w-sm p-4 sm:p-6 rounded-2xl border-0 shadow-xl bg-gradient-to-br from-blue-50 via-white to-purple-100 max-h-[90vh] overflow-y-auto"
          style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)' }}
        >
          <DialogHeader>
            <div className="flex flex-col items-center gap-2 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V6a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1zm12 0h2a1 1 0 001-1V6a1 1 0 00-1-1h-2a1 1 0 00-1 1v1a1 1 0 001 1zM5 20h2a1 1 0 001-1v-1a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1z" />
                </svg>
              </div>
              <DialogTitle className="text-center font-headline text-lg sm:text-xl font-bold text-primary drop-shadow-sm">Scan QR Member</DialogTitle>
              <DialogDescription className="text-center text-xs sm:text-sm text-muted-foreground">
                Arahkan kamera ke QR code member untuk validasi
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 border-2 border-blue-400 border-dashed rounded-lg"></div>
              </div>
              <QrScanner
                key={qrScannerOpen ? 'qr-scanner-open' : 'qr-scanner-closed'}
                onScan={handleQrScan}
                onError={handleQrScanError}
                width={250}
                height={250}
              />
            </div>
            {memberValidationError && (
              <div className="text-xs text-destructive text-center bg-red-50 p-3 rounded-lg border border-red-200">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {memberValidationError}
                </div>
              </div>
            )}
            <div className="text-xs text-muted-foreground text-center bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Pastikan QR code member terlihat jelas di dalam kotak
              </div>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="secondary" onClick={() => setQrScannerOpen(false)} className="w-full rounded-lg text-sm py-2">
              Batal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="hidden print:block">
        {lastTransaction && <Receipt transaction={lastTransaction} />}
      </div>
    </div>
  );
}

