import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export interface TimeSeriesData {
  period: string;
  [key: string]: number | string;
}

export interface SeriesDef {
  key: string;
  label: string;
  color?: string;
  dashed?: boolean;
  bold?: boolean;
}

// Paleta consistente com o projeto em tema light
const PALETTE = [
  '#083085', '#0284c7', '#059669', '#d97706',
  '#7c3aed', '#dc2626', '#db2777', '#0d9488',
];

interface TimeSeriesChartProps {
  data: TimeSeriesData[];
  series: SeriesDef[];
  yLabel?: string;
  height?: number;
}

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  series,
  yLabel,
  height = 340,
}) => {
  if (!data || data.length === 0) {
    return <div className="text-secondary text-center py-4 small">Sem dados para o período selecionado.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 12, right: 24, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="period"
          tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 500 }}
          tickLine={{ stroke: '#9ca3af' }}
          axisLine={{ stroke: '#d1d5db' }}
        />
        <YAxis
          tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 500 }}
          tickLine={{ stroke: '#9ca3af' }}
          axisLine={{ stroke: '#d1d5db' }}
          label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 12 } : undefined}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
            fontSize: '13px',
            color: '#1f2937',
          }}
          labelStyle={{ color: '#111827', fontWeight: 600, marginBottom: '6px' }}
          itemStyle={{ color: '#374151' }}
        />
        <Legend
          wrapperStyle={{ fontSize: '13px', paddingTop: '12px', color: '#374151' }}
        />
        {series.map((s, idx) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color ?? PALETTE[idx % PALETTE.length]}
            strokeWidth={s.bold ? 3 : 2}
            strokeDasharray={s.dashed ? '6 4' : undefined}
            dot={{ r: 3, fill: s.color ?? PALETTE[idx % PALETTE.length] }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default TimeSeriesChart;
