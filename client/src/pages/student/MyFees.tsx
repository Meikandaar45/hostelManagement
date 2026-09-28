import { useState, useEffect } from 'react';

import { Info } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Table } from '@/components/Table';
import { Badge } from '@/components/Badge';
import { meService } from '@/services/meService';
import type { Fee, PaginatedResult } from '@/types';
import { useToast } from '@/hooks/useToast';

export function MyFees() {
  const [data, setData] = useState<PaginatedResult<Fee> | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchFees = async () => {
      try {
        const result = await meService.getMyFees();
        setData(result);
      } catch (err) {
        toast({ title: 'Error', description: 'Could not load fees', type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchFees();
  }, []);

  const columns = [
    { header: 'Type', accessor: (fee: Fee) => fee.fee_type },
    { header: 'Period', accessor: (fee: Fee) => fee.academic_period },
    { header: 'Amount', accessor: (fee: Fee) => `₹${parseFloat(fee.amount).toFixed(2)}` },
    { header: 'Outstanding', accessor: (fee: Fee) => <span className="font-semibold text-slate-900">₹{parseFloat(fee.outstanding_amount || '0').toFixed(2)}</span> },
    { header: 'Due Date', accessor: (fee: Fee) => new Date(fee.due_date).toLocaleDateString() },
    { 
      header: 'Status', 
      accessor: (fee: Fee) => {
        const variants: Record<string, 'success'|'warning'|'danger'|'default'> = {
          PAID: 'success',
          PENDING: 'default',
          PARTIALLY_PAID: 'warning',
          OVERDUE: 'danger'
        };
        return <Badge variant={variants[fee.status!]}>{fee.status?.replace('_', ' ')}</Badge>;
      } 
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader 
        title="My Fees" 
        description="View your fee structures and payment status."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500 mb-1">Total Outstanding</p>
          <p className="text-2xl font-bold text-red-600">
            ₹{data?.items.reduce((sum, f) => sum + parseFloat(f.outstanding_amount || '0'), 0).toFixed(2) || '0.00'}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500 mb-1">Total Paid</p>
          <p className="text-2xl font-bold text-success-600">
            ₹{data?.items.reduce((sum, f) => sum + parseFloat(f.paid_amount || '0'), 0).toFixed(2) || '0.00'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <Table keyExtractor={(row: any) => row.id || Math.random().toString()}
          columns={columns}
          data={data?.items || []}
          loading={loading}
          emptyMessage="No fees assigned yet."
        />
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
        <Info className="text-blue-500 shrink-0 mt-0.5" size={20} />
        <div>
          <h4 className="text-sm font-semibold text-blue-900">How to pay?</h4>
          <p className="text-sm text-blue-700 mt-1">
            Online payment is currently under development. Please visit the hostel office or warden to pay via Cash, UPI, or Bank Transfer and get a receipt generated on your account.
          </p>
        </div>
      </div>
    </div>
  );
}
