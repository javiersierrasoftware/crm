import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getSalesDashboardAction } from '@/server/actions/paymentActions';
import SuperAdminConsole from '@/components/SuperAdminConsole';

export const dynamic = 'force-dynamic';

export default async function SuperAdminPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect('/login');
  }

  const user = session.user as any;

  // Protect route: only global superadmin can access this console
  if (!user.isSuperAdmin) {
    redirect('/dashboard');
  }

  const result = await getSalesDashboardAction();

  if (!result.success) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md text-center">
          <h2 className="text-xl font-bold mb-2">Error al cargar datos</h2>
          <p className="text-slate-400 text-xs">{result.error}</p>
        </div>
      </div>
    );
  }

  return (
    <SuperAdminConsole
      stats={{
        transactions: result.transactions || [],
        organizationsCount: result.organizationsCount || 0,
        totalRevenue: result.totalRevenue || 0,
        plans: result.plans || [],
        subscriptions: result.subscriptions || [],
      }}
    />
  );
}
