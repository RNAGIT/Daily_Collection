'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { apiFetch } from '@/lib/api-client';
import { formatCustomerCode } from '@/lib/formatters';

interface Customer {
  id: string;
  customerNumber: number;
  name: string;
  phone?: string;
  nic?: string;
  email?: string;
  status: string;
  createdAt: string;
}

function statusBadge(status: string) {
  switch (status) {
    case 'active':
      return 'success';
    case 'warning':
      return 'warning';
    case 'inactive':
      return 'secondary';
    default:
      return 'secondary';
  }
}

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ message: string; tone: 'success' | 'danger' } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', filter],
    queryFn: async () => {
      const query = filter ? `?q=${encodeURIComponent(filter)}` : '';
      const response = await apiFetch<{ customers: Customer[] }>(`/api/customers${query}`, {
        cache: 'no-store',
      });
      return response.customers;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      apiFetch(`/api/customers/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setError(null);
      setBanner({
        message: 'Customer deleted successfully.',
        tone: 'success',
      });
      setConfirmDeleteId(null);
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Unable to delete customer');
    },
  });

  const handleDeleteRequest = (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = () => {
    if (!confirmDeleteId) return;
    deleteMutation.mutate(confirmDeleteId);
  };

  const handleCreateRedirect = () => {
    router.push('/customers/new');
  };

  useEffect(() => {
    const notice = searchParams.get('notice');
    if (!notice) {
      return;
    }
    const noticeMap: Record<string, { message: string; tone: 'success' | 'danger' }> = {
      'customer-created': { message: 'Customer added to Arunalu Collections.', tone: 'success' },
      'customer-updated': { message: 'Customer details updated successfully.', tone: 'success' },
    };
    const payload = noticeMap[notice];
    if (payload) {
      setBanner(payload);
      router.replace('/customers', { scroll: false });
    }
  }, [router, searchParams]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Customers</h1>
          <p className="text-sm text-slate-400">
            Manage customer records, update details, and track daily loan collections.
          </p>
        </div>
        <Button onClick={handleCreateRedirect}>Add customer</Button>
      </div>

      {banner ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm shadow-lg md:text-base ${
            banner.tone === 'success'
              ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
              : 'border-rose-400/40 bg-rose-500/10 text-rose-100'
          }`}
        >
          {banner.message}
        </div>
      ) : null}

      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Customer registry</h2>
              <p className="text-sm text-slate-400">Search and maintain all registered borrowers.</p>
            </div>
            <div className="flex items-center gap-3">
              <Input
                placeholder="Search customers..."
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-slate-400">Loading customers...</p>
          ) : data && data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-sm">
                <thead className="text-left text-slate-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Customer</th>
                    <th className="px-3 py-2 font-medium">Contact</th>
                    <th className="px-3 py-2 font-medium">NIC</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Joined</th>
                    <th className="px-3 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {data.map((customer) => (
                    <tr key={customer.id} className="hover:bg-slate-800/40">
                      <td className="px-3 py-3">
                        <div className="font-semibold text-white">{customer.name}</div>
                        <div className="text-xs text-slate-400">
                          {formatCustomerCode(customer.customerNumber)}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div>{customer.phone || '—'}</div>
                        <div className="text-xs text-slate-400">{customer.email || 'No email'}</div>
                      </td>
                      <td className="px-3 py-3">{customer.nic || '—'}</td>
                      <td className="px-3 py-3">
                        <Badge variant={statusBadge(customer.status)}>{customer.status}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        {new Date(customer.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/customers/${customer.id}`}>View</Link>
                          </Button>
                          <Button asChild variant="secondary" size="sm">
                            <Link href={`/customers/${customer.id}/edit`}>Edit</Link>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteRequest(customer.id)}
                            disabled={deleteMutation.isPending && deleteMutation.variables === customer.id}
                          >
                            {deleteMutation.isPending && deleteMutation.variables === customer.id
                              ? 'Removing...'
                              : 'Delete'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No customers available. Add one to get started.</p>
          )}
          {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="Delete customer?"
        description="This will permanently remove the customer record and any associated loans will be unaffected."
        confirmLabel={deleteMutation.isPending ? 'Removing...' : 'Delete'}
        tone="danger"
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}

