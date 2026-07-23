'use client';

import React, { useState } from 'react';
import { createCompanyAction } from '@/server/actions/companyActions';
import { Building2, ArrowLeft, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NewCompanyPage() {
  const router = useRouter();

  // Form states
  const [razonSocial, setRazonSocial] = useState('');
  const [nit, setNit] = useState('');
  const [actividad, setActividad] = useState('');
  const [dirComercial, setDirComercial] = useState('');
  const [emailComercial, setEmailComercial] = useState('');
  const [telCom1, setTelCom1] = useState('');
  const [munComercial, setMunComercial] = useState('');
  const [status, setStatus] = useState('Nuevo');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!razonSocial || !nit) {
      setErrorMsg('Razón Social y NIT son campos obligatorios.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await createCompanyAction({
        razonSocial,
        nit,
        actividad,
        dirComercial,
        emailComercial,
        telCom1,
        munComercial,
        status,
      });

      if (res.success) {
        setSuccessMsg('✓ Empresa creada exitosamente. Redirigiendo al directorio...');
        setTimeout(() => {
          router.push('/dashboard/companies');
        }, 1500);
      } else {
        setErrorMsg(res.error || 'Error al crear la empresa');
      }
    } catch {
      setErrorMsg('Error de red al guardar los datos de la empresa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Header */}
      <div className="h-16 border-b border-slate-900 px-8 flex items-center gap-4 bg-slate-950/20">
        <Link
          href="/dashboard/companies"
          className="w-9 h-9 rounded-xl border border-slate-900 hover:border-slate-800 flex items-center justify-center bg-slate-950 text-slate-400 hover:text-white transition-all shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-indigo-500" />
          <span className="text-xs font-black text-white uppercase tracking-wider">Agregar Nueva Empresa</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-slate-900/40 border border-slate-800/80 p-8 rounded-2xl shadow-2xl space-y-6">
          <div>
            <h3 className="text-xs font-black uppercase text-white tracking-wider border-b border-slate-900 pb-3">
              Ficha de Registro Corporativo
            </h3>
            <p className="text-[10px] text-slate-500 mt-2">
              Ingrese los detalles comerciales de la empresa. Razón Social y NIT son requeridos obligatoriamente.
            </p>
          </div>

          {errorMsg && (
            <div className="bg-rose-950/40 border border-rose-900 text-rose-400 text-xs p-4 rounded-xl flex items-start gap-2.5 animate-pulse">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-950/40 border border-emerald-900 text-emerald-400 text-xs p-4 rounded-xl flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Razón Social */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Razón Social</label>
                <input
                  type="text"
                  placeholder="Ej. AVALON TECHNOLOGIES S.A.S."
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white"
                  required
                />
              </div>

              {/* NIT */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">NIT / Identificación</label>
                <input
                  type="text"
                  placeholder="Ej. 901188987-1"
                  value={nit}
                  onChange={(e) => setNit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white"
                  required
                />
              </div>
            </div>

            {/* Actividad Principal */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Actividad Principal</label>
              <input
                type="text"
                placeholder="Ej. Actividades de desarrollo de sistemas informáticos"
                value={actividad}
                onChange={(e) => setActividad(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Correo Comercial */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Correo Electrónico Comercial</label>
                <input
                  type="email"
                  placeholder="Ej. contacto@empresa.com"
                  value={emailComercial}
                  onChange={(e) => setEmailComercial(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Teléfono de Contacto</label>
                <input
                  type="text"
                  placeholder="Ej. +57 300 437 1592"
                  value={telCom1}
                  onChange={(e) => setTelCom1(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dirección */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Dirección Comercial</label>
                <input
                  type="text"
                  placeholder="Ej. Calle 15 # 30-60"
                  value={dirComercial}
                  onChange={(e) => setDirComercial(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              {/* Ciudad / Municipio */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Ciudad / Municipio</label>
                <input
                  type="text"
                  placeholder="Ej. 70001 - SINCELEJO"
                  value={munComercial}
                  onChange={(e) => setMunComercial(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>
            </div>

            {/* Estado Inicial */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Estado Inicial en el CRM</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white h-10"
              >
                <option value="Nuevo">Nuevo</option>
                <option value="uncontacted">Sin Contactar</option>
                <option value="contacted">Contactado</option>
                <option value="interested">Interesado</option>
                <option value="following_up">Seguimiento</option>
                <option value="client">Cliente</option>
              </select>
            </div>

            {/* Action buttons */}
            <div className="pt-6 border-t border-slate-900 flex justify-end gap-3">
              <Link
                href="/dashboard/companies"
                className="bg-slate-905 border border-slate-900 hover:border-slate-800 text-slate-400 hover:text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Crear Empresa
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
