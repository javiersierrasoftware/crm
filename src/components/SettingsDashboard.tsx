'use client';

import React, { useState, useEffect } from 'react';
import { generateApiKeyAction, revokeApiKeyAction } from '@/server/actions/apiKeyActions';
import { getAuditLogsAction } from '@/server/actions/auditActions';
import { getWompiPaymentDataAction, confirmWompiPaymentAction } from '@/server/actions/paymentActions';
import {
  Settings,
  Shield,
  Key,
  CreditCard,
  Plus,
  Trash2,
  Lock,
  Copy,
  Check,
  Activity,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Calendar,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

interface SettingsDashboardProps {
  organization: any;
  subscription: any;
  plan: any;
  plans?: any[];
  initialApiKeys: any[];
  initialAuditLogs: { logs: any[]; total: number };
}

export default function SettingsDashboard({
  organization,
  subscription,
  plan,
  plans = [],
  initialApiKeys = [],
  initialAuditLogs,
}: SettingsDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const wompiTxId = searchParams.get('id');

  // Active Tab: 'general' | 'keys' | 'audit'
  const [activeTab, setActiveTab] = useState<'general' | 'keys' | 'audit'>('general');

  // API Keys state
  const [apiKeys, setApiKeys] = useState<any[]>(initialApiKeys);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<any[]>(initialAuditLogs.logs);
  const [auditTotal, setAuditTotal] = useState(initialAuditLogs.total);
  const [auditPage, setAuditPage] = useState(1);
  const [isAuditLoading, setIsAuditLoading] = useState(false);

  // Wompi payment integration states
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [wompiStatusAlert, setWompiStatusAlert] = useState<'success' | 'error' | null>(null);
  const [isPaymentLoading, setIsPaymentLoading] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  // Sync API Keys initial state
  useEffect(() => {
    setApiKeys(initialApiKeys);
  }, [initialApiKeys]);

  // Check and process Wompi payment confirmation on landing page mount
  useEffect(() => {
    if (wompiTxId) {
      const confirmPayment = async () => {
        setIsVerifyingPayment(true);
        setWompiStatusAlert(null);
        try {
          const res = await confirmWompiPaymentAction(wompiTxId);
          if (res.success) {
            setWompiStatusAlert('success');
            // Remove search params from URL safely
            router.replace('/dashboard/settings');
            router.refresh();
          } else {
            setWompiStatusAlert('error');
          }
        } catch (err) {
          console.error('Error confirming payment:', err);
          setWompiStatusAlert('error');
        } finally {
          setIsVerifyingPayment(false);
        }
      };
      confirmPayment();
    }
  }, [wompiTxId]);

  // Load audit logs dynamically on page change
  const fetchAuditLogs = async (pageNum: number) => {
    setIsAuditLoading(true);
    try {
      const res = await getAuditLogsAction(pageNum, 10);
      if (res.success) {
        setAuditLogs(res.logs || []);
        setAuditTotal(res.total || 0);
        setAuditPage(pageNum);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setIsAuditLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs(1);
    }
  }, [activeTab]);

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setIsGenerating(true);
    try {
      const res = await generateApiKeyAction({ name: newKeyName.trim() });
      if (res.success && res.originalKey) {
        setGeneratedKey(res.originalKey);
        setIsModalOpen(true);
        setNewKeyName('');
        router.refresh();
      } else {
        alert(res.error || 'Error al generar la clave de API');
      }
    } catch {
      alert('Error de red al generar clave');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('¿Está seguro de que desea revocar esta clave de API? Las aplicaciones asociadas perderán acceso de inmediato.')) {
      return;
    }

    try {
      const res = await revokeApiKeyAction(keyId);
      if (res.success) {
        setApiKeys(prev => prev.map(k => (k._id === keyId ? { ...k, isRevoked: true } : k)));
        router.refresh();
      } else {
        alert(res.error || 'Error al revocar la clave');
      }
    } catch {
      alert('Error de red al revocar la clave');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Launch Wompi payment widget redirect
  const handlePayPlan = async (planCode: 'PLAN_INICIAL' | 'PLAN_PROFESIONAL', period: 'monthly' | 'yearly') => {
    setIsPaymentLoading(`${planCode}_${period}`);
    try {
      const res = await getWompiPaymentDataAction(planCode, period);
      if (res.success && res.checkoutUrl) {
        // Redirect to Wompi Web Checkout
        window.location.href = res.checkoutUrl;
      } else {
        alert(res.error || 'No se pudieron generar los parámetros de pago con Wompi.');
      }
    } catch (err: any) {
      alert('Error de red al iniciar pago con Wompi: ' + err.message);
    } finally {
      setIsPaymentLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Header */}
      <div className="h-16 border-b border-slate-900 px-8 flex items-center justify-between bg-slate-950/20">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-500" />
          <span className="text-xs font-black text-white">Configuración del Inquilino</span>
        </div>
      </div>

      {/* Verification overlay modal */}
      {isVerifyingPayment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center z-50 p-6">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
          <h4 className="text-sm font-bold text-white mb-1">Confirmando Pago con Wompi...</h4>
          <p className="text-[10px] text-slate-500">Por favor espere un momento. Estamos verificando los fondos y renovando su plan.</p>
        </div>
      )}

      <div className="px-8 py-8 max-w-4xl space-y-6">
        {/* Wompi Transaction Status Alert Banner */}
        {wompiStatusAlert === 'success' && (
          <div className="bg-emerald-950/40 border border-emerald-900 text-emerald-400 text-xs p-4 rounded-xl flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong className="block mb-0.5">¡Transacción Aprobada!</strong>
              <span>Su pago se procesó exitosamente. Su plan ha sido actualizado y se envió un comprobante a su correo.</span>
            </div>
          </div>
        )}

        {wompiStatusAlert === 'error' && (
          <div className="bg-rose-950/40 border border-rose-900 text-rose-400 text-xs p-4 rounded-xl flex items-start gap-2.5 animate-pulse">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong className="block mb-0.5">Fallo en la verificación</strong>
              <span>La transacción con Wompi no pudo ser validada o fue rechazada. Por favor intente de nuevo.</span>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-900 gap-1.5 pb-0">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'general'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" /> General
          </button>
          <button
            onClick={() => setActiveTab('keys')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'keys'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5" /> Claves de API
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Seguridad y Auditoría
          </button>
        </div>

        {/* TAB CONTENT: GENERAL */}
        {activeTab === 'general' && (
          <div className="space-y-6 animate-fade-in">
            {/* Organization Info */}
            <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl shadow-xl">
              <h3 className="text-xs font-black uppercase text-white tracking-wider border-b border-slate-900 pb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-500" /> Perfil de la Organización
              </h3>

              <div className="grid md:grid-cols-2 gap-4 text-xs mt-4">
                <div>
                  <span className="text-slate-500 block mb-1">Razón Social</span>
                  <div className="bg-slate-950 border border-slate-900 p-2.5 rounded-lg text-white font-medium">
                    {organization?.name}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Identificación Tributaria (NIT)</span>
                  <div className="bg-slate-950 border border-slate-900 p-2.5 rounded-lg text-white font-mono">
                    {organization?.taxId || 'N/A'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Sector Industrial</span>
                  <div className="bg-slate-950 border border-slate-900 p-2.5 rounded-lg text-white">
                    {organization?.sector}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Ubicación</span>
                  <div className="bg-slate-950 border border-slate-900 p-2.5 rounded-lg text-white">
                    {organization?.city}, {organization?.country}
                  </div>
                </div>
              </div>
            </div>

            {/* Subscription status */}
            <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl shadow-xl">
              <h3 className="text-xs font-black uppercase text-white tracking-wider border-b border-slate-900 pb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-500" /> Facturación y Plan de Suscripción Activo
              </h3>

              <div className="grid md:grid-cols-2 gap-6 text-xs mt-4 pb-6 border-b border-slate-900">
                <div>
                  <span className="text-slate-500 block mb-1">Plan Actual</span>
                  <div className="bg-indigo-950/40 border border-indigo-900 text-indigo-400 p-4 rounded-xl">
                    <span className="font-extrabold text-sm block mb-1">{plan?.name || 'Prueba / Inicial'}</span>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">
                      Estado: {subscription?.status || 'trialing'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">Fecha de Inicio:</span>
                    <span className="text-white font-bold">
                      {subscription?.currentPeriodStart ? new Date(subscription.currentPeriodStart).toLocaleDateString('es-CO') : 'N/D'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">Próximo Vencimiento:</span>
                    <span className="text-white font-bold text-indigo-400">
                      {subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString('es-CO') : 'N/D'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">Asesores Habilitados:</span>
                    <span className="text-white font-bold">5 / {plan?.maxUsers || 3}</span>
                  </div>
                </div>
              </div>

              {/* Purchase / Renew plans grid */}
              <div className="mt-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 pb-3 border-b border-slate-900">
                  <h4 className="text-[10px] uppercase font-black text-white tracking-wider">Adquirir / Renovar Suscripción (Pasarela Wompi)</h4>
                  
                  {/* Period selector */}
                  <div className="inline-flex items-center gap-1 bg-slate-950 border border-slate-900 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setBillingPeriod('monthly')}
                      className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                        billingPeriod === 'monthly' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Mensual
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingPeriod('yearly')}
                      className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                        billingPeriod === 'yearly' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Anual (20% Desc)
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {plans.filter(p => p.code !== 'PLAN_EMPRESARIAL' && p.code !== 'PLAN_GRATIS').map((p) => {
                    const isCurrent = plan?.code === p.code;
                    const baseDiscountPrice = Math.round(p.price * (1 - (p.discountPercent || 0) / 100));
                    const finalPrice = billingPeriod === 'yearly' ? Math.round(baseDiscountPrice * 12 * 0.80) : baseDiscountPrice;
                    const basePriceNoDiscount = billingPeriod === 'yearly' ? Math.round(p.price * 12 * 0.80) : p.price;
                    const periodLabel = billingPeriod === 'monthly' ? 'COP / mes' : 'COP / año';
                    const isPaymentProcessing = isPaymentLoading === `${p.code}_${billingPeriod}`;

                    return (
                      <div key={p.code} className="bg-slate-950/80 border border-slate-900 p-5 rounded-xl flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-extrabold text-xs text-white">{p.name}</span>
                            <div className="flex gap-1">
                              {billingPeriod === 'yearly' && (
                                <span className="bg-emerald-950 text-emerald-400 border border-emerald-900 text-[8px] font-bold px-1 py-0.5 rounded">
                                  AHORRA 20%
                                </span>
                              )}
                              {p.discountPercent > 0 && (
                                <span className="bg-emerald-950 text-emerald-400 border border-emerald-900 text-[8px] font-bold px-1 py-0.5 rounded">
                                  -{p.discountPercent}% DCTO
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-500 mb-3">
                            {billingPeriod === 'monthly' ? 'Renovación mensual.' : 'Renovación anual.'}
                          </p>
                          <div className="flex items-baseline gap-1 mb-4">
                            <span className="text-lg font-black text-emerald-400">
                              ${finalPrice.toLocaleString('es-CO')}
                            </span>
                            <span className="text-slate-500 text-[10px]">{periodLabel}</span>
                            {(p.discountPercent > 0 || billingPeriod === 'yearly') && (
                              <span className="text-[10px] text-slate-500 line-through ml-2 font-mono">
                                ${basePriceNoDiscount.toLocaleString('es-CO')}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handlePayPlan(p.code, billingPeriod)}
                          disabled={isPaymentLoading !== null}
                          className={`w-full font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors ${
                            isCurrent
                              ? 'bg-indigo-950 border border-indigo-900 text-indigo-400 hover:bg-indigo-900/60'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/10'
                          }`}
                        >
                          {isPaymentProcessing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CreditCard className="w-3.5 h-3.5" />
                          )}
                          {isCurrent ? 'Renovar Plan' : 'Adquirir Plan'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: API KEYS */}
        {activeTab === 'keys' && (
          <div className="space-y-6 animate-fade-in">
            {/* Create API key form */}
            <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl shadow-xl">
              <h3 className="text-xs font-black uppercase text-white tracking-wider border-b border-slate-900 pb-3 flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-500" /> Generar Clave de API
              </h3>
              <p className="text-[10px] text-slate-500 mt-2 mb-4 leading-relaxed">
                Utiliza las claves de API para conectar herramientas de automatización externas (ej. Zapier, Make, o integraciones propietarias).
              </p>

              <form onSubmit={handleGenerateKey} className="flex gap-3">
                <input
                  type="text"
                  placeholder="Nombre identificador (ej. Integración Zapier Ventas)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white"
                  required
                />
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
                >
                  {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Generar Clave
                </button>
              </form>
            </div>

            {/* API Keys list table */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-950/40 text-slate-400 font-bold">
                    <th className="p-4">Identificador / Nombre</th>
                    <th className="p-4">Vista Previa (Preview)</th>
                    <th className="p-4">Permisos (Scopes)</th>
                    <th className="p-4">Fecha Creación</th>
                    <th className="p-4 text-right">Estado / Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {apiKeys.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        No has generado ninguna clave de API comercial para esta organización.
                      </td>
                    </tr>
                  ) : (
                    apiKeys.map((k) => (
                      <tr key={k._id} className="hover:bg-slate-900/10 transition-colors">
                        <td className="p-4 font-bold text-white">{k.name}</td>
                        <td className="p-4 font-mono text-slate-400">{k.keyPreview}</td>
                        <td className="p-4">
                          <span className="bg-slate-950 border border-slate-900 text-slate-400 font-mono text-[9px] px-1.5 py-0.5 rounded">
                            {k.scopes ? k.scopes.join(', ') : 'read, write'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400">
                          {new Date(k.createdAt).toLocaleDateString('es-ES', { dateStyle: 'short' })}
                        </td>
                        <td className="p-4 text-right">
                          {k.isRevoked ? (
                            <span className="bg-rose-950/40 border border-rose-900/40 text-rose-400 font-bold text-[9px] px-2 py-0.5 rounded uppercase">
                              Revocada
                            </span>
                          ) : (
                            <button
                              onClick={() => handleRevokeKey(k._id)}
                              className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 p-1.5 rounded-lg transition-colors flex items-center gap-1 ml-auto"
                              title="Revocar Acceso"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB CONTENT: AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl shadow-xl">
              <h3 className="text-xs font-black uppercase text-white tracking-wider border-b border-slate-900 pb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-500" /> Bitácora de Auditoría de Operaciones
              </h3>
              <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                Historial cronológico de accesos, actualizaciones de base de datos y flujos despachados por los asesores comerciales.
              </p>
            </div>

            {/* Audit Logs Table */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
              {isAuditLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" /> Cargando bitácora de auditoría...
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  Cero logs registrados en el historial de auditoría del inquilino.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-900 bg-slate-950/40 text-slate-400 font-bold">
                        <th className="p-4">Fecha y Hora</th>
                        <th className="p-4">Usuario</th>
                        <th className="p-4">Operación</th>
                        <th className="p-4">Elemento / Entidad</th>
                        <th className="p-4">Origen IP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 font-sans">
                      {auditLogs.map((log) => (
                        <tr key={log._id} className="hover:bg-slate-900/10 transition-colors">
                          <td className="p-4 text-slate-400 font-mono">
                            {new Date(log.createdAt).toLocaleString('es-ES', {
                              dateStyle: 'short',
                              timeStyle: 'medium',
                            })}
                          </td>
                          <td className="p-4 font-bold text-white flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[9px] uppercase font-bold">
                              {log.userName ? log.userName.charAt(0) : 'S'}
                            </span>
                            {log.userName || 'Sistema'}
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono border ${
                              log.action.includes('create') ? 'bg-indigo-950 text-indigo-400 border-indigo-900/40' :
                              log.action.includes('complete') ? 'bg-emerald-950 text-emerald-400 border-emerald-900/40' :
                              'bg-slate-950 text-slate-400 border-slate-900'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="p-4 text-slate-300 font-mono text-[10px]">
                            {log.entityType ? `${log.entityType} (${log.entityId ? log.entityId.substring(0, 8) + '...' : 'N/D'})` : 'Global'}
                          </td>
                          <td className="p-4 text-slate-500 font-mono">{log.ipAddress || '127.0.0.1 (Local)'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination footer */}
              {auditTotal > 10 && (
                <div className="bg-slate-950/40 border-t border-slate-900/80 px-6 py-4 flex items-center justify-between text-xs text-slate-500">
                  <div>
                    Página <strong className="text-slate-300">{auditPage}</strong> de{' '}
                    <strong className="text-slate-300">{Math.ceil(auditTotal / 10)}</strong> ({auditTotal.toLocaleString()} registros)
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchAuditLogs(auditPage - 1)}
                      disabled={auditPage <= 1 || isAuditLoading}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-700 px-3 py-1 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Anterior
                    </button>
                    <button
                      onClick={() => fetchAuditLogs(auditPage + 1)}
                      disabled={auditPage * 10 >= auditTotal || isAuditLoading}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-700 px-3 py-1 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                    >
                      Siguiente <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SINGLE COPY KEY DISPLAY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4 animate-scale-up">
            <div className="flex items-center gap-2.5 text-indigo-400">
              <Lock className="w-6 h-6" />
              <h4 className="font-bold text-white text-sm">Clave de API Generada Exitosamente</h4>
            </div>

            <div className="bg-rose-950/40 border border-rose-900 text-rose-400 text-[10px] p-3.5 rounded-xl leading-relaxed">
              ⚠️ <strong>IMPORTANTE:</strong> Por motivos de seguridad, esta clave de API se muestra **solo una vez**. Cópiela y guárdela en un lugar seguro (como un gestor de contraseñas). Si la pierde, tendrá que revocarla y generar una nueva.
            </div>

            {/* Display code block key */}
            <div className="relative bg-slate-950 border border-slate-900 p-3 rounded-xl flex items-center justify-between gap-3 select-all">
              <span className="font-mono text-xs text-indigo-300 truncate max-w-[20rem]">{generatedKey}</span>
              <button
                type="button"
                onClick={copyToClipboard}
                className="bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white p-2 rounded-lg transition-colors border border-slate-800 shrink-0"
                title="Copiar al portapapeles"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setGeneratedKey('');
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10"
              >
                Entendido, la he guardado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
