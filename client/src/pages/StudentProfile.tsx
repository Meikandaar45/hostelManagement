import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Edit, Power, Check, Info } from 'lucide-react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { Badge } from '@/components/Badge';
import { Modal } from '@/components/Modal';
import { LoadingState } from '@/components/LoadingState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { studentService } from '@/services/studentService';
import type { Student } from '@/types';

const updateStudentSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  contact_number: z.string().min(5, 'Contact number is required'),
  department: z.string().min(2, 'Department is required'),
  address: z.string().min(5, 'Address is required'),
});

type UpdateStudentForm = z.infer<typeof updateStudentSchema>;

export function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [isStatusLoading, setIsStatusLoading] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<UpdateStudentForm>({
    resolver: zodResolver(updateStudentSchema),
  });

  const fetchStudent = async () => {
    try {
      const data = await studentService.getStudent(parseInt(id!));
      setStudent(data);
      reset({
        full_name: data.full_name,
        gender: data.gender,
        contact_number: data.contact_number,
        department: data.department,
        address: data.address,
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Could not load student profile',
        type: 'error',
      });
      navigate('/app/students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudent();
  }, [id]);

  const handleUpdate = async (data: UpdateStudentForm) => {
    try {
      await studentService.updateStudent(parseInt(id!), data);
      toast({ title: 'Student updated successfully', type: 'success' });
      setIsEditModalOpen(false);
      fetchStudent();
    } catch (err: any) {
      toast({
        title: 'Error updating student',
        description: err.response?.data?.message || 'Something went wrong',
        type: 'error',
      });
    }
  };

  const toggleStatus = async () => {
    if (!student) return;
    setIsStatusLoading(true);
    try {
      await studentService.setStatus(student.id, !student.is_active);
      toast({ title: `Student marked as ${!student.is_active ? 'Active' : 'Inactive'}`, type: 'success' });
      setIsStatusConfirmOpen(false);
      fetchStudent();
    } catch (err: any) {
      toast({
        title: 'Error updating status',
        description: err.response?.data?.message || 'Something went wrong',
        type: 'error',
      });
    } finally {
      setIsStatusLoading(false);
    }
  };

  if (loading) return <LoadingState />;
  if (!student) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/app/students')}>
          <ArrowLeft size={16} className="mr-2" /> Back
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900">{student.full_name}</h1>
              <Badge variant={student.is_active ? 'success' : 'danger'}>
                {student.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-slate-500">Student ID: <span className="font-medium text-slate-700">{student.student_id}</span></p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setIsEditModalOpen(true)}>
              <Edit size={16} className="mr-2" /> Edit Profile
            </Button>
            <Button 
              variant={student.is_active ? 'danger' : 'outline'} 
              className="flex-1 sm:flex-none"
              onClick={() => setIsStatusConfirmOpen(true)}
            >
              {student.is_active ? (
                <><Power size={16} className="mr-2" /> Deactivate</>
              ) : (
                <><Check size={16} className="mr-2" /> Activate</>
              )}
            </Button>
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
              <p className="font-medium text-slate-900 capitalize">{student.gender.toLowerCase()}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Contact Number</p>
              <p className="font-medium text-slate-900">{student.contact_number}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Department</p>
              <p className="font-medium text-slate-900">{student.department}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Admission Date</p>
              <p className="font-medium text-slate-900">{new Date(student.admission_date).toLocaleDateString()}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-sm text-slate-500 mb-1">Address</p>
              <p className="font-medium text-slate-900">{student.address}</p>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Student Profile"
      >
        <form onSubmit={handleSubmit(handleUpdate)} className="space-y-4">
          <Input label="Full Name" {...register('full_name')} error={errors.full_name?.message} />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Gender</label>
              <Select 
                {...register('gender')} 
                error={errors.gender?.message}
                options={[
                  { value: "MALE", label: "Male" },
                  { value: "FEMALE", label: "Female" },
                  { value: "OTHER", label: "Other" }
                ]}
              />
            </div>
            <Input label="Contact Number" {...register('contact_number')} error={errors.contact_number?.message} />
          </div>
          
          <Input label="Department" {...register('department')} error={errors.department?.message} />
          <Input label="Address" {...register('address')} error={errors.address?.message} />

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={isStatusConfirmOpen}
        onClose={() => setIsStatusConfirmOpen(false)}
        onConfirm={toggleStatus}
        title={student.is_active ? 'Deactivate Student' : 'Activate Student'}
        description={`Are you sure you want to ${student.is_active ? 'deactivate' : 'activate'} ${student.full_name}? ${student.is_active ? 'They will no longer be able to log in.' : ''}`}
        confirmLabel={student.is_active ? 'Deactivate' : 'Activate'}
        variant={student.is_active ? 'danger' : 'warning'}
        loading={isStatusLoading}
      />
    </div>
  );
}
