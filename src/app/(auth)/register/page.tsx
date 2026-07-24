'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerTenant } from '@/server/actions/authActions';
import { Shield, User, Mail, Lock, Building2, Globe, Landmark, Loader2, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
    sector: 'Tecnología',
    country: 'Colombia',
    city: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await registerTenant({
        name: formData.name,
        email: formData.email,
        passwordHash: formData.password, // Plain string to be hashed inside action
        companyName: formData.companyName,
        sector: formData.sector,
        country: formData.country,
        city: formData.city,
      });

      if (result.success) {
        // Redirect to login page with indicator
        router.push('/login?registered=true');
      } else {
        setErrorMessage(result.error || 'Error durante el registro');
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('Error en registro:', err);
      setErrorMessage(err?.message || 'Error de red o conexión con el servidor. Intente más tarde.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center py-12 px-6 relative font-sans">
      {/* Background blurs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl p-8 rounded-2xl shadow-xl shadow-black/30 z-10">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white text-2xl shadow-lg shadow-indigo-600/30 mx-auto mb-4">
            C
          </div>
          <h2 className="text-2xl font-extrabold text-white mb-2">Comienza Gratis</h2>
          <p className="text-slate-400 text-xs">
            Crea tu cuenta de propietario e inicializa tu organización en un solo paso
          </p>
        </div>

        {errorMessage && (
          <div className="bg-rose-950/40 border border-rose-900 text-rose-400 text-xs p-4 rounded-lg mb-6 leading-relaxed">
            ⚠ {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: User Data */}
          <div>
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block mb-3">Datos del Propietario</span>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nombre Completo</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    disabled={isLoading}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                    placeholder="Ej. Alejandro Pérez"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Correo Electrónico</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    disabled={isLoading}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                    placeholder="alejandro@empresa.com"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-300 mb-1">Contraseña de Seguridad</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  disabled={isLoading}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                  placeholder="Min. 8 caracteres"
                  minLength={8}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Org Data */}
          <div className="border-t border-slate-900 pt-6">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block mb-3">Datos de tu Empresa</span>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nombre Comercial</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Building2 className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    disabled={isLoading}
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                    placeholder="Ej. Soluciones Alfa"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Sector Económico</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Landmark className="w-4 h-4" />
                  </span>
                  <select
                    disabled={isLoading}
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50 appearance-none"
                  >
                    <option value="Tecnología">Tecnología</option>
                    <option value="Servicios">Servicios</option>
                    <option value="Retail">Retail</option>
                    <option value="Construcción">Construcción</option>
                    <option value="Manufactura">Manufactura</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">País</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Globe className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    disabled={isLoading}
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                    placeholder="Ej. Colombia"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Ciudad</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Building2 className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    disabled={isLoading}
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                    placeholder="Ej. Bogotá"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Accept privacy policies */}
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Al hacer clic en Registrarse, aceptas nuestra **Política de Privacidad**, **Términos de Servicio** y el **Tratamiento Ético de Datos** de acuerdo a la legislación de protección de datos personales.
          </p>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 hover:scale-[1.01] disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Registrando Organización...
              </>
            ) : (
              <>
                Comenzar Registro <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-900 text-center text-xs text-slate-500">
          ¿Ya tienes una cuenta comercial?{' '}
          <a href="/login" className="text-indigo-400 hover:text-indigo-300 font-bold">
            Inicia sesión
          </a>
        </div>
      </div>
    </div>
  );
}
