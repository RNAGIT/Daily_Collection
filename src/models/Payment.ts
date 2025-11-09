import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface IPayment extends Document {
  loan: Types.ObjectId;
  customer: Types.ObjectId;
  amountPaid: number;
  scheduledAmount: number;
  previousPending: number;
  newPending: number;
  collectedBy?: Types.ObjectId;
  paidAt: Date;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    loan: { type: Schema.Types.ObjectId, ref: 'Loan', required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    amountPaid: { type: Number, required: true },
    scheduledAmount: { type: Number, required: true },
    previousPending: { type: Number, required: true },
    newPending: { type: Number, required: true },
    collectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    paidAt: { type: Date, required: true },
    note: { type: String },
  },
  { timestamps: true },
);

export const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);

