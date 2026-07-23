'use client';

import React, { useState } from 'react';
import { getWompiPaymentDataAction } from '@/server/actions/paymentActions';
import { loadTenantDatabaseAction } from '@/server/actions/companyActions';
import {
  Mail,
  Lock,
  CreditCard,
  Building2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Database,
  ArrowRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import SignOutButton from './SignOutButton';

/* 1. EMAIL VERIFICATION LOCK SCREEN */
export function EmailVerificationLock({ email }: { email: string }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans p-6">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md text-center space-y-5 shadow-2xl">
        <div className="w-16 h-16 bg-indigo-950/40 border border-indigo-900 rounded-2xl flex items-center justify-center mx-auto text-indigo-400">
          <Mail className="w-8 h-8 animate-pulse" />
        </div>
        <h2 className="text-xl font-bold text-white">Verifique su correo electrónico</h2>
        <p className="text-slate-400 text-xs leading-relaxed">
          Hemos enviado un enlace de confirmación a <strong>{email}</strong>. Por favor, revise su bandeja de entrada (o carpeta de spam) y haga clic en el botón de verificación para activar su acceso.
        </p>
        <div className="pt-2 border-t border-slate-950 flex flex-col gap-2">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md shadow-indigo-600/10"
          >
            Ya lo he verificado, continuar
          </button>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}

/* 2. UNPAID/EXPIRED LOCK SCREEN (Wompi payment selector) */
export function UnpaidLockScreen({ plans = [] }: { plans: any[] }) {
  const [isPaymentLoading, setIsPaymentLoading] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const handlePayPlan = async (planCode: 'PLAN_INICIAL' | 'PLAN_PROFESIONAL', period: 'monthly' | 'yearly') => {
    setIsPaymentLoading(`${planCode}_${period}`);
    try {
      const res = await getWompiPaymentDataAction(planCode, period);
      if (res.success && res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        alert(res.error || 'No se pudieron generar los parámetros de pago con Wompi.');
      }
    } catch (err: any) {
      alert('Error de red al iniciar pago: ' + err.message);
    } finally {
      setIsPaymentLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans p-6">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-2xl text-center space-y-6 shadow-2xl animate-fade-in animate-duration-150">
        <div className="w-12 h-12 bg-indigo-950/40 border border-indigo-900 rounded-xl flex items-center justify-center mx-auto text-indigo-400">
          <Lock className="w-5 h-5" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Activa tu Plan Comercial</h2>
          <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
            Para desbloquear el acceso a las funciones comerciales, la bitácora de clientes y las campañas automatizadas, por favor realiza tu pago a través de Wompi.
          </p>
        </div>

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

        {/* Pricing selector */}
        <div className="grid md:grid-cols-2 gap-4 text-left pt-2">
          {plans.filter(p => p.code !== 'PLAN_EMPRESARIAL' && p.code !== 'PLAN_GRATIS').map((p) => {
            const baseDiscountPrice = Math.round(p.price * (1 - (p.discountPercent || 0) / 100));
            const finalPrice = billingPeriod === 'yearly' ? Math.round(baseDiscountPrice * 12 * 0.80) : baseDiscountPrice;
            const basePriceNoDiscount = billingPeriod === 'yearly' ? Math.round(p.price * 12 * 0.80) : p.price;
            const periodLabel = billingPeriod === 'monthly' ? 'COP / mes' : 'COP / año';
            const isPaymentProcessing = isPaymentLoading === `${p.code}_${billingPeriod}`;

            return (
              <div key={p.code} className="bg-slate-950 border border-slate-900/60 p-5 rounded-2xl flex flex-col justify-between space-y-4">
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
                  <p className="text-[10px] text-slate-500">Acceso completo e inicio inmediato.</p>
                  <div className="flex items-baseline gap-1 mt-3">
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
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 disabled:opacity-50"
                >
                  {isPaymentProcessing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CreditCard className="w-3.5 h-3.5" />
                  )}
                  Pagar Suscripción
                </button>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-slate-950/80">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}

/* 3. ONBOARDING DATABASE SEED LOADER */
export function OnboardingDbLoader({
  planName,
  maxCompanies,
  sector,
}: {
  planName: string;
  maxCompanies: number;
  sector: string;
}) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(maxCompanies);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLoadDb = async () => {
    setIsLoading(true);
    setStatus('idle');
    try {
      const res = await loadTenantDatabaseAction(quantity);
      if (res.success) {
        setStatus('success');
        setTimeout(() => {
          router.refresh();
        }, 1500);
      } else {
        setStatus('error');
        setErrorMsg(res.error || 'Fallo al precargar empresas.');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Error de red durante la precarga.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans p-6">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md text-center space-y-6 shadow-2xl">
        <div className="w-12 h-12 bg-indigo-950/40 border border-indigo-900 rounded-xl flex items-center justify-center mx-auto text-indigo-400">
          <Database className="w-5 h-5" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">¡Plan Comercial Activo!</h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            Su suscripción al <strong>{planName}</strong> está activa. Iniciemos la precarga de empresas en su CRM para comenzar a vender.
          </p>
        </div>

        {status === 'success' ? (
          <div className="bg-emerald-950/40 border border-emerald-900 text-emerald-400 text-xs p-4 rounded-xl flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>✓ Base de datos precargada. Ingresando...</span>
          </div>
        ) : (
          <div className="space-y-4 text-left">
            {status === 'error' && (
              <div className="bg-rose-950/40 border border-rose-900 text-rose-400 text-xs p-3.5 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Sector Industrial Seleccionado</label>
              <div className="bg-slate-950 border border-slate-900/60 p-2.5 rounded-xl text-xs text-white font-medium">
                {sector || 'Varios / Tecnología'}
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Cantidad de Empresas a Cargar</label>
              <div className="bg-slate-950 border border-slate-900/60 p-2.5 rounded-xl text-xs text-white font-medium">
                {maxCompanies.toLocaleString()} empresas (Incluido en su plan)
              </div>
              <span className="text-[9px] text-slate-500 mt-1 block">
                Se copiarán registros reales que corresponden a tu sector desde la base de datos central.
              </span>
            </div>

            <button
              onClick={handleLoadDb}
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              Precargar Empresas en el CRM
            </button>
          </div>
        )}

        <div className="pt-2">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
