import { z } from 'zod';

export const COMPLAINT_CATEGORIES = [
  'ELECTRICAL',
  'PLUMBING',
  'CARPENTRY',
  'CLEANING',
  'FURNITURE',
  'WATER',
  'INTERNET',
  'ROOM',
  'OTHER',
] as const;

export const COMPLAINT_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export const COMPLAINT_STATUSES = [
  'SUBMITTED',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
] as const;

export const createComplaintSchema = z.object({
  category: z.enum(COMPLAINT_CATEGORIES),
  description: z
    .string()
    .min(5, 'Description must be at least 5 characters')
    .max(2000, 'Description cannot exceed 2000 characters')
    .trim(),
  priority: z.enum(COMPLAINT_PRIORITIES).default('MEDIUM'),
  room_id: z.number().int().positive().optional(),
});

export const assignComplaintSchema = z.object({
  assigned_to: z.number().int().positive('Maintenance user ID is required'),
});

export const updateComplaintStatusSchema = z.object({
  status: z.enum(COMPLAINT_STATUSES),
  work_notes: z.string().trim().optional(),
});

export const listComplaintsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(COMPLAINT_STATUSES).optional(),
  category: z.enum(COMPLAINT_CATEGORIES).optional(),
  priority: z.enum(COMPLAINT_PRIORITIES).optional(),
  assigned_to: z.coerce.number().int().optional(),
  student_id: z.coerce.number().int().optional(),
});

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
export type AssignComplaintInput = z.infer<typeof assignComplaintSchema>;
export type UpdateComplaintStatusInput = z.infer<typeof updateComplaintStatusSchema>;
export type ListComplaintsQuery = z.infer<typeof listComplaintsQuerySchema>;
