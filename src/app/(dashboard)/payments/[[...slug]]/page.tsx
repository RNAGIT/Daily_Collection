'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { apiFetch } from '@/lib/api-client';
import type { PaymentReceiptData } from '@/lib/payment-receipt';
import { formatCurrency } from '@/lib/payment-receipt';
import { formatLoanCode } from '@/lib/formatters';

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

interface RecordPaymentResponse {
  message: string;
  payment: {
    id: string;
  };
  summary: PaymentReceiptData;
}

type PaymentsPageProps = {
  params: { slug?: string[] };
  searchParams: Record<string, string | string[] | undefined>;
};

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

function slugifyCustomerName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function PaymentsPage({ params, searchParams }: PaymentsPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const slugParts = params?.slug ?? [];
  const isPreview = slugParts[slugParts.length - 1] === 'preview';
  const normalizedSlugParts = isPreview ? slugParts.slice(0, -1) : slugParts;
  const loanIdParam = searchParams.loanId;
  const loanIdFromQuery =
    typeof loanIdParam === 'string'
      ? loanIdParam
      : Array.isArray(loanIdParam)
        ? loanIdParam[0] ?? null
        : null;
  const paymentIdParamRaw = searchParams.paymentId;
  const paymentIdParam =
    typeof paymentIdParamRaw === 'string'
      ? paymentIdParamRaw
      : Array.isArray(paymentIdParamRaw)
        ? paymentIdParamRaw[0] ?? null
        : null;
  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(loanIdFromQuery);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [receiptSummary, setReceiptSummary] = useState<PaymentReceiptData | null>(null);
  const [notifyStatus, setNotifyStatus] = useState<string | null>(null);
  const [notifyError, setNotifyError] = useState<string | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(isPreview);

  useEffect(() => {
    if (loanIdFromQuery && loanIdFromQuery !== selectedLoanId) {
      setSelectedLoanId(loanIdFromQuery);
    }
  }, [loanIdFromQuery, selectedLoanId]);

  useEffect(() => {
    if (!loanIdFromQuery && normalizedSlugParts.length > 0) {
      const decodedName = decodeURIComponent(normalizedSlugParts[0] ?? '')
        .replace(/-/g, ' ')
        .trim();
      if (decodedName && !search) {
        setSearch(decodedName);
        setShowResults(true);
      }
    }
  }, [loanIdFromQuery, normalizedSlugParts, search]);

  const { data: lookupResults, isFetching } = useQuery({
    queryKey: ['payment-lookup', search],
    queryFn: async () => {
      if (!search.trim()) return [];
      const response = await apiFetch<{ results: LookupResult[] }>(
        `/api/payments/lookup?query=${encodeURIComponent(search)}`,
      );
      return response.results;
    },
    enabled: search.trim().length > 1 && showResults,
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

  const { data: previewReceipt } = useQuery({
    queryKey: ['payment-receipt', paymentIdParam],
    queryFn: async () => {
      if (!paymentIdParam) {
        return null;
      }
      const response = await apiFetch<{ receipt: PaymentReceiptData }>(
        `/api/payments/${paymentIdParam}`,
      );
      return response.receipt;
    },
    enabled: isPreview && Boolean(paymentIdParam),
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (loanDetails?.customerName && search !== loanDetails.customerName) {
      setSearch(loanDetails.customerName);
    }
  }, [loanDetails, search]);

  useEffect(() => {
    if (!previewReceipt) {
      return;
    }
    setReceiptSummary(previewReceipt);
    if (previewReceipt.loanId && previewReceipt.loanId !== selectedLoanId) {
      setSelectedLoanId(previewReceipt.loanId);
    }
    if (previewReceipt.customerName && search !== previewReceipt.customerName) {
      setSearch(previewReceipt.customerName);
    }
    if (showResults) {
      setShowResults(false);
    }
    if (isPreview) {
      setPreviewDialogOpen(true);
    }
  }, [previewReceipt, search, selectedLoanId, showResults, isPreview]);

  const totals = useMemo(() => {
    if (!loanDetails) return { paid: 0, pending: 0 };
    const paid = loanDetails.payments.reduce((sum, payment) => sum + payment.amountPaid, 0);
    return {
      paid,
      pending: Math.max(loanDetails.totalAmount - paid, 0),
    };
  }, [loanDetails]);

  const notifyMutation = useMutation<{ message: string }, Error, 'sms' | 'email'>({
    mutationFn: async (channel) => {
      if (!receiptSummary) {
        throw new Error('Record a payment before sending notifications.');
      }
      if (channel === 'sms' && !receiptSummary.customerPhone) {
        throw new Error('Customer phone number is missing for this loan.');
      }
      if (channel === 'email' && !receiptSummary.customerEmail) {
        throw new Error('Customer email address is missing for this loan.');
      }
      return apiFetch<{ message: string }>(`/api/payments/${receiptSummary.paymentId}/notify`, {
        method: 'POST',
        body: JSON.stringify({ channel, summary: receiptSummary }),
      });
    },
    onSuccess: (response, channel) => {
      setNotifyStatus(
        response.message ||
          (channel === 'sms' ? 'SMS sent successfully.' : 'Email sent successfully.'),
      );
      setNotifyError(null);
    },
    onError: (err: Error) => {
      setNotifyStatus(null);
      setNotifyError(err.message);
    },
  });

  const mutation = useMutation<RecordPaymentResponse, Error, void>({
    mutationFn: async () => {
      if (!selectedLoanId) {
        throw new Error('Select a loan first');
      }
      return apiFetch<RecordPaymentResponse>('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          loanId: selectedLoanId,
          amountPaid: Number(amount),
          note,
        }),
      });
    },
    onSuccess: (response) => {
      setAmount('');
      setNote('');
      setStatusMessage(response.message);
      setError(null);
      setReceiptSummary(response.summary);
      setNotifyStatus(null);
      setNotifyError(null);
      queryClient.invalidateQueries({ queryKey: ['loan', selectedLoanId] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      setShowResults(false);
      setPreviewDialogOpen(true);
      if (response.summary.previewPath) {
        router.replace(response.summary.previewPath, { scroll: false });
      } else if (response.summary.customerName) {
        const customerSlug = slugifyCustomerName(response.summary.customerName);
        const loanSlug = formatLoanCode(response.summary.loanNumber);
        const fallbackUrl = `/payments/${customerSlug}/${encodeURIComponent(
          loanSlug,
        )}?loanId=${response.summary.loanId}`;
        router.replace(fallbackUrl, { scroll: false });
      }
    },
    onError: (err: Error) => {
      setStatusMessage(null);
      setError(err.message);
      setReceiptSummary(null);
      setNotifyStatus(null);
      setNotifyError(null);
    },
  });

  const handlePrintReceipt = () => {
    if (!receiptSummary) return;

    const printWindow = window.open('', '_blank', 'width=640,height=720');
    if (!printWindow) return;

    const formattedDate = format(new Date(receiptSummary.paymentDate), 'dd MMM yyyy, hh:mm a');
    const arrearsBlock =
      receiptSummary.arrears < 0
        ? `<tr><th style="text-align:left;padding:8px;color:#f87171;">Arrears</th><td style="text-align:right;padding:8px;color:#f87171;">${formatCurrency(
            Math.abs(receiptSummary.arrears),
          )}</td></tr>`
        : '';
    const notesBlock = receiptSummary.notes
      ? `<p style="margin-top:12px;"><strong>Notes:</strong> ${receiptSummary.notes}</p>`
      : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - Loan ${formatLoanCode(receiptSummary.loanNumber)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            h2 { font-size: 16px; margin-top: 0; color: #2563eb; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
            th { text-align: left; color: #4b5563; }
            td { text-align: right; color: #1f2937; }
          </style>
        </head>
        <body>
          <h1>${receiptSummary.headline}</h1>
          <h2>Payment Receipt</h2>
          <p><strong>Loan:</strong> ${formatLoanCode(receiptSummary.loanNumber)}</p>
          <p><strong>Customer:</strong> ${receiptSummary.customerName}</p>
          <p><strong>Payment Date:</strong> ${formattedDate}</p>

          <table>
            <tbody>
              <tr><th>Total with interest</th><td>${formatCurrency(receiptSummary.totalWithInterest)}</td></tr>
              <tr><th>Daily installment</th><td>${formatCurrency(receiptSummary.dailyInstallment)}</td></tr>
              <tr><th>Paid today</th><td>${formatCurrency(receiptSummary.paidToday)}</td></tr>
              <tr><th>Pending amount</th><td>${formatCurrency(receiptSummary.pendingAmount)}</td></tr>
              ${arrearsBlock}
            </tbody>
          </table>
          ${notesBlock}
          <p style="margin-top:24px;">Thank you for partnering with Arunalu Investments.</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const receiptDetails = receiptSummary ? (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase text-slate-400">Customer</p>
          <p className="text-lg font-semibold text-white">{receiptSummary.customerName}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-400">Loan number</p>
                <p className="text-lg font-semibold text-white">
                  {formatLoanCode(receiptSummary.loanNumber)}
                </p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-400">Schedule day</p>
          <p className="text-sm text-slate-200">Day {receiptSummary.dayNumber}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-400">Payment date</p>
          <p className="text-sm text-slate-200">
            {format(new Date(receiptSummary.paymentDate), 'dd MMM yyyy, hh:mm a')}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-400">Daily installment</p>
          <p className="text-sm text-slate-200">
            {formatCurrency(receiptSummary.dailyInstallment)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
          <p className="text-xs uppercase text-emerald-200">Paid today</p>
          <p className="text-lg font-semibold text-emerald-100">
            {formatCurrency(receiptSummary.paidToday)}
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
          <p className="text-xs uppercase text-amber-200">Pending amount</p>
          <p className="text-lg font-semibold text-amber-100">
            {formatCurrency(receiptSummary.pendingAmount)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase text-slate-400">Total with interest</p>
          <p className="text-sm text-slate-200">
            {formatCurrency(receiptSummary.totalWithInterest)}
          </p>
        </div>
        {receiptSummary.arrears < 0 ? (
          <div>
            <p className="text-xs uppercase text-slate-400">Total arrears</p>
            <p className="text-sm font-semibold text-rose-300">
              {formatCurrency(Math.abs(receiptSummary.arrears))}
            </p>
          </div>
        ) : null}
      </div>

      {receiptSummary.notes ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-200">
          <p className="text-xs uppercase text-slate-400">Notes</p>
          <p>{receiptSummary.notes}</p>
        </div>
      ) : null}
    </div>
  ) : null;

  const closePreviewDialog = () => {
    setPreviewDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Payments</h1>
        <p className="text-sm text-slate-400">
          Search customers, select a loan, and record collections with printable receipts or SMS notifications.
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
            onChange={(event) => {
              const nextValue = event.target.value;
              setSearch(nextValue);
              setShowResults(true);
              setSelectedLoanId(null);
              setReceiptSummary(null);
              setStatusMessage(null);
              setNotifyStatus(null);
              setNotifyError(null);
              if (selectedLoanId) {
                router.replace('/payments', { scroll: false });
              } else if (!nextValue.trim()) {
                router.replace('/payments', { scroll: false });
              }
            }}
          />
          {search && showResults && (
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
                          setShowResults(false);
                          const customerSlug = slugifyCustomerName(result.customerName);
                          const loanSlug = formatLoanCode(result.loanNumber);
                          const url = `/payments/${customerSlug}/${encodeURIComponent(
                            loanSlug,
                          )}?loanId=${encodeURIComponent(result.loanId)}`;
                          router.replace(url, { scroll: false });
                        }}
                        className="button-reset flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-slate-800/50"
                      >
                        <div>
                          <p className="font-medium text-white">{result.customerName}</p>
                          <p className="text-xs text-slate-400">
                            Loan {formatLoanCode(result.loanNumber)} •{' '}
                            {result.customerPhone || 'No phone'}
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
                Customer: {loanDetails.customerName} • Loan {formatLoanCode(loanDetails.loanNumber)}
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
      {receiptSummary ? (
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader>
            <h2 className="text-lg font-semibold text-white">Receipt preview</h2>
            <p className="text-sm text-slate-400">
              Verify the latest payment before printing a receipt or notifying the customer.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {receiptDetails}

            {statusMessage ? (
              <p className="text-sm text-emerald-400">{statusMessage}</p>
            ) : null}
            {notifyStatus ? <p className="text-sm text-emerald-300">{notifyStatus}</p> : null}
            {notifyError ? <p className="text-sm text-rose-400">{notifyError}</p> : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={handlePrintReceipt} variant="secondary">
                Print receipt
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={
                  notifyMutation.isPending ||
                  !receiptSummary ||
                  !receiptSummary.customerPhone
                }
                onClick={() => {
                  setNotifyStatus(null);
                  setNotifyError(null);
                  notifyMutation.mutate('sms');
                }}
              >
                {notifyMutation.isPending && notifyMutation.variables === 'sms'
                  ? 'Sending SMS...'
                  : 'Notify via SMS'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={
                  notifyMutation.isPending ||
                  !receiptSummary ||
                  !receiptSummary.customerEmail
                }
                onClick={() => {
                  setNotifyStatus(null);
                  setNotifyError(null);
                  notifyMutation.mutate('email');
                }}
              >
                {notifyMutation.isPending && notifyMutation.variables === 'email'
                  ? 'Sending email...'
                  : 'Notify via Email'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
      <ConfirmDialog
        open={Boolean(previewDialogOpen && receiptSummary)}
        title="Payment recorded"
        description="Review the receipt and share it with the customer."
        confirmLabel="Close"
        cancelLabel="Close"
        onConfirm={closePreviewDialog}
        onCancel={closePreviewDialog}
        footer={
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button variant="secondary" onClick={handlePrintReceipt}>
              Print receipt
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={
                notifyMutation.isPending ||
                !receiptSummary ||
                !receiptSummary.customerPhone
              }
              onClick={() => {
                setNotifyStatus(null);
                setNotifyError(null);
                notifyMutation.mutate('sms');
              }}
            >
              {notifyMutation.isPending && notifyMutation.variables === 'sms'
                ? 'Sending SMS...'
                : 'Share via SMS'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={
                notifyMutation.isPending ||
                !receiptSummary ||
                !receiptSummary.customerEmail
              }
              onClick={() => {
                setNotifyStatus(null);
                setNotifyError(null);
                notifyMutation.mutate('email');
              }}
            >
              {notifyMutation.isPending && notifyMutation.variables === 'email'
                ? 'Sending email...'
                : 'Share via Gmail'}
            </Button>
            <Button type="button" variant="ghost" onClick={closePreviewDialog}>
              Close
            </Button>
          </div>
        }
      >
        {receiptDetails}
        {notifyStatus ? <p className="text-sm text-emerald-300">{notifyStatus}</p> : null}
        {notifyError ? <p className="text-sm text-rose-400">{notifyError}</p> : null}
      </ConfirmDialog>
      <ConfirmDialog
        open={confirmOpen}
        title="Record payment?"
        description="This will log the payment and update the customer's pending balance."
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

