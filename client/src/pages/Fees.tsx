import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, CreditCard, Receipt as ReceiptIcon } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Table } from '@/components/Table';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { Badge } from '@/components/Badge';
import { Modal } from '@/components/Modal';
import { useToast } from '@/hooks/useToast';
import { feeService } from '@/services/feeService';
import type { Fee, PaginatedResult } from '@/types';

const createFeeSchema = z.object({
  student_id: z.coerce.number().int().positive('Student ID is required'),
  fee_type: z.string().min(1, 'Fee type is required'),
  academic_period: z.string().min(1, 'Academic period is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  due_date: z.string().min(1, 'Due date is required'),
});

const recordPaymentSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  payment_method: z.enum(['CASH', 'BANK_TRANSFER', 'UPI', 'OTHER']),
  transaction_reference: z.string().optional(),
  notes: z.string().optional(),
});

type CreateFeeForm = z.infer<typeof createFeeSchema>;
type RecordPaymentForm = z.infer<typeof recordPaymentSchema>;

export function Fees() {
  const [data, setData] = useState<PaginatedResult<Fee> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [studentId, setStudentId] = useState('');
  const [status, setStatus] = useState('');
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const [paymentFee, setPaymentFee] = useState<Fee | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();

  const { register: registerCreate, handleSubmit: handleSubmitCreate, formState: { errors: createErrors, isSubmitting: isCreating }, reset: resetCreate } = useForm<CreateFeeForm>({
    resolver: zodResolver(createFeeSchema),
  });

  const { register: registerPayment, handleSubmit: handleSubmitPayment, formState: { errors: paymentErrors, isSubmitting: isPaying }, reset: resetPayment } = useForm<RecordPaymentForm>({
    resolver: zodResolver(recordPaymentSchema),
  });

  const fetchFees = async () => {
    setLoading(true);
    try {
      const result = await feeService.getFees({
        page,
        limit: 10,
        student_id: studentId ? parseInt(studentId) : undefined,
        status: status || undefined,
      });
      setData(result);
    } catch (err: any) {
      toast({
        title: 'Error fetching fees',
        description: err.response?.data?.message || 'Something went wrong',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFees();
  }, [page, studentId, status]);

  const handleCreate = async (data: CreateFeeForm) => {
    try {
      await feeService.createFee(data);
      toast({ title: 'Fee created successfully', type: 'success' });
      setIsCreateModalOpen(false);
      resetCreate();
      fetchFees();
    } catch (err: any) {
      toast({
        title: 'Error creating fee',
        description: err.response?.data?.message || 'Something went wrong',
        type: 'error',
      });
    }
  };

  const handlePayment = async (data: RecordPaymentForm) => {
    if (!paymentFee) return;
    try {
      const payment = await feeService.recordPayment(paymentFee.id, data);
      toast({ title: 'Payment recorded successfully', type: 'success' });
      setIsPaymentModalOpen(false);
      resetPayment();
      fetchFees();
      
      // Navigate to receipt
      navigate(`/app/fees/receipt/${payment.id}`);
    } catch (err: any) {
      toast({
        title: 'Payment failed',
        description: err.response?.data?.message || 'Something went wrong',
        type: 'error',
      });
    }
  };

  const openPaymentModal = (fee: Fee) => {
    setPaymentFee(fee);
    resetPayment({ amount: parseFloat(fee.outstanding_amount || '0') });
    setIsPaymentModalOpen(true);
  };

  const columns = [
    { header: 'ID', accessor: (fee: Fee) => fee.id },
    { header: 'Student ID', accessor: (fee: Fee) => fee.student_id },
    { header: 'Type', accessor: (fee: Fee) => fee.fee_type },
    { header: 'Period', accessor: (fee: Fee) => fee.academic_period },
    { header: 'Amount', accessor: (fee: Fee) => `₹${parseFloat(fee.amount).toFixed(2)}` },
    { header: 'Outstanding', accessor: (fee: Fee) => <span className="font-semibold">₹{parseFloat(fee.outstanding_amount || '0').toFixed(2)}</span> },
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
    {
      header: 'Actions',
      accessor: (fee: Fee) => (
        <Button 
          size="sm" 
          variant="outline" 
          disabled={fee.status === 'PAID'}
          onClick={() => openPaymentModal(fee)}
        >
          <CreditCard size={16} className="mr-2" /> Pay
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Fees & Payments" 
        description="Manage student fees and record payments."
        actions={
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={20} className="mr-2" /> Add Fee
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="relative flex-1">
          <Input
            type="number"
            placeholder="Search by System Student ID..."
            value={studentId}
            onChange={(e) => { setStudentId(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select 
            value={status} 
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            options={[
              { value: "", label: "All Statuses" },
              { value: "PENDING", label: "Pending" },
              { value: "PARTIALLY_PAID", label: "Partially Paid" },
              { value: "PAID", label: "Fully Paid" },
              { value: "OVERDUE", label: "Overdue" },
            ]}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <Table keyExtractor={(row: any) => row.id || Math.random().toString()}
          columns={columns}
          data={data?.items || []}
          loading={loading}
          emptyMessage="No fees found."
        />
        {data && data.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100">
            <Pagination
              page={data.page}
              total={data.total} limit={data.limit} totalPages={data.totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Create Fee Modal */}
      <Modal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Fee"
      >
        <form onSubmit={handleSubmitCreate(handleCreate)} className="space-y-4">
          <Input label="Student System ID" type="number" {...registerCreate('student_id')} error={createErrors.student_id?.message} />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Fee Type" placeholder="e.g. Hostel Rent" {...registerCreate('fee_type')} error={createErrors.fee_type?.message} />
            <Input label="Academic Period" placeholder="e.g. 2026-Fall" {...registerCreate('academic_period')} error={createErrors.academic_period?.message} />
            <Input label="Amount (₹)" type="number" step="0.01" {...registerCreate('amount')} error={createErrors.amount?.message} />
            <Input label="Due Date" type="date" {...registerCreate('due_date')} error={createErrors.due_date?.message} />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isCreating}>
              Create Fee
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        open={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`Record Payment`}
      >
        <div className="mb-6 p-4 bg-slate-50 border border-slate-100 rounded-lg flex items-center gap-4">
          <ReceiptIcon className="text-primary-500" size={24} />
          <div>
            <p className="text-sm font-medium text-slate-900">{paymentFee?.fee_type} ({paymentFee?.academic_period})</p>
            <p className="text-sm text-slate-500">
              Outstanding: <span className="font-semibold text-red-600">₹{parseFloat(paymentFee?.outstanding_amount || '0').toFixed(2)}</span>
            </p>
          </div>
        </div>
        
        <form onSubmit={handleSubmitPayment(handlePayment)} className="space-y-4">
          <Input 
            label="Payment Amount (₹)" 
            type="number"
            step="0.01"
            max={paymentFee?.outstanding_amount}
            {...registerPayment('amount')} 
            error={paymentErrors.amount?.message} 
          />
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Payment Method</label>
            <Select 
              {...registerPayment('payment_method')} 
              error={paymentErrors.payment_method?.message}
              options={[
                { value: "CASH", label: "Cash" },
                { value: "BANK_TRANSFER", label: "Bank Transfer" },
                { value: "UPI", label: "UPI" },
                { value: "OTHER", label: "Other" },
              ]}
            />
          </div>

          <Input 
            label="Transaction Reference (Optional)" 
            placeholder="e.g. UTR Number"
            {...registerPayment('transaction_reference')} 
            error={paymentErrors.transaction_reference?.message} 
          />
          
          <Input 
            label="Notes (Optional)" 
            {...registerPayment('notes')} 
            error={paymentErrors.notes?.message} 
          />

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isPaying}>
              Record Payment
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
