import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Plus,
  CheckCircle,
  Clock,
  UserCheck,
  Eye,
  Search,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Table, type Column } from '@/components/Table';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { StatusBadge, PriorityBadge } from '@/components/Badge';
import { Modal } from '@/components/Modal';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { complaintService } from '@/services/complaintService';
import { userService } from '@/services/userService';
import type { Complaint, ComplaintHistory, PaginatedResult, User } from '@/types';

const createComplaintSchema = z.object({
  category: z.enum(['PLUMBING', 'ELECTRICAL', 'CARPENTRY', 'CLEANING', 'INTERNET', 'OTHER']),
  description: z.string().min(10, 'Please provide a detailed description (at least 10 characters)'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
});

type CreateComplaintForm = z.infer<typeof createComplaintSchema>;

export function Complaints() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isStudent = user?.role === 'STUDENT';
  const isAdminOrWarden = user?.role === 'ADMIN' || user?.role === 'WARDEN';

  const [data, setData] = useState<PaginatedResult<Complaint> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch] = useState('');

  // Create Complaint Modal (Student)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // View Details Modal & History
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [history, setHistory] = useState<ComplaintHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Assign Modal (Admin / Warden)
  const [assignComplaintTarget, setAssignComplaintTarget] = useState<Complaint | null>(null);
  const [staffList, setStaffList] = useState<User[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateComplaintForm>({
    resolver: zodResolver(createComplaintSchema),
    defaultValues: {
      category: 'PLUMBING',
      priority: 'MEDIUM',
    },
  });

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await complaintService.getComplaints({
        page,
        limit: 10,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        priority: priorityFilter || undefined,
        search: search || undefined,
      });
      setData(res);
    } catch (err: any) {
      toast({
        title: 'Error loading complaints',
        description: err.response?.data?.message || 'Could not fetch complaints',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [page, statusFilter, categoryFilter, priorityFilter, search]);

  const handleOpenDetail = async (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setIsDetailModalOpen(true);
    setLoadingHistory(true);
    try {
      const res = await complaintService.getHistory(complaint.id);
      setHistory(res);
    } catch (err: any) {
      toast({
        title: 'Error loading history',
        description: err.response?.data?.message || 'Could not load complaint history',
        type: 'error',
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCreate = async (formData: CreateComplaintForm) => {
    try {
      await complaintService.createComplaint(formData);
      toast({ title: 'Complaint submitted successfully', type: 'success' });
      setIsCreateModalOpen(false);
      reset();
      fetchComplaints();
    } catch (err: any) {
      toast({
        title: 'Failed to submit complaint',
        description: err.response?.data?.message || 'Something went wrong',
        type: 'error',
      });
    }
  };

  const handleOpenAssign = async (complaint: Complaint) => {
    setAssignComplaintTarget(complaint);
    setSelectedStaffId(complaint.assigned_to ? String(complaint.assigned_to) : '');
    setIsAssignModalOpen(true);

    try {
      const res = await userService.list({ role: 'MAINTENANCE', limit: 100 });
      setStaffList(res.items || (res as any).users || []);
    } catch (err: any) {
      toast({
        title: 'Could not load staff list',
        description: err.response?.data?.message || 'Failed to fetch maintenance staff',
        type: 'error',
      });
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignComplaintTarget || !selectedStaffId) return;

    setIsAssigning(true);
    try {
      await complaintService.assignComplaint(assignComplaintTarget.id, parseInt(selectedStaffId));
      toast({ title: 'Complaint assigned successfully', type: 'success' });
      setIsAssignModalOpen(false);
      setAssignComplaintTarget(null);
      fetchComplaints();
    } catch (err: any) {
      toast({
        title: 'Assignment failed',
        description: err.response?.data?.message || 'Could not assign complaint',
        type: 'error',
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCloseComplaint = async (complaintId: number) => {
    try {
      await complaintService.updateStatus(complaintId, 'CLOSED', 'Marked closed by admin/warden');
      toast({ title: 'Complaint closed successfully', type: 'success' });
      fetchComplaints();
      if (selectedComplaint && selectedComplaint.id === complaintId) {
        setIsDetailModalOpen(false);
      }
    } catch (err: any) {
      toast({
        title: 'Failed to close complaint',
        description: err.response?.data?.message || 'Something went wrong',
        type: 'error',
      });
    }
  };

  const columns: Column<Complaint>[] = [
    {
      header: 'Ticket ID',
      accessor: (c: Complaint) => (
        <span className="font-mono text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">
          {c.ticket_id}
        </span>
      ),
    },
    ...(!isStudent
      ? [
          {
            header: 'Student & Room',
            accessor: (c: Complaint) => (
              <div>
                <div className="font-medium text-slate-200">{c.student_name || 'N/A'}</div>
                <div className="text-xs text-slate-400">
                  Room {c.room_number || 'Unassigned'}
                </div>
              </div>
            ),
          },
        ]
      : [
          {
            header: 'Room',
            accessor: (c: Complaint) => (
              <span className="text-sm font-medium text-slate-300">
                {c.room_number ? `Room ${c.room_number}` : 'Unassigned'}
              </span>
            ),
          },
        ]),
    {
      header: 'Category',
      accessor: (c: Complaint) => (
        <span className="text-xs font-medium text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
          {c.category}
        </span>
      ),
    },
    {
      header: 'Priority',
      accessor: (c: Complaint) => <PriorityBadge priority={c.priority} />,
    },
    {
      header: 'Status',
      accessor: (c: Complaint) => <StatusBadge status={c.status} />,
    },
    {
      header: 'Assigned To',
      accessor: (c: Complaint) => (
        <span className="text-xs text-slate-400">
          {c.assigned_name ? (
            <span className="text-slate-200 font-medium">{c.assigned_name}</span>
          ) : (
            <span className="text-slate-500 italic">Unassigned</span>
          )}
        </span>
      ),
    },
    {
      header: 'Created',
      accessor: (c: Complaint) => (
        <span className="text-xs text-slate-400">
          {new Date(c.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      accessor: (c: Complaint) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleOpenDetail(c)}
            title="View Timeline & Details"
          >
            <Eye size={15} />
          </Button>
          {isAdminOrWarden && (c.status === 'SUBMITTED' || c.status === 'ASSIGNED') && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleOpenAssign(c)}
              className="text-xs flex items-center gap-1"
            >
              <UserCheck size={14} />
              Assign
            </Button>
          )}
          {isAdminOrWarden && c.status === 'RESOLVED' && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleCloseComplaint(c.id)}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1"
            >
              <CheckCircle size={14} />
              Close
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Complaint Management"
        description="Track maintenance and facility issues across the hostel"
        actions={
          isStudent ? (
            <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
              <Plus size={16} />
              Raise Complaint
            </Button>
          ) : undefined
        }
      />

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input
            placeholder="Search ticket, text..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'SUBMITTED', label: 'Submitted' },
            { value: 'ASSIGNED', label: 'Assigned' },
            { value: 'IN_PROGRESS', label: 'In Progress' },
            { value: 'RESOLVED', label: 'Resolved' },
            { value: 'CLOSED', label: 'Closed' },
          ]}
        />
        <Select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          options={[
            { value: '', label: 'All Categories' },
            { value: 'PLUMBING', label: 'Plumbing' },
            { value: 'ELECTRICAL', label: 'Electrical' },
            { value: 'CARPENTRY', label: 'Carpentry' },
            { value: 'CLEANING', label: 'Cleaning' },
            { value: 'INTERNET', label: 'Internet' },
            { value: 'OTHER', label: 'Other' },
          ]}
        />
        <Select
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value);
            setPage(1);
          }}
          options={[
            { value: '', label: 'All Priorities' },
            { value: 'LOW', label: 'Low' },
            { value: 'MEDIUM', label: 'Medium' },
            { value: 'HIGH', label: 'High' },
            { value: 'URGENT', label: 'Urgent' },
          ]}
        />
      </div>

      {/* Complaints Table */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
        <Table<Complaint>
          loading={loading}
          data={data?.items || []}
          keyExtractor={(c) => c.id}
          emptyMessage="No complaints found matching your criteria"
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

      {/* Student: Raise Complaint Modal */}
      <Modal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Raise Maintenance Complaint"
      >
        <form onSubmit={handleSubmit(handleCreate)} className="space-y-4">
          <Select
            label="Category"
            {...register('category')}
            error={errors.category?.message}
            options={[
              { value: 'PLUMBING', label: 'Plumbing (Leak, tap, pipe)' },
              { value: 'ELECTRICAL', label: 'Electrical (Light, switch, fan)' },
              { value: 'CARPENTRY', label: 'Carpentry (Bed, door, table)' },
              { value: 'CLEANING', label: 'Cleaning (Room, washroom)' },
              { value: 'INTERNET', label: 'Internet / Wi-Fi' },
              { value: 'OTHER', label: 'Other Issues' },
            ]}
          />

          <Select
            label="Priority"
            {...register('priority')}
            error={errors.priority?.message}
            options={[
              { value: 'LOW', label: 'Low (Minor, cosmetic)' },
              { value: 'MEDIUM', label: 'Medium (Standard concern)' },
              { value: 'HIGH', label: 'High (Needs prompt attention)' },
              { value: 'URGENT', label: 'Urgent (Water leak, electrical hazard)' },
            ]}
          />

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Description of Issue <span className="text-red-400">*</span>
            </label>
            <textarea
              {...register('description')}
              rows={4}
              placeholder="Explain the issue clearly and mention any specific location details..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.description && (
              <p className="text-xs text-red-400 mt-1">{errors.description.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-700">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Submit Complaint
            </Button>
          </div>
        </form>
      </Modal>

      {/* Admin/Warden: Assign Complaint Modal */}
      <Modal
        open={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={assignComplaintTarget ? `Assign Ticket ${assignComplaintTarget.ticket_id}` : 'Assign Ticket'}
      >
        {assignComplaintTarget && (
          <form onSubmit={handleAssignSubmit} className="space-y-4">
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700 text-sm space-y-1">
              <div>
                <span className="text-slate-400">Category: </span>
                <span className="font-medium text-slate-200">{assignComplaintTarget.category}</span>
              </div>
              <div>
                <span className="text-slate-400">Description: </span>
                <span className="text-slate-300">{assignComplaintTarget.description}</span>
              </div>
            </div>

            <Select
              label="Select Maintenance Staff"
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              placeholder="-- Choose Staff Member --"
              required
              options={staffList.map((s) => ({
                value: String(s.id),
                label: `${s.full_name} (${s.username})`,
              }))}
            />

            {staffList.length === 0 && (
              <p className="text-xs text-amber-400 mt-1">
                No active maintenance staff members found in the system.
              </p>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-700">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAssignModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={isAssigning}
                disabled={!selectedStaffId}
              >
                Assign Ticket
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Complaint Detail & History Timeline Modal */}
      <Modal
        open={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedComplaint ? `Complaint Details - ${selectedComplaint.ticket_id}` : 'Complaint Details'}
        maxWidth="lg"
      >
        {selectedComplaint && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-900/70 rounded-lg border border-slate-700">
              <div>
                <div className="text-xs text-slate-400">Status</div>
                <div className="mt-1">
                  <StatusBadge status={selectedComplaint.status} />
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Priority</div>
                <div className="mt-1">
                  <PriorityBadge priority={selectedComplaint.priority} />
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Category</div>
                <div className="mt-1 font-medium text-sm text-slate-200">
                  {selectedComplaint.category}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Room</div>
                <div className="mt-1 font-medium text-sm text-slate-200">
                  {selectedComplaint.room_number ? `Room ${selectedComplaint.room_number}` : 'N/A'}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Problem Description
              </h4>
              <p className="text-sm text-slate-200 bg-slate-900 p-3 rounded-lg border border-slate-700 whitespace-pre-wrap">
                {selectedComplaint.description}
              </p>
            </div>

            {selectedComplaint.assigned_name && (
              <div className="text-sm text-slate-300">
                <span className="text-slate-400">Assigned Staff: </span>
                <span className="font-semibold text-indigo-400">
                  {selectedComplaint.assigned_name}
                </span>
              </div>
            )}

            {/* Timeline */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock size={14} /> Resolution History & Audit Log
              </h4>

              {loadingHistory ? (
                <div className="py-6 text-center text-sm text-slate-500">Loading history...</div>
              ) : history.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500">
                  No status transitions recorded yet.
                </div>
              ) : (
                <div className="space-y-4 border-l-2 border-slate-700 ml-3 pl-4">
                  {history.map((h) => (
                    <div key={h.id} className="relative">
                      <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-slate-800" />
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium text-slate-200">
                          {h.changer_name || 'System'}
                        </span>
                        <span className="text-slate-400">transitioned to</span>
                        <StatusBadge status={h.to_status} />
                        <span className="text-slate-400 ml-auto">
                          {new Date(h.created_at).toLocaleString()}
                        </span>
                      </div>
                      {h.work_notes && (
                        <div className="mt-1.5 p-2 bg-slate-900 rounded border border-slate-700 text-xs text-slate-300">
                          <span className="font-semibold text-slate-400">Work Notes: </span>
                          {h.work_notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-700">
              {isAdminOrWarden && selectedComplaint.status === 'RESOLVED' ? (
                <Button
                  variant="primary"
                  onClick={() => handleCloseComplaint(selectedComplaint.id)}
                  className="bg-emerald-600 hover:bg-emerald-500"
                >
                  Close Ticket
                </Button>
              ) : <div />}

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
