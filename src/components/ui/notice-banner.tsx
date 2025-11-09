'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NoticeBannerProps {
  message: string;
  href: string;
  tone?: 'success' | 'danger';
}

export default function NoticeBanner({ message, href, tone = 'success' }: NoticeBannerProps) {
  const router = useRouter();

  useEffect(() => {
    router.replace(href, { scroll: false });
  }, [href, router]);

  const toneClass =
    tone === 'success'
      ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
      : 'border-rose-400/40 bg-rose-500/10 text-rose-100';

  return (
    <div className={cn('rounded-2xl border px-4 py-3 text-sm shadow-lg md:text-base', toneClass)}>
      {message}
    </div>
  );
}


