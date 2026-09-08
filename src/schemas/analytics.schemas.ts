import { z } from 'zod';

// ─── Schemas de resposta para validação safeParse ──────────────────────────────

export const GroupedMetricReportItemSchema = z.object({
  id: z.number(),
  reportNumber: z.union([z.string(), z.number()]),
  serviceDate: z.string(),
  clientName: z.string(),
  equipmentName: z.string(),
  technicians: z.array(z.string()),
  hours: z.union([z.number(), z.string()]).transform(v => Number(v) || 0),
  classification: z.string().nullable().optional(),
});

export const GroupedMetricSchema = z.object({
  groupKey: z.union([z.string(), z.number()]),
  groupLabel: z.string(),
  value: z.number(),
  reportCount: z.number(),
  avg: z.number().optional(),
  reports: z.array(GroupedMetricReportItemSchema).optional(),
});
export const GroupedMetricArraySchema = z.array(GroupedMetricSchema);

export const ElapsedTimeSummarySchema = z.object({
  count: z.number(),
  avgHours: z.number(),
  medianHours: z.number(),
  minHours: z.number(),
  maxHours: z.number(),
  p90Hours: z.number(),
});

export const ElapsedTimeBucketSchema = z.object({
  bucket: z.string(),
  count: z.number(),
});

export const ElapsedTimeDetailSchema = z.object({
  id: z.union([z.string(), z.number()]),
  label: z.string(),
  hoursElapsed: z.number(),
});

export const TimingReportSchema = z.object({
  summary: ElapsedTimeSummarySchema,
  distribution: z.array(ElapsedTimeBucketSchema),
  details: z.array(ElapsedTimeDetailSchema),
});

export const TechnicianHoursTrendSchema = z.object({
  byTechnician: z.array(z.object({
    period: z.string(),
    technicianId: z.string(),
    technicianName: z.string(),
    technicianColor: z.string().nullable().optional(),
    hours: z.number(),
  })),
  total: z.array(z.object({
    period: z.string(),
    totalHours: z.number(),
  })),
});

export const YearlyTrendPointSchema = z.object({
  period: z.string(),
  totalHours: z.number(),
  reportCount: z.number(),
  distinctPartsCount: z.number(),
});
export const YearlyTrendArraySchema = z.array(YearlyTrendPointSchema);

export const SummaryKPIsSchema = z.object({
  totalReports: z.number(),
  totalHours: z.number(),
  openTickets: z.number(),
  closedTickets: z.number(),
});

export const PartUsageSchema = z.object({
  partId: z.number(),
  partReference: z.string(),
  partDesignation: z.string(),
  totalQuantity: z.number(),
});
export const PartUsageArraySchema = z.array(PartUsageSchema);

export const ClientPartReportItemSchema = z.object({
  id: z.number(),
  reportNumber: z.union([z.string(), z.number()]),
  serviceDate: z.string(),
  quantity: z.union([z.number(), z.string()]).transform(v => Number(v) || 0),
  equipmentName: z.string().optional(),
  technicians: z.array(z.string()).optional(),
});

export const ClientPartDetailSchema = z.object({
  partId: z.number(),
  reference: z.string(),
  designation: z.string(),
  unitPrice: z.number(),
  quantity: z.number(),
  totalCost: z.number(),
  reportCount: z.number().optional(),
  reports: z.array(ClientPartReportItemSchema).optional(),
});

export const TopClientCostSchema = z.object({
  clientId: z.number(),
  clientName: z.string(),
  totalCost: z.number(),
  parts: z.array(ClientPartDetailSchema).optional(),
});
export const TopClientCostArraySchema = z.array(TopClientCostSchema);

export const EquipmentFailureSchema = z.object({
  equipmentId: z.number(),
  brand: z.string(),
  model: z.string(),
  ticketCount: z.number(),
});
export const EquipmentFailureArraySchema = z.array(EquipmentFailureSchema);

export const MaintenanceGapSchema = z.object({
  equipmentId: z.number(),
  brand: z.string(),
  model: z.string(),
  clientName: z.string(),
  lastMaintenanceDate: z.string().nullable(),
  daysSinceLastMaintenance: z.number().nullable(),
});
export const MaintenanceGapArraySchema = z.array(MaintenanceGapSchema);

export const ServiceFrequencySchema = z.object({
  equipmentId: z.number(),
  brand: z.string(),
  model: z.string(),
  serviceCount: z.number(),
});
export const ServiceFrequencyArraySchema = z.array(ServiceFrequencySchema);
