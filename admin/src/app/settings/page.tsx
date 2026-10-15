'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Settings, Save, Check, Bot, Radio, RadioTower, ShieldCheck, Wallet, MessageSquare } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function SettingsPage() {
  const [config, setConfig] = useState({
    shopName: 'Warzone Shop',
    channelId: '@WarzoneShop',
    channelLink: 'https://t.me/WarzoneShop',
    supportUsername: '@mustakim_support',
    bkashNumber: '01XXXXXXXXX',
    nagadNumber: '01XXXXXXXXX',
    binancePayId: '12345678',
  });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      try {
        const docRef = doc(db, 'settings', 'bot_config');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setConfig((prev) => ({ ...prev, ...(snap.data() as any) }));
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'settings', 'bot_config'), {
        ...config,
        updatedAt: new Date().toISOString(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(`Error updating settings: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-4 border-b">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          Bot & Channel Configuration
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configurations update the Telegram Bot in <b>realtime</b> via Firebase Firestore without restarting.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground text-xs">
          Loading settings from Firebase...
        </div>
      ) : (
        <form onSubmit={handleSave}>
          <Tabs defaultValue="bot" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-sm mb-4">
              <TabsTrigger value="bot" className="gap-2">
                <Bot className="w-3.5 h-3.5" />
                Telegram Bot
              </TabsTrigger>
              <TabsTrigger value="payments" className="gap-2">
                <Wallet className="w-3.5 h-3.5" />
                Deposit Methods
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Bot Settings */}
            <TabsContent value="bot">
              <Card className="glass-panel">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm">Store & Channel Parameters</CardTitle>
                      <CardDescription>Configure force-subscription and official branding</CardDescription>
                    </div>
                    <Badge variant="success" className="gap-1 font-mono text-[10px]">
                      <RadioTower className="w-3 h-3 animate-pulse" />
                      Live Listener
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 text-xs">
                  <div>
                    <label className="block font-medium text-foreground mb-1">
                      Store Name (Shown on Bot Welcome & Menus)
                    </label>
                    <Input
                      required
                      value={config.shopName}
                      onChange={(e) => setConfig({ ...config, shopName: e.target.value })}
                      placeholder="Warzone Shop"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-medium text-foreground mb-1">
                        Force-Join Telegram Channel Username / ID
                      </label>
                      <Input
                        required
                        value={config.channelId}
                        onChange={(e) => setConfig({ ...config, channelId: e.target.value })}
                        placeholder="@WarzoneShop or -100xxxxxxx"
                        className="font-mono"
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        ⚠️ Ensure your bot is an <b>Administrator</b> in this channel!
                      </p>
                    </div>

                    <div>
                      <label className="block font-medium text-foreground mb-1">
                        Channel Invite Link
                      </label>
                      <Input
                        required
                        type="url"
                        value={config.channelLink}
                        onChange={(e) => setConfig({ ...config, channelLink: e.target.value })}
                        placeholder="https://t.me/WarzoneShop"
                        className="font-mono"
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Direct button URL in the /start force-subscription message.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-foreground mb-1">
                      Official Support Agent Handle
                    </label>
                    <Input
                      required
                      value={config.supportUsername}
                      onChange={(e) => setConfig({ ...config, supportUsername: e.target.value })}
                      placeholder="@mustakim_support"
                      className="font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Customers who click "Support" or "Deposit" will be forwarded here.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 2: Deposit Methods */}
            <TabsContent value="payments">
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="text-sm">Manual Deposit Channels</CardTitle>
                  <CardDescription>
                    Numbers and IDs displayed to users when they tap <b>Deposit</b> in the Telegram bot
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-medium text-foreground mb-1">
                        bKash Personal / Merchant Number
                      </label>
                      <Input
                        value={config.bkashNumber || ''}
                        onChange={(e) => setConfig({ ...config, bkashNumber: e.target.value })}
                        placeholder="01XXXXXXXXX"
                        className="font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-foreground mb-1">
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
                    <label className="block font-medium text-foreground mb-1">
                      Binance Pay ID / USDT TRC20 Address
                    </label>
                    <Input
                      value={config.binancePayId || ''}
                      onChange={(e) => setConfig({ ...config, binancePayId: e.target.value })}
                      placeholder="Binance Pay ID or USDT address"
                      className="font-mono"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Save Button Row */}
            <div className="pt-4 flex items-center justify-between">
              {saved ? (
                <Badge variant="success" className="gap-1.5 py-1 px-3">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Configuration saved & live synced to Telegram!
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Changes take effect immediately across all active Telegram sessions.
                </span>
              )}

              <Button type="submit" size="sm" className="gap-2 font-semibold">
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </div>
          </Tabs>
        </form>
      )}
    </div>
  );
}
