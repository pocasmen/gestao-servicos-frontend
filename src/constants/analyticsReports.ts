import { AnalyticsReportDef } from '../types/analytics';

const PERIOD_ONLY: AnalyticsReportDef['filters'] = {
  period: true, clients: false, technicians: false,
  serviceTypes: false, classifications: false, metric: false, months: false, granularity: false,
};

const FULL_FILTERS: AnalyticsReportDef['filters'] = {
  period: true, clients: true, technicians: true,
  serviceTypes: true, classifications: true, metric: false, months: false, granularity: false,
};

export const ANALYTICS_REPORTS: AnalyticsReportDef[] = [
  // ─── Peças & Inventário ──────────────────────────────────────────────────────
  {
    id: 'parts-usage',
    label: 'Consumo de Peças',
    category: 'parts',
    type: 'table',
    endpoint: '/api/analytics/parts-usage',
    filters: FULL_FILTERS,
  },
  {
    id: 'top-clients-parts-cost',
    label: 'Custo de Peças por Cliente',
    category: 'parts',
    type: 'table',
    endpoint: '/api/analytics/top-clients-parts-cost',
    filters: FULL_FILTERS,
  },

  // ─── Horas & Produtividade ───────────────────────────────────────────────────
  {
    id: 'summary',
    label: 'KPIs Gerais',
    category: 'hours',
    type: 'summary',
    endpoint: '/api/analytics/summary',
    filters: PERIOD_ONLY,
  },
  {
    id: 'hours-by-client',
    label: 'Horas por Cliente',
    category: 'hours',
    type: 'table',
    endpoint: '/api/analytics/hours-by-client',
    filters: FULL_FILTERS,
  },
  {
    id: 'hours-by-technician',
    label: 'Horas por Técnico',
    category: 'hours',
    type: 'table',
    endpoint: '/api/analytics/hours-by-technician',
    filters: FULL_FILTERS,
  },
  {
    id: 'service-type-breakdown',
    label: 'Breakdown por Tipo de Serviço',
    category: 'hours',
    type: 'table',
    endpoint: '/api/analytics/service-type-breakdown',
    filters: { ...FULL_FILTERS, metric: true },
  },
  {
    id: 'classification-breakdown',
    label: 'Breakdown por Classificação',
    category: 'hours',
    type: 'table',
    endpoint: '/api/analytics/classification-breakdown',
    filters: { ...FULL_FILTERS, metric: true },
  },

  // ─── Equipamentos ────────────────────────────────────────────────────────────
  {
    id: 'equipment-avg-hours',
    label: 'Horas Médias por Equipamento',
    category: 'equipment',
    type: 'table',
    endpoint: '/api/analytics/equipment-avg-hours',
    filters: { ...FULL_FILTERS },
  },
  {
    id: 'equipment-hours',
    label: 'Horas Totais por Equipamento',
    category: 'equipment',
    type: 'table',
    endpoint: '/api/analytics/equipment-hours',
    filters: { ...FULL_FILTERS },
  },
  {
    id: 'equipment-maintenance-gap',
    label: 'Gap de Manutenção',
    category: 'equipment',
    type: 'table',
    endpoint: '/api/analytics/equipment-maintenance-gap',
    filters: { period: false, clients: false, technicians: false, serviceTypes: false, metric: false, months: true, granularity: false },
  },
  {
    id: 'equipment-service-frequency',
    label: 'Frequência de Serviço',
    category: 'equipment',
    type: 'table',
    endpoint: '/api/analytics/equipment-service-frequency',
    filters: { period: false, clients: false, technicians: false, serviceTypes: false, metric: false, months: true, granularity: false, serviceTypeFixed: '' },
  },
  {
    id: 'equipment-failure-rate',
    label: 'Taxa de Falha (Tickets)',
    category: 'equipment',
    type: 'table',
    endpoint: '/api/analytics/equipment-failure-rate',
    filters: PERIOD_ONLY,
  },

  // ─── Tempo de Resposta ───────────────────────────────────────────────────────
  {
    id: 'ticket-to-report-time',
    label: 'Ticket → Relatório',
    category: 'timing',
    type: 'timing',
    endpoint: '/api/analytics/ticket-to-report-time',
    filters: PERIOD_ONLY,
  },
  {
    id: 'time-to-first-schedule',
    label: 'Ticket → 1.º Agendamento',
    category: 'timing',
    type: 'timing',
    endpoint: '/api/analytics/time-to-first-schedule',
    filters: PERIOD_ONLY,
  },
  {
    id: 'service-end-to-report-time',
    label: 'Fim Serviço → Relatório',
    category: 'timing',
    type: 'timing',
    endpoint: '/api/analytics/service-end-to-report-time',
    filters: PERIOD_ONLY,
  },
  {
    id: 'report-to-billing-time',
    label: 'Relatório → Faturação',
    category: 'timing',
    type: 'timing',
    endpoint: '/api/analytics/report-to-billing-time',
    filters: PERIOD_ONLY,
  },

  // ─── Tendências ──────────────────────────────────────────────────────────────
  {
    id: 'technician-hours-trend',
    label: 'Tendência de Horas por Técnico',
    category: 'trends',
    type: 'timeseries',
    endpoint: '/api/analytics/technician-hours-trend',
    filters: { period: true, clients: false, technicians: false, serviceTypes: false, metric: false, months: false, granularity: true },
  },
  {
    id: 'yearly-trend',
    label: 'Tendência Anual',
    category: 'trends',
    type: 'timeseries',
    endpoint: '/api/analytics/yearly-trend',
    filters: { period: true, clients: false, technicians: false, serviceTypes: false, metric: false, months: false, granularity: true },
  },
];

export const ANALYTICS_CATEGORIES = [
  { id: 'parts',     label: 'Peças & Inventário' },
  { id: 'hours',     label: 'Horas & Produtividade' },
  { id: 'equipment', label: 'Equipamentos' },
  { id: 'timing',    label: 'Tempo de Resposta' },
  { id: 'trends',    label: 'Tendências' },
] as const;

export type AnalyticsCategory = typeof ANALYTICS_CATEGORIES[number]['id'];
