import api from '@/lib/axios';
import type { Complaint, ComplaintHistory, PaginatedResult } from '@/types';

export interface CreateComplaintPayload {
  category: string;
  description: string;
  priority?: string;
  room_id?: number;
}

export const complaintService = {
  getComplaints: async (params?: Record<string, any>) => {
    const res = await api.get<{ data: PaginatedResult<Complaint> }>('/complaints', { params });
    return res.data.data;
  },

  getComplaint: async (id: number) => {
    const res = await api.get<{ data: { complaint: Complaint; history: ComplaintHistory[] } }>(
      `/complaints/${id}`
    );
    return res.data.data;
  },

  createComplaint: async (data: CreateComplaintPayload) => {
    const res = await api.post<{ data: { complaint: Complaint } }>('/complaints', data);
    return res.data.data.complaint;
  },

  assignComplaint: async (id: number, assignedTo: number) => {
    const res = await api.post<{ message: string }>(`/complaints/${id}/assign`, {
      assigned_to: assignedTo,
    });
    return res.data;
  },

  updateStatus: async (id: number, status: string, workNotes?: string) => {
    const res = await api.patch<{ message: string }>(`/complaints/${id}/status`, {
      status,
      work_notes: workNotes,
    });
    return res.data;
  },

  getHistory: async (id: number) => {
    const res = await api.get<{ data: { history: ComplaintHistory[] } }>(`/complaints/${id}/history`);
    return res.data.data.history;
  },

  getMyTasks: async (params?: Record<string, any>) => {
    const res = await api.get<{ data: PaginatedResult<Complaint> }>('/my-tasks', { params });
    return res.data.data;
  },
};
