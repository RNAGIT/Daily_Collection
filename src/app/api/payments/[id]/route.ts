import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Payment } from '@/models/Payment';
import { Loan } from '@/models/Loan';
import { Customer } from '@/models/Customer';
import { getCurrentUser } from '@/lib/current-user';
import { recalculateLoanPaymentState } from '@/lib/payment-utils';
import { buildPaymentReceipt } from '@/lib/payment-receipt';

const paymentUpdateSchema = z.object({
  amountPaid: z.number().positive().optional(),
  note: z.string().optional(),
  paidAt: z.string().optional(),
});

async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  return user;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
  }

  await connectDB();

  const payment = await Payment.findById(params.id);
  if (!payment) {
    return NextResponse.json({ message: 'Payment not found' }, { status: 404 });
  }

  const loan = await Loan.findById(payment.loan);
  if (!loan) {
    return NextResponse.json({ message: 'Loan not found' }, { status: 404 });
  }

  const customer = await Customer.findById(payment.customer);
  if (!customer) {
    return NextResponse.json({ message: 'Customer not found' }, { status: 404 });
  }

  const paymentDay = await Payment.countDocuments({
    loan: loan.id,
    paidAt: { $lte: payment.paidAt },
  });

  const receipt = buildPaymentReceipt({
    loan,
    payment,
    customer,
    dayNumber: Math.max(paymentDay, 1),
  });

  return NextResponse.json({ receipt });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = paymentUpdateSchema.parse(body);

    await connectDB();

    const payment = await Payment.findById(params.id);
    if (!payment) {
      return NextResponse.json({ message: 'Payment not found' }, { status: 404 });
    }

    if (data.amountPaid !== undefined) {
      payment.amountPaid = data.amountPaid;
    }

    if (data.note !== undefined) {
      payment.note = data.note;
    }

    if (data.paidAt) {
      payment.paidAt = new Date(data.paidAt);
    }

    await payment.save();
    await recalculateLoanPaymentState(payment.loan);

    const refreshed = await Payment.findById(payment.id);

    return NextResponse.json({
      message: 'Payment updated',
      payment: refreshed
        ? {
            id: refreshed.id,
            amountPaid: refreshed.amountPaid,
            scheduledAmount: refreshed.scheduledAmount,
            previousPending: refreshed.previousPending,
            newPending: refreshed.newPending,
            paidAt: refreshed.paidAt,
            note: refreshed.note,
          }
        : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid input', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: 'Unable to update payment' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
  }

  await connectDB();

  const payment = await Payment.findById(params.id);
  if (!payment) {
    return NextResponse.json({ message: 'Payment not found' }, { status: 404 });
  }

  const loanId = payment.loan;
  await Payment.deleteOne({ _id: payment.id });
  await recalculateLoanPaymentState(loanId);

  return NextResponse.json({ message: 'Payment deleted' });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return NextResponse.json(
    { message: 'Unsupported operation. Use /api/payments/:id/notify instead.' },
    { status: 405 },
  );
}

