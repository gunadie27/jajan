
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { User } from "@/lib/types";
import { verifyUserPassword } from "@/services/data-service";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const verifyAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedUserString = localStorage.getItem("user");
      if (storedUserString) {
        const storedUser = JSON.parse(storedUserString);
        console.log(`[DEBUG] Stored user from localStorage:`, storedUser);
        setUser(storedUser);
        if(pathname === "/"){
            router.push("/dashboard");
        }
      } else {
        setUser(null);
        if (pathname !== "/") {
          router.push("/");
        }
      }
    } catch (error) {
      console.error("Auth verification failed", error);
      localStorage.removeItem("user");
      setUser(null);
      if (pathname !== "/") {
        router.push("/");
      }
    } finally {
      setIsLoading(false);
    }
  }, [router, pathname]);


  useEffect(() => {
    verifyAuth();
  }, [pathname]); // Rerun verification when path changes

  const login = async (username: string, password: string): Promise<User | null> => {
      const user = await verifyUserPassword(username, password);

      if (user) {
          const userToStore = { ...user };
          // @ts-ignore
          delete userToStore.password; // Ensure password is not stored
          localStorage.setItem("user", JSON.stringify(userToStore));
          setUser(userToStore);
          router.push("/dashboard");
          return userToStore;
      }
      
      return null;
  }

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
    router.push("/");
  };

  return { user, isLoading, login, logout };
}
