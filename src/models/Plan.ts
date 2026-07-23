import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPlan extends Document {
  name: string;
  code: 'PLAN_GRATIS' | 'PLAN_INICIAL' | 'PLAN_PROFESIONAL' | 'PLAN_EMPRESARIAL';
  maxUsers: number;
  maxCompanies: number;
  maxContacts: number;
  maxEmailsPerMonth: number;
  maxAutomations: number;
  features: string[];
  price: number;
  discountPercent: number;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema = new Schema<IPlan>(
  {
    name: { type: String, required: true, trim: true },
    code: {
      type: String,
      enum: ['PLAN_GRATIS', 'PLAN_INICIAL', 'PLAN_PROFESIONAL', 'PLAN_EMPRESARIAL'],
      required: true,
      unique: true,
    },
    maxUsers: { type: Number, required: true },
    maxCompanies: { type: Number, required: true },
    maxContacts: { type: Number, required: true },
    maxEmailsPerMonth: { type: Number, required: true },
    maxAutomations: { type: Number, required: true },
    features: [{ type: String }],
    price: { type: Number, required: true, default: 0 },
    discountPercent: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.Plan) {
  delete (mongoose.models as any).Plan;
}

const Plan: Model<IPlan> = mongoose.model<IPlan>('Plan', PlanSchema);

export default Plan;
