import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Loan } from '@/models/Loan';
import { Customer } from '@/models/Customer';
import { calculateLoan } from '@/lib/calculations';
import { getCurrentUser } from '@/lib/current-user';

const loanSchema = z.object({
  customerId: z.string().min(1),
  principal: z.number().positive(),
  interestRate: z.number().positive(),
  termDays: z.number().int().positive(),
  startDate: z.string().optional(),
  notes: z.string().optional(),
});

function normalizeCustomer(customer: unknown) {
  let id = '';
  let name = 'Unknown customer';

  if (typeof customer === 'string') {
    id = customer;
  } else if (customer && typeof customer === 'object') {
    const candidate = customer as {
      id?: unknown;
      _id?: { toString: () => string };
      name?: unknown;
    };

    if (typeof candidate.id === 'string') {
      id = candidate.id;
    } else if (typeof candidate._id?.toString === 'function') {
      id = candidate._id.toString();
    }

    if (typeof candidate.name === 'string') {
      name = candidate.name;
    }
  }

  return { id, name };
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const customerId = searchParams.get('customerId');

  await connectDB();

  const filters: Record<string, unknown> = {};
  if (status) {
    filters.status = status;
  }
  if (customerId) {
    filters.customer = customerId;
  }

  const loans = await Loan.find(filters).populate('customer').sort({ loanNumber: -1 });

  return NextResponse.json({
    loans: loans.map((loan) => {
      const { id: customerId, name: customerName } = normalizeCustomer(loan.customer);

      return {
        id: loan.id,
        loanNumber: loan.loanNumber,
        customerName,
        customerId,
        principal: loan.principal,
        interestRate: loan.interestRate,
        termDays: loan.termDays,
        totalAmount: loan.totalAmount,
        dailyAmount: loan.dailyAmount,
        status: loan.status,
        startDate: loan.startDate,
        endDate: loan.endDate,
      };
    }),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = loanSchema.parse(body);

    await connectDB();

    const customer = await Customer.findById(data.customerId);
    if (!customer) {
      return NextResponse.json({ message: 'Customer not found' }, { status: 404 });
    }

    const lastLoan = await Loan.findOne().sort({ loanNumber: -1 });
    const nextLoanNumber = lastLoan ? lastLoan.loanNumber + 1 : 1;

    const { totalInterest, totalAmount, dailyAmount, endDate, schedule } = calculateLoan({
      principal: data.principal,
      interestRate: data.interestRate,
      termDays: data.termDays,
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
    });

    const loan = await Loan.create({
      loanNumber: nextLoanNumber,
      customer: customer.id,
      principal: data.principal,
      interestRate: data.interestRate,
      termDays: data.termDays,
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      endDate,
      totalInterest,
      totalAmount,
      dailyAmount,
      schedule,
      notes: data.notes,
      status: 'active',
    });

    return NextResponse.json(
      {
        message: 'Loan created',
        loan: {
          id: loan.id,
          loanNumber: loan.loanNumber,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid input', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: 'Unable to create loan' }, { status: 500 });
  }
}

