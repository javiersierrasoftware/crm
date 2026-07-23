import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEmailTemplate extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  subject: string;
  previewText?: string;
  bodyHtml: string;
  bodyText?: string;
  designJson?: string; // Optional field for builder UI configuration state
  createdAt: Date;
  updatedAt: Date;
}

const EmailTemplateSchema = new Schema<IEmailTemplate>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    previewText: { type: String, trim: true },
    bodyHtml: { type: String, required: true },
    bodyText: { type: String },
    designJson: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes
EmailTemplateSchema.index({ organizationId: 1, name: 1 });

const EmailTemplate: Model<IEmailTemplate> =
  mongoose.models.EmailTemplate ||
  mongoose.model<IEmailTemplate>('EmailTemplate', EmailTemplateSchema);

export default EmailTemplate;
