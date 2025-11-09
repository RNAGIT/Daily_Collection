import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Customer } from '@/models/Customer';
import { Loan } from '@/models/Loan';
import { getCurrentUser } from '@/lib/current-user';

const searchSchema = z.object({
  query: z.string().optional(),
});

function normalizeCustomer(customer: unknown) {
  let id = '';
  let name = 'Unknown customer';
  let phone = '';
  let customerNumber: number | null = null;

  if (typeof customer === 'string') {
    id = customer;
  } else if (customer && typeof customer === 'object') {
    const candidate = customer as {
      id?: unknown;
      _id?: { toString: () => string };
      name?: unknown;
      phone?: unknown;
      customerNumber?: unknown;
    };

    if (typeof candidate.id === 'string') {
      id = candidate.id;
    } else if (typeof candidate._id?.toString === 'function') {
      id = candidate._id.toString();
    }

    if (typeof candidate.name === 'string') {
      name = candidate.name;
    }

    if (typeof candidate.phone === 'string') {
      phone = candidate.phone;
    }

    if (typeof candidate.customerNumber === 'number') {
      customerNumber = candidate.customerNumber;
    }
  }

  return { id, name, phone, customerNumber };
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const { query } = searchSchema.parse({ query: searchParams.get('query') ?? undefined });

  await connectDB();

  const regex = query ? new RegExp(query, 'i') : null;
  const numericQuery = query ? Number(query) : NaN;
  const isNumeric = !Number.isNaN(numericQuery);

  const customerFilters: Record<string, unknown> = query
    ? {
        $or: [
          { name: regex },
          { phone: regex },
          { nic: regex },
          { email: regex },
          ...(isNumeric ? [{ customerNumber: numericQuery }] : []),
        ],
      }
    : {};

  const customers = await Customer.find(customerFilters).limit(20);
  const customerIds = customers
    .map((customer) => customer.id)
    .filter((value): value is string => Boolean(value));

  const loanFilters: Record<string, unknown> = {};
  const orConditions: Record<string, unknown>[] = [];

  if (customerIds.length > 0) {
    orConditions.push({ customer: { $in: customerIds } });
  }

  if (query) {
    orConditions.push({ notes: { $regex: regex } });
    if (isNumeric) {
      orConditions.push({ loanNumber: numericQuery });
    }
  }

  if (orConditions.length > 0) {
    loanFilters.$or = orConditions;
  }

  const loans = await Loan.find(loanFilters)
    .populate('customer')
    .sort({ status: 1, loanNumber: -1 })
    .limit(50);

  return NextResponse.json({
    results: loans.map((loan) => {
      const { id, name, phone, customerNumber } = normalizeCustomer(loan.customer);

      return {
        loanId: loan.id,
        loanNumber: loan.loanNumber,
        customerId: id,
        customerName: name,
        customerPhone: phone,
        customerNumber,
        pendingAmount: Math.max(
          0,
          loan.totalAmount - loan.schedule.reduce((sum, entry) => sum + entry.paidAmount, 0),
        ),
        status: loan.status,
      };
    }),
  });
}

