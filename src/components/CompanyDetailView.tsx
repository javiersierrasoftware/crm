'use client';

import React, { useState } from 'react';
import { createCompanyLog, sendCompanyEmailAction } from '@/server/actions/companyLogActions';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Briefcase,
  TrendingUp,
  Calendar,
  Clock,
  MessageSquare,
  Send,
  Loader2,
  X,
  FileText,
  User,
} from 'lucide-react';
import Link from 'next/link';

interface CompanyDetailProps {
  company: any;
  initialLogs: any[];
  templates: any[];
  currentUser: any;
}

export default function CompanyDetailView({ company, initialLogs, templates, currentUser }: CompanyDetailProps) {
  const [logs, setLogs] = useState<any[]>(initialLogs);
  const [noteText, setNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Modals state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  // Message composing state
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Helper to calculate company age based on fecMatricula (Format: "YYYYMMDD")
  const getCompanyAge = () => {
    if (!company.fecMatricula) return 'N/D';

    let year: number | null = null;

    // Check if Date object or ISO Date string
    if (company.fecMatricula instanceof Date || (typeof company.fecMatricula === 'string' && company.fecMatricula.includes('-'))) {
      year = new Date(company.fecMatricula).getFullYear();
    } else {
      // It is a number or numeric string like "20180102"
      const strVal = String(company.fecMatricula).trim();
      if (strVal.length >= 4) {
        const yearStr = strVal.substring(0, 4);
        year = parseInt(yearStr, 10);
      }
    }

    if (!year || isNaN(year) || year < 1800 || year > new Date().getFullYear()) {
      return 'N/D';
    }

    const currentYear = new Date().getFullYear();
    const diff = currentYear - year;
    return `${diff} Años (${year})`;
  };

  // Helper to replace placeholders in templates dynamically
  const parseTemplate = (bodyText: string) => {
    return bodyText
      .replace(/\{\{razonSocial\}\}/g, company.razonSocial || '')
      .replace(/\{\{nit\}\}/g, company.nit || '')
      .replace(/\{\{munComercial\}\}/g, company.munComercial || '')
      .replace(/\{\{telCom1\}\}/g, company.telCom1 || '')
      .replace(/\{\{emailComercial\}\}/g, company.emailComercial || '');
  };

  const handleTemplateChange = (id: string, type: 'email' | 'whatsapp') => {
    setSelectedTemplateId(id);
    const template = templates.find((t) => t._id === id);
    if (template) {
      if (type === 'email') {
        setMessageSubject(template.subject || '');
      }
      setMessageBody(parseTemplate(template.body));
    } else {
      setMessageSubject('');
      setMessageBody('');
    }
  };

  // Note submission handler
  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setIsSubmittingNote(true);
    const res = await createCompanyLog({
      companyId: company._id,
      type: 'note',
      title: 'Nota comercial registrada',
      content: noteText.trim(),
    });

    if (res.success) {
      setNoteText('');
      // Reload logs (local update)
      const updatedLogs = [
        {
          _id: Math.random().toString(),
          type: 'note',
          title: 'Nota comercial registrada',
          content: noteText.trim(),
          actorName: currentUser.name || 'Asesor',
          createdAt: new Date().toISOString(),
        },
        ...logs,
      ];
      setLogs(updatedLogs);
    }
    setIsSubmittingNote(false);
  };

  // Email submission handler
  const handleEmailSend = async () => {
    if (!messageBody.trim()) return;
    setIsSendingMessage(true);

    const emailSubject = messageSubject || 'Contacto Creatix CRM';

    // Send email via SMTP Server Action
    const res = await sendCompanyEmailAction(
      company._id,
      emailSubject,
      messageBody.trim()
    );

    if (res.success) {
      const updatedLogs = [
        {
          _id: Math.random().toString(),
          type: 'email',
          title: `Correo enviado: ${emailSubject}`,
          content: messageBody.trim(),
          actorName: currentUser.name || 'Asesor',
          createdAt: new Date().toISOString(),
        },
        ...logs,
      ];
      setLogs(updatedLogs);
      setIsEmailModalOpen(false);
      setSelectedTemplateId('');
      setMessageSubject('');
      setMessageBody('');
    }
    setIsSendingMessage(false);
  };

  // WhatsApp submission handler
  const handleWhatsAppSend = async () => {
    if (!messageBody.trim()) return;
    setIsSendingMessage(true);

    // Formulate WhatsApp Web API URL link
    const cleanPhone = (company.telCom1 || '').replace(/\+/g, '').replace(/\s/g, '').replace(/-/g, '');
    const whatsAppUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageBody.trim())}`;
    
    // Log in database
    const res = await createCompanyLog({
      companyId: company._id,
      type: 'whatsapp',
      title: 'Se inició contacto por WhatsApp',
      content: messageBody.trim(),
    });

    if (res.success) {
      const updatedLogs = [
        {
          _id: Math.random().toString(),
          type: 'whatsapp',
          title: 'Se inició contacto por WhatsApp',
          content: messageBody.trim(),
          actorName: currentUser.name || 'Asesor',
          createdAt: new Date().toISOString(),
        },
        ...logs,
      ];
      setLogs(updatedLogs);
      setIsWhatsAppModalOpen(false);
      setSelectedTemplateId('');
      setMessageBody('');
      
      // Open WhatsApp Web in a new tab
      window.open(whatsAppUrl, '_blank');
    }
    setIsSendingMessage(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Top Banner Header */}
      <div className="h-20 border-b border-slate-900 px-8 flex items-center gap-4 bg-slate-950/20">
        <Link
          href="/dashboard/companies"
          className="w-9 h-9 rounded-xl border border-slate-900 hover:border-slate-800 flex items-center justify-center bg-slate-950 text-slate-400 hover:text-white transition-all shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-sm font-black text-white uppercase tracking-wider">{company.razonSocial}</h2>
          <span className="text-[10px] font-mono text-slate-500">NIT: {company.nit || 'N/D'}</span>
        </div>
      </div>

      <div className="px-8 py-8 grid lg:grid-cols-3 gap-8">
        {/* Left Column: FICHA TÉCNICA */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl space-y-6 shadow-xl">
            <h3 className="text-xs font-black uppercase text-white tracking-wider border-b border-slate-900 pb-3">
              Información de la Empresa
            </h3>

            <div className="space-y-4 text-xs">
              {/* Address info */}
              <div className="flex gap-3">
                <MapPin className="w-4.5 h-4.5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-300 block">{company.munComercial || 'N/D'}</strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{company.dirComercial || 'N/D'}</span>
                </div>
              </div>

              {/* Phone info */}
              <div className="flex items-center gap-3">
                <Phone className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
                <span className="text-slate-300">{company.telCom1 || 'N/D'}</span>
              </div>

              {/* Email info */}
              <div className="flex items-center gap-3">
                <Mail className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
                <span className="text-slate-300 font-mono break-all">{company.emailComercial || 'N/D'}</span>
              </div>

              {/* CIIU Activities */}
              <div className="flex gap-3 pt-3 border-t border-slate-900">
                <Briefcase className="w-4.5 h-4.5 text-indigo-500 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <div>
                    <strong className="text-slate-300 block text-[10px] uppercase font-bold text-slate-400">Actividad Principal (CIIU 1)</strong>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{company.ciiu1 || company.actividad || 'N/D'}</span>
                  </div>
                  {company.ciiu2 && (
                    <div>
                      <strong className="text-slate-300 block text-[10px] uppercase font-bold text-slate-400">Actividad Secundaria (CIIU 2)</strong>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{company.ciiu2}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Activos Reportados */}
              <div className="flex gap-3 pt-3 border-t border-slate-900">
                <TrendingUp className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-500 block text-[9px] uppercase font-bold">Activos Totales Reportados</strong>
                  <strong className="text-emerald-400 text-sm mt-0.5 block">{company.activoTotal || '$ 0'}</strong>
                </div>
              </div>

              {/* Años de creación */}
              <div className="flex gap-3 pt-3 border-t border-slate-900">
                <Calendar className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-500 block text-[9px] uppercase font-bold">Años de Creación</strong>
                  <strong className="text-amber-500 block text-xs mt-0.5">{getCompanyAge()}</strong>
                </div>
              </div>

              {/* Último año renovado */}
              <div className="flex gap-3 pt-3 border-t border-slate-900">
                <Clock className="w-4.5 h-4.5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-500 block text-[9px] uppercase font-bold">Último Año Renovado</strong>
                  <strong className="text-white block text-xs mt-0.5">{company.ultAnoRen || 'N/D'}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: BITÁCORA Y ACCIONES */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl space-y-6 shadow-xl">
            <h3 className="text-xs font-black uppercase text-white tracking-wider border-b border-slate-900 pb-3">
              Bitácora y Notas CRM
            </h3>

            {/* Note taking form */}
            <form onSubmit={handleNoteSubmit} className="space-y-3">
              <textarea
                rows={3}
                placeholder="Escribe el resultado de tu llamada o correo aquí..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-white resize-none"
                required
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingNote}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingNote ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    'Dejar Nota'
                  )}
                </button>
              </div>
            </form>

            {/* Logs chronological feed */}
            <div className="space-y-4">
              {logs.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-900 rounded-xl text-slate-500 text-xs">
                  Cero interacciones registradas para esta empresa.
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log._id}
                    className="bg-slate-950/65 border border-slate-900 p-4 rounded-xl flex items-start gap-3.5 hover:border-slate-850 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      log.type === 'email' ? 'bg-indigo-950/40 border-indigo-900/50 text-indigo-400' :
                      log.type === 'whatsapp' ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-400' :
                      'bg-slate-900/60 border-slate-850 text-slate-400'
                    }`}>
                      {log.type === 'email' ? <Mail className="w-4 h-4" /> :
                       log.type === 'whatsapp' ? <MessageSquare className="w-4 h-4" /> :
                       <FileText className="w-4 h-4" />}
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <strong className="text-xs text-white font-bold">{log.title}</strong>
                        <span className="text-[9px] text-slate-500 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-600" /> {log.actorName} • {new Date(log.createdAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed font-sans whitespace-pre-wrap">
                        {log.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Actions Buttons */}
            <div className="pt-6 border-t border-slate-900 flex gap-4">
              <button
                onClick={() => setIsEmailModalOpen(true)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2"
              >
                <Mail className="w-4.5 h-4.5" /> Redactar Correo
              </button>
              <button
                onClick={() => setIsWhatsAppModalOpen(true)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4.5 h-4.5" /> Enviar WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* EMAIL MODAL */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-scale-up">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-900 flex items-center justify-between">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-500" /> Redactar Correo
              </h4>
              <button
                onClick={() => {
                  setIsEmailModalOpen(false);
                  setSelectedTemplateId('');
                  setMessageSubject('');
                  setMessageBody('');
                }}
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-900 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Template selector */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Seleccionar Plantilla</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateChange(e.target.value, 'email')}
                  className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white"
                >
                  <option value="">-- Redactar en blanco --</option>
                  {templates
                    .filter((t) => t.type === 'email')
                    .map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Asunto</label>
                <input
                  type="text"
                  placeholder="Asunto del correo..."
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Mensaje</label>
                <textarea
                  rows={8}
                  placeholder="Escribe el cuerpo del correo..."
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-white font-sans"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-950 border-t border-slate-900 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsEmailModalOpen(false);
                  setSelectedTemplateId('');
                  setMessageSubject('');
                  setMessageBody('');
                }}
                className="bg-slate-905 border border-slate-900 hover:border-slate-800 text-slate-400 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleEmailSend}
                disabled={isSendingMessage}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSendingMessage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Enviar Correo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WHATSAPP MODAL */}
      {isWhatsAppModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-scale-up">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-900 flex items-center justify-between">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-500" /> Enviar WhatsApp
              </h4>
              <button
                onClick={() => {
                  setIsWhatsAppModalOpen(false);
                  setSelectedTemplateId('');
                  setMessageBody('');
                }}
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-900 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Template selector */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Seleccionar Plantilla</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateChange(e.target.value, 'whatsapp')}
                  className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white"
                >
                  <option value="">-- Mensaje en blanco --</option>
                  {templates
                    .filter((t) => t.type === 'whatsapp')
                    .map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Body */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Mensaje</label>
                <textarea
                  rows={8}
                  placeholder="Escribe el mensaje de WhatsApp..."
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-white font-sans"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-950 border-t border-slate-900 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsWhatsAppModalOpen(false);
                  setSelectedTemplateId('');
                  setMessageBody('');
                }}
                className="bg-slate-905 border border-slate-900 hover:border-slate-800 text-slate-400 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleWhatsAppSend}
                disabled={isSendingMessage}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/10 flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSendingMessage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Abrir en WhatsApp Web
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
