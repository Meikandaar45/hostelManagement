import api from '@/lib/axios';

export const dashboardService = {
  getSummary: async () => {
    const response = await api.get<{ success: boolean; data: any }>('/dashboard/summary');
    return response.data.data;
  },
};
