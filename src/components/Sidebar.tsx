'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Layers,
  Building2,
  Users2,
  FileSpreadsheet,
  FileText,
  Mail,
  CalendarCheck,
  Settings,
  Shield,
  Lock,
  X,
  CreditCard,
} from 'lucide-react';
import SignOutButton from './SignOutButton';

interface SidebarProps {
  activePlanCode: string;
  isSuperAdmin: boolean;
  userName: string;
  userEmail: string;
}

export default function Sidebar({ activePlanCode, isSuperAdmin, userName, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [lockedFeatureName, setLockedFeatureName] = useState('');

  const isFreePlan = activePlanCode === 'PLAN_GRATIS';

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, isLocked: false },
    { name: 'Embudo Kanban', href: '/dashboard/kanban', icon: Layers, isLocked: isFreePlan },
    { name: 'Empresas', href: '/dashboard/companies', icon: Building2, isLocked: false },
    { name: 'Contactos', href: '/dashboard/contacts', icon: Users2, isLocked: false },
    { name: 'Importar CSV', href: '/dashboard/import', icon: FileSpreadsheet, isLocked: isFreePlan },
    { name: 'Plantillas', href: '/dashboard/templates', icon: FileText, isLocked: isFreePlan },
    { name: 'Campañas', href: '/dashboard/campaigns', icon: Mail, isLocked: isFreePlan },
    { name: 'Tareas y Agenda', href: '/dashboard/activities', icon: CalendarCheck, isLocked: isFreePlan },
    { name: 'Configuración', href: '/dashboard/settings', icon: Settings, isLocked: false },
  ];

  const handleItemClick = (e: React.MouseEvent, item: typeof menuItems[0]) => {
    if (item.isLocked) {
      e.preventDefault();
      setLockedFeatureName(item.name);
      setShowUpgradeModal(true);
    }
  };

  const handleUpgradeRedirect = () => {
    setShowUpgradeModal(false);
    router.push('/dashboard/settings');
  };

  return (
    <>
      <aside className="w-64 border-r border-slate-900 bg-slate-950/80 shrink-0 hidden md:flex flex-col justify-between p-6">
        <div>
          {/* Logo Header */}
          <div className="flex items-center gap-2 mb-10">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-indigo-600/30">
              C
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-indigo-400 bg-clip-text text-transparent">
              CREATIX<span className="text-indigo-500 font-light">CRM</span>
            </span>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.isLocked ? '#' : item.href}
                  onClick={(e) => handleItemClick(e, item)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border border-transparent ${
                    item.isLocked
                      ? 'text-slate-600 hover:text-slate-500 hover:bg-slate-900/10 cursor-not-allowed'
                      : isActive
                      ? 'text-white bg-indigo-600/10 border-indigo-900/50'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/50 hover:border-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`w-4 h-4 ${item.isLocked ? 'text-slate-700' : 'text-indigo-500/80'}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.isLocked && <Lock className="w-3.5 h-3.5 text-slate-700" />}
                </Link>
              );
            })}

            {isSuperAdmin && (
              <Link
                href="/dashboard/superadmin"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-200 hover:bg-rose-950/10 transition-all border border-transparent hover:border-rose-950/20 mt-6"
              >
                <Shield className="w-4 h-4 text-rose-500" />
                Consola SuperAdmin
              </Link>
            )}
          </nav>
        </div>

        {/* Footer Sidebar Profile */}
        <div className="border-t border-slate-900 pt-6 mt-6">
          <div className="mb-4">
            <div className="text-xs font-bold text-slate-200 truncate">{userName}</div>
            <div className="text-[10px] text-slate-500 truncate">{userEmail}</div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* UPGRADE MODAL POPUP */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in animate-duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 space-y-5 text-center relative">
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 bg-indigo-950/40 border border-indigo-900 rounded-2xl flex items-center justify-center mx-auto text-indigo-400">
              <Lock className="w-6 h-6 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="font-extrabold text-white text-sm">Función Exclusiva Premium</h3>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                El módulo de <strong>{lockedFeatureName}</strong> es exclusivo para planes de pago.
                Mejora tu plan hoy para desbloquearlo junto con bases de datos ampliadas de prospectos y automatizaciones.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleUpgradeRedirect}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/10"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Mejorar Plan de Suscripción
              </button>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="bg-slate-950 border border-slate-900 hover:bg-slate-900 text-slate-400 hover:text-white py-2 rounded-xl text-xs transition-colors"
              >
                Seguir en Plan Gratis
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
