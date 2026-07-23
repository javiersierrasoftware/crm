import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPipelineStage {
  _id: mongoose.Types.ObjectId;
  name: string;
  key: string; // e.g. 'new', 'contacted', 'qualified', 'won', 'lost'
  order: number;
  winProbability: number; // 0 to 100
}

export interface IPipeline extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  isDefault: boolean;
  stages: IPipelineStage[];
  createdAt: Date;
  updatedAt: Date;
}

const PipelineStageSchema = new Schema<IPipelineStage>({
  name: { type: String, required: true, trim: true },
  key: { type: String, required: true, trim: true },
  order: { type: Number, required: true },
  winProbability: { type: Number, required: true, min: 0, max: 100, default: 50 },
});

const PipelineSchema = new Schema<IPipeline>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true, trim: true, default: 'Embudo de Ventas Principal' },
    isDefault: { type: Boolean, required: true, default: false },
    stages: [PipelineStageSchema],
  },
  {
    timestamps: true,
  }
);

// Indexes
PipelineSchema.index({ organizationId: 1, isDefault: 1 });

const Pipeline: Model<IPipeline> =
  mongoose.models.Pipeline || mongoose.model<IPipeline>('Pipeline', PipelineSchema);

export default Pipeline;
