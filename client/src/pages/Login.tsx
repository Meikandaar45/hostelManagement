import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import { Alert } from '@/components/Alert';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function Login() {
  const [apiError, setApiError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/app/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setApiError('');
    try {
      await login(data.identifier, data.password);
      navigate(from, { replace: true });
    } catch (err: any) {
      if (err.response?.status === 401) {
        setApiError('Invalid credentials or inactive account');
      } else {
        setApiError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <Card>
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-2">Sign In</h2>
        <p className="text-slate-400 text-sm">Enter your credentials to access your account</p>
      </div>

      {apiError && <Alert variant="error" className="mb-6">{apiError}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Username or Email"
          placeholder="arun.kumar@example.com or arun.kumar"
          {...register('identifier')}
          error={errors.identifier?.message}
        />
        
        <div className="space-y-1">
          <Input
            label="Password"
            type="password"
            {...register('password')}
            error={errors.password?.message}
          />
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300">
              Forgot password?
            </Link>
          </div>
        </div>

        <div className="pt-4">
          <Button type="submit" className="w-full" loading={isSubmitting}>
            Sign In
          </Button>
        </div>
      </form>
    </Card>
  );
}
