import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUnsubscribe extends Document {
  organizationId: mongoose.Types.ObjectId;
  email: string;
  reason: 'unsubscribed' | 'bounce' | 'complaint';
  campaignId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
}

const UnsubscribeSchema = new Schema<IUnsubscribe>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    reason: {
      type: String,
      enum: ['unsubscribed', 'bounce', 'complaint'],
      default: 'unsubscribed',
      required: true,
    },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes: unique email per organization
UnsubscribeSchema.index({ organizationId: 1, email: 1 }, { unique: true });

const Unsubscribe: Model<IUnsubscribe> =
  mongoose.models.Unsubscribe ||
  mongoose.model<IUnsubscribe>('Unsubscribe', UnsubscribeSchema);

export default Unsubscribe;
