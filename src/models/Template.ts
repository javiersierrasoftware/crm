import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITemplate extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  type: 'email' | 'whatsapp';
  subject?: string; // Optional, only used for emails
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

const TemplateSchema = new Schema<ITemplate>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['email', 'whatsapp'], required: true },
    subject: { type: String, trim: true },
    body: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

// Indexes
TemplateSchema.index({ organizationId: 1, type: 1 });
TemplateSchema.index({ organizationId: 1, name: 1 });

const Template: Model<ITemplate> =
  mongoose.models.Template || mongoose.model<ITemplate>('Template', TemplateSchema);

export default Template;
