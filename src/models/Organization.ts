import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  taxId?: string;
  taxType?: string;
  sector?: string;
  country?: string;
  city?: string;
  address?: string;
  phone?: string;
  website?: string;
  logoUrl?: string;
  status: 'active' | 'suspended' | 'trial';
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    taxId: { type: String, trim: true },
    taxType: { type: String, trim: true },
    sector: { type: String, trim: true },
    country: { type: String, trim: true },
    city: { type: String, trim: true },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    website: { type: String, trim: true },
    logoUrl: { type: String, trim: true },
    status: {
      type: String,
      enum: ['active', 'suspended', 'trial'],
      default: 'trial',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for efficient queries
OrganizationSchema.index({ status: 1 });
OrganizationSchema.index({ taxId: 1 });

const Organization: Model<IOrganization> =
  mongoose.models.Organization || mongoose.model<IOrganization>('Organization', OrganizationSchema);

export default Organization;
