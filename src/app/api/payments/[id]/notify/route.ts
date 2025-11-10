import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Payment } from '@/models/Payment';
import { Loan } from '@/models/Loan';
import { Customer } from '@/models/Customer';
import { getCurrentUser } from '@/lib/current-user';
import {
  buildPaymentReceipt,
  renderReceiptEmailHtml,
  renderReceiptSms,
} from '@/lib/payment-receipt';
import type { PaymentReceiptData } from '@/lib/payment-receipt';
import { sendEmail } from '@/lib/mailer';
import { sendSms } from '@/lib/sms';
import { formatLoanCode } from '@/lib/formatters';

const receiptSummarySchema = z.object({
  paymentId: z.string(),
  loanId: z.string(),
  loanNumber: z.number(),
  paymentDate: z.string(),
  headline: z.string(),
  customerName: z.string(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().optional(),
  dayNumber: z.number().min(1).optional(),
  totalWithInterest: z.number(),
  dailyInstallment: z.number(),
  paidToday: z.number(),
  pendingAmount: z.number(),
  arrears: z.number(),
  notes: z.string().optional(),
  previewPath: z.string(),
});

const notifySchema = z.object({
  channel: z.enum(['sms', 'email']),
  summary: receiptSummarySchema,
});

async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  return user;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { channel, summary } = notifySchema.parse(body);

    await connectDB();

    let receipt = summary;

    try {
      const payment = await Payment.findById(params.id);
      if (payment) {
        const loan = await Loan.findById(payment.loan);
        const customer = await Customer.findById(payment.customer);
        if (loan && customer) {
          const paymentDay = await Payment.countDocuments({
            loan: loan.id,
            paidAt: { $lte: payment.paidAt },
          });

          receipt = buildPaymentReceipt({
            loan,
            payment,
            customer,
            dayNumber: summary.dayNumber ?? Math.max(paymentDay, 1),
          });
        }
      }
    } catch {
      // Fall back to the provided summary when the payment cannot be rehydrated.
    }

    const finalReceipt: PaymentReceiptData = {
      ...receipt,
      dayNumber: (receipt.dayNumber ?? summary.dayNumber ?? 1),
    };

    if (channel === 'sms') {
      if (!finalReceipt.customerPhone) {
        return NextResponse.json({ message: 'Customer phone number is missing.' }, { status: 400 });
      }
      try {
        await sendSms({
          to: finalReceipt.customerPhone,
          message: renderReceiptSms(finalReceipt),
        });
      } catch (smsError) {
        const errorMessage =
          smsError instanceof Error ? smsError.message : 'Unable to send SMS notification.';
        return NextResponse.json({ message: errorMessage }, { status: 502 });
      }
      return NextResponse.json({ message: 'SMS sent successfully.' });
    }

    if (!finalReceipt.customerEmail) {
      return NextResponse.json({ message: 'Customer email address is missing.' }, { status: 400 });
    }

    await sendEmail({
      to: finalReceipt.customerEmail,
      subject: `Payment receipt - Loan ${formatLoanCode(finalReceipt.loanNumber)}`,
      html: renderReceiptEmailHtml(finalReceipt),
    });

    return NextResponse.json({ message: 'Email sent successfully.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid input', issues: error.issues }, { status: 400 });
    }
    console.error('[payments-notify]', error);
    return NextResponse.json({ message: 'Unable to send notification' }, { status: 500 });
  }
}


