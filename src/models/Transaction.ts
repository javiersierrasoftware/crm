import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITransaction extends Document {
  organizationId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  amount: number; // in COP
  wompiTransactionId: string;
  status: 'APPROVED' | 'DECLINED' | 'VOIDED' | 'PENDING';
  reference: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    amount: { type: Number, required: true },
    wompiTransactionId: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['APPROVED', 'DECLINED', 'VOIDED', 'PENDING'],
      required: true,
      default: 'PENDING',
    },
    reference: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

TransactionSchema.index({ organizationId: 1 });
TransactionSchema.index({ wompiTransactionId: 1 });

const Transaction: Model<ITransaction> =
  mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;
