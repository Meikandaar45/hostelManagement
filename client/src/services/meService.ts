import api from '@/lib/axios';
import type { RoomAllocation, PaginatedResult, Fee } from '../types';

export const meService = {
  getMyProfile: async () => {
    const response = await api.get<{ data: { profile: any } }>('/me/profile');
    return response.data.data.profile;
  },

  getMyRoom: async () => {
    const response = await api.get<{ data: { allocation: RoomAllocation | null } }>('/me/room');
    return response.data.data.allocation;
  },

  getMyFees: async () => {
    const response = await api.get<{ data: PaginatedResult<Fee> }>('/me/fees');
    return response.data.data;
  }
};
