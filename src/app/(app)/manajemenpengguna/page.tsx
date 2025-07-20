
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MoreHorizontal, PlusCircle, Users, Eye, EyeOff, Trash2 } from "lucide-react"
import type { User, Outlet } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { getOutlets, getUsers, addUser, updateUser, deleteUser } from "@/services/data-service"
import { useAuth } from "@/hooks/use-auth";

const initialUserFormState: Omit<User, 'id'> = {
  name: '',
  username: '',
  email: '',
  password: '',
  role: 'cashier',
  outletId: '',
};

function UserForm({
  user,
  allOutlets,
  onSave,
  onCancel,
}: {
  user: Omit<User, 'id'> | null;
  allOutlets: Outlet[];
  onSave: (user: Omit<User, 'id'>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState(user ? { ...user, password: '' } : initialUserFormState);
  const isEditing = user !== null;
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: 'role' | 'outletId') => (value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent
        className="max-w-[95vw] sm:max-w-[360px] w-full p-3 sm:p-5 rounded-2xl border-0 shadow-xl bg-gradient-to-br from-blue-50 via-white to-purple-100 !overflow-visible"
        style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)' }}
      >
        <DialogHeader>
          <DialogTitle className="font-headline text-lg sm:text-xl font-bold text-primary drop-shadow-sm">
            {user ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            Masukkan detail pengguna dan tetapkan peran serta outletnya.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 py-1 text-xs sm:text-sm">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs sm:text-sm">Nama Lengkap</Label>
            <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required className="rounded-lg px-3 py-1.5 text-xs sm:text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-xs sm:text-sm">Username</Label>
            <Input id="username" name="username" value={formData.username} onChange={handleInputChange} required className="rounded-lg px-3 py-1.5 text-xs sm:text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs sm:text-sm">Email</Label>
            <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} required className="rounded-lg px-3 py-1.5 text-xs sm:text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs sm:text-sm">Password</Label>
            <div className="relative">
              <Input 
                id="password" 
                name="password" 
                type={showPassword ? "text" : "password"} 
                value={formData.password} 
                onChange={handleInputChange} 
                placeholder={isEditing ? 'Biarkan kosong jika tidak berubah' : 'Password wajib diisi'}
                required={!isEditing} 
                className="pr-9 rounded-lg px-3 py-1.5 text-xs sm:text-sm"
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:bg-transparent"
                onClick={() => setShowPassword(prev => !prev)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="sr-only">{showPassword ? 'Sembunyikan password' : 'Tampilkan password'}</span>
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role" className="text-xs sm:text-sm">Peran</Label>
            <Select name="role" value={formData.role} onValueChange={handleSelectChange('role')} required>
                <SelectTrigger id="role" className="rounded-lg px-3 py-1.5 text-xs sm:text-sm">
                    <SelectValue placeholder="Pilih peran" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="cashier">Kasir</SelectItem>
                </SelectContent>
            </Select>
          </div>
          {formData.role === 'cashier' && (
            <div className="space-y-1.5">
                <Label htmlFor="outletId" className="text-xs sm:text-sm">Outlet</Label>
                 <Select name="outletId" value={formData.outletId} onValueChange={handleSelectChange('outletId')} required>
                    <SelectTrigger id="outletId" className="rounded-lg px-3 py-1.5 text-xs sm:text-sm">
                        <SelectValue placeholder="Pilih outlet" />
                    </SelectTrigger>
                    <SelectContent>
                        {allOutlets.map((outlet) => (
                            <SelectItem key={outlet.id} value={outlet.id}>{outlet.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          )}
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onCancel} className="rounded-lg px-4 text-xs sm:text-sm">Batal</Button>
            <Button type="submit" variant="popup">Simpan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ManageUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchData() {
        const [fetchedUsers, fetchedOutlets] = await Promise.all([
            getUsers(),
            getOutlets()
        ]);
        setUsers(fetchedUsers);
        setOutlets(fetchedOutlets);
    }
    fetchData();
  }, []);

  const handleAddNew = () => {
    setEditingUser(null);
    setIsFormOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleDelete = async (userId: string) => {
    await deleteUser(userId);
    setUsers(users.filter(u => u.id !== userId));
  };

  const handleSave = async (userData: Omit<User, 'id'>) => {
    if (editingUser) {
      if (!user) {
        alert('User tidak ditemukan. Silakan login ulang.');
        return;
      }
      const updatedUser = await updateUser(editingUser.id, userData, user);
      setUsers(users.map(u => (u.id === editingUser.id ? updatedUser : u)));
    } else {
      if (!user) {
        alert('User tidak ditemukan. Silakan login ulang.');
        return;
      }
      const newUser = await addUser(userData, user);
      setUsers([...users, newUser]);
    }
    setIsFormOpen(false);
    setEditingUser(null);
  };
  
  const getOutletName = (outletId?: string) => {
      if (!outletId) return '-';
      return outlets.find(o => o.id === outletId)?.name || 'Outlet tidak ditemukan';
  }

  // Tidak perlu deteksi mobile untuk tabel, tabel akan selalu digunakan

  return (
    <div className="flex flex-col gap-6 pb-4">
      {/* Header */}
      <div className="flex flex-col gap-1 mt-4 mb-2 px-2 sm:px-4">
        <div className="flex items-center justify-center gap-2">
          <Users className="w-7 h-7 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold font-headline">Manajemen Pengguna</h1>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground text-center">Kelola data pengguna, peran, dan outlet mereka.</p>
      </div>
      {/* Tombol Tambah */}
      <div className="flex justify-end px-2 sm:px-4">
        <Button onClick={handleAddNew} className="bg-primary text-white hover:bg-primary/90 rounded-lg px-4 py-2 text-xs sm:text-sm flex items-center gap-2">
          <PlusCircle className="h-4 w-4" />
          Tambah Pengguna
        </Button>
      </div>
      <Card className="rounded-xl !border-0 border-0 !shadow-none shadow-none p-6">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="text-xs">
            <TableHeader>
                <TableRow className="bg-[#F5F8FF]">
                  <TableHead className="py-2 px-2 font-semibold text-xs">Nama</TableHead>
                  <TableHead className="py-2 px-2 font-semibold text-xs">Username</TableHead>
                  <TableHead className="py-2 px-2 font-semibold text-xs">Email</TableHead>
                  <TableHead className="py-2 px-2 font-semibold text-xs">Peran</TableHead>
                  <TableHead className="py-2 px-2 font-semibold text-xs">Outlet</TableHead>
                  <TableHead className="py-2 px-2 font-semibold text-xs text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                  <TableRow key={user.id} className="transition-colors hover:bg-[#F5F8FF]">
                    <TableCell className="py-2 px-2 font-medium text-xs">{user.name}</TableCell>
                    <TableCell className="py-2 px-2 text-xs">{user.username}</TableCell>
                    <TableCell className="py-2 px-2 text-xs">{user.email}</TableCell>
                    <TableCell className="py-2 px-2 capitalize text-xs">{user.role}</TableCell>
                    <TableCell className="py-2 px-2 text-xs">{getOutletName(user.outletId)}</TableCell>
                    <TableCell className="py-2 px-2 text-right text-xs">
                      <Button size="icon" variant="ghost" className="text-accent" onClick={() => handleEdit(user)}><Eye className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(user.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
      {/* Dialog Form User tetap ada */}
      {isFormOpen && (
        <UserForm
          user={editingUser ? { ...editingUser } : null}
          allOutlets={outlets}
          onSave={handleSave}
          onCancel={() => setIsFormOpen(false)}
        />
      )}
    </div>
  );
}
