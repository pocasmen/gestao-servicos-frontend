import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TimingReportResponse } from '../../types/analytics';
import SortableTable from './SortableTable';
import { Clock, TrendingUp, Minus, ChevronsUp } from 'lucide-react';

interface TimingReportViewProps {
  data: TimingReportResponse;
  unit?: 'hours' | 'days';
}

const fmt = (val: number, unit: 'hours' | 'days') =>
  unit === 'days'
    ? `${val.toFixed(1)}d`
    : val < 1
      ? `${Math.round(val * 60)}min`
      : `${val.toFixed(1)}h`;

const TimingReportView: React.FC<TimingReportViewProps> = ({ data, unit = 'hours' }) => {
  const { summary, distribution, details } = data;

  const statCards = [
    { label: 'Média', value: fmt(summary.avgHours, unit), icon: <Clock size={20} />, color: '#083085', bg: '#eff6ff' },
    { label: 'Mediana', value: fmt(summary.medianHours, unit), icon: <TrendingUp size={20} />, color: '#059669', bg: '#ecfdf5' },
    { label: 'P90', value: fmt(summary.p90Hours, unit), icon: <ChevronsUp size={20} />, color: '#d97706', bg: '#fffbeb' },
    { label: 'Mínimo', value: fmt(summary.minHours, unit), icon: <Minus size={20} />, color: '#0284c7', bg: '#f0f9ff' },
    { label: 'Máximo', value: fmt(summary.maxHours, unit), icon: <ChevronsUp size={20} />, color: '#dc2626', bg: '#fef2f2' },
  ];

  const detailColumns = [
    { key: 'label', label: 'Descrição / Identificador', align: 'left' as const },
    {
      key: 'hoursElapsed',
      label: unit === 'days' ? 'Duração (Dias)' : 'Duração (Horas)',
      align: 'right' as const,
      format: (v: number) => <span className="fw-semibold">{fmt(v, unit)}</span>,
    },
  ];

  return (
    <div className="d-flex flex-column gap-4">
      {/* ─── Resumo ─────────────────────────────────────────────────────────── */}
      <div className="glass-card p-4">
        <h6 className="text-uppercase small fw-bold mb-3" style={{ letterSpacing: '0.08em', color: 'var(--primary-color)' }}>
          Resumo Estatístico — {summary.count} registo(s)
        </h6>
        <div className="row g-3">
          {statCards.map(s => (
            <div key={s.label} className="col-6 col-md-4 col-lg">
              <div
                className="rounded-4 p-3 d-flex flex-column gap-1 border shadow-sm"
                style={{ backgroundColor: s.bg, borderColor: `${s.color}33` }}
              >
                <div style={{ color: s.color }}>{s.icon}</div>
                <div className="fw-bold fs-4" style={{ color: s.color }}>{s.value}</div>
                <div className="small fw-semibold text-secondary">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Distribuição ───────────────────────────────────────────────────── */}
      <div className="glass-card p-4">
        <h6 className="text-uppercase small fw-bold mb-3" style={{ letterSpacing: '0.08em', color: 'var(--primary-color)' }}>
          Distribuição por Escalão
        </h6>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={distribution} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="bucket"
              tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 500 }}
              tickLine={{ stroke: '#9ca3af' }}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <YAxis
              tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 500 }}
              tickLine={{ stroke: '#9ca3af' }}
              axisLine={{ stroke: '#d1d5db' }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                fontSize: '12px',
                color: '#1f2937',
              }}
              cursor={{ fill: 'rgba(8, 48, 133, 0.06)' }}
            />
            <Bar dataKey="count" name="Casos" fill="#083085" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ─── Detalhes ───────────────────────────────────────────────────────── */}
      <div className="glass-card p-4">
        <h6 className="text-uppercase small fw-bold mb-3" style={{ letterSpacing: '0.08em', color: 'var(--primary-color)' }}>
          Detalhamento de Casos Individuais
        </h6>
        <SortableTable
          columns={detailColumns}
          data={details}
          defaultSortKey="hoursElapsed"
        />
      </div>
    </div>
  );
};

export default TimingReportView;
