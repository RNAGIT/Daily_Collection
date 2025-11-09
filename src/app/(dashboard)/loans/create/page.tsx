'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { apiFetch } from '@/lib/api-client';
import { calculateLoan } from '@/lib/calculations';

interface CustomerOption {
  id: string;
  customerNumber: number;
  name: string;
}

export default function CreateLoanPage() {
  const router = useRouter();
  const params = useSearchParams();
  const preselectedCustomer = params.get('customerId') ?? '';

  const [form, setForm] = useState({
    customerId: preselectedCustomer,
    principal: '',
    interestRate: '20',
    termDays: '30',
    startDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: customers } = useQuery({
    queryKey: ['customers', 'options'],
    queryFn: async () => {
      const response = await apiFetch<{ customers: CustomerOption[] }>('/api/customers');
      return response.customers;
    },
  });

  const mutation = useMutation({
    mutationFn: async (payload: typeof form) =>
      apiFetch('/api/loans', {
        method: 'POST',
        body: JSON.stringify({
          customerId: payload.customerId,
          principal: Number(payload.principal),
          interestRate: Number(payload.interestRate),
          termDays: Number(payload.termDays),
          startDate: payload.startDate,
          notes: payload.notes,
        }),
      }),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      router.push(`/loans/${response.loan.id}?notice=loan-created`);
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Unable to create loan');
    },
  });

  const numbersValid =
    Number(form.principal) > 0 && Number(form.interestRate) > 0 && Number(form.termDays) > 0;

  const calculations = useMemo(() => {
    if (!numbersValid) {
      return null;
    }
    return calculateLoan({
      principal: Number(form.principal),
      interestRate: Number(form.interestRate),
      termDays: Number(form.termDays),
      startDate: new Date(form.startDate),
    });
  }, [form.interestRate, form.principal, form.startDate, form.termDays, numbersValid]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!numbersValid) {
      setError('Principal, interest rate, and term must be greater than zero.');
      return;
    }
    if (!form.customerId) {
      setError('Select a customer for this loan.');
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    mutation.mutate(form);
    setConfirmOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl	font-semibold text-white">Create loan</h1>
          <p className="text-sm text-slate-400">
            Set up a new loan plan with automated interest and daily repayment schedule.
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href="/loans">Back to loans</Link>
        </Button>
      </div>

      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <h2 className="text-lg font-semibold text-white">Loan details</h2>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5 md:grid-cols-[2fr,1fr]" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerId">Customer *</Label>
                <select
                  id="customerId"
                  name="customerId"
                  value={form.customerId}
                  onChange={handleChange}
                  className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  required
                >
                  <option value="">Select customer</option>
                  {customers?.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      #{String(customer.customerNumber).padStart(3, '0')} – {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="principal">Principal amount *</Label>
                  <Input
                    id="principal"
                    name="principal"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.principal}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interestRate">Interest rate % *</Label>
                  <Input
                    id="interestRate"
                    name="interestRate"
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.interestRate}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="termDays">Term (days) *</Label>
                  <Input
                    id="termDays"
                    name="termDays"
                    type="number"
                    min="1"
                    step="1"
                    value={form.termDays}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start date</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  className="h-24 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
              </div>

              {error ? <p className="text-sm text-rose-400">{error}</p> : null}

              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Creating...' : 'Create loan'}
              </Button>
            </div>

            <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-200">
              <h3 className="text-base font-semibold text-white">Loan summary</h3>
              {calculations ? (
                <dl className="space-y-3">
                  <div>
                    <dt className="text-xs uppercase text-slate-400">Total with interest</dt>
                    <dd className="text-lg font-semibold text-white">
                      {calculations.totalAmount.toFixed(2)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-400">Total interest</dt>
                    <dd>{calculations.totalInterest.toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-400">Daily installment</dt>
                    <dd>{calculations.dailyAmount.toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-400">End date</dt>
                    <dd>{calculations.endDate.toLocaleDateString()}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-400">Collection days</dt>
                    <dd>{form.termDays} days</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-slate-400">
                  Enter loan details to see automatic interest and repayment schedule.
                </p>
              )}
              <p className="text-xs text-slate-500">
                All calculations are automated based on the entered principal, interest rate, and term.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirmOpen}
        title="Create loan?"
        description="This will activate the loan and generate the daily repayment schedule."
        confirmLabel={mutation.isPending ? 'Creating...' : 'Create loan'}
        loading={mutation.isPending}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

