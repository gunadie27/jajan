"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarNav, SidebarNavItem } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { AppLogo } from "@/components/app-logo";
import { ExpenseDialog } from "@/components/expense-dialog";
import { PanelLeft, LayoutGrid, Wallet, AreaChart, ShoppingBag, Users, Building, LogOut, List, History, TrendingDown, Contact, Box, BarChart3, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function UserNav({ logout, user }: { logout: () => void; user: { name: string, email: string, role: string } | null }) {
  if (!user) return null;

  return (
    <div className="flex flex-col items-center gap-1 pb-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full border-2 border-primary/70 dark:border-white hover:shadow-lg transition-all">
            <Avatar className="h-9 w-9">
              <AvatarImage src="/avatars/01.png" alt={user.name} />
              <AvatarFallback className="text-primary dark:text-white bg-background">{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none capitalize text-primary dark:text-white">{user.name}</p>
              <p className="text-xs leading-none text-foreground dark:text-white">{user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="text-destructive font-semibold">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Keluar</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <span className="text-xs text-white mt-1">Akun</span>
    </div>
  );
}

function LogoLink() {
    return (
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <AppLogo size="sm" />
            <span>Maujajan POS</span>
        </Link>
    )
}

function MainNav({ userRole, closeSheet }: { userRole: string, closeSheet?: () => void }) {
    const pathname = usePathname();
    const [isExpenseDialogOpen, setIsExpenseDialogOpen] = React.useState(false);

    const handleOpenExpenseDialog = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsExpenseDialogOpen(true);
        // closeSheet?.(); // Dihapus agar modal tidak langsung hilang di mobile
    }

    const isActive = (path: string) => pathname.startsWith(path);
    const isOwner = userRole === 'owner';
    const isCashier = userRole === 'cashier';

    return (
        <>
            <SidebarNav>
                <SidebarNavItem href="/dashboard" active={pathname === '/dashboard'} onClick={closeSheet}>
                    <LayoutGrid className="h-4 w-4" />
                    Dashboard
                </SidebarNavItem>
                {isCashier && (
                    <SidebarNavItem href="/cash-drawer" active={isActive('/cash-drawer')} onClick={closeSheet}>
                        <Box className="h-4 w-4" />
                        Buka/Tutup Kasir
                    </SidebarNavItem>
                )}
                <SidebarNavItem href="/pos" active={isActive('/pos')} onClick={closeSheet}>
                    <ShoppingBag className="h-4 w-4" />
                    Transaksi (POS)
                </SidebarNavItem>
                <SidebarNavItem href="#" onClick={handleOpenExpenseDialog}>
                    <TrendingDown className="h-4 w-4" />
                    Pengeluaran
                </SidebarNavItem>

                {isOwner && (
                    <>
                        <div className="px-3 py-2">
                            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Laporan</h2>
                            <SidebarNavItem href="/laporapenjualan" active={isActive('/laporapenjualan')} onClick={closeSheet}>
                                <AreaChart className="h-4 w-4" />
                                Penjualan
                            </SidebarNavItem>
                            <SidebarNavItem href="/laporanlabarugi" active={isActive('/laporanlabarugi')} onClick={closeSheet}>
                                <Wallet className="h-4 w-4" />
                                Laba/Rugi
                            </SidebarNavItem>
                        </div>
                        <div className="px-3 py-2">
                            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Riwayat</h2>
                            <SidebarNavItem href="/riwayattransaksi" active={isActive('/riwayattransaksi')} onClick={closeSheet}>
                                <History className="h-4 w-4" />
                                Transaksi
                            </SidebarNavItem>
                            <SidebarNavItem href="/riwayatpengeluaran" active={isActive('/riwayatpengeluaran')} onClick={closeSheet}>
                                <List className="h-4 w-4" />
                                Pengeluaran
                            </SidebarNavItem>
                        </div>
                        <div className="px-3 py-2">
                            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Manajemen</h2>
                            <SidebarNavItem href="/manajemenpelanggan" active={isActive('/manajemenpelanggan')} onClick={closeSheet}>
                                <Contact className="h-4 w-4" />
                                Pelanggan
                            </SidebarNavItem>
                            <SidebarNavItem href="/manajemenproduk" active={isActive('/manajemenproduk')} onClick={closeSheet}>
                                <ShoppingBag className="h-4 w-4" />
                                Produk
                            </SidebarNavItem>
                            <SidebarNavItem href="/manajemenoutlet" active={isActive('/manajemenoutlet')} onClick={closeSheet}>
                                <Building className="h-4 w-4" />
                                Outlet
                            </SidebarNavItem>
                            <SidebarNavItem href="/manajemenpengguna" active={isActive('/manajemenpengguna')} onClick={closeSheet}>
                                <Users className="h-4 w-4" />
                                Pengguna
                            </SidebarNavItem>
                        </div>
                    </>
                )}
            </SidebarNav>
            {pathname !== "/history/expenses" && (
              <ExpenseDialog 
                  isOpen={isExpenseDialogOpen} 
                  onOpenChange={setIsExpenseDialogOpen} 
                  expense={null} 
                  onSaveSuccess={() => {}}
              />
            )}
        </>
    );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen w-full">
      <aside className="hidden md:block fixed left-0 top-0 z-20 h-screen w-72 border-r bg-background">
        <Sidebar className="flex flex-col h-full">
            <SidebarHeader>
                <LogoLink />
            </SidebarHeader>
            <SidebarContent className="flex-1 min-h-0 overflow-y-auto">
                <MainNav userRole={user.role} />
            </SidebarContent>
            <SidebarFooter className="shrink-0">
                <UserNav logout={logout} user={user} />
                {/* Theme toggle dihapus */}
            </SidebarFooter>
        </Sidebar>
      </aside>

      <div className="md:ml-72">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 bg-gradient-to-r from-primary via-blue-500 to-purple-500 shadow-lg px-6 py-4 md:hidden">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                    <Button size="icon" variant="ghost" className="sm:hidden text-white hover:bg-primary/80">
                        <PanelLeft className="h-6 w-6" />
                        <span className="sr-only">Toggle Menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                    <SheetTitle className="sr-only">Menu</SheetTitle>
                    <Sidebar>
                        <SidebarHeader>
                            <LogoLink />
                        </SidebarHeader>
                        <SidebarContent>
                            <MainNav userRole={user.role} closeSheet={() => setIsSheetOpen(false)} />
                        </SidebarContent>
                        <SidebarFooter className="shrink-0">
                          <UserNav logout={logout} user={user} />
                          {/* Theme toggle dihapus */}
                        </SidebarFooter>
                    </Sidebar>
                </SheetContent>
            </Sheet>
            <div className="flex-1 flex justify-start items-center gap-1 pl-2">
              <AppLogo size="md" className="drop-shadow-lg" />
              <span className="font-headline text-xl font-bold text-white drop-shadow-sm tracking-tight">Maujajan POS</span>
            </div>
            {/* Avatar user di header dihapus agar lebih clean */}
        </header>
        <div className="h-1 w-full bg-gradient-to-r from-primary via-blue-400 to-purple-400" />

        <main className="px-2 sm:px-4 md:px-6 pb-20 md:pb-6">
          <Card className="p-2 sm:p-4 md:p-6">
              {children}
            </Card>
        </main>
        {/* Bottom Navigation Bar (Mobile Only) */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white dark:bg-background border-t border-border shadow-md flex justify-around items-center h-14 transition-all duration-300" >
          <BottomNavLink href="/dashboard" icon={<LayoutGrid className="h-6 w-6" />} label="Dashboard" />
          {/* Tidak ada laporan di navbar bawah */}
          {/* POS menu bulat besar di tengah */}
          <div className="relative flex-1 flex justify-center items-end" style={{zIndex:2}}>
            <a
              href="/pos"
              className={`absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center w-16 h-16 rounded-full shadow-xl border-4 border-white dark:border-background bg-gradient-to-br from-primary via-blue-500 to-purple-500 transition-all duration-200 ${usePathname() === '/pos' ? 'scale-110' : 'scale-100'} ${usePathname() === '/pos' ? 'ring-4 ring-primary/30' : ''}`}
              style={{boxShadow:'0 4px 24px 0 rgba(31,38,135,0.18)'}}
            >
              <ShoppingBag className="h-8 w-8 text-white drop-shadow" />
              <span className="mt-1 text-xs font-bold text-white drop-shadow-sm">POS</span>
            </a>
          </div>
          {/* Menu kanan: owner = pengaturan, kasir = bulatan icon roda gigi untuk user info */}
          {user?.role === 'owner' ? (
            <BottomNavLink href="/manajemenpengguna" icon={<Settings className="h-6 w-6" />} label="Pengaturan" />
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex flex-col items-center justify-center flex-1 min-w-14 h-full px-0 py-1 transition-all duration-200 relative focus:outline-none">
                  <span className="relative flex items-center justify-center h-8 w-8">
                    <span className="rounded-full border-2 border-primary/70 dark:border-white bg-background dark:bg-background flex items-center justify-center w-8 h-8">
                      <Settings className="h-6 w-6 text-primary dark:text-white" />
                    </span>
                  </span>
                  <span className="mt-0.5 text-xs font-semibold text-primary">Akun</span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" side="top" className="w-64 p-4 rounded-xl shadow-xl border-0 bg-gradient-to-br from-blue-50 via-white to-purple-100">
                <div className="flex flex-col items-center gap-2">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src="/avatars/01.png" alt={user.name} />
                    <AvatarFallback className="text-primary dark:text-white bg-background">{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <p className="text-base font-bold leading-none capitalize text-primary dark:text-white">{user.name}</p>
                    <p className="text-xs leading-none text-foreground dark:text-white">{user.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold capitalize">{user.role}</span>
                  </div>
                  <button onClick={logout} className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-destructive text-white font-semibold shadow hover:bg-destructive/90 transition-all">
                    <LogOut className="h-4 w-4" /> Keluar
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </nav>
      </div>
    </div>
  );
}

// Update BottomNavLink for better spacing, accent, and font
function BottomNavLink({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
  return (
    <a
      href={href}
      className={`flex flex-col items-center justify-center flex-1 min-w-14 h-full px-0 py-1 transition-all duration-200 relative ${isActive ? "text-primary" : "text-muted-foreground hover:bg-primary/5"}`}
    >
      <span className="relative flex items-center justify-center h-8 w-8">
        {isActive && (
          <span className="absolute inset-0 rounded-full bg-primary/10" />
        )}
        <span className={`transition-all duration-200 z-10 ${isActive ? "scale-110" : "scale-100"}`}>{icon}</span>
      </span>
      <span className={`mt-0.5 text-xs font-semibold transition-all duration-200 ${isActive ? "text-primary font-bold" : "text-muted-foreground font-medium"}`}>{label}</span>
    </a>
  );
}