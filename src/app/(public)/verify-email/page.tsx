import React from 'react';
import { verifyEmailAction } from '@/server/actions/authActions';
import Link from 'next/link';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans p-6">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md text-center space-y-4 shadow-xl">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Verificación Inválida</h2>
          <p className="text-slate-400 text-xs">El token de verificación de correo no ha sido proporcionado o es incorrecto.</p>
          <Link href="/login" className="block w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg text-xs transition-all">
            Ir al Inicio de Sesión
          </Link>
        </div>
      </div>
    );
  }

  const result = await verifyEmailAction(token);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans p-6">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md text-center space-y-4 shadow-2xl">
        {result.success ? (
          <>
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-bold text-white">¡Correo Verificado!</h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              Su dirección de correo electrónico ha sido confirmada con éxito. Ya puede ingresar a su panel de administración y activar su plan comercial.
            </p>
            <Link href="/login" className="block w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg text-xs transition-all shadow-lg shadow-indigo-600/20">
              Iniciar Sesión
            </Link>
          </>
        ) : (
          <>
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h2 className="text-xl font-bold text-white">Error de Activación</h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              {result.error || 'El token de verificación ha expirado o ya fue utilizado.'}
            </p>
            <Link href="/login" className="block w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-lg text-xs transition-all">
              Volver al Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
