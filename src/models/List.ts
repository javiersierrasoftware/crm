import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISegmentRule {
  field: string; // e.g. 'city', 'sector', 'tags', 'commercialStatus', 'commercialConsent'
  operator: 'equals' | 'not_equals' | 'contains' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  value: any;
}

export interface IList extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  type: 'static' | 'dynamic';
  rules: ISegmentRule[];
  rulesOperator: 'AND' | 'OR'; // logic combiner
  createdAt: Date;
  updatedAt: Date;
}

export interface IListMember extends Document {
  organizationId: mongoose.Types.ObjectId;
  listId: mongoose.Types.ObjectId;
  contactId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const SegmentRuleSchema = new Schema<ISegmentRule>({
  field: { type: String, required: true },
  operator: {
    type: String,
    enum: ['equals', 'not_equals', 'contains', 'in', 'not_in', 'greater_than', 'less_than'],
    required: true,
  },
  value: { type: Schema.Types.Mixed, required: true },
});

const ListSchema = new Schema<IList>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    type: {
      type: String,
      enum: ['static', 'dynamic'],
      default: 'static',
      required: true,
    },
    rules: [SegmentRuleSchema],
    rulesOperator: {
      type: String,
      enum: ['AND', 'OR'],
      default: 'AND',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const ListMemberSchema = new Schema<IListMember>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    listId: { type: Schema.Types.ObjectId, ref: 'List', required: true },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
ListSchema.index({ organizationId: 1, type: 1 });
ListMemberSchema.index({ listId: 1, contactId: 1 }, { unique: true });
ListMemberSchema.index({ organizationId: 1, contactId: 1 });

export const List: Model<IList> =
  mongoose.models.List || mongoose.model<IList>('List', ListSchema);

export const ListMember: Model<IListMember> =
  mongoose.models.ListMember || mongoose.model<IListMember>('ListMember', ListMemberSchema);
