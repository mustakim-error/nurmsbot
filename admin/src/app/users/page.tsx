'use client';

import React, { useEffect, useState } from 'react';
import { rtdb } from '@/lib/firebase';
import { ref, onValue, update } from 'firebase/database';
import { Users, DollarSign, Wallet, Search, ArrowUpRight, Plus, Minus, UserCheck, RadioTower, Gift, UserPlus, Sparkles, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';

interface TelegramUser {
  telegram_id: string;
  name: string;
  username?: string;
  balance: number;
  referralCount?: number;
  referralEarnings?: number;
  referredBy?: string;
  createdAt?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<TelegramUser[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<TelegramUser | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(10);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const usersRef = ref(rtdb, 'users');
    const unsub = onValue(usersRef, (snapshot) => {
      const list: TelegramUser[] = [];
      if (snapshot.exists()) {
        const val = snapshot.val();
        for (const [key, item] of Object.entries(val)) {
          list.push({ telegram_id: key, ...(item as any) });
        }
      }
      setUsers(list);
      setLoading(false);
    }, (err) => {
      console.error('Users load error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleUpdateBalance = async (isAdd: boolean) => {
    if (!selectedUser) return;
    const current = Number(selectedUser.balance || 0);
    const amount = Number(adjustAmount);
    const newBalance = isAdd ? current + amount : Math.max(0, current - amount);

    try {
      const userRef = ref(rtdb, `users/${selectedUser.telegram_id}`);
      await update(userRef, {
        balance: newBalance,
        updatedAt: new Date().toISOString(),
      });
      setSelectedUser(null);
    } catch (err: any) {
      alert(`Error updating balance: ${err.message}`);
    }
  };

  const filteredUsers = users.filter((u) => 
    (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
    (u.username && u.username.toLowerCase().includes(search.toLowerCase())) ||
    u.telegram_id.includes(search)
  );

  const totalBalance = users.reduce((acc, u) => acc + Number(u.balance || 0), 0);
  const totalReferrals = users.reduce((acc, u) => acc + Number(u.referralCount || 0), 0);
  const totalCommission = users.reduce((acc, u) => acc + Number(u.referralEarnings || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Registered Users & Wallets
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor registered members, live wallet balances, and referral earnings.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
          <Input
            placeholder="Search by ID or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-panel p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Total Members</div>
            <div className="text-lg font-bold text-white">{users.length}</div>
          </div>
        </Card>

        <Card className="glass-panel p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Total Wallet Balances</div>
            <div className="text-lg font-bold text-emerald-400">${totalBalance.toFixed(2)}</div>
          </div>
        </Card>

        <Card className="glass-panel p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Referral Joins</div>
            <div className="text-lg font-bold text-blue-400">{totalReferrals} users</div>
          </div>
        </Card>

        <Card className="glass-panel p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Commission Distributed</div>
            <div className="text-lg font-bold text-amber-400">${totalCommission.toFixed(2)}</div>
          </div>
        </Card>
      </div>

      {/* Users Table Card */}
      <Card className="glass-panel overflow-hidden border">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
            <RadioTower className="w-4 h-4 animate-spin text-primary" />
            Loading user database from Firebase...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">No users found</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Users who click <b>/start</b> in your Telegram Bot will appear here automatically in real time!
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Telegram ID</TableHead>
                <TableHead>Wallet Balance</TableHead>
                <TableHead>Referrals</TableHead>
                <TableHead>Referred By</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => (
                <TableRow key={u.telegram_id}>
                  <TableCell>
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-primary" />
                      {u.name}
                    </div>
                    {u.username && (
                      <div className="text-xs text-blue-400 font-mono">@{u.username}</div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {u.telegram_id}
                  </TableCell>
                  <TableCell className="font-mono font-bold text-primary">
                    ${Number(u.balance || 0).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                      <UserPlus className="w-3 h-3 text-muted-foreground" />
                      <span>{u.referralCount || 0}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        (${Number(u.referralEarnings || 0).toFixed(2)})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {u.referredBy ? (
                      <Badge variant="outline" className="text-[10px] font-mono text-amber-300 border-amber-500/30 bg-amber-500/10">
                        UID: {u.referredBy}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">Direct</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.createdAt ? u.createdAt.slice(0, 10) : 'Active'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      onClick={() => {
                        setSelectedUser(u);
                        setAdjustAmount(10);
                      }}
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs text-primary border-primary/20 hover:bg-primary/10"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      Credit / Deduct
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Adjust Balance Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        {selectedUser && (
          <DialogContent onClose={() => setSelectedUser(null)} className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Adjust Wallet Balance
              </DialogTitle>
              <DialogDescription>
                Credit or debit user wallet. The Telegram bot updates instantly.
              </DialogDescription>
            </DialogHeader>

            <div className="p-3.5 rounded-lg border bg-secondary/50 space-y-1.5 text-xs my-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-semibold text-foreground">{selectedUser.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Telegram ID:</span>
                <span className="font-mono text-muted-foreground">{selectedUser.telegram_id}</span>
              </div>
              <div className="flex justify-between border-t border-border/50 pt-1.5">
                <span className="text-muted-foreground font-medium">Current Balance:</span>
                <span className="font-mono font-bold text-primary">
                  ${Number(selectedUser.balance || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">
                  Amount to Adjust ($ USD)
                </label>
                <span className="text-[10px] text-muted-foreground font-mono">Instant Sync</span>
              </div>
              <Input
                type="number"
                step="0.5"
                min="0.1"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(parseFloat(e.target.value) || 0)}
                className="font-mono text-base font-bold text-foreground"
              />
              {/* Quick Amount Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[1, 5, 10, 20, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAdjustAmount(amt)}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all ${
                      adjustAmount === amt
                        ? 'bg-primary text-black font-bold ring-1 ring-primary'
                        : 'bg-secondary/70 hover:bg-secondary text-muted-foreground hover:text-white border border-border/60'
                    }`}
                  >
                    +${amt}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3">
              <Button
                onClick={() => handleUpdateBalance(true)}
                variant="default"
                size="sm"
                className="gap-1 font-semibold h-9 bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <Plus className="w-4 h-4" />
                Credit (+${adjustAmount})
              </Button>
              <Button
                onClick={() => handleUpdateBalance(false)}
                variant="destructive"
                size="sm"
                className="gap-1 font-semibold h-9"
              >
                <Minus className="w-4 h-4" />
                Deduct (-${adjustAmount})
              </Button>
            </div>

            <DialogFooter className="pt-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedUser(null)}
                className="w-full text-xs h-8"
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
