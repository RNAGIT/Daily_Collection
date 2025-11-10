import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getCurrentUser } from '@/lib/current-user';
import { Customer } from '@/models/Customer';
import { Loan } from '@/models/Loan';
import { Payment } from '@/models/Payment';
import { formatCustomerCode, formatLoanCode } from '@/lib/formatters';

type RecordLoan = {
  id: string;
  loanNumber: number;
  loanCode: string;
  principal: number;
  interestRate: number;
  termDays: number;
  startDate: string;
  endDate: string;
  totalAmount: number;
  dailyAmount: number;
  status: string;
  totalPaid: number;
  outstanding: number;
  payments: Array<{
    id: string;
    dayNumber: number;
    amountPaid: number;
    scheduledAmount: number;
    previousPending: number;
    newPending: number;
    paidAt: string;
    note?: string;
  }>;
};

type RecordCustomer = {
  id: string;
  customerNumber: number;
  customerCode: string;
  name: string;
  phone?: string;
  nic?: string;
  email?: string;
  electricityAccount?: string;
  waterAccount?: string;
  gramaNiladhariName?: string;
  gramaNiladhariPhone?: string;
  specialNote?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  loans: RecordLoan[];
  aggregates: {
    totalLoans: number;
    activeLoans: number;
    totalPrincipal: number;
    totalOutstanding: number;
    totalPaid: number;
  };
};

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get('scope') ?? 'search';
  const query = searchParams.get('query')?.trim() ?? '';
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Number(limitParam) : 100;

  const filters = scope === 'full' || !query
    ? {}
    : {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { phone: { $regex: query, $options: 'i' } },
          { nic: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
        ],
      };

  await connectDB();

  const customerDocs = await Customer.find(filters)
    .sort({ customerNumber: 1 })
    .limit(scope === 'full' ? 0 : limit)
    .lean();

  if (customerDocs.length === 0) {
    return NextResponse.json({
      customers: [],
      generatedAt: new Date().toISOString(),
    });
  }

  const customerIds = customerDocs.map((customer) => customer._id);
  const loanDocs = await Loan.find({ customer: { $in: customerIds } })
    .sort({ loanNumber: 1 })
    .lean();

  const loanIds = loanDocs.map((loan) => loan._id);
  const paymentDocs = await Payment.find({ loan: { $in: loanIds } })
    .sort({ paidAt: 1 })
    .lean();

  const paymentsByLoan = new Map<string, typeof paymentDocs>();
  paymentDocs.forEach((payment) => {
    const key = payment.loan.toString();
    const bucket = paymentsByLoan.get(key);
    if (bucket) {
      bucket.push(payment);
    } else {
      paymentsByLoan.set(key, [payment]);
    }
  });

  const loansByCustomer = new Map<string, RecordLoan[]>();

  loanDocs.forEach((loan) => {
    const loanKey = loan._id.toString();
    const customerKey = loan.customer.toString();
    const loanPayments = paymentsByLoan.get(loanKey) ?? [];
    const payments = loanPayments.map((payment, index) => ({
      id: payment._id.toString(),
      dayNumber: index + 1,
      amountPaid: payment.amountPaid,
      scheduledAmount: payment.scheduledAmount,
      previousPending: payment.previousPending,
      newPending: payment.newPending,
      paidAt: payment.paidAt.toISOString(),
      note: payment.note ?? undefined,
    }));

    const totalPaid = loanPayments.reduce((sum, payment) => sum + payment.amountPaid, 0);
    const outstanding = Math.max(loan.totalAmount - totalPaid, 0);

    const formattedLoan: RecordLoan = {
      id: loanKey,
      loanNumber: loan.loanNumber,
    loanCode: formatLoanCode(loan.loanNumber),
      principal: loan.principal,
      interestRate: loan.interestRate,
      termDays: loan.termDays,
      startDate: loan.startDate.toISOString(),
      endDate: loan.endDate.toISOString(),
      totalAmount: loan.totalAmount,
      dailyAmount: loan.dailyAmount,
      status: loan.status,
      totalPaid,
      outstanding,
      payments,
    };

    const customerLoans = loansByCustomer.get(customerKey);
    if (customerLoans) {
      customerLoans.push(formattedLoan);
    } else {
      loansByCustomer.set(customerKey, [formattedLoan]);
    }
  });

  const customers: RecordCustomer[] = customerDocs.map((customer) => {
    const customerKey = customer._id.toString();
    const customerLoans = loansByCustomer.get(customerKey) ?? [];

    const aggregates = customerLoans.reduce(
      (acc, loan) => {
        acc.totalLoans += 1;
        if (loan.status === 'active') {
          acc.activeLoans += 1;
        }
        acc.totalPrincipal += loan.principal;
        acc.totalPaid += loan.totalPaid;
        acc.totalOutstanding += loan.outstanding;
        return acc;
      },
      {
        totalLoans: 0,
        activeLoans: 0,
        totalPrincipal: 0,
        totalOutstanding: 0,
        totalPaid: 0,
      },
    );

    return {
      id: customerKey,
      customerNumber: customer.customerNumber,
    customerCode: formatCustomerCode(customer.customerNumber),
      name: customer.name,
      phone: customer.phone ?? undefined,
      nic: customer.nic ?? undefined,
      email: customer.email ?? undefined,
      electricityAccount: customer.electricityAccount ?? undefined,
      waterAccount: customer.waterAccount ?? undefined,
      gramaNiladhariName: customer.gramaNiladhariName ?? undefined,
      gramaNiladhariPhone: customer.gramaNiladhariPhone ?? undefined,
      specialNote: customer.specialNote ?? undefined,
      status: customer.status,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
      loans: customerLoans,
      aggregates,
    };
  });

  return NextResponse.json({
    customers,
    generatedAt: new Date().toISOString(),
    scope,
  });
}


