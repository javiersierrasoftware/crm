'use client';

import React, { useState, useEffect } from 'react';
import { getImportJobs } from '@/server/actions/importActions';
import { FileSpreadsheet, Upload, CheckCircle2, Loader2, ArrowRight, Table, AlertCircle } from 'lucide-react';

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update' | 'create_new'>('skip');
  const [rawText, setRawText] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [pastJobs, setPastJobs] = useState<any[]>([]);

  const crmFields = [
    { label: '-- Ignorar columna --', value: '' },
    { label: 'Empresa: Nombre Comercial (Razón Social)', value: 'company.commercialName' },
    { label: 'Empresa: Identificación Tributaria (NIT)', value: 'company.taxId' },
    { label: 'Empresa: Identificación (Sin Dígito)', value: 'company.identificacion' },
    { label: 'Empresa: Matrícula', value: 'company.matricula' },
    { label: 'Empresa: Correo de Notificación', value: 'company.emailNotificacion' },
    { label: 'Empresa: Sector Económico (Actividad)', value: 'company.sector' },
    { label: 'Empresa: Activos Totales', value: 'company.activoTotal' },
    { label: 'Empresa: Código CIIU 1', value: 'company.ciiu1' },
    { label: 'Empresa: Código CIIU 2', value: 'company.ciiu2' },
    { label: 'Empresa: Fecha Matrícula (AAAAMMDD)', value: 'company.fecMatricula' },
    { label: 'Empresa: Fecha Renovación (AAAAMMDD)', value: 'company.fecRenovacion' },
    { label: 'Empresa: Último Año Renovado', value: 'company.ultAnoRen' },
    { label: 'Empresa: Dirección Comercial', value: 'company.dirComercial' },
    { label: 'Empresa: Dirección (Genérica)', value: 'company.address' },
    { label: 'Empresa: Ciudad / Municipio', value: 'company.city' },
    { label: 'Empresa: Teléfono Comercial', value: 'company.phone' },
    { label: 'Empresa: Correo Comercial', value: 'company.email' },
    { label: 'Contacto: Correo Principal', value: 'contact.email' },
    { label: 'Contacto: Nombre', value: 'contact.firstName' },
    { label: 'Contacto: Apellido', value: 'contact.lastName' },
    { label: 'Contacto: Teléfono Principal', value: 'contact.phone' },
  ];

  useEffect(() => {
    loadJobs();

    // Poll running import job progress every 3 seconds
    const interval = setInterval(() => {
      loadJobs();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const loadJobs = async () => {
    const jobs = await getImportJobs();
    setPastJobs(jobs);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setSuccessMsg('');
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawText(text);

      // Parse headers from the first line
      const firstLine = text.split('\n')[0];
      if (firstLine) {
        const parsedHeaders = firstLine
          .split(',')
          .map((h) => h.replace(/"/g, '').replace(/\r/g, '').trim())
          .filter((h) => h.length > 0);
        
        setHeaders(parsedHeaders);

        // Pre-configure auto-mappings
        const initialMapping: Record<string, string> = {};
        parsedHeaders.forEach((header) => {
          const lower = header.toLowerCase();
          if (lower === 'ciiu1') {
            initialMapping[header] = 'company.ciiu1';
          } else if (lower === 'ciiu2') {
            initialMapping[header] = 'company.ciiu2';
          } else if (lower === 'activototal') {
            initialMapping[header] = 'company.activoTotal';
          } else if (lower === 'fecmatricula') {
            initialMapping[header] = 'company.fecMatricula';
          } else if (lower === 'fecrenovacion') {
            initialMapping[header] = 'company.fecRenovacion';
          } else if (lower === 'matricula') {
            initialMapping[header] = 'company.matricula';
          } else if (lower === 'ultanoren') {
            initialMapping[header] = 'company.ultAnoRen';
          } else if (lower === 'emailnotificacion') {
            initialMapping[header] = 'company.emailNotificacion';
          } else if (lower === 'identificacion') {
            initialMapping[header] = 'company.identificacion';
          } else if (lower === 'nit') {
            initialMapping[header] = 'company.taxId';
          } else if (lower === 'razonsocial') {
            initialMapping[header] = 'company.commercialName';
          } else if (lower.includes('actividad') || lower.includes('sector')) {
            initialMapping[header] = 'company.sector';
          } else if (lower.includes('emailcomercial') || lower.includes('correo') || lower.includes('mail')) {
            initialMapping[header] = 'contact.email';
          } else if (lower === 'telcom1' || lower.includes('tel') || lower.includes('telefono')) {
            initialMapping[header] = 'company.phone';
          } else if (lower === 'dircomercial' || lower.includes('dir') || lower.includes('direccion')) {
            initialMapping[header] = 'company.address';
          } else if (lower === 'muncomercial' || lower.includes('mun') || lower.includes('ciudad')) {
            initialMapping[header] = 'company.city';
          }
        });
        setMapping(initialMapping);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleMappingChange = (header: string, value: string) => {
    setMapping((prev) => ({
      ...prev,
      [header]: value,
    }));
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setErrorMsg('');
    setSuccessMsg('');

    // Filter out ignored fields from the mapping
    const filteredMapping: Record<string, string> = {};
    Object.entries(mapping).forEach(([header, value]) => {
      if (value) filteredMapping[header] = value;
    });

    // Make sure we have mapped at least the commercial name of the company
    const hasNameMapped = Object.values(filteredMapping).includes('company.commercialName');
    if (!hasNameMapped) {
      setErrorMsg('Debe mapear al menos el campo obligatorio "Empresa: Nombre Comercial (Razón Social)" para iniciar la importación.');
      setIsUploading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mapping', JSON.stringify(filteredMapping));
      formData.append('duplicateStrategy', duplicateStrategy);

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const res = await response.json();

      if (res.success) {
        setSuccessMsg(`✓ Importación "${file.name}" iniciada correctamente en segundo plano. ID del Lote: ${res.jobId}`);
        setFile(null);
        setHeaders([]);
        setMapping({});
        setRawText('');
        loadJobs();
      } else {
        setErrorMsg(res.error || 'Error al iniciar la importación');
      }
    } catch {
      setErrorMsg('Error de conexión al procesar el archivo.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Header */}
      <div className="h-16 border-b border-slate-900 px-8 flex items-center justify-between bg-slate-950/20">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
          <span className="text-xs font-black text-white">Asistente de Importación CSV</span>
        </div>
      </div>

      <div className="px-8 py-8 grid lg:grid-cols-3 gap-8">
        {/* Left Column: Form & Mappings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-500" />
              Cargar archivo de base de datos
            </h3>

            {successMsg && (
              <div className="bg-emerald-950/40 border border-emerald-900 text-emerald-400 text-xs p-4 rounded-xl mb-6">
                {successMsg}
              </div>
            )}

            {errorMsg && (
              <div className="bg-rose-950/40 border border-rose-900 text-rose-400 text-xs p-4 rounded-xl mb-6 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {!file ? (
              <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-10 text-center cursor-pointer transition-all bg-slate-950/30 relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <Upload className="w-10 h-10 text-slate-500 mx-auto mb-4" />
                <h4 className="text-xs font-bold text-slate-300">Selecciona o arrastra tu archivo CSV</h4>
                <p className="text-[10px] text-slate-500 mt-2">Formatos aceptados: .csv (codificado en UTF-8)</p>
              </div>
            ) : (
              <form onSubmit={handleImportSubmit} className="space-y-6">
                {/* File Details Info */}
                <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400">Archivo seleccionado:</span>
                    <strong className="text-white ml-2">{file.name}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setHeaders([]);
                    }}
                    className="text-[10px] font-bold text-rose-400 hover:text-rose-300"
                  >
                    Quitar Archivo
                  </button>
                </div>

                {/* Duplicate Strategy */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">Estrategia ante NIT/Correos Duplicados</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Omitir fila', value: 'skip', desc: 'No importa el duplicado' },
                      { label: 'Actualizar', value: 'update', desc: 'Sobrescribe los campos' },
                      { label: 'Crear Nuevo', value: 'create_new', desc: 'Duplica el registro' },
                    ].map((strat) => (
                      <button
                        key={strat.value}
                        type="button"
                        onClick={() => setDuplicateStrategy(strat.value as any)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          duplicateStrategy === strat.value
                            ? 'bg-indigo-950/30 border-indigo-500 text-indigo-400 shadow-md'
                            : 'bg-slate-950 border-slate-900 text-slate-400 hover:border-slate-800'
                        }`}
                      >
                        <span className="text-xs font-bold block">{strat.label}</span>
                        <span className="text-[9px] block text-slate-500 mt-0.5">{strat.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Column Mappings Table */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-3">Mapeo de Columnas detectadas</label>
                  <div className="border border-slate-900 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-900 text-slate-400 font-bold">
                          <th className="p-3">Columna en CSV</th>
                          <th className="p-3">Campo en CREATIX CRM</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900 bg-slate-950/20">
                        {headers.map((header) => (
                          <tr key={header}>
                            <td className="p-3 font-medium text-slate-300 font-mono">{header}</td>
                            <td className="p-3">
                              <select
                                value={mapping[header] || ''}
                                onChange={(e) => handleMappingChange(header, e.target.value)}
                                className="w-full max-w-xs bg-slate-950 border border-slate-900 hover:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                              >
                                {crmFields.map((f) => (
                                  <option key={f.value} value={f.value}>
                                    {f.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Procesando Lote...
                    </>
                  ) : (
                    <>
                      Iniciar Procesamiento <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Past Jobs History */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl h-fit">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Table className="w-4 h-4 text-indigo-500" />
            Historial de Importaciones
          </h3>
          <div className="space-y-4 max-h-[30rem] overflow-y-auto pr-1">
            {pastJobs.length === 0 ? (
              <div className="text-slate-500 text-xs py-8 text-center border border-dashed border-slate-900 rounded-xl">
                Cero importaciones ejecutadas anteriormente.
              </div>
            ) : (
              pastJobs.map((job: any) => (
                <div
                  key={job._id}
                  className="bg-slate-950 border border-slate-900/60 p-4 rounded-xl space-y-2 text-xs"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-slate-300 truncate max-w-[12rem]">{job.fileName}</span>
                    <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      job.status === 'completed' ? 'bg-emerald-950 text-emerald-400' :
                      job.status === 'processing' ? 'bg-blue-950 text-blue-400' :
                      'bg-slate-900 text-slate-500'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Fecha: {new Date(job.createdAt).toLocaleDateString('es-ES')}
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-900 text-[10px] text-center">
                    <div>
                      <span className="text-slate-500 block">Procesadas</span>
                      <strong className="text-white">{job.processedRows} / {job.totalRows}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Creadas</span>
                      <strong className="text-emerald-400">{job.createdCount}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Errores</span>
                      <strong className={job.failedCount > 0 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                        {job.failedCount}
                      </strong>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
