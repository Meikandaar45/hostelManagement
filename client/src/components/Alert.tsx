import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

type AlertVariant = 'success' | 'error' | 'info' | 'warning' | 'danger';

const styles: Record<AlertVariant, { container: string; icon: string; Icon: typeof Info }> = {
  success: { container: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300', icon: 'text-emerald-400', Icon: CheckCircle },
  error:   { container: 'bg-red-500/10 border-red-500/30 text-red-300',             icon: 'text-red-400',     Icon: AlertCircle },
  danger:  { container: 'bg-red-500/10 border-red-500/30 text-red-300',             icon: 'text-red-400',     Icon: AlertCircle },
  info:    { container: 'bg-blue-500/10 border-blue-500/30 text-blue-300',           icon: 'text-blue-400',    Icon: Info },
  warning: { container: 'bg-amber-500/10 border-amber-500/30 text-amber-300',        icon: 'text-amber-400',   Icon: AlertTriangle },
};

interface AlertProps {
  variant?: AlertVariant;
  children: ReactNode;
  className?: string;
}

export function Alert({ variant = 'info', children, className = '' }: AlertProps) {
  const { container, icon, Icon } = styles[variant];
  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border text-sm ${container} ${className}`}>
      <Icon size={16} className={`mt-0.5 shrink-0 ${icon}`} />
      <div>{children}</div>
    </div>
  );
}
