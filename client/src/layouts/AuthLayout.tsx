import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingState } from '@/components/LoadingState';
import { HostelLogo } from '@/components/HostelLogo';

export function AuthLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <LoadingState text="Authenticating..." />
      </div>
    );
  }

  // If already logged in, redirect to app
  if (user) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <HostelLogo size="lg" className="mb-4 inline-flex" />
          <h1 className="text-2xl font-bold text-white tracking-tight">Hostel Management</h1>
          <p className="text-slate-400 mt-2 text-sm">Secure administration platform</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
