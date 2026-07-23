import mongoose, { Schema, Document, Model } from 'mongoose';

export type ActivityType = 'call' | 'email' | 'meeting' | 'videocall' | 'visit' | 'whatsapp' | 'task' | 'note' | 'followup';

export interface IActivity extends Document {
  organizationId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  type: ActivityType;
  date: Date;
  time?: string; // "HH:MM"
  duration?: number; // in minutes
  assignedAgentId?: mongoose.Types.ObjectId; // User responsible
  companyId?: mongoose.Types.ObjectId | null;
  contactId?: mongoose.Types.ObjectId | null;
  opportunityId?: mongoose.Types.ObjectId | null;
  status: 'pending' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  result?: string;
  reminderSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    type: {
      type: String,
      enum: ['call', 'email', 'meeting', 'videocall', 'visit', 'whatsapp', 'task', 'note', 'followup'],
      required: true,
    },
    date: { type: Date, required: true, default: Date.now },
    time: { type: String, trim: true },
    duration: { type: Number, default: 0 },
    assignedAgentId: { type: Schema.Types.ObjectId, ref: 'User' },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', default: null },
    opportunityId: { type: Schema.Types.ObjectId, ref: 'Opportunity', default: null },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'pending',
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
      required: true,
    },
    result: { type: String },
    reminderSent: { type: Boolean, default: false, required: true },
  },
  {
    timestamps: true,
  }
);

// Indexes for query performance
ActivitySchema.index({ organizationId: 1, date: 1 });
ActivitySchema.index({ organizationId: 1, assignedAgentId: 1, status: 1 });
ActivitySchema.index({ organizationId: 1, companyId: 1 });
ActivitySchema.index({ organizationId: 1, opportunityId: 1 });
ActivitySchema.index({ organizationId: 1, contactId: 1 });

const Activity: Model<IActivity> =
  mongoose.models.Activity || mongoose.model<IActivity>('Activity', ActivitySchema);

export default Activity;
