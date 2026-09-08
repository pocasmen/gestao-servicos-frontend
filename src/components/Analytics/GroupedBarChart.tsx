import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export interface ChartDataItem {
  label: string;
  value: number;
  subLabel?: string;
  count?: number;
  color?: string;
  [key: string]: any;
}

interface GroupedBarChartProps {
  data: ChartDataItem[];
  valueLabel?: string;
  unit?: string;
  height?: number;
  maxItems?: number;
  onBarClick?: (item: ChartDataItem) => void;
}

const PALETTE = [
  '#083085', '#0284c7', '#059669', '#d97706',
  '#7c3aed', '#dc2626', '#db2777', '#0d9488',
  '#2563eb', '#16a34a', '#ea580c', '#9333ea',
];

const GroupedBarChart: React.FC<GroupedBarChartProps> = ({
  data,
  valueLabel = 'Valor',
  unit = '',
  height = 360,
  maxItems = 10,
  onBarClick,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-secondary text-center py-4 small">
        Sem dados para apresentar no gráfico.
      </div>
    );
  }

  // Ordenar por valor decrescente e limitar ao top N
  const chartData = [...data]
    .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
    .slice(0, maxItems);

  // Dynamic height if there are fewer items to keep proportions clean
  const computedHeight = Math.max(height, chartData.length * 36 + 60);

  return (
    <div className="w-100">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <span className="small text-muted fw-semibold">
          Top {chartData.length} por {valueLabel}
        </span>
        {data.length > maxItems && (
          <span className="badge bg-light text-secondary border small">
            A exibir {chartData.length} de {data.length} registos
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={computedHeight}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 30, left: 10, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
          <XAxis
            type="number"
            tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 500 }}
            tickLine={{ stroke: '#9ca3af' }}
            axisLine={{ stroke: '#d1d5db' }}
            unit={unit ? ` ${unit}` : undefined}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={160}
            tick={{ fill: '#1f2937', fontSize: 12, fontWeight: 600 }}
            tickLine={false}
            axisLine={{ stroke: '#d1d5db' }}
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
            cursor={{ fill: 'rgba(8, 48, 133, 0.05)' }}
            formatter={(val: any, _name: any, item: any) => {
              const formattedVal = Number(val || 0).toLocaleString('pt-PT', {
                maximumFractionDigits: 1,
                minimumFractionDigits: Number.isInteger(Number(val)) ? 0 : 1,
              });
              const extraInfo = item.payload?.count !== undefined ? ` (${item.payload.count} relatórios)` : '';
              return [`${formattedVal}${unit ? ` ${unit}` : ''}${extraInfo}`, valueLabel];
            }}
            labelStyle={{ fontWeight: 'bold', color: '#111827', marginBottom: 4 }}
          />
          <Bar
            dataKey="value"
            name={valueLabel}
            radius={[0, 6, 6, 0]}
            onClick={(entry) => onBarClick && onBarClick(entry as any)}
            cursor={onBarClick ? 'pointer' : 'default'}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || PALETTE[index % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GroupedBarChart;
