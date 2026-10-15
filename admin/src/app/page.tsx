'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, limit, orderBy } from 'firebase/firestore';
import { 
  Users, 
  ShoppingBag, 
  Receipt, 
  DollarSign, 
  ArrowUpRight, 
  Bot, 
  PlusCircle, 
  Radio,
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [botConfig, setBotConfig] = useState<any>({
    shopName: 'Warzone Shop',
    channelId: '@WarzoneShop',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Listen to Users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setStats((prev) => ({ ...prev, totalUsers: snapshot.size }));
    });

    // 2. Listen to Products
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setStats((prev) => ({ ...prev, totalProducts: snapshot.size }));
    });

    // 3. Listen to Orders
    const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(5));
    const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
      let revenue = 0;
      const ordersList: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        ordersList.push({ id: doc.id, ...data });
        revenue += Number(data.price || 0);
      });
      setStats((prev) => ({ ...prev, totalOrders: snapshot.size, totalRevenue: revenue }));
      setRecentOrders(ordersList);
      setLoading(false);
    });

    // 4. Listen to Bot Config
    const unsubConfig = onSnapshot(collection(db, 'settings'), (snapshot) => {
      snapshot.forEach((doc) => {
        if (doc.id === 'bot_config') {
          setBotConfig(doc.data());
        }
      });
    });

    return () => {
      unsubUsers();
      unsubProducts();
      unsubOrders();
      unsubConfig();
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold tracking-tight text-white">Dashboard Overview</h1>
            <Badge variant="success" className="gap-1.5 py-0 px-2 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Sync
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Storefront: <b className="text-foreground">{botConfig.shopName}</b> · Channel: <code className="text-primary font-mono">{botConfig.channelId}</code>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/products">
            <Button size="sm" variant="default" className="gap-1.5 font-semibold">
              <PlusCircle className="w-4 h-4" />
              Add Product
            </Button>
          </Link>
          <Link href="/settings">
            <Button size="sm" variant="outline" className="gap-1.5">
              <Bot className="w-4 h-4 text-muted-foreground" />
              Bot Config
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid with Shadcn Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              Total Revenue
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">
              ${stats.totalRevenue.toFixed(2)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-primary font-semibold">Realtime</span> from bot orders
            </p>
          </CardContent>
        </Card>

        {/* Metric 2 */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              Active Products
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">
              {stats.totalProducts}
            </div>
            <Link href="/products" className="text-[11px] text-blue-400 hover:underline mt-1 inline-flex items-center gap-1">
              View Catalog <ArrowUpRight className="w-3 h-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Metric 3 */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              Registered Users
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Users className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">
              {stats.totalUsers}
            </div>
            <Link href="/users" className="text-[11px] text-purple-400 hover:underline mt-1 inline-flex items-center gap-1">
              Manage Wallets <ArrowUpRight className="w-3 h-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Metric 4 */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              Total Purchases
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Receipt className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">
              {stats.totalOrders}
            </div>
            <Link href="/orders" className="text-[11px] text-amber-400 hover:underline mt-1 inline-flex items-center gap-1">
              View Order Logs <ArrowUpRight className="w-3 h-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Orders & Bot Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders List with Shadcn Card & Table */}
        <Card className="lg:col-span-2 glass-panel">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-sm font-bold">Recent Completed Orders</CardTitle>
              <CardDescription>Live stream of products bought in Telegram</CardDescription>
            </div>
            <Link href="/orders">
              <Button variant="ghost" size="sm" className="text-xs text-primary gap-1">
                View All <ArrowUpRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>

          <CardContent className="p-0">
            {recentOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-xs">
                No orders registered yet. New customer purchases will stream here instantly!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium text-white">
                        {order.userName || 'Member'} <span className="text-[11px] text-muted-foreground font-mono">({order.userId})</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{order.productName}</TableCell>
                      <TableCell className="font-mono text-primary font-semibold">
                        ${Number(order.price).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="success" className="text-[10px]">
                          {order.status || 'completed'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Bot Quick Health & Actions */}
        <Card className="glass-panel">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              Bot Status & Verification
            </CardTitle>
            <CardDescription>
              Render Web Service & Telegram Webhook
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-xs">
            <div className="p-3 rounded-lg border bg-secondary/50 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Force Join:</span>
                <span className="font-mono text-primary font-semibold">{botConfig.channelId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Store Name:</span>
                <span className="text-foreground font-medium">{botConfig.shopName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Firebase Project:</span>
                <span className="text-muted-foreground font-mono">nurms-bot</span>
              </div>
            </div>

            <div className="space-y-2">
              <Link href="/products" className="w-full block">
                <Button variant="default" size="sm" className="w-full justify-between font-semibold">
                  Manage Products & Inventory
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/settings" className="w-full block">
                <Button variant="outline" size="sm" className="w-full justify-between">
                  Edit Channel & Bot Settings
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
