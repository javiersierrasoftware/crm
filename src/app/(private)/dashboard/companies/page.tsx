import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { connectToDatabase } from '@/server/database/mongodb';
import Company from '@/models/Company';
import { Building2, Search, SlidersHorizontal, ArrowLeft, ArrowRight, RotateCcw, Plus } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function CompaniesPage({ searchParams }: PageProps) {
  const session = await auth();

  if (!session || !session.user) {
    redirect('/login');
  }

  const user = session.user as any;
  const activeOrgId = user.activeOrganizationId;

  if (!activeOrgId) {
    redirect('/dashboard');
  }

  await connectToDatabase();

  // Await async searchParams (Next.js 16 requirement)
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const limit = Math.max(5, Math.min(100, Number(sp.limit) || 15));
  const skip = (page - 1) * limit;

  // Filter params
  const searchQuery = sp.search || '';
  const filterRazonSocial = sp.razonSocial || '';
  const filterNit = sp.nit || '';
  const filterActividad = sp.actividad || '';
  const filterMunComercial = sp.munComercial || '';
  const filterStatus = sp.status || '';

  // Build MongoDB query
  const query: Record<string, any> = {
    organizationId: activeOrgId,
    deletedAt: null,
  };

  // General text search
  if (searchQuery) {
    const regex = new RegExp(searchQuery, 'i');
    query.$or = [
      { razonSocial: regex },
      { nit: regex },
      { actividad: regex },
      { munComercial: regex },
    ];
  }

  // Column specific filters
  if (filterRazonSocial) {
    query.razonSocial = new RegExp(filterRazonSocial, 'i');
  }
  if (filterNit) {
    query.nit = new RegExp(filterNit, 'i');
  }
  if (filterActividad) {
    query.actividad = new RegExp(filterActividad, 'i');
  }
  if (filterMunComercial) {
    query.munComercial = new RegExp(filterMunComercial, 'i');
  }
  if (filterStatus) {
    query.status = filterStatus;
  }

  // Fetch count and paginated list in parallel
  const [total, companies] = await Promise.all([
    Company.countDocuments(query),
    Company.find(query)
      .sort({ razonSocial: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const totalPages = Math.ceil(total / limit);

  // Helper to compile filter query strings
  const getFilterQueryString = (newPage: number) => {
    const params = new URLSearchParams();
    params.set('page', newPage.toString());
    params.set('limit', limit.toString());
    if (searchQuery) params.set('search', searchQuery);
    if (filterRazonSocial) params.set('razonSocial', filterRazonSocial);
    if (filterNit) params.set('nit', filterNit);
    if (filterActividad) params.set('actividad', filterActividad);
    if (filterMunComercial) params.set('munComercial', filterMunComercial);
    if (filterStatus) params.set('status', filterStatus);
    return `?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Header */}
      <div className="h-16 border-b border-slate-900 px-8 flex items-center justify-between bg-slate-950/20">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-indigo-500" />
          <span className="text-xs font-black text-white">Directorio de Empresas ({total.toLocaleString()})</span>
        </div>
        <Link
          href="/dashboard/companies/new"
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/10"
        >
          <Plus className="w-3.5 h-3.5" /> Agregar Empresa
        </Link>
      </div>

      <div className="px-8 py-8 space-y-6">
        {/* Collapsible Search and Advanced Filters Form */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl">
          <form method="GET" className="space-y-4">
            <input type="hidden" name="page" value="1" />
            <input type="hidden" name="limit" value={limit} />

            {/* Row 1: General search */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="search"
                  defaultValue={searchQuery}
                  placeholder="Buscar por Razón Social, NIT, Actividad o Ciudad..."
                  className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl pl-10 pr-4 py-2.5 text-xs text-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/15"
                >
                  Buscar
                </button>
                <Link
                  href="/dashboard/companies"
                  className="bg-slate-950 border border-slate-900 hover:border-slate-800 text-slate-400 hover:text-white px-3 py-2.5 rounded-xl transition-all flex items-center justify-center"
                  title="Restablecer Filtros"
                >
                  <RotateCcw className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Row 2: Advanced Multi-filters grid */}
            <div className="pt-3 border-t border-slate-900/80">
              <h4 className="text-[10px] uppercase font-bold text-slate-400 mb-3 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
                Filtros Avanzados por Columnas
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-1">Razón Social</label>
                  <input
                    type="text"
                    name="razonSocial"
                    defaultValue={filterRazonSocial}
                    placeholder="Filtrar Razón..."
                    className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-1">NIT</label>
                  <input
                    type="text"
                    name="nit"
                    defaultValue={filterNit}
                    placeholder="Filtrar NIT..."
                    className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-1">Actividad (Sector)</label>
                  <input
                    type="text"
                    name="actividad"
                    defaultValue={filterActividad}
                    placeholder="Filtrar Actividad..."
                    className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-1">Ciudad / Municipio</label>
                  <input
                    type="text"
                    name="munComercial"
                    defaultValue={filterMunComercial}
                    placeholder="Filtrar Ciudad..."
                    className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-1">Estado</label>
                  <select
                    name="status"
                    defaultValue={filterStatus}
                    className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-lg px-2 py-1.5 text-xs text-white"
                  >
                    <option value="">Todos</option>
                    <option value="Nuevo">Nuevo</option>
                    <option value="uncontacted">Sin Contactar</option>
                    <option value="contacted">Contactado</option>
                    <option value="interested">Interesado</option>
                    <option value="following_up">Seguimiento</option>
                    <option value="client">Cliente</option>
                  </select>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Companies Table Card */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-900 text-slate-400 font-bold">
                  <th className="p-4">Razón Social</th>
                  <th className="p-4">NIT</th>
                  <th className="p-4">Actividad Principal</th>
                  <th className="p-4">Matrícula</th>
                  <th className="p-4">Ubicación</th>
                  <th className="p-4">Puntaje</th>
                  <th className="p-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 bg-slate-950/20">
                {companies.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-500 font-medium">
                      No se encontraron empresas con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  companies.map((comp) => (
                    <tr key={comp._id.toString()} className="hover:bg-slate-900/30 transition-colors">
                      <td className="p-4 font-bold text-white max-w-xs truncate">
                        <Link
                          href={`/dashboard/companies/${comp._id.toString()}`}
                          className="hover:text-indigo-400 transition-colors"
                        >
                          {comp.razonSocial}
                        </Link>
                      </td>
                      <td className="p-4 text-slate-400 font-mono">{comp.nit || 'N/D'}</td>
                      <td className="p-4 text-slate-300 max-w-xs truncate">{comp.actividad || 'N/D'}</td>
                      <td className="p-4 text-slate-400 font-mono">{comp.matricula || 'N/D'}</td>
                      <td className="p-4 text-slate-400 truncate">{comp.munComercial || 'N/D'}</td>
                      <td className="p-4 font-bold text-indigo-400">{comp.leadScore || 10} pts</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase border ${
                          comp.status === 'Nuevo' ? 'bg-indigo-950 text-indigo-400 border-indigo-900/40' :
                          comp.status === 'interested' ? 'bg-emerald-950 text-emerald-400 border-emerald-900/40' :
                          'bg-slate-950 text-slate-400 border-slate-900'
                        }`}>
                          {comp.status || 'Nuevo'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {total > 0 && (
            <div className="bg-slate-950 border-t border-slate-900/80 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div className="text-slate-500">
                Mostrando del <strong className="text-slate-300">{skip + 1}</strong> al{' '}
                <strong className="text-slate-300">{Math.min(skip + limit, total)}</strong> de{' '}
                <strong className="text-slate-300">{total.toLocaleString()}</strong> empresas
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center gap-1.5">
                {page > 1 ? (
                  <Link
                    href={getFilterQueryString(page - 1)}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Anterior
                  </Link>
                ) : (
                  <button
                    disabled
                    className="opacity-30 bg-slate-900 border border-slate-850 text-slate-500 px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-not-allowed"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Anterior
                  </button>
                )}

                {/* Page numbers indices */}
                <div className="hidden md:flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                    const pageNum = idx + 1;
                    // Draw pages surrounding current page
                    const startPage = Math.max(1, page - 2);
                    const drawPage = startPage + idx;
                    if (drawPage > totalPages) return null;

                    return (
                      <Link
                        key={drawPage}
                        href={getFilterQueryString(drawPage)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold border transition-all ${
                          page === drawPage
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/10'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        {drawPage}
                      </Link>
                    );
                  })}
                </div>

                {page < totalPages ? (
                  <Link
                    href={getFilterQueryString(page + 1)}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
                  >
                    Siguiente <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <button
                    disabled
                    className="opacity-30 bg-slate-900 border border-slate-850 text-slate-500 px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-not-allowed"
                  >
                    Siguiente <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
