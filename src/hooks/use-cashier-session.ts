import { useState, useEffect } from 'react';
import { getCashierSessions } from '@/services/data-service';
import { useAuth } from './use-auth';
import type { CashierSession } from '@/lib/types';

export function useCashierSession() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<CashierSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSessions = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const outletId = user.role === 'cashier' && user.outletId ? user.outletId : undefined;
      const fetchedSessions = await getCashierSessions(outletId);
      setSessions(fetchedSessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [user]);

  // Refresh sessions setiap 5 detik untuk real-time updates
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      fetchSessions();
    }, 5000);

    return () => clearInterval(interval);
  }, [user]);

  // Cek apakah ada sesi aktif untuk kasir
  const hasActiveSession = user?.role === 'cashier' && sessions.some(s => s.status === 'active');
  
  // Cek apakah ada sesi aktif untuk outlet tertentu
  const hasActiveSessionForOutlet = (outletId: string) => {
    return sessions.some(s => s.status === 'active' && s.outletId === outletId);
  };

  // Dapatkan sesi aktif
  const activeSession = sessions.find(s => s.status === 'active');

  return {
    sessions,
    isLoading,
    hasActiveSession,
    hasActiveSessionForOutlet,
    activeSession,
    refreshSessions: fetchSessions
  };
} 