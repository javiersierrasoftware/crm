import mongoose, { Schema, Document, Model } from 'mongoose';

export type AutomationStepType =
  | 'email'
  | 'wait'
  | 'task'
  | 'assign_agent'
  | 'change_status'
  | 'add_tag'
  | 'remove_tag'
  | 'add_to_list'
  | 'create_opportunity';

export interface IAutomationStep {
  _id: mongoose.Types.ObjectId;
  type: AutomationStepType;
  config: Record<string, any>;
  order: number;
}

export interface IAutomation extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  triggerType: 'company_created' | 'contact_created' | 'list_added' | 'status_changed' | 'stage_changed';
  triggerConfig?: Record<string, any>;
  status: 'active' | 'inactive';
  steps: IAutomationStep[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IAutomationExecution extends Document {
  organizationId: mongoose.Types.ObjectId;
  automationId: mongoose.Types.ObjectId;
  contactId: mongoose.Types.ObjectId;
  companyId?: mongoose.Types.ObjectId | null;
  currentStepIndex: number;
  status: 'running' | 'completed' | 'failed' | 'paused';
  nextExecuteAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAutomationExecutionLog extends Document {
  organizationId: mongoose.Types.ObjectId;
  executionId: mongoose.Types.ObjectId;
  stepIndex: number;
  stepType: string;
  status: 'success' | 'failed';
  message?: string;
  timestamp: Date;
}

const AutomationStepSchema = new Schema<IAutomationStep>({
  type: {
    type: String,
    enum: [
      'email',
      'wait',
      'task',
      'assign_agent',
      'change_status',
      'add_tag',
      'remove_tag',
      'add_to_list',
      'create_opportunity',
    ],
    required: true,
  },
  config: { type: Schema.Types.Mixed, default: {} },
  order: { type: Number, required: true },
});

const AutomationSchema = new Schema<IAutomation>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true, trim: true },
    triggerType: {
      type: String,
      enum: ['company_created', 'contact_created', 'list_added', 'status_changed', 'stage_changed'],
      required: true,
    },
    triggerConfig: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'inactive',
      required: true,
    },
    steps: [AutomationStepSchema],
  },
  {
    timestamps: true,
  }
);

const AutomationExecutionSchema = new Schema<IAutomationExecution>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    automationId: { type: Schema.Types.ObjectId, ref: 'Automation', required: true },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', required: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
    currentStepIndex: { type: Number, default: 0, required: true },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed', 'paused'],
      default: 'running',
      required: true,
    },
    nextExecuteAt: { type: Date, required: true, default: Date.now },
  },
  {
    timestamps: true,
  }
);

const AutomationExecutionLogSchema = new Schema<IAutomationExecutionLog>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    executionId: { type: Schema.Types.ObjectId, ref: 'AutomationExecution', required: true },
    stepIndex: { type: Number, required: true },
    stepType: { type: String, required: true },
    status: {
      type: String,
      enum: ['success', 'failed'],
      required: true,
    },
    message: { type: String },
    timestamp: { type: Date, required: true, default: Date.now },
  },
  {
    timestamps: false,
  }
);

// Indexes
AutomationSchema.index({ organizationId: 1, status: 1 });
AutomationExecutionSchema.index({ nextExecuteAt: 1, status: 1 });
AutomationExecutionSchema.index({ organizationId: 1, contactId: 1 });
AutomationExecutionLogSchema.index({ executionId: 1 });

export const Automation: Model<IAutomation> =
  mongoose.models.Automation || mongoose.model<IAutomation>('Automation', AutomationSchema);

export const AutomationExecution: Model<IAutomationExecution> =
  mongoose.models.AutomationExecution ||
  mongoose.model<IAutomationExecution>('AutomationExecution', AutomationExecutionSchema);

export const AutomationExecutionLog: Model<IAutomationExecutionLog> =
  mongoose.models.AutomationExecutionLog ||
  mongoose.model<IAutomationExecutionLog>('AutomationExecutionLog', AutomationExecutionLogSchema);
