import { z } from 'zod';
import { UserRole, ScheduleStatus, SchedulePriority, StockType, ServiceClassification, TicketStatus } from './constants/enums';
import { BillingStatus } from './types';

// Enums (Validating strings against our defined enums)
export const UserRoleSchema = z.nativeEnum(UserRole);
export const ScheduleStatusSchema = z.nativeEnum(ScheduleStatus);
export const SchedulePrioritySchema = z.nativeEnum(SchedulePriority);
export const StockTypeSchema = z.nativeEnum(StockType);

export const TechnicianSchema = z.object({
    id: z.string().optional().nullable().transform(v => v ?? undefined),
    name: z.string(),
    role: UserRoleSchema.optional(),
    color: z.string().optional().nullable().transform(v => v ?? undefined),
    signature: z.string().optional().nullable().transform(v => v ?? undefined),
});

export const TimeBlockSchema = z.object({
    id: z.number().optional(),
    start: z.string().or(z.date()).transform(val => new Date(val)),
    end: z.string().or(z.date()).transform(val => new Date(val)),
});

export const PartItemSchema = z.object({
    id: z.number().optional(),
    quantity: z.number(),
    reference: z.string(),
    designation: z.string(),
    isDesignationLocked: z.boolean().optional(),
    stockType: StockTypeSchema.optional(),
    isApplied: z.boolean().optional(),
    stock_quantity: z.number().optional(),
    reserved_quantity: z.number().optional(),
    stock_quantity_foss: z.number().optional(),
    reserved_quantity_foss: z.number().optional(),
    raw_stock_quantity: z.number().optional(),
    raw_stock_foss: z.number().optional(),
    available_quantity: z.number().optional(),
    available_quantity_foss: z.number().optional(),
});

export const ScheduleEventSchema = z.object({
    id: z.union([z.number(), z.string()]),
    scheduleId: z.number().optional(),
    title: z.string().optional().nullable().transform(v => v ?? undefined),
    startDate: z.string().optional().nullable().transform(v => v ?? undefined),
    endDate: z.string().optional().nullable().transform(v => v ?? undefined),
    clientId: z.number().optional().nullable().transform(v => v ?? undefined),
    equipmentId: z.number().optional().nullable().transform(v => v ?? undefined),
    status: ScheduleStatusSchema.optional(),
    technicians: z.array(z.union([z.string(), TechnicianSchema])).default([]).transform(val =>
        val.map(t => typeof t === 'string' ? { id: '', name: t } : t)
    ),
    isCompleted: z.boolean().default(false),
    hasReport: z.boolean().default(false),
    ticketId: z.number().optional().nullable().transform(v => v ?? undefined),
    internalNotes: z.string().optional().nullable().transform(v => v ?? undefined),
    serviceType: z.union([z.string(), z.array(z.string())]).optional().nullable().transform(v => v ?? undefined),
    acknowledgementState: ScheduleStatusSchema.optional().nullable().transform(v => v ?? undefined),
    parts: z.array(PartItemSchema).optional().nullable().transform(v => v ?? undefined),
    clientName: z.string().optional().nullable().transform(v => v ?? undefined),
    equipmentInfo: z.string().optional().nullable().transform(v => v ?? undefined),
    timeBlocks: z.array(TimeBlockSchema).optional().nullable().transform(v => v ?? undefined),
    includes_travel: z.boolean().optional().nullable().transform(v => v ?? undefined),
    classification: z.nativeEnum(ServiceClassification).optional().nullable().transform(v => v ?? undefined),
    priority: SchedulePrioritySchema.optional().nullable().transform(v => v ?? undefined),
    isTask: z.boolean().optional(),
});

export const PartSchema = z.object({
    id: z.number().optional(),
    reference: z.string(),
    designation: z.string(),
    is_composed: z.boolean().optional(),
    stock_quantity: z.number().optional(),
    reserved_quantity: z.number().optional(),
    ordered_quantity: z.number().optional(),
    stock_quantity_foss: z.number().optional(),
    reserved_quantity_foss: z.number().optional(),
    ordered_quantity_foss: z.number().optional(),
    raw_stock_quantity: z.number().optional(),
    raw_stock_foss: z.number().optional(),
    available_quantity: z.number().optional(),
    available_quantity_foss: z.number().optional(),
});

export const ClientSchema = z.object({
    id: z.number(),
    name: z.string(),
    address: z.string().optional().nullable().transform(v => v ?? ''),
    city: z.string().optional().nullable().transform(v => v ?? ''),
    postCode: z.string().optional().nullable().transform(v => v ?? ''),
    nif: z.string().optional().nullable().transform(v => v ?? ''),
    contactName: z.string().optional().nullable().transform(v => v ?? undefined),
    contactEmail: z.string().optional().nullable().transform(v => v ?? undefined),
    contactPhone: z.string().optional().nullable().transform(v => v ?? undefined),
});

export const EquipmentSchema = z.object({
    id: z.number(),
    brand: z.string(),
    model: z.string(),
    serialNumber: z.string(),
    clientName: z.string().optional(),
    clientId: z.number().optional().nullable().transform(v => v ?? undefined),
    additionalInfo: z.string().optional().nullable().transform(v => v ?? undefined),
});

