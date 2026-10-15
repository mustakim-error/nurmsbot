'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  ShoppingBag, 
  Sparkles, 
  KeyRound, 
  Search,
  CheckCircle2,
  XCircle
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

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  icon?: string;
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
    description: '',
    payload: '',
    active: true,
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'products'), (snapshot) => {
      const prods: Product[] = [];
      snapshot.forEach((d) => {
        prods.push({ id: d.id, ...(d.data() as any) });
      });
      setProducts(prods);
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
      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), {
          name: formData.name,
          price: Number(formData.price),
          stock: Number(formData.stock),
          icon: formData.icon || '✨',
          description: formData.description,
          payload: formData.payload,
          active: formData.active,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await addDoc(collection(db, 'products'), {
          name: formData.name,
          price: Number(formData.price),
          stock: Number(formData.stock),
          icon: formData.icon || '✨',
          description: formData.description,
          payload: formData.payload,
          active: formData.active,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      setIsDialogOpen(false);
    } catch (err: any) {
      alert(`Error saving product: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await deleteDoc(doc(db, 'products', id));
    }
  };

  // 1-Click seed with user's exact screenshot products!
  const handleSeedProducts = async () => {
    const demoItems = [
      { name: 'ChatGPT Plus 1m', price: 0, stock: 15, payload: 'Account: chatgpt-user-01@gmail.com | pass: PlusPass99' },
      { name: 'Cursor Pro 1m + Grok Bot 1m', price: 0, stock: 10, payload: 'Cursor Key: cr_tok_9918231 | Grok invite attached' },
      { name: 'Gemini AI PRO 18m 2nd Service', price: 0, stock: 12, payload: 'Gemini Workspace Invitation Link sent' },
      { name: 'Gemini New 7 Days Expiry Links', price: 25, stock: 25, payload: 'https://one.google.com/explore-plan/gemini-advanced-claim-demo' },
      { name: 'Adobe Express 12M', price: 72, stock: 8, payload: 'Adobe Team Invite sent to your registered email' },
      { name: 'Duolingo Super 12M', price: 156, stock: 14, payload: 'Duolingo Family Group Slot Link: https://invite.duolingo.com/family-slot' },
      { name: 'Apple Music 5M', price: 208, stock: 10, payload: 'Apple Music Family Invitation link' },
    ];

    try {
      for (const item of demoItems) {
        await addDoc(collection(db, 'products'), {
          ...item,
          description: 'Instant automated digital activation with replacement warranty.',
          active: true,
          createdAt: new Date().toISOString(),
        });
      }
      alert('🎉 7 Screenshot products added to Firebase Firestore successfully!');
    } catch (err: any) {
      alert(`Error seeding products: ${err.message}`);
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
          {products.length === 0 && (
            <Button
              onClick={handleSeedProducts}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              1-Click Populate Screenshot Items
            </Button>
          )}

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
          <div className="p-12 text-center text-muted-foreground text-xs">
            Connecting to Firebase Firestore...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">No digital products found</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Click "Add New Product" or use "1-Click Populate Screenshot Items" to add your digital inventory.
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
                      <div className="font-semibold text-white text-sm flex items-center gap-1.5">
                        <span className="text-base">{p.icon || '✨'}</span>
                        {p.name}
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{p.description}</div>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-primary">
                      {p.price === 0 ? 'Free ($0)' : `$${Number(p.price).toFixed(2)}`}
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
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-3">
                <label className="block font-medium text-foreground mb-1">Product Title</label>
                <Input
                  required
                  placeholder="e.g. ChatGPT Plus 1m"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-medium text-foreground mb-1">Emoji / Icon</label>
                <Input
                  placeholder="e.g. 🤖"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                className="w-4 h-4 rounded border-input bg-background/50 text-primary focus:ring-primary"
              />
              <label htmlFor="activeCheck" className="text-foreground font-medium select-none cursor-pointer">
                Visible & Available for purchase in Telegram Bot
              </label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="font-semibold">
                Save Product
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
