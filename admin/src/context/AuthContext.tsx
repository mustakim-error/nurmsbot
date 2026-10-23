'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth, rtdb, googleProvider } from '@/lib/firebase';
import { 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { ref, get, set } from 'firebase/database';

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'super_admin';
  provider: 'google';
}

export interface BlockedInfo {
  blocked: boolean;
  email?: string;
  uid?: string;
  timestamp?: number;
  reason?: string;
}

interface AuthContextType {
  user: AdminUser | null;
  loading: boolean;
  isBlocked: boolean;
  blockedInfo: BlockedInfo | null;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string; blocked?: boolean; uid?: string; email?: string }>;
  logout: () => Promise<void>;
  unblockBrowser: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isBlocked: false,
  blockedInfo: null,
  loginWithGoogle: async () => ({ success: false }),
  logout: async () => {},
  unblockBrowser: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedInfo, setBlockedInfo] = useState<BlockedInfo | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // 1. Initial LocalStorage & Block Status Check
  useEffect(() => {
    // Check if current browser is marked blocked
    const storedBlock = localStorage.getItem('nurms_admin_blocked');
    if (storedBlock) {
      try {
        const parsed = JSON.parse(storedBlock);
        setIsBlocked(true);
        setBlockedInfo(parsed);
      } catch {
        setIsBlocked(true);
      }
    }

    // 2. Listen to Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        // If browser was blocked, forcefully sign out
        if (localStorage.getItem('nurms_admin_blocked')) {
          await firebaseSignOut(auth);
          setUser(null);
          setLoading(false);
          return;
        }

        // Verify if user is registered in RTDB `admins/${uid}`: true
        try {
          const adminRef = ref(rtdb, `admins/${fbUser.uid}`);
          const snap = await get(adminRef);

          const allAdminsSnap = await get(ref(rtdb, 'admins'));
          const isInitialSetup = !allAdminsSnap.exists() || Object.keys(allAdminsSnap.val() || {}).length === 0;

          const isAdmin = snap.exists() && (snap.val() === true || snap.val()?.active === true || snap.val() === 1);

          if (isAdmin || isInitialSetup) {
            if (isInitialSetup && !snap.exists()) {
              await set(adminRef, true);
            }

            const adminData: AdminUser = {
              uid: fbUser.uid,
              email: fbUser.email || 'Admin',
              displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Administrator',
              photoURL: fbUser.photoURL || undefined,
              role: 'super_admin',
              provider: 'google',
            };

            setUser(adminData);
            setIsBlocked(false);
            setBlockedInfo(null);
            localStorage.setItem('nurms_admin_session', JSON.stringify(adminData));
            document.cookie = `nurms_admin_auth=true; path=/; max-age=86400; SameSite=Strict`;
          } else {
            // Unauthorized account: reject and block!
            await firebaseSignOut(auth);
            const blockData: BlockedInfo = {
              blocked: true,
              email: fbUser.email || undefined,
              uid: fbUser.uid,
              timestamp: Date.now(),
              reason: `Unauthorized Gmail (${fbUser.email}). UID (${fbUser.uid}) is not true in admins/ database.`,
            };
            localStorage.setItem('nurms_admin_blocked', JSON.stringify(blockData));
            localStorage.removeItem('nurms_admin_session');
            document.cookie = `nurms_admin_auth=; path=/; max-age=0; SameSite=Strict`;
            setUser(null);
            setIsBlocked(true);
            setBlockedInfo(blockData);
          }
        } catch (err: any) {
          console.error('Error verifying admin status in RTDB:', err);
          setUser(null);
        }
        setLoading(false);
      } else {
        // No active Firebase User
        const savedSession = localStorage.getItem('nurms_admin_session');
        const isLocallyBlocked = localStorage.getItem('nurms_admin_blocked');

        if (savedSession && !isLocallyBlocked) {
          try {
            const parsed = JSON.parse(savedSession);
            if (parsed && parsed.uid) {
              setUser(parsed);
              document.cookie = `nurms_admin_auth=true; path=/; max-age=86400; SameSite=Strict`;
            } else {
              setUser(null);
            }
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
          document.cookie = `nurms_admin_auth=; path=/; max-age=0; SameSite=Strict`;
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 3. Route Guard
  useEffect(() => {
    if (loading) return;

    const isLoginPage = pathname === '/login';

    if (!user && !isLoginPage) {
      router.replace('/login');
    } else if (user && isLoginPage) {
      router.replace('/');
    }
  }, [user, loading, pathname, router]);

  // Direct Google Sign In with Firebase Authenticator
  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string; blocked?: boolean; uid?: string; email?: string }> => {
    // Check if browser is blocked
    const storedBlock = localStorage.getItem('nurms_admin_blocked');
    if (storedBlock) {
      try {
        const parsed = JSON.parse(storedBlock);
        setIsBlocked(true);
        setBlockedInfo(parsed);
        return {
          success: false,
          blocked: true,
          error: 'Access Denied: This browser is permanently blocked because an unauthorized Gmail was used.',
          uid: parsed.uid,
          email: parsed.email,
        };
      } catch {
        setIsBlocked(true);
        return { success: false, blocked: true, error: 'Access Denied: Unauthorized account blocked.' };
      }
    }

    try {
      // 1. Trigger Google popup
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;

      if (!fbUser) {
        return { success: false, error: 'Google authentication was cancelled.' };
      }

      // 2. Check Realtime Database `admins/{uid}` === true
      const adminRef = ref(rtdb, `admins/${fbUser.uid}`);
      const snap = await get(adminRef);

      const allAdminsSnap = await get(ref(rtdb, 'admins'));
      const isInitialSetup = !allAdminsSnap.exists() || Object.keys(allAdminsSnap.val() || {}).length === 0;

      const isAdmin = snap.exists() && (snap.val() === true || snap.val()?.active === true || snap.val() === 1);

      if (isAdmin || isInitialSetup) {
        // If database had zero admins, register first user as super admin
        if (isInitialSetup && !snap.exists()) {
          await set(adminRef, true);
        }

        const adminUser: AdminUser = {
          uid: fbUser.uid,
          email: fbUser.email || 'Admin',
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Administrator',
          photoURL: fbUser.photoURL || undefined,
          role: 'super_admin',
          provider: 'google',
        };

        setUser(adminUser);
        setIsBlocked(false);
        setBlockedInfo(null);
        localStorage.removeItem('nurms_admin_blocked');
        localStorage.setItem('nurms_admin_session', JSON.stringify(adminUser));
        document.cookie = `nurms_admin_auth=true; path=/; max-age=86400; SameSite=Strict`;
        return { success: true };
      }

      // 3. User is NOT an admin: REJECT AND SAVE TO LOCALSTORAGE!
      await firebaseSignOut(auth);

      const blockPayload: BlockedInfo = {
        blocked: true,
        email: fbUser.email || 'unknown@gmail.com',
        uid: fbUser.uid,
        timestamp: Date.now(),
        reason: `Gmail ${fbUser.email} (UID: ${fbUser.uid}) is not listed in Firebase Realtime Database at admins/${fbUser.uid}: true`,
      };

      localStorage.setItem('nurms_admin_blocked', JSON.stringify(blockPayload));
      localStorage.removeItem('nurms_admin_session');
      document.cookie = `nurms_admin_auth=; path=/; max-age=0; SameSite=Strict`;
      setUser(null);
      setIsBlocked(true);
      setBlockedInfo(blockPayload);

      return {
        success: false,
        blocked: true,
        error: `Access Rejected! Gmail (${fbUser.email}) is not authorized as an administrator. Further attempts are blocked.`,
        uid: fbUser.uid,
        email: fbUser.email || undefined,
      };
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        return { success: false, error: 'Google sign-in popup was closed.' };
      }
      if (err.code === 'auth/unauthorized-domain') {
        return {
          success: false,
          error: 'Domain not authorized in Firebase Console: Add "localhost" under Authentication > Settings > Authorized domains.',
        };
      }
      return { success: false, error: err.message || 'Failed to authenticate with Google.' };
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch {}
    setUser(null);
    localStorage.removeItem('nurms_admin_session');
    document.cookie = `nurms_admin_auth=; path=/; max-age=0; SameSite=Strict`;
    router.replace('/login');
  };

  // Unblock browser (for owner if they configure their UID in Firebase)
  const unblockBrowser = () => {
    localStorage.removeItem('nurms_admin_blocked');
    setIsBlocked(false);
    setBlockedInfo(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isBlocked, blockedInfo, loginWithGoogle, logout, unblockBrowser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
