'use client';

import { forwardRef } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  endAdornment?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, endAdornment, ...props }, ref) => (
    <div className="space-y-1">
      <div className="relative">
        <input
          type={type}
          className={cn(
            'w-full rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-300 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40',
            endAdornment && 'pr-10',
            error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/40',
            className,
          )}
          ref={ref}
          {...props}
        />
        {endAdornment ? (
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400">
            {endAdornment}
          </div>
        ) : null}
      </div>
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
    </div>
  ),
);
Input.displayName = 'Input';

