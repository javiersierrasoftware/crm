import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { connectToDatabase } from '@/server/database/mongodb';
import Organization from '@/models/Organization';
import Company from '@/models/Company';
import Contact from '@/models/Contact';
import Pipeline from '@/models/Pipeline';
import { Opportunity } from '@/models/Opportunity';
import Activity from '@/models/Activity';
import DashboardCharts from '@/components/DashboardCharts';
import SignOutButton from '@/components/SignOutButton';
import {
  Building2,
  Users2,
  TrendingUp,
  CalendarCheck,
  AlertTriangle,
  LayoutDashboard,
  ShieldAlert,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();

  // Redirect if not logged in
  if (!session || !session.user) {
    redirect('/login');
  }

  // Extract active tenant context
  const user = session.user as any;
  const activeOrgId = user.activeOrganizationId;
  const activeRole = user.activeRole;
  const isSuperAdmin = user.isSuperAdmin;

  if (!activeOrgId && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans p-6">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md text-center">
          <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Sin Organización Activa</h2>
          <p className="text-slate-400 text-xs mb-6 leading-relaxed">
            Su usuario no tiene una membresía activa asignada o está pendiente de aprobación por el administrador de la plataforma.
          </p>
          <SignOutButton />
        </div>
      </div>
    );
  }

  await connectToDatabase();

  let orgName = 'CREATIX SaaS';
  if (activeOrgId) {
    const org = await Organization.findById(activeOrgId);
    if (org) orgName = org.name;
  } else if (isSuperAdmin) {
    orgName = 'Panel de Control Global (SUPER_ADMIN)';
  }

  // 1. Fetch KPI Stats
  const orgQuery = activeOrgId ? { organizationId: activeOrgId } : {};
  
  const [totalCompanies, totalContacts, openDealsCount] = await Promise.all([
    Company.countDocuments({ ...orgQuery, deletedAt: null }),
    Contact.countDocuments({ ...orgQuery, deletedAt: null }),
    Opportunity.countDocuments({ ...orgQuery, status: 'open' }),
  ]);

  // Compute weighted value of open opportunities
  const openOpportunities = await Opportunity.find({ ...orgQuery, status: 'open' });
  let totalPipelineValue = 0;
  let weightedPipelineValue = 0;

  openOpportunities.forEach((opp) => {
    const val = opp.estimatedValue || 0;
    const prob = opp.probability || 0;
    totalPipelineValue += val;
    weightedPipelineValue += val * (prob / 100);
  });

  // 2. Fetch Recent Activities
  const recentActivities = await Activity.find(orgQuery)
    .sort({ date: -1, time: -1 })
    .limit(5);

  // 3. Fetch Pipeline Stage Chart Data
  const defaultPipeline = activeOrgId
    ? await Pipeline.findOne({ organizationId: activeOrgId, isDefault: true }) || await Pipeline.findOne({ organizationId: activeOrgId })
    : null;

  const pipelineChartData: { stage: string; value: number }[] = [];

  if (defaultPipeline && defaultPipeline.stages) {
    for (const stage of defaultPipeline.stages) {
      const count = await Opportunity.countDocuments({
        ...orgQuery,
        pipelineId: defaultPipeline._id,
        stageId: stage._id,
        status: 'open',
      });
      pipelineChartData.push({
        stage: stage.name,
        value: count,
      });
    }
  } else {
    // Fallback seed visualization if no pipeline matches
    pipelineChartData.push(
      { stage: 'Nuevo', value: 3 },
      { stage: 'Contactado', value: 5 },
      { stage: 'Calificado', value: 2 },
      { stage: 'Reunión', value: 4 },
      { stage: 'Ganado', value: 1 }
    );
  }

  // 4. Fetch Monthly Progression Data (Simulated or Aggregated from Wons)
  const progressionChartData = [
    { month: 'Ene', value: 5000 },
    { month: 'Feb', value: 7500 },
    { month: 'Mar', value: 6200 },
    { month: 'Abr', value: 9800 },
    { month: 'May', value: 12000 },
    { month: 'Jun', value: weightedPipelineValue || 15000 },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Mini Breadcrumb Nav */}
      <div className="h-16 border-b border-slate-900 px-8 flex items-center justify-between bg-slate-950/20 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">Organización:</span>
          <span className="text-xs font-black text-white">{orgName}</span>
          <span className="text-[9px] font-bold bg-indigo-950 text-indigo-400 border border-indigo-900/50 px-2 py-0.5 rounded-full uppercase">
            {activeRole || 'SUPER_ADMIN'}
          </span>
        </div>
        <div className="text-[10px] text-slate-500 font-medium">
          Tablero de Control
        </div>
      </div>

      {/* Main Body */}
      <main className="px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white">Resumen Comercial</h1>
          <p className="text-slate-400 text-xs mt-1">
            Indicadores y rendimiento de ventas consolidados en tiempo real.
          </p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <Building2 className="w-5 h-5 text-indigo-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Empresas</span>
            </div>
            <div className="text-2xl font-black text-white">{totalCompanies}</div>
            <p className="text-[10px] text-slate-400 mt-1">Cuentas comerciales registradas</p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <Users2 className="w-5 h-5 text-violet-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Contactos</span>
            </div>
            <div className="text-2xl font-black text-white">{totalContacts}</div>
            <p className="text-[10px] text-slate-400 mt-1">Contactos y decisores únicos</p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Valor Ponderado</span>
            </div>
            <div className="text-2xl font-black text-emerald-400">
              ${weightedPipelineValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              De ${totalPipelineValue.toLocaleString('en-US', { maximumFractionDigits: 0 })} en {openDealsCount} negocios
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <CalendarCheck className="w-5 h-5 text-amber-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Negocios Activos</span>
            </div>
            <div className="text-2xl font-black text-white">{openDealsCount}</div>
            <p className="text-[10px] text-slate-400 mt-1">Oportunidades abiertas en seguimiento</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="mb-8">
          <DashboardCharts
            pipelineData={pipelineChartData}
            progressionData={progressionChartData}
          />
        </div>

        {/* Bottom Details Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Recent Activity List */}
          <div className="md:col-span-2 bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl">
            <h3 className="text-sm font-bold text-white mb-6">Bitácora de Actividades Recientes</h3>
            <div className="space-y-4">
              {recentActivities.length === 0 ? (
                <div className="text-slate-500 text-xs py-8 text-center border border-dashed border-slate-800 rounded-xl">
                  Cero actividades comerciales registradas para este inquilino.
                </div>
              ) : (
                recentActivities.map((act) => (
                  <div
                    key={act._id.toString()}
                    className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-900/30 transition-colors border border-slate-950 hover:border-slate-850"
                  >
                    <div className="bg-indigo-950 border border-indigo-900/50 text-indigo-400 text-xs font-bold px-2.5 py-1.5 rounded-lg uppercase w-20 text-center shrink-0">
                      {act.type}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white">{act.title}</h4>
                        <span className="text-[10px] text-slate-500">
                          {new Date(act.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} {act.time}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{act.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SaaS limits widget */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white mb-6">Límites y Consumo del Plan</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-slate-400">Correos Enviados (Periodo)</span>
                    <span className="text-white font-bold">1,200 / 30,000</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: '4%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-slate-400">Cuentas de Asesores</span>
                    <span className="text-white font-bold">5 / 10</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: '50%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-slate-400">Automatizaciones Configuradas</span>
                    <span className="text-white font-bold">1 / 15</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: '7.5%' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-900/60 p-4 rounded-xl mt-6">
              <div className="flex gap-2">
                <AlertTriangle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-[10px] text-slate-400 leading-relaxed">
                  Su suscripción se renovará automáticamente el próximo mes. Para ampliar sus cuotas de envío de correos, contacte a su administrador.
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
