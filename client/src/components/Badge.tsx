import type { Role } from '@/types';

type BadgeVariant = 'success' | 'danger' | 'error' | 'warning' | 'info' | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30',
  danger:  'bg-red-500/20 text-red-400 ring-1 ring-red-500/30',
  error:   'bg-red-500/20 text-red-400 ring-1 ring-red-500/30',
  warning: 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30',
  info:    'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30',
  default: 'bg-slate-500/20 text-slate-400 ring-1 ring-slate-500/30',
};

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}

const roleVariants: Record<Role, BadgeVariant> = {
  ADMIN:       'danger',
  WARDEN:      'warning',
  STUDENT:     'info',
  MAINTENANCE: 'default',
};

export function RoleBadge({ role }: { role: Role }) {
  return <Badge variant={roleVariants[role]}>{role}</Badge>;
}

export interface StatusBadgeProps {
  status?: string;
  active?: boolean;
}

const statusVariants: Record<string, { label: string; variant: BadgeVariant }> = {
  // Complaint Statuses
  SUBMITTED:   { label: 'Submitted', variant: 'warning' },
  ASSIGNED:    { label: 'Assigned', variant: 'info' },
  IN_PROGRESS: { label: 'In Progress', variant: 'info' },
  RESOLVED:    { label: 'Resolved', variant: 'success' },
  CLOSED:      { label: 'Closed', variant: 'default' },

  // Leave Statuses
  PENDING:   { label: 'Pending', variant: 'warning' },
  APPROVED:  { label: 'Approved', variant: 'success' },
  REJECTED:  { label: 'Rejected', variant: 'danger' },
  CANCELLED: { label: 'Cancelled', variant: 'default' },
  COMPLETED: { label: 'Completed', variant: 'default' },

  // Visitor Statuses
  INSIDE: { label: 'Inside', variant: 'warning' },
  EXITED: { label: 'Exited', variant: 'default' },

  // Room Statuses
  AVAILABLE:          { label: 'Available', variant: 'success' },
  PARTIALLY_OCCUPIED: { label: 'Partially Occupied', variant: 'warning' },
  FULL:               { label: 'Full', variant: 'danger' },

  // Fee Statuses
  PARTIALLY_PAID: { label: 'Partially Paid', variant: 'warning' },
  PAID:           { label: 'Paid', variant: 'success' },
  OVERDUE:        { label: 'Overdue', variant: 'danger' },
};

export function StatusBadge({ status, active }: StatusBadgeProps) {
  if (active !== undefined) {
    return (
      <Badge variant={active ? 'success' : 'danger'}>
        {active ? 'Active' : 'Inactive'}
      </Badge>
    );
  }

  if (status && statusVariants[status]) {
    const config = statusVariants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  }

  return <Badge variant="default">{status || 'Unknown'}</Badge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  let variant: BadgeVariant = 'default';
  if (priority === 'URGENT') variant = 'danger';
  else if (priority === 'HIGH') variant = 'warning';
  else if (priority === 'MEDIUM') variant = 'info';
  else if (priority === 'LOW') variant = 'default';

  return <Badge variant={variant}>{priority}</Badge>;
}
