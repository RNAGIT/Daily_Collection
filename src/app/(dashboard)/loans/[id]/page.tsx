import { notFound } from 'next/navigation';
import { connectDB } from '@/lib/db';
import { Loan } from '@/models/Loan';
import { Payment } from '@/models/Payment';
import { LoanDetailClient } from '@/components/loans/loan-detail-client';

export default async function LoanDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { notice?: string };
}) {
  await connectDB();
  const loan = await Loan.findById(params.id).populate('customer').lean();

  if (!loan) {
    notFound();
  }

  const payments = await Payment.find({ loan: loan._id }).sort({ paidAt: -1 }).lean();

  const serializedLoan = {
    id: loan._id.toString(),
    loanNumber: loan.loanNumber,
    customerId: (loan.customer as any)._id.toString(),
    customerName: (loan.customer as any).name,
    principal: loan.principal,
    interestRate: loan.interestRate,
    termDays: loan.termDays,
    startDate: loan.startDate.toISOString(),
    endDate: loan.endDate.toISOString(),
    totalInterest: loan.totalInterest,
    totalAmount: loan.totalAmount,
    dailyAmount: loan.dailyAmount,
    notes: loan.notes ?? '',
    status: loan.status,
    schedule: loan.schedule.map((entry: any) => ({
      day: entry.day,
      date: entry.date.toISOString(),
      plannedAmount: entry.plannedAmount,
      dueAmount: entry.dueAmount,
      paidAmount: entry.paidAmount,
      remainingBalance: entry.remainingBalance,
    })),
    payments: payments.map((payment) => ({
      id: payment._id.toString(),
      amountPaid: payment.amountPaid,
      scheduledAmount: payment.scheduledAmount,
      previousPending: payment.previousPending,
      newPending: payment.newPending,
      paidAt: payment.paidAt.toISOString(),
      note: payment.note,
    })),
  };

  return <LoanDetailClient loan={serializedLoan} initialNotice={searchParams?.notice} />;
}

