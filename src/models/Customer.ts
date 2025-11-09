import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type CustomerStatus = 'active' | 'inactive' | 'warning';

export interface ICustomer extends Document {
  customerNumber: number;
  name: string;
  phone?: string;
  nic?: string;
  email?: string;
  electricityAccount?: string;
  waterAccount?: string;
  gramaNiladhariName?: string;
  gramaNiladhariPhone?: string;
  specialNote?: string;
  status: CustomerStatus;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    customerNumber: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    phone: { type: String },
    nic: { type: String },
    email: { type: String },
    electricityAccount: { type: String },
    waterAccount: { type: String },
    gramaNiladhariName: { type: String },
    gramaNiladhariPhone: { type: String },
    specialNote: { type: String },
    status: { type: String, enum: ['active', 'inactive', 'warning'], default: 'active' },
  },
  { timestamps: true },
);

export const Customer: Model<ICustomer> =
  mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);

