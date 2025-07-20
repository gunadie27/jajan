
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLogo } from "@/components/app-logo";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useTheme } from "next-themes";
import { Loader2 } from "lucide-react";


export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("owner");
  const [password, setPassword] = useState("password");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { theme, setTheme } = useTheme ? useTheme() : { theme: "light", setTheme: () => {} };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoggingIn(true);

    try {
        const user = await login(username, password);

        if (user) {
          toast({
            title: "Login Berhasil!",
            description: `Selamat datang kembali, ${user?.username || ''}.`,
          });
        } else {
          setError("Username atau password yang Anda masukkan salah.");
        }
    } catch (e) {
        console.error(e);
        setError("Terjadi kesalahan pada server. Silakan coba lagi.");
    } finally {
        setIsLoggingIn(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-white to-purple-100 p-4 relative">
      <Card className="w-full max-w-sm rounded-2xl border-0 shadow-xl bg-white/95 dark:bg-background/90 p-8 backdrop-blur-md">
        <CardHeader className="text-center border-0 p-0 mb-10">
          <div className="mx-auto mb-8">
            <AppLogo size="lg" />
          </div>
          <CardTitle className="font-headline text-2xl font-bold mb-3 tracking-tight text-primary drop-shadow">Selamat Datang di Maujajan POS</CardTitle>
          <CardDescription className="text-base text-muted-foreground mb-2">Masukkan username dan password Anda untuk masuk.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-2">
              <Label htmlFor="username" className="font-medium text-primary">Username</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary/80" />
                <Input
                  id="username"
                  type="text"
                  placeholder="owner"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                  className="pl-10 rounded-lg shadow bg-white dark:bg-background py-3 text-base"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-medium text-primary">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary/80" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Gunakan: 'password'"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 pr-10 rounded-lg shadow bg-white dark:bg-background py-3 text-base"
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 text-primary/60 hover:bg-transparent"
                  onClick={() => setShowPassword(prev => !prev)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="sr-only">{showPassword ? 'Sembunyikan password' : 'Tampilkan password'}</span>
                </Button>
              </div>
              <div className="flex items-center justify-between mt-1">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox id="rememberMe" checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked === true)} />
                  Ingat saya
                </label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline font-medium"
                  onClick={() => toast({ title: "Fitur belum tersedia", description: "Silakan hubungi admin untuk reset password." })}
                >
                  Lupa password?
                </button>
              </div>
            </div>
            {error && (
              <Alert variant="destructive" className="rounded-lg animate-shake mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button
              type="submit"
              size="lg"
              variant="popup"
              className="w-full rounded-lg py-3 text-lg font-bold flex items-center justify-center gap-2 shadow-md"
              disabled={isLoggingIn}
            >
              {isLoggingIn && <Loader2 className="animate-spin h-5 w-5" />}
              {isLoggingIn ? 'Sedang masuk...' : 'Masuk'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
