'use client';

import React, { useState, useEffect } from 'react';
import { createAndSendCampaign, previewCampaignTargetsAction } from '@/server/actions/campaignActions';
import { Mail, Plus, X, Loader2, Play, Users, Sparkles, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CampaignsDashboardProps {
  initialCampaigns: any[];
  templates: any[];
  activities: string[];
  cities: string[];
}

export default function CampaignsDashboard({
  initialCampaigns,
  templates,
  activities = [],
  cities = [],
}: CampaignsDashboardProps) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<any[]>(initialCampaigns);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [searchActivityTerm, setSearchActivityTerm] = useState('');
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [munComercialFilter, setMunComercialFilter] = useState('');
  const [minAssets, setMinAssets] = useState<number>(0);
  const [limitCount, setLimitCount] = useState(5);
  const [targetStatus, setTargetStatus] = useState('contacted');

  // Preview & verification states
  const [previewCompanies, setPreviewCompanies] = useState<any[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Automatically load live preview when filters change
  useEffect(() => {
    if (!isModalOpen) return;

    let active = true;
    const fetchPreview = async () => {
      setIsPreviewLoading(true);
      try {
        const res = await previewCampaignTargetsAction({
          templateId: templateId || undefined,
          actividadesFilter: selectedActivities.length > 0 ? selectedActivities : undefined,
          munComercialFilter: munComercialFilter || undefined,
          minAssets: minAssets > 0 ? minAssets : undefined,
          limitCount,
        });
        if (active && res.success) {
          setPreviewCompanies(res.companies || []);
        }
      } catch (err) {
        console.error('Error loading preview:', err);
      } finally {
        if (active) setIsPreviewLoading(false);
      }
    };

    fetchPreview();
    return () => {
      active = false;
    };
  }, [isModalOpen, templateId, selectedActivities, munComercialFilter, minAssets, limitCount]);

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !templateId) {
      setErrorMsg('Nombre y Plantilla son campos obligatorios.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await createAndSendCampaign({
        name,
        templateId,
        actividadesFilter: selectedActivities.length > 0 ? selectedActivities : undefined,
        munComercialFilter: munComercialFilter || undefined,
        minAssets: minAssets > 0 ? minAssets : undefined,
        limitCount,
        targetStatus: targetStatus || undefined,
      });

      if (res.success) {
        setSuccessMsg(`✓ Campaña despachada con éxito. Se enviaron ${res.deliveredCount} correos y fallaron ${res.failedCount}.`);
        setName('');
        setTemplateId('');
        setSelectedActivities([]);
        setSearchActivityTerm('');
        setMunComercialFilter('');
        setMinAssets(0);
        
        // Refresh cache
        router.refresh();
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setErrorMsg(res.error || 'Error al despachar la campaña');
      }
    } catch {
      setErrorMsg('Error de red al despachar la campaña.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Header */}
      <div className="h-16 border-b border-slate-900 px-8 flex items-center justify-between bg-slate-950/20">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-indigo-500" />
          <span className="text-xs font-black text-white">Campañas de Email Marketing</span>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-600/10"
        >
          <Plus className="w-3.5 h-3.5" />
          Nueva Campaña
        </button>
      </div>

      <div className="px-8 py-8">
        {/* Campaign List */}
        <div className="grid gap-6">
          {campaigns.length === 0 ? (
            <div className="text-slate-500 text-xs py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/10">
              No has enviado ninguna campaña de email marketing comercial. ¡Haz clic en Nueva Campaña para comenzar!
            </div>
          ) : (
            campaigns.map((camp) => {
              const openRate = camp.deliveredCount > 0 ? (camp.openedCount / camp.deliveredCount) * 100 : 0;
              const clickRate = camp.deliveredCount > 0 ? (camp.clickedCount / camp.deliveredCount) * 100 : 0;

              return (
                <div
                  key={camp._id}
                  className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl hover:border-slate-700/60 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                          camp.status === 'completed' ? 'bg-emerald-950 text-emerald-400 border-emerald-900/50' :
                          'bg-slate-950 text-slate-500 border-slate-900'
                        }`}>
                          {camp.status}
                        </span>
                        <h3 className="text-xs font-bold text-white">{camp.name}</h3>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Enviado por: <span className="text-slate-400">{camp.senderName}</span> ({camp.senderEmail}) •{' '}
                        {camp.sentAt ? new Date(camp.sentAt).toLocaleString('es-ES') : 'No despachado'}
                      </p>
                    </div>

                    <div className="flex items-center gap-6 shrink-0 border-l border-slate-900 pl-6">
                      <div className="text-center">
                        <span className="text-[9px] text-slate-500 uppercase block font-bold">Destinatarios</span>
                        <span className="text-xs font-black text-white">{camp.totalRecipients}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-[9px] text-slate-500 uppercase block font-bold">Entregados</span>
                        <span className="text-xs font-black text-emerald-400">{camp.deliveredCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-900/60 text-xs">
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-900/80">
                      <div className="text-slate-500 text-[9px] font-bold uppercase mb-1">Tasa de Apertura</div>
                      <div className="font-bold text-white">{openRate.toFixed(1)}%</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">{camp.openedCount} lecturas</div>
                    </div>

                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-900/80">
                      <div className="text-slate-500 text-[9px] font-bold uppercase mb-1">Tasa de Clics</div>
                      <div className="font-bold text-white">{clickRate.toFixed(1)}%</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">{camp.clickedCount} clics</div>
                    </div>

                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-900/80">
                      <div className="text-slate-500 text-[9px] font-bold uppercase mb-1">Rebotes (Bounces)</div>
                      <div className="font-bold text-rose-400">{camp.bouncedCount || 0}</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">Direcciones inválidas</div>
                    </div>

                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-900/80">
                      <div className="text-slate-500 text-[9px] font-bold uppercase mb-1">Bajas (Unsubscribe)</div>
                      <div className="font-bold text-amber-400">{camp.unsubscribedCount || 0}</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">Optaron por salir</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* DISPATCH WIZARD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-scale-up">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-900 flex items-center justify-between">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-500" /> Lanzar Nueva Campaña Comercial
              </h4>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-900 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLaunch}>
              <div className="p-6 space-y-4 max-h-[34rem] overflow-y-auto pr-1">
                {errorMsg && (
                  <div className="bg-rose-950/40 border border-rose-900 text-rose-400 text-xs p-3 rounded-xl flex items-start gap-2 animate-pulse">
                    <X className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="bg-emerald-950/40 border border-emerald-900 text-emerald-400 text-xs p-3 rounded-xl">
                    {successMsg}
                  </div>
                )}

                {/* Campaign Name */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Nombre de la Campaña</label>
                  <input
                    type="text"
                    placeholder="Ej. Oferta Especial Sincelejo - Construcción"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white"
                    required
                  />
                </div>

                {/* Template Selection */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Seleccionar Plantilla de Correo</label>
                  <select
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white"
                    required
                  >
                    <option value="">-- Seleccionar plantilla --</option>
                    {templates.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name} (Correo)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Segments Filters */}
                <div className="bg-slate-950/40 border border-slate-900 p-4 rounded-xl space-y-3">
                  <h5 className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    Segmentación de Destinatarios
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Activities Multi-select */}
                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-bold text-slate-500">Actividades / Sectores ({selectedActivities.length} seleccionados)</label>
                      <input
                        type="text"
                        placeholder="Filtrar sectores..."
                        value={searchActivityTerm}
                        onChange={(e) => setSearchActivityTerm(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                      <div className="space-y-1.5 max-h-32 overflow-y-auto border border-slate-900 rounded-xl p-2.5 bg-slate-950/40">
                        {activities.filter(act => String(act || '').toLowerCase().includes(searchActivityTerm.toLowerCase())).length === 0 ? (
                          <div className="text-[9px] text-slate-600 text-center py-2">No se encontraron sectores</div>
                        ) : (
                          activities
                            .filter(act => String(act || '').toLowerCase().includes(searchActivityTerm.toLowerCase()))
                            .map((act) => (
                              <label key={String(act)} className="flex items-start gap-2 text-[10px] text-slate-400 hover:text-white cursor-pointer select-none py-0.5">
                                <input
                                  type="checkbox"
                                  checked={selectedActivities.includes(String(act))}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedActivities([...selectedActivities, String(act)]);
                                    } else {
                                      setSelectedActivities(selectedActivities.filter((x) => x !== String(act)));
                                    }
                                  }}
                                  className="rounded border-slate-900 text-indigo-600 focus:ring-0 w-3.5 h-3.5 mt-0.5 shrink-0"
                                />
                                <span className="whitespace-normal break-words leading-tight text-[10px] text-slate-300">{String(act)}</span>
                              </label>
                            ))
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* City Select */}
                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-bold text-slate-500">Ciudad / Municipio</label>
                        <select
                          value={munComercialFilter}
                          onChange={(e) => setMunComercialFilter(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs text-white h-[2.35rem]"
                        >
                          <option value="">Todas las ciudades</option>
                          {cities.map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Assets Minimum filter */}
                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-bold text-slate-500">Activos Mínimos Reportados (COP)</label>
                        <input
                          type="number"
                          placeholder="Ej. 50000000"
                          value={minAssets || ''}
                          onChange={(e) => setMinAssets(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs text-white h-[2.35rem]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* LIVE PREVIEW PANEL */}
                <div className="bg-slate-950/40 border border-slate-900 p-4 rounded-xl space-y-3">
                  <h5 className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-500" />
                    Destinatarios Filtrados (Vista Previa de {previewCompanies.length} empresas)
                  </h5>
                  {isPreviewLoading ? (
                    <div className="flex items-center justify-center py-8 text-slate-500 text-xs gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> Cargando vista previa...
                    </div>
                  ) : previewCompanies.length === 0 ? (
                    <div className="text-slate-600 text-center py-8 text-[10px] border border-dashed border-slate-900 rounded-xl">
                      Ninguna empresa coincide con la segmentación o activos elegidos.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {previewCompanies.map((c) => (
                        <div
                          key={c._id}
                          className="bg-slate-950 border border-slate-900/60 px-3 py-2 rounded-xl flex items-center justify-between gap-3 text-[10px] hover:border-slate-800 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <strong className="text-white block font-bold truncate">{c.razonSocial}</strong>
                            <span className="text-slate-500 font-mono block truncate">{c.email}</span>
                          </div>
                          <div className="text-right shrink-0 flex items-center gap-2">
                            <div>
                              <span className="text-indigo-400 block">{c.munComercial}</span>
                              <span className="text-slate-500 block font-mono">{c.activoTotal}</span>
                            </div>
                            {c.alreadySent ? (
                              <span
                                className="bg-rose-950/60 border border-rose-900/60 text-rose-400 font-bold px-1.5 py-0.5 rounded text-[8px] uppercase select-none shrink-0"
                                title="Duplicado: Esta empresa ya recibió este correo o plantilla con anterioridad. Se omitirá para no saturar al usuario."
                              >
                                Duplicado / Omitido
                              </span>
                            ) : (
                              <span
                                className="bg-emerald-950/60 border border-emerald-900/60 text-emerald-400 font-bold px-1.5 py-0.5 rounded text-[8px] uppercase select-none shrink-0"
                                title="Destinatario válido"
                              >
                                Listo
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Automation & Funnel settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Action final status */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Mover en el Embudo a:</label>
                    <select
                      value={targetStatus}
                      onChange={(e) => setTargetStatus(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3 py-2 text-xs text-white h-[2.35rem]"
                    >
                      <option value="">No modificar estado</option>
                      <option value="uncontacted">Sin Contactar</option>
                      <option value="contacted">Contactado (Embudo)</option>
                      <option value="interested">Interesado (Embudo)</option>
                      <option value="following_up">Seguimiento (Embudo)</option>
                    </select>
                  </div>

                  {/* Batch Limit */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Límite de Destinatarios (Lote)</label>
                    <select
                      value={limitCount}
                      onChange={(e) => setLimitCount(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3 py-2 text-xs text-white h-[2.35rem]"
                    >
                      <option value={5}>5 prospectos (Prueba)</option>
                      <option value={15}>15 prospectos (Lote)</option>
                      <option value={50}>50 prospectos (Lote)</option>
                      <option value={100}>100 prospectos (Máximo)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-950 border-t border-slate-900 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="bg-slate-905 border border-slate-900 hover:border-slate-800 text-slate-400 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || previewCompanies.filter(c => !c.alreadySent).length === 0}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Procesando Lote...
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" /> Lanzar Campaña
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
