'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  ChartBarIcon,
  UsersIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api-client';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: ChartBarIcon },
  { href: '/customers', label: 'Customers', icon: UsersIcon },
  { href: '/loans', label: 'Loans', icon: CreditCardIcon },
  { href: '/payments', label: 'Payments', icon: CurrencyDollarIcon },
  { href: '/settings', label: 'Settings', icon: Cog6ToothIcon },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'admin' as 'admin' | 'superadmin',
  });
  const [adminError, setAdminError] = useState<string | null>(null);
  const [isAdminSubmitting, setIsAdminSubmitting] = useState(false);

  const handleAdminChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setAdminForm((prev) => ({
      ...prev,
      [name]: name === 'role' ? (value as 'admin' | 'superadmin') : value,
    }));
  };

  const handleAdminCreate = async () => {
    setAdminError(null);

    if (!adminForm.email.trim() || !adminForm.password.trim()) {
      setAdminError('Email and password are required.');
      return;
    }

    if (adminForm.password !== adminForm.confirmPassword) {
      setAdminError('Passwords do not match.');
      return;
    }

    setIsAdminSubmitting(true);

    try {
      await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: adminForm.name || 'Administrator',
          email: adminForm.email,
          password: adminForm.password,
          role: adminForm.role,
        }),
      });
      setAdminDialogOpen(false);
      setAdminForm({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'admin',
      });
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Unable to create administrator');
    } finally {
      setIsAdminSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm transition-opacity md:hidden',
          isOpen ? 'opacity-100 pointer-events-auto' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex h-full w-72 flex-col gap-8 border-r border-white/10 bg-gradient-to-b from-white/10 via-white/5 to-transparent px-6 py-8 text-sm text-slate-200 shadow-2xl backdrop-blur-2xl transition-transform md:static md:translate-x-0 md:flex',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 text-lg font-semibold text-white"
            onClick={onClose}
          >
            <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-sky-400 text-lg font-bold text-white shadow-lg">
              LM
              <span className="absolute inset-0 rounded-2xl border border-white/30" />
            </span>
            <div className="leading-tight">
              <p className="text-sm uppercase tracking-[0.4em] text-white/60">Arunalu Collections</p>
              <p className="text-base font-semibold text-white">Mr. Rashith Abeywickrama</p>
            </div>
          </Link>
          <button
            type="button"
            className="button-reset rounded-xl border border-white/10 bg-white/10 p-2 text-white/60 transition hover:text-white md:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-1.5">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'group flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-sm transition-all',
                  'hover:border-white/20 hover:bg-white/10 hover:pl-5',
                  isActive
                    ? 'border-white/20 bg-white/10 text-white shadow-lg shadow-violet-500/20'
                    : 'text-slate-300',
                )}
                onClick={onClose}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 transition',
                    isActive && 'border-white/30 bg-white/20 text-white',
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="font-medium tracking-wide">{link.label}</span>
              </Link>
            );
          })}

          {user?.role === 'superadmin' ? (
            <button
              type="button"
              onClick={() => {
                setAdminDialogOpen(true);
                setAdminError(null);
              }}
              className="group flex w-full items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/20"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white/80 transition group-hover:border-white/40 group-hover:text-white">
                <UserPlusIcon className="h-5 w-5" />
              </span>
              <span className="font-medium tracking-wide">Add administrator</span>
            </button>
          ) : null}
        </nav>

        <div className="mt-auto space-y-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              handleLogout();
            }}
            className="button-reset group flex w-full items-center gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-left text-sm font-semibold text-rose-100 transition hover:border-rose-500/60 hover:bg-rose-500/20"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-400/60 bg-rose-500/20 text-rose-100">
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
            </span>
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <ConfirmDialog
        open={adminDialogOpen}
        title="Add administrator"
        description="Provide the administrator details. This action provisions a new login immediately."
        confirmLabel={isAdminSubmitting ? 'Creating...' : 'Create admin'}
        onConfirm={handleAdminCreate}
        onCancel={() => {
          if (!isAdminSubmitting) {
            setAdminDialogOpen(false);
          }
        }}
        loading={isAdminSubmitting}
        contentClassName="mt-16 md:mt-20"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-name">Full name</Label>
            <Input
              id="admin-name"
              name="name"
              placeholder="Administrator name"
              value={adminForm.name}
              onChange={handleAdminChange}
              className="border-white/30 bg-white/10 text-white placeholder:text-white/70"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              name="email"
              type="email"
              placeholder="admin@example.com"
              value={adminForm.email}
              onChange={handleAdminChange}
              required
              className="border-white/30 bg-white/10 text-white placeholder:text-white/70"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={adminForm.password}
              onChange={handleAdminChange}
              required
              className="border-white/30 bg-white/10 text-white placeholder:text-white/70"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-confirm-password">Confirm password</Label>
            <Input
              id="admin-confirm-password"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={adminForm.confirmPassword}
              onChange={handleAdminChange}
              required
              className="border-white/30 bg-white/10 text-white placeholder:text-white/70"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-role">Role</Label>
            <select
              id="admin-role"
              name="role"
              value={adminForm.role}
              onChange={handleAdminChange}
              className="w-full rounded-md border border-white/30 bg-white/10 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            >
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </div>
          {adminError ? <p className="text-sm text-rose-400">{adminError}</p> : null}
        </div>
      </ConfirmDialog>
    </>
  );
}

