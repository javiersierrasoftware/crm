import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISubscription extends Document {
  organizationId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  status: 'active' | 'suspended' | 'trialing' | 'canceled';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  emailsSentThisPeriod: number;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      unique: true,
    },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    status: {
      type: String,
      enum: ['active', 'suspended', 'trialing', 'canceled'],
      required: true,
      default: 'trialing',
    },
    currentPeriodStart: { type: Date, required: true, default: Date.now },
    currentPeriodEnd: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
    emailsSentThisPeriod: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Indexes
SubscriptionSchema.index({ status: 1 });

const Subscription: Model<ISubscription> =
  mongoose.models.Subscription ||
  mongoose.model<ISubscription>('Subscription', SubscriptionSchema);

export default Subscription;
