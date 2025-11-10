'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';

export default function ResetPasswordPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/forgot-password');
  }, [router]);

  return (
    <Card className="border-slate-800 bg-slate-900/70">
      <CardContent className="py-10 text-center text-sm text-slate-200">
        Redirecting to the secure OTP reset flow…
      </CardContent>
    </Card>
  );
}

