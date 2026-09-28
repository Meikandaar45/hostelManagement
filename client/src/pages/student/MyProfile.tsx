import { useState, useEffect } from 'react';
import { User, Info } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/Badge';
import { LoadingState } from '@/components/LoadingState';
import { meService } from '@/services/meService';
import type { Student } from '@/types';
import { useToast } from '@/hooks/useToast';

export function MyProfile() {
  const [profile, setProfile] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await meService.getMyProfile();
        setProfile(data);
      } catch (err) {
        toast({ title: 'Error', description: 'Could not load profile', type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) return <LoadingState />;
  if (!profile) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader 
        title="My Profile" 
        description="View your personal and academic details."
      />

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center">
            <User size={40} />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900">{profile.full_name}</h1>
              <Badge variant={profile.is_active ? 'success' : 'danger'}>
                {profile.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-slate-500">Student ID: <span className="font-medium text-slate-700">{profile.student_id}</span></p>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Info size={20} className="text-primary-500" />
            Personal Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
            <div>
              <p className="text-sm text-slate-500 mb-1">Gender</p>
              <p className="font-medium text-slate-900 capitalize">{profile.gender.toLowerCase()}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Contact Number</p>
              <p className="font-medium text-slate-900">{profile.contact_number}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Department</p>
              <p className="font-medium text-slate-900">{profile.department}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Admission Date</p>
              <p className="font-medium text-slate-900">{new Date(profile.admission_date).toLocaleDateString()}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-sm text-slate-500 mb-1">Address</p>
              <p className="font-medium text-slate-900">{profile.address}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
