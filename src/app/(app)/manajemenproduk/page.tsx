"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MoreHorizontal, PlusCircle, Trash2, Upload, ShoppingBag, Infinity, Percent, ChevronRight, X, Pencil, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Product, PlatformSettings, OrderChannel } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { getProducts, addProduct, updateProduct, deleteProduct, getPlatformSettings, updatePlatformSettings, getOrderChannels } from "@/services/data-service";
import { cn } from "@/lib/utils";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

const initialProductFormState: Omit<Product, 'id'> = {
  name: '',
  category: '',
  imageUrl: 'https://placehold.co/300x300.png',
  variants: [{ id: `v${Date.now()}`, name: '', price: 0, trackStock: true, stock: 0, cogs: 0 }]
};

function ProductForm({
  product,
  onSave,
  onCancel,
  productCategories,
}: {
  product: Product | null;
  onSave: (product: Omit<Product, 'id'>) => void;
  onCancel: () => void;
  productCategories: string[];
}) {
  const [formData, setFormData] = useState<Omit<Product, 'id'> & { isNewCategory?: boolean }>(product ? { ...product, id: undefined } as any : initialProductFormState);
  const [imagePreview, setImagePreview] = useState<string | null>(product?.imageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (product && !productCategories.includes(product.category)) {
      setFormData(prev => ({ ...prev, isNewCategory: true }));
    } else if (!product) {
      setFormData(prev => ({ ...prev, isNewCategory: false }));
    }
  }, [product, productCategories]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleVariantChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newVariants = [...formData.variants];
    (newVariants[index] as any)[name] = name === 'price' || name === 'stock' || name === 'cogs' ? Number(value) : value;
    setFormData(prev => ({ ...prev, variants: newVariants }));
  };

  const handleTrackStockChange = (index: number, checked: boolean) => {
    const newVariants = [...formData.variants];
    newVariants[index].trackStock = checked;
    setFormData(prev => ({ ...prev, variants: newVariants }));
  };

  const addVariant = () => {
    setFormData(prev => ({
      ...prev,
      variants: [...prev.variants, { id: `v${Date.now()}`, name: '', price: 0, trackStock: true, stock: 0, cogs: 0 }]
    }));
  };
  
  const removeVariant = (index: number) => {
    if (formData.variants.length > 1) {
      const newVariants = formData.variants.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, variants: newVariants }));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validasi type
      if (!file.type.startsWith('image/')) {
        toast({
          variant: 'destructive',
          title: 'File tidak valid',
          description: 'Hanya file gambar yang diperbolehkan.'
        });
        return;
      }
      // Validasi size
      if (file.size > 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'Ukuran gambar terlalu besar',
          description: 'Ukuran maksimal 1MB.'
        });
        return;
      }
      // Resize/compress di client jika perlu
      const img = document.createElement('img');
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (!ev.target?.result) return;
        img.src = ev.target.result as string;
        img.onload = async () => {
          const MAX_DIM = 600;
          let { width, height } = img;
          if (width > MAX_DIM || height > MAX_DIM) {
            // Resize
            const scale = Math.min(MAX_DIM / width, MAX_DIM / height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(async (blob) => {
              if (!blob) return;
              // Upload blob ke server
              const formData = new FormData();
              formData.append('file', blob, file.name);
              try {
                const response = await fetch('/api/upload', {
                  method: 'POST',
                  body: formData,
                });
                const data = await response.json();
                if (data.success) {
                  setImagePreview(data.path);
                  setFormData(prev => ({...prev, imageUrl: data.path}));
                } else {
                  toast({
                    variant: 'destructive',
                    title: 'Gagal upload gambar',
                    description: data.message || 'Terjadi kesalahan saat upload.'
                  });
                }
              } catch (error) {
                console.error('Error uploading image:', error);
                toast({
                  variant: 'destructive',
                  title: 'Gagal upload gambar',
                  description: 'Terjadi kesalahan saat upload.'
                });
              }
            }, 'image/jpeg', 0.85);
          }
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent
        className="max-w-[98vw] sm:max-w-[400px] w-full p-3 sm:p-5 rounded-2xl border-0 shadow-xl bg-gradient-to-br from-blue-50 via-white to-purple-100 !overflow-visible max-h-[95vh] overflow-y-auto"
        style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)' }}
      >
        <DialogHeader>
          <DialogTitle className="font-headline text-lg sm:text-xl font-bold text-primary drop-shadow-sm">
            {product ? 'Edit Produk' : 'Tambah Produk Baru'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            Isi detail produk di bawah ini. Anda dapat menambahkan beberapa varian.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 py-1 text-xs sm:text-sm">
          <div className="space-y-1.5">
            <Label htmlFor="product-image" className="text-xs sm:text-sm">Gambar Produk</Label>
            <div 
              className="w-full h-36 sm:h-44 border-2 border-dashed rounded-md flex items-center justify-center bg-muted/50 cursor-pointer overflow-hidden"
              onClick={triggerFileUpload}
            >
              {imagePreview ? (
                 <Image src={imagePreview} alt="Product preview" width={192} height={192} className="object-cover h-full w-full rounded-md"/>
              ) : (
                <div className="text-center text-muted-foreground">
                  <Upload className="mx-auto h-7 w-7" />
                  <p className="text-xs">Klik untuk mengunggah gambar</p>
                </div>
              )}
            </div>
            <Input 
              id="product-image" 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImageUpload}
              accept="image/*"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs sm:text-sm">Nama Produk</Label>
            <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required className="rounded-lg px-3 py-1.5 text-xs sm:text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category" className="text-xs sm:text-sm">Kategori</Label>
            <Select
              value={formData.isNewCategory ? "new-category" : formData.category}
              onValueChange={(value) => {
                if (value === "new-category") {
                  setFormData(prev => ({ ...prev, category: "", isNewCategory: true }));
                } else {
                  setFormData(prev => ({ ...prev, category: value, isNewCategory: false }));
                }
              }}
            >
              <SelectTrigger className="rounded-lg px-3 py-1.5 text-xs sm:text-sm">
                <SelectValue placeholder="Pilih Kategori" />
              </SelectTrigger>
              <SelectContent>
                {productCategories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
                <SelectItem value="new-category">+ Tambah Kategori Baru...</SelectItem>
              </SelectContent>
            </Select>
            {formData.isNewCategory && (
              <Input
                id="new-category-name"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                placeholder="Masukkan nama kategori baru"
                className="mt-2 rounded-lg px-3 py-1.5 text-xs sm:text-sm"
                required
              />
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm">Varian Produk</Label>
            {formData.variants.map((variant, index) => (
              <div key={variant.id} className="space-y-2 p-2 border rounded-md relative bg-white/60">
                <div className="grid grid-cols-12 gap-x-2 gap-y-1 items-end">
                    <div className="col-span-12 sm:col-span-4 space-y-1">
                       <Label htmlFor={`variant-name-${index}`} className="text-xs">Nama Varian</Label>
                       <Input id={`variant-name-${index}`} name="name" value={variant.name} onChange={e => handleVariantChange(index, e)} placeholder="e.g. Regular" required className="rounded-lg px-3 py-1.5 text-xs sm:text-sm" />
                    </div>
                     <div className="col-span-6 sm:col-span-2 space-y-1">
                       <Label htmlFor={`variant-price-${index}`} className="text-xs">Harga Jual</Label>
                       <Input id={`variant-price-${index}`} type="number" name="price" value={variant.price} onChange={e => handleVariantChange(index, e)} required className="rounded-lg px-3 py-1.5 text-xs sm:text-sm" />
                    </div>
                     <div className="col-span-6 sm:col-span-2 space-y-1">
                       <Label htmlFor={`variant-cogs-${index}`} className="text-xs">HPP</Label>
                       <Input id={`variant-cogs-${index}`} type="number" name="cogs" value={variant.cogs} onChange={e => handleVariantChange(index, e)} required className="rounded-lg px-3 py-1.5 text-xs sm:text-sm" />
                    </div>
                    <div className={`col-span-6 sm:col-span-2 space-y-1 transition-opacity duration-300 ${variant.trackStock ? 'opacity-100' : 'opacity-50'}`}> 
                       <Label htmlFor={`variant-stock-${index}`} className="text-xs">Stok</Label>
                       <Input id={`variant-stock-${index}`} type="number" name="stock" value={variant.stock} onChange={e => handleVariantChange(index, e)} required={variant.trackStock} disabled={!variant.trackStock} className="rounded-lg px-3 py-1.5 text-xs sm:text-sm" />
                    </div>
                    <div className="col-span-6 sm:col-span-2 flex items-center space-x-2 pt-4">
                        <div className="flex flex-col space-y-1">
                            <Label htmlFor={`track-stock-${index}`} className="text-xs">Lacak Stok?</Label>
                            <Switch id={`track-stock-${index}`} checked={variant.trackStock} onCheckedChange={(checked) => handleTrackStockChange(index, checked)} />
                        </div>
                    </div>
                    <div className="absolute top-2 right-2">
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeVariant(index)} disabled={formData.variants.length <= 1} className="h-7 w-7">
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                </div>
              </div>
            ))}
             <Button type="button" variant="outline" size="sm" onClick={addVariant} className="w-full rounded-lg px-3 py-1.5 text-xs sm:text-sm">
                <PlusCircle className="mr-2 h-4 w-4" /> Tambah Varian
            </Button>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onCancel} className="rounded-lg px-4 text-xs sm:text-sm">Batal</Button>
            <Button type="submit" variant="popup">Simpan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


export default function ManageProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [orderChannels, setOrderChannels] = useState<OrderChannel[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({});
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      try {
        const [productsData, settingsData, channelsData] = await Promise.all([
          getProducts(),
          getPlatformSettings(),
          getOrderChannels()
        ]);
        setProducts(productsData);
        setPlatformSettings(settingsData);
        setOrderChannels(channelsData);

        // Extract unique categories from fetched products
        const uniqueCategories = Array.from(new Set(productsData.map(p => p.category)));
        setProductCategories(uniqueCategories.sort());

      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Gagal memuat data"
        });
      }
    }
    fetchData();
  }, [toast]);

  const handleMarkupChange = (channel: OrderChannel, value: string) => {
    const markup = Number(value);
    setPlatformSettings(prev => ({
      ...prev,
      [channel]: { markup: isNaN(markup) ? 0 : markup }
    }));
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updatePlatformSettings(platformSettings);
      toast({
        title: "Pengaturan Disimpan",
        description: "Pengaturan markup platform telah berhasil diperbarui."
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Gagal menyimpan pengaturan"
      });
    }
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleDelete = async (productId: string) => {
    try {
      await deleteProduct(productId);
      setProducts(products.filter(p => p.id !== productId));
      toast({
        title: "Sukses",
        description: "Produk berhasil dihapus"
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Gagal menghapus produk"
      });
    }
  };

  const handleSave = async (productData: Omit<Product, 'id'>) => {
    try {
      if (editingProduct) {
        const updated = await updateProduct(editingProduct.id, productData);
        setProducts(products.map(p => p.id === editingProduct.id ? updated : p));
        toast({
          title: "Sukses",
          description: "Produk berhasil diperbarui"
        });
      } else {
        const newProduct = await addProduct(productData);
        setProducts([...products, newProduct]);
        toast({
          title: "Sukses",
          description: "Produk berhasil ditambahkan"
        });
      }
      setIsFormOpen(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Error saving product:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Gagal menyimpan produk"
      });
    }
  };

  const filteredProducts = products.filter(product => {
    const matchCategory = selectedCategory === "all" || product.category === selectedCategory;
    const matchSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-1 mt-4 mb-2 px-2 sm:px-4">
        <div className="flex items-center justify-center gap-2">
          <ShoppingBag className="w-7 h-7 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold font-headline">Manajemen Produk</h1>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground text-center">Kelola data produk, kategori, varian, dan stok.</p>
      </div>
      {/* Tombol Atur Markup dan Tambah Produk, proporsional */}
      <div className="flex items-center justify-between px-2 sm:px-4 mb-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2 text-xs sm:text-sm rounded-lg px-4 py-2">
              <Settings className="h-4 w-4 text-primary" /> Atur Markup
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg w-full p-4 sm:p-6 rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" /> Pengaturan Markup Platform
              </DialogTitle>
            </DialogHeader>
            <Card className="bg-[#F5F8FF] rounded-xl !border-0 border-0 !shadow-none shadow-none p-2 sm:p-4 md:p-6">
              <CardDescription className="text-xs sm:text-sm text-muted-foreground mb-2">Atur persentase kenaikan harga untuk setiap platform online. Harga akhir akan dihitung otomatis saat transaksi.</CardDescription>
          <form onSubmit={handleSettingsSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {orderChannels.filter(c => c !== 'store' && c !== 'others').map(channel => (
                    <div key={channel} className="flex flex-col gap-1">
                      <Label htmlFor={`markup-${channel}`} className="capitalize text-xs sm:text-sm">{channel}</Label>
                  <div className="relative">
                    <Input
                      id={`markup-${channel}`}
                      type="number"
                      value={platformSettings[channel]?.markup || ''}
                      onChange={(e) => handleMarkupChange(channel, e.target.value)}
                      placeholder="e.g. 20"
                          className="pr-8 rounded-lg shadow bg-white text-xs sm:text-sm"
                    />
                    <Percent className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
                  <Button type="submit" variant="popup">Simpan Markup</Button>
            </div>
          </form>
      </Card>
          </DialogContent>
        </Dialog>
        <Button onClick={handleAddNew} className="bg-primary text-white hover:bg-primary/90 rounded-lg px-4 py-2 text-xs sm:text-sm flex items-center gap-2">
          <PlusCircle className="h-4 w-4" />
          Tambah Produk
        </Button>
      </div>
      {/* Filter/Search Section */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-2 sm:px-4 pb-2 -mx-2 mb-2">
        <Input
          placeholder="Cari nama produk..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="rounded-lg shadow bg-white px-3 py-2 w-full md:w-auto max-w-sm text-xs sm:text-sm"
        />
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="min-w-[120px] max-w-[180px] text-xs sm:text-sm">
            <SelectValue placeholder="Pilih Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {productCategories.map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* Tabel Produk Section */}
      <Card className="rounded-xl !border-0 border-0 !shadow-none shadow-none p-2 sm:p-4 md:p-6">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="text-xs">
              <TableHeader className="sticky top-0 z-10 bg-[#F5F8FF]">
                <TableRow>
                  <TableHead className="py-2 px-2 font-semibold text-xs">Gambar</TableHead>
                  <TableHead className="py-2 px-2 font-semibold text-xs">Nama</TableHead>
                  <TableHead className="py-2 px-2 font-semibold text-xs">Kategori</TableHead>
                  <TableHead className="py-2 px-2 font-semibold text-xs">Varian</TableHead>
                  <TableHead className="py-2 px-2 font-semibold text-xs">Harga</TableHead>
                  <TableHead className="py-2 px-2 font-semibold text-xs">Stok</TableHead>
                  <TableHead className="py-2 px-2 font-semibold text-xs text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product, idx) => (
                  <TableRow key={product.id} className={cn("transition-colors", idx % 2 === 0 ? "bg-white" : "bg-[#F5F8FF]") + " hover:bg-primary/5"}>
                    <TableCell className="py-2 px-2 text-xs">
                      <Image src={product.imageUrl} alt={product.name} width={40} height={40} className="rounded-md object-cover" />
                    </TableCell>
                    <TableCell className="py-2 px-2 font-medium text-xs">{product.name}</TableCell>
                    <TableCell className="py-2 px-2 text-xs">{product.category}</TableCell>
                    <TableCell className="py-2 px-2 text-xs">
                      {product.variants.map(v => v.name).join(", ")}
                    </TableCell>
                    <TableCell className="py-2 px-2 text-xs">
                      {product.variants.map(v => `Rp${v.price.toLocaleString('id-ID')}`).join(", ")}
                    </TableCell>
                    <TableCell className="py-2 px-2 text-xs">
                      {product.variants.map((v, i) => (
                        <span key={v.id} className="inline-flex items-center">
                          {v.trackStock ? v.stock : <Infinity className="inline h-4 w-4 text-muted-foreground" />}
                          {i < product.variants.length - 1 && <span className="mx-1 text-muted-foreground">,</span>}
                        </span>
                      ))}
                    </TableCell>
                    <TableCell className="py-2 px-2 text-right text-xs">
                      <Button size="icon" variant="ghost" className="text-accent" onClick={() => handleEdit(product)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(product.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
        {/* Pengaturan Markup Platform dalam Accordion */}
        {/* Removed Accordion as per edit hint */}
      {/* Dialog/form produk dan komponen lain tetap, hanya sesuaikan style jika perlu */}
      {isFormOpen && <ProductForm product={editingProduct} onSave={handleSave} onCancel={() => setIsFormOpen(false)} productCategories={productCategories} />}
    </div>
  );
}
