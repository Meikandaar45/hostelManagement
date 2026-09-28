import { z } from 'zod';
import { ALL_ROLES } from '../config/permissions.js';

const usernameField = z
  .string()
  .min(3)
  .max(50)
  .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers and underscores')
  .trim();

const passwordField = z
  .string()
  .min(8)
  .max(128)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const createUserSchema = z.object({
  full_name: z.string().min(2).max(150).trim(),
  username: usernameField,
  email: z.string().email().max(255).toLowerCase().trim(),
  role: z.enum(ALL_ROLES as [string, ...string[]]),
  password: passwordField,
});

export const updateUserSchema = z.object({
  full_name: z.string().min(2).max(150).trim().optional(),
  username: usernameField.optional(),
  email: z.string().email().max(255).toLowerCase().trim().optional(),
  role: z.enum(ALL_ROLES as [string, ...string[]]).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'At least one field is required' });

export const updateStatusSchema = z.object({
  is_active: z.boolean(),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.enum(ALL_ROLES as [string, ...string[]]).optional(),
  is_active: z.enum(['true', 'false']).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
