import { addDays, startOfDay } from 'date-fns';
import type { IScheduleEntry } from '@/models/Loan';

export interface LoanCalculationInput {
  principal: number;
  interestRate: number;
  termDays: number;
  startDate?: Date;
}

export interface LoanCalculationResult {
  totalInterest: number;
  totalAmount: number;
  dailyAmount: number;
  endDate: Date;
  schedule: IScheduleEntry[];
}

export function calculateLoan({
  principal,
  interestRate,
  termDays,
  startDate,
}: LoanCalculationInput): LoanCalculationResult {
  const rate = interestRate / 100;
  const totalInterest = parseFloat((principal * rate).toFixed(2));
  const totalAmount = parseFloat((principal + totalInterest).toFixed(2));
  const dailyAmount = parseFloat((totalAmount / termDays).toFixed(2));
  const beginning = startOfDay(startDate ?? new Date());
  const endDate = addDays(beginning, termDays - 1);

  const schedule: IScheduleEntry[] = Array.from({ length: termDays }, (_, index) => {
    const day = index + 1;
    const dueAmount = parseFloat((dailyAmount * day).toFixed(2));
    const remainingBalance = parseFloat((totalAmount - dailyAmount * day).toFixed(2));

    return {
      day,
      date: addDays(beginning, index),
      plannedAmount: dailyAmount,
      dueAmount,
      paidAmount: 0,
      remainingBalance: remainingBalance >= 0 ? remainingBalance : 0,
    };
  });

  return {
    totalInterest,
    totalAmount,
    dailyAmount,
    endDate,
    schedule,
  };
}

