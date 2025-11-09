'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { apiFetch } from '@/lib/api-client';

interface Loan {
  id: string;
  loanNumber: number;
  customerName: string;
  customerId: string;
  principal: number;
  interestRate: number;
  termDays: number;
  totalAmount: number;
  dailyAmount: number;
  status: string;
  startDate: string;
  endDate: string;
}

function statusVariant(status: string) {
  switch (status) {
    case 'active':
      return 'default';
    case 'warning':
      return 'warning';
    case 'completed':
      return 'success';
    default:
      return 'secondary';
  }
}

export default function LoansPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ message: string; tone: 'success' | 'danger' } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['loans', statusFilter],
    queryFn: async () => {
      const query = statusFilter ? `?status=${statusFilter}` : '';
      const response = await apiFetch<{ loans: Loan[] }>(`/api/loans${query}`, { cache: 'no-store' });
      return response.loans;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      apiFetch(`/api/loans/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      setError(null);
      setBanner({ message: 'Loan deleted successfully.', tone: 'success' });
      setConfirmDeleteId(null);
    },
    onError: (err: unknown) => setError(err instanceof Error ? err.message : 'Unable to delete loan'),
  });

  const handleDeleteRequest = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = () => {
    if (!confirmDeleteId) return;
    deleteMutation.mutate(confirmDeleteId);
  };

  useEffect(() => {
    const notice = searchParams.get('notice');
    if (!notice) {
      return;
    }
    const noticeMap: Record<string, { message: string; tone: 'success' | 'danger' }> = {
      'loan-deleted': { message: 'Loan removed from the portfolio.', tone: 'success' },
    };
    const payload = noticeMap[notice];
    if (payload) {
      setBanner(payload);
      router.replace('/loans', { scroll: false });
    }
  }, [router, searchParams]);

  return (
    <Card className="border-slate-800 bg-slate-900/60">
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Loans</h1>
            <p className="text-sm text-slate-400">
              Manage issued loans, monitor status, and review repayment schedules.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 sm:w-48"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="warning">Warning</option>
            </select>
            <Button asChild>
              <Link href="/loans/create">Create loan</Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {banner ? (
          <div
            className={`mb-6 rounded-2xl border px-4 py-3 text-sm shadow-lg md:text-base ${
              banner.tone === 'success'
                ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
                : 'border-rose-400/40 bg-rose-500/10 text-rose-100'
            }`}
          >
            {banner.message}
          </div>
        ) : null}
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading loans...</p>
        ) : data && data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="text-left text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Loan</th>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 font-medium">Principal</th>
                  <th className="px-3 py-2 font-medium">Total</th>
                  <th className="px-3 py-2 font-medium">Daily</th>
                  <th className="px-3 py-2 font-medium">Term</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {data.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-800/40">
                    <td className="px-3 py-3">
                      <div className="font-semibold text-white">#{String(loan.loanNumber).padStart(3, '0')}</div>
                      <div className="text-xs text-slate-400">
                        {new Date(loan.startDate).toLocaleDateString()} →{' '}
                        {new Date(loan.endDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/customers/${loan.customerId}`}
                        className="text-sm text-sky-300 transition hover:text-sky-200"
                      >
                        {loan.customerName}
                      </Link>
                    </td>
                    <td className="px-3 py-3">{loan.principal.toFixed(2)}</td>
                    <td className="px-3 py-3">{loan.totalAmount.toFixed(2)}</td>
                    <td className="px-3 py-3">{loan.dailyAmount.toFixed(2)}</td>
                    <td className="px-3 py-3">{loan.termDays} days</td>
                    <td className="px-3 py-3">
                      <Badge variant={statusVariant(loan.status)}>{loan.status}</Badge>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/loans/${loan.id}`}>View</Link>
                        </Button>
                        <Button asChild size="sm" variant="secondary">
                          <Link href={`/loans/${loan.id}/edit`}>Edit</Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteRequest(loan.id)}
                          disabled={deleteMutation.isPending && deleteMutation.variables === loan.id}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No loans recorded yet.</p>
        )}
        {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}
      </CardContent>
      <ConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="Delete loan?"
        description="This will remove the loan and all associated payment history from the system."
        confirmLabel={deleteMutation.isPending ? 'Removing...' : 'Delete loan'}
        loading={deleteMutation.isPending}
        tone="danger"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </Card>
  );
}

