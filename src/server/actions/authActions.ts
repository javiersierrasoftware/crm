'use server';

import { connectToDatabase } from '../database/mongodb';
import User from '@/models/User';
import Organization from '@/models/Organization';
import OrganizationMember from '@/models/OrganizationMember';
import Plan from '@/models/Plan';
import Subscription from '@/models/Subscription';
import { getOrCreateDefaultPipeline } from '../services/pipelineService';
import { seedDefaultTemplates } from '../services/templateService';
import { writeAuditLog } from '../audit/audit';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

interface RegisterTenantParams {
  name: string;
  email: string;
  passwordHash: string; // Plain password to be hashed
  companyName: string;
  sector?: string;
  country?: string;
  city?: string;
}

/**
 * Handles the registration of a new OWNER user along with their tenant Organization.
 * Performs database actions within a mongoose transaction to ensure atomic integrity.
 */
export async function registerTenant(data: RegisterTenantParams) {
  await connectToDatabase();

  const lowercaseEmail = data.email.toLowerCase().trim();

  // 1. Validate if user already exists
  const existingUser = await User.findOne({ email: lowercaseEmail });
  if (existingUser) {
    return { success: false, error: 'El correo electrónico ya se encuentra registrado' };
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 2. Create Organization
    const organization = new Organization({
      name: data.companyName,
      sector: data.sector || 'Otros',
      country: data.country || '',
      city: data.city || '',
      status: 'trial', // Default on signup
    });

    const savedOrg = await organization.save({ session });
    const orgIdStr = savedOrg._id.toString();

    // 3. Hash Password & Create User
    const passwordHash = await bcrypt.hash(data.passwordHash, 10);
    const user = new User({
      name: data.name,
      email: lowercaseEmail,
      passwordHash,
      status: 'active',
      emailVerified: new Date(), // Simulating auto email verification in dev
    });

    const savedUser = await user.save({ session });

    // 4. Create OWNER Organization Member
    const member = new OrganizationMember({
      organizationId: savedOrg._id,
      userId: savedUser._id,
      role: 'OWNER',
      status: 'active',
      joinedAt: new Date(),
    });

    await member.save({ session });

    // 5. Assign Default Plan & Subscription
    // Attempt to find or create the default Plan if not exists
    let plan = await Plan.findOne({ code: 'PLAN_INICIAL' });
    if (!plan) {
      plan = await Plan.create(
        [
          {
            name: 'Plan Inicial',
            code: 'PLAN_INICIAL',
            maxUsers: 3,
            maxCompanies: 5000,
            maxContacts: 10000,
            maxEmailsPerMonth: 5000,
            maxAutomations: 5,
            price: 29,
          },
        ],
        { session }
      ).then((res) => res[0]);
    }

    const subscription = new Subscription({
      organizationId: savedOrg._id,
      planId: plan!._id,
      status: 'active',
      emailsSentThisPeriod: 0,
    });

    await subscription.save({ session });

    // 6. Seed Pipelines and Templates for the new tenant
    await getOrCreateDefaultPipeline(orgIdStr);
    await seedDefaultTemplates(orgIdStr);

    await session.commitTransaction();
    session.endSession();

    // 7. Log Audit Action
    await writeAuditLog({
      userId: savedUser._id.toString(),
      userName: savedUser.name,
      organizationId: orgIdStr,
      action: 'register_tenant',
      entityType: 'Organization',
      entityId: savedOrg._id as mongoose.Types.ObjectId,
      details: { organizationName: savedOrg.name, ownerEmail: savedUser.email },
    });

    return { success: true };
  } catch (err: any) {
    await session.abortTransaction();
    session.endSession();
    console.error('Registration transaction aborted:', err);
    return { success: false, error: err.message || 'Error inesperado durante el registro' };
  }
}
