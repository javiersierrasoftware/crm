'use client';

import React from 'react';
import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';

export default function SignOutButton() {
  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-rose-400 transition-colors bg-slate-900 hover:bg-rose-950/20 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-rose-900/50"
    >
      <LogOut className="w-3.5 h-3.5" />
      Cerrar Sesión
    </button>
  );
}
