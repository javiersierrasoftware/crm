'use client';

import React, { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Shield, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

function LoginCard() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Check query indicators for success redirection (e.g. from register)
  const isRegistered = searchParams.get('registered') === 'true';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await signIn('credentials', {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === 'CredentialsSignin' || result.error.includes('Read more')) {
          setErrorMessage('Credenciales inválidas. Verifique su correo y contraseña.');
        } else if (result.error === 'USER_SUSPENDED') {
          setErrorMessage('Su cuenta ha sido suspendida. Contacte al administrador.');
        } else {
          setErrorMessage('Error en el inicio de sesión. Intente nuevamente.');
        }
        setIsLoading(false);
      } else {
        // Redirect to dashboard on success
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      console.error('Error en login:', err);
      setErrorMessage(err?.message || 'Error de red o conexión con el servidor. Intente más tarde.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl p-8 rounded-2xl shadow-xl shadow-black/30">
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white text-2xl shadow-lg shadow-indigo-600/30 mx-auto mb-4">
          C
        </div>
        <h2 className="text-2xl font-extrabold text-white mb-2">Ingresar a CREATIX</h2>
        <p className="text-slate-400 text-xs">
          Ingrese sus credenciales de acceso para entrar al CRM
        </p>
      </div>

      {isRegistered && (
        <div className="bg-emerald-950/40 border border-emerald-900 text-emerald-400 text-xs p-4 rounded-lg mb-6 leading-relaxed">
          ✓ ¡Registro completado con éxito! Inicie sesión a continuación utilizando su correo electrónico.
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-950/40 border border-rose-900 text-rose-400 text-xs p-4 rounded-lg mb-6 leading-relaxed">
          ⚠ {errorMessage}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              placeholder="nombre@empresa.com"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-xs font-bold text-slate-300">Contraseña</label>
            <a href="#recovery" className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold">
              ¿Olvidó su contraseña?
            </a>
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
              <Lock className="w-4 h-4" />
            </span>
            <input
              type="password"
              required
              disabled={isLoading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 hover:scale-[1.01] disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Iniciando Sesión...
            </>
          ) : (
            <>
              Ingresar <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-slate-900 text-center text-xs text-slate-500">
        ¿No tienes una cuenta aún?{' '}
        <a href="/register" className="text-indigo-400 hover:text-indigo-300 font-bold">
          Regístrate gratis
        </a>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6 relative font-sans">
      {/* Background blur shapes */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

      <Suspense fallback={
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-2" />
          <span className="text-xs text-slate-400">Cargando formulario...</span>
        </div>
      }>
        <LoginCard />
      </Suspense>
    </div>
  );
}
