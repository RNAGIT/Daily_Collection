'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { useAuthStore } from '@/store/auth-store';

interface DashboardShellProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  };
  children: React.ReactNode;
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const { setUser, setLoading } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setUser(user);
    setLoading(false);
  }, [setLoading, setUser, user]);

  return (
    <div className="flex min-h-screen bg-gradient-dark">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 overflow-hidden">
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="px-4 pb-10 pt-6 md:px-10">{children}</main>
      </div>
    </div>
  );
}

