import mongoose, { Schema, Document, Model } from 'mongoose';

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type EmailEventType = 'delivered' | 'bounce' | 'open' | 'click' | 'spamreport' | 'unsubscribe' | 'failed';

export interface ICampaign extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  templateId?: mongoose.Types.ObjectId | null;
  listId?: mongoose.Types.ObjectId | null;
  senderName: string;
  senderEmail: string;
  status: CampaignStatus;
  scheduledAt?: Date;
  sentAt?: Date;
  completedAt?: Date;
  totalRecipients: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  unsubscribedCount: number;
  failedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICampaignRecipient extends Document {
  organizationId: mongoose.Types.ObjectId;
  campaignId: mongoose.Types.ObjectId;
  contactId: mongoose.Types.ObjectId;
  email: string;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'bounced';
  sentAt?: Date;
  error?: string;
  createdAt: Date;
}

export interface IEmailEvent extends Document {
  organizationId: mongoose.Types.ObjectId;
  campaignId?: mongoose.Types.ObjectId | null;
  contactId: mongoose.Types.ObjectId;
  recipientId?: mongoose.Types.ObjectId | null;
  email: string;
  type: EmailEventType;
  url?: string;
  userAgent?: string;
  ipAddress?: string;
  timestamp: Date;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true, trim: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'EmailTemplate', default: null },
    listId: { type: Schema.Types.ObjectId, ref: 'List', default: null },
    senderName: { type: String, required: true, trim: true },
    senderEmail: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'sending', 'paused', 'completed', 'failed', 'cancelled'],
      default: 'draft',
      required: true,
    },
    scheduledAt: { type: Date },
    sentAt: { type: Date },
    completedAt: { type: Date },
    totalRecipients: { type: Number, default: 0, required: true },
    deliveredCount: { type: Number, default: 0, required: true },
    openedCount: { type: Number, default: 0, required: true },
    clickedCount: { type: Number, default: 0, required: true },
    bouncedCount: { type: Number, default: 0, required: true },
    unsubscribedCount: { type: Number, default: 0, required: true },
    failedCount: { type: Number, default: 0, required: true },
  },
  {
    timestamps: true,
  }
);

const CampaignRecipientSchema = new Schema<ICampaignRecipient>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'sending', 'sent', 'failed', 'bounced'],
      default: 'pending',
      required: true,
    },
    sentAt: { type: Date },
    error: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const EmailEventSchema = new Schema<IEmailEvent>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', default: null },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'CampaignRecipient', default: null },
    email: { type: String, required: true, lowercase: true, trim: true },
    type: {
      type: String,
      enum: ['delivered', 'bounce', 'open', 'click', 'spamreport', 'unsubscribe', 'failed'],
      required: true,
    },
    url: { type: String, trim: true },
    userAgent: { type: String },
    ipAddress: { type: String },
    timestamp: { type: Date, required: true, default: Date.now },
  },
  {
    timestamps: false,
  }
);

// Indexes
CampaignSchema.index({ organizationId: 1, status: 1 });
CampaignRecipientSchema.index({ campaignId: 1, status: 1 });
CampaignRecipientSchema.index({ organizationId: 1, email: 1 });
EmailEventSchema.index({ campaignId: 1, type: 1 });
EmailEventSchema.index({ contactId: 1, timestamp: -1 });
EmailEventSchema.index({ organizationId: 1, timestamp: -1 });

export const Campaign: Model<ICampaign> =
  mongoose.models.Campaign || mongoose.model<ICampaign>('Campaign', CampaignSchema);

export const CampaignRecipient: Model<ICampaignRecipient> =
  mongoose.models.CampaignRecipient ||
  mongoose.model<ICampaignRecipient>('CampaignRecipient', CampaignRecipientSchema);

export const EmailEvent: Model<IEmailEvent> =
  mongoose.models.EmailEvent || mongoose.model<IEmailEvent>('EmailEvent', EmailEventSchema);
