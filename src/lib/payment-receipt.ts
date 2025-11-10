import type { Document } from 'mongoose';
import { differenceInCalendarDays, format } from 'date-fns';
import type { ILoan } from '@/models/Loan';
import type { IPayment } from '@/models/Payment';
import type { ICustomer } from '@/models/Customer';
import { formatLoanCode } from '@/lib/formatters';

export interface PaymentReceiptData {
  paymentId: string;
  loanId: string;
  loanNumber: number;
  paymentDate: string;
  headline: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  dayNumber: number;
  totalWithInterest: number;
  dailyInstallment: number;
  paidToday: number;
  pendingAmount: number;
  arrears: number;
  notes?: string;
  previewPath: string;
}

type LoanDoc = Document & ILoan;
type PaymentDoc = Document & IPayment;
type CustomerDoc = Document & ICustomer;

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
  }).format(value);
}

function slugifyCustomerName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildPaymentReceipt({
  loan,
  payment,
  customer,
  dayNumber,
}: {
  loan: LoanDoc;
  payment: PaymentDoc;
  customer: CustomerDoc;
  dayNumber?: number;
}): PaymentReceiptData {
  const arrears = Number((payment.amountPaid - payment.scheduledAmount).toFixed(2));
  const customerSlug = slugifyCustomerName(customer.name);
  const loanSlug = formatLoanCode(loan.loanNumber);
  const previewPath = `/payments/${customerSlug}/${encodeURIComponent(
    loanSlug,
  )}/preview?loanId=${loan.id}&paymentId=${payment.id}`;
  const computedDayNumber =
    dayNumber ??
    Math.max(
      1,
      Math.min(
        loan.termDays || Number.POSITIVE_INFINITY,
        differenceInCalendarDays(payment.paidAt, loan.startDate) + 1,
      ),
    );

  return {
    paymentId: payment.id,
    loanId: loan.id,
    loanNumber: loan.loanNumber,
    paymentDate: payment.paidAt.toISOString(),
    headline: 'Arunalu Investments',
    customerName: customer.name,
    customerPhone: customer.phone,
    customerEmail: customer.email,
    dayNumber: computedDayNumber,
    totalWithInterest: Number(loan.totalAmount.toFixed(2)),
    dailyInstallment: Number(payment.scheduledAmount.toFixed(2)),
    paidToday: Number(payment.amountPaid.toFixed(2)),
    pendingAmount: Number(payment.newPending.toFixed(2)),
    arrears,
    notes: payment.note ?? undefined,
    previewPath,
  };
}

export function renderReceiptEmailHtml(data: PaymentReceiptData) {
  const paymentDate = format(new Date(data.paymentDate), 'dd MMM yyyy, hh:mm a');

  return `
    <div style="font-family: Inter, Arial, sans-serif; background-color: #0f172a; color: #e2e8f0; padding: 24px;">
      <div style="max-width: 480px; margin: 0 auto; background: rgba(15, 23, 42, 0.8); border-radius: 16px; border: 1px solid rgba(148, 163, 184, 0.2); padding: 24px;">
        <h1 style="text-transform: uppercase; font-size: 12px; letter-spacing: 0.4em; color: #38bdf8; margin-bottom: 8px;">
          ${data.headline}
        </h1>
        <h2 style="font-size: 20px; margin: 0 0 12px; color: #f8fafc;">Payment acknowledgement</h2>
        <p style="margin: 0 0 16px;">Hi ${data.customerName},</p>
        <p style="margin: 0 0 16px;">Thank you for your payment. Please review the receipt details below:</p>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
          <tbody>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Loan number</td>
              <td style="padding: 8px 0; text-align: right; color: #f8fafc;">${formatLoanCode(data.loanNumber)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Schedule day</td>
              <td style="padding: 8px 0; text-align: right; color: #f8fafc;">Day ${data.dayNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Payment date</td>
              <td style="padding: 8px 0; text-align: right; color: #f8fafc;">${paymentDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Total capital with interest</td>
              <td style="padding: 8px 0; text-align: right; color: #f8fafc;">${formatCurrency(data.totalWithInterest)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Daily installment</td>
              <td style="padding: 8px 0; text-align: right; color: #f8fafc;">${formatCurrency(data.dailyInstallment)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Paid today</td>
              <td style="padding: 8px 0; text-align: right; color: #34d399; font-weight: 600;">${formatCurrency(data.paidToday)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Pending amount</td>
              <td style="padding: 8px 0; text-align: right; color: #fbbf24;">${formatCurrency(data.pendingAmount)}</td>
            </tr>
            ${
              data.arrears < 0
                ? `
                  <tr>
                    <td style="padding: 8px 0; color: #94a3b8;">Total arrears</td>
                    <td style="padding: 8px 0; text-align: right; color: #f87171;">
                      ${formatCurrency(Math.abs(data.arrears))} outstanding
                    </td>
                  </tr>
                `
                : ''
            }
          </tbody>
        </table>

        ${
          data.notes
            ? `<div style="margin-bottom: 16px;">
                <h3 style="font-size: 14px; color: #38bdf8; margin-bottom: 6px;">Notes</h3>
                <p style="margin: 0; color: #cbd5f5;">${data.notes}</p>
              </div>`
            : ''
        }

        <p style="margin: 16px 0 8px;">Thank you for choosing Arunalu Investments.</p>
        <p style="margin: 0; color: #94a3b8; font-size: 12px;">This is an automated notification. For any queries call +94 70 123 4567.</p>
      </div>
    </div>
  `;
}

export function renderReceiptSms(data: PaymentReceiptData) {
  const lines = [
    `${data.headline}`,
    `Loan ${formatLoanCode(data.loanNumber)} • Day ${data.dayNumber}`,
    `Today's payment: ${formatCurrency(data.paidToday)}`,
    `Daily instalment: ${formatCurrency(data.dailyInstallment)}`,
    `Balance now: ${formatCurrency(data.pendingAmount)}`,
  ];

  if (data.arrears < 0) {
    lines.push(`Outstanding arrears: ${formatCurrency(Math.abs(data.arrears))}`);
  }

  if (data.notes) {
    lines.push(`Collector note: ${data.notes}`);
  }

  lines.push('Thank you for staying on track with Arunalu Investments!');

  return lines.join('\n');
}


