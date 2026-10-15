'use client';

import React from 'react';
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
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Products & Pricing', href: '/products', icon: ShoppingBag },
  { name: 'Users & Wallets', href: '/users', icon: Users },
  { name: 'Order History', href: '/orders', icon: Receipt },
  { name: 'Bot Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

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
              <span className="font-bold text-base tracking-wide text-foreground">DIGIX</span>
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
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info & Quick Link */}
      <div className="pt-4 border-t">
        <div className="p-3 rounded-lg border bg-secondary/40 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Firebase Connected
            </span>
            <Sparkles className="w-3 h-3 text-primary" />
          </div>
          <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
            Realtime sync with Telegram Bot and Firestore active.
          </p>
        </div>
      </div>
    </aside>
  );
}
