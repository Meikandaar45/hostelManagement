import api from '@/lib/axios';
import type { User } from '@/types';

export const authService = {
  async getSetupStatus(): Promise<{ completed: boolean }> {
    const res = await api.get('/auth/setup-status');
    return res.data.data;
  },

  async setup(data: {
    full_name: string;
    username: string;
    email: string;
    password: string;
    confirm_password: string;
  }): Promise<{ user: User }> {
    const res = await api.post('/auth/setup', data);
    return res.data.data;
  },

  async login(identifier: string, password: string): Promise<{ user: User }> {
    const res = await api.post('/auth/login', { identifier, password });
    return res.data.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
      }
    }
  },

  async me(): Promise<{ user: User }> {
    const res = await api.get('/auth/me');
    return res.data.data;
  },

  async forgotPassword(identifier: string): Promise<{ message: string }> {
    const res = await api.post('/auth/forgot-password', { identifier });
    return res.data.data;
  },

  async resetPassword(token: string, password: string, confirm_password: string): Promise<{ message: string }> {
    const res = await api.post('/auth/reset-password', { token, password, confirm_password });
    return res.data.data;
  },

  async changePassword(current_password: string, new_password: string, confirm_password: string): Promise<{ message: string }> {
    const res = await api.post('/auth/change-password', { current_password, new_password, confirm_password });
    return res.data.data;
  },
};
