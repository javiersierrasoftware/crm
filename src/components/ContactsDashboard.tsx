'use client';

import React, { useState, useEffect } from 'react';
import { createContactAction } from '@/server/actions/contactActions';
import { Users2, Plus, Search, Filter, X, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ContactsDashboardProps {
  initialContacts: any[];
  companies: any[];
}

export default function ContactsDashboard({ initialContacts = [], companies = [] }: ContactsDashboardProps) {
  const router = useRouter();
  const [contacts, setContacts] = useState<any[]>(initialContacts);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [commercialConsent, setCommercialConsent] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'subscribed' | 'unsubscribed'>('subscribed');

  // Autocomplete state for companies
  const [companySearch, setCompanySearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Search filter
  const [searchFilter, setSearchFilter] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Keep local contacts synced
  useEffect(() => {
    setContacts(initialContacts);
  }, [initialContacts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email) {
      setErrorMsg('Nombre, Apellido y Correo Electrónico son obligatorios.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await createContactAction({
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        position: position || undefined,
        department: department || undefined,
        companyId: companyId || undefined,
        commercialConsent,
        subscriptionStatus,
      });

      if (res.success) {
        setIsModalOpen(false);
        setFirstName('');
        setLastName('');
        setEmail('');
        setPhone('');
        setPosition('');
        setDepartment('');
        setCompanyId('');
        setCompanySearch('');
        setCommercialConsent(true);
        setSubscriptionStatus('subscribed');

        router.refresh();
      } else {
        setErrorMsg(res.error || 'Error al guardar el contacto');
      }
    } catch {
      setErrorMsg('Error de red al guardar el contacto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter list locally
  const filteredContacts = contacts.filter((c) => {
    const fullName = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
    const emailLower = String(c.email || '').toLowerCase();
    const query = searchFilter.toLowerCase();
    return fullName.includes(query) || emailLower.includes(query);
  });

  const autocompleteCompanies = companies.filter(c =>
    String(c.razonSocial || '').toLowerCase().includes(companySearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Header */}
      <div className="h-16 border-b border-slate-900 px-8 flex items-center justify-between bg-slate-950/20">
        <div className="flex items-center gap-2">
          <Users2 className="w-5 h-5 text-indigo-500" />
          <span className="text-xs font-black text-white">Directorio de Contactos</span>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-600/10"
        >
          <Plus className="w-3.5 h-3.5" />
          Nuevo Contacto
        </button>
      </div>

      <div className="px-8 py-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-slate-900/20 border border-slate-900 p-4 rounded-xl">
          <div className="relative w-full sm:w-72">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="text-[10px] text-slate-500">
            Mostrando <strong className="text-slate-300">{filteredContacts.length}</strong> de <strong className="text-slate-300">{contacts.length}</strong> contactos
          </div>
        </div>

        {/* Contacts Table */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 font-bold">
                  <th className="p-4">Nombre Completo</th>
                  <th className="p-4">Correo Electrónico</th>
                  <th className="p-4">Teléfono</th>
                  <th className="p-4">Cargo / Departamento</th>
                  <th className="p-4">Consentimiento</th>
                  <th className="p-4">Origen</th>
                  <th className="p-4">Suscripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      Ningún contacto coincide con el filtro de búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredContacts.map((cont) => (
                    <tr key={cont._id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="p-4 font-bold text-white">
                        {cont.firstName} {cont.lastName}
                      </td>
                      <td className="p-4 text-slate-300 font-mono">{cont.email}</td>
                      <td className="p-4 text-slate-400 font-mono">{cont.phone || 'N/D'}</td>
                      <td className="p-4 text-slate-400">
                        {cont.position ? `${cont.position} (${cont.department || 'N/D'})` : 'N/D'}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                          cont.commercialConsent ? 'bg-emerald-950 text-emerald-400 border-emerald-900/40' :
                          'bg-rose-950 text-rose-400 border border-rose-900/40'
                        }`}>
                          {cont.commercialConsent ? 'Aceptado' : 'Sin Consentimiento'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500">{cont.dataSource || 'Registro Directo'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          cont.subscriptionStatus === 'subscribed' ? 'bg-indigo-950 text-indigo-400' : 'bg-slate-950 text-slate-500'
                        }`}>
                          {cont.subscriptionStatus || 'subscribed'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CREATE CONTACT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-900 flex items-center justify-between">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Users2 className="w-4 h-4 text-indigo-500" /> Registrar Nuevo Contacto
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

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4 max-h-[30rem] overflow-y-auto">
                {errorMsg && (
                  <div className="bg-rose-950/40 border border-rose-900 text-rose-400 text-xs p-3 rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {/* First Name */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Nombre</label>
                    <input
                      type="text"
                      placeholder="Ej. Carlos"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white"
                      required
                    />
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Apellido</label>
                    <input
                      type="text"
                      placeholder="Ej. Mendoza"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="Ej. carlos.mendoza@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white"
                    required
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Teléfono</label>
                  <input
                    type="text"
                    placeholder="Ej. +57 311 999 8881"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Position */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Cargo</label>
                    <input
                      type="text"
                      placeholder="Ej. Director de TI"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white"
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Departamento</label>
                    <input
                      type="text"
                      placeholder="Ej. Sistemas"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                {/* Company Autocomplete Input */}
                <div className="relative">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Empresa Asociada</label>
                  <input
                    type="text"
                    placeholder="Buscar empresa para asociar..."
                    value={companySearch}
                    onChange={(e) => {
                      setCompanySearch(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white"
                  />

                  {/* Dropdown results */}
                  {isDropdownOpen && companySearch && (
                    <div className="absolute left-0 right-0 mt-1 bg-slate-950 border border-slate-900 rounded-xl max-h-40 overflow-y-auto z-50 p-1.5 shadow-2xl">
                      {autocompleteCompanies.length === 0 ? (
                        <div className="text-[10px] text-slate-500 text-center py-2">No se encontraron empresas</div>
                      ) : (
                        autocompleteCompanies.map((c) => (
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

                <div className="grid grid-cols-2 gap-3 pt-2">
                  {/* Commercial Consent */}
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={commercialConsent}
                      onChange={(e) => setCommercialConsent(e.target.checked)}
                      className="rounded border-slate-800 text-indigo-600 focus:ring-0 w-4 h-4 shrink-0"
                    />
                    <span>Consentimiento Comercial</span>
                  </label>

                  {/* Subscription status */}
                  <div>
                    <select
                      value={subscriptionStatus}
                      onChange={(e) => setSubscriptionStatus(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3 py-1.5 text-xs text-white"
                    >
                      <option value="subscribed">Suscrito</option>
                      <option value="unsubscribed">De baja</option>
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
                  Crear Contacto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
