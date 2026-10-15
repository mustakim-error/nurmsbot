import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

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
      <body className="bg-[#0b0f17] text-gray-100 flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8 overflow-y-auto max-h-screen">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
