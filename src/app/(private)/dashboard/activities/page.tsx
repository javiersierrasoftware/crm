import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { connectToDatabase } from '@/server/database/mongodb';
import Activity from '@/models/Activity';
import { createActivity, completeActivity } from '@/server/actions/activityActions';
import { Calendar, CheckCircle2, Circle, AlertCircle, Clock, Plus, BookOpen } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ActivitiesPage() {
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

  // Fetch pending and completed activities
  const activities = await Activity.find({ organizationId: activeOrgId }).sort({ date: 1, time: 1 });
  const pending = activities.filter((a) => a.status === 'pending');
  const completed = activities.filter((a) => a.status === 'completed');

  // Submit Handler for Server Action Form
  async function handleCreate(formData: FormData) {
    'use server';

    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const type = formData.get('type') as 'call' | 'meeting' | 'task' | 'note';
    const date = formData.get('date') as string;
    const time = formData.get('time') as string;
    const priority = formData.get('priority') as 'low' | 'medium' | 'high';

    if (!title || !date || !type) return;

    await createActivity({
      title,
      description,
      type,
      date,
      time,
      priority,
    });
  }

  // Complete action helper
  async function handleComplete(formData: FormData) {
    'use server';

    const activityId = formData.get('activityId') as string;
    const result = formData.get('result') as string;

    if (!activityId) return;

    await completeActivity(activityId, result || 'Completada');
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Header */}
      <div className="h-16 border-b border-slate-900 px-8 flex items-center justify-between bg-slate-950/20">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-500" />
          <span className="text-xs font-black text-white">Tareas y Agenda Comercial</span>
        </div>
      </div>

      <div className="px-8 py-8 grid lg:grid-cols-3 gap-8">
        {/* Left/Middle Column: Tasks lists */}
        <div className="lg:col-span-2 space-y-8">
          {/* Pending Tasks */}
          <div>
            <h2 className="text-md font-bold text-white mb-4 flex items-center gap-2">
              <Circle className="w-4 h-4 text-indigo-500 fill-indigo-500/10" />
              Actividades Pendientes ({pending.length})
            </h2>
            <div className="space-y-3">
              {pending.length === 0 ? (
                <div className="text-slate-500 text-xs py-8 text-center border border-dashed border-slate-800 rounded-xl">
                  No tienes actividades comerciales pendientes de ejecución.
                </div>
              ) : (
                pending.map((act) => (
                  <div
                    key={act._id.toString()}
                    className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl flex items-start justify-between gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                          act.type === 'call' ? 'bg-blue-950 text-blue-400 border-blue-900/50' :
                          act.type === 'meeting' ? 'bg-purple-950 text-purple-400 border-purple-900/50' :
                          'bg-amber-950 text-amber-400 border-amber-900/50'
                        }`}>
                          {act.type}
                        </span>
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                          act.priority === 'high' ? 'bg-rose-950 text-rose-400 border-rose-900/50' :
                          act.priority === 'medium' ? 'bg-slate-950 text-slate-400 border-slate-900/50' :
                          'bg-slate-950 text-slate-500 border-slate-900/50'
                        }`}>
                          {act.priority}
                        </span>
                        <h4 className="text-xs font-bold text-white">{act.title}</h4>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2">{act.description}</p>
                      <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(act.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })} {act.time}
                        </span>
                      </div>
                    </div>

                    {/* Completion Action Form */}
                    <form action={handleComplete} className="shrink-0 flex items-center gap-2">
                      <input type="hidden" name="activityId" value={act._id.toString()} />
                      <input
                        type="text"
                        name="result"
                        placeholder="Resultado (opcional)..."
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded text-[10px] flex items-center gap-1 transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Completar
                      </button>
                    </form>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Completed History */}
          <div>
            <h2 className="text-md font-bold text-white mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Historial de Ejecutadas ({completed.length})
            </h2>
            <div className="space-y-3">
              {completed.length === 0 ? (
                <div className="text-slate-500 text-xs py-8 text-center border border-dashed border-slate-800 rounded-xl">
                  Historial de actividades vacío.
                </div>
              ) : (
                completed.map((act) => (
                  <div
                    key={act._id.toString()}
                    className="bg-slate-900/20 border border-slate-900 p-4 rounded-xl opacity-70"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold uppercase bg-slate-950 text-slate-500 border border-slate-900 px-2 py-0.5 rounded">
                        {act.type}
                      </span>
                      <h4 className="text-xs font-bold text-slate-300 line-through">{act.title}</h4>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">{act.description}</p>
                    <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-900 text-[10px] text-slate-400 mt-3">
                      <strong>Resultado:</strong> {act.result}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Add activity side form */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl h-fit">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-500" />
            Programar Actividad
          </h3>
          <form action={handleCreate} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-300 mb-1">Título</label>
              <input
                type="text"
                name="title"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                placeholder="Ej. Llamar a cliente Alfa"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-300 mb-1">Descripción / Nota</label>
              <textarea
                name="description"
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                placeholder="Detalles de la llamada o reunión..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-300 mb-1">Tipo</label>
                <select
                  name="type"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="call">Llamada</option>
                  <option value="meeting">Reunión</option>
                  <option value="task">Tarea</option>
                  <option value="note">Nota</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-300 mb-1">Prioridad</label>
                <select
                  name="priority"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-300 mb-1">Fecha</label>
                <input
                  type="date"
                  name="date"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-300 mb-1">Hora</label>
                <input
                  type="time"
                  name="time"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg text-xs transition-all shadow-md shadow-indigo-600/20"
            >
              Programar Actividad
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
