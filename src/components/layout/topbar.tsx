'use client';

import { useAuthStore } from '@/store/auth-store';
import { SparklesIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface TopbarProps {
  className?: string;
  onOpenSidebar: () => void;
}

export function Topbar({ className, onOpenSidebar }: TopbarProps) {
  const { user } = useAuthStore();

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-white/5 px-4 py-4 shadow-lg backdrop-blur-xl',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="button-reset inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white/80 transition hover:border-white/30 hover:text-white md:hidden"
          aria-label="Open navigation"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
        <div className="hidden flex-col text-left text-xs uppercase tracking-[0.3em] text-white/50 sm:flex">
          <span>Arunalu Collections</span>
          <span className="text-[10px] text-white/40">Executive console</span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          className="button-reset hidden items-center gap-2 rounded-2xl border border-white/10 bg-gradient-to-r from-violet-500/70 to-sky-500/70 px-4 py-2 text-sm font-semibold text-white shadow hover:from-violet-500 hover:to-sky-500 md:inline-flex"
        >
          <SparklesIcon className="h-5 w-5" />
          Quick actions
        </button>
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/40 to-sky-500/30 text-sm font-semibold text-white">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'LM'}
          </div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">
            <p className="text-sm font-semibold uppercase tracking-normal text-white/90">{user?.name ?? 'Loading...'}</p>
            <p>{user?.role ? user.role : '—'}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

