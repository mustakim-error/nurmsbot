'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  ShieldCheck, 
  ShieldAlert,
  RadioTower, 
  AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function GoogleIconSvg({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const { loginWithGoogle, isBlocked, unblockBrowser } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Secret reset query: /login?unlock=true or /login?reset=true
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('unlock') === 'true' || params.get('reset') === 'true') {
        unblockBrowser();
        router.replace('/login');
      }
    }
  }, [unblockBrowser, router]);

  const handleSecretReset = () => {
    unblockBrowser();
  };

  const handleGoogleLogin = async () => {
    if (isBlocked) return;

    setError(null);
    setLoading(true);

    try {
      const res = await loginWithGoogle();
      if (res.success) {
        router.replace('/');
      } else {
        if (!res.blocked) {
          setError(res.error || 'Authentication rejected.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during Google sign in.');
    } finally {
      setLoading(false);
    }
  };

  // 1. FULL PAGE RED "ACCESS DENIED" (When unauthorized/blocked)
  if (isBlocked) {
    return (
      <div className="fixed inset-0 z-50 min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#0a0002] relative overflow-hidden select-none">
        {/* Full Screen Deep Crimson & Red Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(220,38,38,0.28)_0%,_rgba(153,27,27,0.18)_42%,_rgba(10,0,2,1)_85%)] pointer-events-none" />
        
        {/* Full Screen Red Alert Vignette */}
        <div className="absolute inset-0 shadow-[inset_0_0_140px_rgba(239,68,68,0.45)] pointer-events-none animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/20 rounded-full blur-[150px] pointer-events-none" />

        {/* Center Access Denied Content */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-lg mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div 
            onClick={handleSecretReset}
            className="w-24 h-24 rounded-3xl bg-red-950/80 border-2 border-red-500/50 flex items-center justify-center shadow-[0_0_50px_rgba(239,68,68,0.5)] cursor-default transition-transform active:scale-95"
            title=""
          >
            <ShieldAlert className="w-12 h-12 text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.9)] animate-pulse" />
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-widest text-red-500 drop-shadow-[0_0_40px_rgba(239,68,68,0.8)] font-mono uppercase">
              ACCESS DENIED
            </h1>
            <div className="inline-block px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-xs sm:text-sm tracking-[0.3em] uppercase font-bold">
              403 • RESTRICTED ACCESS
            </div>
          </div>

          <p className="text-sm text-red-300/60 font-mono tracking-wider max-w-xs">
            You do not have permission to access this administrative portal.
          </p>
        </div>
      </div>
    );
  }

  // 2. Normal Login View
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#080c14] relative overflow-hidden select-none">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Glassmorphic Card */}
      <div className="w-full max-w-md relative z-10 animate-in fade-in-50 zoom-in-95 duration-300">
        <Card className="glass-panel border border-border/80 shadow-2xl backdrop-blur-2xl bg-card/70 overflow-hidden">
          {/* Card Top Strip */}
          <div className="h-1.5 w-full bg-gradient-to-r from-primary via-emerald-400 to-blue-500" />

          <CardHeader className="text-center pt-8 pb-5 space-y-2">
            <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg mb-2 transition-all bg-primary/10 border border-primary/20 text-primary shadow-primary/10">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div className="flex items-center justify-center gap-2">
              <span className="font-bold text-2xl tracking-wide text-white">NURMS</span>
              <Badge variant="default" className="text-[10px] px-2 py-0.5">
                Admin Portal
              </Badge>
            </div>

            <CardDescription className="text-xs text-muted-foreground max-w-sm mx-auto">
              Administrative gateway protected by Firebase Authentication. Sign in with your registered administrator Gmail.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* General Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Direct Google Login Action */}
            <div className="pt-2">
              <Button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full h-12 text-sm font-bold transition-all flex items-center justify-center gap-3 rounded-xl shadow-lg bg-white hover:bg-slate-100 text-slate-900 shadow-white/10 active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <RadioTower className="w-5 h-5 text-primary animate-spin" />
                    <span>Verifying Administrator Access...</span>
                  </>
                ) : (
                  <>
                    <GoogleIconSvg className="w-5 h-5 shrink-0" />
                    <span>Continue with Google (Gmail)</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>

          <CardFooter className="pt-2 pb-6 border-t border-border/40 flex flex-col space-y-1">
            <div className="text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Protected by Firebase Realtime Database Security Rules
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
