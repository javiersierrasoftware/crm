import mongoose from 'mongoose';

// Pre-register all models to prevent Next.js tree-shaking MissingSchemaErrors during populate
import '@/models/User';
import '@/models/Organization';
import '@/models/OrganizationMember';
import '@/models/Plan';
import '@/models/Subscription';
import '@/models/Company';
import '@/models/Contact';
import '@/models/Pipeline';
import '@/models/Opportunity';
import '@/models/Activity';
import '@/models/EmailTemplate';
import '@/models/Campaign';
import '@/models/Unsubscribe';
import '@/models/Automation';
import '@/models/ImportJob';
import '@/models/AuditLog';
import '@/models/ApiKey';
import '@/models/Notification';
import '@/models/Template';
import '@/models/CompanyLog';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
interface GlobalMongoose {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseGlobal: GlobalMongoose | undefined;
}

const cached: GlobalMongoose = globalThis.mongooseGlobal || { conn: null, promise: null };

if (!globalThis.mongooseGlobal) {
  globalThis.mongooseGlobal = cached;
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
