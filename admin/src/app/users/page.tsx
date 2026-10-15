'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Users, DollarSign, Wallet, Search, ArrowUpRight, Plus, Minus, UserCheck } from 'lucide-react';
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
  createdAt?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<TelegramUser[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<TelegramUser | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(10);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: TelegramUser[] = [];
      snapshot.forEach((d) => {
        list.push({ telegram_id: d.id, ...(d.data() as any) });
      });
      setUsers(list);
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
      await updateDoc(doc(db, 'users', selectedUser.telegram_id), {
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
            Credit or deduct wallet balances manually after receiving payments (bKash / Nagad / Binance).
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

      {/* Users Table Card */}
      <Card className="glass-panel overflow-hidden border">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-xs">
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
              <label className="text-xs font-medium text-foreground">
                Amount to Adjust ($ USD)
              </label>
              <Input
                type="number"
                step="0.5"
                min="0.1"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(parseFloat(e.target.value) || 0)}
                className="font-mono text-base font-bold text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3">
              <Button
                onClick={() => handleUpdateBalance(true)}
                variant="default"
                size="sm"
                className="gap-1 font-semibold"
              >
                <Plus className="w-4 h-4" />
                Credit (${adjustAmount})
              </Button>
              <Button
                onClick={() => handleUpdateBalance(false)}
                variant="destructive"
                size="sm"
                className="gap-1 font-semibold"
              >
                <Minus className="w-4 h-4" />
                Deduct (${adjustAmount})
              </Button>
            </div>

            <DialogFooter className="pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUser(null)}
                className="w-full text-xs"
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
