import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Search, Eye } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Table } from '@/components/Table';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { Badge } from '@/components/Badge';
import { Modal } from '@/components/Modal';
import { useToast } from '@/hooks/useToast';
import { studentService } from '@/services/studentService';
import type { Student, PaginatedResult } from '@/types';

const createStudentSchema = z.object({
  student_id: z.string().min(1, 'Student ID is required'),
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  contact_number: z.string().min(5, 'Contact number is required'),
  department: z.string().min(2, 'Department is required'),
  address: z.string().min(5, 'Address is required'),
  admission_date: z.string().min(1, 'Admission date is required'),
});

type CreateStudentForm = z.infer<typeof createStudentSchema>;

export function Students() {
  const [data, setData] = useState<PaginatedResult<Student> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [isActive, setIsActive] = useState<string>('all');
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<CreateStudentForm>({
    resolver: zodResolver(createStudentSchema),
  });

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const result = await studentService.getStudents({
        page,
        limit: 10,
        search: search || undefined,
        department: department || undefined,
        is_active: isActive !== 'all' ? isActive : undefined,
      });
      setData(result);
    } catch (err: any) {
      toast({
        title: 'Error fetching students',
        description: err.response?.data?.message || 'Something went wrong',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [page, search, department, isActive]);

  const handleCreate = async (data: CreateStudentForm) => {
    try {
      await studentService.createStudent(data);
      toast({ title: 'Student created successfully', type: 'success' });
      setIsCreateModalOpen(false);
      reset();
      fetchStudents();
    } catch (err: any) {
      toast({
        title: 'Error creating student',
        description: err.response?.data?.message || 'Something went wrong',
        type: 'error',
      });
    }
  };

  const columns = [
    { header: 'Student ID', accessor: (student: Student) => <span className="font-medium">{student.student_id}</span> },
    { header: 'Name', accessor: (student: Student) => student.full_name },
    { header: 'Department', accessor: (student: Student) => student.department },
    { header: 'Contact', accessor: (student: Student) => student.contact_number },
    { 
      header: 'Status', 
      accessor: (student: Student) => (
        <Badge variant={student.is_active ? 'success' : 'danger'}>
          {student.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ) 
    },
    {
      header: 'Actions',
      accessor: (student: Student) => (
        <Button size="sm" variant="outline" onClick={() => navigate(`/app/students/${student.id}`)}>
          <Eye size={16} className="mr-2" /> View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Students" 
        description="Manage student profiles and admissions."
        actions={
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={20} className="mr-2" /> Add Student
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by ID or name..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select 
            value={department} 
            onChange={(e) => { setDepartment(e.target.value); setPage(1); }}
            options={[
              { value: "", label: "All Departments" },
              { value: "Computer Science", label: "Computer Science" },
              { value: "Mechanical", label: "Mechanical" },
              { value: "Electrical", label: "Electrical" },
              { value: "Civil", label: "Civil" }
            ]}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select 
            value={isActive} 
            onChange={(e) => { setIsActive(e.target.value); setPage(1); }}
            options={[
              { value: "all", label: "All Status" },
              { value: "true", label: "Active" },
              { value: "false", label: "Inactive" }
            ]}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <Table keyExtractor={(row: any) => row.id || Math.random().toString()}
          columns={columns}
          data={data?.items || []}
          loading={loading}
          emptyMessage="No students found."
        />
        {data && data.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100">
            <Pagination
              page={data.page}
              total={data.total} limit={data.limit} totalPages={data.totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      <Modal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add New Student"
      >
        <form onSubmit={handleSubmit(handleCreate)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Student ID" {...register('student_id')} error={errors.student_id?.message} />
            <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
            
            <Input label="Full Name" {...register('full_name')} error={errors.full_name?.message} />
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
            <Input label="Department" {...register('department')} error={errors.department?.message} />
            
            <Input label="Admission Date" type="date" {...register('admission_date')} error={errors.admission_date?.message} />
          </div>
          
          <Input label="Address" {...register('address')} error={errors.address?.message} />

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Add Student
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
