import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export type LoanStatus = 'active' | 'closed' | 'warning';

export interface IScheduleEntry {
  day: number;
  date: Date;
  plannedAmount: number;
  dueAmount: number;
  paidAmount: number;
  remainingBalance: number;
}

export interface ILoan extends Document {
  loanNumber: number;
  customer: Types.ObjectId;
  principal: number;
  interestRate: number;
  termDays: number;
  startDate: Date;
  endDate: Date;
  totalInterest: number;
  totalAmount: number;
  dailyAmount: number;
  status: LoanStatus;
  notes?: string;
  schedule: IScheduleEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const ScheduleSchema = new Schema<IScheduleEntry>(
  {
    day: { type: Number, required: true },
    date: { type: Date, required: true },
    plannedAmount: { type: Number, required: true },
    dueAmount: { type: Number, required: true },
    paidAmount: { type: Number, required: true, default: 0 },
    remainingBalance: { type: Number, required: true },
  },
  { _id: false },
);

const LoanSchema = new Schema<ILoan>(
  {
    loanNumber: { type: Number, required: true, unique: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    principal: { type: Number, required: true },
    interestRate: { type: Number, required: true },
    termDays: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalInterest: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    dailyAmount: { type: Number, required: true },
    status: { type: String, enum: ['active', 'closed', 'warning'], default: 'active' },
    notes: { type: String },
    schedule: { type: [ScheduleSchema], default: [] },
  },
  { timestamps: true },
);

export const Loan: Model<ILoan> = mongoose.models.Loan || mongoose.model<ILoan>('Loan', LoanSchema);

