import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { comparePassword, setAuthCookie, signAuthToken } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = loginSchema.parse(body);

    await connectDB();

    const user = await User.findOne({ email: data.email });

    if (!user) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return NextResponse.json(
        { message: 'Only administrator accounts can access this portal.' },
        { status: 403 },
      );
    }

    const isValid = await comparePassword(data.password, user.password);
    if (!isValid) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = signAuthToken(user);
    setAuthCookie(token);

    return NextResponse.json({
      message: 'Login successful',
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
    console.error('[api/auth/login]', error);
    return NextResponse.json({ message: 'Login failed' }, { status: 500 });
  }
}

