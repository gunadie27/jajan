'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useEffect, useState, useMemo } from 'react';
import { getProducts, getProductCategories } from '@/services/data-service';
import { Checkbox } from '@/components/ui/checkbox';

// Definisikan tipe untuk produk dan kategori
type Product = { id: string; name: string };
type Category = { id: string; name: string };

// Skema validasi menggunakan Zod
const formSchema = z.object({
  name: z.string().min(3, 'Nama promo minimal 3 karakter'),
  isActive: z.boolean().default(true),
  validFrom: z.date({
    required_error: "Tanggal mulai harus diisi",
  }),
  validUntil: z.date({
    required_error: "Tanggal berakhir harus diisi",
  }),
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  discountValue: z.coerce.number().positive('Nilai diskon harus lebih dari 0'),
  appliesTo: z.enum(['ALL', 'MEMBER_ONLY', 'NON_MEMBER_ONLY']),
  minPurchase: z.coerce.number().min(0).optional(),
  scope: z.enum(['ENTIRE_ORDER', 'SPECIFIC_PRODUCT', 'SPECIFIC_CATEGORY']),
  productId: z.string().optional(),
  categoryId: z.string().optional(),
  maxDiscountAmount: z.coerce.number().optional(),
  bundledProductIds: z.array(z.string()).optional(),
}).refine((data) => data.validUntil > data.validFrom, {
  message: "Tanggal berakhir harus setelah tanggal mulai",
  path: ["validUntil"],
});

type DiscountFormValues = z.infer<typeof formSchema>;

interface DiscountFormProps {
  initialData?: DiscountFormValues | null;
  onSubmit: (data: DiscountFormValues) => void;
  isLoading: boolean;
}

