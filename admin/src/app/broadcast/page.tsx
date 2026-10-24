'use client';

import React, { useEffect, useState } from 'react';
import { rtdb } from '@/lib/firebase';
import { ref, onValue, remove } from 'firebase/database';
import { 
  Megaphone, 
  Send, 
  Users, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Eye, 
  RotateCcw, 
  Radio, 
  Flame, 
  ShoppingBag, 
  Coins, 
  ShieldCheck, 
  ExternalLink,
  ChevronRight,
  Info,
  Check,
  X,
  Trash2,
  Copy
} from 'lucide-react';
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

interface BroadcastRecord {
  id: string;
  message: string;
  photoUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
  targetAudience: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  blockedCount: number;
  status: 'in_progress' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
}

interface UserSummary {
  id: string;
  name: string;
  balance: number;
}

// Preset Quick Templates
const BROADCAST_TEMPLATES = [
  {
    name: '📢 Announcement',
    icon: Megaphone,
    message: '🎉 *Important Update from Nurms Shop!*\n\nHello {name},\nWe have updated our catalog with fresh accounts and instant auto-delivery.\n\n✨ *What is new:*\n• Fast on-chain crypto payment verification\n• Instant wallet balance crediting\n• 24/7 automated order delivery\n\nThank you for choosing us!',
    photoUrl: '',
    buttonText: '🛒 Open Shop',
    buttonUrl: 'https://t.me/NurmsBOT?start=shop'
  },
  {
    name: '🔥 Flash Sale',
    icon: Flame,
    message: '🔥 *FLASH SALE — LIMITED TIME ONLY!*\n\nHey {name}! For the next 24 hours, enjoy special discounted prices on all digital products.\n\n🪙 *Your Current Balance:* ${balance}\n\nDon\'t miss out on these exclusive deals before stock runs out!',
    photoUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=800&q=80',
    buttonText: '⚡ Claim Deals Now',
    buttonUrl: 'https://t.me/NurmsBOT?start=shop'
  },
  {
    name: '📦 New Stock Added',
    icon: ShoppingBag,
    message: '📦 *Fresh Stock Has Arrived!*\n\nHello {name},\nWe just restocked our top trending products. All items are 100% verified and ready for instant automated dispatch!\n\nCheck them out in the bot right now.',
    photoUrl: '',
    buttonText: '🛒 View Products',
    buttonUrl: 'https://t.me/NurmsBOT?start=shop'
  },
  {
    name: '💰 Deposit Bonus',
    icon: Coins,
    message: '💰 *Special Deposit Bonus Active!*\n\nHey {name}!\nTop up your wallet today via *Binance Pay, Bybit, or USDT (BEP20)* and enjoy fast automatic verification in under 3 seconds.\n\n🪙 *Your Current Balance:* ${balance}',
    photoUrl: '',
    buttonText: '💳 Add Balance',
    buttonUrl: 'https://t.me/NurmsBOT?start=wallet'
  }
];

