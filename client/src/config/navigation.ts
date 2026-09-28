import {
  LayoutDashboard,
  Users,
  ScrollText,
  User,
  Home,
  BookOpen,
  MessageSquare,
  DoorOpen,
  Calendar,
  BarChart2,
  CreditCard,
  BedDouble,
  Wrench,
  Bell,
  CalendarCheck,
} from 'lucide-react';
import type { Role } from '@/types';
import type { ComponentType } from 'react';

export interface NavItem {
  label: string;
  path: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  allowedRoles: Role[];
  comingSoon?: boolean;
}

export const navigation: NavItem[] = [
  // Dashboard & Common
  {
    label: 'Dashboard',
    path: '/app/dashboard',
    icon: LayoutDashboard,
    allowedRoles: ['ADMIN', 'WARDEN', 'STUDENT', 'MAINTENANCE'],
  },
  {
    label: 'User Management',
    path: '/app/users',
    icon: Users,
    allowedRoles: ['ADMIN'],
  },
  {
    label: 'Audit Logs',
    path: '/app/audit',
    icon: ScrollText,
    allowedRoles: ['ADMIN'],
  },

  // Phase 2 Admin/Warden
  {
    label: 'Rooms',
    path: '/app/rooms',
    icon: Home,
    allowedRoles: ['ADMIN', 'WARDEN'],
  },
  {
    label: 'Students',
    path: '/app/students',
    icon: BookOpen,
    allowedRoles: ['ADMIN', 'WARDEN'],
  },
  {
    label: 'Fees',
    path: '/app/fees',
    icon: CreditCard,
    allowedRoles: ['ADMIN', 'WARDEN'],
  },

  // Phase 2 Student
  {
    label: 'My Room',
    path: '/app/my-room',
    icon: BedDouble,
    allowedRoles: ['STUDENT'],
  },
  {
    label: 'My Fees',
    path: '/app/my-fees',
    icon: CreditCard,
    allowedRoles: ['STUDENT'],
  },
  {
    label: 'My Profile',
    path: '/app/my-profile',
    icon: User,
    allowedRoles: ['STUDENT'],
  },

  // Phase 3 Features
  {
    label: 'Complaints',
    path: '/app/complaints',
    icon: MessageSquare,
    allowedRoles: ['ADMIN', 'WARDEN', 'STUDENT'],
  },
  {
    label: 'My Tasks',
    path: '/app/my-tasks',
    icon: Wrench,
    allowedRoles: ['MAINTENANCE'],
  },
  {
    label: 'Visitors',
    path: '/app/visitors',
    icon: DoorOpen,
    allowedRoles: ['ADMIN', 'WARDEN', 'STUDENT'],
  },
  {
    label: 'Leave & Gate Pass',
    path: '/app/leave',
    icon: Calendar,
    allowedRoles: ['STUDENT'],
  },
  {
    label: 'Leave Approvals',
    path: '/app/leave/requests',
    icon: CalendarCheck,
    allowedRoles: ['ADMIN', 'WARDEN'],
  },
  {
    label: 'Notifications',
    path: '/app/notifications',
    icon: Bell,
    allowedRoles: ['ADMIN', 'WARDEN', 'STUDENT', 'MAINTENANCE'],
  },
  {
    label: 'Profile',
    path: '/app/profile',
    icon: User,
    allowedRoles: ['ADMIN', 'WARDEN', 'MAINTENANCE'],
  },

  // Phase 4
  {
    label: 'Reports',
    path: '/app/reports',
    icon: BarChart2,
    allowedRoles: ['ADMIN', 'WARDEN'],
  },
];

export function getNavForRole(role: Role): NavItem[] {
  return navigation.filter((item) => item.allowedRoles.includes(role));
}
