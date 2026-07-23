'use client';

import React, { useState } from 'react';
import {
  Shield,
  Layers,
  Mail,
  Zap,
  CheckCircle2,
  ChevronDown,
  BarChart3,
  Calendar,
  FileSpreadsheet,
  Users,
  Settings,
  ArrowRight,
  Globe,
} from 'lucide-react';

export default function LandingPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const [demoForm, setDemoForm] = useState({ name: '', email: '', company: '', size: 'micro' });
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (demoForm.name && demoForm.email) {
      setDemoSubmitted(true);
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (contactForm.name && contactForm.email && contactForm.message) {
      setContactSubmitted(true);
    }
  };

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const pricing = {
    PLAN_INICIAL: { monthly: 29, yearly: 24 },
    PLAN_PROFESIONAL: { monthly: 79, yearly: 64 },
    PLAN_EMPRESARIAL: { monthly: 249, yearly: 199 },
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-indigo-600/30">
              C
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent">
              CREATIX<span className="text-indigo-500 font-light">CRM</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#beneficios" className="hover:text-indigo-400 transition-colors">Beneficios</a>
            <a href="#funcionalidades" className="hover:text-indigo-400 transition-colors">Funcionalidades</a>
            <a href="#planes" className="hover:text-indigo-400 transition-colors">Planes</a>
            <a href="#faq" className="hover:text-indigo-400 transition-colors">Preguntas Frecuentes</a>
            <a href="#contacto" className="hover:text-indigo-400 transition-colors">Contacto</a>
          </nav>

          <div className="flex items-center gap-4">
            <a
              href="/login"
              className="text-sm font-semibold hover:text-indigo-400 transition-colors"
            >
              Iniciar Sesión
            </a>
            <a
              href="/register"
              className="text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-all hover:scale-105 shadow-md shadow-indigo-600/20"
            >
              Registrarse
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 md:pt-32 md:pb-36 max-w-7xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-950/50 border border-indigo-900/50 rounded-full px-4 py-1.5 text-xs font-semibold text-indigo-400 mb-8 backdrop-blur-sm">
          <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
          CREATIX CRM SaaS Multiempresa v1.0
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight mb-8">
          Convierte bases de datos empresariales en{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-500 bg-clip-text text-transparent">
            oportunidades reales de negocio
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Administra prospectos, segmenta listas dinámicas, automatiza secuencias de marketing por correo y gestiona tu embudo de ventas en una plataforma multiempresa segura y de alto rendimiento.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#demo"
            className="w-full sm:w-auto text-center font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl transition-all hover:scale-105 shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
          >
            Solicitar Demostración <ArrowRight className="w-5 h-5" />
          </a>
          <a
            href="#funcionalidades"
            className="w-full sm:w-auto text-center font-bold bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 px-8 py-4 rounded-xl transition-all hover:scale-105"
          >
            Explorar Módulos
          </a>
        </div>
      </section>

      {/* Beneficios */}
      <section id="beneficios" className="py-20 border-t border-slate-900 bg-slate-900/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-white mb-4">¿Por qué CREATIX CRM?</h2>
            <p className="text-slate-400">
              Aceleramos tu ciclo de ventas unificando las bases de datos iniciales con automatización inteligente.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-900/50 border border-slate-800/80 p-8 rounded-2xl hover:border-indigo-500/30 transition-all hover:scale-[1.02]">
              <div className="w-12 h-12 bg-indigo-950 border border-indigo-900 rounded-xl flex items-center justify-center text-indigo-400 mb-6">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Aislamiento Seguro SaaS</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Aislamiento estricto de bases de datos por inquilino. La información de tu organización está completamente protegida con hashes y auditorías.
              </p>
            </div>

            <div className="bg-slate-900/50 border border-slate-800/80 p-8 rounded-2xl hover:border-indigo-500/30 transition-all hover:scale-[1.02]">
              <div className="w-12 h-12 bg-indigo-950 border border-indigo-900 rounded-xl flex items-center justify-center text-indigo-400 mb-6">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Automatización Comercial</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Configura disparadores ante registros o cambios de estado para enviar correos y asignar asesores automáticamente.
              </p>
            </div>

            <div className="bg-slate-900/50 border border-slate-800/80 p-8 rounded-2xl hover:border-indigo-500/30 transition-all hover:scale-[1.02]">
              <div className="w-12 h-12 bg-indigo-950 border border-indigo-900 rounded-xl flex items-center justify-center text-indigo-400 mb-6">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Campañas Inteligentes</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Envía campañas con enlaces de desuscripción obligatorios, pixels de aperturas y redirecciones de clic automatizados.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section id="funcionalidades" className="py-20 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-white mb-4">Todo lo que tu equipo necesita</h2>
            <p className="text-slate-400">
              Un CRM de clase empresarial diseñado para aumentar la productividad comercial de forma organizada.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: FileSpreadsheet, title: 'Importador CSV/Excel', desc: 'Asistente inteligente con alineación de columnas y control de duplicados.' },
              { icon: Layers, title: 'Embudo Kanban', desc: 'Gestiona oportunidades arrastrando negocios y calculando el valor ponderado.' },
              { icon: Users, title: 'Segmentación Dinámica', desc: 'Agrupa prospectos automáticamente aplicando reglas lógicas AND/OR.' },
              { icon: BarChart3, title: 'Reportes y Métricas', desc: 'Monitorea el pipeline de ventas, conversión de asesores y tasas de clics.' },
              { icon: Calendar, title: 'Agenda de Actividades', desc: 'Programa llamadas, videollamadas, visitas y tareas con alertas automáticas.' },
              { icon: Shield, title: 'Auditoría Total', desc: 'Historial detallado de accesos, impersonaciones y movimientos de negocios.' },
              { icon: Settings, title: 'Roles y Límites', desc: 'Define perfiles para vendedores, marketers y administradores sin solapamientos.' },
              { icon: Globe, title: 'API y Webhooks', desc: 'Integración completa mediante API Keys y procesamiento idempotente.' },
            ].map((f, i) => (
              <div key={i} className="bg-slate-900/30 border border-slate-900 p-6 rounded-xl">
                <f.icon className="w-8 h-8 text-indigo-500 mb-4" />
                <h4 className="text-md font-bold text-white mb-2">{f.title}</h4>
                <p className="text-slate-400 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planes y Comparación */}
      <section id="planes" className="py-20 border-t border-slate-900 bg-slate-900/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-extrabold text-white mb-4">Planes flexibles para cada etapa</h2>
            <p className="text-slate-400 mb-8">
              Escoge el plan que mejor se adapte al volumen de tu equipo comercial.
            </p>

            <div className="inline-flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
                  billingPeriod === 'monthly' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Mensual
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
                  billingPeriod === 'yearly' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Anual (20% Desc)
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
            {/* Plan Inicial */}
            <div className="bg-slate-900/50 border border-slate-800/80 p-8 rounded-2xl relative">
              <h3 className="text-lg font-bold text-white mb-2">Plan Inicial</h3>
              <p className="text-slate-400 text-xs mb-6">Para equipos comerciales pequeños.</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-extrabold text-white">
                  ${billingPeriod === 'monthly' ? pricing.PLAN_INICIAL.monthly : pricing.PLAN_INICIAL.yearly}
                </span>
                <span className="text-slate-400 text-xs">/ mes</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300 mb-8">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500" /> Hasta 3 usuarios</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500" /> Hasta 5.000 empresas</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500" /> Hasta 10.000 contactos</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500" /> 5.000 correos mensuales</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500" /> 5 automatizaciones activas</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500" /> Reportes básicos</li>
              </ul>
              <a href="/register" className="block text-center bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-lg text-xs transition-colors">
                Comenzar Prueba
              </a>
            </div>

            {/* Plan Profesional */}
            <div className="bg-slate-900/80 border-2 border-indigo-600 p-8 rounded-2xl relative shadow-xl shadow-indigo-500/5">
              <div className="absolute -top-3 right-6 bg-indigo-600 text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full">
                Recomendado
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Plan Profesional</h3>
              <p className="text-slate-400 text-xs mb-6">Para empresas en pleno crecimiento comercial.</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-extrabold text-white">
                  ${billingPeriod === 'monthly' ? pricing.PLAN_PROFESIONAL.monthly : pricing.PLAN_PROFESIONAL.yearly}
                </span>
                <span className="text-slate-400 text-xs">/ mes</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300 mb-8">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500" /> Hasta 10 usuarios</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500" /> Hasta 25.000 empresas</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500" /> Hasta 50.000 contactos</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500" /> 30.000 correos mensuales</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500" /> 15 automatizaciones activas</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500" /> Campos personalizados</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500" /> Reportes avanzados</li>
              </ul>
              <a href="/register" className="block text-center bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg text-xs transition-all shadow-md shadow-indigo-600/25">
                Comenzar Prueba
              </a>
            </div>

            {/* Plan Empresarial */}
            <div className="bg-slate-900/50 border border-slate-800/80 p-8 rounded-2xl relative">
              <h3 className="text-lg font-bold text-white mb-2">Plan Empresarial</h3>
              <p className="text-slate-400 text-xs mb-6">Para grandes volúmenes de envío y soporte VIP.</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-extrabold text-white">
                  ${billingPeriod === 'monthly' ? pricing.PLAN_EMPRESARIAL.monthly : pricing.PLAN_EMPRESARIAL.yearly}
                </span>
                <span className="text-slate-400 text-xs">/ mes</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300 mb-8">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500" /> Usuarios ilimitados</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500" /> Empresas configurables</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500" /> Contactos ilimitados</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500" /> Correos configurables</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500" /> Automatizaciones avanzadas</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500" /> Soporte prioritario 24/7</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500" /> Auditoría de accesos total</li>
              </ul>
              <a href="/register" className="block text-center bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-lg text-xs transition-colors">
                Contactar Ventas
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Solicitar Demo */}
      <section id="demo" className="py-20 border-t border-slate-900">
        <div className="max-w-xl mx-auto px-6">
          <div className="bg-slate-900/30 border border-slate-900 p-8 rounded-3xl shadow-xl">
            <h2 className="text-2xl font-bold text-center text-white mb-2">Solicita una demostración</h2>
            <p className="text-slate-400 text-xs text-center mb-6">
              Déjanos tus datos y un especialista te guiará para configurar tu primer embudo.
            </p>

            {demoSubmitted ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <h4 className="text-lg font-bold text-white mb-2">¡Solicitud recibida!</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Pronto nos pondremos en contacto contigo en <strong>{demoForm.email}</strong> para coordinar la videollamada.
                </p>
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={demoForm.name}
                    onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    placeholder="Ej. Alejandro Pérez"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Correo Corporativo</label>
                  <input
                    type="email"
                    required
                    value={demoForm.email}
                    onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    placeholder="Ej. alejandro@empresa.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Empresa</label>
                  <input
                    type="text"
                    required
                    value={demoForm.company}
                    onChange={(e) => setDemoForm({ ...demoForm, company: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    placeholder="Ej. Soluciones Globales"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg text-sm transition-all shadow-md shadow-indigo-600/20"
                >
                  Confirmar Solicitud
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Preguntas Frecuentes (FAQ) */}
      <section id="faq" className="py-20 border-t border-slate-900 bg-slate-900/20">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-extrabold text-center text-white mb-12">Preguntas Frecuentes</h2>

          <div className="space-y-4">
            {[
              { q: '¿Qué es el aislamiento multiempresa (multi-tenant)?', a: 'Significa que cada empresa cliente opera en una instancia virtual completamente separada (inquilino). Ningún usuario ajeno a tu empresa puede ver tus contactos, ventas o reportes.' },
              { q: '¿Cómo funciona el límite de correos mensuales?', a: 'Cada plan incluye una cantidad de envíos mensuales. Si te aproximas al límite (80%, 90% o 100%), el sistema te notificará en pantalla y por correo para que puedas realizar un upgrade.' },
              { q: '¿Qué sucede si importo contactos duplicados?', a: 'El asistente de importación detecta si el NIT o el correo electrónico de la empresa o contacto ya existe. Podrás elegir entre omitir la fila duplicada o actualizar los campos existentes.' },
              { q: '¿El enlace de desuscripción es obligatorio?', a: 'Sí, todas las campañas de marketing por ley y por políticas antispam del sistema inyectan de forma automática un enlace para darse de baja, protegiendo tu reputación de dominio.' },
            ].map((faq, i) => (
              <div key={i} className="bg-slate-900/30 border border-slate-900 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleFaq(i)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left font-semibold text-white focus:outline-none"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${activeFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {activeFaq === i && (
                  <div className="px-6 pb-4 text-sm text-slate-400 leading-relaxed border-t border-slate-950 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contacto */}
      <section id="contacto" className="py-20 border-t border-slate-900">
        <div className="max-w-xl mx-auto px-6">
          <div className="bg-slate-900/30 border border-slate-900 p-8 rounded-3xl shadow-xl">
            <h2 className="text-2xl font-bold text-center text-white mb-2">Contáctanos</h2>
            <p className="text-slate-400 text-xs text-center mb-6">
              ¿Tienes dudas técnicas o comerciales? Escríbenos directamente.
            </p>

            {contactSubmitted ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <h4 className="text-lg font-bold text-white mb-2">¡Mensaje enviado!</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Gracias por escribirnos. Nuestro equipo te responderá en las próximas horas.
                </p>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    placeholder="Ej. María Gómez"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    placeholder="Ej. maria.gomez@gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Mensaje</label>
                  <textarea
                    required
                    rows={4}
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                    placeholder="Escribe tu consulta aquí..."
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg text-sm transition-all shadow-md shadow-indigo-600/20"
                >
                  Enviar Mensaje
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-12 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <span className="font-bold text-slate-300">CREATIX-CRM</span> &copy; 2026. Todos los derechos reservados.
          </div>
          <div className="flex gap-6">
            <a href="#privacy" className="hover:text-slate-300 transition-colors">Política de Privacidad</a>
            <a href="#terms" className="hover:text-slate-300 transition-colors">Términos y Condiciones</a>
            <a href="#data-handling" className="hover:text-slate-300 transition-colors">Tratamiento de Datos</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
