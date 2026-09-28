import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { FileQuestion } from 'lucide-react';

export function NotFound() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden w-full max-w-lg">
        <EmptyState
          title="Page Not Found"
          description="The page you are looking for doesn't exist or has been moved."
          icon={<FileQuestion size={48} className="text-indigo-400 mb-4" />}
          actions={
            <Link to="/app/dashboard">
              <Button>Return to Dashboard</Button>
            </Link>
          }
        />
      </div>
    </div>
  );
}
