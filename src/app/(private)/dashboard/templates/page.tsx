'use client';

import React, { useState, useEffect } from 'react';
import { createTemplate, getTemplates, deleteTemplate } from '@/server/actions/templateActions';
import { FileText, Plus, Trash2, Mail, MessageSquare, AlertCircle, Sparkles } from 'lucide-react';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'email' | 'whatsapp'>('all');

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<'email' | 'whatsapp'>('email');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    const res = await getTemplates();
    setTemplates(res);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !body) {
      setErrorMsg('El nombre y el cuerpo son campos obligatorios');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const res = await createTemplate({
      name,
      type,
      subject: type === 'email' ? subject : undefined,
      body,
    });

    if (res.success) {
      setSuccessMsg('Plantilla creada correctamente');
      setName('');
      setSubject('');
      setBody('');
      loadTemplates();
    } else {
      setErrorMsg(res.error || 'Error al guardar la plantilla');
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta plantilla?')) return;
    const res = await deleteTemplate(id);
    if (res.success) {
      loadTemplates();
    }
  };

  const filteredTemplates = templates.filter(
    (t) => filterType === 'all' || t.type === filterType
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Header */}
      <div className="h-16 border-b border-slate-900 px-8 flex items-center justify-between bg-slate-950/20">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-500" />
          <span className="text-xs font-black text-white">Gestor de Plantillas Comerciales</span>
        </div>
      </div>

      <div className="px-8 py-8 grid lg:grid-cols-3 gap-8">
        {/* Left Column: Create Form */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl space-y-6 sticky top-8">
            <div>
              <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-500" />
                Nueva Plantilla
              </h3>
              <p className="text-[10px] text-slate-400">Diseña mensajes reutilizables para tus prospectos</p>
            </div>

            {errorMsg && (
              <div className="bg-rose-950/40 border border-rose-900 text-rose-400 text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-950/40 border border-emerald-900 text-emerald-400 text-xs p-3 rounded-xl">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Nombre de la Plantilla</label>
                <input
                  type="text"
                  placeholder="Ej. Bienvenida Comercial"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Canal</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('email')}
                    className={`py-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      type === 'email'
                        ? 'bg-indigo-950/40 border-indigo-500 text-indigo-400'
                        : 'bg-slate-950 border-slate-900 text-slate-400 hover:border-slate-800'
                    }`}
                  >
                    <Mail className="w-4 h-4" /> Correo
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('whatsapp')}
                    className={`py-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      type === 'whatsapp'
                        ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400'
                        : 'bg-slate-950 border-slate-900 text-slate-400 hover:border-slate-800'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" /> WhatsApp
                  </button>
                </div>
              </div>

              {type === 'email' && (
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Asunto del Correo</label>
                  <input
                    type="text"
                    placeholder="Ej. Oportunidades comerciales para tu empresa"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white"
                    required={type === 'email'}
                  />
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] uppercase font-bold text-slate-400">Cuerpo del Mensaje</label>
                  <span className="text-[9px] text-slate-500 flex items-center gap-0.5">
                    <Sparkles className="w-3 h-3 text-indigo-500" /> Variables dinámicas
                  </span>
                </div>
                <textarea
                  rows={8}
                  placeholder="Escribe el mensaje. Puedes usar etiquetas como:&#10;{{razonSocial}} para la empresa&#10;{{nit}} para el NIT&#10;{{munComercial}} para la ciudad"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white font-sans resize-none"
                  required
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['{{razonSocial}}', '{{nit}}', '{{munComercial}}', '{{telCom1}}', '{{emailComercial}}'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setBody((prev) => prev + ' ' + tag)}
                      className="text-[9px] bg-slate-950 border border-slate-900 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 px-2 py-1 rounded"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Plantilla'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: List of Templates */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filters Bar */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl flex items-center justify-between">
            <span className="text-xs font-bold text-white">Filtros</span>
            <div className="flex gap-1.5">
              {[
                { label: 'Todos', value: 'all' },
                { label: 'Correos', value: 'email' },
                { label: 'WhatsApp', value: 'whatsapp' },
              ].map((btn) => (
                <button
                  key={btn.value}
                  onClick={() => setFilterType(btn.value as any)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                    filterType === btn.value
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-900 text-slate-400 hover:border-slate-800'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-xs">Cargando plantillas...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-900 rounded-2xl text-slate-500 text-xs">
              No se encontraron plantillas. ¡Crea una para comenzar!
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filteredTemplates.map((t) => (
                <div
                  key={t._id}
                  className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between hover:border-slate-700/55 transition-all"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="text-xs font-bold text-white truncate max-w-[12rem]">{t.name}</h4>
                      <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded flex items-center gap-1 ${
                        t.type === 'email' ? 'bg-indigo-950 text-indigo-400 border border-indigo-900/50' : 'bg-emerald-950 text-emerald-400 border border-emerald-900/50'
                      }`}>
                        {t.type === 'email' ? <Mail className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                        {t.type === 'email' ? 'Correo' : 'WhatsApp'}
                      </span>
                    </div>

                    {t.type === 'email' && t.subject && (
                      <div className="text-[10px] bg-slate-950 border border-slate-900 px-2.5 py-1.5 rounded-lg mb-2 text-slate-400 truncate">
                        <strong className="text-slate-300">Asunto:</strong> {t.subject}
                      </div>
                    )}

                    <p className="text-[10px] text-slate-400 line-clamp-4 bg-slate-950/20 border border-slate-950 p-2.5 rounded-lg font-mono leading-relaxed min-h-[5.5rem]">
                      {t.body}
                    </p>
                  </div>

                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-900/80">
                    <span className="text-[8px] text-slate-500">
                      Creado: {new Date(t.createdAt).toLocaleDateString('es-ES')}
                    </span>
                    <button
                      onClick={() => handleDelete(t._id)}
                      className="text-slate-500 hover:text-rose-400 p-1.5 hover:bg-slate-950 rounded-lg transition-colors"
                      title="Eliminar plantilla"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
