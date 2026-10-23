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
  Coins,
  Zap,
  RefreshCw
} from 'lucide-react';
import { verifyOnChainTx } from '@/lib/cryptoVerifier';
import { BRAND_PRESETS, BrandIcon, resolveTelegramButtonEmoji, VERIFIED_CUSTOM_EMOJIS, EMOJI_GG_CRYPTO_PACK } from '@/lib/brandIcons';
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
  custom_emoji_id?: string;
  autoApprove?: boolean;
  autoApproveAmount?: number;
  apiKey?: string;
  apiSecret?: string;
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
  autoVerified?: boolean;
  method?: string;
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

// Default Presets matching the user's exact design
const DEFAULT_GATEWAYS: PaymentGateway[] = [
  {
    id: 'usdt-bep20',
    name: 'USDT (BEP20)',
    icon: 'usdt',
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
    icon: 'polygon',
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
    icon: 'ton',
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
    icon: 'ton',
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
    icon: 'binance',
    type: 'uid',
    currency: 'USDT',
    network: 'Binance Pay',
    minDeposit: '0.01 USDT',
    maxDeposit: '5.00 USDT',
    uid: '1233668018',
    warning: 'For more than 5.00 USDT, please use one of the other payment methods — they are credited automatically. Send only USDT via Binance Pay to the ID above.',
    active: true,
    order: 5,
    autoApprove: true,
    autoApproveAmount: 5.0,
  },
  {
    id: 'bybit-pay',
    name: 'Bybit Pay',
    icon: 'bybit',
    type: 'uid',
    currency: 'USDT',
    network: 'Bybit UID',
    minDeposit: '0.01 USDT',
    maxDeposit: '100.00 USDT',
    uid: '987654321',
    warning: 'Send USDT via Bybit internal transfer to the UID above and submit your Transaction ID.',
    active: true,
    order: 6,
    autoApprove: true,
    autoApproveAmount: 5.0,
  },
  {
    id: 'ltc',
    name: 'LTC (Litecoin)',
    icon: 'ltc',
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
    icon: 'binance',
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

  // Exchange API Test State
  const [testingApi, setTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Filter/Search
  const [searchTx, setSearchTx] = useState('');

  // Test Binance / Bybit Connection
  const handleTestExchangeApi = async () => {
    if (!gatewayForm.apiKey || !gatewayForm.apiSecret) {
      alert('Please enter both API Key and API Secret first.');
      return;
    }
    setTestingApi(true);
    setApiTestResult(null);

    const isBybit = (gatewayForm.id || gatewayForm.name || '').toLowerCase().includes('bybit');
    const exchangeType = isBybit ? 'bybit' : 'binance';

    try {
      const res = await fetch('/api/exchange/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exchange: exchangeType,
          apiKey: gatewayForm.apiKey,
          apiSecret: gatewayForm.apiSecret,
        }),
      });
      const data = await res.json();
      setApiTestResult(data);
    } catch (err: any) {
      setApiTestResult({ success: false, message: err.message });
    } finally {
      setTestingApi(false);
    }
  };

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
      icon: 'usdt',
      type: 'crypto_address',
      currency: 'USDT',
      network: 'BSC (BEP20)',
      minDeposit: '0.01 USDT',
      maxDeposit: '10000.00 USDT',
      address: '0xAfCdaAfA2e75A543B2A120c31a05708982Bd4b7F',
      uid: '',
      apiKey: '',
      apiSecret: '',
      warning: 'Only send USDT on BEP20 (BSC) network.',
      active: true,
      order: gateways.length + 1,
    });
    setApiTestResult(null);
    setIsGatewayDialogOpen(true);
  };

  // Open Gateway Edit
  const handleOpenEdit = (gw: PaymentGateway) => {
    setEditingGateway(gw);
    setGatewayForm({
      ...gw,
      custom_emoji_id: gw.custom_emoji_id || '',
      apiKey: gw.apiKey || '',
      apiSecret: gw.apiSecret || '',
    });
    setApiTestResult(null);
    setIsGatewayDialogOpen(true);
  };

  // Save Gateway (Add or Update)
  const handleSaveGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gatewayForm.name) return;

    try {
      const id = editingGateway ? editingGateway.id : gatewayForm.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const gatewayRef = ref(rtdb, `gateways/${id}`);

      const resolvedEmoji = resolveTelegramButtonEmoji(gatewayForm.icon || gatewayForm.name, gatewayForm.name);

      await set(gatewayRef, {
        id,
        name: gatewayForm.name,
        icon: gatewayForm.icon || resolvedEmoji || '🔸',
        emoji: resolvedEmoji,
        custom_emoji_id: gatewayForm.custom_emoji_id?.trim() || '',
        type: gatewayForm.type || 'crypto_address',
        currency: gatewayForm.currency || 'USDT',
        network: gatewayForm.network || '',
        minDeposit: gatewayForm.minDeposit || '0.01 USDT',
        maxDeposit: gatewayForm.maxDeposit || '10000.00 USDT',
        address: gatewayForm.address || '',
        uid: gatewayForm.uid || '',
        apiKey: gatewayForm.apiKey || '',
        apiSecret: gatewayForm.apiSecret || '',
        warning: gatewayForm.warning || '',
        active: gatewayForm.active !== undefined ? gatewayForm.active : true,
        order: Number(gatewayForm.order) || 1,
        autoApprove: gatewayForm.autoApprove !== undefined ? gatewayForm.autoApprove : true,
        autoApproveAmount: Number(gatewayForm.autoApproveAmount) || 5.0,
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

  // State for live check
  const [checkingDepId, setCheckingDepId] = useState<string | null>(null);

  // Auto Check Deposit (Blockchain or Exchange Read-Only API)
  const handleAutoCheckDeposit = async (dep: DepositRequest) => {
    const targetGateway: Partial<PaymentGateway> = gateways.find((g) => g.id === dep.gatewayId) || {
      id: dep.gatewayId,
      name: dep.gatewayName,
      network: 'BSC (BEP20)',
      address: '0xAfCdaAfA2e75A543B2A120c31a05708982Bd4b7F',
      apiKey: '',
      apiSecret: '',
    };
    setCheckingDepId(dep.id);

    try {
      if (dep.txId.startsWith('0x')) {
        // 1. Blockchain On-Chain Check
        const result = await verifyOnChainTx(targetGateway, dep.txId);
        if (result.verified) {
          const verifiedAmount = result.amount || 1.0;
          if (confirm(`⚡ Blockchain Verified Successfully!\n\nNetwork: ${(result.chain || 'BSC').toUpperCase()}\nCredited Amount: $${verifiedAmount.toFixed(2)} USDT\n\nCredit $${verifiedAmount.toFixed(2)} to ${dep.userName} (${dep.userId}) now?`)) {
            await approveAndCredit(dep, verifiedAmount, 'onchain_auto', result.chain);
          }
        } else {
          alert(`⚠️ On-Chain Verification Notice:\n${result.reason || 'Could not verify transaction on blockchain.'}`);
        }
      } else {
        // 2. Binance or Bybit Read-Only API Check
        const isBybit = (targetGateway.id || targetGateway.name || '').toLowerCase().includes('bybit');
        const exchangeType = isBybit ? 'bybit' : 'binance';

        if (!targetGateway.apiKey || !targetGateway.apiSecret) {
          alert(`⚠️ ${isBybit ? 'Bybit' : 'Binance'} Read-Only API is not configured on this gateway yet.\n\nPlease edit this gateway, add your Read-Only API Key & Secret, and click Save.`);
          return;
        }

        const res = await fetch('/api/exchange/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exchange: exchangeType,
            apiKey: targetGateway.apiKey || '',
            apiSecret: targetGateway.apiSecret || '',
            txId: dep.txId,
          }),
        });
        const result = await res.json();

        if (result.verified) {
          const verifiedAmount = result.amount || 1.0;
          if (confirm(`⚡ ${result.exchange || 'Exchange'} Confirmed Successfully!\n\nOrder / Transfer ID: ${result.orderId}\nCredited Amount: $${verifiedAmount.toFixed(2)} ${result.currency || 'USDT'}\n\nCredit $${verifiedAmount.toFixed(2)} to ${dep.userName} (${dep.userId}) now?`)) {
            await approveAndCredit(dep, verifiedAmount, isBybit ? 'bybit_api' : 'binance_api', exchangeType);
          }
        } else {
          alert(`⚠️ Exchange Verification Notice:\n${result.reason || 'Payment was not found in exchange records.'}`);
        }
      }
    } catch (err: any) {
      alert(`Auto-check error: ${err.message}`);
    } finally {
      setCheckingDepId(null);
    }
  };

  const approveAndCredit = async (dep: DepositRequest, amountToAdd: number, method: string, chainOrEx?: string) => {
    const userRef = ref(rtdb, `users/${dep.userId}`);
    const userSnap = await (await import('firebase/database')).get(userRef);
    const userData = userSnap.exists() ? userSnap.val() : { balance: 0 };
    const currentBalance = Number(userData.balance || 0);
    const newBalance = currentBalance + amountToAdd;

    await update(userRef, { balance: newBalance, updatedAt: new Date().toISOString() });
    await update(ref(rtdb, `deposits/${dep.id}`), {
      status: 'approved',
      amount: amountToAdd,
      creditedBalance: newBalance,
      autoVerified: true,
      method: method,
      chain: chainOrEx,
      updatedAt: new Date().toISOString(),
    });

    const safeTxKey = dep.txId.toLowerCase().replace(/[^a-z0-9]/g, '_');
    await set(ref(rtdb, `processed_txs/${safeTxKey}`), {
      txId: dep.txId,
      userId: dep.userId,
      amount: amountToAdd,
      verifiedAt: new Date().toISOString(),
      method: method,
    });

    const txKey = `tx_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    await set(ref(rtdb, `transactions/${txKey}`), {
      id: txKey,
      type: 'deposit',
      userId: dep.userId,
      userName: dep.userName || 'Member',
      amount: amountToAdd,
      gateway: dep.gatewayName || 'Payment Gateway',
      txId: dep.txId,
      balanceAfter: newBalance,
      note: `Deposit via ${dep.gatewayName} (${method})`,
      createdAt: new Date().toISOString(),
    });
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

      // 4. Record in processed_txs to prevent duplicate reuse
      const safeTxKey = selectedDeposit.txId.toLowerCase().replace(/[^a-z0-9]/g, '_');
      await set(ref(rtdb, `processed_txs/${safeTxKey}`), {
        txId: selectedDeposit.txId,
        userId: selectedDeposit.userId,
        amount: amountToAdd,
        verifiedAt: new Date().toISOString(),
        method: 'manual_admin',
      });

      // 5. Record Financial Ledger Transaction
      const txKey = `tx_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      await set(ref(rtdb, `transactions/${txKey}`), {
        id: txKey,
        type: 'deposit',
        userId: selectedDeposit.userId,
        userName: selectedDeposit.userName || 'Member',
        amount: amountToAdd,
        gateway: selectedDeposit.gatewayName || 'Payment Gateway',
        txId: selectedDeposit.txId,
        balanceAfter: newBalance,
        note: `Deposit approved manually by admin`,
        createdAt: new Date().toISOString(),
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
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="success" className="text-[11px] gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Approved (+${dep.amount?.toFixed(2) || '0.00'})
                            </Badge>
                            {dep.autoVerified && (
                              <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] gap-1 font-mono">
                                <Zap className="w-2.5 h-2.5" /> Auto-Verified
                              </Badge>
                            )}
                          </div>
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
                              onClick={() => handleAutoCheckDeposit(dep)}
                              disabled={checkingDepId === dep.id}
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs font-semibold gap-1 border-primary/40 text-primary hover:bg-primary/10"
                              title={dep.txId.startsWith('0x') ? 'Verify on Blockchain network' : 'Verify via Exchange Read-Only API'}
                            >
                              {checkingDepId === dep.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Zap className="w-3 h-3" />
                              )}
                              Auto-Check
                            </Button>
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
                      <div className="font-semibold text-white text-xs flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-secondary/60 border border-border/70 flex items-center justify-center shrink-0">
                          <BrandIcon icon={gw.icon || gw.id} className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <span>{gw.name}</span>
                          <div className="text-[11px] text-muted-foreground font-mono font-normal">{gw.network}</div>
                        </div>
                      </div>
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
                      <div className="flex flex-col gap-1 items-start">
                        <button onClick={() => handleToggleActive(gw)}>
                          <Badge variant={gw.active ? 'success' : 'secondary'} className="cursor-pointer text-[10px]">
                            {gw.active ? 'Active (Live in Bot)' : 'Disabled'}
                          </Badge>
                        </button>
                        {gw.autoApprove !== false ? (
                          <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px] gap-0.5">
                            <Zap className="w-2.5 h-2.5" /> Auto-Credit ON
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-[9px]">
                            Manual 1-Click
                          </Badge>
                        )}
                      </div>
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
            {/* Official Crypto Emoji Pack (from https://emoji.gg/packs/crypto) */}
            <div className="space-y-1.5 p-3 rounded-xl bg-secondary/30 border border-border/70">
              <label className="block font-medium text-foreground text-[11px] text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-white font-semibold">
                  <Coins className="w-3.5 h-3.5 text-primary" />
                  Official Crypto Emoji Pack (emoji.gg)
                </span>
                <span className="text-primary font-mono text-[10px]">1-Click Quick Fill</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-40 overflow-y-auto p-1.5 rounded-lg bg-card/60 border border-border/60 scrollbar-thin">
                {EMOJI_GG_CRYPTO_PACK.map((coin) => {
                  const isSelected = gatewayForm.icon === coin.imageUrl || gatewayForm.icon === coin.id;
                  return (
                    <button
                      key={coin.id}
                      type="button"
                      onClick={() => {
                        setGatewayForm({
                          ...gatewayForm,
                          name: gatewayForm.name ? gatewayForm.name : coin.name,
                          icon: coin.imageUrl,
                          currency: coin.symbol,
                          custom_emoji_id: coin.custom_emoji_id || gatewayForm.custom_emoji_id,
                        });
                      }}
                      className={`flex items-center gap-2 p-1.5 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'bg-primary/20 border-primary text-white shadow-sm ring-1 ring-primary/40'
                          : 'bg-secondary/40 hover:bg-secondary/90 border-border/50 text-muted-foreground hover:text-white'
                      }`}
                    >
                      <img src={coin.imageUrl} alt={coin.name} className="w-5 h-5 object-contain shrink-0 rounded" />
                      <div className="truncate min-w-0">
                        <div className="text-[11px] font-semibold text-white truncate">{coin.symbol}</div>
                        <div className="text-[9px] text-muted-foreground truncate">{coin.name}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Official Crypto & Gateway SVG Brand Presets */}
            <div>
              <label className="block font-medium text-foreground mb-1.5 text-[11px] text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>⚡ Official SVG Payment Brand Logos (1-Click Fill)</span>
                <span className="text-primary font-mono text-[10px]">Pure Vector SVG</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-28 overflow-y-auto p-1.5 rounded-lg bg-secondary/30 border border-border/70 scrollbar-thin">
                {BRAND_PRESETS.filter(bp => bp.category === 'Crypto' || ['telegram', 'discord'].includes(bp.id)).map((bp) => {
                  const isSelected = gatewayForm.icon === bp.id;
                  return (
                    <button
                      key={bp.id}
                      type="button"
                      onClick={() => {
                        setGatewayForm({
                          ...gatewayForm,
                          name: gatewayForm.name ? gatewayForm.name : bp.name,
                          icon: bp.id,
                        });
                      }}
                      className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left text-xs font-medium transition-all ${
                        isSelected 
                          ? 'bg-primary/20 border-primary text-white shadow-sm shadow-primary/20' 
                          : 'bg-card/70 hover:bg-secondary/80 border-border/60 text-muted-foreground hover:text-white'
                      }`}
                    >
                      <BrandIcon icon={bp.id} className="w-4 h-4 shrink-0 text-primary" />
                      <span className="truncate">{bp.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Telegram Gateway Emojis */}
            <div>
              <label className="block font-medium text-foreground mb-1 text-[11px] text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>⚡ Quick Gateway Emojis (1-Click Pick)</span>
                <span className="text-primary font-mono text-[10px]">Instant Button Icon</span>
              </label>
              <div className="flex flex-wrap gap-1 p-1.5 rounded-lg bg-secondary/30 border border-border/70">
                {['🔸', '🟡', '🟢', '💎', '🟣', 'Ł', '₿', 'Ξ', '🌸', '🟠', '🚀', '💳', '🅿️', '🏦'].map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setGatewayForm({ ...gatewayForm, icon: em })}
                    className={`w-7 h-7 rounded text-sm flex items-center justify-center transition-all ${
                      gatewayForm.icon === em ? 'bg-primary text-black font-bold scale-110 shadow' : 'bg-card/70 hover:bg-secondary text-white'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div className="sm:col-span-3">
                <label className="block font-medium text-foreground mb-1">Gateway Name</label>
                <Input
                  required
                  placeholder="e.g. Binance Pay or USDT (BEP20)"
                  value={gatewayForm.name}
                  onChange={(e) => setGatewayForm({ ...gatewayForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-medium text-foreground mb-1">Icon / SVG / Emoji</label>
                <div className="flex items-center gap-1.5">
                  <div className="w-9 h-9 rounded-md bg-secondary/60 border border-border/70 flex items-center justify-center shrink-0">
                    <BrandIcon icon={gatewayForm.icon} className="w-5 h-5 text-primary" />
                  </div>
                  <Input
                    placeholder="e.g. binance, usdt, <svg..., or 🔸"
                    value={gatewayForm.icon}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, icon: e.target.value })}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Live Telegram Gateway Button Preview */}
            <div className="p-2.5 rounded-lg bg-card/80 border space-y-1">
              <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono uppercase">
                <span>Telegram Bot Gateway Button Preview</span>
                <span className="text-primary font-bold">Native Style</span>
              </div>
              <div className="py-2 px-3 rounded-lg text-center font-bold text-xs border border-primary/40 bg-primary/20 text-white shadow-sm flex items-center justify-center gap-1.5">
                <BrandIcon icon={gatewayForm.icon || gatewayForm.name} className="w-4 h-4 shrink-0 inline-block" />
                <span>{gatewayForm.custom_emoji_id ? '✨ [Custom Vector Logo] ' : `${resolveTelegramButtonEmoji(gatewayForm.icon || gatewayForm.name, gatewayForm.name)} `}{gatewayForm.name || 'Payment Gateway'}</span>
              </div>
            </div>

            {/* Telegram Custom Emoji ID (For Actual Vector Brand Logos like Binance, Bybit, USDT) */}
            <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/70 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-foreground text-[11px] flex items-center gap-1.5">
                  <span>🎨 Telegram Custom Emoji ID</span>
                  <span className="text-[10px] text-amber-400 font-mono font-normal">(For Real Brand Logos)</span>
                </label>
                <span className="text-[10px] text-muted-foreground font-mono">Telegram 7.0+</span>
              </div>
              <Input
                placeholder="e.g. 5368324170671202286 (64-bit Telegram Custom Emoji ID)"
                value={gatewayForm.custom_emoji_id || ''}
                onChange={(e) => setGatewayForm({ ...gatewayForm, custom_emoji_id: e.target.value })}
                className="font-mono text-xs bg-background/60"
              />
              {/* 1-Click Verified Real Brand Logo Custom Emojis */}
              <div className="pt-1 space-y-1">
                <span className="text-[10px] text-muted-foreground font-mono">1-Click Official Logo Packs:</span>
                <div className="flex flex-wrap gap-1">
                  {VERIFIED_CUSTOM_EMOJIS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setGatewayForm({ ...gatewayForm, custom_emoji_id: preset.custom_emoji_id })}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-all ${
                        gatewayForm.custom_emoji_id === preset.custom_emoji_id
                          ? 'bg-primary text-black font-bold border-primary shadow-sm'
                          : 'bg-card/70 hover:bg-secondary text-muted-foreground hover:text-white border-border/70'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                  {gatewayForm.custom_emoji_id && (
                    <button
                      type="button"
                      onClick={() => setGatewayForm({ ...gatewayForm, custom_emoji_id: '' })}
                      className="text-[10px] px-2 py-0.5 rounded border border-rose-500/40 text-rose-400 hover:bg-rose-500/20"
                    >
                      ✕ Clear ID
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground leading-normal pt-0.5">
                💡 Other Telegram bots use <strong>Telegram Custom Emojis</strong> to display real vector logos on buttons. You can click any logo pill above or send custom emojis directly to your bot!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
              <div className="space-y-3">
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

                {/* Exchange Read-Only API Integration Card */}
                <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      <span className="font-semibold text-white text-xs">
                        {(gatewayForm.name || '').includes('Bybit') ? 'Bybit' : 'Binance'} Read-Only API Integration
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30 font-mono self-start sm:self-auto">
                      ⚡ 100% Automated
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Connect your Read-Only API (No withdrawal permissions allowed/required). The bot verifies payments automatically 24/7 on the exchange!
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] font-medium text-foreground mb-1">
                        API Key (Read-Only)
                      </label>
                      <Input
                        type="password"
                        placeholder="Paste Read-Only API Key..."
                        value={gatewayForm.apiKey || ''}
                        onChange={(e) => setGatewayForm({ ...gatewayForm, apiKey: e.target.value })}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-foreground mb-1">
                        API Secret Key
                      </label>
                      <Input
                        type="password"
                        placeholder="Paste API Secret..."
                        value={gatewayForm.apiSecret || ''}
                        onChange={(e) => setGatewayForm({ ...gatewayForm, apiSecret: e.target.value })}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={testingApi || !gatewayForm.apiKey || !gatewayForm.apiSecret}
                      onClick={handleTestExchangeApi}
                      className="h-7 text-xs gap-1 border-amber-500/30 hover:bg-amber-500/10 text-amber-300 w-full sm:w-auto"
                    >
                      {testingApi ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                      Test API Connection
                    </Button>

                    {apiTestResult && (
                      <span className={`text-[11px] font-medium ${apiTestResult.success ? 'text-emerald-400' : 'text-destructive'}`}>
                        {apiTestResult.success ? '✅ ' + apiTestResult.message : '❌ ' + apiTestResult.message}
                      </span>
                    )}
                  </div>
                </div>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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

            {/* Automated Instant Credit Settings */}
            <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="autoApproveToggle" className="font-semibold text-white text-xs flex items-center gap-1.5 cursor-pointer">
                    <Zap className="w-3.5 h-3.5 text-primary" />
                    ⚡ Automatic Instant Credit Mode
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    {gatewayForm.type === 'crypto_address'
                      ? 'On-chain RPC detector verifies blockchain transaction and credits user wallet automatically.'
                      : 'Automatically verifies and credits unique 18-digit Order IDs instantly without waiting for admin.'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="autoApproveToggle"
                  checked={gatewayForm.autoApprove !== false}
                  onChange={(e) => setGatewayForm({ ...gatewayForm, autoApprove: e.target.checked })}
                  className="h-4 w-4 rounded accent-primary cursor-pointer shrink-0 ml-2"
                />
              </div>

              {gatewayForm.type === 'uid' && gatewayForm.autoApprove !== false && (
                <div className="pt-2 border-t border-primary/10 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">
                      Auto-Credit Amount ($ USD)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="5.00"
                      value={gatewayForm.autoApproveAmount || 5.0}
                      onChange={(e) => setGatewayForm({ ...gatewayForm, autoApproveAmount: parseFloat(e.target.value) || 5.0 })}
                      className="h-8 text-xs font-mono font-bold text-primary"
                    />
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center">
                    Unique 18-digit Binance / Bybit Order IDs will be credited this amount immediately.
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="sticky bottom-0 bg-card/95 backdrop-blur-md pt-3 pb-1 border-t border-border/70 flex flex-col-reverse sm:flex-row gap-2 justify-end z-20">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsGatewayDialogOpen(false)} className="w-full sm:w-auto text-xs h-9 sm:h-8">
                Cancel
              </Button>
              <Button type="submit" size="sm" variant="default" className="w-full sm:w-auto bg-primary text-black font-semibold hover:bg-primary/90 text-xs h-9 sm:h-8">
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
