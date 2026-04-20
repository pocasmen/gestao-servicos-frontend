import apiClient from '../apiClient';
import { BillingStatus, BillingTask } from '../types';
import { BillingTaskSchema } from '../schemas';

import logger from '../utils/logger';

export const getBillingTasks = async (params?: { startDate: string, endDate: string }): Promise<BillingTask[]> => {
    const { data } = await apiClient.get<unknown[]>('/api/billing/tasks', { params });
    return (data || []).map(item => {
        const result = BillingTaskSchema.safeParse(item);
        if (!result.success) {
            logger.error(result.error.format(), '[SCHEMA_ERROR] Billing task validation failed:');
            return item as BillingTask;
        }
        return result.data as BillingTask;
    });
};

export const getBillingStats = async (params?: { startDate: string, endDate: string }): Promise<{ total: number, pending_completion: number, report_issued: number, ready_for_billing: number, billed: number, needs_review: number }> => {
    const { data } = await apiClient.get<{ total: number, pending_completion: number, report_issued: number, ready_for_billing: number, billed: number, needs_review: number }>('/api/billing/stats', { params });
    return data;
};

export const updateBillingTaskStatus = async (taskId: number, status: BillingStatus, notes?: string, invoiceNumber?: string): Promise<BillingTask> => {
    const { data } = await apiClient.patch<unknown>(`/api/billing/tasks/${taskId}`, { status, billing_notes: notes, invoice_number: invoiceNumber });
    const result = BillingTaskSchema.safeParse(data);
    if (!result.success) {
        logger.error(result.error.format(), '[SCHEMA_ERROR] Billing task update validation failed:');
        return data as BillingTask;
    }
    return result.data as BillingTask;
};

export const deleteBillingTask = async (taskId: number): Promise<void> => {
    await apiClient.delete(`/api/billing/tasks/${taskId}`);
};
