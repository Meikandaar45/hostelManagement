import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '@/services/authService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import { Alert } from '@/components/Alert';
import { LoadingState } from '@/components/LoadingState';

const setupSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores allowed'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

type SetupFormData = z.infer<typeof setupSchema>;

export function Setup() {
  const [checking, setChecking] = useState(true);
  const [apiError, setApiError] = useState('');
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
  });

  useEffect(() => {
    authService.getSetupStatus()
      .then((data) => {
        if (data.completed) {
          navigate('/login', { replace: true });
        } else {
          setChecking(false);
        }
      })
      .catch(() => {
        setApiError('Could not verify setup status. Is the server running?');
        setChecking(false);
      });
  }, [navigate]);

  const onSubmit = async (data: SetupFormData) => {
    setApiError('');
    try {
      await authService.setup(data);
      await refreshUser();
      toast('success', 'First administrator created successfully!');
      navigate('/app/dashboard', { replace: true });
    } catch (err: any) {
      setApiError(err.response?.data?.message || 'Failed to complete setup');
    }
  };

  if (checking) return <LoadingState text="Checking system status..." />;

  return (
    <Card>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-2">System Initialization</h2>
        <p className="text-slate-400 text-sm">
          Welcome to the Hostel Management System. Please create the first administrator account to get started.
        </p>
      </div>

      {apiError && <Alert variant="error" className="mb-6">{apiError}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Full Name"
          placeholder="e.g. System Administrator"
          {...register('full_name')}
          error={errors.full_name?.message}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Username"
            placeholder="arun.kumar"
            {...register('username')}
            error={errors.username?.message}
          />
          <Input
            label="Email"
            type="email"
            placeholder="arun.kumar@example.com"
            {...register('email')}
            error={errors.email?.message}
          />
        </div>

        <Input
          label="Password"
          type="password"
          {...register('password')}
          error={errors.password?.message}
        />
        
        <Input
          label="Confirm Password"
          type="password"
          {...register('confirm_password')}
          error={errors.confirm_password?.message}
        />

        <div className="pt-2">
          <Button type="submit" className="w-full" loading={isSubmitting}>
            Create Administrator
          </Button>
        </div>
      </form>
    </Card>
  );
}
