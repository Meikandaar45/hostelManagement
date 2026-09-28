import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from '@/layouts/AuthLayout';
import { AppLayout } from '@/layouts/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';

// Pages
import { Setup } from '@/pages/Setup';
import { Login } from '@/pages/Login';
import { ForgotPassword } from '@/pages/ForgotPassword';
import { ResetPassword } from '@/pages/ResetPassword';
import { Dashboard } from '@/pages/Dashboard';
import { Users } from '@/pages/Users';
import { Audit } from '@/pages/Audit';
import { Profile } from '@/pages/Profile';
import { NotFound } from '@/pages/NotFound';

// Phase 2 Admin/Warden
import { Students } from '@/pages/Students';
import { StudentProfile } from '@/pages/StudentProfile';
import { Rooms } from '@/pages/Rooms';
import { Fees } from '@/pages/Fees';
import { Receipt } from '@/pages/Receipt';

// Phase 2 Student
import { MyProfile } from '@/pages/student/MyProfile';
import { MyRoom } from '@/pages/student/MyRoom';
import { MyFees } from '@/pages/student/MyFees';

// Phase 3 Pages
import { Complaints } from '@/pages/Complaints';
import { MyTasks } from '@/pages/maintenance/MyTasks';
import { Visitors } from '@/pages/Visitors';
import { StudentLeave } from '@/pages/student/Leave';
import { LeaveRequests } from '@/pages/LeaveRequests';
import { GatePass } from '@/pages/GatePass';
import { Notifications } from '@/pages/Notifications';
import { Reports } from '@/pages/Reports';

export function AppRoutes() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/app/dashboard" replace />} />

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/setup" element={<Setup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
      </Route>

      {/* Protected App Routes */}
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="notifications" element={<Notifications />} />
        
        {/* Admin only routes */}
        <Route element={<ProtectedRoute roles={['ADMIN']} />}>
          <Route path="users" element={<Users />} />
          <Route path="audit" element={<Audit />} />
          <Route path="audit-logs" element={<Audit />} />
        </Route>

        {/* Admin & Warden routes */}
        <Route element={<ProtectedRoute roles={['ADMIN', 'WARDEN']} />}>
          <Route path="students" element={<Students />} />
          <Route path="students/:id" element={<StudentProfile />} />
          <Route path="rooms" element={<Rooms />} />
          <Route path="fees" element={<Fees />} />
          <Route path="leave/requests" element={<LeaveRequests />} />
          <Route path="reports" element={<Reports />} />
        </Route>

        {/* Complaints (Admin, Warden, Student) */}
        <Route element={<ProtectedRoute roles={['ADMIN', 'WARDEN', 'STUDENT']} />}>
          <Route path="complaints" element={<Complaints />} />
          <Route path="fees/receipt/:id" element={<Receipt />} />
        </Route>

        {/* Maintenance Only */}
        <Route element={<ProtectedRoute roles={['MAINTENANCE']} />}>
          <Route path="my-tasks" element={<MyTasks />} />
        </Route>

        {/* Visitors (Admin, Warden, Student) */}
        <Route element={<ProtectedRoute roles={['ADMIN', 'WARDEN', 'STUDENT']} />}>
          <Route path="visitors" element={<Visitors />} />
        </Route>

        {/* Student Leave & Room */}
        <Route element={<ProtectedRoute roles={['STUDENT']} />}>
          <Route path="my-profile" element={<MyProfile />} />
          <Route path="my-room" element={<MyRoom />} />
          <Route path="my-fees" element={<MyFees />} />
          <Route path="leave" element={<StudentLeave />} />
        </Route>

        {/* Gate Pass View (Student, Admin, Warden) */}
        <Route element={<ProtectedRoute roles={['ADMIN', 'WARDEN', 'STUDENT']} />}>
          <Route path="leave/gate-pass/:id" element={<GatePass />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
