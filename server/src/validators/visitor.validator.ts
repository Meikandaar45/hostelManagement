import { z } from 'zod';

export const createVisitorSchema = z.object({
  visitor_name: z.string().min(2, 'Visitor name must be at least 2 characters').max(150).trim(),
  phone: z.string().min(5, 'Valid phone number required').max(20).trim(),
  student_id: z.number().int().positive('Student ID is required'),
  purpose: z.string().min(2, 'Purpose must be specified').max(255).trim(),
  notes: z.string().trim().optional(),
});

export const listVisitorsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  student_id: z.coerce.number().int().optional(),
  date: z.string().optional(),
  status: z.enum(['INSIDE', 'EXITED']).optional(),
});

export type CreateVisitorInput = z.infer<typeof createVisitorSchema>;
export type ListVisitorsQuery = z.infer<typeof listVisitorsQuerySchema>;
