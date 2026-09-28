import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Plus,
  XCircle,
  FileCheck2,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Table, type Column } from '@/components/Table';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { StatusBadge } from '@/components/Badge';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { leaveService } from '@/services/leaveService';
import type { LeaveRequest, PaginatedResult } from '@/types';

const leaveSchema = z
  .object({
    from_datetime: z.string().min(1, 'Departure date and time is required'),
    to_datetime: z.string().min(1, 'Return date and time is required'),
    reason: z.string().min(5, 'Reason must be at least 5 characters'),
  })
  .refine((data) => new Date(data.to_datetime) > new Date(data.from_datetime), {
    message: 'Return date/time must be strictly after departure date/time',
    path: ['to_datetime'],
  });

type LeaveForm = z.infer<typeof leaveSchema>;

export function StudentLeave() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState<PaginatedResult<LeaveRequest> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Apply Modal
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  // Cancel Dialog
  const [cancelTarget, setCancelTarget] = useState<LeaveRequest | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<LeaveForm>({
    resolver: zodResolver(leaveSchema),
  });

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await leaveService.getLeaveRequests({
        page,
        limit: 10,
      });
      setData(res);
    } catch (err: any) {
      toast({
        title: 'Error loading leave requests',
        description: err.response?.data?.message || 'Could not fetch leave history',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [page]);

  const handleApply = async (formData: LeaveForm) => {
    try {
      await leaveService.submitLeave({
        from_datetime: new Date(formData.from_datetime).toISOString(),
        to_datetime: new Date(formData.to_datetime).toISOString(),
        reason: formData.reason,
      });
      toast({ title: 'Leave request submitted successfully', type: 'success' });
      setIsApplyModalOpen(false);
      reset();
      fetchLeaves();
    } catch (err: any) {
      toast({
        title: 'Failed to submit leave request',
        description: err.response?.data?.message || 'Something went wrong',
        type: 'error',
      });
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;

    setIsCancelling(true);
    try {
      await leaveService.cancelLeave(cancelTarget.id);
      toast({ title: 'Leave request cancelled', type: 'success' });
      setCancelTarget(null);
      fetchLeaves();
    } catch (err: any) {
      toast({
        title: 'Failed to cancel leave',
        description: err.response?.data?.message || 'Could not cancel request',
        type: 'error',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const columns: Column<LeaveRequest>[] = [
    {
      header: 'Dates',
      accessor: (l: LeaveRequest) => (
        <div className="text-xs">
          <div className="font-semibold text-slate-200">
            From: {new Date(l.from_datetime).toLocaleDateString()}{' '}
            <span className="text-slate-400">
              {new Date(l.from_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="text-slate-400">
            To: {new Date(l.to_datetime).toLocaleDateString()}{' '}
            <span className="text-slate-500">
              {new Date(l.to_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Reason',
      accessor: (l: LeaveRequest) => (
        <div className="max-w-xs">
          <p className="text-sm text-slate-300 truncate" title={l.reason}>
            {l.reason}
          </p>
          {l.review_notes && (
            <p className="text-xs text-amber-400/90 mt-0.5 italic">
              Note: {l.review_notes}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (l: LeaveRequest) => <StatusBadge status={l.status} />,
    },
    {
      header: 'Gate Pass',
      accessor: (l: LeaveRequest) =>
        l.status === 'APPROVED' && l.gate_pass_number ? (
          <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            {l.gate_pass_number}
          </span>
        ) : (
          <span className="text-xs text-slate-500 italic">Not issued</span>
        ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      accessor: (l: LeaveRequest) => (
        <div className="flex items-center justify-end gap-2">
          {l.status === 'APPROVED' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate(`/app/leave/gate-pass/${l.id}`)}
              className="text-xs flex items-center gap-1.5 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30"
            >
              <FileCheck2 size={14} />
              View Pass
            </Button>
          )}

          {l.status === 'PENDING' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCancelTarget(l)}
              className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-1"
            >
              <XCircle size={14} />
              Cancel
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Requests & Gate Pass"
        description="Submit leave requests to the warden and access your digital gate pass"
        actions={
          <Button onClick={() => setIsApplyModalOpen(true)} className="flex items-center gap-2">
            <Plus size={16} />
            Apply for Leave
          </Button>
        }
      />

      {/* Leave Requests Table */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
        <Table<LeaveRequest>
          loading={loading}
          data={data?.items || []}
          keyExtractor={(l) => l.id}
          emptyMessage="No leave requests found. Click 'Apply for Leave' to submit your first request."
          columns={columns}
        />

        {data && data.totalPages > 1 && (
          <div className="p-4 border-t border-slate-800">
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              limit={data.limit}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      <Modal
        open={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title="Apply for Hostel Leave"
      >
        <form onSubmit={handleSubmit(handleApply)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              type="datetime-local"
              label="Departure Date & Time"
              {...register('from_datetime')}
              error={errors.from_datetime?.message}
              required
            />

            <Input
              type="datetime-local"
              label="Expected Return Date & Time"
              {...register('to_datetime')}
              error={errors.to_datetime?.message}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Reason for Leave <span className="text-red-400">*</span>
            </label>
            <textarea
              {...register('reason')}
              rows={3}
              placeholder="Mention destination, purpose (e.g. visiting hometown for family emergency)..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.reason && (
              <p className="text-xs text-red-400 mt-1">{errors.reason.message}</p>
            )}
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-xs text-amber-300 flex items-start gap-2">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>
              Once submitted, your request will be reviewed by the hostel warden. You will receive a
              notification and an authorized Gate Pass upon approval.
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-700">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsApplyModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cancel Confirmation Dialog */}
      {cancelTarget && (
        <ConfirmDialog
          open={!!cancelTarget}
          onClose={() => setCancelTarget(null)}
          onConfirm={handleConfirmCancel}
          title="Cancel Leave Request"
          message="Are you sure you want to cancel this pending leave request?"
          confirmLabel="Yes, Cancel Request"
          loading={isCancelling}
          variant="danger"
        />
      )}
    </div>
  );
}
