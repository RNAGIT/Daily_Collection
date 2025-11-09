import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Loan } from '@/models/Loan';
import { Payment } from '@/models/Payment';
import { calculateLoan } from '@/lib/calculations';
import { getCurrentUser } from '@/lib/current-user';

const loanUpdateSchema = z.object({
  principal: z.number().positive().optional(),
  interestRate: z.number().positive().optional(),
  termDays: z.number().int().positive().optional(),
  startDate: z.string().optional(),
  status: z.enum(['active', 'closed', 'warning']).optional(),
  notes: z.string().optional(),
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

  const loan = await Loan.findById(params.id).populate('customer');
  if (!loan) {
    return NextResponse.json({ message: 'Loan not found' }, { status: 404 });
  }

  const payments = await Payment.find({ loan: loan.id }).sort({ paidAt: -1 });

  return NextResponse.json({
    loan: {
      id: loan.id,
      loanNumber: loan.loanNumber,
      customerId: (() => {
        const customerField = loan.customer as unknown;
        if (typeof customerField === 'string') {
          return customerField;
        }
        if (
          typeof customerField === 'object' &&
          customerField !== null &&
          'id' in customerField &&
          typeof (customerField as { id?: string }).id === 'string'
        ) {
          return (customerField as { id: string }).id;
        }
        if (
          typeof customerField === 'object' &&
          customerField !== null &&
          '_id' in customerField &&
          typeof (customerField as { _id?: { toString: () => string } })._id?.toString === 'function'
        ) {
          return (customerField as { _id: { toString: () => string } })._id.toString();
        }
        return '';
      })(),
      customerName: (() => {
        const customerField = loan.customer as unknown;
        if (
          typeof customerField === 'object' &&
          customerField !== null &&
          'name' in customerField &&
          typeof (customerField as { name?: string }).name === 'string'
        ) {
          return (customerField as { name: string }).name;
        }
        return 'Unknown customer';
      })(),
      principal: loan.principal,
      interestRate: loan.interestRate,
      termDays: loan.termDays,
      startDate: loan.startDate,
      endDate: loan.endDate,
      totalInterest: loan.totalInterest,
      totalAmount: loan.totalAmount,
      dailyAmount: loan.dailyAmount,
      notes: loan.notes,
      status: loan.status,
      schedule: loan.schedule,
      payments: payments.map((payment) => ({
        id: payment.id,
        amountPaid: payment.amountPaid,
        scheduledAmount: payment.scheduledAmount,
        previousPending: payment.previousPending,
        newPending: payment.newPending,
        paidAt: payment.paidAt,
      })),
    },
  });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = loanUpdateSchema.parse(body);

    await connectDB();

    const loan = await Loan.findById(params.id);
    if (!loan) {
      return NextResponse.json({ message: 'Loan not found' }, { status: 404 });
    }

    if (data.principal || data.interestRate || data.termDays || data.startDate) {
      const calculation = calculateLoan({
        principal: data.principal ?? loan.principal,
        interestRate: data.interestRate ?? loan.interestRate,
        termDays: data.termDays ?? loan.termDays,
        startDate: data.startDate ? new Date(data.startDate) : loan.startDate,
      });

      loan.principal = data.principal ?? loan.principal;
      loan.interestRate = data.interestRate ?? loan.interestRate;
      loan.termDays = data.termDays ?? loan.termDays;
      loan.startDate = data.startDate ? new Date(data.startDate) : loan.startDate;
      loan.endDate = calculation.endDate;
      loan.totalInterest = calculation.totalInterest;
      loan.totalAmount = calculation.totalAmount;
      loan.dailyAmount = calculation.dailyAmount;
      loan.schedule = calculation.schedule;
    }

    if (data.status) {
      loan.status = data.status;
    }

    if (data.notes !== undefined) {
      loan.notes = data.notes;
    }

    await loan.save();

    return NextResponse.json({ message: 'Loan updated' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid input', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: 'Unable to update loan' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
  }

  await connectDB();

  const loan = await Loan.findByIdAndDelete(params.id);
  if (!loan) {
    return NextResponse.json({ message: 'Loan not found' }, { status: 404 });
  }

  await Payment.deleteMany({ loan: loan.id });

  return NextResponse.json({ message: 'Loan deleted' });
}

