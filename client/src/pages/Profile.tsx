import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardHeader } from '@/components/Card';
import { RoleBadge, StatusBadge } from '@/components/Badge';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '@/services/authService';

const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'Must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain number'),
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data: ChangePasswordForm) => {
    try {
      await authService.changePassword(data.current_password, data.new_password, data.confirm_password);
      toast('success', 'Password changed successfully');
      reset();
    } catch (err: any) {
      toast('danger', err.response?.data?.message || 'Failed to change password');
    }
  };

  if (!user) return null;

  return (
    <div>
      <PageHeader title="Profile" description="Manage your account settings and preferences." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader title="Account Details" />
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-400">Full Name</p>
              <p className="text-slate-200 font-medium">{user.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Username</p>
              <p className="text-slate-200 font-medium">@{user.username}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Email</p>
              <p className="text-slate-200 font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">Role</p>
              <RoleBadge role={user.role} />
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">Status</p>
              <StatusBadge active={user.is_active} />
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Change Password" />
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
            <Input
              label="Current Password"
              type="password"
              {...register('current_password')}
              error={errors.current_password?.message}
            />
            <Input
              label="New Password"
              type="password"
              {...register('new_password')}
              error={errors.new_password?.message}
            />
            <Input
              label="Confirm New Password"
              type="password"
              {...register('confirm_password')}
              error={errors.confirm_password?.message}
            />
            <div className="pt-4">
              <Button type="submit" loading={isSubmitting}>Update Password</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
