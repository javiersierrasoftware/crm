'use client';

import React, { useState } from 'react';
import { updatePlanPriceAction, runSubscriptionRenewalCheckAction } from '@/server/actions/paymentActions';
import {
  ShieldAlert,
  DollarSign,
  Building,
  TrendingUp,
  Percent,
  RefreshCw,
  Play,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SuperAdminConsoleProps {
  stats: {
    transactions: any[];
    organizationsCount: number;
    totalRevenue: number;
    plans: any[];
    subscriptions: any[];
  };
}

export default function SuperAdminConsole({ stats }: SuperAdminConsoleProps) {
  const router = useRouter();

  // Price adjustment forms
  const [selectedPlanCode, setSelectedPlanCode] = useState(stats.plans[0]?.code || 'PLAN_INICIAL');
  const activePlan = stats.plans.find(p => p.code === selectedPlanCode);

  const [priceInput, setPriceInput] = useState(activePlan?.price || 0);
  const [discountInput, setDiscountInput] = useState(activePlan?.discountPercent || 0);

  // Sync pricing inputs when selected plan code changes
  React.useEffect(() => {
    const p = stats.plans.find(x => x.code === selectedPlanCode);
    if (p) {
      setPriceInput(p.price);
      setDiscountInput(p.discountPercent || 0);
    }
  }, [selectedPlanCode, stats.plans]);

  // Loading/Feedback states
  const [isSaving, setIsSaving] = useState(false);
  const [isCronRunning, setIsCronRunning] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [cronResult, setCronResult] = useState('');

  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await updatePlanPriceAction(selectedPlanCode, priceInput, discountInput);
      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        router.refresh();
      } else {
        alert(res.error || 'Error al actualizar plan');
      }
    } catch {
      alert('Error de red al actualizar plan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerCron = async () => {
    if (!confirm('¿Desea ejecutar la verificación de renovaciones? Se enviarán recordatorios a los clientes próximos a vencer y se suspenderán cuentas vencidas.')) {
      return;
    }

    setIsCronRunning(true);
    setCronResult('');

    try {
      const res = await runSubscriptionRenewalCheckAction();
      if (res.success) {
        setCronResult(`✓ Verificación exitosa. Recordatorios enviados: ${res.notifiedCount}. Cuentas suspendidas: ${res.suspendedCount}.`);
      } else {
        setCronResult(`⚠️ Error: ${res.error}`);
      }
    } catch (err: any) {
      setCronResult(`⚠️ Error de red al ejecutar verificación: ${err.message}`);
    } finally {
      setIsCronRunning(false);
    }
  };

  // Approved transactions
  const approvedTxCount = stats.transactions.filter(t => t.status === 'APPROVED').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Header */}
      <div className="h-16 border-b border-slate-900 px-8 flex items-center justify-between bg-slate-950/20">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-500" />
          <span className="text-xs font-black text-white uppercase tracking-wider">Consola Global de Administración (SuperAdmin)</span>
        </div>
      </div>

      <div className="px-8 py-8 space-y-8 max-w-6xl">
        {/* KPI Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Recaudación Wompi</span>
            </div>
            <div className="text-2xl font-black text-emerald-400">
              ${stats.totalRevenue.toLocaleString('es-CO')} COP
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Suma acumulada de pagos aprobados</p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <Building className="w-5 h-5 text-indigo-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Inquilinos SaaS</span>
            </div>
            <div className="text-2xl font-black text-white">{stats.organizationsCount}</div>
            <p className="text-[10px] text-slate-400 mt-1">Organizaciones totales registradas</p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <TrendingUp className="w-5 h-5 text-violet-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Ventas Aprobadas</span>
            </div>
            <div className="text-2xl font-black text-white">{approvedTxCount}</div>
            <p className="text-[10px] text-slate-400 mt-1">Transacciones procesadas por Wompi</p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <Calendar className="w-5 h-5 text-amber-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Planes Activos</span>
            </div>
            <div className="text-2xl font-black text-white">
              {stats.subscriptions.filter(s => s.status === 'active').length}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Suscripciones vigentes en facturación</p>
          </div>
        </div>

        {/* Configurations Forms Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Price Adjuster Form */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl h-fit space-y-4">
            <h3 className="text-xs font-black uppercase text-white tracking-wider border-b border-slate-900 pb-3 flex items-center gap-2">
              <Percent className="w-4 h-4 text-indigo-500" /> Configuración de Tarifas
            </h3>

            <form onSubmit={handleUpdatePrice} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Seleccionar Plan</label>
                <select
                  value={selectedPlanCode}
                  onChange={(e) => setSelectedPlanCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3 py-2 text-white h-9"
                >
                  {stats.plans.map(p => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Precio Base (COP)</label>
                <input
                  type="number"
                  value={priceInput}
                  onChange={(e) => setPriceInput(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3 py-2 text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Porcentaje de Descuento (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={discountInput}
                  onChange={(e) => setDiscountInput(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3 py-2 text-white font-mono"
                  required
                />
              </div>

              <div className="bg-slate-950/80 p-3.5 border border-slate-900 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500">Precio Final Calculado:</span>
                <div className="font-extrabold text-sm text-emerald-400 font-mono">
                  ${Math.round(priceInput * (1 - discountInput / 100)).toLocaleString('es-CO')} COP
                </div>
              </div>

              {saveSuccess && (
                <div className="bg-emerald-950/40 border border-emerald-900 text-emerald-400 p-2.5 rounded-lg flex items-center gap-1.5 text-[10px]">
                  <CheckCircle className="w-3.5 h-3.5" /> ¡Precios y descuentos actualizados!
                </div>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Guardar Cambios
              </button>
            </form>
          </div>

          {/* Subscriptions reminder automation test panel */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl h-fit space-y-4">
            <h3 className="text-xs font-black uppercase text-white tracking-wider border-b border-slate-900 pb-3 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-indigo-500" /> Cobro Recurrente y Recordatorios
            </h3>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              El CRM realiza una verificación diaria (automatizada por cron) de fechas de vencimiento de las suscripciones. Envía alertas de cobro por correo y bloquea las cuentas que han expirado.
            </p>
            <div className="bg-slate-950 p-4 border border-slate-900 rounded-xl text-[10px] text-slate-400 space-y-2">
              <strong>Estrategia de Recordatorios:</strong>
              <ul className="list-disc pl-4 space-y-1">
                <li>Vence en &le; 3 días: Email recordatorio amigable con enlace de pago.</li>
                <li>Vence hoy / vencido: Cambio de estado a <code className="bg-rose-950 text-rose-400 px-1 rounded">suspended</code> y correo crítico de cobro.</li>
              </ul>
            </div>

            {cronResult && (
              <div className="bg-slate-950 border border-slate-900 p-3 rounded-xl text-[10px] text-indigo-400 leading-normal">
                {cronResult}
              </div>
            )}

            <button
              onClick={handleTriggerCron}
              disabled={isCronRunning}
              className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 text-xs"
            >
              {isCronRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 text-indigo-500" />}
              Probar Envío de Recordatorios
            </button>
          </div>

          {/* Plans info list overview */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl h-fit space-y-4">
            <h3 className="text-xs font-black uppercase text-white tracking-wider border-b border-slate-900 pb-3 flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-500" /> Límites del Sistema
            </h3>
            <div className="space-y-3.5 text-xs">
              {stats.plans.map(p => (
                <div key={p.code} className="bg-slate-950 border border-slate-900 p-3 rounded-xl">
                  <div className="flex justify-between font-bold text-white mb-1.5">
                    <span>{p.name}</span>
                    <span className="text-emerald-400 font-mono">${p.price.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-500">
                    <div>Asesores: <strong className="text-slate-300">{p.maxUsers}</strong></div>
                    <div>Empresas: <strong className="text-slate-300">{p.maxCompanies}</strong></div>
                    <div>Emails/mes: <strong className="text-slate-300">{p.maxEmailsPerMonth}</strong></div>
                    <div>Dcto Activo: <strong className="text-indigo-400">{p.discountPercent}%</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Transactions log table */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 bg-slate-950/40 border-b border-slate-900 flex justify-between items-center">
            <h3 className="text-xs font-black uppercase text-white tracking-wider">Historial de Pagos y Facturación (Ventas)</h3>
            <span className="text-[10px] text-slate-500">Log acumulado de Wompi</span>
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-900 bg-slate-950/40 text-slate-400 font-bold">
                <th className="p-4">Organización / Cliente</th>
                <th className="p-4">Plan Comprado</th>
                <th className="p-4">Monto Transacción</th>
                <th className="p-4">ID Wompi</th>
                <th className="p-4">Referencia de Pago</th>
                <th className="p-4">Fecha Pago</th>
                <th className="p-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {stats.transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Cero transacciones comerciales registradas en Wompi.
                  </td>
                </tr>
              ) : (
                stats.transactions.map((tx) => {
                  const org = tx.organizationId as any;
                  const plan = tx.planId as any;
                  return (
                    <tr key={tx._id} className="hover:bg-slate-900/10 transition-colors">
                      <td className="p-4 font-bold text-white">{org?.name || 'Cliente Eliminado'}</td>
                      <td className="p-4">
                        <span className="bg-slate-950 border border-slate-900 text-slate-400 text-[10px] px-2 py-0.5 rounded font-medium">
                          {plan?.name || 'N/D'}
                        </span>
                      </td>
                      <td className="p-4 text-emerald-400 font-extrabold font-mono">
                        ${tx.amount?.toLocaleString('es-CO')} COP
                      </td>
                      <td className="p-4 text-slate-500 font-mono">{tx.wompiTransactionId}</td>
                      <td className="p-4 text-slate-500 font-mono text-[10px] max-w-[8rem] truncate" title={tx.reference}>
                        {tx.reference}
                      </td>
                      <td className="p-4 text-slate-400">
                        {new Date(tx.createdAt).toLocaleDateString('es-ES', { dateStyle: 'short' })}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                          tx.status === 'APPROVED' ? 'bg-emerald-950 text-emerald-400 border-emerald-900/50' :
                          tx.status === 'DECLINED' ? 'bg-rose-950 text-rose-400 border-rose-900/50' :
                          'bg-slate-950 text-slate-500 border-slate-900'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
