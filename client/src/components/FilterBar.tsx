import type { ReactNode } from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface FilterBarProps {
  children: ReactNode;
  onReset?: () => void;
  className?: string;
}

export function FilterBar({ children, onReset, className = '' }: FilterBarProps) {
  return (
    <div
      className={`no-print bg-slate-800/80 backdrop-blur-sm border border-slate-700/80 rounded-xl p-4 shadow-sm space-y-3 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Filter size={14} className="text-indigo-400" />
          <span>Filters & Search</span>
        </div>
        {onReset && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-xs text-slate-400 hover:text-slate-200 h-7 px-2"
          >
            <RotateCcw size={12} className="mr-1" />
            Reset
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 items-end">
        {children}
      </div>
    </div>
  );
}
