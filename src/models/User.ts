import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type UserStatus = 'active' | 'inactive' | 'warning';
export type UserRole = 'superadmin' | 'admin' | 'collector' | 'viewer';

export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  passwordResetOtpHash?: string;
  passwordResetOtpExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    password: { type: String, required: true },
    role: { type: String, enum: ['superadmin', 'admin', 'collector', 'viewer'], default: 'admin' },
    status: { type: String, enum: ['active', 'inactive', 'warning'], default: 'active' },
    lastLoginAt: { type: Date },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
    passwordResetOtpHash: { type: String },
    passwordResetOtpExpires: { type: Date },
  },
  {
    timestamps: true,
  },
);

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

