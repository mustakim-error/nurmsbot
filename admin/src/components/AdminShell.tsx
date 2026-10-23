'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import { RadioTower, ShieldCheck } from 'lucide-react';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#080c14] text-white">
        <div className="flex flex-col items-center gap-3 animate-in fade-in duration-300">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
            <RadioTower className="w-6 h-6 animate-spin text-primary" />
          </div>
          <p className="text-xs font-mono text-muted-foreground tracking-wider">
            Verifying Administrator Security Session...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#080c14] text-white">
        <div className="flex flex-col items-center gap-2">
          <ShieldCheck className="w-8 h-8 text-primary" />
          <p className="text-xs text-muted-foreground font-mono">Redirecting to Secure Admin Login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto max-h-screen">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
