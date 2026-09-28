import type { ReactNode } from 'react';
import { LoadingState } from './LoadingState';
import { EmptyState } from './EmptyState';
import { Pagination } from './Pagination';

export interface Column<T> {
  header: string;
  accessor: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string | number;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
    limit: number;
    onPageChange: (page: number) => void;
  };
}

export function Table<T>({
  data,
  columns,
  keyExtractor,
  loading,
  emptyMessage = 'No records found',
  emptyIcon,
  pagination,
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
        <LoadingState text="Loading data..." />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
        <EmptyState title="No Data" description={emptyMessage} icon={emptyIcon} />
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/80">
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`px-4 py-3 text-xs font-semibold text-slate-300 uppercase tracking-wider ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {data.map((row) => (
              <tr key={keyExtractor(row)} className="hover:bg-slate-700/30 transition-colors">
                {columns.map((col, i) => (
                  <td key={i} className={`px-4 py-3 text-sm text-slate-200 ${col.className || ''}`}>
                    {col.accessor(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination && <Pagination {...pagination} />}
    </div>
  );
}
