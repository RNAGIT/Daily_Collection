import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Loan } from '@/models/Loan';
import { Payment } from '@/models/Payment';
import { Customer } from '@/models/Customer';
import { getCurrentUser } from '@/lib/current-user';
import { recalculateLoanPaymentState } from '@/lib/payment-utils';
import { buildPaymentReceipt } from '@/lib/payment-receipt';

const paymentSchema = z.object({
  loanId: z.string().min(1),
  amountPaid: z.number().positive(),
  paidAt: z.string().optional(),
  note: z.string().optional(),
});

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const loanId = searchParams.get('loanId');

  if (!loanId) {
    return NextResponse.json({ message: 'Loan id is required' }, { status: 400 });
  }

  await connectDB();

  const payments = await Payment.find({ loan: loanId }).sort({ paidAt: -1 });

  return NextResponse.json({
    payments: payments.map((payment) => ({
      id: payment.id,
      amountPaid: payment.amountPaid,
      scheduledAmount: payment.scheduledAmount,
      previousPending: payment.previousPending,
      newPending: payment.newPending,
      paidAt: payment.paidAt,
      note: payment.note,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = paymentSchema.parse(body);

    await connectDB();

    const loan = await Loan.findById(data.loanId);
    if (!loan) {
      return NextResponse.json({ message: 'Loan not found' }, { status: 404 });
    }

    const customer = await Customer.findById(loan.customer);
    if (!customer) {
      return NextResponse.json({ message: 'Customer record is missing for this loan' }, { status: 400 });
    }

    const paidAt = data.paidAt ? new Date(data.paidAt) : new Date();

    const payment = await Payment.create({
      loan: loan.id,
      customer: customer.id,
      amountPaid: data.amountPaid,
      scheduledAmount: loan.dailyAmount,
      previousPending: 0,
      newPending: 0,
      paidAt,
      note: data.note,
      collectedBy: user.id,
    });

    await recalculateLoanPaymentState(loan.id);

    const refreshedPayment = await Payment.findById(payment.id);
    const referencePayment = refreshedPayment ?? payment;
    const paymentDay = await Payment.countDocuments({
      loan: loan.id,
      paidAt: { $lte: referencePayment.paidAt },
    });

    const receipt = buildPaymentReceipt({
      loan,
      payment: referencePayment,
      customer,
      dayNumber: Math.max(paymentDay, 1),
    });

    return NextResponse.json(
      {
        message: 'Payment recorded',
        payment: {
          id: payment.id,
        },
        summary: receipt,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid input', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: 'Unable to record payment' }, { status: 500 });
  }
}

