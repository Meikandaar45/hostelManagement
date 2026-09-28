import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Table, type Column } from '@/components/Table';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { Button } from '@/components/Button';
import { FilterBar } from '@/components/FilterBar';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { useToast } from '@/hooks/useToast';
import { auditService, type ListAuditParams } from '@/services/auditService';
import type { AuditLog } from '@/types';
import { Modal } from '@/components/Modal';

export function Audit() {
  const [data, setData] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState<ListAuditParams>({ page: 1, limit: 20 });
  const [actionTypes, setActionTypes] = useState<string[]>([]);

  // Filter local states
  const [search, setSearch] = useState('');
  const [userId, setUserId] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const { toast } = useToast();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await auditService.list(params);
      setData(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      toast('danger', 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [params, toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    auditService.getActions().then(setActionTypes).catch(() => {});
  }, []);

  const handleApplyFilter = () => {
    setParams({
      page: 1,
      limit: 20,
      search: search || undefined,
      user_id: userId || undefined,
      action: action || undefined,
      entity_type: entityType || undefined,
      from: from || undefined,
      to: to || undefined,
    });
  };

  const handleReset = () => {
    setSearch('');
    setUserId('');
    setAction('');
    setEntityType('');
    setFrom('');
    setTo('');
    setParams({ page: 1, limit: 20 });
  };

  const columns: Column<AuditLog>[] = [
    {
      header: 'Timestamp',
      accessor: (l) => new Date(l.created_at).toLocaleString(),
      className: 'w-48',
    },
    {
      header: 'Actor',
      accessor: (l) =>
        l.actor_name ? (
          <div>
            <span className="font-medium text-slate-200">{l.actor_name}</span>
            <span className="text-xs text-slate-500 ml-2">ID: {l.actor_user_id}</span>
          </div>
        ) : (
          <span className="text-slate-500 italic">System</span>
        ),
    },
    {
      header: 'Action',
      accessor: (l) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          {l.action}
        </span>
      ),
    },
    {
      header: 'Entity',
      accessor: (l) => (l.entity_type ? `${l.entity_type} #${l.entity_id ?? ''}` : '-'),
    },
    {
      header: 'Details',
      accessor: (l) => (
        <Button size="sm" variant="ghost" onClick={() => setSelectedLog(l)}>
          View Details
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Audit Trail"
        description="Immutable record of system events, logins, security triggers, and operational state transitions."
      />

      <FilterBar onReset={handleReset}>
        <Input
          label="Search"
          placeholder="Actor name or action..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Input
          label="User ID"
          placeholder="e.g. 1"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <Select
          label="Action"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          options={[
            { value: '', label: 'All Actions' },
            ...actionTypes.map((a) => ({ value: a, label: a })),
          ]}
        />
        <Select
          label="Entity Type"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          options={[
            { value: '', label: 'All Entities' },
            { value: 'user', label: 'User' },
            { value: 'student', label: 'Student' },
            { value: 'room', label: 'Room' },
            { value: 'room_allocation', label: 'Allocation' },
            { value: 'fee', label: 'Fee' },
            { value: 'payment', label: 'Payment' },
            { value: 'complaint', label: 'Complaint' },
            { value: 'leave_request', label: 'Leave Request' },
            { value: 'visitor', label: 'Visitor' },
          ]}
        />
        <DateRangeFilter
          fromDate={from}
          toDate={to}
          onFromChange={setFrom}
          onToChange={setTo}
        />
        <div className="flex gap-2">
          <Button onClick={handleApplyFilter} className="w-full">
            Apply Filters
          </Button>
        </div>
      </FilterBar>

      <Table
        data={data}
        columns={columns}
        keyExtractor={(l) => l.id}
        loading={loading}
        emptyMessage="No audit logs match your filter criteria."
        pagination={{
          page: params.page || 1,
          limit: params.limit || 20,
          total,
          totalPages,
          onPageChange: (p) => setParams({ ...params, page: p }),
        }}
      />

      <Modal open={!!selectedLog} onClose={() => setSelectedLog(null)} title="Audit Details" maxWidth="lg">
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 mb-1">Action</p>
                <p className="text-slate-200 font-medium">{selectedLog.action}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Timestamp</p>
                <p className="text-slate-200 font-medium">
                  {new Date(selectedLog.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Actor</p>
                <p className="text-slate-200 font-medium">
                  {selectedLog.actor_name || 'System'}{' '}
                  {selectedLog.actor_user_id ? `(#${selectedLog.actor_user_id})` : ''}
                </p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">IP Address</p>
                <p className="text-slate-200 font-medium">{selectedLog.ip_address || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Entity</p>
                <p className="text-slate-200 font-medium">
                  {selectedLog.entity_type || 'None'}{' '}
                  {selectedLog.entity_id ? `(#${selectedLog.entity_id})` : ''}
                </p>
              </div>
            </div>

            {selectedLog.details && (
              <div>
                <p className="text-slate-500 text-sm mb-1">Contextual Payload (Safe Metadata)</p>
                <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto border border-slate-700/50">
                  <pre className="text-xs text-emerald-400 font-mono m-0">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {selectedLog.user_agent && (
              <div>
                <p className="text-slate-500 text-sm mb-1">User Agent</p>
                <p className="text-xs text-slate-400 break-words bg-slate-900 p-3 rounded-lg border border-slate-700/50">
                  {selectedLog.user_agent}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
