'use client';

import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PercentCircle, Calendar, User2 } from 'lucide-react';
import { format } from 'date-fns';

// Tipe data sementara
type Discount = any;

interface DiscountCardProps {
  discount: Discount;
  onEdit: (discount: Discount) => void;
  onDelete: (discountId: string) => void;
}

export function DiscountCard({ discount, onEdit, onDelete }: DiscountCardProps) {
  const isActive = discount.isActive;

  const discountLabel =
    discount.discountType === 'PERCENTAGE'
      ? `${discount.discountValue}%`
      : `Rp${discount.discountValue.toLocaleString('id-ID')}`;

  const targetMap: Record<string, string> = {
    ALL: 'Semua Pelanggan',
    MEMBER_ONLY: 'Hanya Member',
    NON_MEMBER_ONLY: 'Non-Member',
  };

  const scopeMap: Record<string, string> = {
    ENTIRE_ORDER: 'Seluruh Pesanan',
    SPECIFIC_PRODUCT: `Produk: ${discount.product?.name || '...'}`,
    SPECIFIC_CATEGORY: `Kategori: ${discount.category?.name || '...'}`,
  };

  return (
    <Card className="rounded-xl shadow-sm border hover:shadow-md transition">
      <CardHeader className="flex flex-row justify-between items-center px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary p-2 rounded-full">
            <PercentCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-tight">
              {discount.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              {discount.description || 'Tidak ada deskripsi'}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Aksi</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onEdit(discount)}>Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(discount.id)} className="text-destructive">
              Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2 text-sm">
        <div className="flex items-center gap-2 text-primary font-medium">
          {discountLabel}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <User2 className="h-4 w-4" />
          <span>{targetMap[discount.appliesTo]}</span>
        </div>
        <div className="text-muted-foreground text-sm">
          {scopeMap[discount.scope]}
        </div>
        {discount.minPurchase > 0 && (
          <div className="text-muted-foreground text-xs">
            Min. Belanja: Rp{discount.minPurchase.toLocaleString('id-ID')}
          </div>
        )}
        <div className="flex items-center justify-between pt-2">
          <Badge variant={isActive ? 'default' : 'outline'}>
            {isActive ? 'Aktif' : 'Tidak Aktif'}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3" />
          {discount.validFrom && discount.validUntil ? (
            <span>
              {format(new Date(discount.validFrom), 'dd MMM yyyy')} - {format(new Date(discount.validUntil), 'dd MMM yyyy')}
            </span>
          ) : (
            <span>Tanpa Batas Waktu</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}