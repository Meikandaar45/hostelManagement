import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Plus,
  LogOut,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Table, type Column } from '@/components/Table';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { StatusBadge } from '@/components/Badge';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { visitorService } from '@/services/visitorService';
import { studentService } from '@/services/studentService';
import type { VisitorLog, PaginatedResult, Student } from '@/types';

const recordVisitorSchema = z.object({
  visitor_name: z.string().min(2, 'Visitor name must be at least 2 characters'),
  phone: z.string().min(7, 'Phone number must be at least 7 digits'),
  student_id: z.coerce.number().int().positive('Please select a student'),
  purpose: z.string().min(3, 'Purpose must be at least 3 characters'),
  notes: z.string().optional(),
});

type RecordVisitorForm = z.infer<typeof recordVisitorSchema>;

export function Visitors() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isStudent = user?.role === 'STUDENT';
  const isAdminOrWarden = user?.role === 'ADMIN' || user?.role === 'WARDEN';

  const [data, setData] = useState<PaginatedResult<VisitorLog> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Record Entry Modal
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Record Exit Confirmation
  const [exitVisitorTarget, setExitVisitorTarget] = useState<VisitorLog | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<RecordVisitorForm>({
    resolver: zodResolver(recordVisitorSchema),
  });

  const fetchVisitors = async () => {
    setLoading(true);
    try {
      const res = await visitorService.getVisitors({
        page,
        limit: 10,
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setData(res);
    } catch (err: any) {
      toast({
        title: 'Error loading visitors',
        description: err.response?.data?.message || 'Could not fetch visitor logs',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, [page, statusFilter, search]);

  const handleOpenEntryModal = async () => {
    setIsEntryModalOpen(true);
    setLoadingStudents(true);
    try {
      const res = await studentService.getStudents({ limit: 100 });
      setStudents(res.items);
    } catch (err: any) {
      toast({
        title: 'Error loading students',
        description: 'Could not fetch student directory',
        type: 'error',
      });
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleRecordEntry = async (formData: RecordVisitorForm) => {
    try {
      await visitorService.recordEntry(formData);
      toast({ title: 'Visitor entry logged successfully', type: 'success' });
      setIsEntryModalOpen(false);
      reset();
      fetchVisitors();
    } catch (err: any) {
      toast({
        title: 'Failed to record entry',
        description: err.response?.data?.message || 'Something went wrong',
        type: 'error',
      });
    }
  };

  const handleConfirmExit = async () => {
    if (!exitVisitorTarget) return;

    setIsExiting(true);
    try {
      await visitorService.recordExit(exitVisitorTarget.id);
      toast({ title: 'Visitor exit recorded successfully', type: 'success' });
      setExitVisitorTarget(null);
      fetchVisitors();
    } catch (err: any) {
      toast({
        title: 'Failed to record exit',
        description: err.response?.data?.message || 'Could not log visitor exit',
        type: 'error',
      });
    } finally {
      setIsExiting(false);
    }
  };

  const columns: Column<VisitorLog>[] = [
    {
      header: 'Visitor Name',
      accessor: (v: VisitorLog) => (
        <div>
          <div className="font-semibold text-slate-200">{v.visitor_name}</div>
          <div className="text-xs text-slate-400 font-mono">{v.phone}</div>
        </div>
      ),
    },
    ...(!isStudent
      ? [
          {
            header: 'Visiting Student',
            accessor: (v: VisitorLog) => (
              <div>
                <div className="font-medium text-slate-200">{v.student_name || 'N/A'}</div>
                <div className="text-xs text-slate-400">{v.student_number || ''}</div>
              </div>
            ),
          },
        ]
      : []),
    {
      header: 'Purpose',
      accessor: (v: VisitorLog) => <span className="text-sm text-slate-300">{v.purpose}</span>,
    },
    {
      header: 'Entry Time',
      accessor: (v: VisitorLog) => (
        <div className="text-xs text-slate-300">
          {new Date(v.entry_at).toLocaleDateString()}{' '}
          <span className="text-slate-400">
            {new Date(v.entry_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ),
    },
    {
      header: 'Exit Time',
      accessor: (v: VisitorLog) => (
        <div className="text-xs text-slate-400">
          {v.exit_at ? (
            <>
              {new Date(v.exit_at).toLocaleDateString()}{' '}
              <span className="text-slate-400">
                {new Date(v.exit_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </>
          ) : (
            <span className="text-amber-400 italic">Not departed</span>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (v: VisitorLog) => <StatusBadge status={v.status} />,
    },
    ...(isAdminOrWarden
      ? [
          {
            header: 'Recorded By',
            accessor: (v: VisitorLog) => (
              <span className="text-xs text-slate-400">
                {v.recorded_by_name || 'Staff'}
              </span>
            ),
          },
          {
            header: 'Actions',
            className: 'text-right',
            accessor: (v: VisitorLog) => (
              <div className="flex items-center justify-end">
                {v.status === 'INSIDE' ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setExitVisitorTarget(v)}
                    className="text-xs flex items-center gap-1.5 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30"
                  >
                    <LogOut size={13} />
                    Record Exit
                  </Button>
                ) : (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-emerald-500" />
                    Completed
                  </span>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={isStudent ? 'My Visitors' : 'Visitor Management'}
        description={
          isStudent
            ? 'Track visitors registered to meet you at the hostel'
            : 'Monitor gate security, active visitors, and past visits'
        }
        actions={
          isAdminOrWarden ? (
            <Button onClick={handleOpenEntryModal} className="flex items-center gap-2">
              <Plus size={16} />
              Record Visitor Entry
            </Button>
          ) : undefined
        }
      />

      {/* Filter toolbar */}
      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input
            placeholder="Search visitor name or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-sm font-medium text-slate-400">Status:</span>
          <div className="w-48">
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Visitors' },
                { value: 'INSIDE', label: 'Currently Inside' },
                { value: 'EXITED', label: 'Exited' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Visitors Table */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
        <Table<VisitorLog>
          loading={loading}
          data={data?.items || []}
          keyExtractor={(v) => v.id}
          emptyMessage="No visitor logs found"
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

      {/* Record Visitor Entry Modal */}
      <Modal
        open={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        title="Record Visitor Entry"
      >
        <form onSubmit={handleSubmit(handleRecordEntry)} className="space-y-4">
          <Input
            label="Visitor Full Name"
            {...register('visitor_name')}
            placeholder="e.g. Ramesh Patel"
            error={errors.visitor_name?.message}
            required
          />

          <Input
            label="Phone Number"
            {...register('phone')}
            placeholder="e.g. +91 9876543210"
            error={errors.phone?.message}
            required
          />

          <Select
            label="Visiting Student"
            {...register('student_id')}
            disabled={loadingStudents}
            placeholder={loadingStudents ? 'Loading student directory...' : '-- Select Student --'}
            required
            error={errors.student_id?.message}
            options={students.map((st) => ({
              value: String(st.id),
              label: `${st.full_name} (${st.student_id || `ID ${st.id}`})`,
            }))}
          />

          <Input
            label="Purpose of Visit"
            {...register('purpose')}
            placeholder="e.g. Parent visit, urgent document handover"
            error={errors.purpose?.message}
            required
          />

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Security / Gate Notes (Optional)
            </label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Vehicle number, belongings, ID proof verified..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-700">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsEntryModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Record Entry
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record Exit Confirmation Dialog */}
      {exitVisitorTarget && (
        <ConfirmDialog
          open={!!exitVisitorTarget}
          onClose={() => setExitVisitorTarget(null)}
          onConfirm={handleConfirmExit}
          title="Confirm Visitor Departure"
          message={`Are you sure you want to record the departure of visitor "${exitVisitorTarget.visitor_name}"? This will timestamp their exit.`}
          confirmLabel="Record Exit"
          loading={isExiting}
          variant="warning"
        />
      )}
    </div>
  );
}
