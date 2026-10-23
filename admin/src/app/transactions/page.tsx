'use client';

import React, { useEffect, useState } from 'react';
import { rtdb } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { 
  ArrowLeftRight, 
  Search, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Copy, 
  Check, 
  RadioTower, 
  DollarSign, 
  Wallet, 
  ShoppingBag, 
  Coins, 
  Receipt 
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

interface Transaction {
  id: string;
  type: 'deposit' | 'purchase';
  userId: string;
  userName?: string;
  amount: number;
  gateway?: string;
  txId?: string;
  orderId?: string;
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  balanceAfter?: number;
  note?: string;
  createdAt?: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'deposit' | 'purchase'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const txRef = ref(rtdb, 'transactions');
    const unsub = onValue(txRef, (snapshot) => {
      const list: Transaction[] = [];
      if (snapshot.exists()) {
        const val = snapshot.val();
        for (const [key, item] of Object.entries(val)) {
          list.push({ id: key, ...(item as any) });
        }
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      }
      setTransactions(list);
      setLoading(false);
    }, (err) => {
      console.error('Transactions load error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filtered = transactions.filter((t) => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    const query = search.toLowerCase();
    const userName = (t.userName || '').toLowerCase();
    const userId = (t.userId || '').toLowerCase();
    const orderId = (t.orderId || '').toLowerCase();
    const txId = (t.txId || '').toLowerCase();
    const note = (t.note || '').toLowerCase();
    const gateway = (t.gateway || '').toLowerCase();
    const prodName = (t.productName || '').toLowerCase();

    return userName.includes(query) || 
      userId.includes(query) || 
      orderId.includes(query) || 
      txId.includes(query) || 
      note.includes(query) || 
      gateway.includes(query) || 
      prodName.includes(query);
  });

  // Calculate Metrics
  const totalDeposits = transactions
    .filter((t) => t.type === 'deposit')
    .reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);

  const totalPurchases = transactions
    .filter((t) => t.type === 'purchase')
    .reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);

  const totalVolume = totalDeposits + totalPurchases;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-primary" />
            Financial Ledger & Wallet Transactions
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Realtime double-entry audit of all wallet deposits, crypto inflows, and product purchases.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
          <Input
            placeholder="Search by User, Order ID, or TxID..."
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
            <ArrowDownLeft className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total Deposits</p>
            <p className="text-xl font-bold text-emerald-400 tracking-tight">+${totalDeposits.toFixed(2)}</p>
          </div>
        </Card>

        <Card className="glass-panel border p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Product Purchases</p>
            <p className="text-xl font-bold text-rose-400 tracking-tight">-${totalPurchases.toFixed(2)}</p>
          </div>
        </Card>

        <Card className="glass-panel border p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total Platform Volume</p>
            <p className="text-xl font-bold text-white tracking-tight">${totalVolume.toFixed(2)}</p>
          </div>
        </Card>

        <Card className="glass-panel border p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total Ledger Entries</p>
            <p className="text-xl font-bold text-white tracking-tight">{transactions.length}</p>
          </div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <Button
          variant={filterType === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('all')}
          className="text-xs h-8"
        >
          All ({transactions.length})
        </Button>
        <Button
          variant={filterType === 'deposit' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('deposit')}
          className="text-xs h-8 text-emerald-400"
        >
          🟢 Deposits Only ({transactions.filter((t) => t.type === 'deposit').length})
        </Button>
        <Button
          variant={filterType === 'purchase' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('purchase')}
          className="text-xs h-8 text-rose-400"
        >
          🔴 Purchases Only ({transactions.filter((t) => t.type === 'purchase').length})
        </Button>
      </div>

      {/* Transactions Table */}
      <Card className="glass-panel overflow-hidden border">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
            <RadioTower className="w-4 h-4 animate-spin text-primary" />
            Synchronizing financial ledger from Realtime Database...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">No transactions found</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              When users deposit crypto or purchase digital products in the Telegram bot, every financial movement is audited here.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Details / Reference</TableHead>
                <TableHead>Balance After</TableHead>
                <TableHead className="text-right">Date & Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tx) => {
                const isDeposit = tx.type === 'deposit';
                const amountVal = Math.abs(Number(tx.amount || 0));
                const refCode = tx.orderId || tx.txId || tx.id;

                return (
                  <TableRow key={tx.id}>
                    {/* Type Badge */}
                    <TableCell>
                      {isDeposit ? (
                        <Badge variant="outline" className="text-[11px] gap-1 text-emerald-400 bg-emerald-500/10 border-emerald-500/30">
                          <ArrowDownLeft className="w-3 h-3" /> Deposit
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[11px] gap-1 text-rose-400 bg-rose-500/10 border-rose-500/30">
                          <ArrowUpRight className="w-3 h-3" /> Purchase
                        </Badge>
                      )}
                    </TableCell>

                    {/* Customer */}
                    <TableCell>
                      <div className="font-semibold text-white text-sm">{tx.userName || 'Member'}</div>
                      <div className="text-xs font-mono text-muted-foreground">ID: {tx.userId}</div>
                    </TableCell>

                    {/* Amount */}
                    <TableCell>
                      <span className={`font-mono font-bold text-sm ${isDeposit ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isDeposit ? `+$${amountVal.toFixed(2)}` : `-$${amountVal.toFixed(2)}`}
                      </span>
                    </TableCell>

                    {/* Reference / Details */}
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="text-xs text-foreground font-medium">
                          {tx.note || (isDeposit ? `Deposit via ${tx.gateway || 'Gateway'}` : `Purchase: ${tx.productName || 'Product'}`)}
                        </div>
                        {refCode && (
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                            <span className="truncate max-w-[200px]">{refCode}</span>
                            <button
                              onClick={() => handleCopy(`ref_${tx.id}`, refCode)}
                              className="text-muted-foreground hover:text-white shrink-0 p-0.5"
                              title="Copy Reference"
                            >
                              {copiedKey === `ref_${tx.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Balance After */}
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">
                        {tx.balanceAfter !== undefined ? `$${Number(tx.balanceAfter).toFixed(2)}` : '—'}
                      </span>
                    </TableCell>

                    {/* Date */}
                    <TableCell className="text-right text-xs text-muted-foreground font-mono">
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : 'N/A'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
