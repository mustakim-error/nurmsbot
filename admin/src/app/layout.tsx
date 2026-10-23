import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import AdminShell from '@/components/AdminShell';

export const metadata: Metadata = {
  title: 'NURMS Admin Portal | Telegram Store & Bot Manager',
  description: 'Manage digital products, user wallets, bot channels, and orders with realtime Firebase sync.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0b0f17] text-gray-100 min-h-screen">
        <AuthProvider>
          <AdminShell>
            {children}
          </AdminShell>
        </AuthProvider>
      </body>
    </html>
  );
}
