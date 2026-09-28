import api from '@/lib/axios';
import type { Room, PaginatedResult } from '../types';

export const roomService = {
  getRooms: async (params?: Record<string, any>) => {
    const response = await api.get<{ data: PaginatedResult<Room> }>('/rooms', { params });
    return response.data.data;
  },

  getRoom: async (id: number) => {
    const response = await api.get<{ data: { room: Room } }>(`/rooms/${id}`);
    return response.data.data.room;
  },

  createRoom: async (data: any) => {
    const response = await api.post<{ data: { room: Room } }>('/rooms', data);
    return response.data.data.room;
  },

  allocateRoom: async (roomId: number, studentId: number) => {
    const response = await api.post(`/rooms/${roomId}/allocate`, { student_id: studentId });
    return response.data;
  },

  reallocateRoom: async (studentId: number, newRoomId: number) => {
    const response = await api.post('/rooms/reallocate', { student_id: studentId, new_room_id: newRoomId });
    return response.data;
  },

  updateRoom: async (id: number, data: any) => {
    const response = await api.patch<{ data: { room: Room } }>(`/rooms/${id}`, data);
    return response.data.data.room;
  },

  vacateRoom: async (studentId: number) => {
    const response = await api.post('/rooms/vacate', { student_id: studentId });
    return response.data;
  }
};
