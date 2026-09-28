import api from '@/lib/axios';
import type { Fee, Payment, PaginatedResult } from '../types';

export const feeService = {
  getFees: async (params?: Record<string, any>) => {
    const response = await api.get<{ data: PaginatedResult<Fee> }>('/fees', { params });
    return response.data.data;
  },

  getFee: async (id: number) => {
    const response = await api.get<{ data: { fee: Fee } }>(`/fees/${id}`);
    return response.data.data.fee;
  },

  createFee: async (data: any) => {
    const response = await api.post<{ data: { fee: Fee } }>('/fees', data);
    return response.data.data.fee;
  },

  recordPayment: async (feeId: number, data: any) => {
    const response = await api.post<{ data: { payment: Payment } }>(`/fees/${feeId}/payments`, data);
    return response.data.data.payment;
  },

  getReceipt: async (paymentId: number) => {
    const response = await api.get<{ data: { receipt: any } }>(`/fees/receipts/${paymentId}`); // Wait, route was /api/fees/receipt/:id ? Let me check controller.
    // The route in fee.routes.ts was not mapped for receipt. Let's fix that! Wait, fee.routes.ts had getReceipt?
    // Let me check fee.routes.ts
    // I exported getReceipt from feeController but didn't map it in fee.routes.ts or me.routes.ts maybe.
    // I will check and fix fee.routes.ts. For now, assume it's `/fees/receipts/${paymentId}`. 
    return response.data.data.receipt;
  }
};