export const TicketSchema = z.object({
    id: z.number(),
    client_id: z.number().optional().nullable().transform(v => v ?? undefined),
    equipmentId: z.number().optional().nullable().transform(v => v ?? undefined),
    title: z.string().optional().nullable().transform(v => v ?? ''),
    faultDescription: z.string().optional().nullable().transform(v => v ?? ''),
    status: z.nativeEnum(TicketStatus),
    scheduleId: z.number().optional().nullable().transform(v => v ?? undefined),
    createdAt: z.string(),
    updatedAt: z.string(),
    created_by_user_id: z.string().optional().nullable().transform(v => v ?? undefined),
    clientName: z.string().optional().nullable().transform(v => v ?? undefined),
    equipmentInfo: z.string().optional().nullable().transform(v => v ?? undefined),
    userFirstName: z.string().optional().nullable().transform(v => v ?? undefined),
    userLastName: z.string().optional().nullable().transform(v => v ?? undefined),
    startDate: z.string().optional().nullable().transform(v => v ?? undefined),
    endDate: z.string().optional().nullable().transform(v => v ?? undefined),
    internalNotes: z.string().optional().nullable().transform(v => v ?? undefined),
    hasReport: z.boolean().optional().nullable().transform(v => v ?? undefined),
});

export const ReportSchema = z.object({
    id: z.number().optional(),
    report_number: z.union([z.number(), z.string()]).optional(),
    clientId: z.number().optional().nullable().transform(v => v ?? undefined),
    equipmentId: z.number().optional().nullable().transform(v => v ?? undefined),
    scheduleId: z.number().optional().nullable().transform(v => v ?? undefined),
    technicians: z.array(z.union([z.string(), TechnicianSchema])).default([]).transform(val =>
        val.map(t => typeof t === 'string' ? { id: '', name: t } : t)
    ),
    serviceDate: z.string().optional().nullable().transform(v => v ?? ''),
    hours: z.number().optional().nullable().transform(v => v ?? 0),
    parts: z.array(PartItemSchema).default([]),
    description: z.string().optional().nullable().transform(v => v ?? ''),
    serviceType: z.array(z.string()).default([]),
    damage: z.string().optional().nullable().transform(v => v ?? undefined),
    internalNotes: z.string().optional().nullable().transform(v => v ?? undefined),
    signature: z.string().optional().nullable().transform(v => v ?? undefined),
    technician_signature: z.string().optional().nullable().transform(v => v ?? undefined),
    includes_travel: z.boolean().optional().nullable().transform(v => v ?? undefined),
    classification: z.nativeEnum(ServiceClassification).optional().nullable().transform(v => v ?? undefined),
    clientName: z.string().optional().nullable().transform(v => v ?? undefined),
    clientAddress: z.string().optional().nullable().transform(v => v ?? undefined),
    clientNif: z.string().optional().nullable().transform(v => v ?? undefined),
    equipmentBrand: z.string().optional().nullable().transform(v => v ?? undefined),
    equipmentModel: z.string().optional().nullable().transform(v => v ?? undefined),
    equipmentSerialNumber: z.string().optional().nullable().transform(v => v ?? undefined),
    timeBlocks: z.array(TimeBlockSchema).optional().nullable().transform(v => v ?? undefined),
    billing_status: z.nativeEnum(BillingStatus).optional().nullable().transform(v => v ?? undefined),
});

export const BillingTaskSchema = z.object({
    id: z.number(),
    report_id: z.number(),
    status: z.nativeEnum(BillingStatus),
    assigned_role: z.string().optional().nullable().transform(v => v ?? ''),
    notes: z.string().optional().nullable().transform(v => v ?? undefined),
    billing_notes: z.string().optional().nullable().transform(v => v ?? undefined),
    invoice_number: z.string().optional().nullable().transform(v => v ?? undefined),
    billed_at: z.string().optional().nullable().transform(v => v ?? undefined),
    created_at: z.string(),
    updated_at: z.string(),
    reports: ReportSchema.optional().nullable().transform(v => v ?? undefined),
});

export const DashboardStatsSchema = z.object({
    tickets: z.object({
        open: z.number(),
        scheduled: z.number(),
        closed: z.number(),
    }),
    weekly: z.object({
        total: z.number(),
        completed: z.number(),
        withReport: z.number(),
        overdue: z.number().optional(),
    }),
    overdue: z.number(),
    pendingReports: z.object({
        total: z.number(),
        completed: z.number(),
        overdue: z.number(),
    }),
    tasks: z.object({
        total: z.number(),
        completed: z.number(),
        pending: z.number(),
    }),
});

export const AttachmentSchema = z.object({
    id: z.string(),
    ticket_id: z.number(),
    file_name: z.string(),
    mime_type: z.string(),
    storage_path: z.string(),
    uploaded_by_user_id: z.string(),
    created_at: z.string(),
    url: z.string(),
});

export const TicketResponseSchema = z.object({
    id: z.number(),
    ticket_id: z.number(),
    user_id: z.string().optional().nullable().transform(v => v ?? undefined),
    technician_id: z.string().optional().nullable().transform(v => v ?? undefined),
    authorName: z.string().optional().nullable().transform(v => v ?? undefined),
    message: z.string(),
    created_at: z.string(),
    role: z.string().optional().nullable().transform(v => v ?? undefined),
    authorId: z.string().optional().nullable().transform(v => v ?? undefined),
    isNew: z.boolean().optional(),
});

export const DetailedTicketSchema = TicketSchema.extend({
    clientName: z.string().optional().nullable().transform(v => v ?? ''),
    equipmentInfo: z.string().optional().nullable().transform(v => v ?? ''),
    userFirstName: z.string().optional().nullable().transform(v => v ?? ''),
    userLastName: z.string().optional().nullable().transform(v => v ?? ''),
    attachments: z.array(AttachmentSchema).default([]),
    responses: z.array(TicketResponseSchema).default([]),
    assigned_to_user_id: z.string().optional().nullable().transform(v => v ?? undefined),
    assigned_to_user_name: z.string().optional().nullable().transform(v => v ?? undefined),
});
