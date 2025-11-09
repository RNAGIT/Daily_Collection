import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Loan } from '@/models/Loan';
import { Payment } from '@/models/Payment';
import { Customer } from '@/models/Customer';
import { getCurrentUser } from '@/lib/current-user';
import { sendEmail } from '@/lib/mailer';
import { recalculateLoanPaymentState } from '@/lib/payment-utils';

const paymentSchema = z.object({
  loanId: z.string().min(1),
  amountPaid: z.number().positive(),
  paidAt: z.string().optional(),
  note: z.string().optional(),
});

function normalizeCustomer(customer: unknown) {
  let id = '';
  let name: string | undefined;
  let email: string | undefined;

  if (typeof customer === 'string') {
    id = customer;
  } else if (customer && typeof customer === 'object') {
    const candidate = customer as {
      id?: unknown;
      _id?: { toString: () => string };
      name?: unknown;
      email?: unknown;
    };

    if (typeof candidate.id === 'string') {
      id = candidate.id;
    } else if (typeof candidate._id?.toString === 'function') {
      id = candidate._id.toString();
    }

    if (typeof candidate.name === 'string') {
      name = candidate.name;
    }

    if (typeof candidate.email === 'string') {
      email = candidate.email;
    }
  }

  return { id, name, email };
}

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

    const loan = await Loan.findById(data.loanId).populate('customer');
    if (!loan) {
      return NextResponse.json({ message: 'Loan not found' }, { status: 404 });
    }

    const customer = normalizeCustomer(loan.customer);

    if (!customer.id) {
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

    const updatedPayment = await Payment.findById(payment.id);
    const latestLoan = await Loan.findById(loan.id);

    if (customer.email && updatedPayment) {
      const newPending = updatedPayment.newPending ?? 0;
      const totalPaid = (latestLoan?.totalAmount ?? loan.totalAmount) - newPending;
      await sendEmail({
        to: customer.email,
        subject: `Payment receipt for loan #${loan.loanNumber}`,
        html: `
          <p>Hi ${customer.name ?? 'valued customer'},</p>
          <p>We received a payment of <strong>${data.amountPaid.toFixed(2)}</strong> on ${paidAt.toLocaleString()}.</p>
          <p>Loan summary:</p>
          <ul>
            <li>Principal: ${loan.principal.toFixed(2)}</li>
            <li>Total amount with interest: ${(latestLoan?.totalAmount ?? loan.totalAmount).toFixed(2)}</li>
            <li>Total paid so far: ${totalPaid.toFixed(2)}</li>
            <li>New pending amount: ${Math.max(newPending, 0).toFixed(2)}</li>
          </ul>
          <p>Thank you!</p>
        `,
      });
    }

    return NextResponse.json(
      {
        message: 'Payment recorded',
        payment: {
          id: payment.id,
        },
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

