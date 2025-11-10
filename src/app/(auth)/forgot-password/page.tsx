'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { apiFetch } from '@/lib/api-client';

type ForgotResponse =
  | {
      message: string;
      requiresOtp: true;
    }
  | {
      message: string;
    };

export default function ForgotPasswordPage() {
  const [phase, setPhase] = useState<'email' | 'otp' | 'completed'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setError(null);
    setIsSubmitting(true);

    try {
      const payload =
        phase === 'email'
          ? { email }
          : { email, otp, password, confirmPassword };

      const response = await apiFetch<ForgotResponse>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setStatus(response.message);

      if ('requiresOtp' in response && response.requiresOtp) {
        setPhase('otp');
      } else {
        setPhase('completed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900/70 p-1 shadow-2xl backdrop-blur-2xl">
      <div className="pointer-events-none absolute -right-24 top-10 h-60 w-60 rounded-[2rem] bg-gradient-to-br from-violet-500/40 via-sky-500/30 to-cyan-400/40 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-6 h-72 w-72 rounded-full bg-gradient-to-tr from-sky-500/30 via-cyan-400/20 to-purple-500/20 blur-3xl" />
      <div className="relative grid gap-10 bg-slate-950/70 p-8 sm:p-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col justify-center space-y-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
            Password recovery
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.7rem] lg:leading-tight">
            Regain access to the Arunalu Investments portal
          </h1>
        </div>

        <Card className="relative border-white/10 bg-white/5 shadow-xl shadow-sky-500/10">
          <CardContent className="space-y-6 p-8">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-semibold text-white">Reset password</h2>
            </div>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2 text-left">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="admin@arunalu.lk"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={phase !== 'email'}
                />
              </div>
              {phase === 'otp' ? (
                <>
                  <div className="space-y-2 text-left">
                    <Label htmlFor="otp">One-time password</Label>
                    <Input
                      id="otp"
                      name="otp"
                      type="text"
                      inputMode="numeric"
                      placeholder="Enter 6 digit code"
                      value={otp}
                      onChange={(event) => setOtp(event.target.value)}
                      required
                      maxLength={6}
                    />
                  </div>
                  <div className="space-y-2 text-left">
                    <Label htmlFor="password">New password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2 text-left">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                    />
                  </div>
                </>
              ) : null}
              {status ? <p className="text-sm text-emerald-400">{status}</p> : null}
              {error ? <p className="text-sm text-rose-400">{error}</p> : null}
              <Button
                className="w-full bg-gradient-to-r from-violet-500 via-sky-500 to-cyan-400 text-white shadow-lg shadow-sky-500/30 hover:from-violet-400 hover:via-sky-400 hover:to-cyan-300"
                disabled={isSubmitting || phase === 'completed'}
              >
                {phase === 'completed'
                  ? 'Password updated'
                  : isSubmitting
                  ? phase === 'email'
                    ? 'Sending code...'
                    : 'Resetting...'
                  : phase === 'email'
                  ? 'Send OTP'
                  : 'Set new password'}
              </Button>
            </form>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="text-left text-slate-300">
                {phase === 'email'
                  ? 'You will receive a secure OTP via email.'
                  : phase === 'otp'
                  ? 'Enter the email OTP then choose your new password.'
                  : 'You can now sign in with your new password.'}
              </span>
              <Link href="/login" className="font-medium text-sky-300 hover:text-sky-200">
                Back to login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

