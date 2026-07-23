import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IImportJob extends Document {
  organizationId: mongoose.Types.ObjectId;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileName: string;
  mapping: Record<string, string>; // maps CSV headers to CRM fields
  duplicateStrategy: 'skip' | 'update' | 'create_new';
  defaultAgentId?: mongoose.Types.ObjectId;
  tags: string[];
  dataSource?: string;
  totalRows: number;
  processedRows: number;
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  duplicateCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IImportRowError extends Document {
  organizationId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  rowNumber: number;
  errorDetails: string;
  rowData: Record<string, any>;
  createdAt: Date;
}

const ImportJobSchema = new Schema<IImportJob>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      required: true,
    },
    fileName: { type: String, required: true },
    mapping: { type: Schema.Types.Mixed, required: true },
    duplicateStrategy: {
      type: String,
      enum: ['skip', 'update', 'create_new'],
      required: true,
      default: 'skip',
    },
    defaultAgentId: { type: Schema.Types.ObjectId, ref: 'User' },
    tags: [{ type: String, trim: true }],
    dataSource: { type: String, default: 'Importación' },
    totalRows: { type: Number, default: 0, required: true },
    processedRows: { type: Number, default: 0, required: true },
    createdCount: { type: Number, default: 0, required: true },
    updatedCount: { type: Number, default: 0, required: true },
    failedCount: { type: Number, default: 0, required: true },
    duplicateCount: { type: Number, default: 0, required: true },
  },
  {
    timestamps: true,
  }
);

const ImportRowErrorSchema = new Schema<IImportRowError>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'ImportJob', required: true },
    rowNumber: { type: Number, required: true },
    errorDetails: { type: String, required: true },
    rowData: { type: Schema.Types.Mixed, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
ImportJobSchema.index({ organizationId: 1, createdAt: -1 });
ImportRowErrorSchema.index({ jobId: 1 });

export const ImportJob: Model<IImportJob> =
  mongoose.models.ImportJob || mongoose.model<IImportJob>('ImportJob', ImportJobSchema);

export const ImportRowError: Model<IImportRowError> =
  mongoose.models.ImportRowError ||
  mongoose.model<IImportRowError>('ImportRowError', ImportRowErrorSchema);
