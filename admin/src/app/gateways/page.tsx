'use client';

import React, { useEffect, useState } from 'react';
import { rtdb } from '@/lib/firebase';
import { ref, onValue, set, update, remove } from 'firebase/database';
import { 
  Wallet, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Copy, 
  DollarSign, 
  ArrowUpRight, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle,
  ExternalLink,
  Coins
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';

interface PaymentGateway {
  id: string;
  name: string;
  icon: string;
  type: 'crypto_address' | 'uid' | 'manual';
  currency: string;
  network: string;
  minDeposit: string;
  maxDeposit: string;
  address?: string;
  uid?: string;
  warning?: string;
  instruction?: string;
  active: boolean;
  order: number;
}

interface DepositRequest {
  id: string;
  userId: string;
  userName: string;
  gatewayId: string;
  gatewayName: string;
  txId: string;
  amount?: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt?: string;
}

// Default Presets matching the user's exact design
const DEFAULT_GATEWAYS: PaymentGateway[] = [
  {
    id: 'usdt-bep20',
    name: 'USDT (BEP20)',
    icon: '🔸',
    type: 'crypto_address',
    currency: 'USDT',
    network: 'BSC (BEP20)',
    minDeposit: '0.01 USDT',
    maxDeposit: '10000.00 USDT',
    address: '0xAfCdaAfA2e75A543B2A120c31a05708982Bd4b7F',
    warning: 'Only send USDT on BEP20 (BSC) network. Sending other tokens or using wrong network will result in loss of funds.',
    active: true,
    order: 1,
  },
  {
    id: 'usdt-polygon',
    name: 'USDT (Polygon)',
    icon: '🟣',
    type: 'crypto_address',
    currency: 'USDT',
    network: 'Polygon',
    minDeposit: '0.01 USDT',
    maxDeposit: '10000.00 USDT',
    address: '0xAfCdaAfA2e75A543B2A120c31a05708982Bd4b7F',
    warning: 'Only send USDT on Polygon network. Sending other tokens or using wrong network will result in loss of funds.',
    active: true,
    order: 2,
  },
  {
    id: 'usdt-ton',
    name: 'USDT (Ton)',
    icon: '💎',
    type: 'crypto_address',
    currency: 'USDT',
    network: 'TON',
    minDeposit: '0.10 USDT',
    maxDeposit: '10000.00 USDT',
    address: 'EQB_YourTonDepositAddressHere1234567890',
    warning: 'Send only USDT on TON network.',
    active: true,
    order: 3,
  },
  {
    id: 'ton-ton',
    name: 'Ton (Ton)',
    icon: '💎',
    type: 'crypto_address',
    currency: 'TON',
    network: 'TON',
    minDeposit: '0.10 TON',
    maxDeposit: '5000.00 TON',
    address: 'EQB_YourTonDepositAddressHere1234567890',
    warning: 'Send only TON coin to this address.',
    active: true,
    order: 4,
  },
  {
    id: 'binance-pay',
    name: 'Binance Pay',
    icon: '🔸',
    type: 'uid',
    currency: 'USDT',
    network: 'Binance Pay',
    minDeposit: '0.01 USDT',
    maxDeposit: '5.00 USDT',
    uid: '1233668018',
    warning: 'For more than 5.00 USDT, please use one of the other payment methods — they are credited automatically. Send only USDT via Binance Pay to the ID above.',
    active: true,
    order: 5,
  },
  {
    id: 'bybit-pay',
    name: 'Bybit Pay',
    icon: '🟡',
    type: 'uid',
    currency: 'USDT',
    network: 'Bybit UID',
    minDeposit: '0.01 USDT',
    maxDeposit: '100.00 USDT',
    uid: '987654321',
    warning: 'Send USDT via Bybit internal transfer to the UID above and submit your Transaction ID.',
    active: true,
    order: 6,
  },
  {
    id: 'ltc',
    name: 'LTC (Litecoin)',
    icon: 'Ł',
    type: 'crypto_address',
    currency: 'LTC',
    network: 'Litecoin',
    minDeposit: '0.001 LTC',
    maxDeposit: '100.00 LTC',
    address: 'ltc1qYourLitecoinAddressHere1234567890',
    warning: 'Send only Litecoin (LTC) to this address.',
    active: true,
    order: 7,
  },
];

export default function GatewaysPage() {
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog State for Gateway Add/Edit
  const [isGatewayDialogOpen, setIsGatewayDialogOpen] = useState(false);
  const [editingGateway, setEditingGateway] = useState<PaymentGateway | null>(null);
  const [gatewayForm, setGatewayForm] = useState<Partial<PaymentGateway>>({
    name: '',
    icon: '🔸',
    type: 'crypto_address',
    currency: 'USDT',
    network: 'BSC (BEP20)',
    minDeposit: '0.01 USDT',
    maxDeposit: '10000.00 USDT',
    address: '',
    uid: '',
    warning: '',
    active: true,
    order: 1,
  });

  // Approval Modal State
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<DepositRequest | null>(null);
  const [creditAmount, setCreditAmount] = useState<number>(5.0);
  const [approving, setApproving] = useState(false);

  // Filter/Search
  const [searchTx, setSearchTx] = useState('');

  // 1. Sync Gateways and Deposits from Firebase RTDB
  useEffect(() => {
    // A. Listen to Gateways
    const gatewaysRef = ref(rtdb, 'gateways');
    const unsubGateways = onValue(gatewaysRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const list: PaymentGateway[] = [];
        for (const [key, item] of Object.entries(val)) {
          list.push({ id: key, ...(item as any) });
        }
        list.sort((a, b) => (a.order || 0) - (b.order || 0));
        setGateways(list);
      } else {
        // Seed default gateways to RTDB if none exist yet!
        seedDefaultGateways();
      }
      setLoading(false);
    });

    // B. Listen to Deposits
    const depositsRef = ref(rtdb, 'deposits');
    const unsubDeposits = onValue(depositsRef, (snapshot) => {
      const list: DepositRequest[] = [];
      if (snapshot.exists()) {
        const val = snapshot.val();
        for (const [key, item] of Object.entries(val)) {
          list.push({ id: key, ...(item as any) });
        }
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      setDeposits(list);
    });

    return () => {
      unsubGateways();
      unsubDeposits();
    };
  }, []);

  const seedDefaultGateways = async () => {
    try {
      const gatewaysRef = ref(rtdb, 'gateways');
      const seedObj: Record<string, PaymentGateway> = {};
      DEFAULT_GATEWAYS.forEach((gw) => {
        seedObj[gw.id] = gw;
      });
      await set(gatewaysRef, seedObj);
      setGateways(DEFAULT_GATEWAYS);
    } catch (err: any) {
      console.error('Failed to seed default gateways:', err.message);
    }
  };

  // Open Gateway Add
  const handleOpenAdd = () => {
    setEditingGateway(null);
    setGatewayForm({
      name: 'USDT (BEP20)',
      icon: '🔸',
      type: 'crypto_address',
      currency: 'USDT',
      network: 'BSC (BEP20)',
      minDeposit: '0.01 USDT',
      maxDeposit: '10000.00 USDT',
      address: '0xAfCdaAfA2e75A543B2A120c31a05708982Bd4b7F',
      uid: '',
      warning: 'Only send USDT on BEP20 (BSC) network.',
      active: true,
      order: gateways.length + 1,
    });
    setIsGatewayDialogOpen(true);
  };

  // Open Gateway Edit
  const handleOpenEdit = (gw: PaymentGateway) => {
    setEditingGateway(gw);
    setGatewayForm({ ...gw });
    setIsGatewayDialogOpen(true);
  };

  // Save Gateway (Add or Update)
  const handleSaveGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gatewayForm.name) return;

    try {
      const id = editingGateway ? editingGateway.id : gatewayForm.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const gatewayRef = ref(rtdb, `gateways/${id}`);

      await set(gatewayRef, {
        id,
        name: gatewayForm.name,
        icon: gatewayForm.icon || '🔸',
        type: gatewayForm.type || 'crypto_address',
        currency: gatewayForm.currency || 'USDT',
        network: gatewayForm.network || '',
        minDeposit: gatewayForm.minDeposit || '0.01 USDT',
        maxDeposit: gatewayForm.maxDeposit || '10000.00 USDT',
        address: gatewayForm.address || '',
        uid: gatewayForm.uid || '',
        warning: gatewayForm.warning || '',
        active: gatewayForm.active !== undefined ? gatewayForm.active : true,
        order: Number(gatewayForm.order) || 1,
        updatedAt: new Date().toISOString(),
      });

      setIsGatewayDialogOpen(false);
    } catch (err: any) {
      alert(`Error saving gateway: ${err.message}`);
    }
  };

  // Delete Gateway
  const handleDeleteGateway = async (id: string) => {
    if (confirm('Are you sure you want to delete this payment gateway?')) {
      await remove(ref(rtdb, `gateways/${id}`));
    }
  };

  // Toggle Gateway Active Status
  const handleToggleActive = async (gw: PaymentGateway) => {
    await update(ref(rtdb, `gateways/${gw.id}`), {
      active: !gw.active,
      updatedAt: new Date().toISOString(),
    });
  };

  // Open Deposit Approval Dialog
  const handleOpenApprove = (dep: DepositRequest) => {
    setSelectedDeposit(dep);
    setCreditAmount(dep.amount || 5.0);
    setIsApproveDialogOpen(true);
  };

  // Confirm Deposit Approval & Credit Balance to User
  const handleConfirmApproval = async () => {
    if (!selectedDeposit) return;
    setApproving(true);

    try {
      const amountToAdd = Number(creditAmount) || 0;
      const userRef = ref(rtdb, `users/${selectedDeposit.userId}`);

      // 1. Fetch current user balance
      const userSnap = await (await import('firebase/database')).get(userRef);
      const userData = userSnap.exists() ? userSnap.val() : { balance: 0 };
      const currentBalance = Number(userData.balance || 0);
      const newBalance = currentBalance + amountToAdd;

      // 2. Update user balance
      await update(userRef, {
        balance: newBalance,
        updatedAt: new Date().toISOString(),
      });

      // 3. Mark deposit as approved
      const depositRef = ref(rtdb, `deposits/${selectedDeposit.id}`);
      await update(depositRef, {
        status: 'approved',
        amount: amountToAdd,
        creditedBalance: newBalance,
        updatedAt: new Date().toISOString(),
      });

      setIsApproveDialogOpen(false);
      setSelectedDeposit(null);
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setApproving(false);
    }
  };

  // Reject Deposit
  const handleRejectDeposit = async (dep: DepositRequest) => {
    if (confirm(`Reject deposit verification for ${dep.userName} (${dep.txId})?`)) {
      await update(ref(rtdb, `deposits/${dep.id}`), {
        status: 'rejected',
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const pendingDeposits = deposits.filter((d) => d.status === 'pending');
  const filteredDeposits = deposits.filter((d) =>
    (d.txId && d.txId.toLowerCase().includes(searchTx.toLowerCase())) ||
    (d.userName && d.userName.toLowerCase().includes(searchTx.toLowerCase())) ||
    (d.userId && d.userId.includes(searchTx))
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            Payment Gateways & Deposit Studio
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your crypto addresses (BEP20, Polygon, TON, LTC) and Binance/Bybit UIDs. Verify live transaction IDs from Telegram users.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleOpenAdd} size="sm" variant="default" className="gap-1.5 font-semibold">
            <Plus className="w-4 h-4" />
            Add Payment Gateway
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList className="bg-secondary/40 p-1 border">
          <TabsTrigger value="requests" className="gap-2 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            Deposit Submissions
            {pendingDeposits.length > 0 && (
              <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-[10px] animate-pulse">
                {pendingDeposits.length} pending
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="gateways" className="gap-2 text-xs font-semibold">
            <Wallet className="w-3.5 h-3.5" />
            Configured Gateways ({gateways.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Deposit Requests */}
        <TabsContent value="requests" className="space-y-4">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base text-white">Live Telegram Deposit Submissions</CardTitle>
                <CardDescription className="text-xs">
                  When a user clicks "I have Paid" and submits their TxID or Binance Order ID, it appears here for instant 1-click verification.
                </CardDescription>
              </div>

              <div className="w-64 relative">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
                <Input
                  placeholder="Filter by TxID or User..."
                  className="pl-8 text-xs h-8"
                  value={searchTx}
                  onChange={(e) => setSearchTx(e.target.value)}
                />
              </div>
            </CardHeader>

            {filteredDeposits.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
                  <Coins className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-foreground">No deposit submissions yet</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  When users send money via Binance Pay or Crypto and submit their TxID in the bot, they will appear here.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer / Telegram ID</TableHead>
                    <TableHead>Gateway</TableHead>
                    <TableHead>Submitted TxID / Order ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeposits.map((dep) => (
                    <TableRow key={dep.id}>
                      <TableCell>
                        <div className="font-semibold text-white text-xs">{dep.userName}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">{dep.userId}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="gap-1 font-mono text-[11px]">
                          {dep.gatewayName}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono text-primary font-bold bg-primary/10 px-2 py-0.5 rounded border border-primary/20 select-all">
                            {dep.txId}
                          </code>
                          <button
                            title="Copy TxID"
                            onClick={() => navigator.clipboard.writeText(dep.txId)}
                            className="text-muted-foreground hover:text-white"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {dep.status === 'approved' && (
                          <Badge variant="success" className="text-[11px] gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Approved (+${dep.amount?.toFixed(2) || '0.00'})
                          </Badge>
                        )}
                        {dep.status === 'rejected' && (
                          <Badge variant="destructive" className="text-[11px] gap-1">
                            <XCircle className="w-3 h-3" /> Rejected
                          </Badge>
                        )}
                        {dep.status === 'pending' && (
                          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[11px] gap-1">
                            <Clock className="w-3 h-3" /> Pending Verification
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {new Date(dep.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {dep.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              onClick={() => handleOpenApprove(dep)}
                              size="sm"
                              variant="default"
                              className="h-7 px-2.5 text-xs font-semibold gap-1 bg-emerald-600 hover:bg-emerald-500"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Approve
                            </Button>
                            <Button
                              onClick={() => handleRejectDeposit(dep)}
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Processed</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* Tab 2: Configured Gateways */}
        <TabsContent value="gateways" className="space-y-4">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base text-white">Active Payment Gateways</CardTitle>
                <CardDescription className="text-xs">
                  These appear directly in Telegram under "Add Funds to Wallet". Edit your wallet addresses or Binance UID here anytime.
                </CardDescription>
              </div>

              <Button onClick={seedDefaultGateways} size="sm" variant="outline" className="text-xs gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Reset Defaults
              </Button>
            </CardHeader>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Gateway Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Deposit Address / UID</TableHead>
                  <TableHead>Min / Max Limit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gateways.map((gw, idx) => (
                  <TableRow key={gw.id}>
                    <TableCell className="font-mono text-muted-foreground text-xs">{gw.order || idx + 1}</TableCell>
                    <TableCell>
                      <div className="font-semibold text-white text-xs flex items-center gap-1.5">
                        <span className="text-base">{gw.icon}</span>
                        {gw.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">{gw.network}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-[11px]">
                        {gw.type === 'uid' ? 'UID Payment' : 'Crypto Address'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {gw.type === 'uid' ? (
                        <div className="font-mono text-xs text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 inline-block">
                          UID: {gw.uid || 'Not Set'}
                        </div>
                      ) : (
                        <div className="font-mono text-xs text-primary max-w-xs truncate bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                          {gw.address || 'Address Not Set'}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {gw.minDeposit} - {gw.maxDeposit}
                    </TableCell>
                    <TableCell>
                      <button onClick={() => handleToggleActive(gw)}>
                        <Badge variant={gw.active ? 'success' : 'secondary'} className="cursor-pointer text-[10px]">
                          {gw.active ? 'Active (Live in Bot)' : 'Disabled'}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          onClick={() => handleOpenEdit(gw)}
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-white"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteGateway(gw.id)}
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Gateway Add / Edit Modal */}
      <Dialog open={isGatewayDialogOpen} onOpenChange={setIsGatewayDialogOpen}>
        <DialogContent onClose={() => setIsGatewayDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>{editingGateway ? 'Edit Payment Gateway' : 'Add New Payment Gateway'}</DialogTitle>
            <DialogDescription>
              Configure deposit addresses, Binance/Bybit UIDs, and limits shown to Telegram users.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveGateway} className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-3">
                <label className="block font-medium text-foreground mb-1">Gateway Name</label>
                <Input
                  required
                  placeholder="e.g. Binance Pay or USDT (BEP20)"
                  value={gatewayForm.name}
                  onChange={(e) => setGatewayForm({ ...gatewayForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-medium text-foreground mb-1">Icon / Emoji</label>
                <Input
                  placeholder="e.g. 🔸"
                  value={gatewayForm.icon}
                  onChange={(e) => setGatewayForm({ ...gatewayForm, icon: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-foreground mb-1">Gateway Type</label>
                <select
                  value={gatewayForm.type}
                  onChange={(e) => setGatewayForm({ ...gatewayForm, type: e.target.value as any })}
                  className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                >
                  <option value="crypto_address">Crypto Address (BEP20, Polygon, TON, LTC)</option>
                  <option value="uid">UID Transfer (Binance Pay / Bybit)</option>
                  <option value="manual">Manual Mobile Banking (bKash / Nagad)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">Network / Details</label>
                <Input
                  placeholder="e.g. BSC (BEP20) or TON"
                  value={gatewayForm.network}
                  onChange={(e) => setGatewayForm({ ...gatewayForm, network: e.target.value })}
                />
              </div>
            </div>

            {gatewayForm.type === 'uid' ? (
              <div>
                <label className="block font-medium text-foreground mb-1 text-amber-300">
                  Binance / Bybit UID Number
                </label>
                <Input
                  required
                  placeholder="e.g. 1233668018"
                  value={gatewayForm.uid}
                  onChange={(e) => setGatewayForm({ ...gatewayForm, uid: e.target.value })}
                />
              </div>
            ) : (
              <div>
                <label className="block font-medium text-foreground mb-1 text-primary">
                  Personal Crypto Deposit Address
                </label>
                <Input
                  required
                  placeholder="e.g. 0xAfCdaAfA2e75A543B2A120c31a05708982Bd4b7F"
                  value={gatewayForm.address}
                  onChange={(e) => setGatewayForm({ ...gatewayForm, address: e.target.value })}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-foreground mb-1">Min Deposit</label>
                <Input
                  placeholder="e.g. 0.01 USDT"
                  value={gatewayForm.minDeposit}
                  onChange={(e) => setGatewayForm({ ...gatewayForm, minDeposit: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-medium text-foreground mb-1">Max Deposit</label>
                <Input
                  placeholder="e.g. 10000.00 USDT"
                  value={gatewayForm.maxDeposit}
                  onChange={(e) => setGatewayForm({ ...gatewayForm, maxDeposit: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-foreground mb-1">Warning / Important Note (Shown in Bot)</label>
              <textarea
                rows={2}
                placeholder="Important: Only send on this network..."
                value={gatewayForm.warning}
                onChange={(e) => setGatewayForm({ ...gatewayForm, warning: e.target.value })}
                className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsGatewayDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" variant="default">
                Save Gateway
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Approve Deposit Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent onClose={() => setIsApproveDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              Approve Deposit & Credit Wallet
            </DialogTitle>
            <DialogDescription>
              Verify the transaction on your exchange/wallet and enter the USD amount to credit to this user.
            </DialogDescription>
          </DialogHeader>

          {selectedDeposit && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 rounded-lg bg-secondary/50 border space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User:</span>
                  <span className="text-white font-bold">{selectedDeposit.userName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Telegram ID:</span>
                  <span className="text-primary">{selectedDeposit.userId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gateway:</span>
                  <span className="text-amber-300 font-bold">{selectedDeposit.gatewayName}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t">
                  <span className="text-muted-foreground">Transaction ID:</span>
                  <code className="text-white bg-background px-1.5 py-0.5 rounded border select-all">
                    {selectedDeposit.txId}
                  </code>
                </div>
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">
                  Amount to Credit to Wallet ($ USD)
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-emerald-400 absolute left-3 top-2.5" />
                  <Input
                    type="number"
                    step="0.01"
                    required
                    className="pl-8 text-sm font-bold text-emerald-400"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  This amount will be immediately added to the user's wallet balance in real-time.
                </p>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsApproveDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmApproval}
                  disabled={approving || creditAmount <= 0}
                  size="sm"
                  variant="default"
                  className="bg-emerald-600 hover:bg-emerald-500 font-semibold"
                >
                  {approving ? 'Crediting...' : `Confirm & Add $${creditAmount.toFixed(2)}`}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
