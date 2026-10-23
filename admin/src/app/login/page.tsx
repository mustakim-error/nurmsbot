'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  ShieldCheck, 
  ShieldAlert,
  Lock, 
  ArrowRight, 
  RadioTower, 
  Sparkles,
  AlertCircle,
  Copy,
  Check,
  RotateCcw,
  ExternalLink
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
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
  const { loginWithGoogle, isBlocked, blockedInfo, unblockBrowser } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectedUid, setRejectedUid] = useState<string | null>(null);
  const [copiedUid, setCopiedUid] = useState(false);

  const handleGoogleLogin = async () => {
    if (isBlocked) {
      setError('Access Denied: This browser is permanently locked. Unauthorized accounts cannot retry.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await loginWithGoogle();
      if (res.success) {
        router.replace('/');
      } else {
        setError(res.error || 'Authentication rejected. You are not authorized.');
        if (res.uid) {
          setRejectedUid(res.uid);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during Google sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUid = (uid: string) => {
    navigator.clipboard.writeText(uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

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
          <div className={`h-1.5 w-full ${isBlocked ? 'bg-rose-500' : 'bg-gradient-to-r from-primary via-emerald-400 to-blue-500'}`} />

          <CardHeader className="text-center pt-8 pb-5 space-y-2">
            <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg mb-2 transition-all ${
              isBlocked 
                ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400 shadow-rose-500/10 animate-pulse' 
                : 'bg-primary/10 border border-primary/20 text-primary shadow-primary/10'
            }`}>
              {isBlocked ? <ShieldAlert className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
            </div>

            <div className="flex items-center justify-center gap-2">
              <span className="font-bold text-2xl tracking-wide text-white">NURMS</span>
              <Badge variant={isBlocked ? "destructive" : "default"} className="text-[10px] px-2 py-0.5">
                {isBlocked ? 'Access Denied' : 'Admin Portal'}
              </Badge>
            </div>

            <CardDescription className="text-xs text-muted-foreground max-w-sm mx-auto">
              {isBlocked
                ? 'Access to this administrative portal is restricted. Your Gmail account is not recognized as a registered Super Admin.'
                : 'Direct 1-Click Google Authentication. Only Gmail accounts verified in Firebase Realtime Database (`admins/{uid}: true`) are granted access.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Blocked State Alert */}
            {isBlocked && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-3">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs text-white">Account Permanently Blocked</h4>
                    <p className="text-[11px] text-rose-200/90 mt-0.5">
                      {blockedInfo?.reason || 'Unauthorized Gmail account. Attempts from this browser are locked in localStorage.'}
                    </p>
                  </div>
                </div>

                {/* Show UID with 1-Click Copy */}
                {(blockedInfo?.uid || rejectedUid) && (
                  <div className="p-2.5 rounded-lg bg-black/50 border border-rose-500/20 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                      <span>YOUR FIREBASE AUTH UID:</span>
                      <button
                        onClick={() => handleCopyUid(blockedInfo?.uid || rejectedUid || '')}
                        className="text-primary hover:text-white flex items-center gap-1 font-sans"
                      >
                        {copiedUid ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedUid ? 'Copied!' : 'Copy UID'}
                      </button>
                    </div>
                    <code className="block p-1.5 rounded bg-black/80 font-mono text-[11px] text-amber-300 break-all border border-border/50">
                      {blockedInfo?.uid || rejectedUid}
                    </code>
                    <p className="text-[10px] text-muted-foreground leading-tight pt-1">
                      💡 To grant access, open Firebase Realtime Database and add: <code className="text-emerald-400">admins/{"<UID>"}: true</code>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* General Error Message */}
            {error && !isBlocked && (
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
                disabled={loading || isBlocked}
                className={`w-full h-12 text-sm font-bold transition-all flex items-center justify-center gap-3 rounded-xl shadow-lg ${
                  isBlocked
                    ? 'bg-secondary/40 text-muted-foreground border border-border/50 cursor-not-allowed opacity-60'
                    : 'bg-white hover:bg-slate-100 text-slate-900 shadow-white/10 active:scale-[0.98]'
                }`}
              >
                {loading ? (
                  <>
                    <RadioTower className="w-5 h-5 text-primary animate-spin" />
                    <span>Verifying Admin UID with Firebase...</span>
                  </>
                ) : isBlocked ? (
                  <>
                    <Lock className="w-5 h-5 text-rose-400" />
                    <span>Login Blocked (Unauthorized Account)</span>
                  </>
                ) : (
                  <>
                    <GoogleIconSvg className="w-5 h-5 shrink-0" />
                    <span>Continue with Google (Gmail)</span>
                  </>
                )}
              </Button>
            </div>

            {/* How it works info card */}
            <div className="p-3 rounded-xl bg-secondary/30 border border-border/60 text-[11px] text-muted-foreground space-y-1.5">
              <div className="flex items-center gap-1.5 text-white font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>Zero-Password Direct Google Auth</span>
              </div>
              <p className="leading-relaxed">
                Clicking the button above opens official Google sign-in. Your UID is instantly checked against <code className="text-primary font-mono">admins/{"{uid}"}: true</code> in Realtime Database.
              </p>
            </div>

            {/* Unblock Button for System Administrator */}
            {isBlocked && (
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Did you add your UID to Firebase Realtime Database (admins/<uid>: true)? Click OK to clear browser block and retry.')) {
                      unblockBrowser();
                      setError(null);
                      setRejectedUid(null);
                    }
                  }}
                  className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1.5 mx-auto"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Added UID in Firebase? Reset Browser Block</span>
                </button>
              </div>
            )}
          </CardContent>

          <CardFooter className="pt-2 pb-6 border-t border-border/40 flex flex-col space-y-1">
            <div className="text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Protected by Firebase Realtime Database Rules (`admins/$uid: true`)
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
