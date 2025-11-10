'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { apiFetch } from '@/lib/api-client';
import { formatLoanCode } from '@/lib/formatters';

export interface ScheduleEntry {
  day: number;
  date: string;
  plannedAmount: number;
  dueAmount: number;
  paidAmount: number;
  remainingBalance: number;
}

export interface PaymentEntry {
  id: string;
  amountPaid: number;
  scheduledAmount: number;
  previousPending: number;
  newPending: number;
  paidAt: string;
  note?: string;
}

export interface LoanDetail {
  id: string;
  loanNumber: number;
  customerId: string;
  customerName: string;
  principal: number;
  interestRate: number;
  termDays: number;
  startDate: string;
  endDate: string;
  totalInterest: number;
  totalAmount: number;
  dailyAmount: number;
  notes?: string;
  status: string;
  schedule: ScheduleEntry[];
  payments: PaymentEntry[];
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

function toInputDateTime(value: string) {
  const date = new Date(value);
  const pad = (input: number) => input.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

function formatCurrency(value: number) {
  return value.toFixed(2);
}

function formatVariance(value: number) {
  const abs = Math.abs(value).toFixed(2);
  if (value > 0) {
    return `-${abs}`;
  }
  if (value < 0) {
    return `+${abs}`;
  }
  return '0.00';
}

interface LoanDetailClientProps {
  loan: LoanDetail;
  initialNotice?: string;
}

export function LoanDetailClient({ loan, initialNotice }: LoanDetailClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState(loan.status);
  const [notes, setNotes] = useState(loan.notes ?? '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editPaidAt, setEditPaidAt] = useState('');
  const [paymentActionId, setPaymentActionId] = useState<string | null>(null);
  const [confirmLoanDelete, setConfirmLoanDelete] = useState(false);
  const [confirmSavePayment, setConfirmSavePayment] = useState(false);
  const [confirmDeletePaymentId, setConfirmDeletePaymentId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(() => {
    if (!initialNotice) return null;
    const noticeMap: Record<string, string> = {
      'loan-created': 'Loan created successfully.',
      'loan-updated': 'Loan details updated successfully.',
    };
    return noticeMap[initialNotice] ?? null;
  });
  const [statusTone, setStatusTone] = useState<'success' | 'danger'>('success');

  const totals = useMemo(() => {
    const paid = loan.payments.reduce((sum, payment) => sum + payment.amountPaid, 0);
    const pending = loan.totalAmount - paid;
    return {
      paid,
      pending: pending < 0 ? 0 : pending,
    };
  }, [loan.payments, loan.totalAmount]);

  const totalArrears = useMemo(
    () => loan.payments.reduce((sum, payment) => sum + (payment.scheduledAmount - payment.amountPaid), 0),
    [loan.payments],
  );

  const startDate = useMemo(() => new Date(loan.startDate), [loan.startDate]);

  useEffect(() => {
    if (initialNotice) {
      router.replace(`/loans/${loan.id}`, { scroll: false });
    }
  }, [initialNotice, loan.id, router]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    setError(null);
    try {
      await apiFetch(`/api/loans/${loan.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status,
          notes,
        }),
      });
      router.refresh();
      setStatusMessage('Loan status updated successfully.');
      setStatusTone('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update loan');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setConfirmLoanDelete(true);
  };

  const performLoanDelete = async () => {
    setIsUpdating(true);
    setError(null);
    try {
      await apiFetch(`/api/loans/${loan.id}`, {
        method: 'DELETE',
      });
      router.push('/loans?notice=loan-deleted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete loan');
      setIsUpdating(false);
    } finally {
      setConfirmLoanDelete(false);
    }
  };

  const beginEditPayment = (payment: PaymentEntry) => {
    setPaymentError(null);
    setEditingPaymentId(payment.id);
    setEditAmount(payment.amountPaid.toString());
    setEditNote(payment.note ?? '');
    setEditPaidAt(toInputDateTime(payment.paidAt));
  };

  const cancelEditPayment = () => {
    setEditingPaymentId(null);
    setEditAmount('');
    setEditNote('');
    setEditPaidAt('');
    setPaymentError(null);
  };

  const requestSavePayment = () => {
    if (!editingPaymentId) return;
    const amount = Number(editAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError('Amount must be greater than zero.');
      return;
    }
    setConfirmSavePayment(true);
  };

  const performSavePayment = async () => {
    if (!editingPaymentId) return;
    const amount = Number(editAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError('Amount must be greater than zero.');
      setConfirmSavePayment(false);
      return;
    }

    setPaymentActionId(editingPaymentId);
    setPaymentError(null);
    try {
      await apiFetch(`/api/payments/${editingPaymentId}`, {
        method: 'PUT',
        body: JSON.stringify({
          amountPaid: amount,
          note: editNote,
          paidAt: editPaidAt ? new Date(editPaidAt).toISOString() : undefined,
        }),
      });
      cancelEditPayment();
      router.refresh();
      setStatusMessage('Payment updated successfully.');
      setStatusTone('success');
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Unable to update payment');
    } finally {
      setPaymentActionId(null);
      setConfirmSavePayment(false);
    }
  };

  const requestDeletePayment = (paymentId: string) => {
    setConfirmDeletePaymentId(paymentId);
  };

  const performDeletePayment = async () => {
    if (!confirmDeletePaymentId) return;
    setPaymentActionId(confirmDeletePaymentId);
    setPaymentError(null);
    try {
      await apiFetch(`/api/payments/${confirmDeletePaymentId}`, { method: 'DELETE' });
      if (editingPaymentId === confirmDeletePaymentId) {
        cancelEditPayment();
      }
      router.refresh();
      setStatusMessage('Payment deleted successfully.');
      setStatusTone('danger');
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Unable to delete payment');
    } finally {
      setPaymentActionId(null);
      setConfirmDeletePaymentId(null);
    }
  };

  const computeDayLabel = (paidAt: string) => {
    const diffMs = new Date(paidAt).getTime() - startDate.getTime();
    const dayIndex = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    return Number.isFinite(dayIndex) && dayIndex > 0 ? dayIndex : '-';
  };

  const arrearsFor = (payment: PaymentEntry) => payment.scheduledAmount - payment.amountPaid;

  return (
    <div className="space-y-6">
      {statusMessage ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm shadow-lg md:text-base ${
            statusTone === 'success'
              ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
              : 'border-rose-400/40 bg-rose-500/10 text-rose-100'
          }`}
        >
          {statusMessage}
        </div>
      ) : null}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-slate-400">
              Loan {formatLoanCode(loan.loanNumber)} • {new Date(loan.startDate).toLocaleDateString()} →{' '}
              {new Date(loan.endDate).toLocaleDateString()}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white">{loan.customerName}</h1>
          </div>
          <Badge variant={statusVariant(loan.status)}>{loan.status}</Badge>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <p className="text-xs uppercase text-slate-400">Principal</p>
            <p className="mt-2 text-lg font-semibold text-white">{formatCurrency(loan.principal)}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <p className="text-xs uppercase text-slate-400">Total with interest</p>
            <p className="mt-2 text-lg font-semibold text-white">{formatCurrency(loan.totalAmount)}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <p className="text-xs uppercase text-slate-400">Paid</p>
            <p className="mt-2 text-lg font-semibold text-emerald-300">{formatCurrency(totals.paid)}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <p className="text-xs uppercase text-slate-400">Balance</p>
            <p className="mt-2 text-lg font-semibold text-amber-200">{formatCurrency(totals.pending)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Payment history</h2>
                <p className="text-sm text-slate-400">Daily collection records with arrears tracking.</p>
              </div>
              <Button asChild variant="secondary" size="sm">
                <a href={`/payments?loanId=${loan.id}`}>Record payment</a>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loan.payments.length === 0 ? (
              <p className="text-sm text-slate-400">No payments recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800 text-sm">
                  <thead className="text-left text-slate-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">Day</th>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium text-right">Paid amount</th>
                      <th className="px-3 py-2 font-medium text-right">Should pay</th>
                      <th className="px-3 py-2 font-medium text-right">Balance</th>
                      <th className="px-3 py-2 font-medium text-right">Arrears</th>
                      <th className="px-3 py-2 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {loan.payments.map((payment) => {
                      const editing = editingPaymentId === payment.id;
                      const arrears = arrearsFor(payment);
                      return (
                        <tr key={payment.id} className="hover:bg-slate-800/40">
                          <td className="px-3 py-3 align-top">{computeDayLabel(payment.paidAt)}</td>
                          <td className="px-3 py-3 align-top">
                            {editing ? (
                              <Input
                                type="datetime-local"
                                value={editPaidAt}
                                onChange={(event) => setEditPaidAt(event.target.value)}
                              />
                            ) : (
                              <span>{new Date(payment.paidAt).toLocaleString()}</span>
                            )}
                          </td>
                          <td className="px-3 py-3 align-top text-right">
                            {editing ? (
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editAmount}
                                onChange={(event) => setEditAmount(event.target.value)}
                              />
                            ) : (
                              <span>{formatCurrency(payment.amountPaid)}</span>
                            )}
                          </td>
                          <td className="px-3 py-3 align-top text-right">
                            {formatCurrency(payment.scheduledAmount)}
                          </td>
                          <td className="px-3 py-3 align-top text-right">
                            {formatCurrency(payment.newPending)}
                          </td>
                          <td
                            className={`px-3 py-3 align-top text-right ${
                              arrears > 0
                                ? 'text-rose-300'
                                : arrears < 0
                                ? 'text-emerald-300'
                                : 'text-slate-200'
                            }`}
                          >
                            {formatVariance(arrears)}
                          </td>
                          <td className="px-3 py-3 align-top text-right">
                            <div className="flex justify-end gap-2">
                              {editing ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    onClick={requestSavePayment}
                                    disabled={paymentActionId === payment.id}
                                  >
                                    Save
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={cancelEditPayment}>
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button size="sm" variant="ghost" onClick={() => beginEditPayment(payment)}>
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => requestDeletePayment(payment.id)}
                                    disabled={paymentActionId === payment.id}
                                  >
                                    Delete
                                  </Button>
                                </>
                              )}
                            </div>
                            {editing ? (
                              <div className="mt-2 space-y-1">
                                <Label htmlFor={`note-${payment.id}`} className="text-xs text-slate-400">
                                  Note
                                </Label>
                                <textarea
                                  id={`note-${payment.id}`}
                                  value={editNote}
                                  onChange={(event) => setEditNote(event.target.value)}
                                  className="h-16 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                                />
                              </div>
                            ) : payment.note ? (
                              <p className="mt-2 text-xs text-slate-400 text-right">Note: {payment.note}</p>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {paymentError ? <p className="text-sm text-rose-400">{paymentError}</p> : null}
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm">
              <p className="text-xs uppercase text-slate-400">Total arrears</p>
              <p
                className={`mt-1 text-base font-semibold ${
                  totalArrears > 0
                    ? 'text-rose-300'
                    : totalArrears < 0
                    ? 'text-emerald-300'
                    : 'text-slate-100'
                }`}
              >
                {formatVariance(totalArrears)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      <ConfirmDialog
        open={confirmLoanDelete}
        title="Delete loan?"
        description="This will remove the loan and its entire payment history permanently."
        confirmLabel={isUpdating ? 'Deleting...' : 'Delete loan'}
        tone="danger"
        loading={isUpdating}
        onConfirm={performLoanDelete}
        onCancel={() => {
          if (!isUpdating) setConfirmLoanDelete(false);
        }}
      />
      <ConfirmDialog
        open={confirmSavePayment}
        title="Save payment changes?"
        description="This will update the payment record and recalculate any arrears."
        confirmLabel={paymentActionId ? 'Saving...' : 'Save payment'}
        loading={paymentActionId !== null}
        onConfirm={performSavePayment}
        onCancel={() => {
          if (paymentActionId === null) setConfirmSavePayment(false);
        }}
      />
      <ConfirmDialog
        open={Boolean(confirmDeletePaymentId)}
        title="Delete payment record?"
        description="This payment entry will be removed from the schedule and balance calculations."
        confirmLabel={paymentActionId ? 'Removing...' : 'Delete payment'}
        tone="danger"
        loading={paymentActionId !== null}
        onConfirm={performDeletePayment}
        onCancel={() => {
          if (paymentActionId === null) setConfirmDeletePaymentId(null);
        }}
      />
    </div>
  );
}

