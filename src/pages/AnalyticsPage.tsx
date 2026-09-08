import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart2, Table as TableIcon, LayoutGrid } from 'lucide-react';
import apiClient from '../apiClient';
import logger from '../utils/logger';

import LoadingState from '../components/LoadingState';
import SortableTable, { TableColumn } from '../components/Analytics/SortableTable';
import ExpandedReportsTable from '../components/Analytics/ExpandedReportsTable';
import ExpandedClientPartsTable from '../components/Analytics/ExpandedClientPartsTable';
import TimeSeriesChart, { SeriesDef, TimeSeriesData } from '../components/Analytics/TimeSeriesChart';
import GroupedBarChart from '../components/Analytics/GroupedBarChart';
import TimingReportView from '../components/Analytics/TimingReportView';
import AnalyticsFilterBar from '../components/Analytics/AnalyticsFilterBar';
import ReportModal from '../components/ReportModal';
import { Report } from '../types';

import {
  ANALYTICS_REPORTS,
  ANALYTICS_CATEGORIES,
  AnalyticsCategory,
} from '../constants/analyticsReports';
import { AnalyticsFilters, AnalyticsReportDef, GroupedMetricReportItem } from '../types/analytics';

import {
  GroupedMetricArraySchema,
  TimingReportSchema,
  TechnicianHoursTrendSchema,
  YearlyTrendArraySchema,
  SummaryKPIsSchema,
  PartUsageArraySchema,
  TopClientCostArraySchema,
  EquipmentFailureArraySchema,
  MaintenanceGapArraySchema,
  ServiceFrequencyArraySchema,
} from '../schemas/analytics.schemas';

// ─── Default filters ───────────────────────────────────────────────────────────

const defaultEnd = new Date().toISOString().split('T')[0];
const defaultStart = (() => {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d.toISOString().split('T')[0];
})();

const DEFAULT_FILTERS: AnalyticsFilters = {
  startDate: defaultStart,
  endDate: defaultEnd,
  clientIds: [],
  technicianIds: [],
  serviceTypes: [],
  classifications: [],
  metric: 'count',
  months: 12,
  granularity: 'month',
  serviceType: 'manutencao',
  orderBy: 'total',
};

// ─── Build query params from filters + report def ─────────────────────────────

function buildParams(report: AnalyticsReportDef, filters: AnalyticsFilters): Record<string, string> {
  const p: Record<string, string> = {};
  const { config: fc } = { config: report.filters };

  if (fc.period) {
    p.startDate = filters.startDate;
    p.endDate = filters.endDate;
  }
  if (fc.months) p.months = String(filters.months);
  if (fc.clients && filters.clientIds.length > 0) p.clientIds = filters.clientIds.join(',');
  if (fc.technicians && filters.technicianIds.length > 0) p.technicianIds = filters.technicianIds.join(',');
  if (fc.serviceTypes && filters.serviceTypes.length > 0) p.serviceTypes = filters.serviceTypes.join(',');
  if (fc.classifications && filters.classifications.length > 0) p.classifications = filters.classifications.join(',');
  if (fc.metric) p.metric = filters.metric;
  if (fc.granularity) p.granularity = filters.granularity;
  if (fc.serviceTypeFixed !== undefined) p.serviceType = filters.serviceType;

  return p;
}

// ─── Columns por relatório ────────────────────────────────────────────────────

