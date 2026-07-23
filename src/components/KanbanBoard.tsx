'use client';

import React, { useState, useEffect } from 'react';
import { createOpportunityAction, updateOpportunityStageAction } from '@/server/actions/opportunityActions';
import { Layers, Plus, Circle, X, Loader2, DollarSign, Percent, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface KanbanBoardProps {
  stages: any[];
  initialOpportunities: any[];
  companies: any[];
}

export default function KanbanBoard({ stages = [], initialOpportunities = [], companies = [] }: KanbanBoardProps) {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<any[]>(initialOpportunities);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [estimatedValue, setEstimatedValue] = useState(0);
  const [probability, setProbability] = useState(50);
  const [stageId, setStageId] = useState(stages[0]?._id || '');

  // Autocomplete state for companies
  const [companySearch, setCompanySearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Keep local opportunities state synced with server-side props updates
  useEffect(() => {
    setOpportunities(initialOpportunities);
  }, [initialOpportunities]);

  const handleDragStart = (e: React.DragEvent, oppId: string) => {
    e.dataTransfer.setData('text/plain', oppId);
  };

  const handleStageDrop = async (e: React.DragEvent, newStageId: string) => {
    e.preventDefault();
    const oppId = e.dataTransfer.getData('text/plain');
    if (!oppId) return;

    // Optimistic update
    const previousOpps = [...opportunities];
    setOpportunities(prev =>
      prev.map(o => (o._id === oppId ? { ...o, stageId: newStageId } : o))
    );

    try {
      const res = await updateOpportunityStageAction(oppId, newStageId);
      if (!res.success) {
        // Rollback on fail
        setOpportunities(previousOpps);
        alert(res.error || 'Error al mover el negocio');
      } else {
        router.refresh();
      }
    } catch {
      setOpportunities(previousOpps);
      alert('Error de red al mover el negocio');
    }
  };

  const handleCreateOpp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !companyId || !stageId) {
      setErrorMsg('Nombre, Empresa y Etapa son campos obligatorios.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await createOpportunityAction({
        name,
        companyId,
        estimatedValue,
        probability,
        stageId,
      });

      if (res.success) {
        setIsModalOpen(false);
        setName('');
        setCompanyId('');
        setCompanySearch('');
        setEstimatedValue(0);
        setProbability(50);
        setStageId(stages[0]?._id || '');

        router.refresh();
      } else {
        setErrorMsg(res.error || 'Error al crear el negocio');
      }
    } catch {
      setErrorMsg('Error de red al registrar el negocio.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter companies list based on autocomplete search text
  const filteredCompanies = companies.filter(c =>
    String(c.razonSocial || '').toLowerCase().includes(companySearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Header */}
      <div className="h-16 border-b border-slate-900 px-8 flex items-center justify-between bg-slate-950/20">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-500" />
          <span className="text-xs font-black text-white">Embudo de Ventas (Kanban)</span>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-600/10"
        >
          <Plus className="w-3.5 h-3.5" />
          Nuevo Negocio
        </button>
      </div>

      {/* Kanban Board Container */}
      <div className="px-8 py-8 overflow-x-auto h-[calc(100vh-4rem)]">
        <div className="flex gap-4 min-w-max h-full pb-8">
          {stages.map((stage) => {
            const stageOpps = opportunities.filter((o) => o.stageId?.toString() === stage._id.toString());
            const stageTotalVal = stageOpps.reduce((sum, o) => sum + (o.estimatedValue || 0), 0);

            return (
              <div
                key={stage._id.toString()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleStageDrop(e, stage._id.toString())}
                className="w-72 bg-slate-900/10 border border-slate-900/80 rounded-2xl flex flex-col p-4 shrink-0 transition-colors hover:border-slate-800/80"
              >
                {/* Column Title */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-900/60">
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Circle className="w-2.5 h-2.5 text-indigo-500 fill-indigo-500/10" />
                      {stage.name}
                    </h3>
                    <span className="text-[10px] text-slate-500">
                      {stageOpps.length} {stageOpps.length === 1 ? 'negocio' : 'negocios'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-400">
                    ${stageTotalVal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                  </span>
                </div>

                {/* Card Container */}
                <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                  {stageOpps.length === 0 ? (
                    <div className="text-[10px] text-slate-700 py-10 text-center border border-dashed border-slate-900/80 rounded-2xl">
                      Arrastre negocios aquí
                    </div>
                  ) : (
                    stageOpps.map((opp) => {
                      const company = opp.companyId as any;
                      return (
                        <div
                          key={opp._id.toString()}
                          draggable
                          onDragStart={(e) => handleDragStart(e, opp._id.toString())}
                          className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl hover:border-indigo-500/30 transition-all cursor-grab active:cursor-grabbing hover:scale-[1.01] shadow-md shadow-slate-950/20"
                        >
                          <h4 className="text-xs font-bold text-white mb-1.5">{opp.name}</h4>
                          <div className="text-[10px] text-slate-400 mb-2">{company?.razonSocial || 'N/D'}</div>
                          <div className="flex justify-between items-center text-[10px] pt-2.5 border-t border-slate-950/80">
                            <span className="text-slate-500 font-bold">Prob: {opp.probability}%</span>
                            <span className="text-emerald-400 font-black">${opp.estimatedValue?.toLocaleString('es-CO')}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CREATE OPPORTUNITY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-900 flex items-center justify-between">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" /> Crear Nuevo Negocio Comercial
              </h4>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setErrorMsg('');
                }}
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-900 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOpp}>
              <div className="p-6 space-y-4 max-h-[30rem] overflow-y-auto">
                {errorMsg && (
                  <div className="bg-rose-950/40 border border-rose-900 text-rose-400 text-xs p-3 rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Deal Name */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Nombre del Negocio</label>
                  <input
                    type="text"
                    placeholder="Ej. Proyecto Consultoría TI 2026"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white"
                    required
                  />
                </div>

                {/* Company Autocomplete Input */}
                <div className="relative">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Empresa Asociada</label>
                  <input
                    type="text"
                    placeholder="Buscar empresa por nombre..."
                    value={companySearch}
                    onChange={(e) => {
                      setCompanySearch(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white"
                    required={!companyId}
                  />

                  {/* Dropdown results */}
                  {isDropdownOpen && companySearch && (
                    <div className="absolute left-0 right-0 mt-1 bg-slate-950 border border-slate-900 rounded-xl max-h-40 overflow-y-auto z-50 p-1.5 shadow-2xl">
                      {filteredCompanies.length === 0 ? (
                        <div className="text-[10px] text-slate-500 text-center py-2">No se encontraron empresas</div>
                      ) : (
                        filteredCompanies.map((c) => (
                          <button
                            key={c._id}
                            type="button"
                            onClick={() => {
                              setCompanyId(c._id);
                              setCompanySearch(c.razonSocial);
                              setIsDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-indigo-950/40 hover:text-white rounded-lg text-slate-300 text-xs truncate transition-colors"
                          >
                            {c.razonSocial}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Pipeline Stage */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Etapa del Embudo</label>
                  <select
                    value={stageId}
                    onChange={(e) => setStageId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white"
                    required
                  >
                    {stages.map((stage) => (
                      <option key={stage._id} value={stage._id}>
                        {stage.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Estimated Value */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-slate-500" /> Valor Estimado (COP)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={estimatedValue || ''}
                      onChange={(e) => setEstimatedValue(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white"
                    />
                  </div>

                  {/* Probability */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5 text-slate-500" /> Probabilidad (%)
                    </label>
                    <input
                      type="number"
                      placeholder="50"
                      min={0}
                      max={100}
                      value={probability || ''}
                      onChange={(e) => setProbability(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-950 border-t border-slate-900 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setErrorMsg('');
                  }}
                  className="bg-slate-905 border border-slate-900 hover:border-slate-800 text-slate-400 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Crear Negocio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
