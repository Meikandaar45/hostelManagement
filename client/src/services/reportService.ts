import api from '@/lib/axios';

export interface PaginatedReport<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const reportService = {
  getStudents: async (params?: Record<string, any>) => {
    const res = await api.get<{ success: boolean; data: PaginatedReport<any> }>('/reports/students', { params });
    return res.data.data;
  },
  getRooms: async (params?: Record<string, any>) => {
    const res = await api.get<{ success: boolean; data: PaginatedReport<any> }>('/reports/rooms', { params });
    return res.data.data;
  },
  getFees: async (params?: Record<string, any>) => {
    const res = await api.get<{ success: boolean; data: PaginatedReport<any> }>('/reports/fees', { params });
    return res.data.data;
  },
  getPayments: async (params?: Record<string, any>) => {
    const res = await api.get<{ success: boolean; data: PaginatedReport<any> }>('/reports/payments', { params });
    return res.data.data;
  },
  getComplaints: async (params?: Record<string, any>) => {
    const res = await api.get<{ success: boolean; data: PaginatedReport<any> }>('/reports/complaints', { params });
    return res.data.data;
  },
  getLeave: async (params?: Record<string, any>) => {
    const res = await api.get<{ success: boolean; data: PaginatedReport<any> }>('/reports/leave', { params });
    return res.data.data;
  },
  getVisitors: async (params?: Record<string, any>) => {
    const res = await api.get<{ success: boolean; data: PaginatedReport<any> }>('/reports/visitors', { params });
    return res.data.data;
  },
};
