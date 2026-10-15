'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { rtdb } from '@/lib/firebase';
import { ref, get, set, onValue } from 'firebase/database';
import { 
  Settings, 
  Save, 
  Check, 
  Bot, 
  RadioTower, 
  Wallet, 
  Type, 
  Palette, 
  Sparkles,
  ExternalLink,
  Activity,
  Zap,
  Clock,
  Globe,
  Copy,
  Server
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function SettingsPage() {
  const [config, setConfig] = useState({
    // Store & Channel (Defaults requested by user)
    shopName: 'Nurms Shop',
    channelId: '@owloverdown',
    channelLink: 'https://t.me/owloverdown',
    botLink: '@NurmsBOT',
    supportUsername: '@owloverdown',

    // 24/7 Uptime & Cron
    selfPingUrl: '',
    enableSelfPing: true,
    pingIntervalMinutes: 10,

    // Payment Numbers
    bkashNumber: '01XXXXXXXXX',
    nagadNumber: '01XXXXXXXXX',
    binancePayId: '12345678',

    // Customizable Bot Messages (A to Z)
    forceSubMessage: '👋 Hey! {name} Please Join our Official channel to access this bot ❗',
    joinChannelBtnText: '▶️ {shop_name}',
    verifyJoinedBtnText: '✨ I Have Joined',

    welcomeMessage: 'Welcome to {shop_name} 🎉\n👋 Hello! {name}\n\n📌 Account Details\n💳 Telegram ID: {user_id}\n💰 Balance: ${balance}\n\nChoose below 🔹',
    shopMessage: '🛒 Available Products\n⬇️ Choose an option to buy:',
    walletMessage: '💲 Wallet\n\n🪙 Current Balance: ${balance}\n\n"You can add balance to your wallet and use it to purchase products directly!"',

    // Button Labels & Native Telegram Color Styles ('primary' = Blue, 'success' = Green, 'danger' = Red)
    btnShopText: '🛒 Shop',
    btnShopStyle: 'primary',
    btnWalletText: '💰 Wallet',
    btnWalletStyle: 'primary',
    btnOrderHistoryText: '🧾 Order History',
    btnOrderHistoryStyle: 'primary',
    btnMyOrdersText: '📦 My Orders',
    btnMyOrdersStyle: 'primary',
    btnReferText: '💸 Refer & Earn',
    btnReferStyle: 'success',
    btnProfileText: '🛡️ Profile',
    btnProfileStyle: 'primary',
    btnSupportText: '🗣️ Support',
    btnSupportStyle: 'success',
    btnAboutText: 'ℹ️ About',
    btnAboutStyle: 'primary',
  });

  const [botHeartbeat, setBotHeartbeat] = useState<any>(null);
  const [copiedPing, setCopiedPing] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const configRef = ref(rtdb, 'settings/bot_config');
    // Ultra-fast Realtime Database listener
    const unsubscribeConfig = onValue(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        setConfig((prev) => ({ ...prev, ...val }));
      }
      setLoading(false);
    }, (error) => {
      console.error('RTDB Load Error:', error);
      setLoading(false);
    });

    // Listen to live bot heartbeat
    const heartbeatRef = ref(rtdb, 'status/heartbeat');
    const unsubscribeHeartbeat = onValue(heartbeatRef, (snapshot) => {
      if (snapshot.exists()) {
        setBotHeartbeat(snapshot.val());
      }
    });

    return () => {
      unsubscribeConfig();
      unsubscribeHeartbeat();
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const configRef = ref(rtdb, 'settings/bot_config');
      await set(configRef, {
        ...config,
        updatedAt: new Date().toISOString(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(`Error updating settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const getStyleColorClass = (style: string) => {
    if (style === 'success') return 'bg-emerald-600/30 text-emerald-400 border-emerald-500/40';
    if (style === 'danger') return 'bg-red-600/30 text-red-400 border-red-500/40';
    return 'bg-blue-600/30 text-blue-400 border-blue-500/40';
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="pb-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Full Bot & Appearance Studio
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Super fast real-time sync via Firebase Realtime Database. All changes reflect in the bot in milliseconds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saved && (
            <Badge variant="success" className="gap-1.5 py-1 px-3">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              Saved Instantly to Firebase!
            </Badge>
          )}
          <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2 font-semibold">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save All Changes'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
          <RadioTower className="w-4 h-4 animate-spin text-primary" />
          Loading settings from Firebase...
        </div>
      ) : (
        <form onSubmit={handleSave}>
          <Tabs defaultValue="channel" className="w-full">
            <TabsList className="grid w-full grid-cols-5 max-w-2xl mb-6">
              <TabsTrigger value="channel" className="gap-1.5">
                <Bot className="w-3.5 h-3.5" />
                Channel & Shop
              </TabsTrigger>
              <TabsTrigger value="texts" className="gap-1.5">
                <Type className="w-3.5 h-3.5" />
                Messages (A-Z)
              </TabsTrigger>
              <TabsTrigger value="buttons" className="gap-1.5">
                <Palette className="w-3.5 h-3.5" />
                Buttons & Colors
              </TabsTrigger>
              <TabsTrigger value="payments" className="gap-1.5">
                <Wallet className="w-3.5 h-3.5" />
                Payments
              </TabsTrigger>
              <TabsTrigger value="cron" className="gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                24/7 Uptime & Cron
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Channel & Shop */}
            <TabsContent value="channel" className="space-y-5">
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="text-sm">Official Telegram Channel & Identity</CardTitle>
                  <CardDescription>Configure mandatory channel force-join & customer support</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-foreground mb-1">
                        Shop Brand Name
                      </label>
                      <Input
                        required
                        value={config.shopName}
                        onChange={(e) => setConfig({ ...config, shopName: e.target.value })}
                        placeholder="Nurms Shop"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-foreground mb-1">
                        Bot Username / Link
                      </label>
                      <Input
                        required
                        value={config.botLink}
                        onChange={(e) => setConfig({ ...config, botLink: e.target.value })}
                        placeholder="@NurmsBOT"
                        className="font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-foreground mb-1">
                        Force-Join Telegram Channel Username
                      </label>
                      <Input
                        required
                        value={config.channelId}
                        onChange={(e) => setConfig({ ...config, channelId: e.target.value })}
                        placeholder="@owloverdown"
                        className="font-mono text-primary font-bold"
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        ⚠️ Ensure your bot is an <b>Administrator</b> in this channel!
                      </p>
                    </div>

                    <div>
                      <label className="block font-semibold text-foreground mb-1">
                        Official Channel Link
                      </label>
                      <Input
                        required
                        value={config.channelLink}
                        onChange={(e) => setConfig({ ...config, channelLink: e.target.value })}
                        placeholder="https://t.me/owloverdown"
                        className="font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-foreground mb-1">
                      Support Agent Username
                    </label>
                    <Input
                      required
                      value={config.supportUsername}
                      onChange={(e) => setConfig({ ...config, supportUsername: e.target.value })}
                      placeholder="@owloverdown"
                      className="font-mono"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: Bot Messages (A to Z Editor) */}
            <TabsContent value="texts" className="space-y-5">
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="text-sm">Welcome & Screen Greetings</CardTitle>
                  <CardDescription>
                    Available dynamic tags: <code className="text-primary font-mono font-bold">{"{name}"}</code>, <code className="text-primary font-mono font-bold">{"{shop_name}"}</code>, <code className="text-primary font-mono font-bold">{"{user_id}"}</code>, <code className="text-primary font-mono font-bold">{"{balance}"}</code>.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  {/* Force Sub Message */}
                  <div>
                    <label className="block font-semibold text-foreground mb-1">
                      1. Force-Join Channel Message (Screen 1 - When user hasn't joined channel)
                    </label>
                    <textarea
                      rows={2}
                      value={config.forceSubMessage}
                      onChange={(e) => setConfig({ ...config, forceSubMessage: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-foreground mb-1">
                        Channel Link Button Label (Screen 1)
                      </label>
                      <Input
                        value={config.joinChannelBtnText}
                        onChange={(e) => setConfig({ ...config, joinChannelBtnText: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-foreground mb-1">
                        "I Have Joined" Verification Button Label
                      </label>
                      <Input
                        value={config.verifyJoinedBtnText}
                        onChange={(e) => setConfig({ ...config, verifyJoinedBtnText: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Main Menu Welcome Message */}
                  <div>
                    <label className="block font-semibold text-foreground mb-1">
                      2. Main Menu Greeting & Account Info (Screen 2)
                    </label>
                    <textarea
                      rows={5}
                      value={config.welcomeMessage}
                      onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    />
                  </div>

                  {/* Shop Message */}
                  <div>
                    <label className="block font-semibold text-foreground mb-1">
                      3. Shop Catalog Header Text (Screen 3)
                    </label>
                    <textarea
                      rows={2}
                      value={config.shopMessage}
                      onChange={(e) => setConfig({ ...config, shopMessage: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    />
                  </div>

                  {/* Wallet Message */}
                  <div>
                    <label className="block font-semibold text-foreground mb-1">
                      4. Wallet Overview Text (Screen 4)
                    </label>
                    <textarea
                      rows={3}
                      value={config.walletMessage}
                      onChange={(e) => setConfig({ ...config, walletMessage: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: Buttons & Colors */}
            <TabsContent value="buttons" className="space-y-5">
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="text-sm">Telegram Button Labels & Native Colors</CardTitle>
                  <CardDescription>
                    Configure the exact texts and background colors for all 8 Main Menu buttons. 
                    <br />
                    Colors use Telegram Bot API 9.4+ native styles: <b>Primary (Blue)</b>, <b>Success (Green)</b>, or <b>Danger (Red)</b>.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Row 1 */}
                    <div className="p-3.5 rounded-xl border bg-secondary/30 space-y-2">
                      <div className="font-semibold text-foreground flex items-center justify-between">
                        <span>Button 1: Shop</span>
                        <Badge className={getStyleColorClass(config.btnShopStyle)}>{config.btnShopStyle}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={config.btnShopText}
                          onChange={(e) => setConfig({ ...config, btnShopText: e.target.value })}
                          placeholder="🛒 Shop"
                        />
                        <select
                          value={config.btnShopStyle}
                          onChange={(e) => setConfig({ ...config, btnShopStyle: e.target.value })}
                          className="h-9 rounded-lg border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="primary">Primary (Blue)</option>
                          <option value="success">Success (Green)</option>
                          <option value="danger">Danger (Red)</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl border bg-secondary/30 space-y-2">
                      <div className="font-semibold text-foreground flex items-center justify-between">
                        <span>Button 2: Wallet</span>
                        <Badge className={getStyleColorClass(config.btnWalletStyle)}>{config.btnWalletStyle}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={config.btnWalletText}
                          onChange={(e) => setConfig({ ...config, btnWalletText: e.target.value })}
                          placeholder="💰 Wallet"
                        />
                        <select
                          value={config.btnWalletStyle}
                          onChange={(e) => setConfig({ ...config, btnWalletStyle: e.target.value })}
                          className="h-9 rounded-lg border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="primary">Primary (Blue)</option>
                          <option value="success">Success (Green)</option>
                          <option value="danger">Danger (Red)</option>
                        </select>
                      </div>
                    </div>

                    {/* Row 2 */}
                    <div className="p-3.5 rounded-xl border bg-secondary/30 space-y-2">
                      <div className="font-semibold text-foreground flex items-center justify-between">
                        <span>Button 3: Order History</span>
                        <Badge className={getStyleColorClass(config.btnOrderHistoryStyle)}>{config.btnOrderHistoryStyle}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={config.btnOrderHistoryText}
                          onChange={(e) => setConfig({ ...config, btnOrderHistoryText: e.target.value })}
                        />
                        <select
                          value={config.btnOrderHistoryStyle}
                          onChange={(e) => setConfig({ ...config, btnOrderHistoryStyle: e.target.value })}
                          className="h-9 rounded-lg border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="primary">Primary (Blue)</option>
                          <option value="success">Success (Green)</option>
                          <option value="danger">Danger (Red)</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl border bg-secondary/30 space-y-2">
                      <div className="font-semibold text-foreground flex items-center justify-between">
                        <span>Button 4: My Orders</span>
                        <Badge className={getStyleColorClass(config.btnMyOrdersStyle)}>{config.btnMyOrdersStyle}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={config.btnMyOrdersText}
                          onChange={(e) => setConfig({ ...config, btnMyOrdersText: e.target.value })}
                        />
                        <select
                          value={config.btnMyOrdersStyle}
                          onChange={(e) => setConfig({ ...config, btnMyOrdersStyle: e.target.value })}
                          className="h-9 rounded-lg border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="primary">Primary (Blue)</option>
                          <option value="success">Success (Green)</option>
                          <option value="danger">Danger (Red)</option>
                        </select>
                      </div>
                    </div>

                    {/* Row 3 */}
                    <div className="p-3.5 rounded-xl border bg-secondary/30 space-y-2">
                      <div className="font-semibold text-foreground flex items-center justify-between">
                        <span>Button 5: Refer & Earn</span>
                        <Badge className={getStyleColorClass(config.btnReferStyle)}>{config.btnReferStyle}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={config.btnReferText}
                          onChange={(e) => setConfig({ ...config, btnReferText: e.target.value })}
                        />
                        <select
                          value={config.btnReferStyle}
                          onChange={(e) => setConfig({ ...config, btnReferStyle: e.target.value })}
                          className="h-9 rounded-lg border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="success">Success (Green)</option>
                          <option value="primary">Primary (Blue)</option>
                          <option value="danger">Danger (Red)</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl border bg-secondary/30 space-y-2">
                      <div className="font-semibold text-foreground flex items-center justify-between">
                        <span>Button 6: Profile</span>
                        <Badge className={getStyleColorClass(config.btnProfileStyle)}>{config.btnProfileStyle}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={config.btnProfileText}
                          onChange={(e) => setConfig({ ...config, btnProfileText: e.target.value })}
                        />
                        <select
                          value={config.btnProfileStyle}
                          onChange={(e) => setConfig({ ...config, btnProfileStyle: e.target.value })}
                          className="h-9 rounded-lg border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="primary">Primary (Blue)</option>
                          <option value="success">Success (Green)</option>
                          <option value="danger">Danger (Red)</option>
                        </select>
                      </div>
                    </div>

                    {/* Row 4 */}
                    <div className="p-3.5 rounded-xl border bg-secondary/30 space-y-2">
                      <div className="font-semibold text-foreground flex items-center justify-between">
                        <span>Button 7: Support</span>
                        <Badge className={getStyleColorClass(config.btnSupportStyle)}>{config.btnSupportStyle}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={config.btnSupportText}
                          onChange={(e) => setConfig({ ...config, btnSupportText: e.target.value })}
                        />
                        <select
                          value={config.btnSupportStyle}
                          onChange={(e) => setConfig({ ...config, btnSupportStyle: e.target.value })}
                          className="h-9 rounded-lg border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="success">Success (Green)</option>
                          <option value="primary">Primary (Blue)</option>
                          <option value="danger">Danger (Red)</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl border bg-secondary/30 space-y-2">
                      <div className="font-semibold text-foreground flex items-center justify-between">
                        <span>Button 8: About</span>
                        <Badge className={getStyleColorClass(config.btnAboutStyle)}>{config.btnAboutStyle}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={config.btnAboutText}
                          onChange={(e) => setConfig({ ...config, btnAboutText: e.target.value })}
                        />
                        <select
                          value={config.btnAboutStyle}
                          onChange={(e) => setConfig({ ...config, btnAboutStyle: e.target.value })}
                          className="h-9 rounded-lg border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="primary">Primary (Blue)</option>
                          <option value="success">Success (Green)</option>
                          <option value="danger">Danger (Red)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Stock Color Automation Banner */}
                  <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-1 mt-4">
                    <div className="flex items-center gap-2 font-semibold text-emerald-400">
                      <Sparkles className="w-4 h-4" />
                      Dynamic Product Stock Color System (Active)
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      In the Telegram <b>🛒 Shop</b> menu: Products with <b>Stock &gt; 0</b> automatically show as <b className="text-emerald-400">Green (Success Style)</b>, and products with <b>0 Stock</b> automatically show as <b className="text-red-400">Red (Danger Style)</b>. Exactly matching your design!
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 4: Payment Numbers */}
            <TabsContent value="payments" className="space-y-5">
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="text-sm">Manual Wallet Deposit Details</CardTitle>
                  <CardDescription>
                    These numbers and IDs will be shown to users when they tap <b>💰 Deposit</b> in the Telegram Bot.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-foreground mb-1">
                        bKash Personal / Send Money Number
                      </label>
                      <Input
                        value={config.bkashNumber || ''}
                        onChange={(e) => setConfig({ ...config, bkashNumber: e.target.value })}
                        placeholder="01XXXXXXXXX"
                        className="font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-foreground mb-1">
                        Nagad Personal Number
                      </label>
                      <Input
                        value={config.nagadNumber || ''}
                        onChange={(e) => setConfig({ ...config, nagadNumber: e.target.value })}
                        placeholder="01XXXXXXXXX"
                        className="font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-foreground mb-1">
                      Binance Pay ID / USDT (TRC20) Wallet Address
                    </label>
                    <Input
                      value={config.binancePayId || ''}
                      onChange={(e) => setConfig({ ...config, binancePayId: e.target.value })}
                      placeholder="e.g. 123456789 or T9yD14Nj9y..."
                      className="font-mono"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 5: 24/7 Uptime & Cron */}
            <TabsContent value="cron" className="space-y-5">
              {/* Bot Status Banner */}
              <Card className="glass-panel border-emerald-500/20 bg-emerald-950/10">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-3 w-3 relative">
                      {botHeartbeat?.timestamp && Date.now() - botHeartbeat.timestamp < 90000 ? (
                        <>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </>
                      ) : (
                        <span className="inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                      )}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        {botHeartbeat?.timestamp && Date.now() - botHeartbeat.timestamp < 90000
                          ? 'Bot is Online & Active (24/7)'
                          : 'Bot is Idle / Awaiting Ping'}
                      </h3>
                      <p className="text-xs text-muted-foreground font-mono">
                        {botHeartbeat?.timestamp
                          ? `Last Heartbeat: ${new Date(botHeartbeat.timestamp).toLocaleTimeString()} • Uptime: ${Math.floor((botHeartbeat.uptime_seconds || 0) / 3600)}h ${Math.floor(((botHeartbeat.uptime_seconds || 0) % 3600) / 60)}m`
                          : 'Waiting for bot to start or Render service to deploy'}
                      </p>
                    </div>
                  </div>

                  <Link href="/uptime">
                    <Button type="button" variant="outline" size="sm" className="gap-2 text-xs">
                      <Activity className="w-3.5 h-3.5 text-emerald-400" />
                      Open Full Telemetry Dashboard
                      <ExternalLink className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Keep-Alive Configuration Card */}
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    Render 24/7 Keep-Alive & Self-Ping Configuration
                  </CardTitle>
                  <CardDescription>
                    Render free tier sleeps after 15 minutes of inactivity. Configure the keep-alive loop so it stays awake 24/7 forever.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-foreground mb-1">
                      Render Web Service URL (Your Bot URL)
                    </label>
                    <Input
                      value={config.selfPingUrl || ''}
                      onChange={(e) => setConfig({ ...config, selfPingUrl: e.target.value })}
                      placeholder="https://your-bot-name.onrender.com"
                      className="font-mono text-primary"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Paste the URL assigned by Render (e.g. <code>https://nurmsbot.onrender.com</code>).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-foreground mb-1">
                        Automated Self-Ping Loop
                      </label>
                      <select
                        value={config.enableSelfPing ? 'true' : 'false'}
                        onChange={(e) => setConfig({ ...config, enableSelfPing: e.target.value === 'true' })}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="true">✅ Enabled (Keep Bot Awake 24/7)</option>
                        <option value="false">❌ Disabled</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-foreground mb-1">
                        Self-Ping Interval
                      </label>
                      <select
                        value={config.pingIntervalMinutes || 10}
                        onChange={(e) => setConfig({ ...config, pingIntervalMinutes: Number(e.target.value) })}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="5">Every 5 Minutes (Best)</option>
                        <option value="10">Every 10 Minutes (Recommended)</option>
                        <option value="14">Every 14 Minutes</option>
                      </select>
                    </div>
                  </div>

                  {/* Copyable Ping URL */}
                  <div className="p-3 rounded-lg border bg-black/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground text-[11px]">Direct Ping Endpoint (For Cron-job.org / UptimeRobot):</span>
                      <Button
                        type="button"
                        onClick={() => {
                          const base = (config.selfPingUrl || 'https://your-bot-name.onrender.com').replace(/\/$/, '');
                          navigator.clipboard.writeText(`${base}/ping`);
                          setCopiedPing(true);
                          setTimeout(() => setCopiedPing(false), 2000);
                        }}
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs gap-1.5 text-primary"
                      >
                        {copiedPing ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedPing ? 'Copied!' : 'Copy Ping URL'}
                      </Button>
                    </div>
                    <code className="block p-2 rounded bg-black/60 font-mono text-[11px] text-emerald-400 border select-all">
                      {((config.selfPingUrl || 'https://your-bot-name.onrender.com').replace(/\/$/, '')) + '/ping'}
                    </code>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      💡 Setting a free cron job on <a href="https://cron-job.org" target="_blank" rel="noreferrer" className="text-primary underline">cron-job.org</a> targeting this URL every 5 or 10 minutes ensures 100% 24/7 uptime without Render ever idling.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bottom Actions */}
            <div className="pt-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono">
                <RadioTower className="w-4 h-4 text-primary animate-pulse" />
                Firebase Realtime Database Active
              </span>

              <Button type="submit" disabled={saving} size="sm" className="gap-2 font-semibold">
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save All Changes'}
              </Button>
            </div>
          </Tabs>
        </form>
      )}
    </div>
  );
}