const REPORT_COLUMNS: Record<string, TableColumn[]> = {
  'parts-usage': [
    { key: 'partReference', label: 'Referência', format: v => <span className="fw-semibold text-primary">{v}</span> },
    { key: 'partDesignation', label: 'Designação' },
    { key: 'totalQuantity', label: 'Qtd. Total', align: 'right', format: v => <span className="fw-bold">{v?.toFixed(0)}</span> },
  ],
  'top-clients-parts-cost': [
    { key: 'clientName', label: 'Cliente', format: v => <span className="fw-semibold">{v}</span> },
    { key: 'totalCost', label: 'Custo Total (€)', align: 'right', format: v => <span className="fw-bold text-success">€{Number(v || 0).toFixed(2)}</span> },
  ],
  'hours-by-client': [
    { key: 'groupLabel', label: 'Cliente', format: v => <span className="fw-semibold">{v}</span> },
    { key: 'value', label: 'Horas Totais', align: 'right', format: v => <span className="fw-bold">{Number(v || 0).toFixed(1)}h</span> },
    { key: 'reportCount', label: 'Relatórios', align: 'right', format: v => <span className="badge bg-secondary-subtle text-secondary-emphasis rounded-pill px-2">{v}</span> },
  ],
  'hours-by-technician': [
    { key: 'groupLabel', label: 'Técnico', format: v => <span className="fw-semibold">{v}</span> },
    { key: 'value', label: 'Horas Imputadas', align: 'right', format: v => <span className="fw-bold text-primary">{Number(v || 0).toFixed(1)}h</span> },
    { key: 'reportCount', label: 'Relatórios', align: 'right', format: v => <span className="badge bg-secondary-subtle text-secondary-emphasis rounded-pill px-2">{v}</span> },
  ],
  'service-type-breakdown': [
    { key: 'groupLabel', label: 'Tipo de Serviço', format: v => <span className="fw-semibold text-capitalize">{v}</span> },
    { key: 'value', label: 'Valor', align: 'right', format: v => <span className="fw-bold">{Number(v || 0).toFixed(1)}</span> },
    { key: 'reportCount', label: 'Relatórios', align: 'right', format: v => <span className="badge bg-secondary-subtle text-secondary-emphasis rounded-pill px-2">{v}</span> },
  ],
  'classification-breakdown': [
    { key: 'groupLabel', label: 'Classificação', format: v => <span className="fw-semibold text-capitalize">{v}</span> },
    { key: 'value', label: 'Valor', align: 'right', format: v => <span className="fw-bold">{Number(v || 0).toFixed(1)}</span> },
    { key: 'reportCount', label: 'Relatórios', align: 'right', format: v => <span className="badge bg-secondary-subtle text-secondary-emphasis rounded-pill px-2">{v}</span> },
  ],
  'equipment-avg-hours': [
    { key: 'groupLabel', label: 'Equipamento', format: v => <span className="fw-semibold">{v}</span> },
    { key: 'value', label: 'Horas Totais', align: 'right', format: v => `${Number(v || 0).toFixed(1)}h` },
    { key: 'avg', label: 'Média / Relatório', align: 'right', format: v => v != null ? <span className="fw-bold text-primary">{Number(v).toFixed(1)}h</span> : '—' },
    { key: 'reportCount', label: 'Relatórios', align: 'right', format: v => <span className="badge bg-secondary-subtle text-secondary-emphasis rounded-pill px-2">{v}</span> },
  ],
  'equipment-hours': [
    { key: 'groupLabel', label: 'Equipamento', format: v => <span className="fw-semibold">{v}</span> },
    { key: 'value', label: 'Horas Totais', align: 'right', format: v => <span className="fw-bold text-primary">{Number(v || 0).toFixed(1)}h</span> },
    { key: 'reportCount', label: 'Relatórios', align: 'right', format: v => <span className="badge bg-secondary-subtle text-secondary-emphasis rounded-pill px-2">{v}</span> },
  ],
  'equipment-maintenance-gap': [
    { key: 'brand', label: 'Marca', format: v => <span className="fw-semibold">{v}</span> },
    { key: 'model', label: 'Modelo' },
    { key: 'clientName', label: 'Cliente' },
    { key: 'lastMaintenanceDate', label: 'Última Manutenção', format: v => v ? new Date(v).toLocaleDateString('pt-PT') : <span className="badge bg-danger-subtle text-danger">Nunca</span> },
    { key: 'daysSinceLastMaintenance', label: 'Dias Decorridos', align: 'right', format: v => v != null ? <span className={`fw-bold ${v > 180 ? 'text-danger' : 'text-secondary'}`}>{v}d</span> : <span className="text-danger fw-bold">∞</span> },
  ],
  'equipment-service-frequency': [
    { key: 'brand', label: 'Marca', format: v => <span className="fw-semibold">{v}</span> },
    { key: 'model', label: 'Modelo' },
    { key: 'serviceCount', label: 'Nº de Serviços', align: 'right', format: v => <span className="fw-bold text-primary">{v}</span> },
  ],
  'equipment-failure-rate': [
    { key: 'brand', label: 'Marca', format: v => <span className="fw-semibold">{v}</span> },
    { key: 'model', label: 'Modelo' },
    { key: 'ticketCount', label: 'Nº Tickets de Avaria', align: 'right', format: v => <span className="fw-bold text-danger">{v}</span> },
  ],
};

