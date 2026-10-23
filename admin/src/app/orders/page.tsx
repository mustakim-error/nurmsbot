'use client';

import React, { useEffect, useState } from 'react';
import { rtdb } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { 
  Receipt, 
  Search, 
  CheckCircle2, 
  Copy, 
  Check, 
  RadioTower, 
  DollarSign, 
  ShoppingBag, 
  Package, 
  TrendingUp, 
  Eye, 
  KeyRound 
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface Order {
  id: string;
  orderId?: string;
  userId: string;
  userName: string;
  productId?: string;
  productName: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  price?: number;
  payload?: string;
  status?: string;
  createdAt?: string;
  balanceBefore?: number;
  balanceAfter?: number;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Dialog State for viewing full credentials
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isCredentialDialogOpen, setIsCredentialDialogOpen] = useState(false);

  useEffect(() => {
    const ordersRef = ref(rtdb, 'orders');
    const unsub = onValue(ordersRef, (snapshot) => {
      const list: Order[] = [];
      if (snapshot.exists()) {
        const val = snapshot.val();
        for (const [key, item] of Object.entries(val)) {
          list.push({ id: key, ...(item as any) });
        }
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      }
      setOrders(list);
      setLoading(false);
    }, (err) => {
      console.error('Orders load error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenCredentials = (order: Order) => {
    setSelectedOrder(order);
    setIsCredentialDialogOpen(true);
  };

  const filteredOrders = orders.filter((o) => {
    const query = search.toLowerCase();
    const orderId = (o.orderId || o.id || '').toLowerCase();
    const prodName = (o.productName || '').toLowerCase();
    const userName = (o.userName || '').toLowerCase();
    const userId = (o.userId || '').toLowerCase();
    return orderId.includes(query) || prodName.includes(query) || userName.includes(query) || userId.includes(query);
  });

  // Calculate KPIs
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalPrice || o.price || 0), 0);
  const totalOrders = orders.length;
  const totalItemsSold = orders.reduce((sum, o) => sum + Number(o.quantity || 1), 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Official Order History & Deliveries
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit log of all digital store orders, unique Order IDs, quantities, and delivered credentials.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
          <Input
            placeholder="Search by Order ID, Product, or User..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-panel border p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total Revenue</p>
            <p className="text-xl font-bold text-white tracking-tight">${totalRevenue.toFixed(2)}</p>
          </div>
        </Card>

        <Card className="glass-panel border p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total Orders</p>
            <p className="text-xl font-bold text-white tracking-tight">{totalOrders}</p>
          </div>
        </Card>

        <Card className="glass-panel border p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Items Delivered</p>
            <p className="text-xl font-bold text-white tracking-tight">{totalItemsSold} pcs</p>
          </div>
        </Card>

        <Card className="glass-panel border p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Avg Order Value</p>
            <p className="text-xl font-bold text-white tracking-tight">${averageOrderValue.toFixed(2)}</p>
          </div>
        </Card>
      </div>

      {/* Orders Table Card */}
      <Card className="glass-panel overflow-hidden border">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
            <RadioTower className="w-4 h-4 animate-spin text-primary" />
            Fetching order history from Realtime Database...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
              <Receipt className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">No orders found</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              When a customer completes a purchase in the Telegram Bot, their official Order ID and receipt will appear here in real-time.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Product & Quantity</TableHead>
                <TableHead>Total Paid</TableHead>
                <TableHead>Delivered Credentials</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Date & Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((o) => {
                const formattedId = o.orderId || ('#' + o.id);
                const qty = o.quantity || 1;
                const total = Number(o.totalPrice || o.price || 0);

                return (
                  <TableRow key={o.id}>
                    {/* Order ID */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                          {formattedId}
                        </span>
                        <button
                          onClick={() => handleCopy(`id_${o.id}`, formattedId)}
                          className="text-muted-foreground hover:text-white shrink-0 p-1 rounded hover:bg-secondary/60 transition-colors"
                          title="Copy Order ID"
                        >
                          {copiedKey === `id_${o.id}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </TableCell>

                    {/* Customer */}
                    <TableCell>
                      <div className="font-semibold text-white text-sm">{o.userName || 'Member'}</div>
                      <div className="text-xs font-mono text-muted-foreground">ID: {o.userId}</div>
                    </TableCell>

                    {/* Product & Quantity */}
                    <TableCell>
                      <div className="font-medium text-foreground">{o.productName}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-blue-400 border-blue-500/30 bg-blue-500/10">
                          Qty: {qty} pcs
                        </Badge>
                        {o.unitPrice && (
                          <span className="text-[11px] text-muted-foreground">
                            @ ${Number(o.unitPrice).toFixed(2)}/pc
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Total Paid */}
                    <TableCell>
                      <div className="font-mono font-bold text-emerald-400 text-sm">
                        ${total.toFixed(2)}
                      </div>
                    </TableCell>

                    {/* Delivered Credentials */}
                    <TableCell className="max-w-[240px]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-muted-foreground truncate max-w-[140px] bg-secondary/50 px-2 py-1 rounded border border-border/50">
                          {o.payload || 'No payload recorded'}
                        </span>
                        {o.payload && (
                          <>
                            <button
                              onClick={() => handleCopy(`payload_${o.id}`, o.payload || '')}
                              className="text-muted-foreground hover:text-white shrink-0 p-1 rounded hover:bg-secondary/60 transition-colors"
                              title="Quick Copy Credentials"
                            >
                              {copiedKey === `payload_${o.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenCredentials(o)}
                              className="h-6 px-1.5 text-[10px] text-primary hover:text-white"
                              title="View Full Credentials"
                            >
                              <Eye className="w-3 h-3 mr-0.5" /> View
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge variant="success" className="text-[11px] gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        {o.status || 'completed'}
                      </Badge>
                    </TableCell>

                    {/* Date & Time */}
                    <TableCell className="text-right text-xs text-muted-foreground font-mono">
                      {o.createdAt ? new Date(o.createdAt).toLocaleString() : 'N/A'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Credential Viewer Dialog */}
      <Dialog open={isCredentialDialogOpen} onOpenChange={setIsCredentialDialogOpen}>
        {selectedOrder && (
          <DialogContent onClose={() => setIsCredentialDialogOpen(false)} className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <KeyRound className="w-5 h-5 text-primary" />
                Delivered Credentials — {selectedOrder.orderId || ('#' + selectedOrder.id)}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Product: <span className="text-white font-medium">{selectedOrder.productName}</span> • Quantity: <span className="text-white font-medium">{selectedOrder.quantity || 1} pcs</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-1 pb-1">
                <span className="truncate">Buyer: <strong className="text-white">{selectedOrder.userName}</strong> (ID: {selectedOrder.userId})</span>
                <span className="shrink-0">Amount: <strong className="text-emerald-400 font-mono">${Number(selectedOrder.totalPrice || selectedOrder.price || 0).toFixed(2)}</strong></span>
              </div>

              <div className="relative">
                <pre className="p-3 bg-black/70 border border-border/80 rounded-lg text-xs font-mono text-emerald-300 max-h-56 sm:max-h-72 overflow-y-auto whitespace-pre-wrap break-all select-all scrollbar-thin">
                  {selectedOrder.payload || 'No credentials found'}
                </pre>
              </div>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 w-full">
              <span className="text-[11px] text-muted-foreground font-mono text-center sm:text-left">
                {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString() : ''}
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCredentialDialogOpen(false)}
                  className="flex-1 sm:flex-none text-xs h-8"
                >
                  Close
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleCopy('dialog_payload', selectedOrder.payload || '')}
                  className="flex-1 sm:flex-none text-xs h-8 gap-1.5 bg-primary text-black hover:bg-primary/90 font-semibold"
                >
                  {copiedKey === 'dialog_payload' ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Credentials
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
