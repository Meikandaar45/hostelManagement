import api from '@/lib/axios';
import type { AuditLog, PaginatedResult } from '@/types';

export interface ListAuditParams {
  page?: number;
  limit?: number;
  search?: string;
  user_id?: string | number;
  action?: string;
  entity_type?: string;
  from?: string;
  to?: string;
}

export const auditService = {
  async list(params: ListAuditParams = {}): Promise<PaginatedResult<AuditLog>> {
    const res = await api.get('/audit-logs', { params });
    return res.data.data;
  },

  async getActions(): Promise<string[]> {
    const res = await api.get('/audit-logs/actions');
    return res.data.data;
  },
};
