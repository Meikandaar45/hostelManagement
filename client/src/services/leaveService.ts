import api from '@/lib/axios';
import type { LeaveRequest, GatePass, PaginatedResult } from '@/types';

export interface SubmitLeavePayload {
  from_datetime: string;
  to_datetime: string;
  reason: string;
}

export const leaveService = {
  getLeaveRequests: async (params?: Record<string, any>) => {
    const res = await api.get<{ data: PaginatedResult<LeaveRequest> }>('/leave', { params });
    return res.data.data;
  },

  getLeaveRequest: async (id: number) => {
    const res = await api.get<{ data: { leave: LeaveRequest } }>(`/leave/${id}`);
    return res.data.data.leave;
  },

  submitLeave: async (data: SubmitLeavePayload) => {
    const res = await api.post<{ data: { leave: LeaveRequest } }>('/leave', data);
    return res.data.data.leave;
  },

  cancelLeave: async (id: number) => {
    const res = await api.patch<{ message: string }>(`/leave/${id}/cancel`);
    return res.data;
  },

  approveLeave: async (id: number, reviewNotes?: string) => {
    const res = await api.patch<{ message: string; data: { leave: LeaveRequest } }>(
      `/leave/${id}/approve`,
      { review_notes: reviewNotes }
    );
    return res.data.data.leave;
  },

  rejectLeave: async (id: number, reviewNotes: string) => {
    const res = await api.patch<{ message: string; data: { leave: LeaveRequest } }>(
      `/leave/${id}/reject`,
      { review_notes: reviewNotes }
    );
    return res.data.data.leave;
  },

  getGatePass: async (id: number) => {
    const res = await api.get<{ data: { gatePass: GatePass } }>(`/leave/${id}/gate-pass`);
    return res.data.data.gatePass;
  },
};
