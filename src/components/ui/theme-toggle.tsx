"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Sync with localStorage and <html> class
    const stored = localStorage.getItem("theme");
    let initial: "light" | "dark" = "light";
    if (stored === "dark" || stored === "light") {
      initial = stored;
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      initial = "dark";
    }
    setTheme(initial);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme, mounted]);

  if (!mounted) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Sun className={`w-4 h-4 ${theme === "light" ? "text-yellow-500" : "text-muted-foreground"}`} />
      <Switch
        checked={theme === "dark"}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label="Toggle dark mode"
      />
      <Moon className={`w-4 h-4 ${theme === "dark" ? "text-blue-400" : "text-muted-foreground"}`} />
    </div>
  );
} 