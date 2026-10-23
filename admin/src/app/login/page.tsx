'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Bot, 
  RadioTower, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('admin@nurms.com');
  const [password, setPassword] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        router.replace('/');
      } else {
        setError(res.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDefaults = () => {
    setEmail('admin@nurms.com');
    setPassword('admin');
    setError(null);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#080c14] relative overflow-hidden select-none">
      {/* Background Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md relative z-10 animate-in fade-in-50 zoom-in-95 duration-300">
        <Card className="glass-panel border border-border/80 shadow-2xl backdrop-blur-2xl bg-card/60 overflow-hidden">
          {/* Card Top Banner */}
          <div className="h-1.5 w-full bg-gradient-to-r from-primary via-emerald-400 to-blue-500" />

          <CardHeader className="text-center pt-8 pb-6 space-y-2">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/10 mb-2">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="font-bold text-2xl tracking-wide text-white">NURMS</span>
              <Badge variant="default" className="text-[10px] px-2 py-0.5">Admin Security</Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground max-w-xs mx-auto">
              Authenticate with your administrative credentials to access store controls and payment gateways.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Email / Username Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  Admin Email / Username
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@nurms.com"
                    required
                    className="h-10 text-xs pl-3 bg-secondary/40 border-border/70 focus:border-primary text-white"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                    Master Security Password
                  </label>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter security password..."
                    required
                    className="h-10 text-xs pl-3 pr-10 bg-secondary/40 border-border/70 focus:border-primary text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Quick Preset Helper */}
              <div className="p-2.5 rounded-lg border border-border/40 bg-secondary/20 flex items-center justify-between text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-primary" />
                  <span>Default: <code className="text-white">admin@nurms.com</code> / <code className="text-white">admin</code></span>
                </div>
                <button
                  type="button"
                  onClick={handleFillDefaults}
                  className="text-primary hover:underline font-semibold"
                >
                  Auto Fill
                </button>
              </div>
            </CardContent>

            <CardFooter className="pt-2 pb-8 flex flex-col space-y-3">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 text-xs font-bold bg-primary text-black hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RadioTower className="w-4 h-4 animate-spin" />
                    Authenticating Security Token...
                  </>
                ) : (
                  <>
                    Sign In to Admin Portal
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>

              <div className="text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1 pt-2">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Protected by Firebase Realtime Security Rules & Encryption
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
