
import type { Transaction, OrderChannel, ProductVariant } from "@/lib/types";
import { AppLogo } from "@/components/app-logo";
import { QRCode } from 'qrcode.react';

function formatCurrency(value: number | undefined | null) {
    if (typeof value !== 'number' || isNaN(value)) return 'Rp0';
    return `Rp${value.toLocaleString('id-ID')}`;
}

export function Receipt({ transaction }: { transaction: Transaction }) {
  const { id, transactionNumber, date, items, total, outlet, paymentMethod, orderChannel, cashReceived, change, customerName, customer } = transaction;

  // QR code logic: tampilkan jika ada customer dengan memberId dan name
  let qrValue = '';
  let memberName = '';
  if (customer && customer.memberId && customer.name) {
    qrValue = JSON.stringify({ memberId: customer.memberId, name: customer.name });
    memberName = customer.name;
  }

  return (
    <div className="printable-area bg-white text-black font-mono p-4 max-w-xs mx-auto">
        <div className="text-center mb-4">
            <h1 className="text-xl font-bold">Maujajan POS</h1>
            <p className="text-xs">{outlet}</p>
            <p className="text-xs">{new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' }).format(date)}</p>
            <p className="text-xs">ID: {transactionNumber || id}</p>
            {customerName && <p className="text-xs font-semibold">Pelanggan: {customerName}</p>}
        </div>

        <div className="border-t border-b border-dashed border-black py-2 my-2">
            {items.map((item, index) => {
                const price = item.price;
                return (
                    <div key={`${item.variant.id}-${index}`} className="flex justify-between text-xs mb-1">
                        <div className="flex-grow pr-2">
                            <p>{item.product.name} ({item.variant.name})</p>
                            <p>{item.quantity} x {formatCurrency(price)}</p>
                        </div>
                        <p className="flex-shrink-0">{formatCurrency(price * item.quantity)}</p>
                    </div>
                )
            })}
        </div>

        <div className="space-y-1 text-xs">
             <div className="flex justify-between font-bold">
                <span>Subtotal</span>
                <span>{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between">
                <span>Metode Pembayaran</span>
                <span className="capitalize">{paymentMethod}</span>
            </div>
            {paymentMethod === 'cash' && (
                 <>
                    <div className="flex justify-between">
                        <span>Tunai</span>
                        <span>{formatCurrency(cashReceived)}</span>
                    </div>
                     <div className="flex justify-between">
                        <span>Kembali</span>
                        <span>{formatCurrency(change)}</span>
                    </div>
                 </>
            )}
        </div>
        {/* QR code member */}
        {qrValue && (
          <div className="flex flex-col items-center mt-6 mb-2">
            <QRCode value={qrValue} size={96} level="M" includeMargin={false} />
            <span className="text-xs mt-2 font-semibold">{memberName}</span>
            <span className="text-[10px] text-muted-foreground">Member QR</span>
          </div>
        )}
        <div className="text-center mt-6 text-xs">
            <p>Terima kasih telah berkunjung!</p>
            <p>@maujajan.pos</p>
        </div>
    </div>
  );
}
