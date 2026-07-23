import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICompany extends Document {
  organizationId: mongoose.Types.ObjectId;
  razonSocial: string; // Renamed from commercialName
  nit?: string; // Renamed from taxId
  actividad?: string; // Renamed from sector
  dirComercial?: string; // Renamed from address
  munComercial?: string; // Renamed from city
  telCom1?: string; // Renamed from phone
  emailComercial?: string; // Renamed from email
  status?: string; // Renamed from commercialStatus to support "Nuevo", "active", etc.
  
  // New imported fields
  activoTotal?: string;
  ciiu1?: string;
  ciiu2?: string;
  fecMatricula?: string;
  fecRenovacion?: string;
  matricula?: string;
  ultAnoRen?: string;
  identificacion?: string;
  emailNotificacion?: string;

  legalName?: string;
  taxType?: string;
  subsector?: string;
  size?: 'micro' | 'small' | 'medium' | 'large';
  estimatedEmployees?: number;
  country?: string;
  state?: string;
  whatsApp?: string;
  website?: string;
  socialLinks?: {
    linkedIn?: string;
    twitter?: string;
    facebook?: string;
  };
  description?: string;
  dataSource?: string;
  assignedAgentId?: mongoose.Types.ObjectId;
  tags: string[];
  interestLevel?: 'low' | 'medium' | 'high';
  leadScore: number;
  lastContactedAt?: Date;
  nextFollowUpAt?: Date;
  commercialConsent: boolean;
  subscriptionStatus: 'subscribed' | 'unsubscribed' | 'bounced';
  customFields?: Record<string, any>;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    razonSocial: { type: String, required: true, trim: true },
    nit: { type: String, trim: true },
    actividad: { type: String, trim: true },
    dirComercial: { type: String, trim: true },
    munComercial: { type: String, trim: true },
    telCom1: { type: String, trim: true },
    emailComercial: { type: String, lowercase: true, trim: true },
    status: { type: String, default: 'Nuevo', trim: true },

    activoTotal: { type: String, trim: true },
    ciiu1: { type: String, trim: true },
    ciiu2: { type: String, trim: true },
    fecMatricula: { type: String, trim: true },
    fecRenovacion: { type: String, trim: true },
    matricula: { type: String, trim: true },
    ultAnoRen: { type: String, trim: true },
    identificacion: { type: String, trim: true },
    emailNotificacion: { type: String, lowercase: true, trim: true },

    legalName: { type: String, trim: true },
    taxType: { type: String, trim: true },
    subsector: { type: String, trim: true },
    size: {
      type: String,
      enum: ['micro', 'small', 'medium', 'large'],
      default: 'micro',
    },
    estimatedEmployees: { type: Number, default: 0 },
    country: { type: String, trim: true },
    state: { type: String, trim: true },
    whatsApp: { type: String, trim: true },
    website: { type: String, trim: true },
    socialLinks: {
      linkedIn: { type: String, trim: true },
      twitter: { type: String, trim: true },
      facebook: { type: String, trim: true },
    },
    description: { type: String },
    dataSource: { type: String, trim: true },
    assignedAgentId: { type: Schema.Types.ObjectId, ref: 'User' },
    tags: [{ type: String, trim: true }],
    interestLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    leadScore: { type: Number, default: 0, required: true },
    lastContactedAt: { type: Date },
    nextFollowUpAt: { type: Date },
    commercialConsent: { type: Boolean, default: true, required: true }, // Default true for import convenience
    subscriptionStatus: {
      type: String,
      enum: ['subscribed', 'unsubscribed', 'bounced'],
      default: 'subscribed',
      required: true,
    },
    customFields: { type: Schema.Types.Mixed, default: {} },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

// Composite indexes for query isolation and speed
CompanySchema.index({ organizationId: 1, nit: 1 });
CompanySchema.index({ organizationId: 1, deletedAt: 1, status: 1 });
CompanySchema.index({ organizationId: 1, deletedAt: 1, assignedAgentId: 1 });
CompanySchema.index({ organizationId: 1, deletedAt: 1, razonSocial: 1 });
CompanySchema.index({ organizationId: 1, deletedAt: 1, emailComercial: 1 });
CompanySchema.index({ organizationId: 1, tags: 1 });
CompanySchema.index({ organizationId: 1, munComercial: 1, actividad: 1 });

const Company: Model<ICompany> =
  mongoose.models.Company || mongoose.model<ICompany>('Company', CompanySchema);

export default Company;
