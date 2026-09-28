import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Table, type Column } from '@/components/Table';
import { Button } from '@/components/Button';
import { RoleBadge, StatusBadge } from '@/components/Badge';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { userService, type ListUsersParams } from '@/services/userService';
import type { User, Role } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const ALL_ROLES: Role[] = ['ADMIN', 'WARDEN', 'STUDENT', 'MAINTENANCE'];

const createUserSchema = z.object({
  full_name: z.string().min(2),
  username: z.string().min(3).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'WARDEN', 'STUDENT', 'MAINTENANCE']),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
});

const updateUserSchema = z.object({
  full_name: z.string().min(2),
  username: z.string().min(3).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'WARDEN', 'STUDENT', 'MAINTENANCE']),
});

export function Users() {
  const [data, setData] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState<ListUsersParams>({ page: 1, limit: 10 });
  const { toast } = useToast();

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const [statusConfirm, setStatusConfirm] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userService.list(params);
      setData(res.items || (res as any).users || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      toast('danger', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [params, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setParams({
      ...params,
      page: 1,
      search: fd.get('search') as string || undefined,
      role: fd.get('role') as Role || undefined,
      is_active: fd.get('is_active') as 'true' | 'false' || undefined,
    });
  };

  const handleToggleStatus = async () => {
    if (!statusConfirm) return;
    try {
      await userService.setStatus(statusConfirm.id, !statusConfirm.is_active);
      toast('success', `User ${statusConfirm.is_active ? 'deactivated' : 'activated'} successfully`);
      setStatusConfirm(null);
      fetchUsers();
    } catch (err: any) {
      toast('danger', err.response?.data?.message || 'Failed to update user status');
      setStatusConfirm(null);
    }
  };

  const columns: Column<User>[] = [
    {
      header: 'Name',
      accessor: (u) => (
        <div>
          <p className="font-medium">{u.full_name}</p>
          <p className="text-xs text-slate-500">@{u.username}</p>
        </div>
      ),
    },
    { header: 'Email', accessor: (u) => u.email },
    { header: 'Role', accessor: (u) => <RoleBadge role={u.role} /> },
    { header: 'Status', accessor: (u) => <StatusBadge active={u.is_active} /> },
    {
      header: 'Actions',
      accessor: (u) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => { setSelectedUser(u); setModalMode('edit'); }}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={u.is_active ? 'text-red-400 hover:text-red-300' : 'text-emerald-400 hover:text-emerald-300'}
            onClick={() => setStatusConfirm(u)}
          >
            {u.is_active ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="User Management"
        description="Manage system users, roles, and access."
        actions={<Button onClick={() => { setSelectedUser(null); setModalMode('create'); }}>Add User</Button>}
      />

      <div className="mb-6 bg-slate-800 p-4 rounded-xl border border-slate-700">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <Input name="search" placeholder="Search name, username, email..." className="flex-1" />
          <Select
            name="role"
            options={ALL_ROLES.map(r => ({ value: r, label: r }))}
            placeholder="All Roles"
            className="w-full sm:w-48"
          />
          <Select
            name="is_active"
            options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]}
            placeholder="All Status"
            className="w-full sm:w-40"
          />
          <Button type="submit" variant="secondary">Filter</Button>
        </form>
      </div>

      <Table
        data={data}
        columns={columns}
        keyExtractor={(u) => u.id}
        loading={loading}
        pagination={{
          page: params.page || 1,
          limit: params.limit || 10,
          total,
          totalPages,
          onPageChange: (p) => setParams({ ...params, page: p }),
        }}
      />

      <UserModal
        open={!!modalMode}
        mode={modalMode}
        user={selectedUser}
        onClose={() => { setModalMode(null); setSelectedUser(null); }}
        onSuccess={() => { setModalMode(null); fetchUsers(); }}
      />

      <ConfirmDialog
        open={!!statusConfirm}
        onClose={() => setStatusConfirm(null)}
        onConfirm={handleToggleStatus}
        title={statusConfirm?.is_active ? 'Deactivate User' : 'Activate User'}
        message={`Are you sure you want to ${statusConfirm?.is_active ? 'deactivate' : 'activate'} ${statusConfirm?.full_name}?`}
        variant={statusConfirm?.is_active ? 'danger' : 'warning'}
        confirmLabel={statusConfirm?.is_active ? 'Deactivate' : 'Activate'}
      />
    </div>
  );
}

function UserModal({ open, mode, user, onClose, onSuccess }: any) {
  const { toast } = useToast();
  const schema = mode === 'create' ? createUserSchema : updateUserSchema;
  
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<any>({
    resolver: zodResolver(schema),
    values: user ? {
      full_name: user.full_name,
      username: user.username,
      email: user.email,
      role: user.role,
    } : undefined,
  });

  const onSubmit = async (data: any) => {
    try {
      if (mode === 'create') {
        await userService.create(data);
        toast('success', 'User created successfully');
      } else {
        await userService.update(user.id, data);
        toast('success', 'User updated successfully');
      }
      onSuccess();
      reset();
    } catch (err: any) {
      toast('danger', err.response?.data?.message || 'Operation failed');
    }
  };

  return (
    <Modal open={open} onClose={() => { onClose(); reset(); }} title={mode === 'create' ? 'Create User' : 'Edit User'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Full Name" {...register('full_name')} error={errors.full_name?.message as string} />
        <Input label="Username" {...register('username')} error={errors.username?.message as string} />
        <Input label="Email" type="email" {...register('email')} error={errors.email?.message as string} />
        <Select
          label="Role"
          {...register('role')}
          options={ALL_ROLES.map(r => ({ value: r, label: r }))}
          error={errors.role?.message as string}
        />
        {mode === 'create' && (
          <Input label="Password" type="password" {...register('password')} error={errors.password?.message as string} />
        )}
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>{mode === 'create' ? 'Create' : 'Save Changes'}</Button>
        </div>
      </form>
    </Modal>
  );
}
