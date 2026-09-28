import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { StatusBadge, PriorityBadge } from '@/components/Badge';
import { LoadingState } from '@/components/LoadingState';
import { dashboardService } from '@/services/dashboardService';
import {
  Users,
  Home,
  CreditCard,
  MessageSquare,
  DoorOpen,
  CalendarCheck,
  Wrench,
  AlertTriangle,
  Bell,
  FileSpreadsheet,
} from 'lucide-react';

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await dashboardService.getSummary();
        setData(res);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load dashboard metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [user]);

  if (loading) {
    return (
      <div className="py-12">
        <LoadingState text="Loading dashboard metrics..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-center space-y-3">
        <AlertTriangle className="mx-auto text-red-400" size={32} />
        <h3 className="text-lg font-bold text-red-200">Unable to load dashboard</h3>
        <p className="text-sm text-slate-400">{error}</p>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!data || !user) return null;

  const m = data.metrics || {};
  const recent = data.recent || {};
  const recentPayments = recent.payments || [];
  const recentComplaints = recent.complaints || [];
  const recentLeaves = recent.leaves || [];
  const recentVisitors = recent.visitors || [];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={`${user.role === 'ADMIN' ? 'Executive' : user.role === 'WARDEN' ? 'Operations' : user.role === 'MAINTENANCE' ? 'Maintenance' : 'Student'} Dashboard`}
        description={`Welcome back, ${user.full_name}. Real-time operational overview.`}
      />

      {/* ======================================================== */}
      {/* 1. ADMIN DASHBOARD */}
      {/* ======================================================== */}
      {user.role === 'ADMIN' && (
        <div className="space-y-6">
          {/* Main Key Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card
              className="p-5 bg-slate-950 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
              onClick={() => navigate('/app/students')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Total Students
                  </p>
                  <h3 className="text-2xl font-bold text-slate-100 mt-1">
                    {m.total_students ?? 0}
                  </h3>
                  <p className="text-xs text-emerald-400 mt-1 font-medium">
                    {m.active_students ?? 0} Active
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                  <Users size={22} />
                </div>
              </div>
            </Card>

            <Card
              className="p-5 bg-slate-950 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
              onClick={() => navigate('/app/rooms')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Rooms / Beds
                  </p>
                  <h3 className="text-2xl font-bold text-slate-100 mt-1">
                    {m.total_rooms ?? 0} Rooms
                  </h3>
                  <p className="text-xs text-indigo-400 mt-1 font-medium">
                    {m.occupied_beds ?? 0} / {m.total_capacity ?? 0} Beds ({m.occupied_rooms ?? 0} Occupied)
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <Home size={22} />
                </div>
              </div>
            </Card>

            <Card
              className="p-5 bg-slate-950 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
              onClick={() => navigate('/app/fees')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Pending Fees
                  </p>
                  <h3 className="text-2xl font-bold text-slate-100 mt-1">
                    {m.pending_fees ?? 0}
                  </h3>
                  <p className="text-xs text-rose-400 mt-1 font-medium">
                    {m.overdue_fees ?? 0} Overdue (${(Number(m.pending_fee_balance) || 0).toLocaleString()})
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                  <CreditCard size={22} />
                </div>
              </div>
            </Card>

            <Card
              className="p-5 bg-slate-950 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
              onClick={() => navigate('/app/complaints')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Open Complaints
                  </p>
                  <h3 className="text-2xl font-bold text-slate-100 mt-1">
                    {m.open_complaints ?? 0}
                  </h3>
                  <p className="text-xs text-amber-400 mt-1 font-medium">
                    {m.pending_complaints ?? 0} Pending Review
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                  <MessageSquare size={22} />
                </div>
              </div>
            </Card>
          </div>

          {/* Secondary Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Available Rooms</p>
                <p className="text-xl font-bold text-emerald-400">{m.available_rooms ?? 0}</p>
              </div>
              <span className="text-xs text-slate-500">{m.full_rooms ?? 0} Full</span>
            </div>

            <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Total Collections</p>
                <p className="text-xl font-bold text-indigo-400">${(Number(m.total_payments_amount) || 0).toLocaleString()}</p>
              </div>
              <span className="text-xs text-slate-500">{m.total_payments_count ?? 0} Receipts</span>
            </div>

            <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Active Tasks</p>
                <p className="text-xl font-bold text-amber-400">{m.active_maintenance_tasks ?? 0}</p>
              </div>
              <Wrench size={16} className="text-slate-500" />
            </div>

            <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Visitors Currently Inside</p>
                <p className="text-xl font-bold text-teal-400">{m.current_visitors ?? 0}</p>
              </div>
              <span className="text-xs text-slate-500">{m.pending_leave_requests ?? 0} Leave Reqs</span>
            </div>
          </div>

          {/* Recent Activity Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Payments */}
            <Card className="bg-slate-950 border border-slate-800 p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <CreditCard size={18} className="text-indigo-400" />
                  <h4 className="font-semibold text-slate-200 text-sm">Recent Payments</h4>
                </div>
                <Button size="sm" variant="ghost" onClick={() => navigate('/app/fees')} className="text-xs">
                  View All
                </Button>
              </div>
              <div className="space-y-3">
                {recentPayments.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No recent payments recorded</p>
                ) : (
                  recentPayments.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900/50 hover:bg-slate-900">
                      <div>
                        <p className="font-semibold text-slate-200">{p.student_name} <span className="text-slate-500">({p.student_id})</span></p>
                        <p className="text-slate-500 text-[11px] mt-0.5">Receipt: {p.receipt_number} • {p.payment_method}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-400 block">${Number(p.amount).toFixed(2)}</span>
                        <span className="text-slate-500 text-[10px]">{new Date(p.paid_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Recent Complaints */}
            <Card className="bg-slate-950 border border-slate-800 p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <MessageSquare size={18} className="text-amber-400" />
                  <h4 className="font-semibold text-slate-200 text-sm">Recent Complaints</h4>
                </div>
                <Button size="sm" variant="ghost" onClick={() => navigate('/app/complaints')} className="text-xs">
                  View All
                </Button>
              </div>
              <div className="space-y-3">
                {recentComplaints.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No complaints logged</p>
                ) : (
                  recentComplaints.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900/50 hover:bg-slate-900">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-indigo-400 font-semibold">{c.ticket_id}</span>
                          <StatusBadge status={c.status} />
                        </div>
                        <p className="text-slate-400 mt-1">Room {c.room_number} • {c.student_name}</p>
                      </div>
                      <div className="text-right">
                        <PriorityBadge priority={c.priority} />
                        <p className="text-slate-500 text-[10px] mt-1">{new Date(c.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Recent Leaves */}
            <Card className="bg-slate-950 border border-slate-800 p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <CalendarCheck size={18} className="text-rose-400" />
                  <h4 className="font-semibold text-slate-200 text-sm">Recent Leave Requests</h4>
                </div>
                <Button size="sm" variant="ghost" onClick={() => navigate('/app/leave/requests')} className="text-xs">
                  View All
                </Button>
              </div>
              <div className="space-y-3">
                {recentLeaves.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No leave requests found</p>
                ) : (
                  recentLeaves.map((l: any) => (
                    <div key={l.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900/50 hover:bg-slate-900">
                      <div>
                        <p className="font-semibold text-slate-200">{l.student_name}</p>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          {new Date(l.from_datetime).toLocaleDateString()} to {new Date(l.to_datetime).toLocaleDateString()}
                        </p>
                      </div>
                      <StatusBadge status={l.status} />
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Recent Visitors */}
            <Card className="bg-slate-950 border border-slate-800 p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <DoorOpen size={18} className="text-teal-400" />
                  <h4 className="font-semibold text-slate-200 text-sm">Recent Visitor Entries</h4>
                </div>
                <Button size="sm" variant="ghost" onClick={() => navigate('/app/visitors')} className="text-xs">
                  View All
                </Button>
              </div>
              <div className="space-y-3">
                {recentVisitors.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No visitors recorded</p>
                ) : (
                  recentVisitors.map((v: any) => (
                    <div key={v.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900/50 hover:bg-slate-900">
                      <div>
                        <p className="font-semibold text-slate-200">{v.visitor_name} <span className="text-slate-500">({v.phone})</span></p>
                        <p className="text-slate-500 text-[11px] mt-0.5">Visiting: {v.student_name} • {v.purpose}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${v.exit_at ? 'bg-slate-800 text-slate-400' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                        {v.exit_at ? 'Exited' : 'Inside'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      )}


      {/* ======================================================== */}
      {/* ======================================================== */}
      {/* 2. WARDEN DASHBOARD */}
      {/* ======================================================== */}
      {user.role === 'WARDEN' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 bg-slate-950 border border-slate-800">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Students</p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">{m.total_students ?? 0}</h3>
              <p className="text-xs text-slate-500 mt-1">Active residents</p>
            </Card>

            <Card className="p-5 bg-slate-950 border border-slate-800">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Occupancy Rate</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">{m.occupancy_rate ?? 0}%</h3>
              <p className="text-xs text-slate-500 mt-1">{m.occupied_beds ?? 0} of {m.total_capacity ?? 0} beds filled</p>
            </Card>

            <Card className="p-5 bg-slate-950 border border-slate-800">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Open Complaints</p>
              <h3 className="text-2xl font-bold text-amber-400 mt-1">{m.open_complaints ?? 0}</h3>
              <p className="text-xs text-slate-500 mt-1">{m.pending_complaints ?? 0} pending assignment</p>
            </Card>

            <Card className="p-5 bg-slate-950 border border-slate-800">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Leaves</p>
              <h3 className="text-2xl font-bold text-rose-400 mt-1">{m.pending_leave_requests ?? 0}</h3>
              <p className="text-xs text-slate-500 mt-1">{m.approved_leaves ?? 0} approved recently</p>
            </Card>
          </div>

          {/* Quick Links for Warden */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Students', path: '/app/students', icon: Users, color: 'text-blue-400' },
              { label: 'Rooms', path: '/app/rooms', icon: Home, color: 'text-emerald-400' },
              { label: 'Complaints', path: '/app/complaints', icon: MessageSquare, color: 'text-amber-400' },
              { label: 'Visitors', path: '/app/visitors', icon: DoorOpen, color: 'text-teal-400' },
              { label: 'Leave Requests', path: '/app/leave/requests', icon: CalendarCheck, color: 'text-rose-400' },
              { label: 'Reports', path: '/app/reports', icon: FileSpreadsheet, color: 'text-indigo-400' },
            ].map((link) => {
              const Icon = link.icon;
              return (
                <Card
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className="p-4 bg-slate-950 border border-slate-800 hover:border-slate-700 transition cursor-pointer flex flex-col items-center justify-center text-center gap-2"
                >
                  <div className={`p-2.5 rounded-lg bg-slate-900 ${link.color}`}>
                    <Icon size={20} />
                  </div>
                  <span className="text-xs font-semibold text-slate-300">{link.label}</span>
                </Card>
              );
            })}
          </div>

          {/* Operational Feeds */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-950 border border-slate-800 p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <h4 className="font-semibold text-slate-200 text-sm">Complaints Requiring Action</h4>
                <Button size="sm" variant="ghost" onClick={() => navigate('/app/complaints')} className="text-xs">
                  Manage
                </Button>
              </div>
              <div className="space-y-3">
                {recentComplaints.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No complaints requiring action</p>
                ) : (
                  recentComplaints.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900/50">
                      <div>
                        <p className="font-mono text-indigo-400 font-semibold">{c.ticket_id} • Room {c.room_number}</p>
                        <p className="text-slate-400">{c.student_name}</p>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="bg-slate-950 border border-slate-800 p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <h4 className="font-semibold text-slate-200 text-sm">Recent Leave Submissions</h4>
                <Button size="sm" variant="ghost" onClick={() => navigate('/app/leave/requests')} className="text-xs">
                  Review
                </Button>
              </div>
              <div className="space-y-3">
                {recentLeaves.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No leave requests found</p>
                ) : (
                  recentLeaves.map((l: any) => (
                    <div key={l.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900/50">
                      <div>
                        <p className="font-semibold text-slate-200">{l.student_name}</p>
                        <p className="text-slate-500 text-[11px]">{new Date(l.from_datetime).toLocaleDateString()} - {new Date(l.to_datetime).toLocaleDateString()}</p>
                      </div>
                      <StatusBadge status={l.status} />
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. STUDENT DASHBOARD */}
      {/* ======================================================== */}
      {user.role === 'STUDENT' && (
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2.5">
            <Button size="sm" onClick={() => navigate('/app/complaints')} className="gap-1.5">
              <MessageSquare size={14} /> Raise Complaint
            </Button>
            <Button size="sm" variant="secondary" onClick={() => navigate('/app/leave')} className="gap-1.5">
              <CalendarCheck size={14} /> Apply Leave
            </Button>
            <Button size="sm" variant="ghost" onClick={() => navigate('/app/my-fees')} className="gap-1.5">
              <CreditCard size={14} /> View Fees
            </Button>
            <Button size="sm" variant="ghost" onClick={() => navigate('/app/my-room')} className="gap-1.5">
              <Home size={14} /> View Room
            </Button>
            <Button size="sm" variant="ghost" onClick={() => navigate('/app/notifications')} className="gap-1.5">
              <Bell size={14} /> Notifications
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile & Room Summary */}
            <Card className="bg-slate-950 border border-slate-800 p-5 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                  {data.profile?.full_name?.[0] || 'S'}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-100 text-sm">{data.profile?.full_name || user.full_name}</h4>
                  <p className="text-xs text-slate-500">ID: {data.profile?.student_id || 'N/A'} • {data.profile?.department || 'Hostel'}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">My Room</p>
                {data.room ? (
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                    <p className="text-lg font-bold text-slate-100">Room {data.room.room_number}</p>
                    <p className="text-xs text-slate-400">Block {data.room.block}, Floor {data.room.floor} ({data.room.room_type})</p>
                    <p className="text-[11px] text-slate-500 pt-1">Capacity: {data.room.capacity} students</p>
                  </div>
                ) : (
                  <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">
                    No active room allocation assigned yet.
                  </p>
                )}
              </div>
            </Card>

            {/* Financial Overview */}
            {(() => {
              const fin = data.financial || { outstanding_balance: 0, total_due: 0, total_paid: 0, upcoming_fees: [] };
              const comp = data.complaints || { open_count: 0, latest: null };
              const lvs = data.leave?.requests || [];
              const balance = Number(fin.outstanding_balance) || 0;
              const totalDue = Number(fin.total_due) || 0;
              const totalPaid = Number(fin.total_paid) || 0;
              const upcomingFees = Array.isArray(fin.upcoming_fees) ? fin.upcoming_fees : [];

              return (
                <>
                  <Card className="bg-slate-950 border border-slate-800 p-5 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <h4 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
                        <CreditCard size={16} className="text-purple-400" />
                        Fee Status
                      </h4>
                      <Button size="sm" variant="ghost" onClick={() => navigate('/app/my-fees')} className="text-xs">
                        Details
                      </Button>
                    </div>

                    <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
                      <p className="text-xs text-slate-400 font-medium">Outstanding Balance</p>
                      <h3 className={`text-2xl font-bold mt-1 ${balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        ${balance.toFixed(2)}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Total Due: ${totalDue.toFixed(2)} • Paid: ${totalPaid.toFixed(2)}
                      </p>
                    </div>

                    {upcomingFees.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Upcoming Due Dates</p>
                        {upcomingFees.map((uf: any) => (
                          <div key={uf.id} className="flex items-center justify-between text-xs py-1">
                            <span className="text-slate-300">{uf.fee_type}</span>
                            <span className="text-rose-400 font-medium">Due {new Date(uf.due_date).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Latest Complaint & Leave */}
                  <Card className="bg-slate-950 border border-slate-800 p-5 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <h4 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
                        <MessageSquare size={16} className="text-amber-400" />
                        Complaints & Leave
                      </h4>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400 font-medium mb-1">Open Complaints: <span className="font-bold text-slate-200">{comp.open_count || 0}</span></p>
                      {comp.latest ? (
                        <div className="p-3 bg-slate-900 rounded-lg text-xs space-y-1 border border-slate-800">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-indigo-400">{comp.latest.ticket_id}</span>
                            <StatusBadge status={comp.latest.status} />
                          </div>
                          <p className="text-slate-300 truncate">{comp.latest.description}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">No complaints submitted</p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800">
                      <p className="text-xs text-slate-400 font-medium mb-1">Recent Leave Applications</p>
                      {lvs.length > 0 ? (
                        <div className="space-y-1.5">
                          {lvs.slice(0, 2).map((lr: any) => (
                            <div key={lr.id} className="flex items-center justify-between text-xs p-2 bg-slate-900 rounded border border-slate-800">
                              <div>
                                <p className="text-slate-300">{new Date(lr.from_datetime).toLocaleDateString()}</p>
                                {lr.gate_pass_number && <p className="text-[10px] text-emerald-400 font-mono">{lr.gate_pass_number}</p>}
                              </div>
                              <StatusBadge status={lr.status} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">No leave applications</p>
                      )}
                    </div>
                  </Card>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. MAINTENANCE DASHBOARD */}
      {/* ======================================================== */}
      {user.role === 'MAINTENANCE' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 bg-slate-950 border border-slate-800">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assigned Pending</p>
              <h3 className="text-3xl font-extrabold text-amber-400 mt-1">{m.pending_tasks ?? 0}</h3>
              <p className="text-xs text-slate-500 mt-1">Pending start</p>
            </Card>

            <Card className="p-5 bg-slate-950 border border-slate-800">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">In Progress</p>
              <h3 className="text-3xl font-extrabold text-indigo-400 mt-1">{m.in_progress_tasks ?? 0}</h3>
              <p className="text-xs text-slate-500 mt-1">Currently working</p>
            </Card>

            <Card className="p-5 bg-slate-950 border border-slate-800">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Urgent / High Priority</p>
              <h3 className="text-3xl font-extrabold text-rose-400 mt-1">{m.urgent_tasks ?? 0}</h3>
              <p className="text-xs text-slate-500 mt-1">Requires immediate attention</p>
            </Card>

            <Card className="p-5 bg-slate-950 border border-slate-800">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Resolved</p>
              <h3 className="text-3xl font-extrabold text-emerald-400 mt-1">{m.resolved_tasks ?? 0}</h3>
              <p className="text-xs text-slate-500 mt-1">Completed repairs</p>
            </Card>
          </div>

          {/* Quick link button to My Tasks */}
          <div className="flex justify-end">
            <Button onClick={() => navigate('/app/my-tasks')} className="gap-2">
              <Wrench size={16} /> Open Work Portal (My Tasks)
            </Button>
          </div>

          {/* Assigned Tasks Priority List */}
          <Card className="bg-slate-950 border border-slate-800 p-5">
            <h4 className="font-semibold text-slate-200 text-sm mb-4">Assigned Work Tickets</h4>
            {(data.tasks || []).length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No active tasks assigned at this moment.</p>
            ) : (
              <div className="space-y-3">
                {(data.tasks || []).map((t: any) => (
                  <Card
                    key={t.id}
                    padding={false}
                    onClick={() => navigate('/app/my-tasks')}
                    aria-label={`View maintenance task ${t.ticket_id} for room ${t.room_number}`}
                    className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 hover:border-slate-700 transition cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-indigo-400 font-bold text-sm">{t.ticket_id}</span>
                        <PriorityBadge priority={t.priority} />
                        <StatusBadge status={t.status} />
                      </div>
                      <p className="text-sm font-semibold text-slate-200 mt-1.5">{t.category} — Room {t.room_number} (Block {t.block}, Floor {t.floor})</p>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{t.description}</p>
                      <p className="text-[11px] text-slate-500 mt-1">Student: {t.student_name} ({t.student_contact})</p>
                    </div>
                    <Button size="sm" variant="secondary" className="text-xs shrink-0">
                      Update Task
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
