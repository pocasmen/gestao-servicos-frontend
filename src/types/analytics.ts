// ─── Analytics Response Types ──────────────────────────────────────────────────

export interface GroupedMetricReportItem {
  id: number;
  reportNumber: string | number;
  serviceDate: string;
  clientName: string;
  equipmentName: string;
  technicians: string[];
  hours: number;
  classification?: string | null;
}

export interface GroupedMetricResult {
  groupKey: string | number;
  groupLabel: string;
  value: number;
  reportCount: number;
  avg?: number; // calculado no service para equipment-avg-hours
  reports?: GroupedMetricReportItem[];
}

export interface ElapsedTimeSummary {
  count: number;
  avgHours: number;
  medianHours: number;
  minHours: number;
  maxHours: number;
  p90Hours: number;
}

export interface ElapsedTimeBucket {
  bucket: string;
  count: number;
}

export interface ElapsedTimeDetail {
  id: string | number;
  label: string;
  hoursElapsed: number;
}

export interface TimingReportResponse {
  summary: ElapsedTimeSummary;
  distribution: ElapsedTimeBucket[];
  details: ElapsedTimeDetail[];
}

export interface TrendByTechnicianPoint {
  period: string;
  technicianId: string;
  technicianName: string;
  technicianColor?: string | null;
  hours: number;
}

export interface TotalTrendPoint {
  period: string;
  totalHours: number;
}

export interface TechnicianHoursTrendResponse {
  byTechnician: TrendByTechnicianPoint[];
  total: TotalTrendPoint[];
}

export interface YearlyTrendPoint {
  period: string;
  totalHours: number;
  reportCount: number;
  distinctPartsCount: number;
}

export interface SummaryKPIs {
  totalReports: number;
  totalHours: number;
  openTickets: number;
  closedTickets: number;
}

export interface PartUsageResult {
  partId: number;
  partReference: string;
  partDesignation: string;
  totalQuantity: number;
}

export interface ClientPartReportItem {
  id: number;
  reportNumber: string | number;
  serviceDate: string;
  quantity: number;
  equipmentName?: string;
  technicians?: string[];
}

export interface ClientPartDetail {
  partId: number;
  reference: string;
  designation: string;
  unitPrice: number;
  quantity: number;
  totalCost: number;
  reportCount?: number;
  reports?: ClientPartReportItem[];
}

export interface TopClientPartsCost {
  clientId: number;
  clientName: string;
  totalCost: number;
  parts?: ClientPartDetail[];
}

export interface EquipmentFailureRate {
  equipmentId: number;
  brand: string;
  model: string;
  ticketCount: number;
}

export interface MaintenanceGapResult {
  equipmentId: number;
  brand: string;
  model: string;
  clientName: string;
  lastMaintenanceDate: string | null;
  daysSinceLastMaintenance: number | null;
}

export interface ServiceFrequencyResult {
  equipmentId: number;
  brand: string;
  model: string;
  serviceCount: number;
}

// ─── Analytics Filter Config ───────────────────────────────────────────────────

export interface AnalyticsFilterConfig {
  period: boolean;
  clients: boolean;
  technicians: boolean;
  serviceTypes: boolean;
  classifications?: boolean;
  metric: boolean; // hours|count toggle
  months: boolean; // nº de meses
  serviceTypeFixed?: string; // para service-frequency: serviceType obrigatório fixo via input
  granularity: boolean; // month|week|quarter
}

// ─── Report type discriminator ─────────────────────────────────────────────────

export type AnalyticsReportType = 'table' | 'timeseries' | 'timing' | 'summary';

export interface AnalyticsReportDef {
  id: string;
  label: string;
  category: 'parts' | 'hours' | 'equipment' | 'timing' | 'trends';
  type: AnalyticsReportType;
  endpoint: string;
  filters: AnalyticsFilterConfig;
}

// ─── Active filter state ───────────────────────────────────────────────────────

export interface AnalyticsFilters {
  startDate: string;
  endDate: string;
  clientIds: number[];
  technicianIds: string[];
  serviceTypes: string[];
  classifications: string[];
  metric: 'hours' | 'count';
  months: number;
  granularity: 'month' | 'week' | 'quarter';
  serviceType: string; // para service-frequency
  orderBy: 'total' | 'avg';
}
