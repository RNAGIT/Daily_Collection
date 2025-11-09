'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth-store';
import { apiFetch } from '@/lib/api-client';

interface LoginResponse {
  message: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  };
}

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await apiFetch<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setUser(response.user);
      setLoading(false);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to login');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-900/70 shadow-2xl">
      <CardHeader className="space-y-4 text-center">
        <span className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
          Arunalu investments
        </span>
        <h1 className="text-[2.4rem] font-semibold tracking-tight bg-gradient-to-r from-violet-300 via-sky-300 to-cyan-200 bg-clip-text text-transparent sm:text-[2.8rem] sm:leading-tight">
          Welcome back to Arunalu Investments
        </h1>
        <span className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-violet-400/20 via-sky-400/20 to-cyan-300/20 px-5 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-cyan-200/90 shadow-inner shadow-cyan-400/20">
          Admin access only
        </span>
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-transparent bg-gradient-to-r from-cyan-300 via-sky-400 to-violet-300 bg-clip-text">
          Mr. Rashith Abeywickrama&rsquo;s portal
        </p>
      </CardHeader>
      <CardContent className="space-y-6 p-8">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="admin@arunalu.lk"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              required
              endAdornment={
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="rounded-md p-1 text-slate-400 transition hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:ring-offset-0"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <EyeIcon className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              }
            />
          </div>
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <Button className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="text-left">
            Managed by <span className="text-slate-200">Arunalu Investments HQ</span>
          </span>
          <Link href="/forgot-password" className="font-medium text-sky-300 hover:text-sky-200">
            Forgot password?
          </Link>
        </div>
        <div className="text-center text-xs text-slate-400">
          Need an account?{' '}
          <Link href="/register" className="font-medium text-sky-300 hover:text-sky-200">
            Create one
          </Link>
        </div>
      </CardContent>
      </Card>
  );
}

