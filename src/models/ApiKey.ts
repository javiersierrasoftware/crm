import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IApiKey extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  keyHash: string; // Stored securely as a hash
  keyPreview: string; // e.g. "cre_abc123...xyz"
  scopes: string[]; // List of authorized scopes/permissions
  lastUsedAt?: Date;
  expiresAt?: Date;
  isRevoked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true, trim: true },
    keyHash: { type: String, required: true },
    keyPreview: { type: String, required: true },
    scopes: [{ type: String }],
    lastUsedAt: { type: Date },
    expiresAt: { type: Date },
    isRevoked: { type: Boolean, default: false, required: true },
  },
  {
    timestamps: true,
  }
);

// Indexes
ApiKeySchema.index({ keyHash: 1 }, { unique: true });
ApiKeySchema.index({ organizationId: 1 });

const ApiKey: Model<IApiKey> =
  mongoose.models.ApiKey || mongoose.model<IApiKey>('ApiKey', ApiKeySchema);

export default ApiKey;
