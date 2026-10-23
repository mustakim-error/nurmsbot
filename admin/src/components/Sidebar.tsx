'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Users, 
  Receipt, 
  Settings, 
  Bot, 
  Sparkles,
  ChevronRight,
  Activity,
  Zap,
  Coins,
  ArrowLeftRight,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { rtdb } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { useAuth } from '@/context/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Products & Pricing', href: '/products', icon: ShoppingBag },
  { name: 'Payment Gateways', href: '/gateways', icon: Coins },
  { name: 'Order History', href: '/orders', icon: Receipt },
  { name: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
  { name: 'Users & Wallets', href: '/users', icon: Users },
  { name: '24/7 Uptime & Cron', href: '/uptime', icon: Activity },
  { name: 'Bot Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [botOnline, setBotOnline] = useState<boolean | null>(null);
  const [pendingDeposits, setPendingDeposits] = useState<number>(0);

  useEffect(() => {
    try {
      const heartbeatRef = ref(rtdb, 'status/heartbeat');
      const unsub = onValue(heartbeatRef, (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          const isAlive = Date.now() - (val.timestamp || 0) < 90000;
          setBotOnline(isAlive);
        } else {
          setBotOnline(false);
        }
      });

      const depositsRef = ref(rtdb, 'deposits');
      const unsubDep = onValue(depositsRef, (snapshot) => {
        if (snapshot.exists()) {
          let count = 0;
          const val = snapshot.val();
          for (const item of Object.values(val) as any[]) {
            if (item?.status === 'pending') count++;
          }
          setPendingDeposits(count);
        } else {
          setPendingDeposits(0);
        }
      });

      return () => {
        unsub();
        unsubDep();
      };
    } catch {
      setBotOnline(false);
    }
  }, []);

  return (
    <aside className="w-64 border-r bg-card/40 backdrop-blur-xl min-h-screen flex flex-col justify-between p-4 sticky top-0 h-screen select-none">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-4 mb-6 border-b pb-4">
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm shadow-primary/10">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-wide text-foreground">NURMS</span>
              <Badge variant="default" className="text-[10px] px-1.5 py-0">v1.0</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground font-mono">nurms-bot • Live</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                  isActive
                    ? "bg-secondary text-foreground font-semibold border border-border shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
                  {item.name}
                </div>
                {item.href === '/gateways' && pendingDeposits > 0 && (
                  <Badge variant="destructive" className="px-1.5 py-0 text-[10px] animate-pulse">
                    {pendingDeposits}
                  </Badge>
                )}
                {item.name.includes('24/7') && (
                  <span className="flex h-2 w-2 relative">
                    {botOnline ? (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </>
                    ) : (
                      <span className="inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    )}
                  </span>
                )}
                {isActive && !item.name.includes('24/7') && item.href !== '/gateways' && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info & Admin Profile Card */}
      <div className="pt-3 border-t space-y-2.5">
        {/* Bot Live Pulse */}
        <div className="p-2 rounded-lg border bg-secondary/30 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
            <span className={cn(
              "w-2 h-2 rounded-full",
              botOnline ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-amber-500"
            )} />
            {botOnline === null ? 'Checking Bot...' : botOnline ? 'Bot Online 24/7' : 'Bot Standby'}
          </span>
          <Zap className={cn("w-3 h-3", botOnline ? "text-emerald-400" : "text-amber-400")} />
        </div>

        {/* Logged in Admin Profile & Logout */}
        <div className="p-2.5 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate max-w-[110px]" title={user?.email || 'admin@nurms.com'}>
                {user?.email?.split('@')[0] || 'Admin'}
              </p>
              <p className="text-[10px] text-emerald-400 font-mono leading-none">Super Admin</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (confirm('Log out from Admin Portal?')) {
                logout();
              }
            }}
            className="text-muted-foreground hover:text-rose-400 p-1.5 rounded hover:bg-rose-500/10 transition-colors shrink-0"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
