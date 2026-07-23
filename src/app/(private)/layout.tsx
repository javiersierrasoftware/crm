import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import SignOutButton from '@/components/SignOutButton';
import {
  LayoutDashboard,
  Layers,
  Building2,
  Users2,
  Mail,
  CalendarCheck,
  Settings,
  Shield,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import Link from 'next/link';

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session || !session.user) {
    redirect('/login');
  }

  const user = session.user as any;
  const isSuperAdmin = user.isSuperAdmin;

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Embudo Kanban', href: '/dashboard/kanban', icon: Layers },
    { name: 'Empresas', href: '/dashboard/companies', icon: Building2 },
    { name: 'Contactos', href: '/dashboard/contacts', icon: Users2 },
    { name: 'Importar CSV', href: '/dashboard/import', icon: FileSpreadsheet },
    { name: 'Plantillas', href: '/dashboard/templates', icon: FileText },
    { name: 'Campañas', href: '/dashboard/campaigns', icon: Mail },
    { name: 'Tareas y Agenda', href: '/dashboard/activities', icon: CalendarCheck },
    { name: 'Configuración', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Sidebar Navigation */}
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
            {menuItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900/50 transition-all border border-transparent hover:border-slate-900"
              >
                <item.icon className="w-4 h-4 text-indigo-500/80" />
                {item.name}
              </Link>
            ))}

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
            <div className="text-xs font-bold text-slate-200 truncate">{session.user.name}</div>
            <div className="text-[10px] text-slate-500 truncate">{session.user.email}</div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Mobile Header */}
        <header className="h-14 border-b border-slate-900 bg-slate-950/60 flex items-center justify-between px-6 md:hidden">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white text-md">
              C
            </div>
            <span className="font-extrabold text-md text-white">CREATIX</span>
          </div>
          <SignOutButton />
        </header>

        {/* Render Page */}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
