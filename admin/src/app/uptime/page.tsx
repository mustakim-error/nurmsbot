'use client';

import React, { useEffect, useState } from 'react';
import { rtdb } from '@/lib/firebase';
import { ref, get, set, onValue } from 'firebase/database';
import { 
  Activity, 
  Zap, 
  Clock, 
  RadioTower, 
  CheckCircle2, 
  AlertCircle, 
  Globe, 
  Copy, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  Save, 
  Server, 
  Cpu, 
  ShieldCheck,
  Send
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface HeartbeatData {
  status?: string;
  last_seen?: string;
  timestamp?: number;
  uptime_seconds?: number;
}

interface PingData {
  timestamp?: number;
  iso?: string;
  ip?: string;
  source?: string;
  target?: string;
  status?: string;
}

export default function UptimePage() {
  const [config, setConfig] = useState({
    selfPingUrl: '',
    enableSelfPing: true,
    pingIntervalMinutes: 10,
  });

  const [heartbeat, setHeartbeat] = useState<HeartbeatData | null>(null);
  const [lastExternalPing, setLastExternalPing] = useState<PingData | null>(null);
  const [lastSelfPing, setLastSelfPing] = useState<PingData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Interactive Live Browser Ping Test
  const [pingTesting, setPingTesting] = useState(false);
  const [pingResult, setPingResult] = useState<{
    success: boolean;
    latency: number;
    message: string;
  } | null>(null);

  // Load Bot Config & Live RTDB Heartbeat
  useEffect(() => {
    // 1. Bot Config
    const configRef = ref(rtdb, 'settings/bot_config');
    const unsubConfig = onValue(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        setConfig((prev) => ({
          ...prev,
          selfPingUrl: val.selfPingUrl || '',
          enableSelfPing: val.enableSelfPing !== false,
          pingIntervalMinutes: val.pingIntervalMinutes || 10,
        }));
      }
    });

    // 2. Real-time Heartbeat
    const heartbeatRef = ref(rtdb, 'status/heartbeat');
    const unsubHeartbeat = onValue(heartbeatRef, (snapshot) => {
      if (snapshot.exists()) {
        setHeartbeat(snapshot.val());
      }
    });

    // 3. Last External Cron Ping
    const externalPingRef = ref(rtdb, 'status/last_external_ping');
    const unsubExternal = onValue(externalPingRef, (snapshot) => {
      if (snapshot.exists()) {
        setLastExternalPing(snapshot.val());
      }
    });

    // 4. Last Self Ping
    const selfPingRef = ref(rtdb, 'status/last_self_ping');
    const unsubSelf = onValue(selfPingRef, (snapshot) => {
      if (snapshot.exists()) {
        setLastSelfPing(snapshot.val());
      }
    });

    return () => {
      unsubConfig();
      unsubHeartbeat();
      unsubExternal();
      unsubSelf();
    };
  }, []);

  const isOnline = heartbeat?.timestamp ? Date.now() - heartbeat.timestamp < 90000 : false;

  const formatUptime = (seconds?: number) => {
    if (!seconds && seconds !== 0) return 'Calculating...';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const getRelativeTime = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (diffSec < 60) return `${diffSec} seconds ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min ago`;
    return `${Math.floor(diffMin / 60)} hours ago`;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const configRef = ref(rtdb, 'settings/bot_config');
      const snap = await get(configRef);
      const existing = snap.exists() ? snap.val() : {};
      
      await set(configRef, {
        ...existing,
        selfPingUrl: config.selfPingUrl.trim(),
        enableSelfPing: config.enableSelfPing,
        pingIntervalMinutes: Number(config.pingIntervalMinutes) || 10,
        updatedAt: new Date().toISOString(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const cleanUrl = config.selfPingUrl?.trim().replace(/\/$/, '') || '';
  const pingUrl = cleanUrl ? `${cleanUrl}/ping` : 'https://your-bot-url.onrender.com/ping';

  const copyPingUrl = () => {
    navigator.clipboard.writeText(pingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const runBrowserPingTest = async () => {
    if (!cleanUrl) {
      alert('Please enter your Render bot URL first (e.g. https://your-bot.onrender.com)');
      return;
    }
    setPingTesting(true);
    setPingResult(null);
    const startTime = performance.now();
    try {
      const res = await fetch(`${cleanUrl}/ping`, { method: 'GET', cache: 'no-store' });
      const latency = Math.round(performance.now() - startTime);
      if (res.ok) {
        const text = await res.text();
        setPingResult({
          success: true,
          latency,
          message: `HTTP ${res.status} OK: "${text.trim() || 'pong'}" received in ${latency}ms! Bot is awake and responding 24/7.`,
        });
      } else {
        setPingResult({
          success: false,
          latency,
          message: `HTTP ${res.status} ${res.statusText}. Response in ${latency}ms.`,
        });
      }
    } catch (err: any) {
      const latency = Math.round(performance.now() - startTime);
      setPingResult({
        success: false,
        latency,
        message: `Connection failed: ${err.message}. If deploying to Render, please wait 1-2 minutes for the service to wake up.`,
      });
    } finally {
      setPingTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div className="pb-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            24/7 Uptime & Cron Command Center
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Keep your Telegram Bot awake on Render Free Tier forever using automated cron jobs & self-pinging.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saved && (
            <Badge variant="success" className="gap-1.5 py-1 px-3">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              Settings Synced Realtime!
            </Badge>
          )}
          <Button 
            onClick={runBrowserPingTest} 
            disabled={pingTesting} 
            variant="outline" 
            size="sm" 
            className="gap-2 text-xs font-semibold"
          >
            <Zap className={`w-3.5 h-3.5 text-amber-400 ${pingTesting ? 'animate-bounce' : ''}`} />
            {pingTesting ? 'Pinging Bot...' : 'Test Bot Ping Now'}
          </Button>
        </div>
      </div>

      {/* Live Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Bot State */}
        <Card className="glass-panel border-emerald-500/20 bg-emerald-950/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Bot Status</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex h-2.5 w-2.5 relative">
                  {isOnline ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </>
                  ) : (
                    <span className="inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  )}
                </span>
                <span className="text-base font-bold text-foreground">
                  {isOnline ? 'Online (24/7)' : 'Idle / Standby'}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Heartbeat: {getRelativeTime(heartbeat?.timestamp)}
              </p>
            </div>
            <Server className={`w-8 h-8 ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`} />
          </CardContent>
        </Card>

        {/* Card 2: Total Uptime */}
        <Card className="glass-panel">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Current Uptime</p>
              <p className="text-base font-bold font-mono text-foreground mt-1">
                {isOnline ? formatUptime(heartbeat?.uptime_seconds) : 'Offline / Paused'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Continuous operation</p>
            </div>
            <Clock className="w-8 h-8 text-primary" />
          </CardContent>
        </Card>

        {/* Card 3: External Cron Ping */}
        <Card className="glass-panel">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">External Cron</p>
              <p className="text-xs font-bold text-foreground mt-1 truncate max-w-[140px]">
                {lastExternalPing ? getRelativeTime(lastExternalPing.timestamp) : 'Awaiting Cron'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 font-mono truncate max-w-[130px]">
                {lastExternalPing?.source || 'cron-job.org / Robot'}
              </p>
            </div>
            <Globe className="w-8 h-8 text-cyan-400" />
          </CardContent>
        </Card>

        {/* Card 4: Built-in Self-Ping */}
        <Card className="glass-panel">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Internal Self-Ping</p>
              <p className="text-xs font-bold text-foreground mt-1 truncate max-w-[140px]">
                {lastSelfPing ? getRelativeTime(lastSelfPing.timestamp) : 'Not Triggered Yet'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Status: {lastSelfPing?.status === 'success' ? '🟢 Active Loop' : 'Configuring'}
              </p>
            </div>
            <RefreshCw className={`w-8 h-8 ${lastSelfPing ? 'text-primary' : 'text-muted-foreground'}`} />
          </CardContent>
        </Card>
      </div>

      {/* Ping Test Banner */}
      {pingResult && (
        <div className={`p-3.5 rounded-lg border text-xs flex items-start justify-between gap-3 ${
          pingResult.success 
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' 
            : 'bg-red-950/30 border-red-500/40 text-red-300'
        }`}>
          <div className="flex items-center gap-2.5">
            {pingResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <div>
              <span className="font-semibold">{pingResult.message}</span>
              <span className="ml-2 px-1.5 py-0.5 rounded bg-black/40 font-mono text-[10px]">
                Latency: {pingResult.latency}ms
              </span>
            </div>
          </div>
          <button onClick={() => setPingResult(null)} className="text-muted-foreground hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* Main Settings & Guides */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Bot Cron Config (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Automated Self-Ping Settings
              </CardTitle>
              <CardDescription>
                Configure the bot to ping itself in the background to prevent Render sleep mode.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    Render Web Service URL (Your Bot URL)
                  </label>
                  <Input
                    value={config.selfPingUrl}
                    onChange={(e) => setConfig({ ...config, selfPingUrl: e.target.value })}
                    placeholder="https://your-bot-name.onrender.com"
                    className="font-mono text-xs text-primary"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    💡 Get this URL from your Render Dashboard under your Web Service.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-foreground mb-1">
                      Self-Ping Loop
                    </label>
                    <select
                      value={config.enableSelfPing ? 'true' : 'false'}
                      onChange={(e) => setConfig({ ...config, enableSelfPing: e.target.value === 'true' })}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="true">✅ Enabled (Keep Alive)</option>
                      <option value="false">❌ Disabled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-foreground mb-1">
                      Ping Interval
                    </label>
                    <select
                      value={config.pingIntervalMinutes}
                      onChange={(e) => setConfig({ ...config, pingIntervalMinutes: Number(e.target.value) })}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="5">Every 5 Minutes (Best)</option>
                      <option value="10">Every 10 Minutes (Recommended)</option>
                      <option value="14">Every 14 Minutes</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t">
                  <span className="text-[11px] text-muted-foreground">
                    Render free sleep limit is 15 min.
                  </span>
                  <Button type="submit" disabled={saving} size="sm" className="gap-2 font-semibold">
                    <Save className="w-3.5 h-3.5" />
                    {saving ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Quick Copyable Ping Endpoint */}
          <Card className="glass-panel border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold flex items-center justify-between">
                <span>Direct Cron Ping Endpoint</span>
                <Badge variant="outline" className="text-[10px] font-mono">GET /ping</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <code className="p-2 rounded bg-black/50 border flex-1 font-mono text-[11px] text-primary truncate select-all">
                  {pingUrl}
                </code>
                <Button onClick={copyPingUrl} size="sm" variant="outline" className="shrink-0 gap-1.5">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Send a <code>GET</code> request to this URL every 5 or 10 minutes from external cron services to guarantee 100% 24/7 uptime.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right: Step-by-Step 24/7 Free Cron Setup (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="glass-panel">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Free 24/7 Cron Setup Instructions
                </CardTitle>
                <Badge variant="secondary" className="text-[10px]">100% Free Forever</Badge>
              </div>
              <CardDescription>
                Render free tier goes to sleep after 15 minutes of inactivity. Use either method below to keep it running 24/7.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {/* Method 1: Cron-job.org */}
              <div className="p-3.5 rounded-lg border border-border bg-card/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">1</span>
                    Recommended: cron-job.org (Easy & Reliable)
                  </span>
                  <a 
                    href="https://cron-job.org" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-primary hover:underline flex items-center gap-1 text-[11px]"
                  >
                    Open cron-job.org <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[11px] leading-relaxed pl-1">
                  <li>Go to <a href="https://cron-job.org" target="_blank" rel="noreferrer" className="text-foreground underline">cron-job.org</a> and sign up for a free account.</li>
                  <li>Click on <b>Cronjobs</b> &rarr; <b>Create Cronjob</b>.</li>
                  <li>Title: <code className="bg-muted px-1 rounded">Nurms Bot Keep-Alive</code></li>
                  <li>URL: Paste your ping URL: <code className="bg-muted px-1 rounded text-primary">{pingUrl}</code></li>
                  <li>Execution Schedule: Select <b>Every 5 minutes</b> or <b>Every 10 minutes</b>.</li>
                  <li>Click <b>Create</b>. That's it! Your bot will never sleep again!</li>
                </ol>
              </div>

              {/* Method 2: UptimeRobot */}
              <div className="p-3.5 rounded-lg border border-border bg-card/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold">2</span>
                    Alternative: UptimeRobot (Free Monitoring + Alerts)
                  </span>
                  <a 
                    href="https://uptimerobot.com" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px]"
                  >
                    Open UptimeRobot <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[11px] leading-relaxed pl-1">
                  <li>Visit <a href="https://uptimerobot.com" target="_blank" rel="noreferrer" className="text-foreground underline">uptimerobot.com</a> and create a free account.</li>
                  <li>Click <b>+ Add New Monitor</b>.</li>
                  <li>Monitor Type: <b>HTTP(s)</b>. Friendly Name: <code>Nurms Telegram Bot</code>.</li>
                  <li>URL (or IP): Paste <code className="bg-muted px-1 rounded text-primary">{pingUrl}</code>.</li>
                  <li>Monitoring Interval: Set to <b>5 minutes</b>.</li>
                  <li>Click <b>Create Monitor</b>. You get 24/7 keep-alive and free downtime alerts!</li>
                </ol>
              </div>

              {/* Method 3: Built-in Self-Ping */}
              <div className="p-3.5 rounded-lg border border-border bg-card/60 space-y-2">
                <span className="font-bold text-foreground flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">3</span>
                  Zero-Config: Built-in Self-Ping
                </span>
                <p className="text-[11px] text-muted-foreground leading-relaxed pl-1">
                  If you enter your Render Web Service URL on the left and leave <b>Self-Ping Loop: Enabled</b>, the bot process will automatically ping its own <code>/ping</code> endpoint every 10 minutes. However, adding <b>cron-job.org</b> as well is highly recommended as a fail-safe!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
