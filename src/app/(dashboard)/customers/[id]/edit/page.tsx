'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { apiFetch } from '@/lib/api-client';

interface CustomerDetail {
  id: string;
  customerNumber: number;
  name: string;
  phone?: string;
  nic?: string;
  email?: string;
  electricityAccount?: string;
  waterAccount?: string;
  gramaNiladhariName?: string;
  gramaNiladhariPhone?: string;
  specialNote?: string;
  status: string;
}

const emptyCustomer: CustomerDetail = {
  id: '',
  customerNumber: 0,
  name: '',
  phone: '',
  nic: '',
  email: '',
  electricityAccount: '',
  waterAccount: '',
  gramaNiladhariName: '',
  gramaNiladhariPhone: '',
  specialNote: '',
  status: 'active',
};

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const queryClient = useQueryClient();

  const [form, setForm] = useState<CustomerDetail>(emptyCustomer);
  const [error, setError] = useState<string | null>(null);
  const [pendingPayload, setPendingPayload] = useState<Partial<CustomerDetail> | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isValidPhone = (value: string) => /^\d{10}$/.test(value.trim());
  const isValidGmail = (value: string) => /^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(value.trim());

  const { data, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const response = await apiFetch<{ customer: CustomerDetail }>(`/api/customers/${id}`);
      return response.customer;
    },
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (data) {
      setForm({ ...data });
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: async (payload: Partial<CustomerDetail>) =>
      apiFetch(`/api/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      router.push(`/customers/${id}?notice=customer-updated`);
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Unable to update customer');
    },
  });

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError('Customer name is required');
      return;
    }

    const { id: _id, customerNumber, ...payload } = form;
    if (payload.phone && !isValidPhone(payload.phone)) {
      setError('Phone number must be exactly 10 digits.');
      return;
    }
    if (payload.gramaNiladhariPhone && !isValidPhone(payload.gramaNiladhariPhone)) {
      setError('Grama Niladhari phone must be exactly 10 digits.');
      return;
    }
    if (payload.email && !isValidGmail(payload.email)) {
      setError('Email must be a valid Gmail address.');
      return;
    }
    setPendingPayload(payload);
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    if (!pendingPayload) return;
    mutation.mutate(pendingPayload);
    setConfirmOpen(false);
  };

  const handleCancelConfirm = () => {
    setConfirmOpen(false);
    if (!mutation.isPending) {
      setPendingPayload(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Edit customer</h1>
          <p className="text-sm text-slate-400">
            Update customer information and household references as needed.
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href={`/customers/${id}`}>Cancel</Link>
        </Button>
      </div>

      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <h2 className="text-lg font-semibold text-white">Customer details</h2>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-slate-400">Loading customer...</p>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name *</Label>
                  <Input id="name" name="name" value={form.name} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={form.phone ?? ''}
                    onChange={handleChange}
                    inputMode="numeric"
                    pattern="\d{10}"
                    placeholder="0712345678"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nic">NIC</Label>
                  <Input id="nic" name="nic" value={form.nic ?? ''} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email ?? ''}
                    onChange={handleChange}
                    placeholder="example@gmail.com"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="electricityAccount">Electricity account</Label>
                  <Input
                    id="electricityAccount"
                    name="electricityAccount"
                    value={form.electricityAccount ?? ''}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waterAccount">Water bill number</Label>
                  <Input
                    id="waterAccount"
                    name="waterAccount"
                    value={form.waterAccount ?? ''}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="gramaNiladhariName">Grama Niladhari (name)</Label>
                  <Input
                    id="gramaNiladhariName"
                    name="gramaNiladhariName"
                    value={form.gramaNiladhariName ?? ''}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gramaNiladhariPhone">Grama Niladhari (phone)</Label>
                  <Input
                    id="gramaNiladhariPhone"
                    name="gramaNiladhariPhone"
                    value={form.gramaNiladhariPhone ?? ''}
                    onChange={handleChange}
                    inputMode="numeric"
                    pattern="\d{10}"
                    placeholder="0712345678"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialNote">Special note</Label>
                <textarea
                  id="specialNote"
                  name="specialNote"
                  value={form.specialNote ?? ''}
                  onChange={handleChange}
                  className="h-24 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="warning">Warning</option>
                </select>
              </div>

              {error ? <p className="text-sm text-rose-400">{error}</p> : null}

              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving changes...' : 'Save changes'}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="text-xs text-slate-500">
          Customer #{form.customerNumber ? String(form.customerNumber).padStart(3, '0') : '—'}
        </CardFooter>
      </Card>
      <ConfirmDialog
        open={confirmOpen}
        title="Save customer changes?"
        description="This will update the customer profile immediately and may affect linked loans."
        confirmLabel={mutation.isPending ? 'Saving...' : 'Save changes'}
        loading={mutation.isPending}
        onConfirm={handleConfirm}
        onCancel={handleCancelConfirm}
      />
    </div>
  );
}