export default function BroadcastPage() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [history, setHistory] = useState<BroadcastRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Form State
  const [message, setMessage] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all' | 'has_balance' | 'test'>('all');
  const [testChatId, setTestChatId] = useState('');
  const [pinMessage, setPinMessage] = useState(false);

  // Sending & Progress State
  const [isSending, setIsSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activeBroadcastId, setActiveBroadcastId] = useState<string | null>(null);
  const [activeProgress, setActiveProgress] = useState<BroadcastRecord | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load registered users and broadcast history from Firebase RTDB
  useEffect(() => {
    const usersRef = ref(rtdb, 'users');
    const unsubUsers = onValue(usersRef, (snapshot) => {
      const list: UserSummary[] = [];
      if (snapshot.exists()) {
        const val = snapshot.val();
        for (const [key, item] of Object.entries(val)) {
          const u = item as any;
          list.push({
            id: u.telegram_id ? String(u.telegram_id) : key,
            name: u.name || 'Member',
            balance: Number(u.balance || 0)
          });
        }
      }
      setUsers(list);
      setLoadingUsers(false);
    });

    const bcastRef = ref(rtdb, 'broadcasts');
    const unsubBcast = onValue(bcastRef, (snapshot) => {
      const list: BroadcastRecord[] = [];
      if (snapshot.exists()) {
        const val = snapshot.val();
        for (const [key, item] of Object.entries(val)) {
          list.push({ id: key, ...(item as any) });
        }
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      }
      setHistory(list);
    });

    return () => {
      unsubUsers();
      unsubBcast();
    };
  }, []);

  // Listen to active broadcast progress
  useEffect(() => {
    if (!activeBroadcastId) return;
    const progressRef = ref(rtdb, `broadcasts/${activeBroadcastId}`);
    const unsub = onValue(progressRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val() as BroadcastRecord;
        setActiveProgress(data);
        if (data.status === 'completed') {
          setIsSending(false);
          setSuccessModalOpen(true);
        }
      }
    });

    return () => unsub();
  }, [activeBroadcastId]);

  const allCount = users.length;
  const balanceCount = users.filter((u) => u.balance > 0).length;

  const currentAudienceCount = targetAudience === 'all' 
    ? allCount 
    : targetAudience === 'has_balance' 
    ? balanceCount 
    : 1;

  // Insert formatting tag at cursor
  const handleInsertTag = (tag: string) => {
    setMessage((prev) => prev + tag);
  };

  const handleApplyTemplate = (tpl: typeof BROADCAST_TEMPLATES[0]) => {
    setMessage(tpl.message);
    setPhotoUrl(tpl.photoUrl);
    setButtonText(tpl.buttonText);
    setButtonUrl(tpl.buttonUrl);
  };

  const handleExecuteBroadcast = async () => {
    setConfirmOpen(false);
    setIsSending(true);

    try {
      const res = await fetch('/api/broadcast/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          photoUrl: photoUrl.trim() || undefined,
          buttonText: buttonText.trim() || undefined,
          buttonUrl: buttonUrl.trim() || undefined,
          targetAudience,
          testChatId: targetAudience === 'test' ? testChatId.trim() : undefined,
          pinMessage
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(`Broadcast Failed: ${data.error || 'Server error'}`);
        setIsSending(false);
        return;
      }

      setActiveBroadcastId(data.broadcastId);
    } catch (err: any) {
      alert(`Network error during broadcast dispatch: ${err.message}`);
      setIsSending(false);
    }
  };

  const handleDeleteHistory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this broadcast record?')) return;
    try {
      await remove(ref(rtdb, `broadcasts/${id}`));
    } catch (err: any) {
      alert(`Error deleting record: ${err.message}`);
    }
  };

  const handleCopyMessage = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Preview formatted text with Markdown simulator
  const renderSimulatedPreview = (raw: string) => {
    if (!raw) return <span className="text-muted-foreground/60 italic">Type your message on the left to see live preview...</span>;
    
    // Replace mockup variables with sample preview values
    let preview = raw
      .replaceAll('{name}', 'Rahim Khan')
      .replaceAll('{user_id}', '6073706439')
      .replaceAll('{balance}', '15.50');

    // Basic markdown replacements for HTML display
    const lines = preview.split('\n').map((line, idx) => {
      // Bold *text*
      let formatted = line.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
      // Italic _text_
      formatted = formatted.replace(/_(.*?)_/g, '<em>$1</em>');
      // Inline code `code`
      formatted = formatted.replace(/`(.*?)`/g, '<code class="bg-black/30 px-1 py-0.5 rounded text-amber-300 font-mono text-xs">$1</code>');

      return (
        <span 
          key={idx} 
          className="block min-h-[1.2em]" 
          dangerouslySetInnerHTML={{ __html: formatted }} 
        />
      );
    });

    return <div className="space-y-1">{lines}</div>;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            Telegram Broadcast Center
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Blast announcements, promo offers, and updates to all your Telegram bot users instantly.
          </p>
        </div>

        {/* Audience & Status Indicators */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 py-1 px-2.5 bg-primary/5 border-primary/20 text-primary">
            <Users className="w-3.5 h-3.5" />
            <span className="font-semibold">{allCount}</span> Total Users
          </Badge>
          <Badge variant="outline" className="gap-1.5 py-1 px-2.5 bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Delivery Active
          </Badge>
        </div>
      </div>

      {/* Main Grid: Composer on Left, Live Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Composer (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Quick Preset Templates */}
          <Card className="bg-card/40 border-border/50">
            <CardHeader className="py-3 px-4 border-b border-border/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Quick Campaign Templates
                </span>
                <span className="text-[11px] text-muted-foreground">Click to populate</span>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {BROADCAST_TEMPLATES.map((tpl, idx) => {
                  const Icon = tpl.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyTemplate(tpl)}
                      className="flex flex-col items-start gap-1 p-2.5 rounded-lg border border-border/50 bg-background/50 hover:bg-primary/10 hover:border-primary/30 transition-all text-left group"
                    >
                      <Icon className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-medium text-foreground">{tpl.name}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Composer Form Card */}
          <Card className="bg-card/40 border-border/50">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <span>Compose Message</span>
                <Badge variant="secondary" className="font-mono text-[10px]">Markdown Supported</Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Configure your target audience, text, banner image, and interactive CTA button.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {/* Audience Selector */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                  1. Target Audience
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetAudience('all')}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                      targetAudience === 'all'
                        ? 'bg-primary/10 border-primary text-primary font-medium'
                        : 'bg-background/40 border-border/60 hover:border-border text-muted-foreground'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold text-foreground">All Registered</div>
                      <div className="text-[10px] text-muted-foreground">{allCount} Bot Users</div>
                    </div>
                    {targetAudience === 'all' && <Check className="w-4 h-4 text-primary" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetAudience('has_balance')}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                      targetAudience === 'has_balance'
                        ? 'bg-primary/10 border-primary text-primary font-medium'
                        : 'bg-background/40 border-border/60 hover:border-border text-muted-foreground'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold text-foreground">Active Wallet</div>
                      <div className="text-[10px] text-muted-foreground">{balanceCount} with Balance &gt; $0</div>
                    </div>
                    {targetAudience === 'has_balance' && <Check className="w-4 h-4 text-primary" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetAudience('test')}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                      targetAudience === 'test'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-medium'
                        : 'bg-background/40 border-border/60 hover:border-border text-muted-foreground'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold text-foreground">🧪 Test Mode</div>
                      <div className="text-[10px] text-muted-foreground">Send to 1 Admin ID</div>
                    </div>
                    {targetAudience === 'test' && <Check className="w-4 h-4 text-amber-400" />}
                  </button>
                </div>

                {targetAudience === 'test' && (
                  <div className="mt-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-1.5 animate-in fade-in">
                    <label className="text-[11px] font-semibold text-amber-400 block">
                      Admin Telegram ID (Chat ID):
                    </label>
                    <Input
                      placeholder="e.g. 6073706439"
                      value={testChatId}
                      onChange={(e) => setTestChatId(e.target.value)}
                      className="h-8 text-xs bg-background/80"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Enter your Telegram user ID to receive a test preview directly on your phone.
                    </p>
                  </div>
                )}
              </div>

              {/* Formatting Helper Chips */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    2. Message Content
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleInsertTag('*bold*')}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-background border hover:bg-accent text-muted-foreground font-mono"
                      title="Bold"
                    >
                      *B*
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTag('_italic_')}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-background border hover:bg-accent text-muted-foreground font-mono"
                      title="Italic"
                    >
                      _I_
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTag('`code`')}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-background border hover:bg-accent text-muted-foreground font-mono"
                      title="Monospace Code"
                    >
                      `code`
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTag('[Link Text](https://...)\n')}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-background border hover:bg-accent text-muted-foreground font-mono"
                      title="URL Link"
                    >
                      [Link]
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTag('{name}')}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 border border-primary/20 text-primary font-mono"
                      title="Insert User Name"
                    >
                      {'{name}'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTag('${balance}')}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 border border-primary/20 text-primary font-mono"
                      title="Insert User Balance"
                    >
                      {'{balance}'}
                    </button>
                  </div>
                </div>

                <textarea
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your broadcast message here...&#10;&#10;Use *bold*, _italic_, or variables like {name} and {balance}."
                  className="w-full px-3 py-2 text-xs rounded-md bg-background/50 border border-border focus:outline-none focus:ring-1 focus:ring-primary font-sans leading-relaxed resize-y"
                />
                <div className="flex justify-between items-center text-[11px] text-muted-foreground mt-1">
                  <span>Variables: <code className="text-primary">{'{name}'}</code>, <code className="text-primary">{'{balance}'}</code>, <code className="text-primary">{'{user_id}'}</code></span>
                  <span>{message.length} chars</span>
                </div>
              </div>

              {/* Media & Interactive Button Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/40">
                {/* Photo URL */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-primary" />
                    Banner Photo URL (Optional)
                  </label>
                  <Input
                    placeholder="https://example.com/banner.jpg"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    className="h-8 text-xs bg-background/50"
                  />
                </div>

                {/* Pin Message Toggle */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1.5">
                    <Radio className="w-3.5 h-3.5 text-primary" />
                    Delivery Option
                  </label>
                  <label className="flex items-center gap-2 h-8 px-3 rounded-md bg-background/40 border border-border/60 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={pinMessage}
                      onChange={(e) => setPinMessage(e.target.checked)}
                      className="rounded text-primary focus:ring-0"
                    />
                    <span className="text-foreground">Pin Message for Users</span>
                  </label>
                </div>
              </div>

              {/* Interactive Button (CTA) */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-primary" />
                  Interactive CTA Button (Optional)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    placeholder="Button Text (e.g. 🛒 Browse Shop)"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    className="h-8 text-xs bg-background/50"
                  />
                  <Input
                    placeholder="Button URL (e.g. https://t.me/NurmsBOT?start=shop)"
                    value={buttonUrl}
                    onChange={(e) => setButtonUrl(e.target.value)}
                    className="h-8 text-xs bg-background/50"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setMessage('');
                    setPhotoUrl('');
                    setButtonText('');
                    setButtonUrl('');
                  }}
                  className="w-full sm:w-auto text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Clear Form
                </Button>

                <Button
                  type="button"
                  size="sm"
                  disabled={isSending || message.trim().length === 0}
                  onClick={() => setConfirmOpen(true)}
                  className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white shadow-lg shadow-primary/20 text-xs px-6 font-semibold"
                >
                  <Send className="w-3.5 h-3.5 mr-2" />
                  {targetAudience === 'test' 
                    ? 'Send Test Broadcast' 
                    : `Broadcast to ${currentAudienceCount} Users`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Telegram Mobile Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="bg-card/40 border-border/50 sticky top-4">
            <CardHeader className="py-3 px-4 border-b border-border/40 flex flex-row items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-primary" />
                Live Telegram Preview
              </span>
              <Badge variant="outline" className="text-[10px] text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                Real-time Mockup
              </Badge>
            </CardHeader>

            <CardContent className="p-4">
              {/* Telegram Phone Simulation Wrapper */}
              <div className="rounded-2xl border-2 border-slate-800 bg-[#0e1621] p-3 shadow-2xl relative overflow-hidden">
                {/* Telegram Header */}
                <div className="flex items-center gap-2.5 pb-2.5 mb-3 border-b border-white/5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                    N
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-white">Nurms Shop</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">bot</span>
                  </div>
                </div>

                {/* Message Bubble */}
                <div className="space-y-2 max-w-[95%]">
                  <div className="rounded-2xl rounded-tl-sm bg-[#182533] text-white p-3 shadow-md border border-white/5">
                    {/* Banner Image Preview */}
                    {photoUrl && (
                      <div className="mb-2.5 rounded-xl overflow-hidden border border-white/10 max-h-48 bg-black/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={photoUrl} 
                          alt="Banner Preview" 
                          className="w-full object-cover max-h-48"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {/* Formatted Text Content */}
                    <div className="text-xs leading-relaxed font-sans text-slate-100">
                      {renderSimulatedPreview(message)}
                    </div>

                    {/* Message Timestamp & Double Checkmarks */}
                    <div className="flex items-center justify-end gap-1 mt-1.5 text-[10px] text-slate-400 font-mono">
                      <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-sky-400">✓✓</span>
                    </div>
                  </div>

                  {/* Inline Action Button */}
                  {buttonText && (
                    <div className="rounded-xl bg-[#2b5278] hover:bg-[#34628f] text-white py-2 px-3 text-center text-xs font-medium shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                      <span>{buttonText}</span>
                      <ExternalLink className="w-3 h-3 text-slate-300" />
                    </div>
                  )}
                </div>

                {/* Bottom hint */}
                <div className="mt-4 pt-2 border-t border-white/5 text-center">
                  <span className="text-[10px] text-slate-500 font-mono">
                    Live Telegram client rendering simulator
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Broadcast History Table */}
      <Card className="bg-card/40 border-border/50">
        <CardHeader className="py-4 px-6 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Broadcast Campaign History
            </CardTitle>
            <CardDescription className="text-xs">
              Review records of sent broadcast campaigns and delivery performance.
            </CardDescription>
          </div>
          <Badge variant="outline" className="self-start sm:self-auto text-xs">
            {history.length} Campaigns Recorded
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="w-[180px] text-xs">Date & Time</TableHead>
                <TableHead className="text-xs">Campaign Content</TableHead>
                <TableHead className="text-xs">Audience</TableHead>
                <TableHead className="text-xs">Delivery Stats</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-right text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                    No broadcast campaigns sent yet. Send your first broadcast using the composer above!
                  </TableCell>
                </TableRow>
              ) : (
                history.map((record) => {
                  const sent = record.sentCount || 0;
                  const total = record.totalRecipients || 0;
                  const percent = total > 0 ? Math.round((sent / total) * 100) : 0;

                  return (
                    <TableRow key={record.id} className="border-border/40 hover:bg-muted/20">
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {new Date(record.createdAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>

                      <TableCell className="max-w-[280px]">
                        <div className="truncate text-xs font-medium text-foreground">
                          {record.message.slice(0, 70)}...
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                          {record.photoUrl && <span className="text-sky-400">📷 Image Banner</span>}
                          {record.buttonText && <span className="text-amber-400">🔗 {record.buttonText}</span>}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="secondary" className="capitalize text-[10px]">
                          {record.targetAudience === 'all' 
                            ? 'All Users' 
                            : record.targetAudience === 'has_balance' 
                            ? 'Active Balance' 
                            : 'Test Admin'}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="text-xs font-mono font-medium text-foreground">
                          {sent} / {total} <span className="text-muted-foreground text-[10px]">({percent}%)</span>
                        </div>
                        {record.blockedCount > 0 && (
                          <div className="text-[10px] text-red-400">
                            {record.blockedCount} blocked bot
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        {record.status === 'completed' ? (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Completed
                          </Badge>
                        ) : record.status === 'in_progress' ? (
                          <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] gap-1 animate-pulse">
                            <Radio className="w-3 h-3" /> Sending...
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">
                            Failed
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopyMessage(record.message, record.id)}
                            title="Copy message text"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          >
                            {copiedId === record.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteHistory(record.id)}
                            title="Delete record"
                            className="h-7 w-7 text-muted-foreground hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirmation Safeguard Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md bg-[#0e1621] border border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-white">
              <Megaphone className="w-5 h-5 text-primary" />
              Confirm Mass Broadcast
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Please double-check your campaign details before triggering dispatch.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 border-y border-white/5 text-xs">
            <div className="flex justify-between items-center p-2 rounded-lg bg-background/50">
              <span className="text-muted-foreground">Target Recipients:</span>
              <span className="font-bold text-white font-mono">{currentAudienceCount} Users</span>
            </div>

            <div className="flex justify-between items-center p-2 rounded-lg bg-background/50">
              <span className="text-muted-foreground">Audience Filter:</span>
              <span className="capitalize font-semibold text-primary">{targetAudience.replace('_', ' ')}</span>
            </div>

            {photoUrl && (
              <div className="flex justify-between items-center p-2 rounded-lg bg-background/50">
                <span className="text-muted-foreground">Attached Photo:</span>
                <span className="text-sky-400 truncate max-w-[200px]">{photoUrl}</span>
              </div>
            )}

            {buttonText && (
              <div className="flex justify-between items-center p-2 rounded-lg bg-background/50">
                <span className="text-muted-foreground">Button CTA:</span>
                <span className="text-amber-400 font-medium">{buttonText}</span>
              </div>
            )}

            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
              ⚠️ <strong>Safe Delivery:</strong> Messages are sent at ~30 msg/sec to prevent Telegram rate-limiting. Once initiated, dispatch cannot be cancelled.
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteBroadcast}
              className="bg-primary hover:bg-primary/90 text-white font-semibold text-xs px-5 shadow-lg shadow-primary/20"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Yes, Dispatch Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sending Progress Dialog */}
      <Dialog open={isSending} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm bg-[#0e1621] border border-border text-center">
          <div className="py-4 space-y-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary shadow-lg shadow-primary/10 animate-bounce">
              <Megaphone className="w-7 h-7 text-primary" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Broadcasting in Progress...</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Delivering message to registered Telegram bot users.
              </p>
            </div>

            {/* Animated Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5">
                <div 
                  className="bg-gradient-to-r from-primary to-sky-400 h-full rounded-full transition-all duration-300"
                  style={{ 
                    width: `${activeProgress && activeProgress.totalRecipients > 0 
                      ? Math.min(100, Math.round(((activeProgress.sentCount + activeProgress.failedCount) / activeProgress.totalRecipients) * 100))
                      : 15}%` 
                  }}
                />
              </div>

              <div className="flex justify-between text-xs font-mono text-muted-foreground">
                <span>
                  Delivered: <strong className="text-emerald-400">{activeProgress?.sentCount || 0}</strong>
                </span>
                <span>
                  Total: <strong>{activeProgress?.totalRecipients || currentAudienceCount}</strong>
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Notification Dialog */}
      <Dialog open={successModalOpen} onOpenChange={setSuccessModalOpen}>
        <DialogContent className="max-w-sm bg-[#0e1621] border border-emerald-500/30 text-center">
          <div className="py-4 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/10 animate-in zoom-in-50">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Broadcast Completed!</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Your announcement was delivered to all target bot users.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-left text-xs p-3 rounded-lg bg-background/50 font-mono">
              <div>
                <span className="text-muted-foreground block text-[10px]">Successfully Sent:</span>
                <span className="text-emerald-400 font-bold text-sm">{activeProgress?.sentCount || 0}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Blocked / Inactive:</span>
                <span className="text-rose-400 font-bold text-sm">{activeProgress?.blockedCount || 0}</span>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => {
                setSuccessModalOpen(false);
                setActiveBroadcastId(null);
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
