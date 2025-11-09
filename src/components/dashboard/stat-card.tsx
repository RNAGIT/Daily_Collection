'use client';

import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  helper?: string;
  icon?: React.ReactNode;
  trend?: {
    label: string;
    direction: 'up' | 'down';
  };
  color?: 'sky' | 'emerald' | 'amber' | 'rose' | 'slate' | 'violet';
}

const colorMap: Record<NonNullable<StatCardProps['color']>, string> = {
  sky: 'from-sky-500/20 via-sky-500/10 to-sky-400/5 border-sky-400/40 shadow-sky-500/20',
  emerald: 'from-emerald-500/20 via-emerald-500/10 to-emerald-400/5 border-emerald-400/40 shadow-emerald-500/20',
  amber: 'from-amber-500/20 via-amber-500/10 to-amber-400/5 border-amber-400/40 shadow-amber-500/20',
  rose: 'from-rose-500/20 via-rose-500/10 to-rose-400/5 border-rose-400/40 shadow-rose-500/20',
  slate: 'from-slate-500/20 via-slate-500/10 to-slate-400/5 border-slate-400/40 shadow-slate-500/20',
  violet: 'from-violet-500/25 via-fuchsia-500/10 to-purple-500/5 border-violet-400/40 shadow-violet-600/20',
};

export function StatCard({
  label,
  value,
  helper,
  icon,
  trend,
  color = 'sky',
}: StatCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl border bg-gradient-to-br p-6 shadow-lg backdrop-blur-xl transition hover:translate-y-[-1px]',
        colorMap[color],
      )}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-32 w-28 translate-x-10 translate-y-10 rounded-full bg-white/5 blur-2xl" />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-white md:text-4xl">{value}</p>
        </div>
        {icon ? (
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white shadow-inner">
            <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-50" />
            <span className="relative flex h-8 w-8 items-center justify-center">{icon}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex items-center justify-between text-xs text-white/75">
        {helper ? <span>{helper}</span> : <span>&nbsp;</span>}
        {trend ? (
          <span
            className={cn(
              'flex items-center gap-1 font-semibold',
              trend.direction === 'up' ? 'text-emerald-200' : 'text-rose-200',
            )}
          >
            {trend.direction === 'up' ? '▲' : '▼'} {trend.label}
          </span>
        ) : null}
      </div>
    </div>
  );
}

