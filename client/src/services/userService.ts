import api from '@/lib/axios';
import type { User, PaginatedResult } from '@/types';
import type { Role } from '@/types';

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: Role;
  is_active?: 'true' | 'false';
}

export const userService = {
  async list(params: ListUsersParams = {}): Promise<PaginatedResult<User>> {
    const res = await api.get('/users', { params });
    return res.data.data;
  },

  async get(id: number): Promise<User> {
    const res = await api.get(`/users/${id}`);
    return res.data.data.user;
  },

  async create(data: {
    full_name: string;
    username: string;
    email: string;
    role: Role;
    password: string;
  }): Promise<User> {
    const res = await api.post('/users', data);
    return res.data.data.user;
  },

  async update(
    id: number,
    data: Partial<{ full_name: string; username: string; email: string; role: Role }>
  ): Promise<User> {
    const res = await api.patch(`/users/${id}`, data);
    return res.data.data.user;
  },

  async setStatus(id: number, is_active: boolean): Promise<User> {
    const res = await api.patch(`/users/${id}/status`, { is_active });
    return res.data.data.user;
  },
};
