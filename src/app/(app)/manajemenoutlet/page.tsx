
"use client"

import { useState, useEffect } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MoreHorizontal, PlusCircle, Building } from "lucide-react"
import type { Outlet } from "@/lib/types"
import { getOutlets, addOutlet, updateOutlet, deleteOutlet } from "@/services/data-service"

const initialOutletFormState: Omit<Outlet, 'id'> = {
  name: '',
  address: '',
};

function OutletForm({
  outlet,
  onSave,
  onCancel,
}: {
  outlet: Omit<Outlet, 'id'> | null;
  onSave: (outlet: Omit<Outlet, 'id'>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState(outlet || initialOutletFormState);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[425px] p-6 rounded-xl shadow-none border-0">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">{outlet ? 'Edit Outlet' : 'Tambah Outlet Baru'}</DialogTitle>
          <DialogDescription>
            Masukkan detail untuk outlet. Klik simpan jika sudah selesai.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Outlet</Label>
            <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required className="rounded-lg px-4 py-2" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Alamat</Label>
            <Textarea id="address" name="address" value={formData.address} onChange={handleInputChange} required className="rounded-lg px-4 py-2 min-h-[80px]" />
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onCancel} className="rounded-lg px-4">Batal</Button>
            <Button type="submit" className="rounded-lg px-4">Simpan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ManageOutletsPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);

  useEffect(() => {
      async function fetchData() {
          const data = await getOutlets();
          setOutlets(data);
      }
      fetchData();
  }, []);

  const handleAddNew = () => {
    setEditingOutlet(null);
    setIsFormOpen(true);
  };

  const handleEdit = (outlet: Outlet) => {
    setEditingOutlet(outlet);
    setIsFormOpen(true);
  };

  const handleDelete = async (outletId: string) => {
    await deleteOutlet(outletId);
    setOutlets(outlets.filter(o => o.id !== outletId));
  };

  const handleSave = async (outletData: Omit<Outlet, 'id'>) => {
    if (editingOutlet) {
      const updated = await updateOutlet(editingOutlet.id, outletData);
      setOutlets(outlets.map(o => o.id === editingOutlet.id ? updated : o));
    } else {
      const newOutlet = await addOutlet(outletData);
      setOutlets([...outlets, newOutlet]);
    }
    setIsFormOpen(false);
    setEditingOutlet(null);
  };

  return (
    <div className="flex flex-col gap-6 pb-4">
      {/* Header */}
      <div className="flex flex-col gap-1 mt-4 mb-2 px-2 sm:px-4">
        <div className="flex items-center justify-center gap-2">
          <Building className="w-7 h-7 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold font-headline">Manajemen Outlet</h1>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground text-center">Kelola semua outlet bisnis Anda.</p>
      </div>
      {/* Tombol Tambah */}
      <div className="flex justify-end px-2 sm:px-4 mb-2">
        <Button onClick={handleAddNew} className="bg-primary text-white hover:bg-primary/90 rounded-lg px-4 py-2 text-xs sm:text-sm flex items-center gap-2">
          <PlusCircle className="h-4 w-4" />
          Tambah Outlet Baru
        </Button>
      </div>
      {/* Tabel Outlet Section */}
      <Card className="rounded-xl !border-0 border-0 !shadow-none shadow-none p-2 sm:p-4 md:p-6">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="text-xs">
              <TableHeader className="sticky top-0 z-10 bg-[#F5F8FF]">
              <TableRow>
                  <TableHead className="py-2 px-2 font-semibold text-xs">Nama Outlet</TableHead>
                  <TableHead className="py-2 px-2 font-semibold text-xs">Alamat</TableHead>
                  <TableHead className="py-2 px-2 font-semibold text-xs text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {outlets.map((outlet, idx) => (
                  <TableRow key={outlet.id} className={((idx % 2 === 0) ? "bg-white" : "bg-[#F5F8FF]") + " hover:bg-primary/5 transition-colors"}>
                    <TableCell className="py-2 px-2 font-medium text-xs">{outlet.name}</TableCell>
                    <TableCell className="py-2 px-2 text-xs">{outlet.address}</TableCell>
                    <TableCell className="py-2 px-2 text-right text-xs">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost" className="rounded-full">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleEdit(outlet)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(outlet.id)} className="text-destructive">Hapus</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
      {isFormOpen && <OutletForm outlet={editingOutlet} onSave={handleSave} onCancel={() => setIsFormOpen(false)} />}
    </div>
  );
}
