import mongoose, { Schema, Document, Model } from 'mongoose';

export type TenantRole = 'OWNER' | 'ADMIN' | 'SALES_MANAGER' | 'SALES_AGENT' | 'MARKETING' | 'VIEWER';

export interface IOrganizationMember extends Document {
  organizationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: TenantRole;
  status: 'active' | 'invited' | 'suspended';
  invitedBy?: mongoose.Types.ObjectId;
  joinedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationMemberSchema = new Schema<IOrganizationMember>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: ['OWNER', 'ADMIN', 'SALES_MANAGER', 'SALES_AGENT', 'MARKETING', 'VIEWER'],
      required: true,
      default: 'VIEWER',
    },
    status: {
      type: String,
      enum: ['active', 'invited', 'suspended'],
      default: 'invited',
      required: true,
    },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    joinedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: a user can only have one membership per organization
OrganizationMemberSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
// Queries filtering members inside an organization or finding organizations for a user
OrganizationMemberSchema.index({ userId: 1 });
OrganizationMemberSchema.index({ organizationId: 1, role: 1 });

const OrganizationMember: Model<IOrganizationMember> =
  mongoose.models.OrganizationMember ||
  mongoose.model<IOrganizationMember>('OrganizationMember', OrganizationMemberSchema);

export default OrganizationMember;
