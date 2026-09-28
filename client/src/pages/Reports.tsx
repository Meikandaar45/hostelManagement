import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Table, type Column } from '@/components/Table';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { Button } from '@/components/Button';
import { StatusBadge, PriorityBadge } from '@/components/Badge';
import { FilterBar } from '@/components/FilterBar';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { reportService } from '@/services/reportService';
import { exportToCsv, type CsvColumn } from '@/utils/exportCsv';
import { useDebounce } from '@/hooks/useDebounce';
import {
  FileSpreadsheet,
  Printer,
  Users,
  Home,
  CreditCard,
  Receipt,
  MessageSquare,
  CalendarCheck,
  DoorOpen,
} from 'lucide-react';

type ReportTab =
  | 'students'
  | 'rooms'
  | 'fees'
  | 'payments'
  | 'complaints'
  | 'leave'
  | 'visitors';

export function Reports() {
  const [tab, setTab] = useState<ReportTab>('students');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  // Common filter states
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Specific filter states
  const [department, setDepartment] = useState('');
  const [gender, setGender] = useState('');
  const [isActive, setIsActive] = useState('');
  const [roomType, setRoomType] = useState('');
  const [roomStatus, setRoomStatus] = useState('');
  const [block, setBlock] = useState('');
  const [feeType, setFeeType] = useState('');
  const [feeStatus, setFeeStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [complaintStatus, setComplaintStatus] = useState('');
  const [complaintCategory, setComplaintCategory] = useState('');
  const [complaintPriority, setComplaintPriority] = useState('');
  const [leaveStatus, setLeaveStatus] = useState('');
  const [visitorStatus, setVisitorStatus] = useState('');

  const resetFilters = () => {
    setSearch('');
    setFromDate('');
    setToDate('');
    setDepartment('');
    setGender('');
    setIsActive('');
    setRoomType('');
    setRoomStatus('');
    setBlock('');
    setFeeType('');
    setFeeStatus('');
    setPaymentMethod('');
    setComplaintStatus('');
    setComplaintCategory('');
    setComplaintPriority('');
    setLeaveStatus('');
    setVisitorStatus('');
    setPage(1);
  };

  const handleTabChange = (newTab: ReportTab) => {
    setTab(newTab);
    resetFilters();
  };

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      let res: any;
      switch (tab) {
        case 'students':
          res = await reportService.getStudents({
            page,
            limit,
            search: debouncedSearch || undefined,
            department: department || undefined,
            gender: gender || undefined,
            is_active: isActive || undefined,
            from: fromDate || undefined,
            to: toDate || undefined,
          });
          break;
        case 'rooms':
          res = await reportService.getRooms({
            page,
            limit,
            search: debouncedSearch || undefined,
            block: block || undefined,
            room_type: roomType || undefined,
            status: roomStatus || undefined,
          });
          break;
        case 'fees':
          res = await reportService.getFees({
            page,
            limit,
            search: debouncedSearch || undefined,
            fee_type: feeType || undefined,
            status: feeStatus || undefined,
            from: fromDate || undefined,
            to: toDate || undefined,
          });
          break;
        case 'payments':
          res = await reportService.getPayments({
            page,
            limit,
            search: debouncedSearch || undefined,
            payment_method: paymentMethod || undefined,
            from: fromDate || undefined,
            to: toDate || undefined,
          });
          break;
        case 'complaints':
          res = await reportService.getComplaints({
            page,
            limit,
            search: debouncedSearch || undefined,
            status: complaintStatus || undefined,
            category: complaintCategory || undefined,
            priority: complaintPriority || undefined,
            from: fromDate || undefined,
            to: toDate || undefined,
          });
          break;
        case 'leave':
          res = await reportService.getLeave({
            page,
            limit,
            search: debouncedSearch || undefined,
            status: leaveStatus || undefined,
            from: fromDate || undefined,
            to: toDate || undefined,
          });
          break;
        case 'visitors':
          res = await reportService.getVisitors({
            page,
            limit,
            search: debouncedSearch || undefined,
            status: visitorStatus || undefined,
            from: fromDate || undefined,
            to: toDate || undefined,
          });
          break;
      }

      if (res) {
        setData(res.items || []);
        setTotal(res.total || 0);
        setTotalPages(res.totalPages || 1);
      }
    } catch (err) {
      console.error('Error fetching report', err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [
    tab,
    page,
    limit,
    debouncedSearch,
    fromDate,
    toDate,
    department,
    gender,
    isActive,
    block,
    roomType,
    roomStatus,
    feeType,
    feeStatus,
    paymentMethod,
    complaintStatus,
    complaintCategory,
    complaintPriority,
    leaveStatus,
    visitorStatus,
  ]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Export to CSV Handler
  const handleExportCsv = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    switch (tab) {
      case 'students': {
        const columns: CsvColumn<any>[] = [
          { header: 'Student ID', accessor: (r) => r.student_id },
          { header: 'Full Name', accessor: (r) => r.full_name },
          { header: 'Department', accessor: (r) => r.department },
          { header: 'Gender', accessor: (r) => r.gender },
          { header: 'Contact', accessor: (r) => r.contact_number },
          { header: 'Room', accessor: (r) => r.room_number ? `${r.room_number} (${r.block})` : 'Unassigned' },
          { header: 'Admission Date', accessor: (r) => r.admission_date },
          { header: 'Status', accessor: (r) => (r.is_active ? 'Active' : 'Inactive') },
        ];
        exportToCsv(`students_report_${timestamp}`, columns, data);
        break;
      }
      case 'rooms': {
        const columns: CsvColumn<any>[] = [
          { header: 'Block', accessor: (r) => r.block },
          { header: 'Floor', accessor: (r) => r.floor },
          { header: 'Room Number', accessor: (r) => r.room_number },
          { header: 'Room Type', accessor: (r) => r.room_type },
          { header: 'Capacity', accessor: (r) => r.capacity },
          { header: 'Occupied Count', accessor: (r) => r.occupied_count },
          { header: 'Available Capacity', accessor: (r) => r.available_capacity },
          { header: 'Occupancy Status', accessor: (r) => r.status },
        ];
        exportToCsv(`room_occupancy_report_${timestamp}`, columns, data);
        break;
      }
      case 'fees': {
        const columns: CsvColumn<any>[] = [
          { header: 'Student ID', accessor: (r) => r.student_id },
          { header: 'Student Name', accessor: (r) => r.student_name },
          { header: 'Fee Type', accessor: (r) => r.fee_type },
          { header: 'Academic Period', accessor: (r) => r.academic_period },
          { header: 'Amount ($)', accessor: (r) => r.amount },
          { header: 'Paid ($)', accessor: (r) => r.paid_amount },
          { header: 'Balance ($)', accessor: (r) => r.balance },
          { header: 'Due Date', accessor: (r) => r.due_date },
          { header: 'Status', accessor: (r) => r.status },
        ];
        exportToCsv(`fees_report_${timestamp}`, columns, data);
        break;
      }
      case 'payments': {
        const columns: CsvColumn<any>[] = [
          { header: 'Receipt Number', accessor: (r) => r.receipt_number },
          { header: 'Student ID', accessor: (r) => r.student_id },
          { header: 'Student Name', accessor: (r) => r.student_name },
          { header: 'Amount ($)', accessor: (r) => r.amount },
          { header: 'Payment Method', accessor: (r) => r.payment_method },
          { header: 'Reference', accessor: (r) => r.transaction_reference || '-' },
          { header: 'Paid Date', accessor: (r) => r.paid_at },
          { header: 'Recorded By', accessor: (r) => r.recorded_by_name || '-' },
        ];
        exportToCsv(`payments_report_${timestamp}`, columns, data);
        break;
      }
      case 'complaints': {
        const columns: CsvColumn<any>[] = [
          { header: 'Ticket ID', accessor: (r) => r.ticket_id },
          { header: 'Student ID', accessor: (r) => r.student_id },
          { header: 'Student Name', accessor: (r) => r.student_name },
          { header: 'Room Number', accessor: (r) => r.room_number },
          { header: 'Category', accessor: (r) => r.category },
          { header: 'Priority', accessor: (r) => r.priority },
          { header: 'Status', accessor: (r) => r.status },
          { header: 'Assigned Staff', accessor: (r) => r.assigned_staff_name || 'Unassigned' },
          { header: 'Created Date', accessor: (r) => r.created_at },
          { header: 'Resolved Date', accessor: (r) => r.resolved_at || '-' },
        ];
        exportToCsv(`complaints_report_${timestamp}`, columns, data);
        break;
      }
      case 'leave': {
        const columns: CsvColumn<any>[] = [
          { header: 'Student ID', accessor: (r) => r.student_id },
          { header: 'Student Name', accessor: (r) => r.student_name },
          { header: 'Department', accessor: (r) => r.department },
          { header: 'Departure Time', accessor: (r) => r.from_datetime },
          { header: 'Return Time', accessor: (r) => r.to_datetime },
          { header: 'Reason', accessor: (r) => r.reason },
          { header: 'Status', accessor: (r) => r.status },
          { header: 'Gate Pass Number', accessor: (r) => r.gate_pass_number || '-' },
          { header: 'Reviewed By', accessor: (r) => r.reviewed_by_name || '-' },
        ];
        exportToCsv(`leave_report_${timestamp}`, columns, data);
        break;
      }
      case 'visitors': {
        const columns: CsvColumn<any>[] = [
          { header: 'Visitor Name', accessor: (r) => r.visitor_name },
          { header: 'Phone', accessor: (r) => r.phone },
          { header: 'Student ID', accessor: (r) => r.student_id },
          { header: 'Student Name', accessor: (r) => r.student_name },
          { header: 'Purpose', accessor: (r) => r.purpose },
          { header: 'Entry Time', accessor: (r) => r.entry_at },
          { header: 'Exit Time', accessor: (r) => r.exit_at || 'Still Inside' },
          { header: 'Recorded By', accessor: (r) => r.recorded_by_name || '-' },
        ];
        exportToCsv(`visitors_report_${timestamp}`, columns, data);
        break;
      }
    }
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Define table columns based on active tab
  const getColumns = (): Column<any>[] => {
    switch (tab) {
      case 'students':
        return [
          { header: 'Student ID', accessor: (r) => <span className="font-mono text-indigo-400 font-semibold">{r.student_id}</span> },
          { header: 'Name', accessor: (r) => <span className="font-medium text-slate-200">{r.full_name}</span> },
          { header: 'Department', accessor: (r) => r.department },
          { header: 'Gender', accessor: (r) => r.gender },
          { header: 'Contact', accessor: (r) => r.contact_number },
          { header: 'Room', accessor: (r) => r.room_number ? `${r.room_number} (${r.block})` : <span className="text-slate-500 italic">None</span> },
          { header: 'Status', accessor: (r) => <StatusBadge active={r.is_active} /> },
        ];
      case 'rooms':
        return [
          { header: 'Block', accessor: (r) => r.block },
          { header: 'Floor', accessor: (r) => r.floor },
          { header: 'Room No.', accessor: (r) => <span className="font-bold text-slate-100">{r.room_number}</span> },
          { header: 'Type', accessor: (r) => r.room_type },
          { header: 'Capacity', accessor: (r) => r.capacity },
          { header: 'Occupied', accessor: (r) => <span className="font-bold text-indigo-400">{r.occupied_count}</span> },
          { header: 'Available', accessor: (r) => <span className="font-bold text-emerald-400">{r.available_capacity}</span> },
          { header: 'Status', accessor: (r) => <StatusBadge status={r.status} /> },
        ];
      case 'fees':
        return [
          { header: 'Student', accessor: (r) => (
            <div>
              <p className="font-semibold text-slate-200">{r.student_name}</p>
              <p className="text-xs text-slate-500">{r.student_id}</p>
            </div>
          )},
          { header: 'Fee Type', accessor: (r) => r.fee_type },
          { header: 'Amount', accessor: (r) => `$${Number(r.amount).toFixed(2)}` },
          { header: 'Paid', accessor: (r) => `$${Number(r.paid_amount).toFixed(2)}` },
          { header: 'Balance', accessor: (r) => (
            <span className={Number(r.balance) > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
              ${Number(r.balance).toFixed(2)}
            </span>
          )},
          { header: 'Due Date', accessor: (r) => new Date(r.due_date).toLocaleDateString() },
          { header: 'Status', accessor: (r) => <StatusBadge status={r.status} /> },
        ];
      case 'payments':
        return [
          { header: 'Receipt No.', accessor: (r) => <span className="font-mono text-indigo-400 font-semibold">{r.receipt_number}</span> },
          { header: 'Student', accessor: (r) => (
            <div>
              <p className="font-semibold text-slate-200">{r.student_name}</p>
              <p className="text-xs text-slate-500">{r.student_id}</p>
            </div>
          )},
          { header: 'Amount', accessor: (r) => <span className="font-bold text-emerald-400">${Number(r.amount).toFixed(2)}</span> },
          { header: 'Method', accessor: (r) => r.payment_method },
          { header: 'Reference', accessor: (r) => r.transaction_reference || '-' },
          { header: 'Paid Date', accessor: (r) => new Date(r.paid_at).toLocaleDateString() },
          { header: 'Recorded By', accessor: (r) => r.recorded_by_name || '-' },
        ];
      case 'complaints':
        return [
          { header: 'Ticket ID', accessor: (r) => <span className="font-mono text-indigo-400 font-semibold">{r.ticket_id}</span> },
          { header: 'Student / Room', accessor: (r) => `${r.student_name} (Room ${r.room_number})` },
          { header: 'Category', accessor: (r) => r.category },
          { header: 'Priority', accessor: (r) => <PriorityBadge priority={r.priority} /> },
          { header: 'Status', accessor: (r) => <StatusBadge status={r.status} /> },
          { header: 'Assigned Staff', accessor: (r) => r.assigned_staff_name || <span className="text-slate-500 italic">Unassigned</span> },
          { header: 'Created', accessor: (r) => new Date(r.created_at).toLocaleDateString() },
          { header: 'Resolved', accessor: (r) => r.resolved_at ? new Date(r.resolved_at).toLocaleDateString() : '-' },
        ];
      case 'leave':
        return [
          { header: 'Student', accessor: (r) => (
            <div>
              <p className="font-semibold text-slate-200">{r.student_name}</p>
              <p className="text-xs text-slate-500">{r.student_id}</p>
            </div>
          )},
          { header: 'Departure', accessor: (r) => new Date(r.from_datetime).toLocaleString() },
          { header: 'Return', accessor: (r) => new Date(r.to_datetime).toLocaleString() },
          { header: 'Reason', accessor: (r) => <span className="truncate max-w-xs block">{r.reason}</span> },
          { header: 'Status', accessor: (r) => <StatusBadge status={r.status} /> },
          { header: 'Gate Pass', accessor: (r) => r.gate_pass_number ? <span className="font-mono text-emerald-400 font-bold">{r.gate_pass_number}</span> : '-' },
          { header: 'Reviewed By', accessor: (r) => r.reviewed_by_name || '-' },
        ];
      case 'visitors':
        return [
          { header: 'Visitor', accessor: (r) => (
            <div>
              <p className="font-semibold text-slate-200">{r.visitor_name}</p>
              <p className="text-xs text-slate-500">{r.phone}</p>
            </div>
          )},
          { header: 'Student', accessor: (r) => (
            <div>
              <p className="font-semibold text-slate-200">{r.student_name}</p>
              <p className="text-xs text-slate-500">{r.student_id}</p>
            </div>
          )},
          { header: 'Purpose', accessor: (r) => r.purpose },
          { header: 'Entry Time', accessor: (r) => new Date(r.entry_at).toLocaleString() },
          { header: 'Exit Time', accessor: (r) => r.exit_at ? new Date(r.exit_at).toLocaleString() : <span className="text-emerald-400 font-bold">Inside</span> },
          { header: 'Recorded By', accessor: (r) => r.recorded_by_name || '-' },
        ];
    }
  };

  const tabs: { id: ReportTab; label: string; icon: any }[] = [
    { id: 'students', label: 'Students', icon: Users },
    { id: 'rooms', label: 'Room Occupancy', icon: Home },
    { id: 'fees', label: 'Fees', icon: CreditCard },
    { id: 'payments', label: 'Payments', icon: Receipt },
    { id: 'complaints', label: 'Complaints', icon: MessageSquare },
    { id: 'leave', label: 'Leave Requests', icon: CalendarCheck },
    { id: 'visitors', label: 'Visitors', icon: DoorOpen },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Export & Print Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Reporting & Analytics"
          description="Operational intelligence, occupancy tracking, financial audits, and security logs."
        />
        <div className="no-print flex items-center gap-2.5">
          <Button variant="secondary" onClick={handleExportCsv} className="gap-2 text-xs">
            <FileSpreadsheet size={16} className="text-emerald-400" /> Export CSV
          </Button>
          <Button variant="secondary" onClick={handlePrint} className="gap-2 text-xs">
            <Printer size={16} className="text-indigo-400" /> Print Report
          </Button>
        </div>
      </div>

      {/* Printable Report Header */}
      <div className="print-only mb-6 border-b border-slate-300 pb-4">
        <h2 className="text-2xl font-bold">Hostel Management System — {tabs.find((t) => t.id === tab)?.label} Report</h2>
        <p className="text-sm text-slate-600">Generated on {new Date().toLocaleString()} • Filtered records: {total}</p>
      </div>

      {/* Tabs */}
      <div className="no-print flex overflow-x-auto gap-2 border-b border-slate-800 pb-2 scrollbar-thin">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActiveTab = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                isActiveTab
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon size={16} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Bar */}
      <FilterBar onReset={resetFilters}>
        <Input
          label="Search"
          placeholder="Keyword search..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

        {/* Tab-specific filters */}
        {tab === 'students' && (
          <>
            <Select
              label="Department"
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Departments' },
                { value: 'Computer Science', label: 'Computer Science' },
                { value: 'Electrical', label: 'Electrical' },
                { value: 'Mechanical', label: 'Mechanical' },
                { value: 'Civil', label: 'Civil' },
                { value: 'Information Technology', label: 'Information Technology' },
              ]}
            />
            <Select
              label="Gender"
              value={gender}
              onChange={(e) => {
                setGender(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Genders' },
                { value: 'MALE', label: 'Male' },
                { value: 'FEMALE', label: 'Female' },
                { value: 'OTHER', label: 'Other' },
              ]}
            />
            <Select
              label="Status"
              value={isActive}
              onChange={(e) => {
                setIsActive(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Status' },
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' },
              ]}
            />
            <DateRangeFilter
              fromDate={fromDate}
              toDate={toDate}
              fromLabel="Admission From"
              toLabel="Admission To"
              onFromChange={(v) => {
                setFromDate(v);
                setPage(1);
              }}
              onToChange={(v) => {
                setToDate(v);
                setPage(1);
              }}
            />
          </>
        )}

        {tab === 'rooms' && (
          <>
            <Select
              label="Block"
              value={block}
              onChange={(e) => {
                setBlock(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Blocks' },
                { value: 'A', label: 'Block A' },
                { value: 'B', label: 'Block B' },
                { value: 'C', label: 'Block C' },
                { value: 'D', label: 'Block D' },
              ]}
            />
            <Select
              label="Room Type"
              value={roomType}
              onChange={(e) => {
                setRoomType(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Room Types' },
                { value: 'SINGLE', label: 'Single' },
                { value: 'DOUBLE', label: 'Double' },
                { value: 'TRIPLE', label: 'Triple' },
                { value: 'DORMITORY', label: 'Dormitory' },
              ]}
            />
            <Select
              label="Occupancy Status"
              value={roomStatus}
              onChange={(e) => {
                setRoomStatus(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Status' },
                { value: 'AVAILABLE', label: 'Available' },
                { value: 'PARTIALLY_OCCUPIED', label: 'Partially Occupied' },
                { value: 'FULL', label: 'Full' },
              ]}
            />
          </>
        )}

        {tab === 'fees' && (
          <>
            <Select
              label="Fee Type"
              value={feeType}
              onChange={(e) => {
                setFeeType(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Fee Types' },
                { value: 'HOSTEL_FEE', label: 'Hostel Fee' },
                { value: 'MESS_FEE', label: 'Mess Fee' },
                { value: 'MAINTENANCE_FEE', label: 'Maintenance Fee' },
                { value: 'SECURITY_DEPOSIT', label: 'Security Deposit' },
              ]}
            />
            <Select
              label="Payment Status"
              value={feeStatus}
              onChange={(e) => {
                setFeeStatus(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Status' },
                { value: 'PAID', label: 'Paid' },
                { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'OVERDUE', label: 'Overdue' },
              ]}
            />
            <DateRangeFilter
              fromDate={fromDate}
              toDate={toDate}
              fromLabel="Due Date From"
              toLabel="Due Date To"
              onFromChange={(v) => {
                setFromDate(v);
                setPage(1);
              }}
              onToChange={(v) => {
                setToDate(v);
                setPage(1);
              }}
            />
          </>
        )}

        {tab === 'payments' && (
          <>
            <Select
              label="Payment Method"
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Methods' },
                { value: 'UPI', label: 'UPI' },
                { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                { value: 'CASH', label: 'Cash' },
                { value: 'OTHER', label: 'Other' },
              ]}
            />
            <DateRangeFilter
              fromDate={fromDate}
              toDate={toDate}
              fromLabel="Paid Date From"
              toLabel="Paid Date To"
              onFromChange={(v) => {
                setFromDate(v);
                setPage(1);
              }}
              onToChange={(v) => {
                setToDate(v);
                setPage(1);
              }}
            />
          </>
        )}

        {tab === 'complaints' && (
          <>
            <Select
              label="Status"
              value={complaintStatus}
              onChange={(e) => {
                setComplaintStatus(e.target.value);
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
              label="Category"
              value={complaintCategory}
              onChange={(e) => {
                setComplaintCategory(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Categories' },
                { value: 'ELECTRICAL', label: 'Electrical' },
                { value: 'PLUMBING', label: 'Plumbing' },
                { value: 'CARPENTRY', label: 'Carpentry' },
                { value: 'CLEANING', label: 'Cleaning' },
                { value: 'FURNITURE', label: 'Furniture' },
                { value: 'INTERNET', label: 'Internet' },
                { value: 'OTHER', label: 'Other' },
              ]}
            />
            <Select
              label="Priority"
              value={complaintPriority}
              onChange={(e) => {
                setComplaintPriority(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Priorities' },
                { value: 'URGENT', label: 'Urgent' },
                { value: 'HIGH', label: 'High' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'LOW', label: 'Low' },
              ]}
            />
            <DateRangeFilter
              fromDate={fromDate}
              toDate={toDate}
              onFromChange={(v) => {
                setFromDate(v);
                setPage(1);
              }}
              onToChange={(v) => {
                setToDate(v);
                setPage(1);
              }}
            />
          </>
        )}

        {tab === 'leave' && (
          <>
            <Select
              label="Status"
              value={leaveStatus}
              onChange={(e) => {
                setLeaveStatus(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'REJECTED', label: 'Rejected' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
            <DateRangeFilter
              fromDate={fromDate}
              toDate={toDate}
              onFromChange={(v) => {
                setFromDate(v);
                setPage(1);
              }}
              onToChange={(v) => {
                setToDate(v);
                setPage(1);
              }}
            />
          </>
        )}

        {tab === 'visitors' && (
          <>
            <Select
              label="Visitor Status"
              value={visitorStatus}
              onChange={(e) => {
                setVisitorStatus(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'INSIDE', label: 'Currently Inside' },
                { value: 'EXITED', label: 'Exited' },
              ]}
            />
            <DateRangeFilter
              fromDate={fromDate}
              toDate={toDate}
              onFromChange={(v) => {
                setFromDate(v);
                setPage(1);
              }}
              onToChange={(v) => {
                setToDate(v);
                setPage(1);
              }}
            />
          </>
        )}
      </FilterBar>

      {/* Report Data Table */}
      <Table
        data={data}
        columns={getColumns()}
        keyExtractor={(r) => r.id}
        loading={loading}
        emptyMessage={`No ${tabs.find((t) => t.id === tab)?.label.toLowerCase()} matching your filter criteria.`}
        pagination={{
          page,
          totalPages,
          total,
          limit,
          onPageChange: (p) => setPage(p),
        }}
      />
    </div>
  );
}
