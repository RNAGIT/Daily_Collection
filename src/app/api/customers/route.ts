import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Customer } from '@/models/Customer';
import { getCurrentUser } from '@/lib/current-user';

const customerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  nic: z.string().optional(),
  email: z.string().email().optional(),
  electricityAccount: z.string().optional(),
  waterAccount: z.string().optional(),
  gramaNiladhariName: z.string().optional(),
  gramaNiladhariPhone: z.string().optional(),
  specialNote: z.string().optional(),
  status: z.enum(['active', 'inactive', 'warning']).optional(),
});

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const status = searchParams.get('status');

  await connectDB();

  const filters: Record<string, unknown> = {};

  if (query) {
    const regex = new RegExp(query, 'i');
    filters.$or = [{ name: regex }, { phone: regex }, { nic: regex }, { email: regex }];
  }

  if (status) {
    filters.status = status;
  }

  const customers = await Customer.find(filters).sort({ customerNumber: 1 });

  return NextResponse.json({
    customers: customers.map((customer) => ({
      id: customer.id,
      customerNumber: customer.customerNumber,
      name: customer.name,
      phone: customer.phone,
      nic: customer.nic,
      email: customer.email,
      status: customer.status,
      createdAt: customer.createdAt,
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
    const data = customerSchema.parse(body);

    await connectDB();

    const lastCustomer = await Customer.findOne().sort({ customerNumber: -1 });
    const nextNumber = lastCustomer ? lastCustomer.customerNumber + 1 : 1;

    const customer = await Customer.create({
      customerNumber: nextNumber,
      ...data,
    });

    return NextResponse.json(
      {
        message: 'Customer created',
        customer: {
          id: customer.id,
          customerNumber: customer.customerNumber,
          name: customer.name,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid input', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: 'Unable to create customer' }, { status: 500 });
  }
}

