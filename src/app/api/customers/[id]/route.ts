import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Customer } from '@/models/Customer';
import { getCurrentUser } from '@/lib/current-user';

const customerUpdateSchema = z.object({
  name: z.string().min(2).optional(),
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
  const customer = await Customer.findById(params.id);

  if (!customer) {
    return NextResponse.json({ message: 'Customer not found' }, { status: 404 });
  }

  return NextResponse.json({
    customer: {
      id: customer.id,
      customerNumber: customer.customerNumber,
      name: customer.name,
      phone: customer.phone,
      nic: customer.nic,
      email: customer.email,
      electricityAccount: customer.electricityAccount,
      waterAccount: customer.waterAccount,
      gramaNiladhariName: customer.gramaNiladhariName,
      gramaNiladhariPhone: customer.gramaNiladhariPhone,
      specialNote: customer.specialNote,
      status: customer.status,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
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
    const data = customerUpdateSchema.parse(body);

    await connectDB();

    const customer = await Customer.findByIdAndUpdate(params.id, data, { new: true });

    if (!customer) {
      return NextResponse.json({ message: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Customer updated',
      customer: {
        id: customer.id,
        name: customer.name,
        status: customer.status,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid input', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: 'Unable to update customer' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
  }

  await connectDB();

  const customer = await Customer.findByIdAndDelete(params.id);

  if (!customer) {
    return NextResponse.json({ message: 'Customer not found' }, { status: 404 });
  }

  return NextResponse.json({ message: 'Customer deleted' });
}

