import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IContact extends Document {
  organizationId: mongoose.Types.ObjectId;
  companyId?: mongoose.Types.ObjectId | null;
  firstName: string;
  lastName: string;
  position?: string;
  department?: string;
  email: string;
  phone?: string;
  whatsApp?: string;
  linkedIn?: string;
  isPrimary: boolean;
  status: 'active' | 'inactive';
  dataSource?: string;
  tags: string[];
  commercialConsent: boolean;
  consentDate?: Date;
  consentChannel?: string;
  subscriptionStatus: 'subscribed' | 'unsubscribed' | 'bounced';
  observations?: string;
  customFields?: Record<string, any>;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    position: { type: String, trim: true },
    department: { type: String, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    whatsApp: { type: String, trim: true },
    linkedIn: { type: String, trim: true },
    isPrimary: { type: Boolean, default: false, required: true },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      required: true,
    },
    dataSource: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    commercialConsent: { type: Boolean, default: false, required: true },
    consentDate: { type: Date },
    consentChannel: { type: String, trim: true },
    subscriptionStatus: {
      type: String,
      enum: ['subscribed', 'unsubscribed', 'bounced'],
      default: 'subscribed',
      required: true,
    },
    observations: { type: String },
    customFields: { type: Schema.Types.Mixed, default: {} },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

// Indexes
ContactSchema.index({ organizationId: 1, email: 1 });
ContactSchema.index({ organizationId: 1, companyId: 1 });
ContactSchema.index({ organizationId: 1, deletedAt: 1, isPrimary: 1 });
ContactSchema.index({ organizationId: 1, subscriptionStatus: 1 });

const Contact: Model<IContact> =
  mongoose.models.Contact || mongoose.model<IContact>('Contact', ContactSchema);

export default Contact;
