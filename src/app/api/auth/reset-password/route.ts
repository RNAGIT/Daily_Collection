import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    {
      message:
        'Password resets now require an email OTP. Submit your email to /api/auth/forgot-password to receive a code, then resend the request with the OTP and new password.',
    },
    { status: 410 },
  );
}

