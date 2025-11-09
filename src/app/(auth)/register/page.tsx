'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function RegisterPage() {
  return (
    <div className="flex min-h-[70vh] w-full items-center justify-center px-4">
      <Card className="w-full max-w-md border-white/10 bg-slate-900/70 shadow-2xl backdrop-blur-2xl">
        <CardHeader>
          <div className="space-y-2 text-center">
            <span className="inline-flex items-center justify-center rounded-full border border-rose-400/40 bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-rose-200">
              Access controlled
            </span>
            <h1 className="text-2xl font-semibold text-white">Self-service signup disabled</h1>
            <p className="text-sm text-slate-400">
              Only the super administrator can add new admins from the dashboard. Please contact Arunalu Investments HQ if you need access.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-300">
          <Button asChild className="w-full bg-gradient-to-r from-violet-500 to-sky-500 text-white shadow-lg hover:from-violet-400 hover:to-sky-400">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

