'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
  contentClassName?: string;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  loading = false,
  onConfirm,
  onCancel,
  children,
  contentClassName,
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close confirmation dialog"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div
        className={cn(
          'relative w-full max-w-lg space-y-6 overflow-hidden rounded-3xl border border-white/15 bg-slate-950/95 p-7 text-sm text-white shadow-[0_30px_80px_rgba(15,23,42,0.7)] backdrop-blur',
          contentClassName,
        )}
      >
        <div className="pointer-events-none absolute -left-32 top-0 h-64 w-64 rounded-full bg-gradient-to-br from-violet-500/25 via-sky-500/15 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-0 h-64 w-64 rounded-full bg-gradient-to-tr from-cyan-400/20 via-sky-400/10 to-transparent blur-3xl" />
        <div className="relative space-y-3">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {description ? <p className="text-sm text-slate-300">{description}</p> : null}
        </div>
        {children ? (
          <div className="relative space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-inner shadow-sky-500/10">
            {children}
          </div>
        ) : null}
        <div className="relative flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            className="flex-1 justify-center sm:flex-none sm:px-6"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            className={cn(
              'flex-1 justify-center sm:flex-none sm:px-6',
              tone === 'danger' ? 'bg-rose-500 text-white hover:bg-rose-400' : '',
            )}
            variant={tone === 'danger' ? 'destructive' : 'primary'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}


