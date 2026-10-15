'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Receipt, Search, CheckCircle2, Clock, Copy, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

interface Order {
  id: string;
  userId: string;
  userName: string;
  productName: string;
  price: number;
  payload: string;
  status: string;
  createdAt: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as any) });
      });
      setOrders(list);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredOrders = orders.filter((o) =>
    (o.productName && o.productName.toLowerCase().includes(search.toLowerCase())) ||
    (o.userName && o.userName.toLowerCase().includes(search.toLowerCase())) ||
    (o.userId && o.userId.includes(search))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Order History & Delivery Log
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Realtime audit log of all completed and pending product sales.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
          <Input
            placeholder="Search by product or user ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Orders Table Card */}
      <Card className="glass-panel overflow-hidden border">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-xs">
            Fetching order history from Firebase...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
              <Receipt className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">No orders recorded</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              When a customer completes a purchase in the Telegram Bot, their order receipt and delivery payload will be recorded here!
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Amount Paid</TableHead>
                <TableHead>Delivered Credentials</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Date & Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <div className="font-semibold text-white text-sm">{o.userName || 'Member'}</div>
                    <div className="text-xs font-mono text-muted-foreground">ID: {o.userId}</div>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {o.productName}
                  </TableCell>
                  <TableCell className="font-mono font-bold text-primary">
                    ${Number(o.price || 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground max-w-[220px]">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{o.payload}</span>
                      {o.payload && (
                        <button
                          onClick={() => handleCopy(o.id, o.payload)}
                          className="text-muted-foreground hover:text-foreground shrink-0"
                          title="Copy payload"
                        >
                          {copiedId === o.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="success" className="text-[11px] gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      {o.status || 'completed'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground font-mono">
                    {o.createdAt ? new Date(o.createdAt).toLocaleString() : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
