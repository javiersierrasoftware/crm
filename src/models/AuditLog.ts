import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLog extends Document {
  organizationId?: mongoose.Types.ObjectId | null;
  userId: mongoose.Types.ObjectId;
  userName: string;
  action: string;
  entityType?: string;
  entityId?: mongoose.Types.ObjectId | null;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    action: { type: String, required: true, index: true },
    entityType: { type: String },
    entityId: { type: Schema.Types.ObjectId, default: null },
    details: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes for security audit checks
AuditLogSchema.index({ organizationId: 1, createdAt: -1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1 });

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;
