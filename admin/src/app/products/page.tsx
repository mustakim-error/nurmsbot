'use client';

import React, { useEffect, useState } from 'react';
import { rtdb } from '@/lib/firebase';
import { ref, onValue, set, remove, push } from 'firebase/database';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  ShoppingBag, 
  Sparkles, 
  KeyRound, 
  Search,
  CheckCircle2,
  XCircle,
  RadioTower,
  Coins
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
import { BRAND_PRESETS, BrandIcon, resolveTelegramButtonEmoji, VERIFIED_CUSTOM_EMOJIS, EMOJI_GG_CRYPTO_PACK } from '@/lib/brandIcons';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  icon?: string;
  emoji?: string;
  custom_emoji_id?: string;
  description: string;
  payload: string;
  active: boolean;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    stock: 10,
    icon: '✨',
    custom_emoji_id: '',
    description: '',
    payload: '',
    active: true,
  });

  useEffect(() => {
    const prodsRef = ref(rtdb, 'products');
    const unsub = onValue(prodsRef, (snapshot) => {
      const prods: Product[] = [];
      if (snapshot.exists()) {
        const val = snapshot.val();
        for (const [key, item] of Object.entries(val)) {
          prods.push({ id: key, ...(item as any) });
        }
      }
      setProducts(prods);
      setLoading(false);
    }, (error) => {
      console.error('Products load error:', error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      price: 0,
      stock: 10,
      icon: '✨',
      custom_emoji_id: '',
      description: 'Instant automated delivery. 30 Days Replacement Warranty.',
      payload: 'Your login credentials: email@domain.com | pass: Secret1234',
      active: true,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      price: p.price,
      stock: p.stock,
      icon: p.icon || '✨',
      custom_emoji_id: p.custom_emoji_id || '',
      description: p.description || '',
      payload: p.payload || '',
      active: p.active !== undefined ? p.active : true,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      const id = editingProduct ? editingProduct.id : `prod_${Date.now()}`;
      const prodRef = ref(rtdb, `products/${id}`);
      const resolvedEmoji = resolveTelegramButtonEmoji(formData.icon, formData.name);
      await set(prodRef, {
        id: id,
        name: formData.name,
        price: Number(formData.price),
        stock: Number(formData.stock),
        icon: formData.icon || resolvedEmoji || '✨',
        emoji: resolvedEmoji,
        custom_emoji_id: formData.custom_emoji_id?.trim() || '',
        description: formData.description,
        payload: formData.payload,
        active: formData.active,
        updatedAt: new Date().toISOString(),
      });
      setIsDialogOpen(false);
    } catch (err: any) {
      alert(`Error saving product: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await remove(ref(rtdb, `products/${id}`));
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Digital Products & Pricing
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Items added here appear immediately in Telegram Bot <b>🛒 Shop</b> menu.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleOpenAdd} size="sm" className="gap-1.5 font-semibold">
            <Plus className="w-4 h-4" />
            Add New Product
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
          <Input
            placeholder="Search products by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          Total: <b className="text-foreground">{filteredProducts.length}</b> items
        </div>
      </div>

      {/* Products Table Card */}
      <Card className="glass-panel overflow-hidden border">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
            <RadioTower className="w-4 h-4 animate-spin text-primary" />
            Loading products from Realtime Database...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">No digital products found</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Click "Add New Product" to add your digital inventory.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Bot Button Appearance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Auto-Delivery Credentials</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((p) => {
                const inStock = Number(p.stock) > 0;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-semibold text-white text-sm flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-secondary/50 border border-border/70 flex items-center justify-center shrink-0">
                          <BrandIcon icon={p.icon} className="w-4 h-4" />
                        </div>
                        <span>{p.name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{p.description}</div>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-primary">
                      {Number(p.price) === 0 ? 'Free ($0)' : `$${Number(p.price).toFixed(2)}`}
                    </TableCell>
                    <TableCell className="font-mono">
                      <Badge variant={inStock ? "secondary" : "destructive"} className="text-[11px]">
                        {inStock ? `${p.stock} units` : 'Out of stock'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {/* Telegram Native Button Color Preview */}
                      <Badge
                        className={`text-[11px] font-mono gap-1 border ${
                          inStock
                            ? 'bg-emerald-600/30 text-emerald-400 border-emerald-500/40'
                            : 'bg-red-600/30 text-red-400 border-red-500/40'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${inStock ? 'bg-emerald-400' : 'bg-red-400'}`} />
                        {inStock ? 'Green Button (Success)' : 'Red Button (Danger)'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.active ? "success" : "secondary"} className="text-[11px]">
                        {p.active ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Visible in Bot
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-muted-foreground" /> Hidden
                          </span>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground max-w-[180px] truncate">
                      {p.payload || <span className="text-muted-foreground/40 italic">None</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          onClick={() => handleOpenEdit(p)}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(p.id)}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Shadcn Dialog Modal for Add/Edit */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent onClose={() => setIsDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Digital Product' : 'Add New Digital Product'}</DialogTitle>
            <DialogDescription>
              Configure details, button icon, and instant delivery payload for the Telegram Bot.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2 text-xs">
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
                  const isSelected = formData.icon === coin.imageUrl || formData.icon === coin.id;
                  return (
                    <button
                      key={coin.id}
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          name: formData.name ? formData.name : coin.name,
                          icon: coin.imageUrl,
                          custom_emoji_id: coin.custom_emoji_id || formData.custom_emoji_id,
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

            {/* Official Brand SVG Presets */}
            <div>
              <label className="block font-medium text-foreground mb-1.5 text-[11px] text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>⚡ Official SVG Brand Logos (1-Click Fill)</span>
                <span className="text-primary font-mono text-[10px]">Pure Vector SVG</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-28 overflow-y-auto p-1.5 rounded-lg bg-secondary/30 border border-border/70 scrollbar-thin">
                {BRAND_PRESETS.map((bp) => {
                  const isSelected = formData.icon === bp.id;
                  return (
                    <button
                      key={bp.id}
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          name: formData.name ? formData.name : bp.name,
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

            {/* Quick Telegram Button Emojis */}
            <div>
              <label className="block font-medium text-foreground mb-1 text-[11px] text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>⚡ Quick Telegram Emojis (1-Click Pick)</span>
                <span className="text-primary font-mono text-[10px]">Instant Button Icon</span>
              </label>
              <div className="flex flex-wrap gap-1 p-1.5 rounded-lg bg-secondary/30 border border-border/70">
                {['✨', '🤖', '🎬', '🎧', '▶️', '⭐', '👾', '💎', '🔥', '⚡', '👑', '🎮', '🛡️', '💻', '🎨', '📦', '📈', '🟢', '🍎', '🔑'].map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: em })}
                    className={`w-7 h-7 rounded text-sm flex items-center justify-center transition-all ${
                      formData.icon === em ? 'bg-primary text-black font-bold scale-110 shadow' : 'bg-card/70 hover:bg-secondary text-white'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div className="sm:col-span-3">
                <label className="block font-medium text-foreground mb-1">Product Title</label>
                <Input
                  required
                  placeholder="e.g. ChatGPT Plus 1m"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-medium text-foreground mb-1">Icon / SVG / Emoji</label>
                <div className="flex items-center gap-1.5">
                  <div className="w-9 h-9 rounded-md bg-secondary/60 border border-border/70 flex items-center justify-center shrink-0">
                    <BrandIcon icon={formData.icon} className="w-5 h-5 text-primary" />
                  </div>
                  <Input
                    placeholder="e.g. chatgpt, <svg..., or 🔥"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Live Telegram Button Preview */}
            <div className="p-2.5 rounded-lg bg-card/80 border space-y-1">
              <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono uppercase">
                <span>Telegram Bot Button Preview</span>
                <span className="text-emerald-400 font-bold">Native Style</span>
              </div>
              <div className={`py-2 px-3 rounded-lg text-center font-bold text-xs border shadow-sm transition-all flex items-center justify-center gap-1.5 ${
                Number(formData.stock) > 0 
                  ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50' 
                  : 'bg-red-600/30 text-red-300 border-red-500/50'
              }`}>
                <BrandIcon icon={formData.icon || formData.name} className="w-4 h-4 shrink-0 inline-block" />
                <span>{formData.custom_emoji_id ? '✨ [Custom Vector Logo] ' : `${resolveTelegramButtonEmoji(formData.icon, formData.name)} `}{formData.name || 'Product Title'} - {Number(formData.price) === 0 ? '0' : `$${Number(formData.price).toFixed(2)}`}</span>
              </div>
            </div>

            {/* Telegram Custom Emoji ID (For Real Brand Logos) */}
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
                value={formData.custom_emoji_id || ''}
                onChange={(e) => setFormData({ ...formData, custom_emoji_id: e.target.value })}
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
                      onClick={() => setFormData({ ...formData, custom_emoji_id: preset.custom_emoji_id })}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-all ${
                        formData.custom_emoji_id === preset.custom_emoji_id
                          ? 'bg-primary text-black font-bold border-primary shadow-sm'
                          : 'bg-card/70 hover:bg-secondary text-muted-foreground hover:text-white border-border/70'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                  {formData.custom_emoji_id && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, custom_emoji_id: '' })}
                      className="text-[10px] px-2 py-0.5 rounded border border-rose-500/40 text-rose-400 hover:bg-rose-500/20"
                    >
                      ✕ Clear ID
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground leading-normal pt-0.5">
                💡 Want actual vector brand logos (Netflix, Spotify, Gemini) on buttons? You can click any logo pill above or send custom emojis directly to your bot!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block font-medium text-foreground mb-1">Price ($ USD)</label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block font-medium text-foreground mb-1">Stock Units</label>
                <Input
                  type="number"
                  required
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-foreground mb-1">Description (Shown in Bot)</label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>

            <div>
              <label className="block font-medium text-foreground mb-1 flex items-center justify-between">
                <span>Instant Auto-Delivery Payload (Account / Key / Link)</span>
                <KeyRound className="w-3.5 h-3.5 text-primary" />
              </label>
              <textarea
                rows={2}
                placeholder="Sent to the customer immediately upon purchase"
                value={formData.payload}
                onChange={(e) => setFormData({ ...formData, payload: e.target.value })}
                className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="activeCheck"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="w-4 h-4 rounded border-input bg-background/50 text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor="activeCheck" className="text-foreground font-medium select-none cursor-pointer">
                Visible & Available for purchase in Telegram Bot
              </label>
            </div>

            <DialogFooter className="sticky bottom-0 bg-card/95 backdrop-blur-md pt-3 pb-1 border-t border-border/70 flex flex-col-reverse sm:flex-row gap-2 justify-end z-20">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDialogOpen(false)}
                className="w-full sm:w-auto text-xs h-9 sm:h-8"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="w-full sm:w-auto font-semibold text-xs h-9 sm:h-8 bg-primary text-black hover:bg-primary/90">
                Save Product
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
