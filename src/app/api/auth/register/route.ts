import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { hashPassword, setAuthCookie, signAuthToken } from '@/lib/auth';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6),
  role: z.enum(['admin', 'superadmin']).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = registerSchema.parse(body);

    await connectDB();

    const existing = await User.findOne({ email: data.email });
    if (existing) {
      return NextResponse.json({ message: 'Email already registered' }, { status: 409 });
    }

    const userCount = await User.countDocuments();
    const role = data.role ?? (userCount === 0 ? 'superadmin' : 'admin');

    const passwordHash = await hashPassword(data.password);

    const user = await User.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: passwordHash,
      role,
      status: 'active',
    });

    const token = signAuthToken(user);
    setAuthCookie(token);

    return NextResponse.json({
      message: 'Registration successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid input', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: 'Registration failed' }, { status: 500 });
  }
}
