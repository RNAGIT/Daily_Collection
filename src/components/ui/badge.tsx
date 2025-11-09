'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide',
  {
    variants: {
      variant: {
        default: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        success: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        warning: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        danger: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        secondary: 'bg-slate-700/40 text-slate-100 border-slate-600',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

