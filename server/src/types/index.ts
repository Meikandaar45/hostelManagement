import type { Role } from '../config/permissions.js';

/** Augment Express Request to carry the authenticated user. */
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
}

export interface JwtPayload {
  sub: number;   // user id
  role: Role;
  iat?: number;
  exp?: number;
}

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string | string[]>;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==========================================
// Phase 2 Types
// ==========================================

export interface Student {
  id: number;
  user_id: number;
  student_id: string;
  full_name: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  contact_number: string;
  address: string;
  department: string;
  admission_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: number;
  room_number: string;
  block: string;
  floor: number;
  room_type: 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'DORMITORY';
  capacity: number;
  created_at: string;
  updated_at: string;
  // Derived fields
  current_occupancy?: number;
  status?: 'AVAILABLE' | 'PARTIALLY_OCCUPIED' | 'FULL';
}

export interface RoomAllocation {
  id: number;
  student_id: number;
  room_id: number;
  allocated_at: string;
  vacated_at: string | null;
  allocated_by: number;
  created_at: string;
  // Joined fields
  student_name?: string;
  student_number?: string;
  room_number?: string;
}

export interface Fee {
  id: number;
  student_id: number;
  fee_type: string;
  academic_period: string;
  amount: string; // DECIMAL(10,2) comes as string in mysql2 usually
  due_date: string;
  created_at: string;
  updated_at: string;
  // Derived fields
  paid_amount?: string;
  outstanding_amount?: string;
  status?: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
}

export interface Payment {
  id: number;
  fee_id: number;
  receipt_number: string;
  amount: string;
  payment_method: 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'OTHER';
  transaction_reference: string | null;
  paid_at: string;
  recorded_by: number;
  notes: string | null;
  created_at: string;
}

// ==========================================
// Phase 3 Types
// ==========================================

export type ComplaintCategory =
  | 'ELECTRICAL'
  | 'PLUMBING'
  | 'CARPENTRY'
  | 'CLEANING'
  | 'FURNITURE'
  | 'WATER'
  | 'INTERNET'
  | 'ROOM'
  | 'OTHER';

export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type ComplaintStatus =
  | 'SUBMITTED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED';

export interface Complaint {
  id: number;
  ticket_id: string;
  student_id: number;
  room_id: number;
  category: ComplaintCategory;
  description: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  assigned_to: number | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  // Joined fields
  student_name?: string;
  student_number?: string;
  room_number?: string;
  assigned_name?: string;
}

export interface ComplaintHistory {
  id: number;
  complaint_id: number;
  changed_by: number;
  from_status: ComplaintStatus | null;
  to_status: ComplaintStatus;
  work_notes: string | null;
  created_at: string;
  changer_name?: string;
}

export type VisitorStatus = 'INSIDE' | 'EXITED';

export interface VisitorLog {
  id: number;
  visitor_name: string;
  phone: string;
  student_id: number;
  purpose: string;
  entry_at: string;
  exit_at: string | null;
  recorded_by: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  student_name?: string;
  student_number?: string;
  recorded_by_name?: string;
  status?: VisitorStatus;
}

export type LeaveStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED';

export interface LeaveRequest {
  id: number;
  student_id: number;
  from_datetime: string;
  to_datetime: string;
  reason: string;
  status: LeaveStatus;
  review_notes: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  gate_pass_number: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  student_name?: string;
  student_number?: string;
  room_number?: string;
  reviewer_name?: string;
}

export interface GatePass {
  gate_pass_number: string;
  leave_id: number;
  hostel_name: string;
  student_name: string;
  student_id: string;
  room_number: string;
  from_datetime: string;
  to_datetime: string;
  reason: string;
  status: LeaveStatus;
  approved_by: string;
  approved_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  reference_type: string | null;
  reference_id: number | null;
  is_read: boolean;
  created_at: string;
}

