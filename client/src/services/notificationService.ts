import api from '@/lib/axios';
import type { Notification, PaginatedResult } from '@/types';

export const notificationService = {
  getNotifications: async (params?: Record<string, any>) => {
    const res = await api.get<{ data: PaginatedResult<Notification> }>('/notifications', {
      params,
    });
    return res.data.data;
  },

  getUnreadCount: async () => {
    const res = await api.get<{ data: { unreadCount: number } }>('/notifications/unread-count');
    return res.data.data.unreadCount;
  },

  markAsRead: async (id: number) => {
    const res = await api.patch<{ message: string }>(`/notifications/${id}/read`);
    return res.data;
  },

  markAllAsRead: async () => {
    const res = await api.patch<{ message: string }>('/notifications/read-all');
    return res.data;
  },
};
