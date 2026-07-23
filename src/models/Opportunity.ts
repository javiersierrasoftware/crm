import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOpportunity extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  companyId: mongoose.Types.ObjectId;
  primaryContactId?: mongoose.Types.ObjectId | null;
  estimatedValue: number;
  probability: number; // 0 to 100
  pipelineId: mongoose.Types.ObjectId;
  stageId: mongoose.Types.ObjectId; // References the subdocument _id inside Pipeline stages
  expectedCloseDate?: Date;
  assignedAgentId?: mongoose.Types.ObjectId;
  dataSource?: string;
  products: string[];
  status: 'open' | 'won' | 'lost';
  lostReason?: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOpportunityHistory extends Document {
  opportunityId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  field: 'stage' | 'value' | 'agent' | 'status';
  oldValue?: string;
  newValue?: string;
  createdAt: Date;
}

const OpportunitySchema = new Schema<IOpportunity>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true, trim: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    primaryContactId: { type: Schema.Types.ObjectId, ref: 'Contact', default: null },
    estimatedValue: { type: Number, required: true, default: 0 },
    probability: { type: Number, required: true, min: 0, max: 100, default: 50 },
    pipelineId: { type: Schema.Types.ObjectId, ref: 'Pipeline', required: true },
    stageId: { type: Schema.Types.ObjectId, required: true },
    expectedCloseDate: { type: Date },
    assignedAgentId: { type: Schema.Types.ObjectId, ref: 'User' },
    dataSource: { type: String, trim: true },
    products: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: ['open', 'won', 'lost'],
      default: 'open',
      required: true,
    },
    lostReason: { type: String, trim: true },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

const OpportunityHistorySchema = new Schema<IOpportunityHistory>(
  {
    opportunityId: { type: Schema.Types.ObjectId, ref: 'Opportunity', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    field: {
      type: String,
      enum: ['stage', 'value', 'agent', 'status'],
      required: true,
    },
    oldValue: { type: String },
    newValue: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
OpportunitySchema.index({ organizationId: 1, pipelineId: 1, stageId: 1 });
OpportunitySchema.index({ organizationId: 1, companyId: 1 });
OpportunitySchema.index({ organizationId: 1, deletedAt: 1, status: 1 });
OpportunitySchema.index({ organizationId: 1, deletedAt: 1, assignedAgentId: 1 });

OpportunityHistorySchema.index({ opportunityId: 1 });

export const Opportunity: Model<IOpportunity> =
  mongoose.models.Opportunity || mongoose.model<IOpportunity>('Opportunity', OpportunitySchema);

export const OpportunityHistory: Model<IOpportunityHistory> =
  mongoose.models.OpportunityHistory ||
  mongoose.model<IOpportunityHistory>('OpportunityHistory', OpportunityHistorySchema);
