import { useState, useEffect } from 'react';
import {
  Play,
  CheckCircle,
  Eye,
  Clock,
  Filter,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Table, type Column } from '@/components/Table';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/Button';
import { Select } from '@/components/Select';
import { StatusBadge, PriorityBadge } from '@/components/Badge';
import { Modal } from '@/components/Modal';
import { useToast } from '@/hooks/useToast';
import { complaintService } from '@/services/complaintService';
import type { Complaint, ComplaintHistory, PaginatedResult } from '@/types';

export function MyTasks() {
  const { toast } = useToast();
  const [data, setData] = useState<PaginatedResult<Complaint> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  // Resolve Modal
  const [resolveTaskTarget, setResolveTaskTarget] = useState<Complaint | null>(null);
  const [workNotes, setWorkNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  // Detail Modal
  const [selectedTask, setSelectedTask] = useState<Complaint | null>(null);
  const [history, setHistory] = useState<ComplaintHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await complaintService.getMyTasks({
        page,
        limit: 10,
        status: statusFilter || undefined,
      });
      setData(res);
    } catch (err: any) {
      toast({
        title: 'Error loading tasks',
        description: err.response?.data?.message || 'Could not fetch assigned tasks',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [page, statusFilter]);

  const handleStartWork = async (taskId: number) => {
    try {
      await complaintService.updateStatus(taskId, 'IN_PROGRESS');
      toast({ title: 'Task marked In Progress', type: 'success' });
      fetchTasks();
    } catch (err: any) {
      toast({
        title: 'Failed to update task',
        description: err.response?.data?.message || 'Could not start task',
        type: 'error',
      });
    }
  };

  const handleOpenResolve = (task: Complaint) => {
    setResolveTaskTarget(task);
    setWorkNotes('');
  };

  const handleConfirmResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveTaskTarget) return;

    if (!workNotes.trim()) {
      toast({
        title: 'Work notes required',
        description: 'Please explain what maintenance work was completed.',
        type: 'error',
      });
      return;
    }

    setIsResolving(true);
    try {
      await complaintService.updateStatus(resolveTaskTarget.id, 'RESOLVED', workNotes.trim());
      toast({ title: 'Task marked as Resolved!', type: 'success' });
      setResolveTaskTarget(null);
      setWorkNotes('');
      fetchTasks();
    } catch (err: any) {
      toast({
        title: 'Failed to resolve task',
        description: err.response?.data?.message || 'Could not update task status',
        type: 'error',
      });
    } finally {
      setIsResolving(false);
    }
  };

  const handleOpenDetail = async (task: Complaint) => {
    setSelectedTask(task);
    setIsDetailModalOpen(true);
    setLoadingHistory(true);
    try {
      const res = await complaintService.getHistory(task.id);
      setHistory(res);
    } catch (err: any) {
      toast({
        title: 'Error loading history',
        description: err.response?.data?.message || 'Could not load task history',
        type: 'error',
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  const columns: Column<Complaint>[] = [
    {
      header: 'Ticket ID',
      accessor: (t: Complaint) => (
        <span className="font-mono text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">
          {t.ticket_id}
        </span>
      ),
    },
    {
      header: 'Room & Student',
      accessor: (t: Complaint) => (
        <div>
          <div className="font-medium text-slate-200">
            {t.room_number ? `Room ${t.room_number}` : 'No Room Specified'}
          </div>
          <div className="text-xs text-slate-400">{t.student_name || 'Student'}</div>
        </div>
      ),
    },
    {
      header: 'Category',
      accessor: (t: Complaint) => (
        <span className="text-xs font-medium text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
          {t.category}
        </span>
      ),
    },
    {
      header: 'Priority',
      accessor: (t: Complaint) => <PriorityBadge priority={t.priority} />,
    },
    {
      header: 'Status',
      accessor: (t: Complaint) => <StatusBadge status={t.status} />,
    },
    {
      header: 'Description',
      accessor: (t: Complaint) => (
        <p className="text-xs text-slate-300 max-w-xs truncate" title={t.description}>
          {t.description}
        </p>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      accessor: (t: Complaint) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleOpenDetail(t)}
            title="View Timeline"
          >
            <Eye size={15} />
          </Button>

          {t.status === 'ASSIGNED' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleStartWork(t.id)}
              className="text-xs flex items-center gap-1.5 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30"
            >
              <Play size={13} />
              Start Work
            </Button>
          )}

          {t.status === 'IN_PROGRESS' && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleOpenResolve(t)}
              className="text-xs flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500"
            >
              <CheckCircle size={13} />
              Mark Resolved
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Maintenance Tasks"
        description="View and update tickets assigned directly to you"
      />

      {/* Filter toolbar */}
      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center gap-3">
        <Filter size={16} className="text-slate-400" />
        <span className="text-sm font-medium text-slate-300">Filter Status:</span>
        <div className="w-56">
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Tasks' },
              { value: 'ASSIGNED', label: 'Assigned (Pending Start)' },
              { value: 'IN_PROGRESS', label: 'In Progress' },
              { value: 'RESOLVED', label: 'Resolved' },
              { value: 'CLOSED', label: 'Closed' },
            ]}
          />
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
        <Table<Complaint>
          loading={loading}
          data={data?.items || []}
          keyExtractor={(t) => t.id}
          emptyMessage="No assigned maintenance tasks found"
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

      {/* Resolve Modal with mandatory work notes */}
      <Modal
        open={!!resolveTaskTarget}
        onClose={() => setResolveTaskTarget(null)}
        title={resolveTaskTarget ? `Resolve Ticket ${resolveTaskTarget.ticket_id}` : 'Resolve Ticket'}
      >
        {resolveTaskTarget && (
          <form onSubmit={handleConfirmResolve} className="space-y-4">
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-700 text-sm">
              <p className="text-slate-400 text-xs">Issue Description:</p>
              <p className="text-slate-200 mt-1">{resolveTaskTarget.description}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Resolution Work Notes <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={workNotes}
                onChange={(e) => setWorkNotes(e.target.value)}
                placeholder="Describe actions taken (e.g., replaced leaking pipe valve, tested water flow, sealed connection)..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Detailed work notes are required for auditing and record-keeping before resolving tickets.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-700">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setResolveTaskTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={isResolving}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                Confirm Resolution
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Task Detail Modal */}
      <Modal
        open={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedTask ? `Task Details - ${selectedTask.ticket_id}` : 'Task Details'}
        maxWidth="lg"
      >
        {selectedTask && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-900/70 rounded-lg border border-slate-700 text-sm">
              <div>
                <span className="text-xs text-slate-400">Status</span>
                <div className="mt-1"><StatusBadge status={selectedTask.status} /></div>
              </div>
              <div>
                <span className="text-xs text-slate-400">Priority</span>
                <div className="mt-1"><PriorityBadge priority={selectedTask.priority} /></div>
              </div>
              <div>
                <span className="text-xs text-slate-400">Category</span>
                <div className="mt-1 font-medium text-slate-200">{selectedTask.category}</div>
              </div>
              <div>
                <span className="text-xs text-slate-400">Room</span>
                <div className="mt-1 font-medium text-slate-200">
                  {selectedTask.room_number ? `Room ${selectedTask.room_number}` : 'N/A'}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Reported Issue
              </h4>
              <p className="text-sm text-slate-200 bg-slate-900 p-3 rounded-lg border border-slate-700 whitespace-pre-wrap">
                {selectedTask.description}
              </p>
            </div>

            {/* Timeline */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock size={14} /> History Log
              </h4>

              {loadingHistory ? (
                <div className="py-4 text-center text-sm text-slate-500">Loading history...</div>
              ) : history.length === 0 ? (
                <div className="py-2 text-center text-xs text-slate-500">No history entries</div>
              ) : (
                <div className="space-y-3 border-l-2 border-slate-700 ml-3 pl-4">
                  {history.map((h) => (
                    <div key={h.id} className="relative">
                      <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-slate-800" />
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium text-slate-200">{h.changer_name || 'Staff'}</span>
                        <span className="text-slate-400">changed to</span>
                        <StatusBadge status={h.to_status} />
                        <span className="text-slate-400 ml-auto">
                          {new Date(h.created_at).toLocaleString()}
                        </span>
                      </div>
                      {h.work_notes && (
                        <div className="mt-1 p-2 bg-slate-900 rounded border border-slate-700 text-xs text-slate-300">
                          <span className="font-medium text-slate-400">Notes: </span>
                          {h.work_notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-700">
              <Button variant="ghost" onClick={() => setIsDetailModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