export function DiscountForm({ initialData, onSubmit, isLoading }: DiscountFormProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    async function fetchData() {
      const productsData = await getProducts();
      const categoriesData = await getProductCategories();
      setProducts(productsData.map(p => ({ id: p.id, name: p.name })));
      setCategories(categoriesData);
    }
    fetchData();
  }, []);

  const form = useForm<DiscountFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: '',
      isActive: true,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 hari dari sekarang
      discountType: 'PERCENTAGE',
      appliesTo: 'ALL',
      minPurchase: 0,
      scope: 'ENTIRE_ORDER',
    },
  });

  const discountType = form.watch('discountType');
  const discountValue = form.watch('discountValue');
  const maxDiscountAmount = form.watch('maxDiscountAmount');
  const scope = form.watch('scope');

  // Reset form jika initialData berubah
  useEffect(() => {
    if (initialData) {
      console.log('=== FORM RESET DEBUG ===');
      console.log('Initial data received:', initialData);
      
      // Konversi data untuk kompatibilitas form
      const processedData = {
        ...initialData,
        categoryId: initialData.categoryId ? String(initialData.categoryId) : undefined,
        productId: initialData.productId || undefined,
        bundledProductIds: initialData.bundledProductIds || [],
        validFrom: initialData.validFrom ? new Date(initialData.validFrom) : new Date(),
        validUntil: initialData.validUntil ? new Date(initialData.validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };
      
      console.log('Processed data for form:', processedData);
      form.reset(processedData);
    }
  }, [initialData, form]);

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    const numValue = parseInt(rawValue, 10);
    if (isNaN(numValue)) {
        form.setValue('discountValue', 0);
        e.target.value = '';
    } else {
        form.setValue('discountValue', numValue);
        e.target.value = numValue.toLocaleString('id-ID');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Promo</FormLabel>
              <FormControl>
                <Input placeholder="cth: Diskon Merdeka" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="validFrom"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Tanggal Mulai</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pilih tanggal mulai</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="validUntil"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Tanggal Berakhir</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pilih tanggal berakhir</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="appliesTo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Diskon</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih target audiens" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ALL">Semua Pelanggan</SelectItem>
                  <SelectItem value="MEMBER_ONLY">Hanya Member</SelectItem>
                  <SelectItem value="NON_MEMBER_ONLY">Hanya Non-Member</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="discountType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipe Diskon</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tipe diskon" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Persentase (%)</SelectItem>
                  <SelectItem value="FIXED_AMOUNT">Potongan Harga (Rp)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="discountValue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nilai Diskon</FormLabel>
              <div className="relative">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder={discountType === 'PERCENTAGE' ? "cth: 15" : "cth: 10.000"}
                  {...field}
                  onChange={(e) => {
                    if (discountType === 'FIXED_AMOUNT') {
                      const rawValue = e.target.value.replace(/[^0-9]/g, '');
                      const numValue = parseInt(rawValue, 10);
                      form.setValue('discountValue', isNaN(numValue) ? 0 : numValue);
                      e.target.value = isNaN(numValue) ? '' : numValue.toLocaleString('id-ID');
                    } else {
                      field.onChange(e);
                    }
                  }}
                  value={
                    discountType === 'FIXED_AMOUNT' && field.value
                      ? Number(field.value).toLocaleString('id-ID')
                      : field.value || ''
                  }
                  className="pl-10"
                />
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  {discountType === 'PERCENTAGE' ? '%' : 'Rp'}
                </span>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Maksimal Potongan untuk diskon persentase */}
        {discountType === 'PERCENTAGE' && (
          <FormField
            control={form.control}
            name="maxDiscountAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maksimal Potongan (opsional)</FormLabel>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="cth: 10.000"
                    {...field}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/[^0-9]/g, '');
                      const numValue = parseInt(rawValue, 10);
                      form.setValue('maxDiscountAmount', isNaN(numValue) ? undefined : numValue);
                      e.target.value = isNaN(numValue) ? '' : numValue.toLocaleString('id-ID');
                    }}
                    value={field.value ? Number(field.value).toLocaleString('id-ID') : ''}
                    className="pl-10"
                  />
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">Rp</span>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}



        <FormField
            control={form.control}
            name="scope"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Cakupan Diskon</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Pilih cakupan diskon" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    <SelectItem value="ENTIRE_ORDER">Seluruh Pesanan</SelectItem>
                    <SelectItem value="SPECIFIC_PRODUCT">Produk Tertentu</SelectItem>
                    <SelectItem value="SPECIFIC_CATEGORY">Kategori Tertentu</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
        />

        {scope === 'SPECIFIC_PRODUCT' && (
             <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Produk</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih produk spesifik" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {products.map(product => (
                                <SelectItem key={product.id} value={product.id}>
                                    {product.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
        )}
        
        {scope === 'SPECIFIC_CATEGORY' && (
             <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Kategori Produk</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih kategori spesifik" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {categories.map(category => (
                                <SelectItem key={category.id} value={category.id}>
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
        )}

        {/* Input produk bundling (multi-select dengan checkbox) */}
        {scope === 'ENTIRE_ORDER' && (
          <FormField
            control={form.control}
            name="bundledProductIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bundling Produk (opsional)</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <div
                      tabIndex={0}
                      className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border bg-primary/5 shadow-sm font-medium text-base cursor-pointer transition-all hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {field.value && field.value.length > 0
                        ? products.filter(p => field.value.includes(p.id)).map(p => p.name).join(', ')
                        : 'Pilih produk bundling'}
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 max-w-xs p-2 rounded-xl shadow-2xl border bg-white dark:bg-background z-50">
                    <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                      {products.map(product => (
                        <label key={product.id} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={field.value?.includes(product.id) || false}
                            onCheckedChange={checked => {
                              const newValue = checked
                                ? [...(field.value || []), product.id]
                                : (field.value || []).filter(id => id !== product.id);
                              form.setValue('bundledProductIds', newValue);
                            }}
                          />
                          <span className="text-base">{product.name}</span>
                        </label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <FormDescription>Pilih produk yang harus dibeli bersamaan agar diskon aktif.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}


        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading 
            ? (initialData ? 'Memperbarui...' : 'Menyimpan...') 
            : (initialData ? 'Update' : 'Simpan')
          }
        </Button>
      </form>
    </Form>
  );
} 