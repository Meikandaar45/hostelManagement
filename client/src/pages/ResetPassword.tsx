import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '@/services/authService';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import { Alert } from '@/components/Alert';

const resetSchema = z.object({
  password: z.string().min(8, 'Must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain number'),
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

type ResetFormData = z.infer<typeof resetSchema>;

export function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'danger'; message: string } | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: ResetFormData) => {
    if (!token) return;
    setStatus(null);
    try {
      await authService.resetPassword(token, data.password, data.confirm_password);
      setStatus({ type: 'success', message: 'Password has been reset successfully. You can now sign in.' });
    } catch (err: any) {
      setStatus({ type: 'error', message: err.response?.data?.message || 'Invalid or expired token.' });
    }
  };

  if (!token) {
    return (
      <Card>
        <Alert variant="error">Invalid password reset link.</Alert>
      </Card>
    );
  }

  if (status?.type === 'success') {
    return (
      <Card>
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Password Reset Complete</h2>
          <p className="text-slate-400 text-sm">Your password has been changed successfully.</p>
        </div>
        <Button className="w-full" onClick={() => window.location.href = '/login'}>
          Go to Sign In
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-2">Create New Password</h2>
        <p className="text-slate-400 text-sm">
          Please enter your new password below.
        </p>
      </div>

      {status && (
        <Alert variant={status.type} className="mb-6">
          {status.message}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="New Password"
          type="password"
          {...register('password')}
          error={errors.password?.message}
        />

        <Input
          label="Confirm New Password"
          type="password"
          {...register('confirm_password')}
          error={errors.confirm_password?.message}
        />

        <div className="pt-4">
          <Button type="submit" className="w-full" loading={isSubmitting}>
            Reset Password
          </Button>
        </div>

        <div className="text-center pt-2">
          <Link to="/login" className="text-sm text-indigo-400 hover:text-indigo-300">
            Back to Sign In
          </Link>
        </div>
      </form>
    </Card>
  );
}