// ─── Schema map ────────────────────────────────────────────────────────────────

function parseResponse(reportId: string, data: any): any {
  const tableSchemas: Record<string, any> = {
    'parts-usage': PartUsageArraySchema,
    'top-clients-parts-cost': TopClientCostArraySchema,
    'hours-by-client': GroupedMetricArraySchema,
    'hours-by-technician': GroupedMetricArraySchema,
    'service-type-breakdown': GroupedMetricArraySchema,
    'classification-breakdown': GroupedMetricArraySchema,
    'equipment-avg-hours': GroupedMetricArraySchema,
    'equipment-hours': GroupedMetricArraySchema,
    'equipment-maintenance-gap': MaintenanceGapArraySchema,
    'equipment-service-frequency': ServiceFrequencyArraySchema,
    'equipment-failure-rate': EquipmentFailureArraySchema,
  };
  const timingIds = ['ticket-to-report-time', 'time-to-first-schedule', 'service-end-to-report-time', 'report-to-billing-time'];

  if (timingIds.includes(reportId)) {
    const r = TimingReportSchema.safeParse(data);
    if (!r.success) { logger.error(r.error, `Analytics parse error [${reportId}]`); return data; }
    return r.data;
  }
  if (reportId === 'summary') {
    const r = SummaryKPIsSchema.safeParse(data);
    if (!r.success) { logger.error(r.error, `Analytics parse error [${reportId}]`); return data; }
    return r.data;
  }
  if (reportId === 'technician-hours-trend') {
    const r = TechnicianHoursTrendSchema.safeParse(data);
    if (!r.success) { logger.error(r.error, `Analytics parse error [${reportId}]`); return data; }
    return r.data;
  }
  if (reportId === 'yearly-trend') {
    const r = YearlyTrendArraySchema.safeParse(data);
    if (!r.success) { logger.error(r.error, `Analytics parse error [${reportId}]`); return data; }
    return r.data;
  }
  const schema = tableSchemas[reportId];
  if (schema) {
    const r = schema.safeParse(data);
    if (!r.success) { logger.error(r.error, `Analytics parse error [${reportId}]`); return data; }
    return r.data;
  }
  return data;
}

// ─── Palette for timeseries ────────────────────────────────────────────────────

const PALETTE = ['#083085', '#0284c7', '#059669', '#d97706', '#7c3aed', '#dc2626', '#db2777', '#0d9488'];

// ─── Report IDs that support chart visualization ───────────────────────────────

const CHART_SUPPORTED_REPORTS = new Set([
  'hours-by-client',
  'hours-by-technician',
  'service-type-breakdown',
  'classification-breakdown',
  'equipment-hours',
  'equipment-avg-hours',
  'equipment-service-frequency',
  'equipment-failure-rate',
  'equipment-maintenance-gap',
  'parts-usage',
  'top-clients-parts-cost',
]);

// ─── AnalyticsPage ─────────────────────────────────────────────────────────────

const AnalyticsPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<AnalyticsCategory>('hours');
  const [activeReportId, setActiveReportId] = useState<string>('summary');
  const [appliedFilters, setAppliedFilters] = useState<AnalyticsFilters>(DEFAULT_FILTERS);
  const [pendingFilters, setPendingFilters] = useState<AnalyticsFilters>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<'table' | 'chart' | 'both'>('both');

  // Modal de visualização/edição do relatório
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isLoadingReport, setIsLoadingReport] = useState<boolean>(false);

  const categoryReports = useMemo(
    () => ANALYTICS_REPORTS.filter(r => r.category === activeCategory),
    [activeCategory]
  );

  const activeReport = useMemo(
    () => ANALYTICS_REPORTS.find(r => r.id === activeReportId) ?? categoryReports[0],
    [activeReportId, categoryReports]
  );

  const handleCategoryChange = useCallback((cat: AnalyticsCategory) => {
    setActiveCategory(cat);
    setViewMode('both');
    const first = ANALYTICS_REPORTS.find(r => r.category === cat);
    if (first) setActiveReportId(first.id);
  }, []);

  const handleReportChange = useCallback((id: string) => {
    setActiveReportId(id);
    setViewMode('both');
  }, []);

  const queryParams = useMemo(
    () => activeReport ? buildParams(activeReport, appliedFilters) : {},
    [activeReport, appliedFilters]
  );

  const { data: rawData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['analytics', activeReport?.id, queryParams],
    queryFn: async () => {
      if (!activeReport) return null;
      const res = await apiClient.get(activeReport.endpoint, { params: queryParams });
      return parseResponse(activeReport.id, res.data);
    },
    enabled: !!activeReport,
    staleTime: 2 * 60 * 1000,
  });

  const handleOpenReport = async (reportId: number) => {
    try {
      setIsLoadingReport(true);
      const res = await apiClient.get(`/api/reports/${reportId}`);
      if (res.data) {
        setSelectedReport(res.data);
        setIsReportModalOpen(true);
      }
    } catch (err) {
      logger.error(err, `Falha ao carregar relatório ${reportId}`);
    } finally {
      setIsLoadingReport(false);
    }
  };

  // ─── Helper Badge Classificação ─────────────────────────────────────────────
  const renderClassificationBadge = (classification?: string | null) => {
    if (!classification) return <span className="text-muted small">—</span>;
    const c = classification.toLowerCase();
    let badgeClass = 'bg-secondary-subtle text-secondary-emphasis border-secondary-subtle';
    let label = classification;

    if (c === 'contrato') {
      badgeClass = 'bg-primary-subtle text-primary border-primary-subtle';
      label = 'Contrato';
    } else if (c === 'garantia') {
      badgeClass = 'bg-warning-subtle text-warning-emphasis border-warning-subtle';
      label = 'Garantia';
    } else if (c === 'oferta') {
      badgeClass = 'bg-info-subtle text-info-emphasis border-info-subtle';
      label = 'Oferta';
    } else if (c === 'foss') {
      badgeClass = 'bg-success-subtle text-success-emphasis border-success-subtle';
      label = 'Foss';
    } else if (c === 'msd') {
      badgeClass = 'bg-dark-subtle text-dark-emphasis border-dark-subtle';
      label = 'MSD';
    } else if (c === 'geral') {
      badgeClass = 'bg-secondary-subtle text-secondary-emphasis border-secondary-subtle';
      label = 'Geral';
    }

    return (
      <span className={`badge rounded-pill px-2 py-1 small fw-semibold border ${badgeClass}`} style={{ fontSize: '0.68rem' }}>
        {label}
      </span>
    );
  };

  // ─── Render sub-tabela expandida de peças por cliente ───────────────────────
  const renderExpandedClientParts = (row: any) => {
    return (
      <ExpandedClientPartsTable
        parts={row.parts || []}
        onOpenReport={handleOpenReport}
      />
    );
  };

  // ─── Render sub-tabela expandida de relatórios ──────────────────────────────
  const renderExpandedReports = (row: any) => {
    return (
      <ExpandedReportsTable
        reports={row.reports || []}
        onOpenReport={handleOpenReport}
        renderClassificationBadge={renderClassificationBadge}
      />
    );
  };

  // ─── Render content by type ─────────────────────────────────────────────────

  const renderContent = () => {
    if (isLoading || isLoadingReport) return <LoadingState message="A carregar dados..." />;
    if (isError) return (
      <div className="alert alert-danger rounded-4 p-3 shadow-sm">
        <strong>Erro ao carregar dados:</strong> {(error as any)?.message ?? 'Erro desconhecido'}
      </div>
    );
    if (!rawData) return null;

    const type = activeReport?.type;

    // Summary KPIs
    if (type === 'summary') {
      const d = rawData as any;
      return (
        <div className="row g-3">
          {[
            { label: 'Total de Relatórios', value: d.totalReports, color: '#083085', bg: '#eff6ff' },
            { label: 'Total de Horas', value: `${Number(d.totalHours).toFixed(1)}h`, color: '#059669', bg: '#ecfdf5' },
            { label: 'Tickets Abertos', value: d.openTickets, color: '#d97706', bg: '#fffbeb' },
            { label: 'Tickets Fechados', value: d.closedTickets, color: '#0284c7', bg: '#f0f9ff' },
          ].map(kpi => (
            <div key={kpi.label} className="col-6 col-lg-3">
              <div
                className="glass-card p-4 text-center h-100 shadow-sm border"
                style={{ backgroundColor: kpi.bg, borderColor: `${kpi.color}33` }}
              >
                <div className="fs-1 fw-bold mb-1" style={{ color: kpi.color }}>{kpi.value}</div>
                <div className="small fw-semibold text-secondary">{kpi.label}</div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Timing
    if (type === 'timing') {
      const unit = activeReport?.id === 'report-to-billing-time' ? 'days' : 'hours';
      return <TimingReportView data={rawData} unit={unit} />;
    }

    // Timeseries — technician-hours-trend
    if (type === 'timeseries' && activeReport?.id === 'technician-hours-trend') {
      const d = rawData as any;
      // Pivot: { period, techId: hours }[]
      const allTechs: { id: string; name: string; color?: string | null }[] = [];
      const periodMap: Record<string, Record<string, number>> = {};
      for (const pt of d.byTechnician ?? []) {
        if (!periodMap[pt.period]) periodMap[pt.period] = {};
        periodMap[pt.period][pt.technicianId] = pt.hours;
        if (!allTechs.find(t => t.id === pt.technicianId)) {
          allTechs.push({
            id: pt.technicianId,
            name: pt.technicianName,
            color: pt.technicianColor,
          });
        }
      }
      for (const tp of d.total ?? []) {
        if (!periodMap[tp.period]) periodMap[tp.period] = {};
        periodMap[tp.period]['__total'] = tp.totalHours;
      }
      const chartData: TimeSeriesData[] = Object.keys(periodMap).sort().map(p => ({ period: p, ...periodMap[p] }));
      const series: SeriesDef[] = [
        ...allTechs.map((t, i) => ({
          key: t.id,
          label: t.name,
          color: t.color && t.color.trim() !== '' ? t.color : PALETTE[i % PALETTE.length],
        })),
        { key: '__total', label: 'Total Geral', color: '#111827', dashed: true, bold: true },
      ];
      return (
        <div className="glass-card p-4 shadow-sm">
          <TimeSeriesChart data={chartData} series={series} yLabel="Horas" />
        </div>
      );
    }

    // Timeseries — yearly-trend
    if (type === 'timeseries' && activeReport?.id === 'yearly-trend') {
      const d = (rawData as any[]) ?? [];
      const series: SeriesDef[] = [
        { key: 'totalHours', label: 'Horas de Serviço', color: '#083085' },
        { key: 'reportCount', label: 'Nº de Relatórios', color: '#059669' },
      ];
      return (
        <div className="glass-card p-4 shadow-sm">
          <TimeSeriesChart data={d} series={series} />
        </div>
      );
    }

    // Table
    const cols = REPORT_COLUMNS[activeReport?.id ?? ''] ?? [];
    const rows = Array.isArray(rawData) ? rawData : [];
    const hasGroupedReports = rows.some((r: any) => Array.isArray(r.reports) && r.reports.length > 0);
    const hasGroupedParts = activeReport?.id === 'top-clients-parts-cost' && rows.some((r: any) => Array.isArray(r.parts) && r.parts.length > 0);
    const hasExpandableRows = hasGroupedReports || hasGroupedParts;

    const expandedRowRenderer = hasGroupedParts
      ? renderExpandedClientParts
      : hasGroupedReports
      ? renderExpandedReports
      : undefined;

    const tableRowKeyField = activeReport?.id === 'top-clients-parts-cost' ? 'clientId' : 'groupKey';

    // Mapeamento dos dados tabulares para o formato do GroupedBarChart
    const getChartConfig = (reportId: string, data: any[]): { chartData: any[]; valueLabel: string; unit: string } | null => {
      switch (reportId) {
        case 'hours-by-client':
        case 'hours-by-technician':
        case 'service-type-breakdown':
        case 'classification-breakdown':
        case 'equipment-hours':
          return {
            chartData: data.map(d => ({
              label: d.groupLabel || String(d.groupKey),
              value: Number(d.value) || 0,
              count: d.reportCount,
            })),
            valueLabel: 'Horas Totais',
            unit: 'h',
          };
        case 'equipment-avg-hours':
          return {
            chartData: data.map(d => ({
              label: d.groupLabel || String(d.groupKey),
              value: Number(d.avg ?? d.value) || 0,
              count: d.reportCount,
            })),
            valueLabel: 'Média de Horas / Relatório',
            unit: 'h',
          };
        case 'parts-usage':
          return {
            chartData: data.map(d => ({
              label: `${d.partDesignation || d.partReference} (${d.partReference})`,
              value: Number(d.totalQuantity) || 0,
            })),
            valueLabel: 'Quantidade Total',
            unit: 'un',
          };
        case 'top-clients-parts-cost':
          return {
            chartData: data.map(d => ({
              label: d.clientName || 'Cliente',
              value: Number(d.totalCost) || 0,
            })),
            valueLabel: 'Custo Total',
            unit: '€',
          };
        case 'equipment-service-frequency':
          return {
            chartData: data.map(d => ({
              label: `${d.brand || ''} ${d.model || ''}`.trim() || 'Equipamento',
              value: Number(d.serviceCount) || 0,
            })),
            valueLabel: 'N.º de Serviços',
            unit: '',
          };
        case 'equipment-failure-rate':
          return {
            chartData: data.map(d => ({
              label: `${d.brand || ''} ${d.model || ''}`.trim() || 'Equipamento',
              value: Number(d.ticketCount) || 0,
              color: '#dc2626',
            })),
            valueLabel: 'N.º de Avarias',
            unit: '',
          };
        case 'equipment-maintenance-gap':
          return {
            chartData: data.map(d => ({
              label: `${d.brand || ''} ${d.model || ''} (${d.clientName || ''})`.trim(),
              value: d.daysSinceLastMaintenance != null ? Number(d.daysSinceLastMaintenance) : 365,
              color: d.daysSinceLastMaintenance > 180 ? '#dc2626' : '#d97706',
            })),
            valueLabel: 'Dias sem Manutenção',
            unit: 'dias',
          };
        default:
          return null;
      }
    };

    const chartConfig = activeReport ? getChartConfig(activeReport.id, rows) : null;
    const supportsChart = chartConfig !== null && chartConfig.chartData.length > 0;

    const renderTableView = () => {
      const footerRow = activeReport?.id === 'top-clients-parts-cost' && rows.length > 0
        ? {
            clientName: <span className="fw-bold" style={{ color: 'var(--primary-color)' }}>Total Geral</span>,
            totalCost: (
              <span className="fw-bold text-success">
                €{rows.reduce((sum: number, r: any) => sum + Number(r.totalCost || 0), 0).toFixed(2)}
              </span>
            ),
          }
        : undefined;

      return (
        <div className="glass-card p-0 overflow-hidden shadow-sm">
          <div className="px-4 pt-3 pb-2 d-flex align-items-center justify-content-between border-bottom">
            <span className="small fw-semibold text-secondary">{rows.length} registo(s) encontrado(s)</span>
            {hasExpandableRows && (
              <span className="small text-muted fst-italic">
                {hasGroupedParts
                  ? 'Dica: clique numa linha para expandir as peças detalhadas do cliente'
                  : 'Dica: clique numa linha para expandir os relatórios agrupados'}
              </span>
            )}
          </div>
          <SortableTable
            columns={cols}
            data={rows}
            defaultSortKey={cols[cols.length - 1]?.key}
            renderExpandedRow={expandedRowRenderer}
            rowKeyField={tableRowKeyField}
            footerRow={footerRow}
          />
        </div>
      );
    };

    const renderChartView = () => {
      if (!chartConfig) return null;
      return (
        <div className="glass-card p-4 shadow-sm">
          <GroupedBarChart
            data={chartConfig.chartData}
            valueLabel={chartConfig.valueLabel}
            unit={chartConfig.unit}
            maxItems={12}
          />
        </div>
      );
    };

    if (supportsChart) {
      if (viewMode === 'chart') {
        return renderChartView();
      }
      if (viewMode === 'both') {
        return (
          <div className="d-flex flex-column gap-4">
            {renderChartView()}
            {renderTableView()}
          </div>
        );
      }
    }

    return renderTableView();
  };

  return (
    <div className="container-fluid py-4 px-4" style={{ color: 'var(--text-color)' }}>
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <BarChart2 size={40} strokeWidth={2.5} className="text-primary" />
        <div>
          <h1 className="mb-0 fw-bold" style={{ fontFamily: 'var(--font-family-title)', fontSize: '1.8rem', color: 'var(--primary-color)' }}>
            Analytics & BI
          </h1>
          <p className="text-secondary small mb-0 fw-medium">Relatórios analíticos e indicadores de desempenho operacional</p>
        </div>
      </div>

      {/* ─── Category pills ──────────────────────────────────────────────────── */}
      <div className="d-flex flex-wrap gap-2 mb-3">
        {ANALYTICS_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            type="button"
            className={`btn btn-sm rounded-pill px-3 fw-medium ${
              activeCategory === cat.id
                ? 'btn-primary shadow-sm'
                : 'btn-outline-secondary bg-white text-dark border'
            }`}
            onClick={() => handleCategoryChange(cat.id as AnalyticsCategory)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* ─── Report selector ─────────────────────────────────────────────────── */}
      {categoryReports.length > 1 && (
        <div className="d-flex flex-wrap gap-2 mb-4 p-2 bg-white rounded-4 border shadow-sm">
          {categoryReports.map(r => (
            <button
              key={r.id}
              type="button"
              className={`btn btn-sm rounded-pill px-3 ${
                activeReport?.id === r.id
                  ? 'btn-primary shadow-sm'
                  : 'btn-light border-0 text-secondary'
              }`}
              style={{ fontSize: '0.82rem', fontWeight: activeReport?.id === r.id ? 600 : 500 }}
              onClick={() => handleReportChange(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      {/* ─── Filter bar ──────────────────────────────────────────────────────── */}
      {activeReport && (
        <AnalyticsFilterBar
          config={activeReport.filters}
          value={pendingFilters}
          onChange={setPendingFilters}
          onApply={setAppliedFilters}
        />
      )}

      {/* ─── Content ─────────────────────────────────────────────────────────── */}
      <div className="mt-2">
        {activeReport && (
          <div className="mb-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
            <h5 className="fw-bold mb-0" style={{ color: 'var(--text-color)' }}>{activeReport.label}</h5>

            {CHART_SUPPORTED_REPORTS.has(activeReport.id) && (
              <div className="btn-group btn-group-sm bg-white p-1 rounded-3 border shadow-sm" role="group">
                <button
                  type="button"
                  className={`btn btn-sm rounded-2 d-flex align-items-center gap-1 ${
                    viewMode === 'both' ? 'btn-primary shadow-sm' : 'btn-light border-0 text-secondary'
                  }`}
                  style={{ fontSize: '0.78rem', fontWeight: 500 }}
                  onClick={() => setViewMode('both')}
                >
                  <LayoutGrid size={14} /> Ambos
                </button>
                <button
                  type="button"
                  className={`btn btn-sm rounded-2 d-flex align-items-center gap-1 ${
                    viewMode === 'chart' ? 'btn-primary shadow-sm' : 'btn-light border-0 text-secondary'
                  }`}
                  style={{ fontSize: '0.78rem', fontWeight: 500 }}
                  onClick={() => setViewMode('chart')}
                >
                  <BarChart2 size={14} /> Gráfico
                </button>
                <button
                  type="button"
                  className={`btn btn-sm rounded-2 d-flex align-items-center gap-1 ${
                    viewMode === 'table' ? 'btn-primary shadow-sm' : 'btn-light border-0 text-secondary'
                  }`}
                  style={{ fontSize: '0.78rem', fontWeight: 500 }}
                  onClick={() => setViewMode('table')}
                >
                  <TableIcon size={14} /> Tabela
                </button>
              </div>
            )}
          </div>
        )}
        {renderContent()}
      </div>

      {/* ─── Modal de Relatório ──────────────────────────────────────────────── */}
      {isReportModalOpen && selectedReport && (
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => {
            setIsReportModalOpen(false);
            setSelectedReport(null);
          }}
          schedule={null}
          reportToEdit={selectedReport}
          onReportSaved={() => {
            setIsReportModalOpen(false);
            setSelectedReport(null);
            refetch();
          }}
        />
      )}
    </div>
  );
};

export default AnalyticsPage;
