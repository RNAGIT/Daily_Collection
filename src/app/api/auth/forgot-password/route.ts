import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { sendEmail } from '@/lib/mailer';
import { generateOtp, verifyOtp } from '@/lib/otp';
import { hashPassword } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const forgotSchema = z.object({
  email: z.string().email(),
  otp: z
    .string()
    .regex(/^\d{6}$/, 'OTP must be a 6 digit code')
    .optional(),
  password: z.string().min(6).optional(),
  confirmPassword: z.string().min(6).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = forgotSchema.parse(body);

    await connectDB();
    const user = await User.findOne({ email: data.email });

    if (!user) {
      return NextResponse.json({ message: 'If the email exists, an OTP has been sent.' });
    }

    if (!data.otp) {
      const { otp, hash, expiresAt } = generateOtp({ ttlMs: 1000 * 60 * 10 });
      user.passwordResetOtpHash = hash;
      user.passwordResetOtpExpires = expiresAt;
      await user.save();

      await sendEmail({
        to: user.email,
        subject: 'Your Arunalu Investments password reset code',
        html: `
          <p>Hi ${user.name},</p>
          <p>Your one-time password to reset your account is:</p>
          <p style="font-size:24px;font-weight:700;letter-spacing:0.35em;">${otp}</p>
          <p>This code expires in 10 minutes. If you did not request a password reset, please ignore this message.</p>
        `,
      });

      return NextResponse.json({
        message: 'OTP sent to registered email address.',
        requiresOtp: true,
      });
    }

    if (!user.passwordResetOtpHash || !user.passwordResetOtpExpires) {
      return NextResponse.json({ message: 'Request a fresh OTP to continue.' }, { status: 400 });
    }

    if (user.passwordResetOtpExpires.getTime() < Date.now()) {
      user.passwordResetOtpHash = undefined;
      user.passwordResetOtpExpires = undefined;
      await user.save();
      return NextResponse.json({ message: 'OTP expired. Request a new one.' }, { status: 400 });
    }

    if (!data.password || !data.confirmPassword) {
      return NextResponse.json({ message: 'Password and confirmation are required.' }, { status: 400 });
    }

    if (data.password !== data.confirmPassword) {
      return NextResponse.json({ message: 'Passwords do not match.' }, { status: 400 });
    }

    const otpValid = verifyOtp(data.otp, user.passwordResetOtpHash);
    if (!otpValid) {
      return NextResponse.json({ message: 'Invalid OTP code.' }, { status: 401 });
    }

    user.password = await hashPassword(data.password);
    user.passwordResetOtpHash = undefined;
    user.passwordResetOtpExpires = undefined;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return NextResponse.json({ message: 'Password updated successfully.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid input', issues: error.issues }, { status: 400 });
    }
    console.error('[api/auth/forgot-password]', error);
    return NextResponse.json({ message: 'Unable to process request' }, { status: 500 });
  }
}

