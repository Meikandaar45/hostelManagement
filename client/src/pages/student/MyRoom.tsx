import { useState, useEffect } from 'react';
import { Home, Users, BedDouble } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { LoadingState } from '@/components/LoadingState';
import { meService } from '@/services/meService';
import { useToast } from '@/hooks/useToast';

export function MyRoom() {
  const [allocation, setAllocation] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const data = await meService.getMyRoom();
        setAllocation(data);
      } catch (err) {
        toast({ title: 'Error', description: 'Could not load room allocation', type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchRoom();
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader 
        title="My Room" 
        description="View your current hostel accommodation details."
      />

      {!allocation ? (
        <div className="bg-white p-12 rounded-xl border border-slate-100 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <BedDouble className="text-slate-400" size={32} />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">No Room Allocated</h3>
          <p className="text-slate-500 max-w-sm">
            You do not have an active room allocation at this time. Please contact your warden for assistance.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-100">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center">
                <Home size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Room {allocation.room_number}</h2>
                <p className="text-slate-500">{allocation.room_type.replace('_', ' ')} Room</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <p className="text-sm text-slate-500 mb-1">Block</p>
                <p className="text-lg font-semibold text-slate-900">{allocation.block}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <p className="text-sm text-slate-500 mb-1">Floor</p>
                <p className="text-lg font-semibold text-slate-900">{allocation.floor}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <p className="text-sm text-slate-500 mb-1 flex items-center gap-1"><Users size={14} /> Occupancy</p>
                <p className="text-lg font-semibold text-slate-900">
                  {allocation.current_occupancy} <span className="text-slate-400 font-medium text-sm">/ {allocation.capacity}</span>
                </p>
              </div>
            </div>
          </div>
          <div className="p-8 bg-slate-50">
            <p className="text-sm text-slate-500">
              Allocated on: <span className="font-medium text-slate-700">{new Date(allocation.allocated_at).toLocaleDateString()}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
