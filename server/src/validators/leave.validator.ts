import { z } from 'zod';

export const LEAVE_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'COMPLETED',
] as const;

export const createLeaveSchema = z
  .object({
    from_datetime: z.string().min(1, 'Departure date and time is required'),
    to_datetime: z.string().min(1, 'Return date and time is required'),
    reason: z
      .string()
      .min(5, 'Reason must be at least 5 characters')
      .max(1000, 'Reason cannot exceed 1000 characters')
      .trim(),
  })
  .refine(
    (data) => {
      const from = new Date(data.from_datetime);
      const to = new Date(data.to_datetime);
      return !isNaN(from.getTime()) && !isNaN(to.getTime()) && from < to;
    },
    {
      message: 'Return date and time must be later than departure date and time',
      path: ['to_datetime'],
    }
  );

export const approveLeaveSchema = z.object({
  review_notes: z.string().max(1000).trim().optional(),
});

export const rejectLeaveSchema = z.object({
  review_notes: z
    .string()
    .min(3, 'Rejection reason is required')
    .max(1000)
    .trim(),
});

export const listLeaveQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(LEAVE_STATUSES).optional(),
  student_id: z.coerce.number().int().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
});

export type CreateLeaveInput = z.infer<typeof createLeaveSchema>;
export type ApproveLeaveInput = z.infer<typeof approveLeaveSchema>;
export type RejectLeaveInput = z.infer<typeof rejectLeaveSchema>;
export type ListLeaveQuery = z.infer<typeof listLeaveQuerySchema>;
