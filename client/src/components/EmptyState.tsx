import type { ReactNode } from 'react';
import { Database } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  actions?: ReactNode;
}

export function EmptyState({
  title,
  description,
  icon = <Database size={48} className="text-slate-600 mb-4" />,
  action,
  actions,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center min-h-[300px]">
      {icon}
      <h3 className="text-lg font-semibold text-slate-200 mb-1">{title}</h3>
      {description && <p className="text-slate-400 text-sm max-w-sm mb-6">{description}</p>}
      {(action || actions) && <div>{action || actions}</div>}
    </div>
  );
}
