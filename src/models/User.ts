import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash?: string;
  emailVerified: Date | null;
  image?: string;
  status: 'active' | 'inactive' | 'suspended';
  isSuperAdmin: boolean;
  verificationToken?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String },
    emailVerified: { type: Date, default: null },
    verificationToken: { type: String, default: null },
    image: { type: String, trim: true },
    isSuperAdmin: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'inactive',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
UserSchema.index({ status: 1 });

if (mongoose.models.User) {
  delete (mongoose.models as any).User;
}

const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);

export default User;
