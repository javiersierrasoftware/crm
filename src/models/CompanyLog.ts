import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICompanyLog extends Document {
  organizationId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  actorId: mongoose.Types.ObjectId;
  actorName: string;
  type: 'note' | 'email' | 'whatsapp' | 'system';
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const CompanyLogSchema = new Schema<ICompanyLog>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorName: { type: String, required: true, trim: true },
    type: { type: String, enum: ['note', 'email', 'whatsapp', 'system'], required: true, default: 'note' },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

// Indexes
CompanyLogSchema.index({ companyId: 1, createdAt: -1 });
CompanyLogSchema.index({ organizationId: 1, companyId: 1 });

const CompanyLog: Model<ICompanyLog> =
  mongoose.models.CompanyLog || mongoose.model<ICompanyLog>('CompanyLog', CompanyLogSchema);

export default CompanyLog;
