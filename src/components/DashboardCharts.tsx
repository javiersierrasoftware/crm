'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

interface ChartProps {
  pipelineData: { stage: string; value: number }[];
  progressionData: { month: string; value: number }[];
}

export default function DashboardCharts({ pipelineData, progressionData }: ChartProps) {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Conversion Pipeline Bar Chart */}
      <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl">
        <h3 className="text-md font-bold text-white mb-6">Distribución del Embudo (Kanban)</h3>
        <div className="h-72">
          {pipelineData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              Sin datos de negocios registrados en el embudo
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="stage" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                  itemStyle={{ color: '#6366f1', fontSize: '12px' }}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Monthly Sales Progression Area Chart */}
      <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl">
        <h3 className="text-md font-bold text-white mb-6">Progreso y Volumen Comercial ($)</h3>
        <div className="h-72">
          {progressionData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              Sin historial financiero registrado
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={progressionData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                  itemStyle={{ color: '#a78bfa', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
