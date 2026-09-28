import api from '@/lib/axios';
import type { VisitorLog, PaginatedResult } from '@/types';

export interface RecordVisitorPayload {
  visitor_name: string;
  phone: string;
  student_id: number;
  purpose: string;
  notes?: string;
}

export const visitorService = {
  getVisitors: async (params?: Record<string, any>) => {
    const res = await api.get<{ data: PaginatedResult<VisitorLog> }>('/visitors', { params });
    return res.data.data;
  },

  recordEntry: async (data: RecordVisitorPayload) => {
    const res = await api.post<{ data: { visitor: VisitorLog } }>('/visitors', data);
    return res.data.data.visitor;
  },

  recordExit: async (id: number) => {
    const res = await api.patch<{ message: string }>(`/visitors/${id}/exit`);
    return res.data;
  },
};
