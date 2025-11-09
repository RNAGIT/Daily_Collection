import mongoose from 'mongoose';
import { Loan } from '@/models/Loan';
import { Payment } from '@/models/Payment';

export async function recalculateLoanPaymentState(loanId: mongoose.Types.ObjectId | string) {
  const loan = await Loan.findById(loanId);
  if (!loan) {
    return;
  }

  const payments = await Payment.find({ loan: loan._id }).sort({ paidAt: 1 });

  let remainingBalance = parseFloat(loan.totalAmount.toFixed(2));
  const paymentSaves: Array<Promise<unknown>> = [];

  payments.forEach((payment) => {
    payment.previousPending = parseFloat(remainingBalance.toFixed(2));
    remainingBalance = parseFloat((remainingBalance - payment.amountPaid).toFixed(2));
    if (remainingBalance < 0) {
      remainingBalance = 0;
    }
    payment.newPending = remainingBalance;
    payment.scheduledAmount = loan.dailyAmount;
    paymentSaves.push(payment.save());
  });

  const paymentAmounts = payments.map((payment) => payment.amountPaid);
  let queueIndex = 0;
  let queueRemaining = paymentAmounts[0] ?? 0;
  let cumulativePaid = 0;

  const updatedSchedule = loan.schedule.map((entryDoc) => {
    const entry = entryDoc;
    let due = entry.plannedAmount;
    let paidForDay = 0;

    while (due > 0 && queueIndex < paymentAmounts.length) {
      const applied = Math.min(due, queueRemaining);
      paidForDay += applied;
      due -= applied;
      queueRemaining -= applied;

      if (queueRemaining <= 0) {
        queueIndex += 1;
        queueRemaining = paymentAmounts[queueIndex] ?? 0;
      }
    }

    cumulativePaid += paidForDay;

    return {
      ...entry,
      paidAmount: parseFloat(paidForDay.toFixed(2)),
      remainingBalance: parseFloat(Math.max(loan.totalAmount - cumulativePaid, 0).toFixed(2)),
    };
  });

  loan.schedule = updatedSchedule as typeof loan.schedule;

  const finalRemaining = Math.max(loan.totalAmount - cumulativePaid, 0);
  if (finalRemaining <= 0) {
    loan.status = 'closed';
  } else if (finalRemaining / loan.totalAmount > 0.2) {
    loan.status = 'warning';
  } else {
    loan.status = 'active';
  }

  await Promise.all(paymentSaves);
  loan.markModified('schedule');
  await loan.save();
}

