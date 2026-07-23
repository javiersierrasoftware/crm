import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPendingPayment extends Document {
  organizationId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  billingPeriod: 'monthly' | 'yearly';
  paymentLinkId: string;
  createdAt: Date;
}

const PendingPaymentSchema = new Schema<IPendingPayment>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    billingPeriod: { type: String, enum: ['monthly', 'yearly'], required: true },
    paymentLinkId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 172800 }, // Auto-delete after 2 days (172800 seconds)
  }
);

PendingPaymentSchema.index({ paymentLinkId: 1 }, { unique: true });

delete mongoose.models.PendingPayment;

const PendingPayment: Model<IPendingPayment> =
  mongoose.models.PendingPayment || mongoose.model<IPendingPayment>('PendingPayment', PendingPaymentSchema);

export default PendingPayment;
