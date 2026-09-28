import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '@/services/authService';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import { Alert } from '@/components/Alert';

const forgotSchema = z.object({
  identifier: z.string().min(1, 'Username or email is required'),
});

type ForgotFormData = z.infer<typeof forgotSchema>;

export function ForgotPassword() {
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'danger'; message: string } | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotFormData) => {
    setStatus(null);
    try {
      const res = await authService.forgotPassword(data.identifier);
      setStatus({ type: 'success', message: res.message });
    } catch (err: any) {
      setStatus({ type: 'error', message: 'An error occurred. Please try again later.' });
    }
  };

  return (
    <Card>
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-2">Reset Password</h2>
        <p className="text-slate-400 text-sm">
          Enter your username or email address and we'll send you instructions to reset your password.
        </p>
      </div>

      {status && (
        <Alert variant={status.type} className="mb-6">
          {status.message}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Input
          label="Username or Email"
          placeholder="admin@example.com"
          {...register('identifier')}
          error={errors.identifier?.message}
        />

        <Button type="submit" className="w-full" loading={isSubmitting}>
          Send Reset Instructions
        </Button>

        <div className="text-center">
          <Link to="/login" className="text-sm text-indigo-400 hover:text-indigo-300">
            Back to Sign In
          </Link>
        </div>
      </form>
    </Card>
  );
}
