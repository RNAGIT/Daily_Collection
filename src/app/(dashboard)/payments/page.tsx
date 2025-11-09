'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { apiFetch } from '@/lib/api-client';

interface LookupResult {
  loanId: string;
  loanNumber: number;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  pendingAmount: number;
  status: string;
}

interface LoanInfo {
  loan: {
    id: string;
    loanNumber: number;
    customerName: string;
    principal: number;
    totalAmount: number;
    dailyAmount: number;
    payments: Array<{ amountPaid: number; paidAt: string }>;
  };
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

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: lookupResults, isFetching } = useQuery({
    queryKey: ['payment-lookup', search],
    queryFn: async () => {
      if (!search.trim()) return [];
      const response = await apiFetch<{ results: LookupResult[] }>(
        `/api/payments/lookup?query=${encodeURIComponent(search)}`,
      );
      return response.results;
    },
    enabled: search.trim().length > 1,
  });

  const { data: loanDetails } = useQuery({
    queryKey: ['loan', selectedLoanId],
    queryFn: async () => {
      if (!selectedLoanId) return null;
      const response = await apiFetch<LoanInfo>(`/api/loans/${selectedLoanId}`);
      return response.loan;
    },
    enabled: Boolean(selectedLoanId),
  });

  const totals = useMemo(() => {
    if (!loanDetails) return { paid: 0, pending: 0 };
    const paid = loanDetails.payments.reduce((sum, payment) => sum + payment.amountPaid, 0);
    return {
      paid,
      pending: Math.max(loanDetails.totalAmount - paid, 0),
    };
  }, [loanDetails]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedLoanId) {
        throw new Error('Select a loan first');
      }
      return apiFetch('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          loanId: selectedLoanId,
          amountPaid: Number(amount),
          note,
        }),
      });
    },
    onSuccess: () => {
      setAmount('');
      setNote('');
      setStatusMessage('Payment recorded and receipt sent.');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['loan', selectedLoanId] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
    onError: (err: unknown) => {
      setStatusMessage(null);
      setError(err instanceof Error ? err.message : 'Unable to record payment');
    },
  });

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Payments</h1>
        <p className="text-sm text-slate-400">
          Search customers, select a loan, and record collections with automated receipt emails.
        </p>
      </div>

      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <h2 className="text-lg font-semibold text-white">Lookup</h2>
          <p className="text-sm text-slate-400">
            Search by customer name, phone number, or NIC to find related loans.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Start typing customer name, phone, or NIC..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40">
              {isFetching ? (
                <p className="px-4 py-3 text-sm text-slate-400">Searching...</p>
              ) : lookupResults && lookupResults.length > 0 ? (
                <ul className="divide-y divide-slate-800">
                  {lookupResults.map((result) => (
                    <li key={result.loanId}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLoanId(result.loanId);
                          setSearch(result.customerName);
                        }}
                        className="button-reset flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-slate-800/50"
                      >
                        <div>
                          <p className="font-medium text-white">{result.customerName}</p>
                          <p className="text-xs text-slate-400">
                            Loan #{String(result.loanNumber).padStart(3, '0')} • {result.customerPhone || 'No phone'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={statusVariant(result.status)}>{result.status}</Badge>
                          <span className="text-sm text-emerald-300">
                            Pending {result.pendingAmount.toFixed(2)}
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-3 text-sm text-slate-400">No matching loans found.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedLoanId && loanDetails ? (
        <div className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader>
              <h2 className="text-lg font-semibold text-white">Record payment</h2>
              <p className="text-sm text-slate-400">
                Customer: {loanDetails.customerName} • Loan #{String(loanDetails.loanNumber).padStart(3, '0')}
              </p>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!amount || Number(amount) <= 0) {
                    setError('Enter a valid payment amount.');
                    return;
                  }
                  setConfirmOpen(true);
                }}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase text-slate-400">Total with interest</p>
                    <p className="text-lg font-semibold text-white">{loanDetails.totalAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-slate-400">Daily installment</p>
                    <p className="text-lg font-semibold text-white">{loanDetails.dailyAmount.toFixed(2)}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase text-slate-400">Paid to date</p>
                    <p className="text-lg font-semibold text-emerald-300">{totals.paid.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-slate-400">Pending</p>
                    <p className="text-lg font-semibold text-amber-200">{totals.pending.toFixed(2)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount collected today</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="note">Notes</Label>
                  <textarea
                    id="note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className="h-24 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    placeholder="Optional instructions or collector remarks"
                  />
                </div>

                {statusMessage ? <p className="text-sm text-emerald-400">{statusMessage}</p> : null}
                {error ? <p className="text-sm text-rose-400">{error}</p> : null}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button className="flex-1" disabled={mutation.isPending || !amount}>
                    {mutation.isPending ? 'Saving...' : 'Save payment'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={handlePrintReceipt}>
                    Print receipt
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader>
              <h2 className="text-lg font-semibold text-white">Recent payments</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {loanDetails.payments.length === 0 ? (
                <p className="text-sm text-slate-400">No payments recorded yet.</p>
              ) : (
                <ul className="space-y-3">
                  {loanDetails.payments.slice(0, 5).map((payment, index) => (
                    <li
                      key={`${payment.paidAt}-${index}`}
                      className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-200"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{payment.amountPaid.toFixed(2)}</span>
                        <span className="text-xs text-slate-400">
                          {new Date(payment.paidAt).toLocaleString()}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
      <ConfirmDialog
        open={confirmOpen}
        title="Record payment?"
        description="This will log the payment, send the receipt, and update the customer's pending balance."
        confirmLabel={mutation.isPending ? 'Saving...' : 'Save payment'}
        loading={mutation.isPending}
        onConfirm={() => {
          mutation.mutate();
          setConfirmOpen(false);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

