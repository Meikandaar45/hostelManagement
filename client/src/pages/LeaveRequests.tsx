import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  XCircle,
  FileCheck2,
  Filter,
  Search,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Table, type Column } from '@/components/Table';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { StatusBadge } from '@/components/Badge';
import { Modal } from '@/components/Modal';
import { useToast } from '@/hooks/useToast';
import { leaveService } from '@/services/leaveService';
import type { LeaveRequest, PaginatedResult } from '@/types';

export function LeaveRequests() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState<PaginatedResult<LeaveRequest> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Approval Modal
  const [approveTarget, setApproveTarget] = useState<LeaveRequest | null>(null);
  const [approveNotes, setApproveNotes] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  // Rejection Modal
  const [rejectTarget, setRejectTarget] = useState<LeaveRequest | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const fetchLeaveRequests = async () => {
    setLoading(true);
    try {
      const res = await leaveService.getLeaveRequests({
        page,
        limit: 10,
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setData(res);
    } catch (err: any) {
      toast({
        title: 'Error fetching requests',
        description: err.response?.data?.message || 'Could not load leave requests',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveRequests();
  }, [page, statusFilter, search]);

  const handleConfirmApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveTarget) return;

    setIsApproving(true);
    try {
      await leaveService.approveLeave(approveTarget.id, approveNotes || undefined);
      toast({ title: 'Leave approved & Gate Pass generated!', type: 'success' });
      setApproveTarget(null);
      setApproveNotes('');
      fetchLeaveRequests();
    } catch (err: any) {
      toast({
        title: 'Approval failed',
        description: err.response?.data?.message || 'Something went wrong',
        type: 'error',
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget) return;

    if (!rejectNotes.trim()) {
      toast({
        title: 'Rejection reason required',
        description: 'Please specify the reason for rejecting this leave request.',
        type: 'error',
      });
      return;
    }

    setIsRejecting(true);
    try {
      await leaveService.rejectLeave(rejectTarget.id, rejectNotes.trim());
      toast({ title: 'Leave request rejected', type: 'success' });
      setRejectTarget(null);
      setRejectNotes('');
      fetchLeaveRequests();
    } catch (err: any) {
      toast({
        title: 'Rejection failed',
        description: err.response?.data?.message || 'Something went wrong',
        type: 'error',
      });
    } finally {
      setIsRejecting(false);
    }
  };

  const columns: Column<LeaveRequest>[] = [
    {
      header: 'Student & Room',
      accessor: (l: LeaveRequest) => (
        <div>
          <div className="font-semibold text-slate-200">{l.student_name || 'Student'}</div>
          <div className="text-xs text-slate-400">
            {l.student_number ? `${l.student_number} • ` : ''}Room {l.room_number || 'N/A'}
          </div>
        </div>
      ),
    },
    {
      header: 'Duration',
      accessor: (l: LeaveRequest) => (
        <div className="text-xs">
          <div className="text-slate-300">
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
            <p className="text-xs text-amber-400/90 italic mt-0.5">
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
          <span className="text-xs text-slate-500 italic">None</span>
        ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      accessor: (l: LeaveRequest) => (
        <div className="flex items-center justify-end gap-2">
          {l.status === 'PENDING' && (
            <>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setApproveTarget(l);
                  setApproveNotes('');
                }}
                className="text-xs flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500"
              >
                <CheckCircle size={13} />
                Approve
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setRejectTarget(l);
                  setRejectNotes('');
                }}
                className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-1"
              >
                <XCircle size={13} />
                Reject
              </Button>
            </>
          )}

          {l.status === 'APPROVED' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate(`/app/leave/gate-pass/${l.id}`)}
              className="text-xs flex items-center gap-1.5 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30"
            >
              <FileCheck2 size={13} />
              View Pass
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Approvals"
        description="Review student leave requests and issue digital gate passes"
      />

      {/* Filter Toolbar */}
      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input
            placeholder="Search student or reason..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Filter size={16} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-400">Status:</span>
          <div className="w-48">
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'PENDING', label: 'Pending Review' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'REJECTED', label: 'Rejected' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
        <Table<LeaveRequest>
          loading={loading}
          data={data?.items || []}
          keyExtractor={(l) => l.id}
          emptyMessage="No leave requests found"
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

      {/* Approval Modal */}
      <Modal
        open={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        title={approveTarget ? `Approve Leave: ${approveTarget.student_name || 'Student'}` : 'Approve Leave'}
      >
        {approveTarget && (
          <form onSubmit={handleConfirmApprove} className="space-y-4">
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-700 text-sm space-y-1">
              <div>
                <span className="text-slate-400">Duration: </span>
                <span className="text-slate-200">
                  {new Date(approveTarget.from_datetime).toLocaleDateString()} to{' '}
                  {new Date(approveTarget.to_datetime).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Reason: </span>
                <span className="text-slate-300">{approveTarget.reason}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Warden Approval Note (Optional)
              </label>
              <textarea
                rows={2}
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                placeholder="e.g. Approved. Must report back to warden office upon return."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-700">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setApproveTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={isApproving}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                Confirm Approval & Issue Pass
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Rejection Modal */}
      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title={rejectTarget ? `Reject Leave: ${rejectTarget.student_name || 'Student'}` : 'Reject Leave'}
      >
        {rejectTarget && (
          <form onSubmit={handleConfirmReject} className="space-y-4">
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-700 text-sm space-y-1">
              <div>
                <span className="text-slate-400">Reason Given: </span>
                <span className="text-slate-300">{rejectTarget.reason}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Reason for Rejection <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Explain why this request was declined (e.g., examination period, insufficient notice, parent permission pending)..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-700">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setRejectTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={isRejecting}
                className="bg-red-600 hover:bg-red-500"
              >
                Confirm Rejection
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
