import api from '@/lib/axios';
import type { Student, PaginatedResult } from '../types';

export const studentService = {
  getStudents: async (params?: Record<string, any>) => {
    const response = await api.get<{ data: PaginatedResult<Student> }>('/students', { params });
    return response.data.data;
  },

  getStudent: async (id: number) => {
    const response = await api.get<{ data: { student: Student } }>(`/students/${id}`);
    return response.data.data.student;
  },

  createStudent: async (data: any) => {
    const response = await api.post<{ data: { student: Student } }>('/students', data);
    return response.data.data.student;
  },

  updateStudent: async (id: number, data: any) => {
    const response = await api.patch<{ data: { student: Student } }>(`/students/${id}`, data);
    return response.data.data.student;
  },

  setStatus: async (id: number, isActive: boolean) => {
    const response = await api.patch<{ data: { student: Student } }>(`/students/${id}/status`, { is_active: isActive });
    return response.data.data.student;
  }
};
